import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isAiEnabled } from "@/lib/ai/provider";
import { generateReview } from "@/lib/ai/review";
import { listPapers } from "@/lib/services/papers";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * B2: AI review of a paper's related works. Gathers the semantically-closest
 * papers (reusing `similarToPaperId`) and synthesizes a traceable review that
 * cites the exact paper ids. Abstracts stay server-side — clients only ever get
 * the review plus paper id/title links.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rl = rateLimit(`ai:review:${user.id}`, 5, 60_000);
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
  const lang = url.searchParams.get("lang") === "zh" ? "zh" : "en";

  const res = await listPapers({ status: "approved", similarToPaperId: id, pageSize: 6 });
  const papers = res.rows.map((r) => ({
    id: r.paper.id,
    title: r.version.title,
    abstract: r.version.abstract,
  }));
  if (papers.length === 0) {
    return NextResponse.json({ enabled: true, title: "", points: [], papers: [] });
  }

  const review = await generateReview({ papers, language: lang });
  return NextResponse.json({
    enabled: true,
    title: review.title,
    points: review.points,
    papers: papers.map((p) => ({ id: p.id, title: p.title })),
  });
}