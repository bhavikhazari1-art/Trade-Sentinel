import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTrades } from "@/contexts/TradesContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { formatCurrency, getPnlColor } from "@/lib/utils";
import {
  LogOut, User, Award, Trash2, TrendingUp,
  Shield, Target, ChevronRight, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Profile() {
  const { user, logout } = useAuth();
  const { trades, deleteTrade, loading } = useTrades();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const closed = trades.filter(t => t.status === "closed" && t.pnl != null);
  const totalPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const winRate = closed.length ? (closed.filter(t => (t.pnl ?? 0) > 0).length / closed.length) * 100 : 0;

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/");
    } catch {
      toast({ title: "Error", description: "Failed to sign out.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTrade(id);
      toast({ title: "Trade deleted", description: "The trade has been removed from your journal." });
      setDeleteId(null);
    } catch {
      toast({ title: "Error", description: "Failed to delete trade.", variant: "destructive" });
    }
  };

  const accounts = [...new Set(trades.map(t => t.account || "Main"))];

  return (
    <div className="px-4 pt-5 pb-4 space-y-5">
      {/* Profile Header */}
      <div className="glass-card rounded-2xl p-5 border border-border/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="avatar" className="w-full h-full rounded-2xl object-cover" />
            ) : (
              <User size={24} className="text-primary" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold font-serif text-foreground">{user?.displayName || "Trader"}</h2>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Award size={11} className="text-primary" />
              <span className="text-[10px] font-semibold text-primary">
                {winRate >= 60 ? "Elite Trader" : winRate >= 40 ? "Rising Trader" : "Learning Trader"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/30">
          <div className="text-center">
            <p className={`text-base font-bold font-serif ${getPnlColor(totalPnl)}`}>{formatCurrency(totalPnl)}</p>
            <p className="text-[10px] text-muted-foreground">Total P&L</p>
          </div>
          <div className="text-center">
            <p className="text-base font-bold font-serif text-foreground">{trades.length}</p>
            <p className="text-[10px] text-muted-foreground">Total Trades</p>
          </div>
          <div className="text-center">
            <p className={`text-base font-bold font-serif ${winRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>{winRate.toFixed(1)}%</p>
            <p className="text-[10px] text-muted-foreground">Win Rate</p>
          </div>
        </div>
      </div>

      {/* Accounts */}
      <div className="glass-card rounded-2xl p-4 border border-border/40">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Trading Accounts</p>
        <div className="space-y-2">
          {accounts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">No accounts yet.</p>
          ) : accounts.map(acc => {
            const accTrades = trades.filter(t => (t.account || "Main") === acc && t.status === "closed" && t.pnl != null);
            const accPnl = accTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
            return (
              <div key={acc} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-primary" />
                  <span className="text-sm font-medium text-foreground">{acc}</span>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${getPnlColor(accPnl)}`}>{formatCurrency(accPnl)}</p>
                  <p className="text-[10px] text-muted-foreground">{accTrades.length} trades</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trade Log (delete from here) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trade Log</p>
          <p className="text-xs text-muted-foreground">{trades.length} trades</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : trades.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 border border-border/40 text-center">
            <TrendingUp size={24} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No trades logged yet.</p>
          </div>
        ) : (
          <div className="space-y-2 stagger-children">
            {trades.map(t => (
              <div key={t.id} className="glass-card rounded-xl px-4 py-3 border border-border/40">
                {deleteId === t.id ? (
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} className="text-destructive flex-shrink-0" />
                    <span className="text-xs text-muted-foreground flex-1">Delete this trade?</span>
                    <button onClick={() => handleDelete(t.id)}
                      className="text-xs font-semibold text-destructive hover:text-red-300 transition-colors px-2 py-1">
                      Delete
                    </button>
                    <button onClick={() => setDeleteId(null)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                        t.direction === "long" ? "bg-emerald-400/15 text-emerald-400" : "bg-red-400/15 text-red-400"
                      }`}>
                        {t.direction === "long" ? "L" : "S"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{t.symbol}</span>
                          <span className="text-[10px] text-muted-foreground bg-secondary/50 rounded-full px-1.5 py-0.5">{t.account || "Main"}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{t.entryDate}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        {t.pnl != null
                          ? <span className={`text-sm font-bold ${getPnlColor(t.pnl)}`}>{formatCurrency(t.pnl)}</span>
                          : <span className="text-xs text-blue-400 font-medium">Open</span>
                        }
                      </div>
                      <button
                        data-testid={`btn-delete-trade-${t.id}`}
                        onClick={() => setDeleteId(t.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/15 transition-colors text-muted-foreground hover:text-destructive"
                      >
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
        <div className="glass-card rounded-2xl p-4 border border-destructive/30 bg-destructive/5">
          <p className="text-sm font-semibold text-destructive mb-3">Sign out of your account?</p>
          <div className="flex gap-3">
            <button onClick={handleLogout}
              className="flex-1 bg-destructive text-destructive-foreground py-2.5 rounded-xl text-sm font-semibold hover:brightness-110 active:scale-95 transition-all">
              Yes, Sign Out
            </button>
            <button onClick={() => setConfirmLogout(false)}
              className="flex-1 bg-secondary text-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          data-testid="btn-logout"
          onClick={() => setConfirmLogout(true)}
          className="w-full flex items-center justify-between glass-card rounded-2xl p-4 border border-border/40 hover:border-destructive/30 hover:bg-destructive/5 transition-all duration-200 group"
        >
          <div className="flex items-center gap-3">
            <LogOut size={16} className="text-destructive" />
            <span className="text-sm font-medium text-destructive">Sign Out</span>
          </div>
          <ChevronRight size={14} className="text-muted-foreground group-hover:text-destructive transition-colors" />
        </button>
      )}

      <div className="h-2" />
    </div>
  );
}
