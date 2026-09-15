import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { paperLinks } from "@/lib/db/schema";
import { getPaperDetail } from "@/lib/services/papers";
import { listCitations } from "@/lib/services/citations";

export const dynamic = "force-dynamic";

/**
 * GET /api/papers/{id}/export?version=..
 * Offline bundle for clients (P2-A): paper metadata, authors, categories,
 * tags, citation counts, external links and the PDF URL — everything a
 * mobile/desktop client needs to render the paper without further requests.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const detail = await getPaperDetail(id);
  if (!detail) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const url = new URL(req.url);
  const version = Number(url.searchParams.get("version")) || detail.paper.latestVersion;
  const versionRow =
    version === detail.paper.latestVersion
      ? detail.latest
      : (await db.query.paperVersions.findFirst({
          where: (v, { and, eq }) => and(eq(v.paperId, id), eq(v.version, version)),
        })) ?? null;
  if (!versionRow) return NextResponse.json({ error: "version not found" }, { status: 404 });

  const [citations, links] = await Promise.all([
    listCitations(id).catch(() => ({ incoming: [], outgoing: [] })),
    db.select().from(paperLinks).where(eq(paperLinks.paperId, id)),
  ]);

  return NextResponse.json({
    paper: detail.paper,
    version: versionRow,
    authors: detail.authors,
    categories: detail.categories,
    tags: detail.tags,
    commentCount: detail.commentCount,
    citationCounts: { incoming: citations.incoming.length, outgoing: citations.outgoing.length },
    links: links.map((l) => ({ id: l.id, kind: l.kind, url: l.url, title: l.title })),
    pdfUrl: versionRow.pdfUrl,
    exportedAt: new Date().toISOString(),
  });
}
