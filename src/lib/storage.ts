import { promises as fs } from "fs";
import path from "path";

/**
 * Local filesystem storage for uploaded PDFs.
 *
 * On Vercel the server filesystem is read-only at runtime, so production should
 * set STORAGE_DRIVER=blob and swap this module for a Vercel Blob implementation.
 * The returned pdfUrl always points at our streaming route
 * `/api/papers/{id}/pdf/{version}` which reads the bytes back out.
 */

const ROOT = path.resolve(process.env.PAPEX_STORAGE_DIR ?? "./storage");

export function storageRoot(): string {
  return ROOT;
}

export async function savePdfBuffer(
  paperId: string,
  version: number,
  buffer: Buffer,
): Promise<{ storedPath: string; pdfUrl: string }> {
  const dir = path.join(ROOT, "papers", paperId);
  await fs.mkdir(dir, { recursive: true });
  const fileName = `v${version}.pdf`;
  await fs.writeFile(path.join(dir, fileName), buffer);
  return {
    storedPath: path.join(dir, fileName),
    pdfUrl: `/api/papers/${encodeURIComponent(paperId)}/pdf/${version}`,
  };
}

export function pdfFilePath(paperId: string, version: number): string {
  return path.join(ROOT, "papers", paperId, `v${version}.pdf`);
}

export async function readPdfBuffer(paperId: string, version: number): Promise<Buffer> {
  return fs.readFile(pdfFilePath(paperId, version));
}
