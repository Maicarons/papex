import { db } from "@/lib/db";
import { devices } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { revokeDeviceRefreshTokens } from "@/lib/auth/refresh-token";

export interface DeviceView {
  id: string;
  deviceName: string | null;
  platform: string | null;
  fingerprint: string | null;
  lastActiveAt: Date;
  createdAt: Date;
  /** True when this device matches the access token that made the request. */
  current: boolean;
}

export async function listDevices(userId: string, currentDeviceId?: string): Promise<DeviceView[]> {
  const rows = await db
    .select({
      id: devices.id,
      deviceName: devices.deviceName,
      platform: devices.platform,
      fingerprint: devices.fingerprint,
      lastActiveAt: devices.lastActiveAt,
      createdAt: devices.createdAt,
    })
    .from(devices)
    .where(eq(devices.userId, userId))
    .orderBy(desc(devices.lastActiveAt));
  return rows.map((r) => ({ ...r, current: r.id === currentDeviceId }));
}

/** Revoke every refresh token bound to a device, then delete the device row. */
export async function revokeDevice(userId: string, deviceId: string): Promise<boolean> {
  await revokeDeviceRefreshTokens(userId, deviceId);
  const [row] = await db
    .delete(devices)
    .where(and(eq(devices.id, deviceId), eq(devices.userId, userId)))
    .returning({ id: devices.id });
  return !!row;
}

/** Revoke all devices for a user (logout-everywhere), keeping `exceptDeviceId`. */
export async function revokeAllDevices(
  userId: string,
  exceptDeviceId?: string,
): Promise<number> {
  const all = await db
    .select({ id: devices.id })
    .from(devices)
    .where(eq(devices.userId, userId));
  let count = 0;
  for (const d of all) {
    if (d.id === exceptDeviceId) continue;
    if (await revokeDevice(userId, d.id)) count++;
  }
  return count;
}
