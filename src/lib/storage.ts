import { promises as fs } from "fs";
import path from "path";
import {
  buildPresignedGetUrl,
  buildS3Config,
  deleteObject,
  getObject,
  putObject,
  type S3Config,
} from "./s3-client";

/**
 * PDF storage with two backends, selected by `STORAGE_DRIVER`:
 *
 * - `local` (default): files live on the server filesystem under
 *   `PAPEX_STORAGE_DIR` (works for Docker / self-hosted / dev). Bytes are
 *   streamed back by the route `/api/papers/{id}/pdf/{version}`.
 * - `s3`: files are uploaded to an S3-compatible object store
 *   (AWS S3, MinIO, Cloudflare R2, DigitalOcean Spaces). The route issues a
 *   302 redirect to a presigned (or public) URL, so the PDF never passes
 *   through the server — important on read-only/serverless platforms like Vercel.
 *
 * Regardless of backend, `pdfUrl` stored on the row is always the streaming
 * route, keeping access centralized and backend-agnostic.
 */

export type StorageDriver = "local" | "s3";

export function storageDriver(): StorageDriver {
  const d = (process.env.STORAGE_DRIVER ?? "local").toLowerCase();
  // Legacy "blob" alias maps to local for backwards compatibility.
  if (d === "s3") return "s3";
  return "local";
}

const ROOT = path.resolve(process.env.PAPEX_STORAGE_DIR ?? "./storage");

export function storageRoot(): string {
  return ROOT;
}

export interface SavedPdf {
  storedPath: string;
  pdfUrl: string;
}

function routeUrl(paperId: string, version: number): string {
  return `/api/papers/${encodeURIComponent(paperId)}/pdf/${version}`;
}

function objectKey(paperId: string, version: number): string {
  return `papers/${paperId}/v${version}.pdf`;
}

export async function savePdfBuffer(
  paperId: string,
  version: number,
  buffer: Buffer,
): Promise<SavedPdf> {
  if (storageDriver() === "s3") {
    const key = objectKey(paperId, version);
    const cfg: S3Config = buildS3Config();
    await putObject(cfg, key, buffer, "application/pdf");
    return { storedPath: key, pdfUrl: routeUrl(paperId, version) };
  }

  const dir = path.join(ROOT, "papers", paperId);
  await fs.mkdir(dir, { recursive: true });
  const fileName = `v${version}.pdf`;
  await fs.writeFile(path.join(dir, fileName), buffer);
  return { storedPath: path.join(dir, fileName), pdfUrl: routeUrl(paperId, version) };
}

export async function readPdfBuffer(paperId: string, version: number): Promise<Buffer> {
  if (storageDriver() === "s3") {
    return getObject(buildS3Config(), objectKey(paperId, version));
  }
  return fs.readFile(pdfFilePath(paperId, version));
}

/** Returns a presigned (or public) GET URL for S3, or null for local. */
export async function presignPdfUrl(
  paperId: string,
  version: number,
  expiresInSec = 300,
): Promise<string | null> {
  if (storageDriver() !== "s3") return null;
  const key = objectKey(paperId, version);
  const publicBase = process.env.PAPEX_S3_PUBLIC_BASE?.replace(/\/+$/, "");
  if (publicBase) return `${publicBase}/${key}`;
  return buildPresignedGetUrl(buildS3Config(), key, expiresInSec);
}

export async function deletePdf(paperId: string, version: number): Promise<void> {
  if (storageDriver() !== "s3") return;
  await deleteObject(buildS3Config(), objectKey(paperId, version));
}

export function pdfFilePath(paperId: string, version: number): string {
  return path.join(ROOT, "papers", paperId, `v${version}.pdf`);
}
