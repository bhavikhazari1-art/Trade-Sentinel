import { useMemo } from "react";
import { useTrades } from "@/contexts/TradesContext";
import { formatCurrency, formatPercent, getPnlColor } from "@/lib/utils";
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid
} from "recharts";
import { BarChart3, PieChartIcon, TrendingUp } from "lucide-react";

const GOLD = "#f6c948";
const GREEN = "#10b981";
const RED = "#ef4444";
const BLUE = "#3b82f6";
const PURPLE = "#a855f7";

export default function Analytics() {
  const { trades, loading } = useTrades();

  const closed = useMemo(() => trades.filter(t => t.status === "closed" && t.pnl != null), [trades]);

  const bySymbol = useMemo(() => {
    const map: Record<string, { pnl: number; count: number }> = {};
    for (const t of closed) {
      if (!map[t.symbol]) map[t.symbol] = { pnl: 0, count: 0 };
      map[t.symbol].pnl += t.pnl ?? 0;
      map[t.symbol].count++;
    }
    return Object.entries(map)
      .map(([sym, d]) => ({ sym, pnl: Math.round(d.pnl * 100) / 100, count: d.count }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 8);
  }, [closed]);

  const bySetup = useMemo(() => {
    const map: Record<string, { pnl: number; count: number; wins: number }> = {};
    for (const t of closed) {
      const k = t.setup || "Other";
      if (!map[k]) map[k] = { pnl: 0, count: 0, wins: 0 };
      map[k].pnl += t.pnl ?? 0;
      map[k].count++;
      if ((t.pnl ?? 0) > 0) map[k].wins++;
    }
    return Object.entries(map)
      .map(([setup, d]) => ({ setup, pnl: Math.round(d.pnl * 100) / 100, count: d.count, wr: d.count ? (d.wins / d.count) * 100 : 0 }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [closed]);

  const byEmotion = useMemo(() => {
    const map: Record<string, { pnl: number; count: number; wins: number }> = {};
    for (const t of closed) {
      const k = t.emotion || "neutral";
      if (!map[k]) map[k] = { pnl: 0, count: 0, wins: 0 };
      map[k].pnl += t.pnl ?? 0;
      map[k].count++;
      if ((t.pnl ?? 0) > 0) map[k].wins++;
    }
    return Object.entries(map).map(([em, d]) => ({
      em, pnl: Math.round(d.pnl * 100) / 100, count: d.count,
      wr: d.count ? Math.round((d.wins / d.count) * 100) : 0
    }));
  }, [closed]);

  const winLossPie = useMemo(() => {
    const wins = closed.filter(t => (t.pnl ?? 0) > 0).length;
    const losses = closed.filter(t => (t.pnl ?? 0) < 0).length;
    return [
      { name: "Wins", value: wins, color: GREEN },
      { name: "Losses", value: losses, color: RED },
    ];
  }, [closed]);

  const monthlyPnl = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of closed) {
      const month = t.entryDate.slice(0, 7);
      map[month] = (map[month] ?? 0) + (t.pnl ?? 0);
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([m, pnl]) => ({ month: m.slice(5), pnl: Math.round(pnl * 100) / 100 }));
  }, [closed]);

  const totalPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const winRate = closed.length ? (closed.filter(t => (t.pnl ?? 0) > 0).length / closed.length) * 100 : 0;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const tooltipStyle = {
    contentStyle: { background: "hsl(224 18% 9%)", border: "1px solid hsl(220 15% 15%)", borderRadius: 12, fontSize: 11 },
  };

  return (
    <div className="px-4 pt-5 pb-4 space-y-5">
      <div>
        <h1 className="text-xl font-bold font-serif text-foreground">Analytics</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{closed.length} closed trades analyzed</p>
      </div>

      {closed.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 border border-border/40 text-center">
          <BarChart3 size={28} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No closed trades yet.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Analytics will appear after you log trades.</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card rounded-2xl p-4 border border-border/40">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total P&L</p>
              <p className={`text-xl font-bold font-serif ${getPnlColor(totalPnl)}`}>{formatCurrency(totalPnl)}</p>
            </div>
            <div className="glass-card rounded-2xl p-4 border border-border/40">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Win Rate</p>
              <p className={`text-xl font-bold font-serif ${winRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>{winRate.toFixed(1)}%</p>
            </div>
          </div>

          {/* Win/Loss Pie */}
          <div className="glass-card rounded-2xl p-4 border border-border/40">
            <div className="flex items-center gap-2 mb-3">
              <PieChartIcon size={14} className="text-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Win / Loss Split</span>
            </div>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={winLossPie} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                    {winLossPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {winLossPie.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="text-xs text-muted-foreground">{d.name}</span>
                    <span className="text-sm font-bold text-foreground ml-1">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly P&L */}
          {monthlyPnl.length > 0 && (
            <div className="glass-card rounded-2xl p-4 border border-border/40">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monthly P&L</span>
              </div>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={monthlyPnl} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [formatCurrency(v), "P&L"]} />
                  <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                    {monthlyPnl.map((entry, i) => (
                      <Cell key={i} fill={entry.pnl >= 0 ? GREEN : RED} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* P&L by Symbol */}
          {bySymbol.length > 0 && (
            <div className="glass-card rounded-2xl p-4 border border-border/40">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={14} className="text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">P&L by Symbol</span>
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={bySymbol} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="sym" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [formatCurrency(v), "P&L"]} />
                  <Bar dataKey="pnl" radius={[0, 6, 6, 0]}>
                    {bySymbol.map((entry, i) => (
                      <Cell key={i} fill={entry.pnl >= 0 ? GREEN : RED} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* By Emotion */}
          {byEmotion.length > 0 && (
            <div className="glass-card rounded-2xl p-4 border border-border/40">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Performance by Emotion</p>
              <div className="space-y-2">
                {byEmotion.map(em => (
                  <div key={em.em} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <div>
                      <p className="text-sm text-foreground capitalize font-medium">{em.em}</p>
                      <p className="text-xs text-muted-foreground">{em.count} trades · {em.wr}% WR</p>
                    </div>
                    <span className={`text-sm font-bold ${getPnlColor(em.pnl)}`}>{formatCurrency(em.pnl)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* By Setup */}
          {bySetup.length > 0 && (
            <div className="glass-card rounded-2xl p-4 border border-border/40">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Setup Performance</p>
              <div className="space-y-2">
                {bySetup.map(s => (
                  <div key={s.setup} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <div>
                      <p className="text-sm text-foreground font-medium">{s.setup}</p>
                      <p className="text-xs text-muted-foreground">{s.count} trades · {s.wr.toFixed(0)}% WR</p>
                    </div>
                    <span className={`text-sm font-bold ${getPnlColor(s.pnl)}`}>{formatCurrency(s.pnl)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      <div className="h-2" />
    </div>
  );
}
