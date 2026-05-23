import { useState, useMemo } from "react";
import { useTrades } from "@/contexts/TradesContext";
import { formatCurrency, getPnlColor } from "@/lib/utils";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["S","M","T","W","T","F","S"];

export default function Calendar() {
  const { trades, loading } = useTrades();
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string|null>(null);

  const dailyPnl = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of trades) {
      if (t.pnl == null) continue;
      map[t.entryDate] = (map[t.entryDate] ?? 0) + t.pnl;
    }
    return map;
  }, [trades]);

  const selectedTrades = useMemo(() =>
    !selected ? [] : trades.filter(t => t.entryDate === selected),
    [selected, trades]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();
  const cells: (number|null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const dateKey = (d: number) => `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const todayKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;

  const prevMonth = () => { if (month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); setSelected(null); };
  const nextMonth = () => { if (month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); setSelected(null); };

  const prefix = `${year}-${String(month+1).padStart(2,"0")}`;
  const monthEntries = Object.entries(dailyPnl).filter(([k]) => k.startsWith(prefix));
  const monthPnl   = monthEntries.reduce((s,[,v])=>s+v, 0);
  const tradingDays = monthEntries.length;
  const profitDays  = monthEntries.filter(([,v])=>v>0).length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col">
      <header className="page-header px-5 py-3.5">
        <div className="flex items-center gap-2">
          <CalendarDays size={17} className="text-primary" />
          <h1 className="text-lg font-bold font-serif text-foreground">Calendar</h1>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">Daily trading performance</p>
      </header>

      <div className="px-4 pt-4 pb-6 flex flex-col gap-4">
        {/* Calendar card */}
        <div className="glass-card rounded-3xl p-4 border border-white/[0.06]">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} data-testid="btn-prev-month"
              className="w-10 h-10 rounded-2xl bg-secondary/60 flex items-center justify-center active:scale-90 transition-transform">
              <ChevronLeft size={18} className="text-muted-foreground" />
            </button>
            <span className="text-base font-bold font-serif text-foreground">{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} data-testid="btn-next-month"
              className="w-10 h-10 rounded-2xl bg-secondary/60 flex items-center justify-center active:scale-90 transition-transform">
              <ChevronRight size={18} className="text-muted-foreground" />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-bold text-muted-foreground/60 py-1">{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={i} className="aspect-square" />;
              const dk    = dateKey(day);
              const pnl   = dailyPnl[dk];
              const today = dk === todayKey;
              const sel   = dk === selected;

              return (
                <button key={i} data-testid={`cal-day-${dk}`}
                  onClick={() => setSelected(sel ? null : dk)}
                  className={cn(
                    "aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-200 active:scale-90 relative",
                    sel   ? "bg-primary/20 border border-primary/50"  :
                    today ? "border border-primary/40 bg-primary/8"   :
                    pnl != null ? "bg-secondary/40 hover:bg-secondary/70" :
                    "hover:bg-secondary/20"
                  )}>
                  <span className={cn(
                    "text-xs font-semibold leading-none",
                    today ? "text-primary font-bold" : sel ? "text-primary" : "text-foreground"
                  )}>
                    {day}
                  </span>
                  {pnl != null && (
                    <div className={cn("w-1.5 h-1.5 rounded-full mt-0.5", pnl > 0 ? "bg-emerald-400" : "bg-red-400")} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/30">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-muted-foreground">Profit day</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-[10px] text-muted-foreground">Loss day</span>
            </div>
          </div>
        </div>

        {/* Monthly summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="glass-card rounded-2xl p-3.5 border border-white/[0.06] text-center">
            <p className={`text-base font-bold font-serif ${getPnlColor(monthPnl)}`}>{formatCurrency(monthPnl)}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5 font-medium uppercase tracking-wide">Month P&L</p>
          </div>
          <div className="glass-card rounded-2xl p-3.5 border border-white/[0.06] text-center">
            <p className="text-base font-bold font-serif text-foreground">{tradingDays}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5 font-medium uppercase tracking-wide">Active Days</p>
          </div>
          <div className="glass-card rounded-2xl p-3.5 border border-white/[0.06] text-center">
            <p className="text-base font-bold font-serif text-emerald-400">{profitDays}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5 font-medium uppercase tracking-wide">Profit Days</p>
          </div>
        </div>

        {/* Selected day trades */}
        {selected && (
          <div className="glass-card rounded-3xl p-4 border border-white/[0.06] slide-up">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-foreground">{selected}</p>
              {dailyPnl[selected] != null && (
                <span className={`text-sm font-bold ${getPnlColor(dailyPnl[selected])}`}>
                  {formatCurrency(dailyPnl[selected])}
                </span>
              )}
            </div>
            {selectedTrades.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No trades on this day.</p>
            ) : (
              <div className="flex flex-col divide-y divide-border/30">
                {selectedTrades.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        t.direction === "long" ? "bg-emerald-400/15 text-emerald-400" : "bg-red-400/15 text-red-400"
                      }`}>
                        {t.direction === "long" ? "↑" : "↓"}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{t.symbol}</p>
                        <p className="text-[10px] text-muted-foreground">{t.setup || "—"}</p>
                      </div>
                    </div>
                    {t.pnl != null
                      ? <span className={`text-sm font-bold ${getPnlColor(t.pnl)}`}>{formatCurrency(t.pnl)}</span>
                      : <span className="text-xs text-blue-400 font-medium">Open</span>
                    }
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
