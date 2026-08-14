import { db } from "@/lib/db";
import {
  papers,
  paperVersions,
  paperAuthors,
  paperCategories,
  categories,
  authors,
  affiliations,
  comments,
  moderationLogs,
  endorsements,
  users,
  tags,
  paperTags,
} from "@/lib/db/schema";
import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { generatePaperId } from "@/lib/paper-id";
import { compileSearch } from "@/lib/search";
import { findOrCreateAuthor } from "@/lib/services/authors";
import { notifyNewPaper } from "@/lib/services/feed";
import { notifyReviewResult } from "@/lib/services/notifications";
import { parsePdf, extractReferences } from "@/lib/pdf";
import { savePdfBuffer } from "@/lib/storage";
import { addCitation } from "@/lib/services/citations";
import type { CreatePaperInput } from "@/lib/validations";
import type { SessionPayload } from "@/lib/auth/session";

interface OwnerLike {
  id: string;
  role: SessionPayload["role"];
}

export interface PaperListItem {
  paper: typeof papers.$inferSelect;
  version: typeof paperVersions.$inferSelect;
  category: typeof categories.$inferSelect;
}

export interface ListPaperFilters {
  status?: string;
  category?: string;
  authorId?: number;
  tag?: string;
  q?: string;
  sort?: "new" | "updated";
  page?: number;
  pageSize?: number;
}

function buildCategoryValues(paperId: string, input: CreatePaperInput) {
  const ids = new Set<string>([input.primaryCategoryId, ...input.secondaryCategoryIds]);
  return [...ids].map((categoryId) => ({
    paperId,
    categoryId,
    isPrimary: categoryId === input.primaryCategoryId,
  }));
}

export async function createSubmission(input: CreatePaperInput, owner: OwnerLike) {
  return db.transaction(async (tx) => {
    const authorRows: { id: number; name: string; order: number }[] = [];
    for (const a of input.authors) {
      const author = await findOrCreateAuthor(a.name, a.affiliationId);
      authorRows.push({ id: author.id, name: author.name, order: a.order });
    }

    const authorsJson = authorRows.map((a) => ({
      name: a.name,
      order: a.order,
      authorId: a.id,
    }));
    const baseVersion = {
      title: input.title,
      abstract: input.abstract,
      authorsJson,
      pdfUrl: input.pdfUrl || null,
      sourceUrl: input.sourceUrl || null,
      doi: input.doi || null,
      license: input.license,
      comments: input.comments || null,
    };

    // ----- New version of an existing paper -----
    if (input.basePaperId) {
      const [paper] = await tx.select().from(papers).where(eq(papers.id, input.basePaperId));
      if (!paper) throw new Error("PAPER_NOT_FOUND");
      if (
        paper.createdById !== owner.id &&
        owner.role !== "admin" &&
        owner.role !== "moderator"
      ) {
        throw new Error("FORBIDDEN");
      }
      const newVersion = paper.latestVersion + 1;
      await tx.insert(paperVersions).values({ paperId: paper.id, version: newVersion, ...baseVersion });
      await tx
        .update(papers)
        .set({ title: input.title, latestVersion: newVersion, updatedAt: new Date() })
        .where(eq(papers.id, paper.id));
      await tx.delete(paperCategories).where(eq(paperCategories.paperId, paper.id));
      await tx.insert(paperCategories).values(buildCategoryValues(paper.id, input));
      await tx.delete(paperAuthors).where(eq(paperAuthors.paperId, paper.id));
      await tx
        .insert(paperAuthors)
        .values(authorRows.map((a) => ({ paperId: paper.id, authorId: a.id, order: a.order })));
      return { paperId: paper.id, version: newVersion };
    }

    // ----- Brand new paper -----
    // Gate: a first submission in a category requires an endorsement for that
    // category (or a previously created paper in it). New versions of an existing
    // paper are exempt because they are not "first submissions".
    {
      const [prior] = await tx
        .select({ id: papers.id })
        .from(papers)
        .where(
          and(
            eq(papers.createdById, owner.id),
            eq(papers.primaryCategoryId, input.primaryCategoryId),
          ),
        )
        .limit(1);
      if (!prior) {
        const [endo] = await tx
          .select({ id: endorsements.id })
          .from(endorsements)
          .where(
            and(
              eq(endorsements.endorseeId, owner.id),
              eq(endorsements.categoryId, input.primaryCategoryId),
            ),
          )
          .limit(1);
        if (!endo) throw new Error("ENDORSEMENT_REQUIRED");
      }
    }
    let paperId = generatePaperId();
    let created = false;
    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      try {
        await tx.insert(papers).values({
          id: paperId,
          title: input.title,
          primaryCategoryId: input.primaryCategoryId,
          status: "submitted",
          createdById: owner.id,
          latestVersion: 1,
        });
        created = true;
      } catch {
        paperId = generatePaperId();
      }
    }
    if (!created) throw new Error("ID_GENERATION_FAILED");

    await tx.insert(paperVersions).values({ paperId, version: 1, ...baseVersion });
    await tx.insert(paperCategories).values(buildCategoryValues(paperId, input));
    await tx
      .insert(paperAuthors)
      .values(authorRows.map((a) => ({ paperId, authorId: a.id, order: a.order })));

    return { paperId, version: 1 };
  });
}

