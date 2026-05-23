import { useState, useMemo } from "react";
import { useTrades } from "@/contexts/TradesContext";
import { useGoals, Goals as GoalsType } from "@/contexts/GoalsContext";
import { formatCurrency, getPnlColor } from "@/lib/utils";
import {
  Target, Flame, Trophy, TrendingUp, Shield,
  Edit3, Check, X, Zap, Star, BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(now.setDate(diff));
  return mon.toISOString().split("T")[0];
}

function getMonthStart() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function ProgressRing({ value, max, size = 64, color }: {
  value: number; max: number; size?: number; color: string;
}) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease" }} />
    </svg>
  );
}

function GoalCard({
  label, current, target, unit = "", color, icon: Icon, format
}: {
  label: string; current: number; target: number; unit?: string;
  color: string; icon: React.ElementType; format?: (v: number) => string;
}) {
  const pct = Math.min(100, target > 0 ? (current / target) * 100 : 0);
  const fmt = format ?? ((v: number) => `${v.toFixed(1)}${unit}`);
  const achieved = current >= target && target > 0;

  return (
    <div className={cn(
      "glass-card rounded-2xl p-4 border transition-all duration-300",
      achieved ? "border-yellow-400/40 bg-yellow-400/5" : "border-border/40"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl" style={{ background: `${color}20` }}>
            <Icon size={14} style={{ color }} />
          </div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        </div>
        {achieved && (
          <div className="flex items-center gap-1 bg-yellow-400/15 border border-yellow-400/30 rounded-full px-2 py-0.5">
            <Trophy size={10} className="text-yellow-400" />
            <span className="text-[10px] font-bold text-yellow-400">Done!</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <ProgressRing value={current} max={target} size={64} color={color} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-foreground">{pct.toFixed(0)}%</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xl font-bold font-serif" style={{ color }}>{fmt(current)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">of {fmt(target)} target</p>
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${pct}%`, background: color }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StreakCard({ streak, label, icon: Icon, color }: {
  streak: number; label: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-4 border border-border/40 flex flex-col items-center text-center">
      <div className="p-2 rounded-xl mb-2" style={{ background: `${color}20` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <p className="text-3xl font-bold font-serif" style={{ color }}>{streak}</p>
      <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{label}</p>
    </div>
  );
}

function EditGoalsSheet({ goals, onSave, onClose }: {
  goals: GoalsType; onSave: (g: GoalsType) => Promise<void>; onClose: () => void;
}) {
  const [form, setForm] = useState<GoalsType>({ ...goals });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof GoalsType, v: string) =>
    setForm(f => ({ ...f, [k]: parseFloat(v) || 0 }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
  };

  const fields: { key: keyof GoalsType; label: string; prefix?: string; suffix?: string; step: string }[] = [
    { key: "weeklyPnl", label: "Weekly P&L Target", prefix: "$", step: "50" },
    { key: "monthlyPnl", label: "Monthly P&L Target", prefix: "$", step: "100" },
    { key: "winRateTarget", label: "Win Rate Target", suffix: "%", step: "1" },
    { key: "dailyTradeLimit", label: "Max Trades Per Day", step: "1" },
    { key: "minRR", label: "Minimum Risk/Reward", suffix: "R", step: "0.1" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-card border border-border rounded-t-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold font-serif text-foreground">Set Your Goals</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {fields.map(({ key, label, prefix, suffix, step }) => (
            <div key={key}>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                {label}
              </label>
              <div className="relative">
                {prefix && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>
                )}
                <input
                  type="number" step={step} value={form[key] as number}
                  onChange={e => set(key, e.target.value)}
                  className={cn(
                    "w-full bg-input/50 border border-border rounded-xl py-3 text-sm text-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all",
                    prefix ? "pl-7 pr-4" : suffix ? "pl-4 pr-7" : "px-4"
                  )}
                />
                {suffix && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{suffix}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSave} disabled={saving}
          className="mt-5 w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-2xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Goals"}
        </button>
      </div>
    </div>
  );
}

export default function Goals() {
  const { trades } = useTrades();
  const { goals, loading, saveGoals } = useGoals();
  const [editing, setEditing] = useState(false);

  const weekStart = getWeekStart();
  const monthStart = getMonthStart();

  const stats = useMemo(() => {
    const closed = trades.filter(t => t.status === "closed" && t.pnl != null);

    const weekTrades = closed.filter(t => t.entryDate >= weekStart);
    const monthTrades = closed.filter(t => t.entryDate >= monthStart);

    const weekPnl = weekTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const monthPnl = monthTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);

    const wins = closed.filter(t => (t.pnl ?? 0) > 0).length;
    const winRate = closed.length ? (wins / closed.length) * 100 : 0;

    const avgRR = (() => {
      const withRR = closed.filter(t => t.pnl != null && t.entryPrice > 0 && t.exitPrice != null);
      if (!withRR.length) return 0;
      const winners = withRR.filter(t => (t.pnl ?? 0) > 0);
      const losers = withRR.filter(t => (t.pnl ?? 0) < 0);
      const avgW = winners.length ? winners.reduce((s, t) => s + (t.pnl ?? 0), 0) / winners.length : 0;
      const avgL = losers.length ? Math.abs(losers.reduce((s, t) => s + (t.pnl ?? 0), 0) / losers.length) : 1;
      return avgL > 0 ? avgW / avgL : 0;
    })();

    // Current win streak
    let winStreak = 0;
    for (const t of closed) {
      if ((t.pnl ?? 0) > 0) winStreak++;
      else break;
    }

    // Best win streak
    let bestStreak = 0, curStreak = 0;
    for (const t of [...closed].reverse()) {
      if ((t.pnl ?? 0) > 0) { curStreak++; bestStreak = Math.max(bestStreak, curStreak); }
      else curStreak = 0;
    }

    // Profitable days streak
    const dayPnl: Record<string, number> = {};
    for (const t of closed) {
      dayPnl[t.entryDate] = (dayPnl[t.entryDate] ?? 0) + (t.pnl ?? 0);
    }
    const sortedDays = Object.entries(dayPnl).sort(([a], [b]) => b.localeCompare(a));
    let profitDayStreak = 0;
    for (const [, pnl] of sortedDays) {
      if (pnl > 0) profitDayStreak++;
      else break;
    }

    // Weekly trades count for limit check
    const weekTradeCount = weekTrades.length;

    return { weekPnl, monthPnl, winRate, avgRR, winStreak, bestStreak, profitDayStreak, weekTradeCount, total: closed.length };
  }, [trades, weekStart, monthStart]);

  const achievements = useMemo(() => {
    const list: { label: string; desc: string; earned: boolean; icon: React.ElementType }[] = [
      { label: "First Trade", desc: "Log your first trade", earned: stats.total >= 1, icon: Star },
      { label: "10 Trades", desc: "Log 10 closed trades", earned: stats.total >= 10, icon: BarChart3 },
      { label: "50 Trades", desc: "Reach 50 closed trades", earned: stats.total >= 50, icon: BarChart3 },
      { label: "Win Streak 3", desc: "Win 3 trades in a row", earned: stats.bestStreak >= 3, icon: Flame },
      { label: "Win Streak 5", desc: "Win 5 trades in a row", earned: stats.bestStreak >= 5, icon: Flame },
      { label: "Consistent", desc: "3 profitable days in a row", earned: stats.profitDayStreak >= 3, icon: TrendingUp },
      { label: "Hit Monthly Goal", desc: "Reach monthly P&L target", earned: stats.monthPnl >= goals.monthlyPnl && goals.monthlyPnl > 0, icon: Trophy },
      { label: "Risk Master", desc: "Maintain 2:1+ R/R ratio", earned: stats.avgRR >= 2, icon: Shield },
    ];
    return list;
  }, [stats, goals]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <>
      <div className="px-4 pt-5 pb-4 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Target size={18} className="text-primary" />
              <h1 className="text-xl font-bold font-serif text-foreground">Goals & Streaks</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Track your targets and consistency</p>
          </div>
          <button
            data-testid="btn-edit-goals"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 bg-primary/15 border border-primary/30 text-primary text-xs font-semibold px-3 py-2 rounded-xl hover:bg-primary/25 active:scale-95 transition-all"
          >
            <Edit3 size={12} />
            Edit Goals
          </button>
        </div>

        {/* Streaks Row */}
        <div className="grid grid-cols-3 gap-2 stagger-children">
          <StreakCard streak={stats.winStreak} label="Win Streak" icon={Flame} color="#f6c948" />
          <StreakCard streak={stats.profitDayStreak} label="Profit Days" icon={TrendingUp} color="#10b981" />
          <StreakCard streak={stats.bestStreak} label="Best Streak" icon={Trophy} color="#a855f7" />
        </div>

        {/* Goals progress */}
        <div className="space-y-3 stagger-children">
          <GoalCard
            label="Weekly P&L"
            current={Math.max(0, stats.weekPnl)}
            target={goals.weeklyPnl}
            icon={Zap}
            color="#f6c948"
            format={formatCurrency}
          />
          <GoalCard
            label="Monthly P&L"
            current={Math.max(0, stats.monthPnl)}
            target={goals.monthlyPnl}
            icon={TrendingUp}
            color="#10b981"
            format={formatCurrency}
          />
          <GoalCard
            label="Win Rate"
            current={stats.winRate}
            target={goals.winRateTarget}
            icon={Target}
            color="#3b82f6"
            unit="%"
          />
          <GoalCard
            label="Avg Risk/Reward"
            current={stats.avgRR}
            target={goals.minRR}
            icon={Shield}
            color="#a855f7"
            unit="R"
          />
        </div>

        {/* Daily trade discipline */}
        <div className="glass-card rounded-2xl p-4 border border-border/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={14} className="text-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">This Week's Discipline</span>
            </div>
          </div>
          <div className="space-y-2">
            {[
              {
                label: "Week P&L",
                value: stats.weekPnl,
                ok: stats.weekPnl >= 0,
                display: formatCurrency(stats.weekPnl),
                color: stats.weekPnl >= 0 ? "#10b981" : "#ef4444"
              },
              {
                label: "Trades taken",
                value: stats.weekTradeCount,
                ok: stats.weekTradeCount <= goals.dailyTradeLimit * 5,
                display: `${stats.weekTradeCount} / ${goals.dailyTradeLimit * 5} limit`,
                color: stats.weekTradeCount <= goals.dailyTradeLimit * 5 ? "#10b981" : "#ef4444"
              },
              {
                label: "Win Rate this week",
                value: (() => {
                  const wt = trades.filter(t => t.status === "closed" && t.pnl != null && t.entryDate >= weekStart);
                  return wt.length ? (wt.filter(t => (t.pnl ?? 0) > 0).length / wt.length) * 100 : 0;
                })(),
                ok: (() => {
                  const wt = trades.filter(t => t.status === "closed" && t.pnl != null && t.entryDate >= weekStart);
                  const wr = wt.length ? (wt.filter(t => (t.pnl ?? 0) > 0).length / wt.length) * 100 : 0;
                  return wr >= goals.winRateTarget;
                })(),
                display: (() => {
                  const wt = trades.filter(t => t.status === "closed" && t.pnl != null && t.entryDate >= weekStart);
                  const wr = wt.length ? (wt.filter(t => (t.pnl ?? 0) > 0).length / wt.length) * 100 : 0;
                  return `${wr.toFixed(1)}% (target: ${goals.winRateTarget}%)`;
                })(),
                color: (() => {
                  const wt = trades.filter(t => t.status === "closed" && t.pnl != null && t.entryDate >= weekStart);
                  const wr = wt.length ? (wt.filter(t => (t.pnl ?? 0) > 0).length / wt.length) * 100 : 0;
                  return wr >= goals.winRateTarget ? "#10b981" : "#f6c948";
                })(),
              },
            ].map(({ label, ok, display, color }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${ok ? "bg-emerald-400/15" : "bg-red-400/15"}`}>
                    {ok ? <Check size={11} className="text-emerald-400" /> : <X size={11} className="text-red-400" />}
                  </div>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                <span className="text-xs font-bold" style={{ color }}>{display}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Achievements</p>
          <div className="grid grid-cols-2 gap-2 stagger-children">
            {achievements.map(({ label, desc, earned, icon: Icon }) => (
              <div key={label} className={cn(
                "glass-card rounded-2xl p-3.5 border transition-all",
                earned
                  ? "border-yellow-400/30 bg-yellow-400/5"
                  : "border-border/30 opacity-50"
              )}>
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center mb-2",
                  earned ? "bg-yellow-400/15" : "bg-muted"
                )}>
                  <Icon size={16} className={earned ? "text-yellow-400" : "text-muted-foreground"} />
                </div>
                <p className={cn("text-xs font-bold", earned ? "text-foreground" : "text-muted-foreground")}>{label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{desc}</p>
                {earned && (
                  <div className="flex items-center gap-1 mt-2">
                    <Trophy size={9} className="text-yellow-400" />
                    <span className="text-[9px] font-bold text-yellow-400">Earned</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="h-2" />
      </div>

      {editing && (
        <EditGoalsSheet goals={goals} onSave={saveGoals} onClose={() => setEditing(false)} />
      )}
    </>
  );
}
