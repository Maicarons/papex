import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiSummaries, paperVersions } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { isAiEnabled } from "@/lib/ai/provider";
import { generateTldr, type AiSummary } from "@/lib/ai/tldr";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const KIND = "tldr";

/**
 * AI summary for a paper version (P1-C).
 *  - GET: public — returns the cached summary if one exists (cost-free).
 *  - POST: signed-in only, rate-limited — generates a TLDR with provenance
 *    (every point quotes its evidence from the abstract) and caches it, so
 *    regenerating is explicit and LLM spend stays bounded.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const version = Number(url.searchParams.get("version")) || 1;

  if (!isAiEnabled()) {
    return NextResponse.json({ enabled: false, summary: null });
  }
  const [row] = await db
    .select()
    .from(aiSummaries)
    .where(and(eq(aiSummaries.paperId, id), eq(aiSummaries.version, version), eq(aiSummaries.kind, KIND)))
    .limit(1);
  return NextResponse.json({
    enabled: true,
    model: process.env.AI_API_MODEL,
    summary: row ? (row.data as AiSummary) : null,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  // Cost guard: at most 10 generations / minute / user.
  const rl = rateLimit(`ai:${user.id}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "生成过于频繁，请稍后再试", retryAfterSec: rl.retryAfterSec },
      { status: 429 },
    );
  }

  if (!isAiEnabled()) {
    return NextResponse.json({ error: "AI 服务未配置" }, { status: 503 });
  }

  const { id } = await params;
  const url = new URL(req.url);
  const version = Number(url.searchParams.get("version")) || 1;
  const lang = url.searchParams.get("lang") === "zh" ? "zh" : "en";
  // A3: `refresh=1` bypasses the cache so an existing summary can be
  // regenerated (e.g. after a remark, or when the model was upgraded).
  const forceRefresh = url.searchParams.get("refresh") === "1";

  if (!forceRefresh) {
    const [cached] = await db
      .select()
      .from(aiSummaries)
      .where(and(eq(aiSummaries.paperId, id), eq(aiSummaries.version, version), eq(aiSummaries.kind, KIND)))
      .limit(1);
    if (cached) {
      return NextResponse.json({
        enabled: true,
        summary: cached.data as AiSummary,
        fromCache: true,
      });
    }
  }

  const [ver] = await db
    .select({ title: paperVersions.title, abstract: paperVersions.abstract })
    .from(paperVersions)
    .where(and(eq(paperVersions.paperId, id), eq(paperVersions.version, version)))
    .limit(1);
  if (!ver) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const model = process.env.AI_API_MODEL ?? "unknown";
  const summary = await generateTldr({ title: ver.title, abstract: ver.abstract, language: lang });
  // Provenance gate: if nothing survived validation, refuse to serve it.
  if (!summary.summary && summary.points.length === 0) {
    return NextResponse.json({ error: "AI 输出未能通过溯源校验，请重试" }, { status: 502 });
  }

  await db
    .insert(aiSummaries)
    .values({ paperId: id, version, kind: KIND, model, data: summary })
    .onConflictDoUpdate({
      target: [aiSummaries.paperId, aiSummaries.version, aiSummaries.kind],
      set: { data: summary, model, createdAt: new Date() },
    });

  return NextResponse.json({ enabled: true, summary, fromCache: false });
}
