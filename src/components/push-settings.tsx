"use client";

import * as React from "react";
import { BellRing } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n/i18n-provider";

/**
 * Web Push toggle (P0-C). Enabling registers a browser push subscription with
 * the server (push_devices table) so in-app alerts can be delivered as native
 * notifications; disabling unsubscribes and removes the token.
 */
export function PushSettings() {
  const { t } = useI18n();
  // Client-only support check (SSR renders null via `configured === null`).
  const supported =
    typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
  const [configured, setConfigured] = React.useState<boolean | null>(null);
  const [publicKey, setPublicKey] = React.useState<string | null>(null);
  const [enabled, setEnabled] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!supported) return;
    fetch("/api/push/vapid", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { enabled?: boolean; publicKey?: string | null } | null) => {
        if (d?.enabled && d.publicKey) {
          setConfigured(true);
          setPublicKey(d.publicKey);
        } else {
          setConfigured(false);
        }
      })
      .catch(() => setConfigured(false));
  }, [supported]);

  // Reflect the *existing* browser subscription once the SW is ready.
  React.useEffect(() => {
    if (!configured) return;
    navigator.serviceWorker
      .ready.then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEnabled(!!sub))
      .catch(() => setEnabled(false));
  }, [configured]);

  async function enable() {
    setBusy(true);
    setNotice(null);
    try {
      if (!publicKey) {
        setNotice(t("settings.pushNotConfigured"));
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setNotice(t("settings.pushDenied"));
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const res = await fetch("/api/push/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceToken: JSON.stringify(sub), platform: "web" }),
      });
      if (!res.ok) throw new Error("register failed");
      setEnabled(true);
    } catch {
      setNotice(t("settings.pushFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setNotice(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unregister", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceToken: JSON.stringify(sub) }),
        }).catch(() => null);
        await sub.unsubscribe();
      }
      setEnabled(false);
    } catch {
      setNotice(t("settings.pushFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return <p className="text-sm text-muted-foreground">{t("settings.pushUnsupported")}</p>;
  }
  if (configured === null) return null;
  if (!configured) {
    return <p className="text-sm text-muted-foreground">{t("settings.pushNotConfigured")}</p>;
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <BellRing className="mt-0.5 h-5 w-5 text-muted-foreground" />
        <div className="space-y-0.5">
          <p className="font-medium">{t("settings.pushTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("settings.pushSubtitle")}</p>
          {notice && <p className="text-sm text-destructive">{notice}</p>}
        </div>
      </div>
      <Switch
        checked={enabled}
        disabled={busy}
        onCheckedChange={(next) => (next ? enable() : disable())}
        aria-label={t("settings.pushTitle")}
      />
    </div>
  );
}

/** Convert a base64url VAPID public key into a Uint8Array for subscribe(). */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as Uint8Array<ArrayBuffer>;
}
