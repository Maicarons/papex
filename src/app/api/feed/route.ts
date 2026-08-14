import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listAnnouncements, markAnnouncementsRead, markAnnouncementRead } from "@/lib/services/feed";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  if (searchParams.get("markRead") === "1") {
    await markAnnouncementsRead(user.id);
  }
  const announcements = await listAnnouncements(user.id);
  return NextResponse.json({ announcements });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  let body: { id?: number };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  if (typeof body.id !== "number") {
    return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  }
  await markAnnouncementRead(user.id, body.id);
  return NextResponse.json({ ok: true });
}
