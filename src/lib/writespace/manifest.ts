/**
 * Papex 在线创作 —— 客户端数据模型与校验
 *
 * 这里的类型刻意与 `papex-latex/papex.schema.json` 以及服务端
 * `src/lib/latex/papex-json.ts` 保持一致，但不引入任何服务端模块，
 * 以便在前端（浏览器）安全使用。
 */

export const PAPEX_SCHEMA_VERSION = "1.0.0";

export type RefType =
  | "article"
  | "book"
  | "inproceedings"
  | "incollection"
  | "booklet"
  | "conference"
  | "mastersthesis"
  | "phdthesis"
  | "techreport"
  | "misc"
  | "unpublished"
  | "online";

export type SectionLevel = "part" | "chapter" | "section" | "subsection" | "subsubsection";

export type Language = "zh" | "en" | "auto";

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
  type?: RefType;
  title?: string;
  author?: string;
  editor?: string;
  journal?: string;
  booktitle?: string;
  publisher?: string;
  institution?: string;
  school?: string;
  year?: number;
  volume?: string;
  number?: string;
  pages?: string;
  doi?: string;
  url?: string;
  arxivId?: string;
  note?: string;
}

export interface PapexSection {
  id?: string;
  title?: string;
  file: string;
  level?: SectionLevel;
}

export interface PapexBuild {
  documentclass?: string;
  fontset?: string;
  bibStyle?: "numeric" | "authoryear";
  columns?: 1 | 2;
  [key: string]: unknown;
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
  language?: Language;
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
  build?: PapexBuild;
}

/** 可视编辑器中的完整草稿状态。 */
export interface WritespaceDraft {
  manifest: PapexManifest;
  /** 章节/附录正文，键为对应 section 的 file 路径（如 "sections/intro.tex"）。 */
  contents: Record<string, string>;
}

export const LICENSE_OPTIONS: { value: string; label: string }[] = [
  { value: "CC-BY-4.0", label: "CC BY 4.0" },
  { value: "CC-BY-SA-4.0", label: "CC BY-SA 4.0" },
  { value: "CC0-1.0", label: "CC0 1.0" },
  { value: "Apache-2.0", label: "Apache-2.0" },
  { value: "MIT", label: "MIT" },
  { value: "arXiv-license", label: "arXiv License" },
];

export const REF_TYPE_OPTIONS: { value: RefType; label: string }[] = [
  { value: "article", label: "article" },
  { value: "book", label: "book" },
  { value: "inproceedings", label: "inproceedings" },
  { value: "incollection", label: "incollection" },
  { value: "booklet", label: "booklet" },
  { value: "conference", label: "conference" },
  { value: "mastersthesis", label: "mastersthesis" },
  { value: "phdthesis", label: "phdthesis" },
  { value: "techreport", label: "techreport" },
  { value: "misc", label: "misc" },
  { value: "unpublished", label: "unpublished" },
  { value: "online", label: "online" },
];

export const SECTION_LEVEL_OPTIONS: { value: SectionLevel; label: string }[] = [
  { value: "section", label: "section" },
  { value: "subsection", label: "subsection" },
  { value: "subsubsection", label: "subsubsection" },
  { value: "chapter", label: "chapter" },
  { value: "part", label: "part" },
];

export const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: "auto", label: "auto" },
  { value: "zh", label: "zh" },
  { value: "en", label: "en" },
];

let sectionSeq = 0;
function nextSectionId(existing: string[]): string {
  let n = existing.length + 1;
  let candidate = `sec-${n}`;
  while (existing.includes(candidate)) {
    n += 1;
    candidate = `sec-${n}`;
  }
  return candidate;
}

/** 生成一个空白草稿（含一个示例章节，避免校验一开始就全部报错）。 */
export function createDefaultDraft(): WritespaceDraft {
  const id = "intro";
  return {
    manifest: {
      schemaVersion: PAPEX_SCHEMA_VERSION,
      paper: {
        title: "",
        abstract: "",
        primaryCategoryId: "",
        keywords: [],
        license: "CC-BY-4.0",
        language: "auto",
      },
      authors: [{ name: "" }],
      references: [],
      sections: [{ id, title: "引言", level: "section", file: `sections/${id}.tex` }],
      appendices: [],
      build: { documentclass: "papex", bibStyle: "numeric", columns: 1 },
    },
    contents: { [`sections/${id}.tex`]: "% 在此撰写引言……\n" },
  };
}

