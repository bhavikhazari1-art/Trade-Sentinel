import { useMemo } from "react";
import { useTrades } from "@/contexts/TradesContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatPercent, getPnlColor } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, Target, Activity,
  Flame, Shield, Zap, Award, BarChart2, Clock, Plus,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip,
} from "recharts";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

// ─── Helpers ───────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, trend, color }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; trend?: "up" | "down" | "neutral"; color?: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-4 flex flex-col gap-2 card-hover border border-white/[0.06]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">{label}</span>
        <div className={`p-1.5 rounded-xl ${color ?? "bg-primary/10"}`}>
          <Icon size={13} className={
            trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-primary"
          } />
        </div>
      </div>
      <div className={`text-[22px] font-bold font-serif leading-none ${
        trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-foreground"
      }`}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

const tooltipStyle = {
  contentStyle: {
    background: "rgba(10,13,22,0.95)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    fontSize: 11,
    backdropFilter: "blur(20px)",
  },
};

// ─── 30-Day Heatmap ────────────────────────────────────────
function StreakHeatmap({
  dailyPnl,
  currentStreak,
}: {
  dailyPnl: Record<string, number>;
  currentStreak: number;
}) {
  const days = useMemo(() => {
    const result: { key: string; label: string; pnl: number | null; isToday: boolean }[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const pnl = dailyPnl[key] ?? null;
      result.push({
        key,
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        pnl,
        isToday: i === 0,
      });
    }
    return result;
  }, [dailyPnl]);

  const profitDays = days.filter(d => d.pnl != null && d.pnl > 0).length;
  const lossDays   = days.filter(d => d.pnl != null && d.pnl < 0).length;
  const activeDays = profitDays + lossDays;

  // Tooltip state
  const [hovered, setHovered] = (function () {
    // Using inline useState-like pattern via useMemo — but we need actual state.
    // We'll handle this below via inline state in the component.
    return [null as null, (_: null) => {}];
  })();
  void hovered; void setHovered;

  return (
    <div className="glass-card rounded-3xl p-4 border border-white/[0.06]">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-1.5 rounded-xl transition-colors",
            currentStreak >= 5 ? "bg-primary/20" :
            currentStreak >= 1 ? "bg-primary/10" : "bg-muted"
          )}>
            <Flame
              size={14}
              className={cn(
                "transition-colors",
                currentStreak >= 3 ? "text-primary" : "text-muted-foreground"
              )}
            />
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            30-Day Streak
          </span>
        </div>

        {/* Streak badge */}
        {currentStreak > 0 ? (
          <div className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 border transition-all",
            currentStreak >= 5
              ? "bg-primary/20 border-primary/40 pulse-gold"
              : "bg-primary/10 border-primary/25"
          )}>
            <Flame size={11} className="text-primary" />
            <span className="text-xs font-bold text-primary">{currentStreak} on fire</span>
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground">{activeDays} active days</span>
        )}
      </div>

      {/* Heatmap grid — 6 rows × 5 cols = 30 cells */}
      <div
        className="grid gap-[5px]"
        style={{ gridTemplateColumns: "repeat(10, 1fr)" }}
      >
        {days.map(day => {
          const isProfit = day.pnl != null && day.pnl > 0;
          const isLoss   = day.pnl != null && day.pnl < 0;
          const isBig    = Math.abs(day.pnl ?? 0) > 200;

          return (
            <div
              key={day.key}
              title={`${day.label}${day.pnl != null ? `: ${day.pnl >= 0 ? "+" : ""}${day.pnl.toFixed(0)}` : ": no trades"}`}
              className={cn(
                "aspect-square rounded-md transition-all duration-300 relative",
                isProfit
                  ? isBig
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                    : "bg-emerald-400/70"
                  : isLoss
                    ? isBig
                      ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                      : "bg-red-500/60"
                    : "bg-white/[0.05]",
                day.isToday && "ring-2 ring-primary ring-offset-1 ring-offset-card"
              )}
            />
          );
        })}
      </div>

      {/* Legend + summary */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400/70" />
            <span className="text-[10px] text-muted-foreground">{profitDays} profit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-red-500/60" />
            <span className="text-[10px] text-muted-foreground">{lossDays} loss</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-white/[0.05]" />
            <span className="text-[10px] text-muted-foreground">{30 - activeDays} off</span>
          </div>
        </div>
        {activeDays > 0 && (
          <span className={cn(
            "text-[10px] font-bold",
            profitDays > lossDays ? "text-emerald-400" : "text-muted-foreground"
          )}>
            {Math.round((profitDays / activeDays) * 100)}% win days
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const { trades, loading } = useTrades();

  const stats = useMemo(() => {
    const closed = trades.filter(t => t.status === "closed" && t.pnl != null);
    const wins   = closed.filter(t => (t.pnl ?? 0) > 0);
    const losses = closed.filter(t => (t.pnl ?? 0) < 0);
    const totalPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const winRate  = closed.length ? (wins.length / closed.length) * 100 : 0;
    const avgWin   = wins.length ? wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length : 0;
    const avgLoss  = losses.length ? Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses.length) : 0;
    const rr       = avgLoss > 0 ? avgWin / avgLoss : 0;

    // Winning streak (consecutive wins from latest backwards)
    let streak = 0, maxStreak = 0, cur = 0;
    const sorted = [...closed].sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
    for (const t of sorted) {
      if ((t.pnl ?? 0) > 0) { streak++; } else break;
    }
    for (const t of [...closed].reverse()) {
      if ((t.pnl ?? 0) > 0) { cur++; maxStreak = Math.max(maxStreak, cur); } else cur = 0;
    }

    return {
      closed, wins, losses, totalPnl, winRate, avgWin, avgLoss, rr,
      streak, maxStreak, open: trades.filter(t => t.status === "open"),
    };
  }, [trades]);

  // Daily P&L map for heatmap
  const dailyPnl = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of trades) {
      if (t.pnl == null) continue;
      map[t.entryDate] = (map[t.entryDate] ?? 0) + t.pnl;
    }
    return map;
  }, [trades]);

  // Consecutive profitable days streak (by calendar day)
  const dayStreak = useMemo(() => {
    const sorted = Object.entries(dailyPnl)
      .sort(([a], [b]) => b.localeCompare(a)); // most recent first
    let s = 0;
    for (const [, pnl] of sorted) {
      if (pnl > 0) s++; else break;
    }
    return s;
  }, [dailyPnl]);

  const displayStreak = Math.max(stats.streak, dayStreak);

  const equityCurve = useMemo(() => {
    const sorted = [...trades.filter(t => t.status === "closed" && t.pnl != null)]
      .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
    let cum = 0;
    return sorted.map(t => {
      cum += t.pnl ?? 0;
      return { date: t.entryDate.slice(5), pnl: Math.round(cum * 100) / 100 };
    });
  }, [trades]);

  const firstName = user?.displayName?.split(" ")[0] ?? "Trader";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col">
      {/* Sticky header */}
      <header className="page-header px-5 py-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] text-muted-foreground">{greeting},</p>
          <h1 className="text-lg font-bold font-serif gold-text leading-tight">{firstName}</h1>
        </div>
        <div className="flex items-center gap-2">
          {displayStreak > 0 && (
            <div className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 border",
              displayStreak >= 5
                ? "bg-primary/25 border-primary/40 pulse-gold"
                : "bg-primary/15 border-primary/25"
            )}>
              <Flame size={12} className="text-primary" />
              <span className="text-xs font-bold text-primary">{displayStreak}</span>
            </div>
          )}
          <div className="w-9 h-9 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">{firstName[0]?.toUpperCase()}</span>
          </div>
        </div>
      </header>

      {/* Scrollable body */}
      <div className="px-4 pt-4 pb-6 flex flex-col gap-4">

        {/* Total P&L hero */}
        <div className="glass-card rounded-3xl p-5 border border-white/[0.06] relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-primary/6 rounded-full blur-2xl pointer-events-none" />
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Total P&L</p>
          <div className={`text-[42px] font-bold font-serif leading-none count-up ${getPnlColor(stats.totalPnl)}`}>
            {formatCurrency(stats.totalPnl)}
          </div>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs text-muted-foreground">{stats.closed.length} closed</span>
            {stats.open.length > 0 && (
              <>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                <span className="text-xs text-blue-400 font-medium">{stats.open.length} open</span>
              </>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 stagger">
          <StatCard label="Win Rate"    value={`${stats.winRate.toFixed(1)}%`}  icon={Target}       trend={stats.winRate >= 50 ? "up" : "down"}  sub={`${stats.wins.length}W / ${stats.losses.length}L`} />
          <StatCard label="Risk/Reward" value={`${stats.rr.toFixed(2)}R`}        icon={Shield}       trend={stats.rr >= 1.5 ? "up" : "neutral"}   color="bg-blue-500/10" />
          <StatCard label="Avg Win"     value={formatCurrency(stats.avgWin)}     icon={TrendingUp}   trend="up"   sub="per trade" />
          <StatCard label="Avg Loss"    value={formatCurrency(stats.avgLoss)}    icon={TrendingDown} trend="down" sub="per trade" color="bg-red-500/10" />
        </div>

        {/* Equity curve */}
        {equityCurve.length > 1 && (
          <div className="glass-card rounded-2xl p-4 border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={13} className="text-primary" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Equity Curve</span>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={100}>
                <AreaChart data={equityCurve} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={stats.totalPnl >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={stats.totalPnl >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [formatCurrency(v), "Equity"]} />
                  <Area type="monotone" dataKey="pnl"
                    stroke={stats.totalPnl >= 0 ? "#10b981" : "#ef4444"} strokeWidth={2}
                    fill="url(#pnlGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 30-Day Streak Heatmap */}
        <StreakHeatmap dailyPnl={dailyPnl} currentStreak={displayStreak} />

        {/* Quick stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Zap,      label: "Best Streak", value: String(stats.maxStreak), color: "text-primary" },
            { icon: BarChart2, label: "All Trades",  value: String(stats.closed.length), color: "text-foreground" },
            { icon: Award,    label: "Level",
              value: stats.winRate >= 60 ? "Elite" : stats.winRate >= 40 ? "Good" : "Grow",
              color: stats.winRate >= 60 ? "text-emerald-400" : stats.winRate >= 40 ? "text-yellow-400" : "text-red-400" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="glass-card rounded-2xl p-3 border border-white/[0.06] text-center">
              <Icon size={14} className="text-primary mx-auto mb-1.5" />
              <div className={`text-[15px] font-bold font-serif ${color}`}>{value}</div>
              <div className="text-[9px] text-muted-foreground mt-0.5 font-medium">{label}</div>
            </div>
          ))}
        </div>

        {/* Recent trades */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock size={13} className="text-muted-foreground" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Recent Trades</span>
            </div>
            <Link href="/add">
              <button className="flex items-center gap-1 text-xs text-primary font-semibold tap-small">
                <Plus size={13} /> Add
              </button>
            </Link>
          </div>

          {trades.length === 0 ? (
            <div className="glass-card rounded-3xl p-8 border border-white/[0.06] text-center flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <TrendingUp size={24} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">No trades yet</p>
                <p className="text-xs text-muted-foreground mt-1">Log your first trade to get started</p>
              </div>
              <Link href="/add">
                <button className="bg-primary text-primary-foreground text-xs font-bold px-6 py-2.5 rounded-full hover:brightness-110 active:scale-95 transition-all">
                  Log First Trade
                </button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2 stagger">
              {trades.slice(0, 5).map(t => (
                <div key={t.id} className="glass-card rounded-2xl px-4 py-3.5 border border-white/[0.06] flex items-center justify-between card-hover">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      t.direction === "long" ? "bg-emerald-400/15 text-emerald-400" : "bg-red-400/15 text-red-400"
                    }`}>
                      {t.direction === "long" ? "↑" : "↓"}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-foreground">{t.symbol}</div>
                      <div className="text-[11px] text-muted-foreground">{t.entryDate} · {t.setup || "—"}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {t.pnl != null ? (
                      <>
                        <div className={`text-sm font-bold ${getPnlColor(t.pnl)}`}>{formatCurrency(t.pnl)}</div>
                        {t.pnlPercent != null && (
                          <div className={`text-[10px] font-medium ${getPnlColor(t.pnlPercent)}`}>{formatPercent(t.pnlPercent)}</div>
                        )}
                      </>
                    ) : (
                      <span className="text-[11px] bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full font-semibold">Open</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
