/* TradeJournal Service Worker — handles push notifications */
const CACHE = "tj-sw-v1";

self.addEventListener("install", e => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("push", e => {
  let data = { title: "TradeJournal", body: "You have a new notification." };
  if (e.data) {
    try { data = e.data.json(); } catch { data.body = e.data.text(); }
  }

  const options = {
    body:              data.body,
    icon:              data.icon  ?? "/favicon.svg",
    badge:             data.badge ?? "/favicon.svg",
    tag:               data.tag   ?? "tj-notification",
    data:              data.data  ?? { url: "/" },
    requireInteraction: false,
    vibrate:           [100, 50, 100],
    actions: [
      { action: "open",    title: "Open App" },
      { action: "dismiss", title: "Dismiss"  },
    ],
  };

  e.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  if (e.action === "dismiss") return;

  const url = e.notification.data?.url ?? "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
