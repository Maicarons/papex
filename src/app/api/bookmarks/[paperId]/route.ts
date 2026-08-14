import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { setBookmarkGroup } from "@/lib/services/bookmarks";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  group: z.string().max(60).nullable(),
});

export async function PATCH(_request: Request, { params }: { params: Promise<{ paperId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const { paperId } = await params;
  const json = await _request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  await setBookmarkGroup(user.id, paperId, parsed.data.group);
  return NextResponse.json({ ok: true });
}
