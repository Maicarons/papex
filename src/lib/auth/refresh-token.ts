import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { devices, refreshTokens, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { signAccessToken, type SessionPayload } from "./session";
import { getEffectivePermissions } from "./permissions";

// ---------------------------------------------------------------------------
// Device + refresh-token machinery for the desktop / mobile clients.
//
// Login / register issue a short-lived access JWT (15 min, see session.ts) plus
// an opaque, device-bound refresh token (30 days, rotating + revocable). The
// refresh token's raw value is returned to the client exactly once; only its
// SHA-256 hash is stored. On refresh the old token is revoked and a new pair is
// issued (rotation), invalidating stolen/duplicated tokens after one use.
// ---------------------------------------------------------------------------

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface DeviceInput {
  deviceName?: string | null;
  platform?: string | null;
  fingerprint?: string | null;
}

function randomDeviceId(): string {
  return `dev_${randomBytes(12).toString("base64url")}`;
}

/**
 * Resolve the device row for a login. Desktop supplies a stable `fingerprint`
 * so the same machine reuses one device across sessions; otherwise a fresh
 * device row is created (e.g. mobile, which has no stable id in the request).
 */
export async function resolveDevice(userId: string, input: DeviceInput) {
  const name = input.deviceName ?? null;
  const platform = input.platform ?? null;

  if (input.fingerprint) {
    const [existing] = await db
      .select()
      .from(devices)
      .where(and(eq(devices.userId, userId), eq(devices.fingerprint, input.fingerprint)))
      .limit(1);
    if (existing) {
      await db
        .update(devices)
        .set({
          deviceName: name ?? existing.deviceName,
          platform: platform ?? existing.platform,
          lastActiveAt: new Date(),
        })
        .where(eq(devices.id, existing.id));
      return existing;
    }
  }

  const [row] = await db
    .insert(devices)
    .values({
      id: randomDeviceId(),
      userId,
      deviceName: name,
      platform,
      fingerprint: input.fingerprint ?? null,
    })
    .returning();
  return row;
}

function hashRefresh(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function randomRefresh(): string {
  return randomBytes(32).toString("base64url"); // 256-bit of entropy
}

/** Persist a new opaque refresh token bound to (user, device). */
async function persistRefreshToken(userId: string, deviceId: string, rotatedFromId?: string) {
  const raw = randomRefresh();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  const [row] = await db
    .insert(refreshTokens)
    .values({
      userId,
      deviceId,
      tokenHash: hashRefresh(raw),
      expiresAt,
      rotatedFromId: rotatedFromId ?? null,
    })
    .returning({ id: refreshTokens.id });
  return { raw, id: row.id };
}

export interface RefreshVerification {
  userId: string;
  deviceId: string;
  id: string;
}

/** Validate a raw refresh token. Returns null if missing / revoked / expired. */
export async function verifyRefreshToken(raw: string): Promise<RefreshVerification | null> {
  if (!raw || raw.length < 8) return null;
  const hash = hashRefresh(raw);
  const [row] = await db
    .select({
      id: refreshTokens.id,
      userId: refreshTokens.userId,
      deviceId: refreshTokens.deviceId,
      expiresAt: refreshTokens.expiresAt,
      revokedAt: refreshTokens.revokedAt,
    })
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, hash))
    .limit(1);
  if (!row) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt.getTime() <= Date.now()) return null;
  return { userId: row.userId, deviceId: row.deviceId, id: row.id };
}

/** Rotate: issue a new token, revoke the old one (chains via rotatedFromId). */
async function rotateRefreshToken(oldId: string, userId: string, deviceId: string): Promise<string> {
  const { raw, id } = await persistRefreshToken(userId, deviceId, oldId);
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, oldId));
  void id;
  return raw;
}

export async function revokeRefreshToken(userId: string, tokenId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.id, tokenId), eq(refreshTokens.userId, userId)));
}

export async function revokeDeviceRefreshTokens(userId: string, deviceId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), eq(refreshTokens.deviceId, deviceId)));
}

export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.userId, userId));
}

// ---------------------------------------------------------------------------
// Auth response assembly (shared by login / register / refresh)
// ---------------------------------------------------------------------------

export interface AuthUserLike {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: SessionPayload["role"];
}

export interface AuthResponseBody {
  accessToken: string;
  refreshToken: string;
  deviceId: string;
  user: {
    id: string;
    username: string;
    email: string;
    name: string;
    role: SessionPayload["role"];
    perms: string[];
  };
}

/** Issue a fresh access + refresh token pair for an already-resolved device. */
export async function issueAuthPair(user: AuthUserLike, deviceId: string): Promise<AuthResponseBody> {
  const perms = [...(await getEffectivePermissions(user.id))].sort();
  const accessToken = await signAccessToken({
    sub: user.id,
    username: user.username,
    role: user.role,
    perms,
    deviceId,
  });
  const { raw: refreshToken } = await persistRefreshToken(user.id, deviceId);
  return {
    accessToken,
    refreshToken,
    deviceId,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.displayName,
      role: user.role,
      perms,
    },
  };
}

/**
 * Verify a refresh token and issue a rotated pair. The new access token carries
 * the same `deviceId` as the verified refresh token (more authoritative than
 * any client-supplied value). Returns null if the owning user no longer exists.
 */
export async function refreshAuthPair(
  verification: RefreshVerification,
): Promise<AuthResponseBody | null> {
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, verification.userId))
    .limit(1);
  if (!user) return null;

  const newRefresh = await rotateRefreshToken(
    verification.id,
    verification.userId,
    verification.deviceId,
  );
  const perms = [...(await getEffectivePermissions(user.id))].sort();
  const accessToken = await signAccessToken({
    sub: user.id,
    username: user.username,
    role: user.role,
    perms,
    deviceId: verification.deviceId,
  });
  return {
    accessToken,
    refreshToken: newRefresh,
    deviceId: verification.deviceId,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.displayName,
      role: user.role,
      perms,
    },
  };
}
