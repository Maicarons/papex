import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { importByIdentifier } from "@/lib/services/import";
import { z } from "zod";

export const dynamic = "force-dynamic";

const importSchema = z.object({
  doi: z.string().optional(),
  arxivId: z.string().optional(),
  url: z.string().url().optional(),
  backfillCitations: z.boolean().optional(),
});

/**
 * POST /api/papers/import
 *
 * Import a paper's metadata (and optionally its reference list) from Crossref /
 * arXiv / Semantic Scholar by DOI, arXiv id, or URL. Moderator/admin only.
 * Idempotent: re-importing an already-imported identifier returns the existing
 * paper instead of creating a duplicate.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "moderator" && user.role !== "admin")) {
    return NextResponse.json({ error: "需要审核员权限" }, { status: 403 });
  }
  const json = await req.json().catch(() => null);
  const parsed = importSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数错误" },
      { status: 400 },
    );
  }
  const { doi, arxivId, url, backfillCitations } = parsed.data;
  if (!doi && !arxivId && !url) {
    return NextResponse.json({ error: "需提供 doi、arxivId 或 url" }, { status: 400 });
  }
  try {
    const result = await importByIdentifier(
      { doi, arxivId, url },
      { id: user.id, role: user.role },
      { backfillCitations },
    );
    return NextResponse.json({ ok: true, ...result }, { status: result.created ? 201 : 200 });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "MISSING_IDENTIFIER") {
      return NextResponse.json({ error: "缺少标识符" }, { status: 400 });
    }
    if (msg === "NO_CATEGORY_AVAILABLE") {
      return NextResponse.json({ error: "无可用分类" }, { status: 500 });
    }
    return NextResponse.json({ error: "导入失败：" + msg }, { status: 502 });
  }
}
