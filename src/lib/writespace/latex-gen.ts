/**
 * Papex 在线创作 —— LaTeX 片段生成（浏览器端）
 *
 * 把 papex.json 的纯文本字段安全转义为 LaTeX，并生成与 `papex-build.py`
 * 等价的中间片段（_papex_*.tex / references.bib），再组装成可直接被后端
 * `papex-archive.ts`（latexmk papex-template.tex）编译的完整归档文件清单。
 *
 * 关键修正：转义采用单遍字符扫描，避免对替换文本（如 \textbackslash{}）
 * 二次转义导致的损坏。
 */

import type {
  PapexAuthor,
  PapexManifest,
  PapexReference,
  PapexSection,
  RefType,
  SectionLevel,
} from "./manifest";

export interface ArchiveFile {
  name: string;
  content: string;
}

const AUTOGEN_BANNER =
  "% ============================================================\n" +
  "% 本文件由 Papex 在线创作自动生成，请勿手工编辑。\n" +
  "% 修改请在编辑器中调整，随后重新导出。\n" +
  "% ============================================================\n\n";

// 单遍转义：逐字符替换，替换文本不会被二次扫描。
const LATEX_MAP: Record<string, string> = {
  "\\": "\\textbackslash{}",
  "&": "\\&",
  "%": "\\%",
  $: "\\$",
  "#": "\\#",
  _: "\\_",
  "{": "\\{",
  "}": "\\}",
  "~": "\\textasciitilde{}",
  "^": "\\textasciicircum{}",
};

export function latexEscape(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  let out = "";
  for (const ch of s) out += LATEX_MAP[ch] ?? ch;
  return out;
}

