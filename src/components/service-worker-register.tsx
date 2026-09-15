"use client";

import * as React from "react";

/**
 * Registers the PWA service worker (/sw.js) on first load. The worker powers
 * Web Push delivery (P0-C) and the installable offline shell (P2-A). Registering
 * is idempotent — the browser keeps the existing worker when the script matches.
 */
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* SW unavailable (e.g. http on localhost-only deployments) — non-fatal */
    });
  }, []);
  return null;
}
