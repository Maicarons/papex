import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { paperVersions } from "@/lib/db/schema";
import { createSubmission } from "@/lib/services/papers";
import { parsePdf, extractReferences } from "@/lib/pdf";
import { savePdfBuffer } from "@/lib/storage";
import { addCitation } from "@/lib/services/citations";
import { ingestSchema, type CreatePaperInput } from "@/lib/validations";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

interface IngestResult {
  ok: boolean;
  paperId?: string;
  title?: string;
  referencesLinked?: number;
  error?: string;
}

interface OwnerLike {
  id: string;
  role: "author" | "moderator" | "admin";
}

/** Per-item metadata accepted by the batch ingest endpoint. */
interface IngestMeta {
  primaryCategoryId?: string;
  title?: string;
  abstract?: string;
  authors?: CreatePaperInput["authors"];
  doi?: string;
  sourceUrl?: string;
  pdfUrl?: string;
}

/**
 * Batch ingest. Two accepted shapes:
 *  1) multipart/form-data: files under "pdf" + a "meta" JSON string (array,
 *     aligned to the files): { primaryCategoryId, authors?, title?, abstract? }.
 *  2) JSON body: { items: [{ pdfUrl?, title?, abstract?, primaryCategoryId, authors?, doi?, sourceUrl? }] }.
 *
 * Each item is parsed (PDF -> title/abstract/references), a paper submission is
 * created, the PDF stored locally, and any references resolving to local papers
 * are linked into the citation graph.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "moderator" && user.role !== "admin")) {
    return NextResponse.json({ error: "需要审核员权限" }, { status: 403 });
  }
  const owner: OwnerLike = { id: user.id, role: user.role };

  const results: IngestResult[] = [];
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: "表单解析失败" }, { status: 400 });
    const files = form.getAll("pdf").filter((f): f is File => typeof f !== "string");
    let meta: IngestMeta[] = [];
    const metaRaw = form.get("meta");
    if (typeof metaRaw === "string") {
      try {
        meta = JSON.parse(metaRaw);
      } catch {
        return NextResponse.json({ error: "meta 不是合法 JSON" }, { status: 400 });
      }
    }
    for (let i = 0; i < files.length; i++) {
      const buf = Buffer.from(await (files[i] as File).arrayBuffer());
      results.push(await ingestBuffer(buf, meta[i] ?? {}, owner));
    }
  } else {
    const json = await req.json().catch(() => null);
    const parsed = ingestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });
    }
    for (const item of parsed.data.items) {
      let buf: Buffer | null = null;
      if (item.pdfUrl) {
        try {
          const res = await fetch(item.pdfUrl);
          if (res.ok) buf = Buffer.from(await res.arrayBuffer());
        } catch {
          buf = null;
        }
      }
      results.push(await ingestItem(item, buf, owner));
    }
  }

  return NextResponse.json({ ok: true, count: results.length, results });
}

/** Ingest a parsed PDF buffer (multipart path). */
async function ingestBuffer(buf: Buffer, meta: IngestMeta, owner: OwnerLike): Promise<IngestResult> {
  try {
    const parsed = await parsePdf(buf);
    const primaryCategoryId = meta.primaryCategoryId as string;
    if (!primaryCategoryId) return { ok: false, error: "缺少 primaryCategoryId" };
    const title = (meta.title as string) || parsed.title || "Untitled (imported)";
    const abstract = (meta.abstract as string) || parsed.abstract || "";

    const { paperId, version } = await createSubmission(makeInput(title, abstract, meta), owner);
    const saved = await savePdfBuffer(paperId, version, buf);
    await updatePdfUrl(paperId, version, saved.pdfUrl);

    let linked = 0;
    for (const r of extractReferences(parsed.text)) {
      const added = await addCitation({
        paperId,
        targetArxivId: r.targetArxivId,
        targetDoi: r.targetDoi,
        targetTitle: r.targetTitle,
        createdById: owner.id,
      });
      if (added.targetPaperId) linked++;
    }
    return { ok: true, paperId, title, referencesLinked: linked };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Ingest a JSON item (may optionally fetch + parse a remote PDF). */
async function ingestItem(item: IngestMeta, buf: Buffer | null, owner: OwnerLike): Promise<IngestResult> {
  try {
    const parsed = buf ? await parsePdf(buf) : null;
    const title = item.title || parsed?.title || "Untitled (imported)";
    const abstract = item.abstract || parsed?.abstract || "";

    const { paperId, version } = await createSubmission(makeInput(title, abstract, item), owner);

    let pdfUrl: string | undefined = item.pdfUrl;
    if (buf) {
      const saved = await savePdfBuffer(paperId, version, buf);
      pdfUrl = saved.pdfUrl;
    }
    if (pdfUrl) await updatePdfUrl(paperId, version, pdfUrl);

    let linked = 0;
    const refs = parsed ? extractReferences(parsed.text) : [];
    for (const r of refs) {
      const added = await addCitation({
        paperId,
        targetArxivId: r.targetArxivId,
        targetDoi: r.targetDoi,
        targetTitle: r.targetTitle,
        createdById: owner.id,
      });
      if (added.targetPaperId) linked++;
    }
    return { ok: true, paperId, title, referencesLinked: linked };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

function makeInput(title: string, abstract: string, meta: IngestMeta): CreatePaperInput {
  return {
    title,
    abstract,
    primaryCategoryId: meta.primaryCategoryId ?? "",
    secondaryCategoryIds: [],
    authors:
      Array.isArray(meta.authors) && meta.authors.length
        ? meta.authors
        : [{ name: "Unknown Author", order: 0 }],
    pdfUrl: meta.pdfUrl,
    doi: meta.doi,
    sourceUrl: meta.sourceUrl,
    license: "CC-BY-4.0",
  };
}

async function updatePdfUrl(paperId: string, version: number, pdfUrl: string) {
  await db
    .update(paperVersions)
    .set({ pdfUrl })
    .where(eq(paperVersions.paperId, paperId) && eq(paperVersions.version, version));
}
