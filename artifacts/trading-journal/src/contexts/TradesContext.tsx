import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
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
  addTrade: (input: TradeInput) => Promise<void>;
  updateTrade: (id: string, input: Partial<TradeInput>) => Promise<void>;
  deleteTrade: (id: string) => Promise<void>;
}

const TradesContext = createContext<TradesContextType | null>(null);

function calcPnl(direction: string, entry: number, exit: number, qty: number) {
  const diff = direction === "long" ? exit - entry : entry - exit;
  const pnl = diff * qty;
  const pnlPercent = (diff / entry) * 100;
  return { pnl, pnlPercent };
}

export function TradesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setTrades([]); setLoading(false); return; }
    const q = query(
      collection(db, "trades"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Trade));
      setTrades(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const uploadScreenshot = async (file: File, userId: string): Promise<string> => {
    const path = `screenshots/${userId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

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

  const updateTrade = useCallback(async (id: string, input: Partial<TradeInput>) => {
    if (!user) return;
    const tradeRef = doc(db, "trades", id);
    const updates: Record<string, unknown> = { ...input };
    if (input.screenshotFile) {
      updates.screenshotUrl = await uploadScreenshot(input.screenshotFile, user.uid);
      delete updates.screenshotFile;
    }
    const existing = trades.find(t => t.id === id);
    if (existing && (input.exitPrice != null || input.entryPrice != null || input.quantity != null)) {
      const ep = input.entryPrice ?? existing.entryPrice;
      const xp = input.exitPrice ?? existing.exitPrice;
      const qty = input.quantity ?? existing.quantity;
      const dir = input.direction ?? existing.direction;
      if (xp != null) {
        const { pnl, pnlPercent } = calcPnl(dir, ep, xp, qty);
        updates.pnl = pnl;
        updates.pnlPercent = pnlPercent;
        updates.status = "closed";
      }
    }
    await updateDoc(tradeRef, updates);
  }, [user, trades]);

  const deleteTrade = useCallback(async (id: string) => {
    await deleteDoc(doc(db, "trades", id));
  }, []);

  return (
    <TradesContext.Provider value={{ trades, loading, addTrade, updateTrade, deleteTrade }}>
      {children}
    </TradesContext.Provider>
  );
}

export function useTrades() {
  const ctx = useContext(TradesContext);
  if (!ctx) throw new Error("useTrades must be used within TradesProvider");
  return ctx;
}
