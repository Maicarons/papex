import { describe, it, expect } from "vitest";
import {
  mapCrossrefAuthors,
  normalizeCrossref,
  normalizeArxiv,
  normalizeSemanticScholar,
  parseIdentifierFromUrl,
} from "@/lib/services/import";

// ---------------------------------------------------------------------------
// Crossref mappers
// ---------------------------------------------------------------------------

describe("mapCrossrefAuthors", () => {
  it("flattens given+family into { name, order }", () => {
    const out = mapCrossrefAuthors([
      { given: "Yann", family: "LeCun" },
      { given: "Geoffrey", family: "Hinton" },
    ]);
    expect(out).toEqual([
      { name: "Yann LeCun", order: 0 },
      { name: "Geoffrey Hinton", order: 1 },
    ]);
  });

  it("falls back to the name field when present", () => {
    expect(mapCrossrefAuthors([{ name: "A B C" }])).toEqual([
      { name: "A B C", order: 0 },
    ]);
  });

  it("drops authors with no usable name and skips non-arrays", () => {
    expect(mapCrossrefAuthors([{ given: "", family: "" }, null])).toEqual([]);
    expect(mapCrossrefAuthors("not-an-array")).toEqual([]);
  });
});

describe("normalizeCrossref", () => {
  const message = {
    title: ["Attention Is All You Need"],
    abstract: "We propose a new simple network architecture...",
    DOI: "10.5555/1234567890",
    URL: "https://example.org/paper",
    published: [{ year: 2017 }],
    author: [
      { given: "Ashish", family: "Vaswani" },
      { name: "Noam Shazeer" },
    ],
    reference: [
      { DOI: "10.1/ref1", "article-title": "Earlier Work" },
      { unstructured: "Some conference paper, 2015" },
      {}, // empty -> filtered
    ],
  };

  it("extracts core metadata", () => {
    const m = normalizeCrossref(message);
    expect(m.title).toBe("Attention Is All You Need");
    expect(m.abstract).toBe("We propose a new simple network architecture...");
    expect(m.doi).toBe("10.5555/1234567890");
    expect(m.sourceUrl).toBe("https://example.org/paper");
    expect(m.publishedYear).toBe(2017);
  });

  it("builds author list with order indices", () => {
    const m = normalizeCrossref(message);
    expect(m.authors).toEqual([
      { name: "Ashish Vaswani", order: 0 },
      { name: "Noam Shazeer", order: 1 },
    ]);
  });

  it("preserves references that have a doi/title/unstructured", () => {
    const m = normalizeCrossref(message);
    expect(m.references).toHaveLength(2);
    expect(m.references[0]).toMatchObject({ doi: "10.1/ref1", title: "Earlier Work" });
  });

  it("derives a doi.org url when only DOI is present", () => {
    const m = normalizeCrossref({ title: ["X"], DOI: "10.2/x" });
    expect(m.sourceUrl).toBe("https://doi.org/10.2/x");
  });

  it("returns Untitled + empty arrays for malformed input", () => {
    const m = normalizeCrossref(undefined);
    expect(m.title).toBe("Untitled");
    expect(m.authors).toEqual([]);
    expect(m.references).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// arXiv Atom mappers
// ---------------------------------------------------------------------------

const ARXIV_ATOM = `
<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2310.12345v2</id>
    <title>  Deep Learning for Fun  </title>
    <summary>  We study deep nets.  </summary>
    <published>2023-10-19T00:00:00Z</published>
    <author><name>Alice Alpha</name></author>
    <author><name>Bob Beta</name></author>
    <primary_category term="cs.LG" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.AI" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.LG" scheme="http://arxiv.org/schemas/atom"/>
    <link rel="alternate" href="http://arxiv.org/abs/2310.12345v2"/>
    <link title="pdf" href="http://arxiv.org/pdf/2310.12345v2"/>
  </entry>
</feed>`;

describe("normalizeArxiv", () => {
  it("extracts id, title, abstract, year, authors, categories, pdf", () => {
    const m = normalizeArxiv(ARXIV_ATOM);
    expect(m.arxivId).toBe("2310.12345");
    expect(m.title).toBe("Deep Learning for Fun");
    expect(m.abstract).toBe("We study deep nets.");
    expect(m.publishedYear).toBe(2023);
    expect(m.authors).toEqual([
      { name: "Alice Alpha", order: 0 },
      { name: "Bob Beta", order: 1 },
    ]);
    // primary first, then unique categories
    expect(m.categories).toEqual(["cs.LG", "cs.AI"]);
    expect(m.pdfUrl).toBe("http://arxiv.org/pdf/2310.12345v2");
    expect(m.sourceUrl).toBe("http://arxiv.org/abs/2310.12345v2");
  });

  it("handles a bare entry fragment without a wrapper", () => {
    const frag = `<entry><id>http://arxiv.org/abs/2401.00099</id><title>T</title></entry>`;
    const m = normalizeArxiv(frag);
    expect(m.arxivId).toBe("2401.00099");
  });
});

// ---------------------------------------------------------------------------
// Semantic Scholar mappers
// ---------------------------------------------------------------------------

describe("normalizeSemanticScholar", () => {
  const paper = {
    title: "A Great Paper",
    abstract: "Abstract text.",
    externalIds: { DOI: "10.9/s2", ArXiv: "2402.11111" },
    year: 2024,
    authors: [{ name: "Carol" }, { name: "" }, { name: "Dave" }],
    references: [
      {
        citedPaper: {
          title: "Ref One",
          externalIds: { DOI: "10.9/r1", ArXiv: "2402.22222" },
        },
      },
      { title: "Ref Two" }, // no external ids -> still kept by title
      { citedPaper: {} }, // no title/ids -> filtered
    ],
  };

  it("maps title/abstract/ids/year", () => {
    const m = normalizeSemanticScholar(paper);
    expect(m.title).toBe("A Great Paper");
    expect(m.abstract).toBe("Abstract text.");
    expect(m.doi).toBe("10.9/s2");
    expect(m.arxivId).toBe("2402.11111");
    expect(m.publishedYear).toBe(2024);
  });

  it("drops authors with empty names but preserves original order indices", () => {
    const m = normalizeSemanticScholar(paper);
    // "Dave" was at original index 2; order keeps the source position (consistent
    // with mapCrossrefAuthors / normalizeArxiv), so it stays 2 after filtering.
    expect(m.authors).toEqual([
      { name: "Carol", order: 0 },
      { name: "Dave", order: 2 },
    ]);
  });

  it("extracts references from citedPaper and filters empties", () => {
    const m = normalizeSemanticScholar(paper);
    expect(m.references).toEqual([
      { doi: "10.9/r1", arxivId: "2402.22222", title: "Ref One" },
      { doi: undefined, arxivId: undefined, title: "Ref Two" },
    ]);
  });

  it("falls back to ambiguous arxivId field", () => {
    const m = normalizeSemanticScholar({ title: "t", arxivId: "2403.1" });
    expect(m.arxivId).toBe("2403.1");
  });
});

// ---------------------------------------------------------------------------
// URL identifier parsing
// ---------------------------------------------------------------------------

describe("parseIdentifierFromUrl", () => {
  it("extracts DOI from a doi.org / bare DOI url", () => {
    expect(parseIdentifierFromUrl("https://doi.org/10.1145/3292500.3330701")).toEqual({
      doi: "10.1145/3292500.3330701",
    });
    expect(parseIdentifierFromUrl("https://example.org/x/10.1038/s41586-020-2649-2")).toEqual({
      doi: "10.1038/s41586-020-2649-2",
    });
  });

  it("extracts arXiv id from abs/pdf urls (any version suffix)", () => {
    expect(parseIdentifierFromUrl("https://arxiv.org/abs/2310.12345v3")).toEqual({
      arxivId: "2310.12345",
    });
    expect(parseIdentifierFromUrl("https://arxiv.org/pdf/2401.00099")).toEqual({
      arxivId: "2401.00099",
    });
  });

  it("returns empty object for unrecognized urls", () => {
    expect(parseIdentifierFromUrl("https://example.org/random")).toEqual({});
  });
});
