import { and, eq, not, or, sql, type SQL } from "drizzle-orm";
import { paperVersions, papers, paperCategories } from "@/lib/db/schema";

/**
 * Advanced search compiler.
 *
 * Supports:
 *  - Boolean operators: AND, OR, NOT (also `-` as NOT prefix).
 *  - Parentheses for grouping.
 *  - Field scoping:  ti:/title:  abs:/abstract:  au:/author:  cat:/category:  id:
 *  - Free-text terms (implicit AND between adjacent terms).
 *
 * Multilingual strategy:
 *  - Latin text  -> PostgreSQL tsvector (`english` config) for relevance-ranked,
 *    stemmed matching.
 *  - CJK / Chinese text -> no word breaks, so we fall back to ILIKE against a
 *    `pg_trgm` trigram GIN index (paper_versions_trgm_idx). This gives correct
 *    substring / Chinese full-text behaviour without a zhparser extension.
 *  Both paths are OR-combined so a query works regardless of language.
 */

const CJK_RE = /[㐀-䶿一-鿿豈-﫿]/;

function hasCJK(s: string): boolean {
  return CJK_RE.test(s);
}

const FIELD_MAP: Record<string, "title" | "abstract" | "author" | "category" | "arxiv"> = {
  ti: "title",
  title: "title",
  abs: "abstract",
  abstract: "abstract",
  au: "author",
  author: "author",
  cat: "category",
  category: "category",
  id: "arxiv",
};

// ----------------------------- Tokenizer -----------------------------

type Token =
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "and" }
  | { type: "or" }
  | { type: "not" }
  | { type: "term"; value: string };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  // Split keeping quoted phrases, parens, and bare words intact.
  const re = /\s+|\(|\)|"[^"]*"|'[^']*'|[^\s()]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    const t = m[0];
    if (/^\s+$/.test(t)) continue;
    if (t === "(") tokens.push({ type: "lparen" });
    else if (t === ")") tokens.push({ type: "rparen" });
    else if (t.toLowerCase() === "and") tokens.push({ type: "and" });
    else if (t.toLowerCase() === "or") tokens.push({ type: "or" });
    else if (t === "-" || t.toLowerCase() === "not") tokens.push({ type: "not" });
    else tokens.push({ type: "term", value: t });
  }
  return tokens;
}

// ----------------------------- Parser (recursive descent) -----------------------------

type Node = {
  op: "and" | "or" | "not" | "leaf";
  children?: Node[];
  leaf?: { field?: "title" | "abstract" | "author" | "category" | "arxiv"; term: string };
};

function parse(tokens: Token[]): Node | null {
  let pos = 0;
  const peek = () => tokens[pos];

  function parseOr(): Node | null {
    let left = parseAnd();
    while (peek() && peek()!.type === "or") {
      pos++;
      const right = parseAnd();
      if (left && right) left = { op: "or", children: [left, right] };
      else if (right) left = right;
    }
    return left;
  }

  function parseAnd(): Node | null {
    let left = parseNot();
    while (
      peek() &&
      (peek()!.type === "and" || peek()!.type === "term" || peek()!.type === "lparen")
    ) {
      const right = parseNot();
      if (left && right) left = { op: "and", children: [left, right] };
      else if (right) left = right;
    }
    return left;
  }

  function parseNot(): Node | null {
    if (peek() && peek()!.type === "not") {
      pos++;
      const child = parseNot();
      return child ? { op: "not", children: [child] } : null;
    }
    return parsePrimary();
  }

  function parsePrimary(): Node | null {
    const tk = peek();
    if (!tk) return null;
    if (tk.type === "lparen") {
      pos++;
      const node = parseOr();
      if (peek() && peek()!.type === "rparen") pos++;
      return node;
    }
    if (tk.type === "term") {
      pos++;
      return parseTerm(tk.value);
    }
    // Stray operator — skip it.
    pos++;
    return null;
  }

  return parseOr();
}

