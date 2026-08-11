import { describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { compileSearch, hasCJK, tokenize, parse } from "@/lib/search";

const dialect = new PgDialect();

/** Render a compiled search condition to a SQL string for assertions. */
function compileToSql(input: string): string {
  const condition = compileSearch(input);
  if (!condition) return "";
  return dialect.sqlToQuery(sql`select 1 where ${condition}`).sql;
}

describe("hasCJK", () => {
  it("detects Chinese characters", () => {
    expect(hasCJK("深度学习")).toBe(true);
    expect(hasCJK("transformer")).toBe(false);
    expect(hasCJK("混合 hybrid 模型")).toBe(true);
  });
});

describe("tokenize", () => {
  it("splits bare words and operators", () => {
    const t = tokenize("cat:cs learning");
    // "cat:cs" is a single term token, "learning" another; no AND/OR tokens.
    expect(t).toHaveLength(2);
    expect(t[0]).toEqual({ type: "term", value: "cat:cs" });
    expect(t[1]).toEqual({ type: "term", value: "learning" });
  });

  it("recognizes AND/OR/NOT and parens", () => {
    const types = tokenize("(a OR b) AND NOT c").map((x) => x.type);
    expect(types).toEqual(["lparen", "term", "or", "term", "rparen", "and", "not", "term"]);
  });

  it("treats hyphen as NOT prefix", () => {
    const t = tokenize("ml -survey");
    expect(t[1]).toEqual({ type: "not" });
  });

  it("keeps quoted phrases intact", () => {
    const t = tokenize('"large language model"');
    expect(t).toHaveLength(1);
    expect(t[0]).toEqual({ type: "term", value: '"large language model"' });
  });
});

describe("parse — field scoping", () => {
  it("maps field prefixes to canonical fields", () => {
    const ast = parse(tokenize("ti:attention"));
    expect(ast?.op).toBe("leaf");
    expect(ast?.leaf?.field).toBe("title");
    expect(ast?.leaf?.term).toBe("attention");
  });

  it("supports both long and short field aliases", () => {
    expect(parse(tokenize("title:x"))?.leaf?.field).toBe("title");
    expect(parse(tokenize("abs:y"))?.leaf?.field).toBe("abstract");
    expect(parse(tokenize("author:z"))?.leaf?.field).toBe("author");
    expect(parse(tokenize("category:w"))?.leaf?.field).toBe("category");
    expect(parse(tokenize("id:1234.56789"))?.leaf?.field).toBe("arxiv");
  });

  it("strips surrounding quotes from the term", () => {
    const ast = parse(tokenize('ti:"deep net"'));
    expect(ast?.leaf?.term).toBe("deep net");
  });
});

describe("parse — boolean structure", () => {
  it("builds an OR node", () => {
    const ast = parse(tokenize("a OR b"));
    expect(ast?.op).toBe("or");
    expect(ast?.children).toHaveLength(2);
  });

  it("builds an AND node from adjacent terms", () => {
    const ast = parse(tokenize("a b"));
    expect(ast?.op).toBe("and");
    expect(ast?.children).toHaveLength(2);
  });

  it("builds a NOT node", () => {
    const ast = parse(tokenize("NOT a"));
    expect(ast?.op).toBe("not");
  });

  it("respects parentheses grouping", () => {
    const ast = parse(tokenize("a AND (b OR c)"));
    // top level is AND(a, OR(b,c))
    expect(ast?.op).toBe("and");
    const right = ast?.children?.[1];
    expect(right?.op).toBe("or");
    expect(right?.children).toHaveLength(2);
  });
});

describe("compileSearch", () => {
  it("returns null for empty input", () => {
    expect(compileSearch("")).toBeNull();
    expect(compileSearch("   ")).toBeNull();
  });

  it("returns SQL for a simple free-text query", () => {
    const out = compileToSql("transformer");
    expect(out).not.toBe("");
    expect(out).toContain("ILIKE");
  });

  it("returns SQL for a field-scoped query", () => {
    const out = compileToSql("cat:cs");
    expect(out).not.toBe("");
    // The category condition targets the papers primary-category column.
    expect(out).toContain("primary_category_id");
  });

  it("returns null when only stray operators are present", () => {
    // "AND" alone cannot form a leaf, so compile should yield nothing usable.
    const sql = compileSearch("AND OR");
    // tokenize yields operators only; parse returns null → compile returns null.
    expect(sql).toBeNull();
  });
});
