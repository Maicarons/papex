import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listMessages, unreadCount, markAllRead, MESSAGE_KINDS } from "@/lib/services/messages";
import type { MessageKind } from "@/lib/services/messages";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const kindParam = url.searchParams.get("kind");
  const kind =
    kindParam && (MESSAGE_KINDS as string[]).includes(kindParam)
      ? (kindParam as MessageKind)
      : null;
  const [rows, unread] = await Promise.all([
    listMessages(user.id, kind),
    unreadCount(user.id),
  ]);
  return NextResponse.json({ messages: rows, unread });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  if (body.action === "read-all") {
    await markAllRead(user.id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}
