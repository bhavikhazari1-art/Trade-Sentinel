import { useMemo } from "react";
import { useTrades } from "@/contexts/TradesContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getPnlColor } from "@/lib/utils";
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, AreaChart, Area } from "recharts";
import { BarChart3, PieChartIcon, TrendingUp, Activity, AlertTriangle } from "lucide-react";

const GREEN = "#10b981", RED = "#ef4444";
const ttStyle = { contentStyle: { background: "rgba(10,13,22,.95)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, fontSize: 11, backdropFilter: "blur(20px)" } };

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-3xl p-4 border border-white/[0.06]">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={13} className="text-primary" />
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function Analytics() {
  const { trades, loading, error } = useTrades();
  const { format } = useCurrency();
  const closed = useMemo(() => trades.filter(t => t.status === "closed" && t.pnl != null), [trades]);

  const bySymbol = useMemo(() => {
    const map: Record<string, { pnl: number; count: number }> = {};
    for (const t of closed) { if (!map[t.symbol]) map[t.symbol] = { pnl: 0, count: 0 }; map[t.symbol].pnl += t.pnl ?? 0; map[t.symbol].count++; }
    return Object.entries(map).map(([sym, d]) => ({ sym, pnl: Math.round(d.pnl * 100) / 100, count: d.count })).sort((a, b) => b.pnl - a.pnl).slice(0, 7);
  }, [closed]);

  const bySetup = useMemo(() => {
    const map: Record<string, { pnl: number; count: number; wins: number }> = {};
    for (const t of closed) { const k = t.setup || "Other"; if (!map[k]) map[k] = { pnl: 0, count: 0, wins: 0 }; map[k].pnl += t.pnl ?? 0; map[k].count++; if ((t.pnl ?? 0) > 0) map[k].wins++; }
    return Object.entries(map).map(([setup, d]) => ({ setup, pnl: Math.round(d.pnl * 100) / 100, count: d.count, wr: d.count ? (d.wins / d.count) * 100 : 0 })).sort((a, b) => b.pnl - a.pnl);
  }, [closed]);

  const byEmotion = useMemo(() => {
    const map: Record<string, { pnl: number; count: number; wins: number }> = {};
    for (const t of closed) { const k = t.emotion || "neutral"; if (!map[k]) map[k] = { pnl: 0, count: 0, wins: 0 }; map[k].pnl += t.pnl ?? 0; map[k].count++; if ((t.pnl ?? 0) > 0) map[k].wins++; }
    return Object.entries(map).map(([em, d]) => ({ em, pnl: Math.round(d.pnl * 100) / 100, count: d.count, wr: d.count ? Math.round((d.wins / d.count) * 100) : 0 }));
  }, [closed]);

  const winLossPie = useMemo(() => [
    { name: "Wins",   value: closed.filter(t => (t.pnl ?? 0) > 0).length, color: GREEN },
    { name: "Losses", value: closed.filter(t => (t.pnl ?? 0) < 0).length, color: RED },
  ], [closed]);

  const monthlyPnl = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of closed) { const m = t.entryDate.slice(0, 7); map[m] = (map[m] ?? 0) + (t.pnl ?? 0); }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([m, pnl]) => ({ month: m.slice(5), pnl: Math.round(pnl * 100) / 100 }));
  }, [closed]);

  const equityCurve = useMemo(() => {
    const sorted = [...closed].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
    let cum = 0;
    return sorted.map(t => { cum += t.pnl ?? 0; return { date: t.entryDate.slice(5), pnl: Math.round(cum * 100) / 100 }; });
  }, [closed]);

  const totalPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const winRate  = closed.length ? (closed.filter(t => (t.pnl ?? 0) > 0).length / closed.length) * 100 : 0;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="flex flex-col">
      <header className="page-header px-5 py-3.5">
        <h1 className="text-lg font-bold font-serif text-foreground">Analytics</h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">{closed.length} closed trades analyzed</p>
      </header>

      <div className="px-4 pt-4 pb-6 flex flex-col gap-4">
        {error && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/25 rounded-2xl p-4">
            <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div><p className="text-sm font-semibold text-red-300">Firebase error</p><p className="text-[11px] text-red-400/80 mt-0.5">{error}</p></div>
          </div>
        )}

        {closed.length === 0 && !error ? (
          <div className="glass-card rounded-3xl p-10 border border-white/[0.06] flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center"><BarChart3 size={24} className="text-primary" /></div>
            <p className="text-sm font-semibold text-foreground">No data yet</p>
            <p className="text-xs text-muted-foreground">Analytics appear after your first closed trade</p>
          </div>
        ) : closed.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card rounded-2xl p-4 border border-white/[0.06]"><p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5">Total P&L</p><p className={`text-2xl font-bold font-serif ${getPnlColor(totalPnl)}`}>{format(totalPnl)}</p></div>
              <div className="glass-card rounded-2xl p-4 border border-white/[0.06]"><p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5">Win Rate</p><p className={`text-2xl font-bold font-serif ${winRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>{winRate.toFixed(1)}%</p></div>
            </div>

            <Section icon={PieChartIcon} title="Win / Loss Split">
              <div className="flex items-center gap-6">
                <div className="flex-shrink-0">
                  <ResponsiveContainer width={110} height={110}>
                    <PieChart><Pie data={winLossPie} cx="50%" cy="50%" innerRadius={32} outerRadius={52} dataKey="value" strokeWidth={0}>{winLossPie.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie></PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-3 flex-1">
                  {winLossPie.map(d => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} /><span className="text-xs text-muted-foreground">{d.name}</span></div>
                      <span className="text-base font-bold text-foreground font-serif">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            {equityCurve.length > 1 && (
              <Section icon={Activity} title="Equity Curve">
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={equityCurve} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <defs><linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={totalPnl >= 0 ? GREEN : RED} stopOpacity={0.3} /><stop offset="95%" stopColor={totalPnl >= 0 ? GREEN : RED} stopOpacity={0} /></linearGradient></defs>
                    <XAxis dataKey="date" hide /><YAxis hide />
                    <Tooltip {...ttStyle} formatter={(v: number) => [format(v), "Equity"]} />
                    <Area type="monotone" dataKey="pnl" stroke={totalPnl >= 0 ? GREEN : RED} strokeWidth={2} fill="url(#eqGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </Section>
            )}

            {monthlyPnl.length > 0 && (
              <Section icon={TrendingUp} title="Monthly P&L">
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart data={monthlyPnl} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} /><YAxis hide />
                    <Tooltip {...ttStyle} formatter={(v: number) => [format(v), "P&L"]} />
                    <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>{monthlyPnl.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? GREEN : RED} fillOpacity={0.85} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            )}

            {bySymbol.length > 0 && (
              <Section icon={BarChart3} title="P&L by Symbol">
                <ResponsiveContainer width="100%" height={Math.max(120, bySymbol.length * 30)}>
                  <BarChart data={bySymbol} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                    <XAxis type="number" hide /><YAxis type="category" dataKey="sym" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={42} />
                    <Tooltip {...ttStyle} formatter={(v: number) => [format(v), "P&L"]} />
                    <Bar dataKey="pnl" radius={[0, 6, 6, 0]}>{bySymbol.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? GREEN : RED} fillOpacity={0.85} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            )}

            {byEmotion.length > 0 && (
              <Section icon={BarChart3} title="Performance by Emotion">
                <div className="flex flex-col divide-y divide-border/30">
                  {byEmotion.map(em => (
                    <div key={em.em} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div><p className="text-sm text-foreground font-semibold capitalize">{em.em}</p><p className="text-[11px] text-muted-foreground">{em.count} trades · {em.wr}% WR</p></div>
                      <span className={`text-sm font-bold ${getPnlColor(em.pnl)}`}>{format(em.pnl)}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {bySetup.length > 0 && (
              <Section icon={BarChart3} title="Setup Performance">
                <div className="flex flex-col divide-y divide-border/30">
                  {bySetup.map(s => (
                    <div key={s.setup} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div><p className="text-sm text-foreground font-semibold">{s.setup}</p><p className="text-[11px] text-muted-foreground">{s.count} trades · {s.wr.toFixed(0)}% WR</p></div>
                      <span className={`text-sm font-bold ${getPnlColor(s.pnl)}`}>{format(s.pnl)}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
