import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "papex_session";
const PROTECTED_PREFIXES = ["/me", "/submit", "/admin", "/co-reviews", "/writespace"];
const EDIT_RE = /^\/papers\/[^/]+\/edit$/;

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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
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
  matcher: ["/me/:path*", "/submit/:path*", "/admin/:path*", "/writespace/:path*", "/papers/:id/edit"],
};
