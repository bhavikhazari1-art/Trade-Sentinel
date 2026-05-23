import { useState, useMemo } from "react";
import { useTrades } from "@/contexts/TradesContext";
import { useGoals, Goals as GoalsType } from "@/contexts/GoalsContext";
import { formatCurrency, getPnlColor } from "@/lib/utils";
import { Target, Flame, Trophy, TrendingUp, Shield, Edit3, Check, X, Zap, Star, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

function getWeekStart() {
  const d = new Date(), day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split("T")[0];
}
function getMonthStart() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-01`;
}

function ProgressRing({ pct, size = 64, color }: { pct: number; size?: number; color: string }) {
  const r = (size-8)/2, circ = 2*Math.PI*r, offset = circ - (Math.min(100,pct)/100)*circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={7} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease" }} />
    </svg>
  );
}

function GoalCard({ label, current, target, color, icon: Icon, format }: {
  label: string; current: number; target: number; color: string; icon: React.ElementType; format?: (v:number)=>string;
}) {
  const pct = Math.min(100, target > 0 ? (current/target)*100 : 0);
  const fmt = format ?? ((v: number) => `${v.toFixed(1)}`);
  const done = current >= target && target > 0;
  return (
    <div className={cn("glass-card rounded-3xl p-4 border transition-all card-hover", done ? "border-yellow-400/30 bg-yellow-400/5" : "border-white/[0.06]")}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl" style={{ background: `${color}20` }}>
            <Icon size={13} style={{ color }} />
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
        </div>
        {done && (
          <div className="flex items-center gap-1 bg-yellow-400/15 border border-yellow-400/25 rounded-full px-2 py-0.5">
            <Trophy size={9} className="text-yellow-400" />
            <span className="text-[9px] font-bold text-yellow-400">Done!</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <ProgressRing pct={pct} size={68} color={color} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-foreground">{pct.toFixed(0)}%</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xl font-bold font-serif" style={{ color }}>{fmt(current)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">of {fmt(target)}</p>
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000" style={{ width:`${pct}%`, background: color }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function EditSheet({ goals, onSave, onClose }: { goals: GoalsType; onSave: (g: GoalsType) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState<GoalsType>({ ...goals });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof GoalsType, v: string) => setForm(f => ({ ...f, [k]: parseFloat(v) || 0 }));

  const fields: { key: keyof GoalsType; label: string; prefix?: string; suffix?: string }[] = [
    { key: "weeklyPnl",       label: "Weekly P&L Target",    prefix: "$" },
    { key: "monthlyPnl",      label: "Monthly P&L Target",   prefix: "$" },
    { key: "winRateTarget",   label: "Win Rate Target",       suffix: "%" },
    { key: "dailyTradeLimit", label: "Max Trades / Day"                   },
    { key: "minRR",           label: "Min Risk/Reward",       suffix: "R" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-card border border-border rounded-t-3xl shadow-2xl"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom,0px), 16px)" }}>
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <h3 className="text-base font-bold font-serif text-foreground">Set Your Goals</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center tap-small">
            <X size={15} className="text-muted-foreground" />
          </button>
        </div>
        <div className="px-5 pb-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
          {fields.map(({ key, label, prefix, suffix }) => (
            <div key={key as string}>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">{label}</label>
              <div className="relative">
                {prefix && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>}
                <input type="number" step="any" value={form[key] as number}
                  onChange={e => set(key, e.target.value)}
                  className={cn("field-input", prefix ? "pl-8" : suffix ? "pr-8" : "")} />
                {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{suffix}</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 pt-2">
          <button onClick={async () => { setSaving(true); await onSave(form); setSaving(false); onClose(); }}
            disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save Goals"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Goals() {
  const { trades } = useTrades();
  const { goals, loading, saveGoals } = useGoals();
  const [editing, setEditing] = useState(false);

  const weekStart  = getWeekStart();
  const monthStart = getMonthStart();

  const stats = useMemo(() => {
    const closed = trades.filter(t => t.status === "closed" && t.pnl != null);
    const weekT  = closed.filter(t => t.entryDate >= weekStart);
    const monthT = closed.filter(t => t.entryDate >= monthStart);
    const weekPnl  = weekT.reduce((s,t)  => s+(t.pnl??0), 0);
    const monthPnl = monthT.reduce((s,t) => s+(t.pnl??0), 0);
    const wins     = closed.filter(t => (t.pnl??0) > 0).length;
    const winRate  = closed.length ? (wins/closed.length)*100 : 0;
    const avgRR    = (() => {
      const w = closed.filter(t=>(t.pnl??0)>0), l = closed.filter(t=>(t.pnl??0)<0);
      const aw = w.length ? w.reduce((s,t)=>s+(t.pnl??0),0)/w.length : 0;
      const al = l.length ? Math.abs(l.reduce((s,t)=>s+(t.pnl??0),0)/l.length) : 1;
      return al > 0 ? aw/al : 0;
    })();
    let winStreak = 0; for (const t of closed){ if((t.pnl??0)>0) winStreak++; else break; }
    let bestStreak = 0, cur = 0;
    for (const t of [...closed].reverse()){ if((t.pnl??0)>0){cur++;bestStreak=Math.max(bestStreak,cur);}else cur=0; }
    const dayPnl: Record<string,number> = {};
    for (const t of closed) dayPnl[t.entryDate] = (dayPnl[t.entryDate]??0)+(t.pnl??0);
    let profitDayStreak = 0;
    for (const [,v] of Object.entries(dayPnl).sort(([a],[b])=>b.localeCompare(a))){ if(v>0) profitDayStreak++; else break; }
    const weekWinRate = weekT.length ? (weekT.filter(t=>(t.pnl??0)>0).length/weekT.length)*100 : 0;
    return { weekPnl, monthPnl, winRate, avgRR, winStreak, bestStreak, profitDayStreak, weekCount: weekT.length, weekWinRate, total: closed.length };
  }, [trades, weekStart, monthStart]);

  const achievements = useMemo(() => [
    { label: "First Trade",    desc: "Log your first trade",          earned: stats.total >= 1,  icon: Star       },
    { label: "10 Trades",      desc: "Log 10 closed trades",          earned: stats.total >= 10, icon: BarChart3  },
    { label: "50 Trades",      desc: "Reach 50 closed trades",        earned: stats.total >= 50, icon: BarChart3  },
    { label: "Win Streak 3",   desc: "3 wins in a row",               earned: stats.bestStreak >= 3, icon: Flame  },
    { label: "Win Streak 5",   desc: "5 consecutive wins",            earned: stats.bestStreak >= 5, icon: Flame  },
    { label: "Consistent",     desc: "3 profitable days in a row",    earned: stats.profitDayStreak >= 3, icon: TrendingUp },
    { label: "Monthly Goal",   desc: "Hit your monthly P&L target",   earned: stats.monthPnl >= goals.monthlyPnl && goals.monthlyPnl > 0, icon: Trophy },
    { label: "Risk Master",    desc: "Maintain 2:1+ R/R",             earned: stats.avgRR >= 2,  icon: Shield     },
  ], [stats, goals]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <>
      <div className="flex flex-col">
        <header className="page-header px-5 py-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Target size={17} className="text-primary" />
              <h1 className="text-lg font-bold font-serif text-foreground">Goals & Streaks</h1>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Track your targets and consistency</p>
          </div>
          <button data-testid="btn-edit-goals" onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 bg-primary/15 border border-primary/25 text-primary text-xs font-bold px-3 py-2 rounded-xl hover:bg-primary/25 active:scale-90 transition-all tap-small">
            <Edit3 size={11} /> Edit
          </button>
        </header>

        <div className="px-4 pt-4 pb-6 flex flex-col gap-4">
          {/* Streak cards */}
          <div className="grid grid-cols-3 gap-2 stagger">
            {[
              { streak: stats.winStreak,      label: "Win\nStreak",    icon: Flame,      color: "#f6c948" },
              { streak: stats.profitDayStreak, label: "Profit\nDays",  icon: TrendingUp, color: "#10b981" },
              { streak: stats.bestStreak,     label: "Best\nStreak",   icon: Trophy,     color: "#a855f7" },
            ].map(({ streak, label, icon: Icon, color }) => (
              <div key={label} className="glass-card rounded-2xl p-3.5 border border-white/[0.06] flex flex-col items-center text-center">
                <div className="p-2 rounded-xl mb-1.5" style={{ background: `${color}20` }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <p className="text-3xl font-bold font-serif leading-none" style={{ color }}>{streak}</p>
                <p className="text-[9px] text-muted-foreground mt-1.5 leading-tight whitespace-pre-line font-medium">{label}</p>
              </div>
            ))}
          </div>

          {/* Goal progress */}
          <div className="flex flex-col gap-3 stagger">
            <GoalCard label="Weekly P&L"   current={Math.max(0,stats.weekPnl)}  target={goals.weeklyPnl}     icon={Zap}      color="#f6c948" format={formatCurrency} />
            <GoalCard label="Monthly P&L"  current={Math.max(0,stats.monthPnl)} target={goals.monthlyPnl}    icon={TrendingUp} color="#10b981" format={formatCurrency} />
            <GoalCard label="Win Rate"      current={stats.winRate}              target={goals.winRateTarget} icon={Target}   color="#3b82f6" format={v=>`${v.toFixed(1)}%`} />
            <GoalCard label="Risk/Reward"   current={stats.avgRR}                target={goals.minRR}         icon={Shield}   color="#a855f7" format={v=>`${v.toFixed(2)}R`} />
          </div>

          {/* Weekly discipline */}
          <div className="glass-card rounded-3xl p-5 border border-white/[0.06]">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">This Week's Discipline</p>
            <div className="flex flex-col divide-y divide-border/30">
              {[
                { label: "Week P&L",     ok: stats.weekPnl >= 0, display: formatCurrency(stats.weekPnl), color: getPnlColor(stats.weekPnl) },
                { label: "Trades taken", ok: stats.weekCount <= goals.dailyTradeLimit*5, display: `${stats.weekCount}/${goals.dailyTradeLimit*5} limit`, color: stats.weekCount <= goals.dailyTradeLimit*5 ? "text-emerald-400" : "text-red-400" },
                { label: "Week Win Rate", ok: stats.weekWinRate >= goals.winRateTarget, display: `${stats.weekWinRate.toFixed(1)}% (goal: ${goals.winRateTarget}%)`, color: stats.weekWinRate >= goals.winRateTarget ? "text-emerald-400" : "text-yellow-400" },
              ].map(({ label, ok, display, color }) => (
                <div key={label} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${ok ? "bg-emerald-400/15" : "bg-red-400/15"}`}>
                      {ok ? <Check size={12} className="text-emerald-400" /> : <X size={12} className="text-red-400" />}
                    </div>
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  <span className={`text-xs font-bold ${color}`}>{display}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Achievements */}
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Achievements</p>
            <div className="grid grid-cols-2 gap-2.5 stagger">
              {achievements.map(({ label, desc, earned, icon: Icon }) => (
                <div key={label} className={cn(
                  "glass-card rounded-2xl p-4 border transition-all card-hover",
                  earned ? "border-yellow-400/25 bg-yellow-400/5" : "border-white/[0.04] opacity-50"
                )}>
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-2.5", earned ? "bg-yellow-400/15" : "bg-muted")}>
                    <Icon size={16} className={earned ? "text-yellow-400" : "text-muted-foreground"} />
                  </div>
                  <p className={cn("text-xs font-bold leading-tight", earned ? "text-foreground" : "text-muted-foreground")}>{label}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{desc}</p>
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
          <div className="h-4" />
        </div>
      </div>

      {editing && <EditSheet goals={goals} onSave={saveGoals} onClose={() => setEditing(false)} />}
    </>
  );
}
