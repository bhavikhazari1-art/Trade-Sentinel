import { useState, useMemo } from "react";
import { useTrades } from "@/contexts/TradesContext";
import { formatCurrency, getPnlColor } from "@/lib/utils";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Calendar() {
  const { trades, loading } = useTrades();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const dailyPnl = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of trades) {
      if (t.pnl == null) continue;
      const date = t.entryDate;
      map[date] = (map[date] ?? 0) + t.pnl;
    }
    return map;
  }, [trades]);

  const selectedTrades = useMemo(() => {
    if (!selectedDay) return [];
    return trades.filter(t => t.entryDate === selectedDay);
  }, [selectedDay, trades]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  const getDateKey = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="px-4 pt-5 pb-4 space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-primary" />
          <h1 className="text-xl font-bold font-serif text-foreground">Calendar</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Track your daily trading performance</p>
      </div>

      <div className="glass-card rounded-2xl p-4 border border-border/40">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} data-testid="btn-prev-month"
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-muted transition-colors active:scale-95">
            <ChevronLeft size={16} className="text-muted-foreground" />
          </button>
          <span className="text-sm font-bold font-serif text-foreground">{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} data-testid="btn-next-month"
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-muted transition-colors active:scale-95">
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const dateKey = getDateKey(day);
            const pnl = dailyPnl[dateKey];
            const isToday = dateKey === todayKey;
            const isSelected = dateKey === selectedDay;
            const hasData = pnl != null;

            return (
              <button
                key={i}
                data-testid={`cal-day-${dateKey}`}
                onClick={() => setSelectedDay(isSelected ? null : dateKey)}
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-xl py-2 px-0.5 transition-all duration-200 min-h-[44px]",
                  isSelected ? "bg-primary/20 border border-primary/50" :
                  isToday ? "border border-primary/30 bg-primary/5" :
                  hasData ? "bg-secondary/40 hover:bg-secondary/70" :
                  "hover:bg-secondary/30"
                )}
              >
                <span className={cn(
                  "text-xs font-medium",
                  isToday ? "text-primary font-bold" :
                  isSelected ? "text-primary" :
                  "text-foreground"
                )}>
                  {day}
                </span>
                {hasData && (
                  <div className={cn(
                    "w-1 h-1 rounded-full mt-0.5",
                    pnl > 0 ? "bg-emerald-400" : "bg-red-400"
                  )} />
                )}
                {hasData && (
                  <span className={cn(
                    "text-[8px] font-bold leading-tight",
                    pnl > 0 ? "text-emerald-400" : "text-red-400"
                  )}>
                    {pnl > 0 ? "+" : ""}{pnl >= 1000 || pnl <= -1000 ? `${(pnl / 1000).toFixed(1)}k` : pnl.toFixed(0)}
                  </span>
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
        {(() => {
          const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
          const monthPnl = Object.entries(dailyPnl)
            .filter(([k]) => k.startsWith(prefix))
            .reduce((s, [, v]) => s + v, 0);
          const tradingDays = Object.keys(dailyPnl).filter(k => k.startsWith(prefix)).length;
          const profitDays = Object.entries(dailyPnl).filter(([k, v]) => k.startsWith(prefix) && v > 0).length;
          return (
            <>
              <div className="glass-card rounded-xl p-3 border border-border/40 text-center">
                <p className={`text-sm font-bold font-serif ${getPnlColor(monthPnl)}`}>{formatCurrency(monthPnl)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Month P&L</p>
              </div>
              <div className="glass-card rounded-xl p-3 border border-border/40 text-center">
                <p className="text-sm font-bold font-serif text-foreground">{tradingDays}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Trading Days</p>
              </div>
              <div className="glass-card rounded-xl p-3 border border-border/40 text-center">
                <p className="text-sm font-bold font-serif text-emerald-400">{profitDays}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Profit Days</p>
              </div>
            </>
          );
        })()}
      </div>

      {/* Selected day trades */}
      {selectedDay && (
        <div className="glass-card rounded-2xl p-4 border border-border/40">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">{selectedDay}</p>
            {dailyPnl[selectedDay] != null && (
              <span className={`text-sm font-bold ${getPnlColor(dailyPnl[selectedDay])}`}>
                {formatCurrency(dailyPnl[selectedDay])}
              </span>
            )}
          </div>
          {selectedTrades.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No trades on this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedTrades.map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                      t.direction === "long" ? "bg-emerald-400/15 text-emerald-400" : "bg-red-400/15 text-red-400"
                    }`}>
                      {t.direction === "long" ? "L" : "S"}
                    </div>
                    <span className="text-sm font-medium text-foreground">{t.symbol}</span>
                  </div>
                  <div className="text-right">
                    {t.pnl != null
                      ? <span className={`text-sm font-bold ${getPnlColor(t.pnl)}`}>{formatCurrency(t.pnl)}</span>
                      : <span className="text-xs text-blue-400">Open</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="h-2" />
    </div>
  );
}
