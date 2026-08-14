import { spawnSync } from "node:child_process";
import fs from "fs";
import path from "path";
import { storageDriver } from "./storage";
import { buildS3Config } from "./s3-client";

/**
 * Runtime capability detection (server-only).
 *
 * Used to gate feature entry points before the user can interact with them:
 *
 * - `pdfUpload`: whether PDFs can actually be stored. `local` driver needs a
 *   writable storage directory; `s3` driver needs a complete S3 configuration.
 *   When false, the submission form disables PDF upload.
 * - `latex`: whether the server has a working LaTeX toolchain (latexmk +
 *   XeLaTeX, configurable via `PAPEX_LATEX_BIN`). When false, the online
 *   authoring page and source-package submission are disabled with a
 *   "service unavailable" notice.
 *
 * Detection is cheap (no network, no heavy spawn) so it can run on every
 * server render of the gated pages.
 */
export interface Capabilities {
  pdfUpload: boolean;
  latex: boolean;
}

function checkPdfStorage(): boolean {
  if (storageDriver() === "s3") {
    try {
      buildS3Config();
      return true;
    } catch {
      return false;
    }
  }
  // Local driver: the directory must exist and be writable.
  const dir = path.resolve(process.env.PAPEX_STORAGE_DIR ?? "./storage");
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function checkLatex(): boolean {
  const bin = process.env.PAPEX_LATEX_BIN || "latexmk";
  try {
    const r = spawnSync(bin, ["--version"], { timeout: 5000, stdio: "ignore" });
    return r.error === undefined && r.status !== null && r.status === 0;
  } catch {
    return false;
  }
}

let cached: Capabilities | null = null;

export function detectCapabilities(): Capabilities {
  // Cache per process: detection results do not change at runtime, and
  // spawning latexmk on every render is wasteful.
  if (cached) return cached;
  cached = { pdfUpload: checkPdfStorage(), latex: checkLatex() };
  return cached;
}
