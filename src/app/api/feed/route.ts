import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listAnnouncements, markAnnouncementsRead } from "@/lib/services/feed";

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
