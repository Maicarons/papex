import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { unreadCount, listMessages } from "@/lib/services/messages";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ unread: 0, total: 0 });
  const [unread, rows] = await Promise.all([unreadCount(user.id), listMessages(user.id)]);
  return NextResponse.json({ unread, total: rows.length });
}