export interface AttachedPdf {
  pdfUrl: string;
  pages: number;
  referencesExtracted: number;
  referencesLinked: number;
}

/**
 * Persist an uploaded PDF for a specific paper version and auto-link any
 * references it contains. Shared by `POST /api/papers/{id}/pdf` and the
 * multipart `POST /api/papers` submission flow so both paths stay in sync.
 */
export async function attachPdf(
  paperId: string,
  version: number,
  buf: Buffer,
  userId: string,
): Promise<AttachedPdf> {
  const { pdfUrl } = await savePdfBuffer(paperId, version, buf);
  await db
    .update(paperVersions)
    .set({ pdfUrl })
    .where(and(eq(paperVersions.paperId, paperId), eq(paperVersions.version, version)));

  const parsed = await parsePdf(buf);
  const refs = extractReferences(parsed.text);
  let referencesLinked = 0;
  for (const r of refs) {
    const added = await addCitation({
      paperId,
      targetArxivId: r.targetArxivId,
      targetDoi: r.targetDoi,
      targetTitle: r.targetTitle,
      createdById: userId,
    });
    if (added.targetPaperId) referencesLinked++;
  }

  return { pdfUrl, pages: parsed.numPages, referencesExtracted: refs.length, referencesLinked };
}

export async function getPaperDetail(id: string) {
  const [paperRow] = await db
    .select({ paper: papers, category: categories })
    .from(papers)
    .innerJoin(categories, eq(papers.primaryCategoryId, categories.id))
    .where(eq(papers.id, id));
  if (!paperRow) return null;

  const [latest] = await db
    .select()
    .from(paperVersions)
    .where(
      and(eq(paperVersions.paperId, id), eq(paperVersions.version, paperRow.paper.latestVersion)),
    );
  if (!latest) return null;

  const authorRows = await db
    .select({ pa: paperAuthors, author: authors, affiliation: affiliations })
    .from(paperAuthors)
    .innerJoin(authors, eq(paperAuthors.authorId, authors.id))
    .leftJoin(affiliations, eq(authors.affiliationId, affiliations.id))
    .where(eq(paperAuthors.paperId, id))
    .orderBy(asc(paperAuthors.order));

  const catRows = await db
    .select({ pc: paperCategories, category: categories })
    .from(paperCategories)
    .innerJoin(categories, eq(paperCategories.categoryId, categories.id))
    .where(eq(paperCategories.paperId, id));

  // Submitter (the user who uploaded this paper) — distinct from the paper's
  // author list: an uploader may submit on behalf of other authors.
  const createdById = paperRow.paper.createdById;
  const [submitter] = createdById
    ? await db
        .select({ id: users.id, username: users.username, displayName: users.displayName })
        .from(users)
        .where(eq(users.id, createdById))
    : [undefined];

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(eq(comments.paperId, id));

  const paperTagsRows = await db
    .select({ id: tags.id, name: tags.name })
    .from(paperTags)
    .innerJoin(tags, eq(paperTags.tagId, tags.id))
    .where(eq(paperTags.paperId, id))
    .orderBy(tags.name);

  return {
    paper: paperRow.paper,
    primaryCategory: paperRow.category,
    latest,
    authors: authorRows.map((r) => ({ ...r.author, order: r.pa.order, affiliation: r.affiliation })),
    categories: catRows.map((r) => ({ ...r.category, isPrimary: r.pc.isPrimary })),
    submitter: submitter ?? null,
    tags: paperTagsRows,
    commentCount: count,
  };
}

export interface RelatedPaper {
  id: string;
  title: string;
  authors: string[];
}

