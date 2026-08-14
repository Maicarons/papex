import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import {
  listBookmarks,
  isBookmarked,
  toggleBookmark,
  removeBookmark,
} from "@/lib/services/bookmarks";

export const dynamic = "force-dynamic";

const paperIdSchema = z.object({ paperId: z.string().min(1) });

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const url = new URL(req.url);
  const paperId = url.searchParams.get("paperId");
  if (paperId) {
    const bookmarked = await isBookmarked(user.id, paperId);
    return NextResponse.json({ bookmarked });
  }
  const list = await listBookmarks(user.id);
  return NextResponse.json({ bookmarks: list });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const json = await req.json().catch(() => null);
  const parsed = paperIdSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  const bookmarked = await toggleBookmark(user.id, parsed.data.paperId);
  return NextResponse.json({ bookmarked });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const json = await req.json().catch(() => null);
  const parsed = paperIdSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  await removeBookmark(user.id, parsed.data.paperId);
  return NextResponse.json({ ok: true });
}
