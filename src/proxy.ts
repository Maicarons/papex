import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { rateLimit } from "@/lib/rate-limit";

const COOKIE = "papex_session";
const PROTECTED_PREFIXES = ["/me", "/submit", "/admin", "/co-reviews", "/writespace"];
const EDIT_RE = /^\/papers\/[^/]+\/edit$/;

// 基础 API 限流策略（按客户端 IP）
const API_LIMIT = 120; // 通用接口：每 IP 每分钟最多 120 次
const AUTH_LIMIT = 10; // 认证类接口（登录/注册）：每 IP 每分钟最多 10 次
const WINDOW_MS = 60_000;

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function verify(token?: string) {
  if (!token) return null;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      issuer: "papex",
    });
    return payload as { role?: string; sub?: string };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// CORS for the desktop (Tauri webview) / mobile clients.
//
// The web app is same-origin, but the desktop webview (dev: http://localhost:1420)
// and React Native (no Origin, bearer auth) call the API cross-origin. We echo
// the request Origin when it is in the allowlist (with credentials), and allow
// anonymous cross-origin (`*`) when no Origin is present (RN). Origins outside
// the allowlist get no CORS headers, so the browser blocks them by default.
// Extend the list via CORS_ALLOW_ORIGINS (comma-separated) when needed.
// ---------------------------------------------------------------------------
const DEFAULT_CORS_ORIGINS = new Set<string>([
  "http://localhost:1420", // Tauri dev server
  "http://localhost:3000", // backend dev server (same-machine testing)
  "http://127.0.0.1:1420",
  "https://localhost",
  "http://localhost",
  "tauri://localhost", // Tauri production custom protocol
  "null", // some webviews / RN send "null"
]);

function allowedOrigins(): Set<string> {
  const set = new Set(DEFAULT_CORS_ORIGINS);
  const extra = process.env.CORS_ALLOW_ORIGINS;
  if (extra) {
    for (const o of extra.split(",")) {
      const t = o.trim();
      if (t) set.add(t);
    }
  }
  return set;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = allowedOrigins();
  if (origin && allowed.has(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
    };
  }
  if (!origin) {
    // Same-origin server fetch, or RN bearer request with no Origin.
    return { "Access-Control-Allow-Origin": "*" };
  }
  // Disallowed cross-origin origin: do not advertise CORS.
  return {};
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get("origin");

  // CORS preflight: answer immediately, skipping rate limit & auth.
  if (req.method === "OPTIONS" && pathname.startsWith("/api/")) {
    const h = corsHeaders(origin);
    if (h["Access-Control-Allow-Origin"]) {
      h["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
      h["Access-Control-Allow-Headers"] = "Content-Type,Authorization";
      h["Access-Control-Max-Age"] = "600";
    }
    return new NextResponse(null, { status: 204, headers: h });
  }

  // 基础 API 限流：在到达 handler 前拦截滥用（爆破登录 / 刷注册 / 刷反馈等）。
  // 仅返回 429，不影响正常流量。
  // 注：显式设置 RATE_LIMIT_DISABLED=1 时整体跳过限流（用于 e2e / 本地测试），
  // 生产环境默认开启。
  const rateLimitDisabled = process.env.RATE_LIMIT_DISABLED === "1";
  if (pathname.startsWith("/api/") && !rateLimitDisabled) {
    const ip = clientIp(req);
    const isAuth = pathname.startsWith("/api/auth/");
    const { ok, retryAfterSec } = rateLimit(
      `mw:${ip}:${isAuth ? "auth" : "api"}`,
      isAuth ? AUTH_LIMIT : API_LIMIT,
      WINDOW_MS,
    );
    if (!ok) {
      return new NextResponse(
        JSON.stringify({ error: "too_many_requests", retryAfterSec }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfterSec),
          },
        },
      );
    }
  }

  // 为 API 请求注入 HTTP method，供 getSession() 在 Node 运行时做 API Key
  // scope 校验。edge 运行时无法查库解析 key，这里只透传 method；下游按
  // 读/写区分：写方法(POST/PUT/PATCH/DELETE)要求 key 含 "write" scope。
  if (pathname.startsWith("/api/")) {
    req.headers.set("x-papex-method", req.method);
    const res = NextResponse.next({ request: req });
    const h = corsHeaders(origin);
    for (const [k, v] of Object.entries(h)) res.headers.set(k, v);
    return res;
  }

  const needsAuth =
    PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    EDIT_RE.test(pathname);
  if (!needsAuth) return NextResponse.next();

  const session = await verify(req.cookies.get(COOKIE)?.value);
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/admin") && session.role !== "moderator" && session.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/me/:path*",
    "/submit/:path*",
    "/admin/:path*",
    "/writespace/:path*",
    "/papers/:id/edit",
    "/api/:path*",
  ],
};