export async function listRelatedPapers(paperId: string, primaryCategoryId: string, limit = 5) {
  const rows = await db
    .select({ paper: papers, version: paperVersions })
    .from(papers)
    .innerJoin(
      paperVersions,
      and(eq(paperVersions.paperId, papers.id), eq(paperVersions.version, papers.latestVersion)),
    )
    .where(
      and(
        eq(papers.primaryCategoryId, primaryCategoryId),
        eq(papers.status, "approved"),
        sql`${papers.id} <> ${paperId}`,
      ),
    )
    .orderBy(desc(papers.createdAt))
    .limit(limit);

  const related: RelatedPaper[] = [];
  for (const r of rows) {
    const authorRows = await db
      .select({ name: authors.name })
      .from(paperAuthors)
      .innerJoin(authors, eq(paperAuthors.authorId, authors.id))
      .where(eq(paperAuthors.paperId, r.paper.id))
      .orderBy(asc(paperAuthors.order))
      .limit(3);
    related.push({ id: r.paper.id, title: r.version.title, authors: authorRows.map((a) => a.name) });
  }
  return related;
}

export async function listVersions(id: string) {
  return db
    .select()
    .from(paperVersions)
    .where(eq(paperVersions.paperId, id))
    .orderBy(asc(paperVersions.version));
}

export async function getPaperVersion(id: string, version: number) {
  const [row] = await db
    .select()
    .from(paperVersions)
    .where(and(eq(paperVersions.paperId, id), eq(paperVersions.version, version)));
  return row ?? null;
}

export async function listPapers(filters: ListPaperFilters = {}) {
  const {
    status = "approved",
    category,
    authorId,
    tag,
    q,
    sort = "new",
    page = 1,
    pageSize = 20,
  } = filters;

  const conditions = [sql`${papers.status} = ${status}`];

  if (category) {
    conditions.push(
      or(
        eq(papers.primaryCategoryId, category),
        sql`exists (select 1 from paper_categories pc where pc.paper_id = ${papers.id} and pc.category_id = ${category})`,
      )!,
    );
  }
  if (authorId) {
    conditions.push(
      sql`exists (select 1 from paper_authors pa where pa.paper_id = ${papers.id} and pa.author_id = ${authorId})`,
    );
  }
  if (tag) {
    conditions.push(
      sql`exists (select 1 from paper_tags pt join tags t on t.id = pt.tag_id where pt.paper_id = ${papers.id} and lower(t.name) = lower(${tag}))`,
    );
  }
  const searchSql = q ? compileSearch(q) : null;
  if (searchSql) {
    conditions.push(searchSql);
  }

  const where = and(...conditions);

  const rows = await db
    .select({ paper: papers, version: paperVersions, category: categories })
    .from(papers)
    .innerJoin(
      paperVersions,
      and(eq(paperVersions.paperId, papers.id), eq(paperVersions.version, papers.latestVersion)),
    )
    .innerJoin(categories, eq(papers.primaryCategoryId, categories.id))
    .where(where)
    .orderBy(sort === "updated" ? desc(papers.updatedAt) : desc(papers.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ count }] = await db
    .select({ count: sql<number>`count(distinct ${papers.id})::int` })
    .from(papers)
    .innerJoin(
      paperVersions,
      and(eq(paperVersions.paperId, papers.id), eq(paperVersions.version, papers.latestVersion)),
    )
    .where(where);

  return { rows: rows as PaperListItem[], total: count, page, pageSize };
}

export async function moderate(
  paperId: string,
  action: "approve" | "reject" | "withdraw",
  moderator: OwnerLike,
  reason?: string | null,
) {
  if (moderator.role !== "moderator" && moderator.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  const detail = await getPaperDetail(paperId);
  if (!detail) throw new Error("NOT_FOUND");

  if (action === "approve") {
    await db
      .update(papers)
      .set({ status: "approved", updatedAt: new Date() })
      .where(eq(papers.id, paperId));
    if (detail.latest) {
      await notifyNewPaper({
        paperId,
        title: detail.latest.title,
        primaryCategoryId: detail.paper.primaryCategoryId,
        authorIds: detail.authors.map((a) => a.id),
      });
    }
  } else {
    await db
      .update(papers)
      .set({ status: action === "reject" ? "rejected" : "withdrawn", updatedAt: new Date() })
      .where(eq(papers.id, paperId));
  }

  // Audit trail.
  await db
    .insert(moderationLogs)
    .values({ paperId, moderatorId: moderator.id, action, reason: reason ?? null });

  // Notify the submitting author of the moderation outcome (was previously silent).
  if (detail.paper.createdById) {
    await notifyReviewResult({
      userId: detail.paper.createdById,
      paperId,
      paperTitle: detail.latest?.title ?? paperId,
      action,
      reason,
    });
  }

  return getPaperDetail(paperId);
}

export async function listReviewQueue() {
  return listPapers({ status: "submitted", pageSize: 100, page: 1 });
}
