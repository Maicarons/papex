import { NextResponse } from "next/server";
import { eq, and, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { paperVersions, paperExternalIds } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { importByIdentifier } from "@/lib/services/import";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const ORCID_API = "https://pub.orcid.org/v3.0";
const MAX_WORKS = 25;
const MAX_IMPORT = 5; // new imports per call (cost guard)

interface OrcidWork {
  title: string;
  doi: string | null;
}

function extractDoi(work: Record<string, unknown>): string | null {
  const ids = (work["external-ids"] as { "external-id"?: Record<string, unknown>[] } | undefined)?.[
    "external-id"
  ] ?? [];
  for (const id of ids) {
    if (String(id?.["external-id-type"] ?? "").toLowerCase() === "doi") {
      const v = String(id?.["external-id-value"] ?? "").trim().replace(/^doi:\s*/i, "");
      return v || null;
    }
  }
  for (const id of ids) {
    const v = String(id?.["external-id-value"] ?? "");
    const m = /doi\.org\/(.+)/i.exec(v);
    if (m) return m[1].trim();
  }
  return null;
}

/** Match a DOI against locally indexed papers (versions + external ids). */
async function findPaperByDoi(doi: string): Promise<string | null> {
  const normalized = doi.toLowerCase();
  const [row] = await db
    .select({ paperId: paperExternalIds.paperId })
    .from(paperExternalIds)
    .where(
      and(
        eq(paperExternalIds.source, "doi"),
        sql`lower(${paperExternalIds.externalId}) = ${normalized}`,
      ),
    )
    .limit(1);
  if (row) return row.paperId;
  const [ver] = await db
    .select({ paperId: paperVersions.paperId })
    .from(paperVersions)
    .where(or(eq(paperVersions.doi, doi), eq(paperVersions.doi, normalized)))
    .limit(1);
  return ver?.paperId ?? null;
}

/**
 * POST /api/me/orcid/import
 * Import the user's own publications from their ORCID record: works whose DOI
 * already exists locally are reported as matched; the rest are submitted via
 * the standard external-import pipeline (arXiv/Crossref/S2 metadata).
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!user.orcid?.trim()) {
    return NextResponse.json({ error: "请先在账号设置中填写 ORCID" }, { status: 400 });
  }

  const rl = rateLimit(`orcid:${user.id}`, 2, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "操作过于频繁，请稍后再试" }, { status: 429 });
  }

  const res = await fetch(`${ORCID_API}/${user.orcid.trim()}/works`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json({ error: "ORCID 服务暂不可用，请稍后再试" }, { status: 502 });
  }
  const json = (await res.json()) as { group?: { "work-summary"?: Record<string, unknown>[] }[] };
  const works: OrcidWork[] = (json.group ?? [])
    .flatMap((g) => g["work-summary"] ?? [])
    .slice(0, MAX_WORKS)
    .map((w) => ({
      title: String((w.title as { title?: { value?: unknown } } | undefined)?.title?.value ?? ""),
      doi: extractDoi(w),
    }));

  const result: {
    total: number;
    imported: { title: string; doi: string; paperId: string }[];
    matched: { title: string; doi: string; paperId: string }[];
    failed: { title: string; doi: string | null; error: string }[];
  } = { total: works.length, imported: [], matched: [], failed: [] };

  for (const w of works) {
    if (!w.doi) {
      result.failed.push({ title: w.title, doi: null, error: "no DOI" });
      continue;
    }
    const existing = await findPaperByDoi(w.doi);
    if (existing) {
      result.matched.push({ title: w.title, doi: w.doi, paperId: existing });
      continue;
    }
    if (result.imported.length >= MAX_IMPORT) {
      result.failed.push({ title: w.title, doi: w.doi, error: "single-run import limit reached" });
      continue;
    }
    try {
      const imported = await importByIdentifier({ doi: w.doi }, { id: user.id, role: user.role });
      result.imported.push({ title: imported.title, doi: w.doi, paperId: imported.paperId });
    } catch (e) {
      result.failed.push({
        title: w.title,
        doi: w.doi,
        error: String(e instanceof Error ? e.message : e).slice(0, 120),
      });
    }
  }

  return NextResponse.json(result);
}
