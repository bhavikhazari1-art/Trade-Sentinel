import { useMemo } from "react";
import { useTrades } from "@/contexts/TradesContext";
import { formatCurrency, getPnlColor } from "@/lib/utils";
import {
  Brain, Lightbulb, AlertTriangle, TrendingUp,
  Target, Shield, Zap, CheckCircle, XCircle
} from "lucide-react";

interface Insight {
  type: "success" | "warning" | "tip" | "danger";
  title: string;
  desc: string;
  icon: React.ElementType;
}

function InsightCard({ insight }: { insight: Insight }) {
  const colorMap = {
    success: { bg: "bg-emerald-400/10 border-emerald-400/20", icon: "text-emerald-400", title: "text-emerald-300" },
    warning: { bg: "bg-yellow-400/10 border-yellow-400/20", icon: "text-yellow-400", title: "text-yellow-300" },
    tip: { bg: "bg-blue-400/10 border-blue-400/20", icon: "text-blue-400", title: "text-blue-300" },
    danger: { bg: "bg-red-400/10 border-red-400/20", icon: "text-red-400", title: "text-red-300" },
  }[insight.type];

  const Icon = insight.icon;

  return (
    <div className={`rounded-2xl p-4 border ${colorMap.bg} fade-in`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${colorMap.icon}`}><Icon size={18} /></div>
        <div>
          <p className={`text-sm font-semibold ${colorMap.title} mb-1`}>{insight.title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{insight.desc}</p>
        </div>
      </div>
    </div>
  );
}

function ScoreMeter({ score }: { score: number }) {
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f6c948" : "#ef4444";
  const label = score >= 80 ? "Elite" : score >= 60 ? "Strong" : score >= 40 ? "Developing" : "Needs Work";
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="glass-card rounded-2xl p-5 border border-border/40 flex flex-col items-center">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Smart Trading Score</p>
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold font-serif" style={{ color }}>{score}</span>
          <span className="text-[10px] text-muted-foreground mt-0.5">/100</span>
        </div>
      </div>
      <p className="text-sm font-semibold mt-3" style={{ color }}>{label}</p>
      <p className="text-xs text-muted-foreground mt-1 text-center">Based on your trading performance & psychology</p>
    </div>
  );
}

export default function AICoach() {
  const { trades, loading } = useTrades();

  const closed = useMemo(() => trades.filter(t => t.status === "closed" && t.pnl != null), [trades]);

  const stats = useMemo(() => {
    const wins = closed.filter(t => (t.pnl ?? 0) > 0);
    const losses = closed.filter(t => (t.pnl ?? 0) < 0);
    const totalPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
    const avgWin = wins.length ? wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses.length) : 0;
    const rr = avgLoss > 0 ? avgWin / avgLoss : 0;

    // Emotion analysis
    const emotionPnl: Record<string, number[]> = {};
    for (const t of closed) {
      const em = t.emotion || "neutral";
      if (!emotionPnl[em]) emotionPnl[em] = [];
      emotionPnl[em].push(t.pnl ?? 0);
    }
    const worstEmotion = Object.entries(emotionPnl)
      .map(([em, pnls]) => ({ em, avg: pnls.reduce((s, p) => s + p, 0) / pnls.length }))
      .sort((a, b) => a.avg - b.avg)[0];
    const bestEmotion = Object.entries(emotionPnl)
      .map(([em, pnls]) => ({ em, avg: pnls.reduce((s, p) => s + p, 0) / pnls.length }))
      .sort((a, b) => b.avg - a.avg)[0];

    // Mistake analysis
    const mistakeTrades = closed.filter(t => t.mistakes && t.mistakes.length > 10);

    // Streak
    let winStreak = 0;
    for (const t of closed) { if ((t.pnl ?? 0) > 0) winStreak++; else break; }

    return { wins, losses, totalPnl, winRate, avgWin, avgLoss, rr, worstEmotion, bestEmotion, mistakeTrades, winStreak };
  }, [closed]);

  const score = useMemo(() => {
    if (closed.length === 0) return 0;
    let s = 0;
    if (stats.winRate >= 60) s += 25;
    else if (stats.winRate >= 50) s += 18;
    else if (stats.winRate >= 40) s += 10;
    if (stats.rr >= 2) s += 25;
    else if (stats.rr >= 1.5) s += 18;
    else if (stats.rr >= 1) s += 10;
    if (stats.totalPnl > 0) s += 20;
    else if (stats.totalPnl > -500) s += 10;
    if (closed.length >= 20) s += 15;
    else if (closed.length >= 10) s += 10;
    else if (closed.length >= 5) s += 5;
    if (stats.mistakeTrades.length === 0) s += 15;
    else if (stats.mistakeTrades.length < 3) s += 8;
    return Math.min(100, s);
  }, [stats, closed.length]);

  const insights = useMemo((): Insight[] => {
    const result: Insight[] = [];
    if (closed.length === 0) {
      result.push({
        type: "tip", icon: Lightbulb,
        title: "Start Your Journey",
        desc: "Log your first trade to unlock AI-powered insights about your trading psychology and performance patterns."
      });
      return result;
    }

    if (stats.winRate >= 60) {
      result.push({ type: "success", icon: CheckCircle, title: "High Win Rate", desc: `Your ${stats.winRate.toFixed(1)}% win rate puts you in the top tier. Focus on maintaining consistency and sizing up on your best setups.` });
    } else if (stats.winRate < 45) {
      result.push({ type: "danger", icon: XCircle, title: "Win Rate Needs Attention", desc: `At ${stats.winRate.toFixed(1)}%, review your entry criteria. Consider paper trading new setups before risking capital. Quality over quantity.` });
    }

    if (stats.rr >= 2) {
      result.push({ type: "success", icon: Shield, title: "Excellent Risk/Reward", desc: `${stats.rr.toFixed(2)}:1 R/R is professional-grade. You're extracting maximum value from winning trades. Keep this discipline.` });
    } else if (stats.rr < 1) {
      result.push({ type: "danger", icon: AlertTriangle, title: "Risk/Reward Too Low", desc: `Your R/R of ${stats.rr.toFixed(2)} means you need to win more than 50% just to break even. Widen targets or tighten stops.` });
    }

    if (stats.worstEmotion && stats.worstEmotion.avg < -50) {
      result.push({ type: "warning", icon: Brain, title: `Avoid Trading When "${stats.worstEmotion.em}"`, desc: `Your worst average P&L comes when you're ${stats.worstEmotion.em}. Consider stepping away from the screen in this emotional state.` });
    }

    if (stats.bestEmotion && stats.bestEmotion.avg > 0) {
      result.push({ type: "tip", icon: Lightbulb, title: `Best Results When "${stats.bestEmotion.em}"`, desc: `You perform best when ${stats.bestEmotion.em}. Try to identify what creates this mindset and replicate it consistently.` });
    }

    if (stats.winStreak >= 3) {
      result.push({ type: "warning", icon: AlertTriangle, title: "Hot Streak — Stay Grounded", desc: `${stats.winStreak} consecutive wins is great, but overconfidence is a trap. Don't size up recklessly or abandon your rules.` });
    }

    if (stats.mistakeTrades.length > 3) {
      result.push({ type: "warning", icon: Target, title: "Recurring Mistakes Detected", desc: `${stats.mistakeTrades.length} trades have recorded mistakes. Review them for patterns — eliminating one repeated error can significantly improve P&L.` });
    }

    if (stats.avgWin > 0 && stats.avgLoss > 0) {
      const payoffRatio = stats.avgWin / stats.avgLoss;
      if (payoffRatio < 1) {
        result.push({ type: "danger", icon: Zap, title: "Winners Too Small, Losers Too Large", desc: "Let winners run longer and cut losses faster. Trail your stop as price moves in your favor." });
      } else if (payoffRatio >= 2) {
        result.push({ type: "success", icon: TrendingUp, title: "Excellent Payoff Ratio", desc: `Avg win ${formatCurrency(stats.avgWin)} vs avg loss ${formatCurrency(stats.avgLoss)}. You're correctly maximizing winners and minimizing losers.` });
      }
    }

    if (result.length < 2) {
      result.push({ type: "tip", icon: Lightbulb, title: "Keep Building Your Journal", desc: "More data = better insights. Log every trade including notes and emotions for the most accurate AI analysis." });
    }

    return result;
  }, [stats, closed.length]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="px-4 pt-5 pb-4 space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-primary" />
          <h1 className="text-xl font-bold font-serif text-foreground">AI Coach</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Personalized insights for your trading</p>
      </div>

      <ScoreMeter score={score} />

      {/* Discipline Tracker */}
      <div className="glass-card rounded-2xl p-4 border border-border/40">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Discipline Tracker</p>
        <div className="space-y-3">
          {[
            { label: "Rule Adherence", value: Math.min(100, 100 - (stats.mistakeTrades.length / Math.max(closed.length, 1)) * 100) },
            { label: "Emotional Control", value: stats.worstEmotion && stats.worstEmotion.avg < -100 ? 40 : 75 },
            { label: "Risk Consistency", value: Math.min(100, stats.rr * 40) },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-xs font-semibold text-foreground">{value.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${value}%`,
                    background: value >= 70 ? "#10b981" : value >= 40 ? "#f6c948" : "#ef4444"
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Control */}
      <div className="glass-card rounded-2xl p-4 border border-border/40">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Risk Control Meter</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className={`text-lg font-bold font-serif ${stats.rr >= 1.5 ? "text-emerald-400" : "text-red-400"}`}>
              {stats.rr.toFixed(2)}R
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Risk/Reward</p>
          </div>
          <div>
            <p className={`text-lg font-bold font-serif ${getPnlColor(stats.avgWin - stats.avgLoss)}`}>
              {formatCurrency(stats.avgWin)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Avg Win</p>
          </div>
          <div>
            <p className="text-lg font-bold font-serif text-red-400">{formatCurrency(stats.avgLoss)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Avg Loss</p>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">AI Insights</p>
        <div className="space-y-3 stagger-children">
          {insights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
        </div>
      </div>

      <div className="h-2" />
    </div>
  );
}
