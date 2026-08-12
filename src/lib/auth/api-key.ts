import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// ---------------------------------------------------------------------------
// API Key model
//
// A key grants programmatic access to the REST API. It is bound to a user and
// inherits that user's identity + effective RBAC permissions, so the existing
// `userCan()` / `requirePermission()` checks apply unchanged. Only the SHA-256
// hash of a key is persisted; the raw secret is returned to the owner exactly
// once at creation.
//
// Raw key format:  `pk_<env>_<base64url(32 bytes)>`  (e.g. pk_live_AbC...).
// Stored hash:     sha256(raw key) as hex.
// Display prefix:  first 12 chars of the raw key (e.g. `pk_live_AbCdEf`).
// ---------------------------------------------------------------------------

export type ApiKeyScope = "read" | "write";

export interface ApiKeyRecord {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface CreatedApiKey extends ApiKeyRecord {
  /** The raw secret. Shown to the owner exactly once. */
  token: string;
}

const KEY_RE = /^pk_(live|test)_[A-Za-z0-9_-]{32,}$/;

function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Generate a new raw API key (not persisted). Returns the secret plus the
 * prefix that is safe to display.
 */
export function generateApiKey(environment: "live" | "test" = "live"): {
  token: string;
  prefix: string;
} {
  const random = randomBytes(24).toString("base64url"); // 32 chars of entropy
  const token = `pk_${environment}_${random}`;
  return { token, prefix: token.slice(0, 12) };
}

/** Validate the textual shape of a key before hashing. */
export function isApiKeyFormat(token: string): boolean {
  return KEY_RE.test(token);
}

/**
 * Resolve a raw API key to its owning user (or null). On success the key's
 * `last_used_at` is touched (fire-and-forget, no await on the caller path to
 * keep latency low). Revoked / expired keys are rejected.
 */
export async function resolveApiKey(token: string): Promise<{
  userId: string;
  scopes: ApiKeyScope[];
} | null> {
  if (!isApiKeyFormat(token)) return null;
  const keyHash = hashApiKey(token);
  const [row] = await db
    .select({
      id: apiKeys.id,
      userId: apiKeys.userId,
      scopes: apiKeys.scopes,
      revokedAt: apiKeys.revokedAt,
      expiresAt: apiKeys.expiresAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  if (!row) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) return null;

  // Best-effort last-used bump. Deliberately not awaited by callers.
  void db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id))
    .execute()
    .catch(() => {});

  return { userId: row.userId, scopes: (row.scopes ?? ["read", "write"]) as ApiKeyScope[] };
}

// ---------------------------------------------------------------------------
// CRUD for a user's own keys
// ---------------------------------------------------------------------------

export async function createApiKey(
  userId: string,
  name: string,
  opts: { scopes?: ApiKeyScope[]; environment?: "live" | "test"; expiresAt?: Date | null } = {},
): Promise<CreatedApiKey> {
  const scopes = opts.scopes ?? ["read", "write"];
  const { token, prefix } = generateApiKey(opts.environment ?? "live");
  const [row] = await db
    .insert(apiKeys)
    .values({
      userId,
      name,
      keyPrefix: prefix,
      keyHash: hashApiKey(token),
      scopes,
      expiresAt: opts.expiresAt ?? null,
    })
    .returning();
  return { ...row, scopes: row.scopes as ApiKeyScope[], token };
}

export async function listApiKeys(userId: string): Promise<ApiKeyRecord[]> {
  const rows = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(apiKeys.createdAt);
  return rows.map((r) => ({ ...r, scopes: r.scopes as ApiKeyScope[] }));
}

/** Revoke (soft-delete) a key. Only the owner may revoke it. */
export async function revokeApiKey(userId: string, keyId: string): Promise<boolean> {
  const [row] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
    .returning({ id: apiKeys.id });
  return !!row;
}
