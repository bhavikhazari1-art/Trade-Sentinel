import { useState, useRef } from "react";
import { useTrades, TradeInput } from "@/contexts/TradesContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  ChevronDown, Upload, X, Check, Tag
} from "lucide-react";
import { cn } from "@/lib/utils";

const EMOTIONS = [
  { value: "confident", label: "Confident", emoji: "💪" },
  { value: "focused", label: "Focused", emoji: "🎯" },
  { value: "neutral", label: "Neutral", emoji: "😐" },
  { value: "fearful", label: "Fearful", emoji: "😨" },
  { value: "anxious", label: "Anxious", emoji: "😰" },
  { value: "greedy", label: "Greedy", emoji: "🤑" },
] as const;

const EMOTIONS_AFTER = [
  { value: "satisfied", label: "Satisfied", emoji: "😊" },
  { value: "excited", label: "Excited", emoji: "🤩" },
  { value: "neutral", label: "Neutral", emoji: "😐" },
  { value: "regret", label: "Regret", emoji: "😔" },
  { value: "disappointed", label: "Disappointed", emoji: "😞" },
] as const;

const SETUPS = ["Breakout", "Pullback", "Reversal", "Momentum", "Gap Fill", "VWAP", "Support/Resistance", "Pattern", "News", "Other"];
const ACCOUNTS = ["Main", "Demo", "Swing", "Options", "Futures", "Forex"];
const COMMON_TAGS = ["FOMO", "Revenge", "Discipline", "Perfect Setup", "Overtraded", "Halved Size", "Broke Rules"];

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label} {required && <span className="text-primary">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-input/50 border border-border rounded-xl px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all";

export default function AddTrade() {
  const { addTrade } = useTrades();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<{
    symbol: string;
    direction: "long" | "short";
    entryDate: string;
    exitDate: string;
    entryPrice: string;
    exitPrice: string;
    quantity: string;
    emotion: TradeInput["emotion"];
    emotionAfter: TradeInput["emotionAfter"];
    setup: string;
    account: string;
    notes: string;
    mistakes: string;
    tags: string[];
    screenshotFile: File | null;
  }>({
    symbol: "",
    direction: "long",
    entryDate: new Date().toISOString().split("T")[0],
    exitDate: "",
    entryPrice: "",
    exitPrice: "",
    quantity: "",
    emotion: "neutral",
    emotionAfter: undefined,
    setup: "",
    account: "Main",
    notes: "",
    mistakes: "",
    tags: [],
    screenshotFile: null,
  });

  const [loading, setLoading] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const toggleTag = (tag: string) => {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag]
    }));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    set("screenshotFile", file);
    const url = URL.createObjectURL(file);
    setScreenshotPreview(url);
  };

  const removeScreenshot = () => {
    set("screenshotFile", null);
    setScreenshotPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.symbol || !form.entryPrice || !form.quantity) return;
    setLoading(true);
    try {
      await addTrade({
        symbol: form.symbol,
        direction: form.direction,
        entryPrice: parseFloat(form.entryPrice),
        exitPrice: form.exitPrice ? parseFloat(form.exitPrice) : undefined,
        quantity: parseFloat(form.quantity),
        emotion: form.emotion,
        emotionAfter: form.emotionAfter,
        setup: form.setup,
        notes: form.notes,
        mistakes: form.mistakes,
        account: form.account,
        tags: form.tags,
        entryDate: form.entryDate,
        exitDate: form.exitDate || undefined,
        screenshotFile: form.screenshotFile || undefined,
      });
      toast({ title: "Trade logged!", description: `${form.symbol} trade saved successfully.` });
      setLocation("/");
    } catch {
      toast({ title: "Error", description: "Failed to save trade.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 pt-5 pb-4">
      <div className="mb-5">
        <h1 className="text-xl font-bold font-serif text-foreground">Log Trade</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Record your trade with full details</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Symbol + Direction */}
        <div className="glass-card rounded-2xl p-4 border border-border/40 space-y-4">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest">Trade Details</p>

          <Field label="Symbol" required>
            <input
              data-testid="input-symbol"
              type="text"
              placeholder="AAPL, BTC, EUR/USD..."
              value={form.symbol}
              onChange={e => set("symbol", e.target.value.toUpperCase())}
              className={inputCls}
              required
            />
          </Field>

          <Field label="Direction" required>
            <div className="flex gap-2">
              {(["long", "short"] as const).map(dir => (
                <button
                  key={dir}
                  type="button"
                  data-testid={`btn-direction-${dir}`}
                  onClick={() => set("direction", dir)}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-sm font-semibold border transition-all duration-200",
                    form.direction === dir
                      ? dir === "long"
                        ? "bg-emerald-400/20 border-emerald-400/50 text-emerald-400"
                        : "bg-red-400/20 border-red-400/50 text-red-400"
                      : "bg-secondary/50 border-border text-muted-foreground"
                  )}
                >
                  {dir === "long" ? "▲ Long" : "▼ Short"}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Entry Date" required>
              <input data-testid="input-entry-date" type="date" value={form.entryDate}
                onChange={e => set("entryDate", e.target.value)} className={inputCls} required />
            </Field>
            <Field label="Exit Date">
              <input data-testid="input-exit-date" type="date" value={form.exitDate}
                onChange={e => set("exitDate", e.target.value)} className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Entry $" required>
              <input data-testid="input-entry-price" type="number" step="any" placeholder="0.00"
                value={form.entryPrice} onChange={e => set("entryPrice", e.target.value)} className={inputCls} required />
            </Field>
            <Field label="Exit $">
              <input data-testid="input-exit-price" type="number" step="any" placeholder="0.00"
                value={form.exitPrice} onChange={e => set("exitPrice", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Qty" required>
              <input data-testid="input-quantity" type="number" step="any" placeholder="0"
                value={form.quantity} onChange={e => set("quantity", e.target.value)} className={inputCls} required />
            </Field>
          </div>
        </div>

        {/* Account & Setup */}
        <div className="glass-card rounded-2xl p-4 border border-border/40 space-y-4">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest">Setup & Account</p>

          <Field label="Account">
            <div className="relative">
              <select data-testid="select-account" value={form.account} onChange={e => set("account", e.target.value)}
                className={cn(inputCls, "appearance-none pr-8")}>
                {ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </Field>

          <Field label="Setup">
            <div className="relative">
              <select data-testid="select-setup" value={form.setup} onChange={e => set("setup", e.target.value)}
                className={cn(inputCls, "appearance-none pr-8")}>
                <option value="">Select setup...</option>
                {SETUPS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </Field>
        </div>

        {/* Psychology */}
        <div className="glass-card rounded-2xl p-4 border border-border/40 space-y-4">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest">Psychology</p>

          <Field label="Emotion Before">
            <div className="grid grid-cols-3 gap-2">
              {EMOTIONS.map(em => (
                <button key={em.value} type="button" data-testid={`btn-emotion-${em.value}`}
                  onClick={() => set("emotion", em.value)}
                  className={cn(
                    "py-2.5 rounded-xl text-xs font-medium border transition-all duration-200 flex flex-col items-center gap-1",
                    form.emotion === em.value
                      ? "bg-primary/20 border-primary/50 text-primary"
                      : "bg-secondary/30 border-border/50 text-muted-foreground"
                  )}>
                  <span className="text-base">{em.emoji}</span>
                  {em.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Emotion After">
            <div className="grid grid-cols-3 gap-2">
              {EMOTIONS_AFTER.map(em => (
                <button key={em.value} type="button" data-testid={`btn-emotion-after-${em.value}`}
                  onClick={() => set("emotionAfter", em.value)}
                  className={cn(
                    "py-2.5 rounded-xl text-xs font-medium border transition-all duration-200 flex flex-col items-center gap-1",
                    form.emotionAfter === em.value
                      ? "bg-primary/20 border-primary/50 text-primary"
                      : "bg-secondary/30 border-border/50 text-muted-foreground"
                  )}>
                  <span className="text-base">{em.emoji}</span>
                  {em.label}
                </button>
              ))}
            </div>
          </Field>
        </div>

        {/* Notes & Mistakes */}
        <div className="glass-card rounded-2xl p-4 border border-border/40 space-y-4">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest">Notes & Analysis</p>

          <Field label="Trade Notes">
            <textarea data-testid="input-notes" placeholder="What did you observe? Why did you take this trade?"
              value={form.notes} onChange={e => set("notes", e.target.value)}
              rows={3} className={cn(inputCls, "resize-none")} />
          </Field>

          <Field label="Mistakes / Lessons">
            <textarea data-testid="input-mistakes" placeholder="Any mistakes? What would you do differently?"
              value={form.mistakes} onChange={e => set("mistakes", e.target.value)}
              rows={2} className={cn(inputCls, "resize-none")} />
          </Field>

          {/* Tags */}
          <Field label="Tags">
            <div className="flex flex-wrap gap-2">
              {COMMON_TAGS.map(tag => (
                <button key={tag} type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200",
                    form.tags.includes(tag)
                      ? "bg-primary/20 border-primary/50 text-primary"
                      : "bg-secondary/30 border-border/50 text-muted-foreground"
                  )}>
                  <Tag size={10} />
                  {tag}
                  {form.tags.includes(tag) && <Check size={10} />}
                </button>
              ))}
            </div>
          </Field>
        </div>

        {/* Screenshot Upload */}
        <div className="glass-card rounded-2xl p-4 border border-border/40 space-y-3">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest">Chart Screenshot</p>

          {screenshotPreview ? (
            <div className="relative">
              <img src={screenshotPreview} alt="chart" className="w-full rounded-xl object-cover max-h-48" />
              <button type="button" onClick={removeScreenshot}
                className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm border border-border rounded-full p-1 hover:bg-destructive/20 transition-colors">
                <X size={14} className="text-foreground" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-border/60 rounded-xl p-6 flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200">
              <Upload size={22} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Tap to upload chart screenshot</span>
              <span className="text-xs text-muted-foreground/60">JPG, PNG, WebP</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" data-testid="input-screenshot" />
        </div>

        <button
          data-testid="btn-submit-trade"
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-2xl hover:brightness-110 active:scale-95 transition-all duration-200 disabled:opacity-50 shadow-lg text-sm"
        >
          {loading ? "Saving Trade..." : "Save Trade"}
        </button>

        <div className="h-2" />
      </form>
    </div>
  );
}
