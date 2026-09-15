import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { paperVersions } from "@/lib/db/schema";
import { diffLines } from "@/lib/diff";

export const dynamic = "force-dynamic";

/**
 * GET /api/papers/{id}/diff?v1=..&v2=..
 * Compare two versions of a paper (P1-E): field-level before/after plus a line
 * diff of the abstract. Missing side → null (e.g. v2 authors).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const v1 = Number(url.searchParams.get("v1")) || 1;
  const v2 = Number(url.searchParams.get("v2")) || 1;
  if (v1 === v2 || v1 < 1 || v2 < 1) {
    return NextResponse.json({ error: "invalid versions" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(paperVersions)
    .where(and(eq(paperVersions.paperId, id), eq(paperVersions.version, v1)))
    .unionAll(
      db
        .select()
        .from(paperVersions)
        .where(and(eq(paperVersions.paperId, id), eq(paperVersions.version, v2))),
    );
  const a = rows.find((r) => r.version === v1);
  const b = rows.find((r) => r.version === v2);
  if (!a || !b) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const authorsOf = (v: typeof a) => (v.authorsJson as { name: string }[] | null) ?? [];

  return NextResponse.json({
    version: { from: v1, to: v2 },
    title: { before: a.title, after: b.title, changed: a.title !== b.title },
    abstract: {
      before: a.abstract,
      after: b.abstract,
      changed: a.abstract !== b.abstract,
      lines: diffLines(a.abstract ?? "", b.abstract ?? ""),
    },
    authors: {
      before: authorsOf(a).map((x) => x.name),
      after: authorsOf(b).map((x) => x.name),
      changed: JSON.stringify(a.authorsJson) !== JSON.stringify(b.authorsJson),
    },
    doi: { before: a.doi, after: b.doi, changed: a.doi !== b.doi },
    license: { before: a.license, after: b.license, changed: a.license !== b.license },
    comments: { before: a.comments, after: b.comments, changed: a.comments !== b.comments },
  });
}
