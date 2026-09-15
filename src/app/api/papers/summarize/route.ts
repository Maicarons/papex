import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { isAiEnabled } from "@/lib/ai/provider";
import { generateReview } from "@/lib/ai/review";
import { listPapers } from "@/lib/services/papers";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const summarizeSchema = z.object({
  q: z.string().min(2).max(500),
  topK: z.number().int().min(1).max(8).default(5),
  lang: z.enum(["zh", "en"]).default("en"),
});

/**
 * RAG corpus review (P1-C): retrieve the top-k papers for a query (semantic
 * when embeddings are configured, keyword otherwise), then have the LLM write
 * a short review whose points cite the exact paper ids and quote evidence from
 * their abstracts. Every returned point is traceable to a paper in the corpus.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const rl = rateLimit(`ai:summarize:${user.id}`, 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "生成过于频繁，请稍后再试", retryAfterSec: rl.retryAfterSec },
      { status: 429 },
    );
  }
  if (!isAiEnabled()) {
    return NextResponse.json({ error: "AI 服务未配置" }, { status: 503 });
  }

  const json = await request.json().catch(() => null);
  const parsed = summarizeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  const { q, topK, lang } = parsed.data;

  const res = await listPapers({ q, semantic: true, pageSize: topK });
  const papers = res.rows.map((r) => ({
    id: r.paper.id,
    title: r.version.title,
    abstract: r.version.abstract,
  }));
  if (papers.length === 0) {
    return NextResponse.json({ enabled: true, q, title: "", points: [], papers: [] });
  }

  const review = await generateReview({ papers, language: lang });
  return NextResponse.json({
    enabled: true,
    q,
    title: review.title,
    points: review.points,
    papers: papers.map((p) => ({ id: p.id, title: p.title })),
  });
}
