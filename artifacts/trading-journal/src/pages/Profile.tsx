import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTrades } from "@/contexts/TradesContext";
import { useGoals } from "@/contexts/GoalsContext";
import { useCurrency, CURRENCIES, CurrencyOption } from "@/contexts/CurrencyContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useToast } from "@/hooks/use-toast";
import { getPnlColor } from "@/lib/utils";
import {
  LogOut, User, Award, Trash2, TrendingUp, Shield, ChevronRight, AlertCircle,
  Bell, BellOff, BellRing, CheckCircle, ChevronDown, Globe, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Profile() {
  const { user, logout } = useAuth();
  const { trades, deleteTrade, loading, error } = useTrades();
  const { goals } = useGoals();
  const { currency, setCurrency, format } = useCurrency();
  const notif = useNotifications();
  const { toast } = useToast();

  const [confirmLogout, setConfirmLogout] = useState(false);
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [testSent, setTestSent] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  void goals; // available if needed

  const closed   = trades.filter(t => t.status === "closed" && t.pnl != null);
  const totalPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const winRate  = closed.length ? (closed.filter(t => (t.pnl ?? 0) > 0).length / closed.length) * 100 : 0;
  const accounts = [...new Set(trades.map(t => t.account || "Main"))];

  const handleLogout = async () => {
    try { await logout(); }
    catch { toast({ title: "Error", description: "Failed to sign out.", variant: "destructive" }); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteTrade(id); toast({ title: "Deleted" }); setDeleteId(null); }
    catch { toast({ title: "Error", description: "Failed to delete.", variant: "destructive" }); }
  };

  const handleToggleNotifs = async () => {
    if (notif.status === "subscribed") { await notif.unsubscribe(); toast({ title: "Notifications off" }); }
    else { await notif.subscribe(); if (notif.status !== "denied") toast({ title: "Notifications enabled!" }); }
  };

  const handleTestNotif = async () => {
    await notif.sendTest(); setTestSent(true); setTimeout(() => setTestSent(false), 3000);
    toast({ title: "Test sent!", description: "Check your notification bar." });
  };

  const firstName = user?.displayName?.split(" ")[0] ?? "Trader";
  const tier = winRate >= 60 ? "Elite Trader" : winRate >= 40 ? "Rising Trader" : "Learning Trader";

  const notifLabel = { unsupported: "Not supported", denied: "Blocked", default: "Enable notifications", granted: "Enable notifications", subscribed: "Active" }[notif.status];

  return (
    <div className="flex flex-col">
      <header className="page-header px-5 py-3.5">
        <h1 className="text-lg font-bold font-serif text-foreground">Profile</h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">Account, settings & trade history</p>
      </header>

      <div className="px-4 pt-4 pb-6 flex flex-col gap-4">
        {error && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/25 rounded-2xl p-4">
            <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div><p className="text-sm font-semibold text-red-300">Firebase error</p><p className="text-[11px] text-red-400/80 mt-0.5">{error}</p></div>
          </div>
        )}

        {/* Profile hero */}
        <div className="glass-card rounded-3xl p-5 border border-white/[0.06] relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/25 flex-shrink-0 flex items-center justify-center overflow-hidden">
              {user?.photoURL ? <img src={user.photoURL} alt="avatar" className="w-full h-full object-cover" /> : <User size={28} className="text-primary" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold font-serif text-foreground truncate">{user?.displayName ?? "Trader"}</h2>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              <div className="flex items-center gap-1.5 mt-1.5"><Award size={11} className="text-primary flex-shrink-0" /><span className="text-[11px] font-bold text-primary">{tier}</span></div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-border/30">
            {[
              { label: "Total P&L", value: format(totalPnl),          color: getPnlColor(totalPnl) },
              { label: "Trades",    value: String(trades.length),      color: "text-foreground" },
              { label: "Win Rate",  value: `${winRate.toFixed(1)}%`,   color: winRate >= 50 ? "text-emerald-400" : "text-red-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className={`text-base font-bold font-serif ${color}`}>{value}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Currency Picker ─────────────────────────────── */}
        <div className="glass-card rounded-3xl p-5 border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-xl bg-blue-500/10"><Globe size={14} className="text-blue-400" /></div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Display Currency</p>
          </div>

          <button
            data-testid="btn-currency-toggle"
            onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
            className="w-full flex items-center justify-between bg-secondary/40 border border-border/40 rounded-2xl px-4 py-3.5 hover:bg-secondary/60 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-primary">{currency.symbol}</span>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">{currency.name}</p>
                <p className="text-[10px] text-muted-foreground">{currency.code} · {format(1234.56)}</p>
              </div>
            </div>
            <ChevronDown size={16} className={cn("text-muted-foreground transition-transform", showCurrencyPicker && "rotate-180")} />
          </button>

          {showCurrencyPicker && (
            <div className="mt-2 border border-border/40 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
              {CURRENCIES.map((c: CurrencyOption) => (
                <button
                  key={c.code}
                  data-testid={`btn-currency-${c.code}`}
                  onClick={() => { setCurrency(c); setShowCurrencyPicker(false); toast({ title: `Currency changed to ${c.name}` }); }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-left border-b border-border/20 last:border-0 transition-colors",
                    currency.code === c.code ? "bg-primary/15" : "hover:bg-secondary/40"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 text-base font-bold text-primary text-center">{c.symbol}</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">{c.code}</p>
                    </div>
                  </div>
                  {currency.code === c.code && <CheckCircle size={14} className="text-primary flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
            Changes the currency symbol throughout the app. P&L values are stored as-is.
          </p>
        </div>

        {/* ── Push Notifications ─────────────────────────── */}
        <div className="glass-card rounded-3xl p-5 border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-4">
            <div className={`p-1.5 rounded-xl ${notif.status === "subscribed" ? "bg-primary/15" : "bg-muted"}`}>
              {notif.status === "subscribed" ? <BellRing size={14} className="text-primary" /> : notif.status === "denied" ? <BellOff size={14} className="text-muted-foreground" /> : <Bell size={14} className="text-muted-foreground" />}
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Push Notifications</p>
            <span className={cn("ml-auto text-[10px] font-bold rounded-full px-2 py-0.5",
              notif.status === "subscribed" ? "bg-emerald-400/15 text-emerald-400" :
              notif.status === "denied"     ? "bg-red-400/15 text-red-400" :
              "bg-muted text-muted-foreground")}>
              {notifLabel}
            </span>
          </div>

          {notif.status !== "unsupported" && (
            <div className="flex flex-col gap-2">
              <button data-testid="btn-toggle-notifications" onClick={handleToggleNotifs} disabled={notif.loading || notif.status === "denied"}
                className={cn("w-full py-3.5 rounded-2xl text-sm font-bold border transition-all duration-200 active:scale-95 disabled:opacity-50",
                  notif.status === "subscribed" ? "bg-destructive/15 border-destructive/30 text-destructive hover:bg-destructive/25" :
                  notif.status === "denied"     ? "bg-muted border-border text-muted-foreground cursor-not-allowed" :
                  "bg-primary/15 border-primary/30 text-primary hover:bg-primary/25")}>
                {notif.loading ? "Loading…" : notif.status === "subscribed" ? "Turn Off Notifications" : notif.status === "denied" ? "Blocked — Update Browser Settings" : "Enable Push Notifications"}
              </button>
              {notif.status === "subscribed" && (
                <button data-testid="btn-test-notification" onClick={handleTestNotif}
                  className="w-full py-3 rounded-2xl text-xs font-semibold border border-border/40 text-muted-foreground hover:text-foreground transition-all active:scale-95 flex items-center justify-center gap-2">
                  {testSent ? <><CheckCircle size={13} className="text-emerald-400" /> Sent!</> : "Send Test Notification"}
                </button>
              )}
              {notif.status === "subscribed" && (
                <div className="pt-2 border-t border-border/30 flex flex-col gap-1.5 mt-1">
                  {[{ label: "Daily trade reminder", time: "6:00 PM UTC" }, { label: "Weekly summary", time: "Mon 8:00 AM UTC" }].map(({ label, time }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{label}</span>
                      <span className="text-[10px] text-muted-foreground/60">{time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Accounts */}
        {accounts.length > 0 && (
          <div className="glass-card rounded-3xl p-5 border border-white/[0.06]">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Trading Accounts</p>
            <div className="flex flex-col divide-y divide-border/30">
              {accounts.map(acc => {
                const at   = trades.filter(t => (t.account || "Main") === acc && t.status === "closed" && t.pnl != null);
                const aPnl = at.reduce((s, t) => s + (t.pnl ?? 0), 0);
                return (
                  <div key={acc} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><Shield size={14} className="text-primary" /></div>
                      <span className="text-sm font-semibold text-foreground">{acc}</span>
                    </div>
                    <div className="text-right"><p className={`text-sm font-bold ${getPnlColor(aPnl)}`}>{format(aPnl)}</p><p className="text-[10px] text-muted-foreground">{at.length} trades</p></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Trade log */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Trade Log</p>
            <span className="text-xs text-muted-foreground">{trades.length} total</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10"><div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
          ) : trades.length === 0 ? (
            <div className="glass-card rounded-3xl p-8 border border-white/[0.06] text-center flex flex-col items-center gap-3">
              <TrendingUp size={24} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No trades logged yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 stagger">
              {trades.map(t => (
                <div key={t.id} className="glass-card rounded-2xl px-4 py-3.5 border border-white/[0.06]">
                  {deleteId === t.id ? (
                    <div className="flex items-center gap-2">
                      <AlertCircle size={14} className="text-destructive flex-shrink-0" />
                      <span className="text-xs text-muted-foreground flex-1">Remove this trade?</span>
                      <button onClick={() => handleDelete(t.id)} className="text-xs font-bold text-destructive px-2 py-1 tap-small">Delete</button>
                      <button onClick={() => setDeleteId(null)} className="text-xs text-muted-foreground px-2 py-1 tap-small">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${t.direction === "long" ? "bg-emerald-400/15 text-emerald-400" : "bg-red-400/15 text-red-400"}`}>
                          {t.direction === "long" ? "↑" : "↓"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-foreground">{t.symbol}</span>
                            <span className="text-[10px] text-muted-foreground bg-secondary/60 rounded-full px-1.5 py-0.5">{t.account || "Main"}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{t.entryDate}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          {t.pnl != null ? <span className={`text-sm font-bold ${getPnlColor(t.pnl)}`}>{format(t.pnl)}</span> : <span className="text-xs text-blue-400 font-semibold">Open</span>}
                        </div>
                        <button data-testid={`btn-delete-trade-${t.id}`} onClick={() => setDeleteId(t.id)}
                          className="w-8 h-8 rounded-xl hover:bg-destructive/15 flex items-center justify-center transition-colors tap-small text-muted-foreground hover:text-destructive">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logout */}
        {confirmLogout ? (
          <div className="glass-card rounded-3xl p-5 border border-destructive/30 bg-destructive/5">
            <p className="text-sm font-bold text-destructive mb-4">Sign out of TradeJournal?</p>
            <div className="flex gap-3">
              <button onClick={handleLogout} className="flex-1 bg-destructive text-white font-bold py-3.5 rounded-2xl hover:brightness-110 active:scale-95 transition-all text-sm">Sign Out</button>
              <button onClick={() => setConfirmLogout(false)} className="flex-1 bg-secondary text-foreground font-semibold py-3.5 rounded-2xl text-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <button data-testid="btn-logout" onClick={() => setConfirmLogout(true)}
            className="w-full flex items-center justify-between glass-card rounded-3xl p-4 border border-white/[0.06] hover:border-destructive/30 hover:bg-destructive/5 transition-all duration-200 group card-hover">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center"><LogOut size={16} className="text-destructive" /></div>
              <span className="text-sm font-semibold text-destructive">Sign Out</span>
            </div>
            <ChevronRight size={16} className="text-muted-foreground group-hover:text-destructive transition-colors" />
          </button>
        )}
        <div className="h-4" />
      </div>
    </div>
  );
}
