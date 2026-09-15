import webpush from "web-push";
import { db } from "@/lib/db";
import { pushDevices } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";

/**
 * Web Push sender (P0-C).
 *
 * Sends browser push notifications through the Web Push protocol to every
 * registered `push_devices` row of the recipient(s). The stored `token` is the
 * JSON-serialized PushSubscription. Fire-and-forget by design: a failing push
 * never blocks the announcement/message write that triggered it.
 *
 * Self-host friendly: when VAPID keys are not configured the sender is a no-op
 * (`isPushEnabled() === false`), same pattern as the embedding layer.
 */

export interface PushPayload {
  title: string;
  body?: string | null;
  url?: string | null;
}

let vapidConfigured = false;

/** Lazily (re)configure web-push with VAPID details; safe to call often. */
function ensureVapid() {
  if (vapidConfigured) return true;
  const publicKey = process.env.PAPEX_VAPID_PUBLIC_KEY;
  const privateKey = process.env.PAPEX_VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const subject =
    process.env.PAPEX_VAPID_SUBJECT ??
    `mailto:admin@${(() => { try { return new URL(appUrl).hostname; } catch { return "localhost"; } })()}`;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

/** Whether Web Push is operational on this deployment (VAPID configured). */
export function isPushEnabled(): boolean {
  return ensureVapid();
}

/** VAPID public key to hand to the browser when subscribing (or null). */
export function getVapidPublicKey(): string | null {
  return process.env.PAPEX_VAPID_PUBLIC_KEY ?? null;
}

interface DeviceRow {
  id: string;
  userId: string;
  token: string;
}

/** Parse a stored token back into a web-push subscription (or null). */
function parseSubscription(token: string): webpush.PushSubscription | null {
  try {
    const parsed = JSON.parse(token) as {
      endpoint?: unknown;
      keys?: { p256dh?: unknown; auth?: unknown };
    };
    if (
      typeof parsed.endpoint === "string" &&
      typeof parsed.keys?.p256dh === "string" &&
      typeof parsed.keys.auth === "string"
    ) {
      return { endpoint: parsed.endpoint, keys: { p256dh: parsed.keys.p256dh, auth: parsed.keys.auth } };
    }
  } catch {
    /* not JSON → probably a native token (FCM/APNs); skipped */
  }
  return null;
}

async function deliver(devices: DeviceRow[], payload: PushPayload): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = payload.url ? new URL(payload.url, appUrl).toString() : appUrl;
  const body = JSON.stringify({ title: payload.title, body: payload.body ?? "", url });
  await Promise.allSettled(
    devices.map(async (device) => {
      const subscription = parseSubscription(device.token);
      if (!subscription) return;
      try {
        await webpush.sendNotification(subscription, body, { TTL: 60 * 60 * 24 });
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          // Endpoint unsubscribed/expired — drop the stale device.
          await db
            .delete(pushDevices)
            .where(and(eq(pushDevices.id, device.id), eq(pushDevices.userId, device.userId)));
        } else {
          console.warn(`[push] 发送到 ${device.userId} 失败 (${code ?? "unknown"}): ${String(err).slice(0, 200)}`);
        }
      }
    }),
  );
}

/** Send a push to every registered device of a single user. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!isPushEnabled()) return;
  const devices = await db
    .select({ id: pushDevices.id, userId: pushDevices.userId, token: pushDevices.token })
    .from(pushDevices)
    .where(eq(pushDevices.userId, userId));
  if (devices.length === 0) return;
  await deliver(devices, payload);
}

/** Send a push to every registered device of a set of users (fan-out). */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (!isPushEnabled() || userIds.length === 0) return;
  const devices = await db
    .select({ id: pushDevices.id, userId: pushDevices.userId, token: pushDevices.token })
    .from(pushDevices)
    .where(inArray(pushDevices.userId, userIds));
  if (devices.length === 0) return;
  await deliver(devices, payload);
}
