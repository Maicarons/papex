import { db } from "@/lib/db";
import { affiliations, categories, papers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { CreatePaperInput } from "@/lib/validations";

/**
 * papex.json 清单的类型定义、校验与「数据库映射层」。
 *
 * 这些类型故意保持宽松（mirror JSON Schema），后端只消费能映射进数据库的部分；
 * 其余字段（subtitle / keywords / venue / sections 等）由 XeLaTeX 工具链消费。
 */

export interface PapexAuthor {
  name: string;
  orcid?: string;
  affiliation?: string;
  email?: string;
  homepage?: string;
  order?: number;
  corresponding?: boolean;
  equalContribution?: boolean;
  footnote?: string;
}

export interface PapexReference {
  key: string;
  type?: string;
  title?: string;
  author?: string;
  journal?: string;
  booktitle?: string;
  publisher?: string;
  year?: number;
  doi?: string;
  url?: string;
  arxivId?: string;
}

export interface PapexSection {
  id?: string;
  title?: string;
  file: string;
  level?: string;
}

export interface PapexPaper {
  id?: string;
  title: string;
  subtitle?: string;
  abstract: string;
  keywords?: string[];
  primaryCategoryId: string;
  secondaryCategoryIds?: string[];
  doi?: string;
  license?: string;
  version?: number;
  versionNote?: string;
  language?: string;
  date?: string;
  venue?: string;
  subject?: string;
}

export interface PapexManifest {
  schemaVersion?: string;
  paper: PapexPaper;
  authors: PapexAuthor[];
  references?: PapexReference[];
  sections: PapexSection[];
  appendices?: PapexSection[];
  acknowledgments?: string;
  funding?: string;
  build?: Record<string, unknown>;
}

export interface CoerceResult {
  ok: boolean;
  value?: PapexManifest;
  errors: string[];
}

export function coerceManifest(raw: unknown): CoerceResult {
  const errors: string[] = [];
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: ["根必须是对象"] };
  }
  const data = raw as Record<string, unknown>;
  const paper = data.paper;
  if (typeof paper !== "object" || paper === null) {
    errors.push("paper 为必填对象");
  } else {
    const p = paper as Record<string, unknown>;
    if (!p.title || typeof p.title !== "string") errors.push("paper.title 必填");
    if (!p.abstract || typeof p.abstract !== "string") errors.push("paper.abstract 必填");
    if (!p.primaryCategoryId || typeof p.primaryCategoryId !== "string")
      errors.push("paper.primaryCategoryId 必填");
  }

  const authors = data.authors;
  if (!Array.isArray(authors) || authors.length === 0) errors.push("authors 至少 1 项");
  else
    authors.forEach((a, i) => {
      if (!a || typeof (a as Record<string, unknown>).name !== "string")
        errors.push(`authors[${i}].name 必填`);
    });

  const sections = data.sections;
  if (!Array.isArray(sections) || sections.length === 0) errors.push("sections 至少 1 项");
  else
    sections.forEach((s, i) => {
      if (!s || typeof (s as Record<string, unknown>).file !== "string")
        errors.push(`sections[${i}].file 必填`);
    });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: data as unknown as PapexManifest, errors: [] };
}

async function findOrCreateAffiliation(name: string): Promise<number> {
  const [existing] = await db
    .select({ id: affiliations.id })
    .from(affiliations)
    .where(eq(affiliations.name, name))
    .limit(1);
  if (existing) return existing.id;
  const [created] = await db.insert(affiliations).values({ name }).returning();
  return created.id;
}

/**
 * 将清单映射为 CreatePaperInput（供现有 createSubmission 使用）。
 * 此处完成三项 DB 相关解析：
 *   - primaryCategoryId 必须存在于 categories 表（否则抛 CATEGORY_NOT_FOUND）；
 *   - 作者 affiliation 字符串 -> affiliations.id；
 *   - paper.id 若匹配本人（或特权角色）已有论文 -> 视作新版本（basePaperId）。
 */
export async function mapToCreatePaperInput(
  manifest: PapexManifest,
  owner: { id: string; role: string },
): Promise<CreatePaperInput> {
  const [cat] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, manifest.paper.primaryCategoryId))
    .limit(1);
  if (!cat) throw new Error(`CATEGORY_NOT_FOUND:${manifest.paper.primaryCategoryId}`);

  const affilNames = Array.from(
    new Set(
      (manifest.authors ?? [])
        .map((a) => a.affiliation)
        .filter((x): x is string => typeof x === "string" && x.length > 0),
    ),
  );
  const affilMap = new Map<string, number>();
  for (const name of affilNames) affilMap.set(name, await findOrCreateAffiliation(name));

  const authors = (manifest.authors ?? []).map((a, i) => ({
    name: a.name,
    orcid: a.orcid,
    affiliationId: a.affiliation ? affilMap.get(a.affiliation) : undefined,
    order: typeof a.order === "number" ? a.order : i,
  }));

  let basePaperId: string | undefined;
  const claimed = manifest.paper.id;
  if (typeof claimed === "string" && /^\d{4}\.\d{5}$/.test(claimed)) {
    const [p] = await db.select().from(papers).where(eq(papers.id, claimed)).limit(1);
    if (
      p &&
      (p.createdById === owner.id || owner.role === "admin" || owner.role === "moderator")
    ) {
      basePaperId = claimed;
    }
  }

  const input: CreatePaperInput = {
    title: manifest.paper.title,
    abstract: manifest.paper.abstract,
    primaryCategoryId: manifest.paper.primaryCategoryId,
    secondaryCategoryIds: manifest.paper.secondaryCategoryIds ?? [],
    authors,
    doi: manifest.paper.doi,
    license: manifest.paper.license ?? "CC-BY-4.0",
    comments: manifest.paper.versionNote,
    basePaperId,
  };
  return input;
}

export function mapReferencesToCitations(
  manifest: PapexManifest,
): { targetDoi?: string; targetArxivId?: string; targetTitle?: string; targetUrl?: string }[] {
  const out: {
    targetDoi?: string;
    targetArxivId?: string;
    targetTitle?: string;
    targetUrl?: string;
  }[] = [];
  for (const r of manifest.references ?? []) {
    const c: {
      targetDoi?: string;
      targetArxivId?: string;
      targetTitle?: string;
      targetUrl?: string;
    } = {};
    if (r.doi) c.targetDoi = r.doi;
    if (r.arxivId) c.targetArxivId = r.arxivId;
    if (r.title) c.targetTitle = r.title;
    if (r.url) c.targetUrl = r.url;
    // citationSchemaRefined 要求至少一项标识；缺失则跳过
    if (c.targetDoi || c.targetArxivId || c.targetTitle) out.push(c);
  }
  return out;
}
