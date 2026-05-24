import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./AuthContext";

export interface Goals {
  weeklyPnl: number;
  monthlyPnl: number;
  winRateTarget: number;
  dailyTradeLimit: number;
  minRR: number;
  updatedAt?: unknown;
}

const DEFAULT_GOALS: Goals = {
  weeklyPnl: 500,
  monthlyPnl: 2000,
  winRateTarget: 55,
  dailyTradeLimit: 5,
  minRR: 1.5,
};

interface GoalsContextType {
  goals: Goals;
  loading: boolean;
  error: string | null;
  saveGoals: (g: Goals) => Promise<void>;
}

const GoalsContext = createContext<GoalsContextType | null>(null);

export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goals>(DEFAULT_GOALS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setGoals(DEFAULT_GOALS);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    // Safety timeout — never spin forever
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 8_000);

    const docRef = doc(db, "goals", user.uid);
    getDoc(docRef)
      .then(snap => {
        if (snap.exists()) {
          setGoals({ ...DEFAULT_GOALS, ...(snap.data() as Goals) });
        }
      })
      .catch(err => {
        console.error("Goals fetch error:", err);
        setError(err.message ?? "Failed to load goals.");
        // Don't block the UI — use defaults
        setGoals(DEFAULT_GOALS);
      })
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });

    return () => clearTimeout(timeout);
  }, [user]);

  const saveGoals = useCallback(async (g: Goals) => {
    if (!user) return;
    const docRef = doc(db, "goals", user.uid);
    await setDoc(docRef, { ...g, updatedAt: serverTimestamp() });
    setGoals(g);
  }, [user]);

  return (
    <GoalsContext.Provider value={{ goals, loading, error, saveGoals }}>
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoals() {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error("useGoals must be used within GoalsProvider");
  return ctx;
}