export function bibtexEscape(value: unknown): string {
  if (value == null) return "";
  return String(value)
    .replace(/[{}]/g, (m) => (m === "{" ? "\\{" : "\\}"))
    .replace(/[\\%&#]/g, (m) => "\\" + m);
}

function sortedAuthors(authors: PapexAuthor[]): PapexAuthor[] {
  return [...authors]
    .map((a, i) => ({ a, key: typeof a.order === "number" ? a.order : i }))
    .sort((x, y) => x.key - y.key)
    .map((x) => x.a);
}

export function genMeta(m: PapexManifest): string {
  const paper = m.paper;
  const authors = sortedAuthors(m.authors ?? []);
  const lines: string[] = [AUTOGEN_BANNER];

  lines.push(`\\title{${latexEscape(paper.title)}}`);
  if (paper.subtitle) lines.push(`\\papexSubtitle{${latexEscape(paper.subtitle)}}`);
  if (paper.id) lines.push(`\\papexPaperId{${latexEscape(paper.id)}}`);
  lines.push(`\\papexLicense{${latexEscape(paper.license ?? "CC-BY-4.0")}}`);
  if (paper.venue) lines.push(`\\papexVenue{${latexEscape(paper.venue)}}`);
  if (paper.doi) lines.push(`\\papexDoi{${latexEscape(paper.doi)}}`);
  if (paper.versionNote) lines.push(`\\papexVersionNote{${latexEscape(paper.versionNote)}}`);

  const kws = paper.keywords;
  if (Array.isArray(kws) && kws.length) {
    lines.push(`\\papexKeywords{${kws.map((k) => latexEscape(k)).join("；")}}`);
  }

  const running = latexEscape((paper.subject || paper.title || "").slice(0, 40));
  lines.push(`\\papexRunningTitle{${running}}`);

  const affilMap = new Map<string, number>();
  const affilSeq: string[] = [];
  for (const a of authors) {
    const aff = a.affiliation;
    if (aff && !affilMap.has(aff)) {
      affilSeq.push(aff);
      affilMap.set(aff, affilSeq.length);
    }
  }

  const pdfAuthors: string[] = [];
  for (const a of authors) {
    const name = a.name || "";
    pdfAuthors.push(name);
    const aff = a.affiliation;
    const affTag = aff ? `[${affilMap.get(aff)}]` : "";
    const thanks: string[] = [];
    if (a.corresponding)
      thanks.push(a.email ? `通讯作者。Email: ${a.email}` : "通讯作者。");
    if (a.equalContribution) thanks.push("同等贡献。");
    if (a.footnote) thanks.push(a.footnote);
    if (a.orcid) thanks.push(`ORCID: ${a.orcid}`);
    if (a.homepage) thanks.push(`主页: ${a.homepage}`);
    const suffix = thanks.map((t) => `\\thanks{${latexEscape(t)}}`).join("");
    lines.push(`\\author${affTag}{${latexEscape(name)}${suffix}}`);
  }

  for (let i = 0; i < affilSeq.length; i++) {
    lines.push(`\\affil[${i + 1}]{${latexEscape(affilSeq[i])}}`);
  }

  lines.push(`\\papexPdfAuthor{${latexEscape(pdfAuthors.join("; "))}}`);
  return lines.join("\n") + "\n";
}

export function genAbstract(m: PapexManifest): string {
  return AUTOGEN_BANNER + latexEscape(m.paper.abstract) + "\n";
}

const LEVEL_CMD: Record<SectionLevel, string> = {
  part: "\\part",
  chapter: "\\chapter",
  section: "\\section",
  subsection: "\\subsection",
  subsubsection: "\\subsubsection",
};

export function genSections(m: PapexManifest): string {
  const lines: string[] = [AUTOGEN_BANNER];
  for (const s of m.sections ?? []) {
    const f = s.file || "";
    if (s.title) {
      const cmd = LEVEL_CMD[s.level ?? "section"] ?? "\\section";
      lines.push(`${cmd}{${latexEscape(s.title)}}`);
    }
    if (f) lines.push(`\\input{${f.replace(/\\/g, "/")}}`);
  }
  return lines.join("\n") + "\n";
}

export function genBackmatter(m: PapexManifest): string {
  const lines: string[] = [AUTOGEN_BANNER];
  if (m.acknowledgments)
    lines.push(`\\papexAcknowledgments{${latexEscape(m.acknowledgments)}}`);
  if (m.funding) lines.push(`\\papexFunding{${latexEscape(m.funding)}}`);
  return lines.join("\n") + "\n";
}

export function genAppendices(m: PapexManifest): string {
  const lines: string[] = [AUTOGEN_BANNER];
  const apps = m.appendices;
  if (apps && apps.length) {
    lines.push("\\appendix");
    for (const a of apps) {
      const f = a.file || "";
      if (a.title) lines.push(`\\section{${latexEscape(a.title)}}`);
      if (f) lines.push(`\\input{${f.replace(/\\/g, "/")}}`);
    }
  }
  return lines.join("\n") + "\n";
}

const BIB_TYPE_MAP: Record<string, string> = {
  article: "article",
  book: "book",
  inproceedings: "inproceedings",
  incollection: "incollection",
  booklet: "booklet",
  conference: "inproceedings",
  mastersthesis: "mastersthesis",
  phdthesis: "phdthesis",
  techreport: "techreport",
  misc: "misc",
  unpublished: "unpublished",
  online: "online",
};

const BIB_FIELDS_ORDER = [
  "author",
  "title",
  "journal",
  "booktitle",
  "editor",
  "publisher",
  "institution",
  "school",
  "year",
  "volume",
  "number",
  "pages",
  "doi",
  "url",
  "note",
];

export function genBib(references?: PapexReference[]): string | null {
  const refs = references ?? [];
  if (!refs.length) return null;
  const out: string[] = ["% 由 Papex 在线创作从 references 自动生成\n"];
  for (const r of refs) {
    const key = r.key || "";
    const btype = BIB_TYPE_MAP[(r.type as RefType) ?? "misc"] ?? "misc";
    out.push(`@${btype}{${key},`);
    for (const fld of BIB_FIELDS_ORDER) {
      const val = (r as unknown as Record<string, unknown>)[fld];
      if (val == null || String(val).trim() === "") continue;
      out.push(`  ${fld} = {${bibtexEscape(val)}},`);
    }
    out.push("}\n");
  }
  return out.join("\n");
}

/**
 * 根据 build 选项生成主文档 papex-template.tex（注入 bibstyle / twocolumn）。
 * 传入的 templateTex 为从 /writespace/papex-template.tex 获取的标准模板。
 */
export function applyTemplateOptions(
  templateTex: string,
  build?: { bibStyle?: string; columns?: number },
): string {
  let opts = "11pt";
  if (build?.bibStyle === "authoryear") opts += ",bibstyle=authoryear";
  if (build?.columns === 2) opts += ",twocolumn";
  return templateTex.replace("[11pt]", `[${opts}]`);
}

export interface BuildAssets {
  templateTex: string;
  cls: string;
}

/**
 * 组装完整的归档文件清单：
 *   papex.json + sections/*.tex（正文）+ _papex_*.tex（生成片段）
 *   + references.bib + papex-template.tex + papex.cls
 */
export function buildArchiveFiles(
  m: PapexManifest,
  contents: Record<string, string>,
  assets: BuildAssets,
): ArchiveFile[] {
  const files: ArchiveFile[] = [];

  files.push({ name: "papex.json", content: JSON.stringify(m, null, 2) + "\n" });

  for (const s of m.sections ?? []) {
    const f = s.file || `sections/${(s.id ?? "sec")}.tex`;
    files.push({ name: f, content: contents[f] ?? "" });
  }
  for (const a of m.appendices ?? []) {
    const f = a.file || `sections/${(a.id ?? "app")}.tex`;
    files.push({ name: f, content: contents[f] ?? "" });
  }

  files.push({ name: "_papex_meta.tex", content: genMeta(m) });
  files.push({ name: "_papex_abstract.tex", content: genAbstract(m) });
  files.push({ name: "_papex_sections.tex", content: genSections(m) });
  files.push({ name: "_papex_backmatter.tex", content: genBackmatter(m) });
  files.push({ name: "_papex_appendices.tex", content: genAppendices(m) });

  const bib = genBib(m.references);
  if (bib) files.push({ name: "references.bib", content: bib });

  files.push({ name: "papex-template.tex", content: applyTemplateOptions(assets.templateTex, m.build) });
  files.push({ name: "papex.cls", content: assets.cls });

  return files;
}
