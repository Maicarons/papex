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

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

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
    return NextResponse.next({ request: req });
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
