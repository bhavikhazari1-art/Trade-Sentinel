import { useMemo } from "react";
import { useTrades } from "@/contexts/TradesContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatPercent, getPnlColor } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, Target, Activity,
  Flame, Shield, Zap, Award, BarChart2, Clock
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip
} from "recharts";
import { Link } from "wouter";

function StatCard({ label, value, sub, icon: Icon, trend, color }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; trend?: "up" | "down" | "neutral"; color?: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-4 stagger-children flex flex-col gap-2 border border-border/40">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
        <div className={`p-1.5 rounded-lg ${color || "bg-primary/10"}`}>
          <Icon size={14} className={trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-primary"} />
        </div>
      </div>
      <div className={`text-xl font-bold font-serif ${
        trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-foreground"
      }`}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { trades, loading } = useTrades();

  const stats = useMemo(() => {
    const closed = trades.filter(t => t.status === "closed" && t.pnl != null);
    const wins = closed.filter(t => (t.pnl ?? 0) > 0);
    const losses = closed.filter(t => (t.pnl ?? 0) < 0);
    const totalPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
    const avgWin = wins.length ? wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses.length) : 0;
    const rr = avgLoss > 0 ? avgWin / avgLoss : 0;

    let streak = 0;
    let maxStreak = 0;
    let cur = 0;
    for (const t of [...closed].reverse()) {
      if ((t.pnl ?? 0) > 0) {
        cur++;
        maxStreak = Math.max(maxStreak, cur);
      } else {
        cur = 0;
      }
    }
    if (closed.length && (closed[0].pnl ?? 0) > 0) {
      for (const t of closed) {
        if ((t.pnl ?? 0) > 0) streak++;
        else break;
      }
    }

    return { closed, wins, losses, totalPnl, winRate, avgWin, avgLoss, rr, streak, maxStreak, open: trades.filter(t => t.status === "open") };
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

  const recentTrades = useMemo(() => trades.slice(0, 5), [trades]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const firstName = user?.displayName?.split(" ")[0] || "Trader";

  return (
    <div className="px-4 pt-5 pb-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">Good morning,</p>
          <h1 className="text-xl font-bold font-serif gold-text">{firstName}</h1>
        </div>
        <div className="flex items-center gap-2">
          {stats.streak > 0 && (
            <div className="flex items-center gap-1 bg-primary/15 border border-primary/30 rounded-full px-3 py-1">
              <Flame size={13} className="text-primary" />
              <span className="text-xs font-bold text-primary">{stats.streak}</span>
            </div>
          )}
          <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">{firstName[0]}</span>
          </div>
        </div>
      </div>

      {/* Total P&L Hero */}
      <div className="glass-card rounded-2xl p-5 border border-border/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-1">Total P&L</p>
        <div className={`text-4xl font-bold font-serif count-up ${getPnlColor(stats.totalPnl)}`}>
          {formatCurrency(stats.totalPnl)}
        </div>
        <div className="flex items-center gap-4 mt-3">
          <span className="text-xs text-muted-foreground">{stats.closed.length} closed trades</span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground">{stats.open.length} open</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 stagger-children">
        <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} icon={Target}
          trend={stats.winRate >= 50 ? "up" : "down"} sub={`${stats.wins.length}W / ${stats.losses.length}L`} />
        <StatCard label="Risk/Reward" value={`${stats.rr.toFixed(2)}R`} icon={Shield}
          trend={stats.rr >= 1.5 ? "up" : "neutral"} color="bg-blue-500/10" />
        <StatCard label="Avg Win" value={formatCurrency(stats.avgWin)} icon={TrendingUp}
          trend="up" sub="per trade" />
        <StatCard label="Avg Loss" value={formatCurrency(stats.avgLoss)} icon={TrendingDown}
          trend="down" sub="per trade" color="bg-red-500/10" />
      </div>

      {/* Equity Curve */}
      {equityCurve.length > 1 && (
        <div className="glass-card rounded-2xl p-4 border border-border/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Equity Curve</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={110}>
            <AreaChart data={equityCurve} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={stats.totalPnl >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={stats.totalPnl >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: "hsl(224 18% 9%)", border: "1px solid hsl(220 15% 15%)", borderRadius: 12, fontSize: 11 }}
                formatter={(v: number) => [formatCurrency(v), "Equity"]}
              />
              <Area type="monotone" dataKey="pnl" stroke={stats.totalPnl >= 0 ? "#10b981" : "#ef4444"}
                strokeWidth={2} fill="url(#pnlGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glass-card rounded-xl p-3 border border-border/40 text-center">
          <Zap size={14} className="text-primary mx-auto mb-1" />
          <div className="text-sm font-bold text-foreground">{stats.maxStreak}</div>
          <div className="text-[10px] text-muted-foreground">Best Streak</div>
        </div>
        <div className="glass-card rounded-xl p-3 border border-border/40 text-center">
          <BarChart2 size={14} className="text-primary mx-auto mb-1" />
          <div className="text-sm font-bold text-foreground">{stats.closed.length}</div>
          <div className="text-[10px] text-muted-foreground">Total Trades</div>
        </div>
        <div className="glass-card rounded-xl p-3 border border-border/40 text-center">
          <Award size={14} className="text-primary mx-auto mb-1" />
          <div className={`text-sm font-bold ${stats.winRate >= 60 ? "text-emerald-400" : stats.winRate >= 40 ? "text-yellow-400" : "text-red-400"}`}>
            {stats.winRate >= 60 ? "Elite" : stats.winRate >= 40 ? "Good" : "Grow"}
          </div>
          <div className="text-[10px] text-muted-foreground">Level</div>
        </div>
      </div>

      {/* Recent Trades */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Trades</span>
          </div>
          <Link href="/add">
            <button className="text-xs text-primary font-medium">+ Add Trade</button>
          </Link>
        </div>

        {recentTrades.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 border border-border/40 text-center">
            <TrendingUp size={28} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No trades yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Add your first trade to get started.</p>
            <Link href="/add">
              <button className="mt-4 bg-primary text-primary-foreground text-xs font-semibold px-5 py-2 rounded-full hover:brightness-110 transition-all">
                Add Trade
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2 stagger-children">
            {recentTrades.map((t) => (
              <div key={t.id} className="glass-card rounded-xl px-4 py-3 border border-border/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    t.direction === "long" ? "bg-emerald-400/15 text-emerald-400" : "bg-red-400/15 text-red-400"
                  }`}>
                    {t.direction === "long" ? "L" : "S"}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{t.symbol}</div>
                    <div className="text-xs text-muted-foreground">{t.entryDate}</div>
                  </div>
                </div>
                <div className="text-right">
                  {t.pnl != null ? (
                    <>
                      <div className={`text-sm font-bold ${getPnlColor(t.pnl)}`}>{formatCurrency(t.pnl)}</div>
                      <div className={`text-[10px] ${getPnlColor(t.pnlPercent ?? 0)}`}>
                        {t.pnlPercent != null ? formatPercent(t.pnlPercent) : ""}
                      </div>
                    </>
                  ) : (
                    <span className="text-xs bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full font-medium">Open</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Bottom spacer */}
      <div className="h-2" />
    </div>
  );
}