function parseTerm(value: string): Node {
  let field: "title" | "abstract" | "author" | "category" | "arxiv" | undefined;
  let term = value;
  const colon = value.indexOf(":");
  if (colon > 0) {
    const f = value.slice(0, colon).toLowerCase();
    const mapped = FIELD_MAP[f];
    if (mapped) {
      field = mapped;
      term = value.slice(colon + 1);
    }
  }
  if (
    (term.startsWith('"') && term.endsWith('"')) ||
    (term.startsWith("'") && term.endsWith("'"))
  ) {
    term = term.slice(1, -1);
  }
  return { op: "leaf", leaf: { field, term } };
}

// ----------------------------- Compiler (AST -> drizzle SQL) -----------------------------

/** Build a tsquery string with prefix (`:*`) matching for fuzzy/sub-word hits. */
function tsQueryTerm(term: string): string {
  const words = [...term.toLowerCase().matchAll(/[\p{L}\p{N}]+/gu)].map((m) => m[0]).filter(Boolean);
  if (words.length === 0) return "";
  return words.map((w) => `${w}:*`).join(" & ");
}

function leafSql(leaf: NonNullable<Node["leaf"]>): SQL | null {
  const { field, term } = leaf;
  const t = term.trim();
  if (!t) return null;
  const cfg: "english" | "simple" = hasCJK(t) ? "simple" : "english";
  const q = tsQueryTerm(t);

  const ilikeTitle = sql`coalesce(${paperVersions.title}, '') ILIKE ${`%${t}%`}`;
  const ilikeAbstract = sql`coalesce(${paperVersions.abstract}, '') ILIKE ${`%${t}%`}`;
  const ilikeAuthors = sql`coalesce(${paperVersions.authorsJson}::text, '') ILIKE ${`%${t}%`}`;

  switch (field) {
    case "title": {
      const clauses: SQL[] = [ilikeTitle];
      if (q) {
        clauses.push(
          sql`to_tsvector(${cfg}, coalesce(${paperVersions.title}, '')) @@ to_tsquery(${cfg}, ${q})`,
        );
      }
      return or(...clauses) ?? null;
    }
    case "abstract": {
      const clauses: SQL[] = [ilikeAbstract];
      if (q) {
        clauses.push(
          sql`to_tsvector(${cfg}, coalesce(${paperVersions.abstract}, '')) @@ to_tsquery(${cfg}, ${q})`,
        );
      }
      return or(...clauses) ?? null;
    }
    case "author":
      return ilikeAuthors;
    case "category":
      return (
        or(
          eq(papers.primaryCategoryId, t),
          sql`exists (select 1 from ${paperCategories} pc where pc.paper_id = ${papers.id} and pc.category_id = ${t})`,
        ) ?? null
      );
    case "arxiv": {
      const id = t.replace(/^arxiv:/i, "").trim();
      return sql`${papers.id} = ${id}`;
    }
    default: {
      const clauses: SQL[] = [ilikeTitle, ilikeAbstract, ilikeAuthors];
      if (q) {
        clauses.push(
          sql`to_tsvector(${cfg}, coalesce(${paperVersions.title}, '') || ' ' || coalesce(${paperVersions.abstract}, '') || ' ' || coalesce(${paperVersions.authorsJson}::text, '')) @@ to_tsquery(${cfg}, ${q})`,
        );
      }
      return or(...clauses) ?? null;
    }
  }
}

function compileNode(node: Node | null): SQL | null {
  if (!node) return null;
  if (node.op === "leaf") return leafSql(node.leaf!);
  if (node.op === "not") {
    const c = compileNode(node.children?.[0] ?? null);
    return c ? not(c) : null;
  }
  const parts = (node.children ?? [])
    .map((c) => compileNode(c))
    .filter((x): x is SQL => x !== null);
  if (parts.length === 0) return null;
  return node.op === "and" ? (and(...parts) ?? null) : (or(...parts) ?? null);
}

/**
 * Compile a raw search string into a drizzle SQL condition.
 * Returns `null` when the query is empty or produces no usable predicate.
 */
export function compileSearch(input: string): SQL | null {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return null;
  const tokens = tokenize(trimmed);
  if (tokens.length === 0) return null;
  const ast = parse(tokens);
  return compileNode(ast);
}

export { hasCJK };
