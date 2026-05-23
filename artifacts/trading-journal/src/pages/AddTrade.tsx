import { useState, useRef } from "react";
import { useTrades, TradeInput } from "@/contexts/TradesContext";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { useLocation } from "wouter";
import { ChevronDown, Upload, X, Check, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

const EMOTIONS = [
  { value: "confident", label: "Confident", emoji: "💪" },
  { value: "focused",   label: "Focused",   emoji: "🎯" },
  { value: "neutral",   label: "Neutral",   emoji: "😐" },
  { value: "fearful",   label: "Fearful",   emoji: "😨" },
  { value: "anxious",   label: "Anxious",   emoji: "😰" },
  { value: "greedy",    label: "Greedy",    emoji: "🤑" },
] as const;

const EMOTIONS_AFTER = [
  { value: "satisfied",    label: "Satisfied",    emoji: "😊" },
  { value: "excited",      label: "Excited",      emoji: "🤩" },
  { value: "neutral",      label: "Neutral",      emoji: "😐" },
  { value: "regret",       label: "Regret",       emoji: "😔" },
  { value: "disappointed", label: "Disappointed", emoji: "😞" },
] as const;

const SETUPS   = ["Breakout","Pullback","Reversal","Momentum","Gap Fill","VWAP","Support/Resistance","Pattern","News","Other"];
const ACCOUNTS = ["Main","Demo","Swing","Options","Futures","Forex"];
const TAGS     = ["FOMO","Revenge","Discipline","Perfect Setup","Overtraded","Halved Size","Broke Rules","Patient"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-3xl p-5 border border-white/[0.06] flex flex-col gap-4">
      <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label}{required && <span className="text-primary ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function AddTrade() {
  const { addTrade } = useTrades();
  const { toast } = useToast();
  const { notifyTradeLogged } = useNotifications();
  const [, setLocation] = useLocation();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    symbol: "", direction: "long" as "long" | "short",
    entryDate: new Date().toISOString().split("T")[0], exitDate: "",
    entryPrice: "", exitPrice: "", quantity: "",
    emotion: "neutral" as TradeInput["emotion"],
    emotionAfter: undefined as TradeInput["emotionAfter"],
    setup: "", account: "Main", notes: "", mistakes: "",
    tags: [] as string[], screenshotFile: null as File | null,
  });
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const toggleTag = (tag: string) =>
    setForm(f => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag] }));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    set("screenshotFile", file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.symbol || !form.entryPrice || !form.quantity) return;
    setLoading(true);
    try {
      await addTrade({
        symbol: form.symbol, direction: form.direction,
        entryPrice: parseFloat(form.entryPrice),
        exitPrice:  form.exitPrice ? parseFloat(form.exitPrice) : undefined,
        quantity:   parseFloat(form.quantity),
        emotion: form.emotion, emotionAfter: form.emotionAfter,
        setup: form.setup, notes: form.notes, mistakes: form.mistakes,
        account: form.account, tags: form.tags,
        entryDate: form.entryDate, exitDate: form.exitDate || undefined,
        screenshotFile: form.screenshotFile || undefined,
      });
      toast({ title: "Trade logged!", description: `${form.symbol} saved.` });
      const exitPnl = form.exitPrice && form.entryPrice && form.quantity
        ? (parseFloat(form.exitPrice) - parseFloat(form.entryPrice))
          * parseFloat(form.quantity)
          * (form.direction === "short" ? -1 : 1)
        : undefined;
      void notifyTradeLogged(form.symbol, exitPnl);
      setLocation("/");
    } catch {
      toast({ title: "Error", description: "Failed to save trade.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="page-header px-5 py-3.5">
        <h1 className="text-lg font-bold font-serif text-foreground">Log Trade</h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">Record every detail for better insights</p>
      </header>

      <form onSubmit={handleSubmit} className="px-4 pt-4 pb-6 flex flex-col gap-4">

        {/* Trade details */}
        <Section title="Trade Details">
          <Field label="Symbol" required>
            <input data-testid="input-symbol" type="text" placeholder="AAPL · BTC · EUR/USD"
              value={form.symbol} onChange={e => set("symbol", e.target.value.toUpperCase())}
              className="field-input" required />
          </Field>

          <Field label="Direction" required>
            <div className="grid grid-cols-2 gap-2">
              {(["long","short"] as const).map(dir => (
                <button key={dir} type="button" data-testid={`btn-direction-${dir}`}
                  onClick={() => set("direction", dir)}
                  className={cn(
                    "py-4 rounded-2xl text-sm font-bold border transition-all duration-200 active:scale-95",
                    form.direction === dir
                      ? dir === "long"
                        ? "bg-emerald-400/20 border-emerald-400/40 text-emerald-400"
                        : "bg-red-400/20 border-red-400/40 text-red-400"
                      : "bg-secondary/40 border-border/40 text-muted-foreground"
                  )}>
                  {dir === "long" ? "▲ Long" : "▼ Short"}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Entry Date" required>
              <input data-testid="input-entry-date" type="date" value={form.entryDate}
                onChange={e => set("entryDate", e.target.value)} className="field-input" required />
            </Field>
            <Field label="Exit Date">
              <input data-testid="input-exit-date" type="date" value={form.exitDate}
                onChange={e => set("exitDate", e.target.value)} className="field-input" />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { key: "entryPrice", label: "Entry $", placeholder: "0.00", required: true },
              { key: "exitPrice",  label: "Exit $",  placeholder: "0.00", required: false },
              { key: "quantity",   label: "Qty",     placeholder: "0",    required: true },
            ].map(({ key, label, placeholder, required }) => (
              <Field key={key} label={label} required={required}>
                <input data-testid={`input-${key}`} type="number" step="any" placeholder={placeholder}
                  value={(form as Record<string,unknown>)[key] as string}
                  onChange={e => set(key, e.target.value)}
                  className="field-input" required={required} />
              </Field>
            ))}
          </div>
        </Section>

        {/* Setup & Account */}
        <Section title="Setup & Account">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Account">
              <div className="relative">
                <select data-testid="select-account" value={form.account} onChange={e => set("account", e.target.value)}
                  className={cn("field-input appearance-none pr-8")}>
                  {ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </Field>
            <Field label="Setup">
              <div className="relative">
                <select data-testid="select-setup" value={form.setup} onChange={e => set("setup", e.target.value)}
                  className={cn("field-input appearance-none pr-8")}>
                  <option value="">Select…</option>
                  {SETUPS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </Field>
          </div>
        </Section>

        {/* Psychology */}
        <Section title="Psychology">
          <Field label="Emotion Before Trade">
            <div className="grid grid-cols-3 gap-2">
              {EMOTIONS.map(em => (
                <button key={em.value} type="button" data-testid={`btn-emotion-${em.value}`}
                  onClick={() => set("emotion", em.value)}
                  className={cn(
                    "py-3 rounded-2xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all duration-200 active:scale-95",
                    form.emotion === em.value
                      ? "bg-primary/20 border-primary/40 text-primary"
                      : "bg-secondary/30 border-border/40 text-muted-foreground"
                  )}>
                  <span className="text-lg leading-none">{em.emoji}</span>
                  {em.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Emotion After Trade">
            <div className="grid grid-cols-3 gap-2" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
              {EMOTIONS_AFTER.map(em => (
                <button key={em.value} type="button" data-testid={`btn-emotion-after-${em.value}`}
                  onClick={() => set("emotionAfter", em.value)}
                  className={cn(
                    "py-3 rounded-2xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all duration-200 active:scale-95",
                    form.emotionAfter === em.value
                      ? "bg-primary/20 border-primary/40 text-primary"
                      : "bg-secondary/30 border-border/40 text-muted-foreground"
                  )}>
                  <span className="text-lg leading-none">{em.emoji}</span>
                  <span className="text-center leading-tight">{em.label}</span>
                </button>
              ))}
            </div>
          </Field>
        </Section>

        {/* Notes */}
        <Section title="Notes & Analysis">
          <Field label="Trade Notes">
            <textarea data-testid="input-notes"
              placeholder="Why did you take this trade? What did you see?"
              value={form.notes} onChange={e => set("notes", e.target.value)}
              rows={3} className="field-input resize-none" />
          </Field>
          <Field label="Mistakes / Lessons">
            <textarea data-testid="input-mistakes"
              placeholder="Any errors? What would you do differently?"
              value={form.mistakes} onChange={e => set("mistakes", e.target.value)}
              rows={2} className="field-input resize-none" />
          </Field>
          <Field label="Tags">
            <div className="flex flex-wrap gap-2">
              {TAGS.map(tag => (
                <button key={tag} type="button" onClick={() => toggleTag(tag)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition-all duration-200 active:scale-95 tap-small",
                    form.tags.includes(tag)
                      ? "bg-primary/20 border-primary/40 text-primary"
                      : "bg-secondary/30 border-border/40 text-muted-foreground"
                  )}>
                  <Tag size={9} />
                  {tag}
                  {form.tags.includes(tag) && <Check size={9} />}
                </button>
              ))}
            </div>
          </Field>
        </Section>

        {/* Screenshot */}
        <Section title="Chart Screenshot">
          {preview ? (
            <div className="relative rounded-2xl overflow-hidden">
              <img src={preview} alt="chart" className="w-full object-cover max-h-56 rounded-2xl" />
              <button type="button"
                onClick={() => { set("screenshotFile", null); setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                className="absolute top-2 right-2 w-8 h-8 bg-black/60 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center tap-small">
                <X size={14} className="text-white" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-border/40 rounded-2xl py-8 flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 active:scale-[0.98]">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Upload size={18} className="text-primary" />
              </div>
              <span className="text-sm text-muted-foreground font-medium">Tap to upload screenshot</span>
              <span className="text-xs text-muted-foreground/50">JPG · PNG · WebP</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" data-testid="input-screenshot" />
        </Section>

        <button data-testid="btn-submit-trade" type="submit" disabled={loading} className="btn-primary">
          {loading ? "Saving…" : "Save Trade"}
        </button>

        <div className="h-4" />
      </form>
    </div>
  );
}
