import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isLocale, localeCookieName } from "@/i18n/config";

export async function POST(request: Request) {
  let body: { locale?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (!isLocale(body.locale)) {
    return NextResponse.json({ error: "invalid locale" }, { status: 400 });
  }
  const store = await cookies();
  store.set(localeCookieName, body.locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return NextResponse.json({ ok: true, locale: body.locale });
}
