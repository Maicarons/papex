import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createTag, listTags } from "@/lib/services/tags";

export const dynamic = "force-dynamic";

/** GET /api/tags — public list of all tags with usage counts. */
export async function GET() {
  const rows = await listTags();
  return NextResponse.json({ tags: rows });
}

/** POST /api/tags — create a tag (any signed-in user). Idempotent by name. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const name = typeof json?.name === "string" ? json.name.trim() : "";
  if (!name || name.length > 40) {
    return NextResponse.json({ error: "标签名称需为 1-40 个字符" }, { status: 400 });
  }

  const tag = await createTag(name, user.id);
  return NextResponse.json({ tag }, { status: 201 });
}
