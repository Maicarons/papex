/* Papex service worker (P0-C push + P2-A installable offline shell).
 * Receives push payloads sent by the server (lib/push/send.ts) and displays
 * them as notifications; clicking the notification focuses an existing tab or
 * opens the target URL. Also precaches the app shell so the installed PWA
 * falls back to a cached page while offline. */
const SHELL_CACHE = "papex-shell-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(["/", "/papers", "/logo.svg", "/manifest.webmanifest"]))
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (request.mode === "navigate") {
    // Network-first for navigations: fresh content online, cached shell offline.
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches
            .open(SHELL_CACHE)
            .then((c) => c.put(request, copy))
            .catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((m) => m || caches.match("/"))),
    );
  }
});

self.addEventListener("push", (event) => {
  let title = "Papex";
  let body = "";
  let url = "/";
  try {
    if (event.data) {
      const payload = event.data.json();
      if (typeof payload.title === "string" && payload.title) title = payload.title;
      if (typeof payload.body === "string") body = payload.body;
      if (typeof payload.url === "string" && payload.url) url = payload.url;
    }
  } catch {
    /* non-JSON payloads fall back to defaults */
  }
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/logo.svg",
      badge: "/logo.svg",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            return client.navigate ? client.navigate(url) : client.focus();
          }
        }
        return clients.openWindow(url);
      }),
  );
});