/** 新增一个章节，返回新的 draft（不可变更新）。 */
export function addSection(draft: WritespaceDraft, isAppendix = false): WritespaceDraft {
  const ids = (isAppendix ? (draft.manifest.appendices ?? []) : draft.manifest.sections)
    .map((s) => s.id ?? "")
    .filter(Boolean);
  const id = nextSectionId(ids);
  const file = `sections/${id}.tex`;
  const newSection: PapexSection = isAppendix
    ? { id, title: "附录", file }
    : { id, title: "新章节", level: "section", file };
  const list = isAppendix ? draft.manifest.appendices ?? [] : draft.manifest.sections;
  const nextList = [...list, newSection];
  const nextManifest = isAppendix
    ? { ...draft.manifest, appendices: nextList }
    : { ...draft.manifest, sections: nextList };
  return { manifest: nextManifest, contents: { ...draft.contents, [file]: "" } };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  /** 非阻断性提示（如章节正文为空）。 */
  warnings: string[];
}

/** 校验草稿（对齐 papex.schema.json 的核心约束）。 */
export function validateDraft(draft: WritespaceDraft): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const m = draft.manifest;

  if (!m.schemaVersion || !/^\d+\.\d+\.\d+$/.test(m.schemaVersion)) {
    errors.push("schemaVersion 格式应为 x.y.z");
  }

  const paper = m.paper;
  if (!paper) {
    errors.push("paper 为必填对象");
  } else {
    if (!paper.title || !paper.title.trim()) errors.push("paper.title 为必填");
    if (!paper.abstract || !paper.abstract.trim()) errors.push("paper.abstract 为必填");
    if (!paper.primaryCategoryId || !paper.primaryCategoryId.trim())
      errors.push("paper.primaryCategoryId 为必填");
    if (paper.id && !/^\d{4}\.\d{5}$/.test(paper.id))
      errors.push("paper.id 格式应为 YYMM.NNNNN");
    if (paper.keywords && !Array.isArray(paper.keywords))
      errors.push("paper.keywords 应为字符串数组");
  }

  if (!Array.isArray(m.authors) || m.authors.length === 0) {
    errors.push("authors 至少 1 项");
  } else {
    m.authors.forEach((a, i) => {
      if (!a || !a.name || !a.name.trim()) errors.push(`authors[${i}].name 为必填`);
      if (a.orcid && !/^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/.test(a.orcid))
        errors.push(`authors[${i}].orcid 格式不正确`);
    });
  }

  if (!Array.isArray(m.sections) || m.sections.length === 0) {
    errors.push("sections 至少 1 项");
  } else {
    m.sections.forEach((s, i) => {
      if (!s || !s.file || !s.file.trim()) errors.push(`sections[${i}].file 为必填`);
      if (s.id && !/^[A-Za-z0-9_-]+$/.test(s.id))
        errors.push(`sections[${i}].id 只能包含字母、数字、- 和 _`);
      const c = draft.contents[s.file ?? ""];
      if (c == null || !c.trim()) warnings.push(`章节「${s.title || s.file}」正文为空`);
    });
  }

  (m.appendices ?? []).forEach((s, i) => {
    if (!s || !s.file || !s.file.trim()) errors.push(`appendices[${i}].file 为必填`);
  });

  (m.references ?? []).forEach((r, i) => {
    if (!r || !r.key || !r.key.trim()) errors.push(`references[${i}].key 为必填`);
    if (r.key && !/^[A-Za-z0-9_:+.-]+$/.test(r.key))
      errors.push(`references[${i}].key 含非法字符`);
    if (r.year != null && (typeof r.year !== "number" || r.year < 0 || r.year > 3000))
      errors.push(`references[${i}].year 超出范围`);
  });

  return { valid: errors.length === 0, errors, warnings };
}

/** 将 manifest 序列化为格式化 JSON 文本。 */
export function serializeManifest(m: PapexManifest): string {
  return JSON.stringify(m, null, 2) + "\n";
}
