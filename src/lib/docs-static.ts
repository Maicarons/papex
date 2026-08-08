import { NextResponse } from "next/server";
import { join, sep } from "node:path";
import { readFile } from "node:fs/promises";

export const dynamic = "force-dynamic";

// Serve the statically built VitePress documentation (output in .docs-dist)
// through Next.js route handlers so that clean URLs (e.g. /docs/about,
// /docs/guide/getting-started, /docs/en/about) resolve correctly under Next.js
// static hosting. VitePress emits flat `.html` files; this maps clean paths
// onto them and also serves assets (css/js/fonts/images) with the right type.

const DOCS_ROOT = join(process.cwd(), ".docs-dist");

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function contentTypeFor(file: string): string {
  const ext = file.slice(file.lastIndexOf(".")).toLowerCase();
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

async function tryRead(file: string): Promise<Buffer | null> {
  try {
    return await readFile(file);
  } catch {
    return null;
  }
}

/** True only when `file` lives inside DOCS_ROOT (blocks `../` traversal). */
function isInsideDocs(file: string): boolean {
  return file === DOCS_ROOT || file.startsWith(DOCS_ROOT + sep);
}

/**
 * Resolve and serve a docs file for a clean URL path.
 * @param rel clean path without leading slash, e.g. "" (root), "about",
 *           "guide/getting-started", "en/about".
 */
export async function serveDocs(rel: string): Promise<NextResponse> {
  const clean = rel.split("/").filter(Boolean).join("/");
  const base = clean ? join(DOCS_ROOT, clean) : join(DOCS_ROOT, "index.html");
  const candidates = clean
    ? [base, `${base}.html`, join(base, "index.html")]
    : [join(DOCS_ROOT, "index.html")];

  for (const candidate of candidates) {
    if (!isInsideDocs(candidate)) continue;
    const data = await tryRead(candidate);
    if (data) {
      return new NextResponse(new Uint8Array(data), {
        status: 200,
        headers: {
          "Content-Type": contentTypeFor(candidate),
          "Cache-Control": "public, max-age=3600, must-revalidate",
        },
      });
    }
  }

  const notFound = await tryRead(join(DOCS_ROOT, "404.html"));
  if (notFound) {
    return new NextResponse(new Uint8Array(notFound), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  return new NextResponse("Not found", { status: 404 });
}
