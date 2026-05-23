import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

const API = "/api/push";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64     = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export type NotifStatus = "unsupported" | "denied" | "default" | "granted" | "subscribed";

export function useNotifications() {
  const { user } = useAuth();
  const [status,    setStatus]    = useState<NotifStatus>("default");
  const [loading,   setLoading]   = useState(false);
  const [swReady,   setSwReady]   = useState(false);
  const [publicKey, setPublicKey] = useState<string>("");

  // Check support
  const supported = typeof window !== "undefined"
    && "Notification"   in window
    && "serviceWorker"  in navigator
    && "PushManager"    in window;

  // Fetch VAPID public key
  useEffect(() => {
    fetch(`${API}/vapid-public-key`)
      .then(r => r.json())
      .then(d => setPublicKey(d.key ?? ""))
      .catch(() => {});
  }, []);

  // Register service worker
  useEffect(() => {
    if (!supported) { setStatus("unsupported"); return; }
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(reg => {
        setSwReady(true);
        // Check existing subscription
        return reg.pushManager.getSubscription();
      })
      .then(sub => {
        if (sub) setStatus("subscribed");
        else      setStatus(Notification.permission as NotifStatus);
      })
      .catch(() => setStatus("unsupported"));
  }, [supported]);

  const subscribe = useCallback(async () => {
    if (!user || !publicKey || !swReady) return;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setStatus("denied"); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch(`${API}/subscribe`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ subscription: sub.toJSON(), userId: user.uid }),
      });
      setStatus("subscribed");
    } catch (err) {
      console.error("Push subscribe error:", err);
      setStatus(Notification.permission as NotifStatus);
    } finally {
      setLoading(false);
    }
  }, [user, publicKey, swReady]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`${API}/unsubscribe`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ userId: user.uid, endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("default");
    } catch (err) {
      console.error("Push unsubscribe error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const sendTest = useCallback(async () => {
    if (!user) return;
    await fetch(`${API}/test`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ userId: user.uid }),
    });
  }, [user]);

  // Called after a trade is successfully saved
  const notifyTradeLogged = useCallback(async (symbol: string, pnl?: number) => {
    if (!user || status !== "subscribed") return;
    await fetch(`${API}/trade-logged`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ userId: user.uid, symbol, pnl }),
    }).catch(() => {});
  }, [user, status]);

  return { supported, status, loading, subscribe, unsubscribe, sendTest, notifyTradeLogged };
}
