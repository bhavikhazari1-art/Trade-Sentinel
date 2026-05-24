import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "./AuthContext";

export interface Trade {
  id: string;
  userId: string;
  symbol: string;
  direction: "long" | "short";
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  pnl: number | null;
  pnlPercent: number | null;
  status: "open" | "closed";
  emotion: "confident" | "fearful" | "greedy" | "neutral" | "anxious" | "focused";
  emotionAfter?: "satisfied" | "regret" | "neutral" | "excited" | "disappointed";
  setup: string;
  notes: string;
  mistakes: string;
  account: string;
  tags: string[];
  screenshotUrl?: string;
  entryDate: string;
  exitDate?: string;
  createdAt: Timestamp | null;
}

export interface TradeInput {
  symbol: string;
  direction: "long" | "short";
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  emotion: Trade["emotion"];
  emotionAfter?: Trade["emotionAfter"];
  setup: string;
  notes: string;
  mistakes: string;
  account: string;
  tags: string[];
  entryDate: string;
  exitDate?: string;
  screenshotFile?: File;
}

interface TradesContextType {
  trades: Trade[];
  loading: boolean;
  error: string | null;
  addTrade: (input: TradeInput) => Promise<void>;
  updateTrade: (id: string, input: Partial<TradeInput>) => Promise<void>;
  deleteTrade: (id: string) => Promise<void>;
}

const TradesContext = createContext<TradesContextType | null>(null);

function calcPnl(direction: string, entry: number, exit: number, qty: number) {
  const diff = direction === "long" ? exit - entry : entry - exit;
  return { pnl: diff * qty, pnlPercent: (diff / entry) * 100 };
}

function sortTrades(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => {
    const aMs = a.createdAt?.toMillis() ?? new Date(a.entryDate).getTime();
    const bMs = b.createdAt?.toMillis() ?? new Date(b.entryDate).getTime();
    return bMs - aMs;
  });
}

export function TradesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Not logged in — reset immediately
    if (!user) {
      setTrades([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    // ── Safety timeout: never spin forever ─────────────────
    const timeout = setTimeout(() => {
      setLoading(false);
      setError("Loading timed out. Check your connection and Firestore rules.");
    }, 12_000);

    // ── Query WITHOUT orderBy → no composite index needed ──
    // We sort client-side instead so the query works on a fresh project.
    const q = query(
      collection(db, "trades"),
      where("userId", "==", user.uid)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        clearTimeout(timeout);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Trade));
        setTrades(sortTrades(data));
        setLoading(false);
        setError(null);
      },
      (err) => {
        // ── Error handler — critical: without this loading stays true ──
        clearTimeout(timeout);
        console.error("Firestore trades error:", err);

        // Friendly messages for common errors
        let msg = err.message ?? "Failed to load trades.";
        if (err.code === "permission-denied") {
          msg = "Firestore permission denied. Check your security rules.";
        } else if (err.code === "failed-precondition") {
          msg = "Firestore index missing. Open the console link to create it.";
        } else if (err.code === "unavailable") {
          msg = "Firebase is offline. Check your internet connection.";
        }
        setError(msg);
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(timeout);
      unsub();
    };
  }, [user]);

  // ── Screenshot upload ───────────────────────────────────
  const uploadScreenshot = async (file: File, userId: string): Promise<string> => {
    const path = `screenshots/${userId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  // ── Add ─────────────────────────────────────────────────
  const addTrade = useCallback(async (input: TradeInput) => {
    if (!user) return;
    let screenshotUrl: string | undefined;
    if (input.screenshotFile) {
      screenshotUrl = await uploadScreenshot(input.screenshotFile, user.uid);
    }
    const hasExit = input.exitPrice != null && input.exitPrice > 0;
    const { pnl, pnlPercent } = hasExit
      ? calcPnl(input.direction, input.entryPrice, input.exitPrice!, input.quantity)
      : { pnl: null, pnlPercent: null };

    await addDoc(collection(db, "trades"), {
      userId: user.uid,
      symbol: input.symbol.toUpperCase(),
      direction: input.direction,
      entryPrice: input.entryPrice,
      exitPrice: input.exitPrice ?? null,
      quantity: input.quantity,
      pnl,
      pnlPercent,
      status: hasExit ? "closed" : "open",
      emotion: input.emotion,
      emotionAfter: input.emotionAfter ?? null,
      setup: input.setup,
      notes: input.notes,
      mistakes: input.mistakes,
      account: input.account || "Main",
      tags: input.tags,
      screenshotUrl: screenshotUrl ?? null,
      entryDate: input.entryDate,
      exitDate: input.exitDate ?? null,
      createdAt: serverTimestamp(),
    });
  }, [user]);

  // ── Update ───────────────────────────────────────────────
  const updateTrade = useCallback(async (id: string, input: Partial<TradeInput>) => {
    if (!user) return;
    const tradeRef = doc(db, "trades", id);
    const updates: Record<string, unknown> = { ...input };
    if (input.screenshotFile) {
      updates.screenshotUrl = await uploadScreenshot(input.screenshotFile, user.uid);
      delete updates.screenshotFile;
    }
    const existing = trades.find(t => t.id === id);
    if (existing) {
      const ep  = input.entryPrice  ?? existing.entryPrice;
      const xp  = input.exitPrice   ?? existing.exitPrice;
      const qty = input.quantity    ?? existing.quantity;
      const dir = input.direction   ?? existing.direction;
      if (xp != null) {
        const { pnl, pnlPercent } = calcPnl(dir, ep, xp, qty);
        updates.pnl = pnl;
        updates.pnlPercent = pnlPercent;
        updates.status = "closed";
      }
    }
    await updateDoc(tradeRef, updates);
  }, [user, trades]);

  // ── Delete ───────────────────────────────────────────────
  const deleteTrade = useCallback(async (id: string) => {
    await deleteDoc(doc(db, "trades", id));
  }, []);

  return (
    <TradesContext.Provider value={{ trades, loading, error, addTrade, updateTrade, deleteTrade }}>
      {children}
    </TradesContext.Provider>
  );
}

export function useTrades() {
  const ctx = useContext(TradesContext);
  if (!ctx) throw new Error("useTrades must be used within TradesProvider");
  return ctx;
}
