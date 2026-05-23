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

export default function Dashboard() {
  const { user } = useAuth();
  const { trades, loading } = useTrades();

  const stats = useMemo(() => {
    const closed = trades.filter(t => t.status === "closed" && t.pnl != null);
    const wins   = closed.filter(t => (t.pnl ?? 0) > 0);
    const losses = closed.filter(t => (t.pnl ?? 0) < 0);
    const totalPnl  = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const winRate   = closed.length ? (wins.length / closed.length) * 100 : 0;
    const avgWin    = wins.length ? wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length : 0;
    const avgLoss   = losses.length ? Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses.length) : 0;
    const rr        = avgLoss > 0 ? avgWin / avgLoss : 0;

    let streak = 0, maxStreak = 0, cur = 0;
    for (const t of [...closed].reverse()) {
      if ((t.pnl ?? 0) > 0) { cur++; maxStreak = Math.max(maxStreak, cur); } else cur = 0;
    }
    for (const t of closed) { if ((t.pnl ?? 0) > 0) streak++; else break; }

    return {
      closed, wins, losses, totalPnl, winRate, avgWin, avgLoss, rr,
      streak, maxStreak, open: trades.filter(t => t.status === "open"),
    };
  }, [trades]);

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
          {stats.streak > 0 && (
            <div className="flex items-center gap-1 bg-primary/15 border border-primary/25 rounded-full px-2.5 py-1">
              <Flame size={12} className="text-primary" />
              <span className="text-xs font-bold text-primary">{stats.streak}</span>
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
          <StatCard label="Win Rate"    value={`${stats.winRate.toFixed(1)}%`}  icon={Target}    trend={stats.winRate >= 50 ? "up" : "down"} sub={`${stats.wins.length}W / ${stats.losses.length}L`} />
          <StatCard label="Risk/Reward" value={`${stats.rr.toFixed(2)}R`}        icon={Shield}    trend={stats.rr >= 1.5 ? "up" : "neutral"}  color="bg-blue-500/10" />
          <StatCard label="Avg Win"     value={formatCurrency(stats.avgWin)}     icon={TrendingUp} trend="up"   sub="per trade" />
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
