import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { resolveApiKey, type ApiKeyScope } from "./api-key";

const COOKIE_NAME = "papex_session";
const ISSUER = "papex";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET is not set or too short (need >= 16 chars).");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  sub: string; // user id
  username: string;
  role: "author" | "moderator" | "admin";
  /** How the session was authenticated. */
  source?: "cookie" | "apikey" | "bearer";
  /** Present only when source === "apikey". Inherited/owner scopes. */
  apiKeyScopes?: ApiKeyScope[];
  /** Bound device id, present on client (app/desktop) access tokens. */
  deviceId?: string;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const ttl = Number(process.env.AUTH_SESSION_TTL ?? 60 * 60 * 24 * 7);
  return new SignJWT({ username: payload.username, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(getSecret());
}

export async function verifySession(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { issuer: ISSUER });
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      username: payload.username as string,
      role: payload.role as SessionPayload["role"],
      source: payload.source as SessionPayload["source"],
      deviceId: payload.deviceId as string | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Short-lived (15 min) access token for the mobile / desktop clients.
 * Embedding `perms` + `deviceId` lets the clients do offline authz checks and
 * the server mark the "current" device without extra round-trips. The `jti`
 * supports future token revocation. Uses the same AUTH_SECRET as web cookies.
 */
const ACCESS_TTL_SECONDS = 15 * 60;

export async function signAccessToken(payload: {
  sub: string;
  username: string;
  role: SessionPayload["role"];
  perms: string[];
  deviceId?: string;
}): Promise<string> {
  const jti = randomBytes(8).toString("base64url");
  return new SignJWT({
    username: payload.username,
    role: payload.role,
    perms: payload.perms,
    deviceId: payload.deviceId,
    jti,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  const ttl = Number(process.env.AUTH_SESSION_TTL ?? 60 * 60 * 24 * 7);
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ttl,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) return verifySession(token);

  // Fallback: programmatic access via `Authorization: Bearer pk_...`.
  // Resolves to the owning user's identity so the existing RBAC checks
  // (`userCan`, `requirePermission`) apply unchanged.
  const headerStore = await headers();
  const auth = headerStore.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const raw = auth.slice(7).trim();
    // 1) Programmatic API key (pk_…) — resolves to the owning user.
    const resolved = await resolveApiKey(raw);
    if (resolved) {
      // scope 校验：写方法要求 "write"，读方法要求 "read"。不足则视为未认证
      // （返回 null），路由按 401 处理——从而收紧只读 key 的写权限。默认双
      // scope key (read+write) 完全不受影响。method 由 proxy 注入的
      // x-papex-method header 提供（edge 无法查库，仅透传）。
      const method = headerStore.get("x-papex-method") ?? "GET";
      const requiresWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
      const requiredScope: ApiKeyScope = requiresWrite ? "write" : "read";
      if (!resolved.scopes.includes(requiredScope)) return null;

      const [user] = await db
        .select({ id: users.id, username: users.username, role: users.role })
        .from(users)
        .where(eq(users.id, resolved.userId))
        .limit(1);
      if (user) {
        return {
          sub: user.id,
          username: user.username,
          role: user.role,
          source: "apikey",
          apiKeyScopes: resolved.scopes,
        };
      }
    }
    // 2) User access token (mobile / desktop clients) — a normal HS256 JWT.
    // Expired / tampered tokens fail jwtVerify and return null → 401, which
    // triggers the client's refresh flow.
    const userSession = await verifySession(raw);
    if (userSession) {
      return { ...userSession, source: "bearer" };
    }
  }
  return null;
}

/** Load the full user record for the current session, or null. */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const [user] = await db.select().from(users).where(eq(users.id, session.sub));
  return user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
