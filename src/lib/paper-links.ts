/**
 * Paper ↔ code / dataset / website links (P1-D, Papers With Code style).
 *
 * Pure helpers: URL validation + GitHub repository detection. Kept dependency-
 * free so the route logic stays unit-testable. Only metadata links are stored —
 * no content is fetched or mirrored (copyright-safe: we link, we don't ingest).
 */

export const LINK_KINDS = ["repository", "dataset", "website"] as const;
export type LinkKind = (typeof LINK_KINDS)[number];

export interface NormalizedLink {
  url: string;
  kind: LinkKind;
  title: string | null;
}

/** Validate an http(s) URL and return it trimmed, or null when invalid. */
export function normalizeUrl(raw: string): string | null {
  const url = (raw ?? "").trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Infer a short display title for well-known hosts (GitHub repos, etc.). */
export function inferLinkTitle(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "github.com" || parsed.hostname.endsWith(".github.com")) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      // github.com/{owner}/{repo}[/...]
      if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
    }
  } catch {
    /* unparseable → caller falls back to raw URL */
  }
  return null;
}

/**
 * Normalize a link input: validate the URL, coerce the kind, and auto-fill the
 * title when absent. Returns null when the input is unusable.
 */
export function normalizeLink(input: {
  url?: unknown;
  kind?: unknown;
  title?: unknown;
}): NormalizedLink | null {
  const url = normalizeUrl(typeof input.url === "string" ? input.url : "");
  if (!url) return null;
  const kind: LinkKind =
    typeof input.kind === "string" && (LINK_KINDS as readonly string[]).includes(input.kind)
      ? (input.kind as LinkKind)
      : "website";
  const title =
    typeof input.title === "string" && input.title.trim()
      ? input.title.trim().slice(0, 200)
      : inferLinkTitle(url);
  return { url, kind, title };
}
