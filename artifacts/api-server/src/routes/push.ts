import { Router } from "express";
import webpush from "web-push";
import cron from "node-cron";
import { logger } from "../lib/logger";

const router = Router();

// Configure VAPID
const vapidPublicKey  = process.env.VAPID_PUBLIC_KEY  ?? "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY ?? "";
const vapidEmail      = process.env.VAPID_EMAIL        ?? "mailto:admin@tradejournal.app";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
  logger.info("Web Push VAPID configured");
} else {
  logger.warn("VAPID keys missing — push notifications disabled");
}

// In-memory subscription store: userId → PushSubscription[]
const subscriptions = new Map<string, webpush.PushSubscription[]>();

function getAllSubs(): webpush.PushSubscription[] {
  const all: webpush.PushSubscription[] = [];
  for (const subs of subscriptions.values()) all.push(...subs);
  return all;
}

async function sendToSub(sub: webpush.PushSubscription, payload: object): Promise<boolean> {
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload));
    return true;
  } catch (err: unknown) {
    if (err && typeof err === "object" && "statusCode" in err) {
      const code = (err as { statusCode: number }).statusCode;
      if (code === 410 || code === 404) return false; // expired/gone
    }
    return false;
  }
}

// ── GET /api/push/vapid-public-key ─────────────────────────
router.get("/push/vapid-public-key", (_req, res) => {
  res.json({ key: vapidPublicKey });
});

// ── POST /api/push/subscribe ────────────────────────────────
router.post("/push/subscribe", (req, res) => {
  const { subscription, userId } = req.body as {
    subscription: webpush.PushSubscription;
    userId: string;
  };
  if (!subscription || !userId) {
    res.status(400).json({ error: "subscription and userId required" });
    return;
  }
  const existing = subscriptions.get(userId) ?? [];
  const endpoint = subscription.endpoint;
  const deduped  = existing.filter(s => s.endpoint !== endpoint);
  subscriptions.set(userId, [...deduped, subscription]);
  logger.info({ userId, total: subscriptions.get(userId)!.length }, "Push subscription registered");
  res.json({ ok: true });
});

// ── POST /api/push/unsubscribe ──────────────────────────────
router.post("/push/unsubscribe", (req, res) => {
  const { userId, endpoint } = req.body as { userId: string; endpoint: string };
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }
  const existing = subscriptions.get(userId) ?? [];
  subscriptions.set(userId, existing.filter(s => s.endpoint !== endpoint));
  logger.info({ userId }, "Push subscription removed");
  res.json({ ok: true });
});

// ── POST /api/push/test ─────────────────────────────────────
router.post("/push/test", async (req, res) => {
  const { userId } = req.body as { userId: string };
  const subs = userId ? (subscriptions.get(userId) ?? []) : getAllSubs();
  if (!subs.length) { res.status(404).json({ error: "No subscriptions found" }); return; }
  const payload = {
    title: "TradeJournal 🏆",
    body:  "Push notifications are working! You're all set.",
    icon:  "/favicon.svg",
    badge: "/favicon.svg",
    tag:   "test",
  };
  let sent = 0;
  for (const sub of subs) { if (await sendToSub(sub, payload)) sent++; }
  res.json({ sent, total: subs.length });
});

// ── POST /api/push/trade-logged ─────────────────────────────
router.post("/push/trade-logged", async (req, res) => {
  const { userId, symbol, pnl } = req.body as { userId: string; symbol: string; pnl?: number };
  const subs = subscriptions.get(userId) ?? [];
  if (!subs.length) { res.json({ sent: 0 }); return; }
  const positive = pnl != null && pnl > 0;
  const payload = {
    title: positive ? `+${pnl?.toFixed(2)} on ${symbol} 🎯` : `Trade logged: ${symbol}`,
    body:  positive
      ? "Great trade! Check your analytics to track momentum."
      : "Trade saved. Review the setup to refine your edge.",
    icon:  "/favicon.svg",
    badge: "/favicon.svg",
    tag:   "trade-logged",
    data:  { url: "/" },
  };
  let sent = 0;
  const valid: webpush.PushSubscription[] = [];
  for (const sub of subs) {
    const ok = await sendToSub(sub, payload);
    if (ok) { valid.push(sub); sent++; }
  }
  subscriptions.set(userId, valid);
  res.json({ sent });
});

// ── Scheduled: Daily trade reminder at 6 PM UTC ─────────────
cron.schedule("0 18 * * *", async () => {
  const payload = {
    title: "⏰ Daily Trade Review",
    body:  "Have you logged all your trades today? Keep your journal consistent.",
    icon:  "/favicon.svg",
    badge: "/favicon.svg",
    tag:   "daily-reminder",
    data:  { url: "/add" },
  };
  const allSubs = getAllSubs();
  logger.info({ count: allSubs.length }, "Sending daily trade reminder");
  for (const sub of allSubs) await sendToSub(sub, payload);
});

// ── Scheduled: Weekly summary every Monday at 8 AM UTC ──────
cron.schedule("0 8 * * 1", async () => {
  const payload = {
    title: "📊 Weekly Trading Summary",
    body:  "New week, new opportunities. Open TradeJournal to review last week's performance.",
    icon:  "/favicon.svg",
    badge: "/favicon.svg",
    tag:   "weekly-summary",
    data:  { url: "/analytics" },
  };
  const allSubs = getAllSubs();
  logger.info({ count: allSubs.length }, "Sending weekly summary notification");
  for (const sub of allSubs) await sendToSub(sub, payload);
});

export default router;
