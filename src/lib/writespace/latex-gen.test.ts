import { describe, it, expect } from "vitest";
import {
  latexEscape,
  bibtexEscape,
  genMeta,
  genAbstract,
  genBib,
  applyTemplateOptions,
  buildArchiveFiles,
} from "@/lib/writespace/latex-gen";
import type { PapexManifest } from "@/lib/writespace/manifest";

describe("latexEscape — single-pass, no double escaping", () => {
  it("escapes core LaTeX specials", () => {
    expect(latexEscape("a&b%c#d_e{f}g^h~i")).toBe(
      "a\\&b\\%c\\#d\\_e\\{f\\}g\\textasciicircum{}h\\textasciitilde{}i",
    );
  });

  it("does NOT double-escape an already-escaped backslash", () => {
    // A single backslash maps to \textbackslash{} exactly once. The historical
    // double-escape bug re-scanned the replacement text and produced
    // \textbackslash\{\} (escaping the braces inside the inserted macro).
    const out = latexEscape("\\");
    expect(out).toBe("\\textbackslash{}");
    expect(out).not.toContain("\\textbackslash\\{\\}");
    // Two backslashes must each be escaped exactly once, not re-scanned.
    expect(latexEscape("\\\\")).toBe("\\textbackslash{}\\textbackslash{}");
  });

  it("handles null/undefined as empty string", () => {
    expect(latexEscape(null)).toBe("");
    expect(latexEscape(undefined)).toBe("");
  });
});

describe("bibtexEscape", () => {
  it("escapes braces and specials", () => {
    expect(bibtexEscape("Author & Co. {note}")).toBe("Author \\& Co. \\{note\\}");
  });
});

describe("genMeta", () => {
  const manifest: PapexManifest = {
    paper: {
      title: "A & B 研究",
      id: "2608.00001",
      license: "CC-BY-4.0",
      primaryCategoryId: "cs.LG",
      keywords: ["ML", "NLP"],
      abstract: "abstract text",
    },
    authors: [
      { name: "Alice", affiliation: "Uni X", corresponding: true, email: "a@x.edu", order: 0 },
      { name: "Bob", affiliation: "Uni X", order: 1 },
    ],
    sections: [],
  };

  it("escapes the title and emits a paper id", () => {
    const tex = genMeta(manifest);
    expect(tex).toContain("\\title{A \\& B 研究}");
    expect(tex).toContain("\\papexPaperId{2608.00001}");
  });

  it("merges corresponding-author footnote into a single \\author", () => {
    const tex = genMeta(manifest);
    const authorLines = tex.split("\n").filter((l) => l.startsWith("\\author"));
    // One \\author per author (no duplicated authors from footnotes).
    expect(authorLines).toHaveLength(2);
    expect(authorLines[0]).toContain("通讯作者");
    expect(authorLines[0]).toContain("a@x.edu");
  });

  it("emits an affiliation marker once per unique affiliation", () => {
    const tex = genMeta(manifest);
    const affilLines = tex.split("\n").filter((l) => l.startsWith("\\affil"));
    expect(affilLines).toHaveLength(1);
    expect(affilLines[0]).toContain("Uni X");
  });
});

describe("genAbstract", () => {
  it("escapes the abstract body", () => {
    const tex = genAbstract({ paper: { title: "t", abstract: "100% done & tested" } } as PapexManifest);
    expect(tex).toContain("100\\% done \\& tested");
  });
});

describe("genBib", () => {
  it("returns null when there are no references", () => {
    expect(genBib([])).toBeNull();
    expect(genBib(undefined)).toBeNull();
  });

  it("maps reference types and escapes fields", () => {
    const bib = genBib([
      {
        key: "smith2024",
        type: "article",
        title: "On Things & Stuff",
        author: "Smith, J.",
        year: 2024,
        doi: "10.1/abc",
      },
    ]);
    expect(bib).toContain("@article{smith2024,");
    expect(bib).toContain("title = {On Things \\& Stuff},");
    expect(bib).toContain("year = {2024},");
    expect(bib).toContain("doi = {10.1/abc},");
  });

  it("skips empty fields", () => {
    const bib = genBib([{ key: "x", type: "misc", title: "T" }]);
    expect(bib).not.toContain("year =");
  });
});

describe("applyTemplateOptions", () => {
  it("injects bibstyle and twocolumn options", () => {
    const out = applyTemplateOptions("\\documentclass[11pt]{papex}", {
      bibStyle: "authoryear",
      columns: 2,
    });
    expect(out).toContain("[11pt,bibstyle=authoryear,twocolumn]");
  });

  it("leaves the default when no build options", () => {
    const out = applyTemplateOptions("\\documentclass[11pt]{papex}");
    expect(out).toBe("\\documentclass[11pt]{papex}");
  });
});

describe("buildArchiveFiles", () => {
  const manifest: PapexManifest = {
    paper: { title: "T", abstract: "A", primaryCategoryId: "cs" },
    authors: [{ name: "A" }],
    sections: [{ id: "s1", title: "Intro", level: "section", file: "sections/s1.tex" }],
    build: { bibStyle: "authoryear" },
  };

  it("assembles a self-contained archive file list", () => {
    const files = buildArchiveFiles(manifest, { "sections/s1.tex": "body" }, {
      templateTex: "\\documentclass[11pt]{papex}",
      cls: "cls-body",
    });
    const names = files.map((f) => f.name);
    expect(names).toContain("papex.json");
    expect(names).toContain("papex-template.tex");
    expect(names).toContain("papex.cls");
    expect(names).toContain("_papex_meta.tex");
    expect(names).toContain("sections/s1.tex");
    const template = files.find((f) => f.name === "papex-template.tex");
    expect(template?.content).toContain("bibstyle=authoryear");
  });
});
