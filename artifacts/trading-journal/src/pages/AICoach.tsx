import { useMemo } from "react";
import { useTrades } from "@/contexts/TradesContext";
import { formatCurrency, getPnlColor } from "@/lib/utils";
import { Brain, Lightbulb, AlertTriangle, TrendingUp, Target, Shield, Zap, CheckCircle, XCircle } from "lucide-react";

interface Insight { type: "success"|"warning"|"tip"|"danger"; title: string; desc: string; icon: React.ElementType; }

const COLOR_MAP = {
  success: { bg: "bg-emerald-400/10 border-emerald-400/20", icon: "text-emerald-400", title: "text-emerald-300" },
  warning: { bg: "bg-yellow-400/10 border-yellow-400/20",  icon: "text-yellow-400",  title: "text-yellow-300" },
  tip:     { bg: "bg-blue-400/10 border-blue-400/20",      icon: "text-blue-400",    title: "text-blue-300"   },
  danger:  { bg: "bg-red-400/10 border-red-400/20",        icon: "text-red-400",     title: "text-red-300"    },
};

function InsightCard({ insight }: { insight: Insight }) {
  const c = COLOR_MAP[insight.type];
  const Icon = insight.icon;
  return (
    <div className={`rounded-2xl p-4 border ${c.bg}`}>
      <div className="flex items-start gap-3">
        <Icon size={18} className={`${c.icon} mt-0.5 flex-shrink-0`} />
        <div>
          <p className={`text-sm font-bold ${c.title} mb-1`}>{insight.title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{insight.desc}</p>
        </div>
      </div>
    </div>
  );
}

function ScoreMeter({ score }: { score: number }) {
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f6c948" : "#ef4444";
  const label = score >= 80 ? "Elite" : score >= 60 ? "Strong" : score >= 40 ? "Developing" : "Needs Work";
  const r = 52, circ = 2 * Math.PI * r, offset = circ - (score / 100) * circ;

  return (
    <div className="glass-card rounded-3xl p-6 border border-white/[0.06] flex flex-col items-center">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-5">Smart Trading Score</p>
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="10" />
          <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.2s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold font-serif" style={{ color }}>{score}</span>
          <span className="text-[10px] text-muted-foreground">/100</span>
        </div>
      </div>
      <p className="text-base font-bold mt-4 font-serif" style={{ color }}>{label}</p>
      <p className="text-xs text-muted-foreground mt-1 text-center">Based on your real trading data</p>
    </div>
  );
}

export default function AICoach() {
  const { trades, loading } = useTrades();
  const closed = useMemo(() => trades.filter(t => t.status === "closed" && t.pnl != null), [trades]);

  const stats = useMemo(() => {
    const wins   = closed.filter(t => (t.pnl ?? 0) > 0);
    const losses = closed.filter(t => (t.pnl ?? 0) < 0);
    const totalPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const winRate  = closed.length ? (wins.length / closed.length) * 100 : 0;
    const avgWin   = wins.length ? wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length : 0;
    const avgLoss  = losses.length ? Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses.length) : 0;
    const rr       = avgLoss > 0 ? avgWin / avgLoss : 0;

    const emotionPnl: Record<string, number[]> = {};
    for (const t of closed) {
      const em = t.emotion || "neutral";
      if (!emotionPnl[em]) emotionPnl[em] = [];
      emotionPnl[em].push(t.pnl ?? 0);
    }
    const em2avg = (em: Record<string, number[]>) =>
      Object.entries(em).map(([k, v]) => ({ em: k, avg: v.reduce((s, p) => s + p, 0) / v.length }));
    const worst = em2avg(emotionPnl).sort((a, b) => a.avg - b.avg)[0];
    const best  = em2avg(emotionPnl).sort((a, b) => b.avg - a.avg)[0];

    const mistakeTrades = closed.filter(t => t.mistakes && t.mistakes.length > 10);
    let winStreak = 0;
    for (const t of closed) { if ((t.pnl ?? 0) > 0) winStreak++; else break; }

    return { wins, losses, totalPnl, winRate, avgWin, avgLoss, rr, worst, best, mistakeTrades, winStreak };
  }, [closed]);

  const score = useMemo(() => {
    if (!closed.length) return 0;
    let s = 0;
    if (stats.winRate >= 60) s += 25; else if (stats.winRate >= 50) s += 18; else if (stats.winRate >= 40) s += 10;
    if (stats.rr >= 2) s += 25; else if (stats.rr >= 1.5) s += 18; else if (stats.rr >= 1) s += 10;
    if (stats.totalPnl > 0) s += 20; else if (stats.totalPnl > -500) s += 10;
    if (closed.length >= 20) s += 15; else if (closed.length >= 10) s += 10; else if (closed.length >= 5) s += 5;
    if (stats.mistakeTrades.length === 0) s += 15; else if (stats.mistakeTrades.length < 3) s += 8;
    return Math.min(100, s);
  }, [stats, closed.length]);

  const insights = useMemo((): Insight[] => {
    if (!closed.length) return [{ type: "tip", icon: Lightbulb, title: "Start Your Journey", desc: "Log your first trade to unlock AI-powered insights about your trading psychology and performance." }];
    const r: Insight[] = [];
    if (stats.winRate >= 60) r.push({ type: "success", icon: CheckCircle, title: "High Win Rate", desc: `${stats.winRate.toFixed(1)}% puts you in the top tier. Focus on maintaining consistency and sizing up on your best setups.` });
    else if (stats.winRate < 45) r.push({ type: "danger", icon: XCircle, title: "Win Rate Below 45%", desc: `Review your entry criteria carefully. Consider paper trading new setups before risking capital.` });
    if (stats.rr >= 2) r.push({ type: "success", icon: Shield, title: "Excellent Risk/Reward", desc: `${stats.rr.toFixed(2)}:1 R/R is professional grade. You're extracting maximum value from winning trades.` });
    else if (stats.rr < 1) r.push({ type: "danger", icon: AlertTriangle, title: "R/R Too Low", desc: `At ${stats.rr.toFixed(2)}, you need >50% win rate just to break even. Widen targets or tighten stops.` });
    if (stats.worst && stats.worst.avg < -50) r.push({ type: "warning", icon: Brain, title: `Avoid Trading When "${stats.worst.em}"`, desc: `Your worst P&L comes when feeling ${stats.worst.em}. Step away from the screen in this state.` });
    if (stats.best && stats.best.avg > 0) r.push({ type: "tip", icon: Lightbulb, title: `Peak Performance: "${stats.best.em}"`, desc: `You perform best when ${stats.best.em}. Identify what creates this mindset and replicate it.` });
    if (stats.winStreak >= 3) r.push({ type: "warning", icon: AlertTriangle, title: "Hot Streak — Stay Grounded", desc: `${stats.winStreak} wins in a row is great, but overconfidence kills. Don't size up recklessly.` });
    if (stats.mistakeTrades.length > 3) r.push({ type: "warning", icon: Target, title: "Recurring Mistakes", desc: `${stats.mistakeTrades.length} trades have logged mistakes. Review them for patterns — fixing one repeated error can be huge.` });
    if (stats.avgWin > 0 && stats.avgLoss > 0 && stats.avgWin / stats.avgLoss < 1) r.push({ type: "danger", icon: Zap, title: "Let Winners Run", desc: "Your winners are smaller than your losers. Trail your stop as price moves in your favor." });
    if (r.length < 2) r.push({ type: "tip", icon: Lightbulb, title: "Keep Logging", desc: "More data = better insights. Log every trade including emotions and notes for accurate AI analysis." });
    return r;
  }, [stats, closed.length]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const bars = [
    { label: "Rule Adherence",   value: Math.min(100, 100 - (stats.mistakeTrades.length / Math.max(closed.length, 1)) * 100) },
    { label: "Emotional Control", value: stats.worst && stats.worst.avg < -100 ? 40 : 75 },
    { label: "Risk Consistency",  value: Math.min(100, stats.rr * 40) },
  ];

  return (
    <div className="flex flex-col">
      <header className="page-header px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Brain size={17} className="text-primary" />
          <h1 className="text-lg font-bold font-serif text-foreground">AI Coach</h1>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">Personalized insights for your trading</p>
      </header>

      <div className="px-4 pt-4 pb-6 flex flex-col gap-4">
        <ScoreMeter score={score} />

        {/* Discipline tracker */}
        <div className="glass-card rounded-3xl p-5 border border-white/[0.06]">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Discipline Tracker</p>
          <div className="flex flex-col gap-4">
            {bars.map(({ label, value }) => {
              const c = value >= 70 ? "#10b981" : value >= 40 ? "#f6c948" : "#ef4444";
              return (
                <div key={label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="text-xs font-bold text-foreground">{value.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${value}%`, background: c }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Risk control */}
        <div className="glass-card rounded-3xl p-5 border border-white/[0.06]">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Risk Control Meter</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Risk/Reward", value: `${stats.rr.toFixed(2)}R`, color: stats.rr >= 1.5 ? "text-emerald-400" : "text-red-400" },
              { label: "Avg Win",     value: formatCurrency(stats.avgWin), color: "text-emerald-400" },
              { label: "Avg Loss",    value: formatCurrency(stats.avgLoss), color: "text-red-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="glass-card rounded-2xl p-3 border border-white/[0.05]">
                <p className={`text-base font-bold font-serif ${color}`}>{value}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights */}
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">AI Insights</p>
          <div className="flex flex-col gap-3 stagger">
            {insights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
