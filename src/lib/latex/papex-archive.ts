import { spawn, spawnSync } from "node:child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { db } from "@/lib/db";
import { paperVersions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { SessionPayload } from "@/lib/auth/session";
import { extractTarGz, writeEntries, type TarEntry } from "./tar";
import { coerceManifest, mapReferencesToCitations, mapToCreatePaperInput } from "./papex-json";
import { createSubmission } from "@/lib/services/papers";
import { addCitation } from "@/lib/services/citations";
import { savePdfBuffer } from "@/lib/storage";

export interface ProcessResult {
  paperId: string;
  version: number;
  warnings: string[];
  pdfUrl?: string;
}

export interface Owner {
  id: string;
  role: SessionPayload["role"];
}

/**
 * 处理一次 tar.gz 源码包提交：
 *   解包 -> 读取 papex.json -> 校验 -> 映射（分类/机构/版本）-> 建稿
 *   -> 连接引用图 -> 可选 XeLaTeX 构建并存储 PDF。
 *
 * LaTeX 构建依赖服务端 latexmk；若不可用，仅记录 warning，不影响建稿。
 * 所有临时文件在 finally 中清理。
 */
export async function processSubmissionArchive(
  buffer: Buffer,
  owner: Owner,
): Promise<ProcessResult> {
  const warnings: string[] = [];

  // 1. 解包
  let entries: TarEntry[];
  try {
    entries = extractTarGz(buffer);
  } catch (e) {
    throw new Error(`ARCHIVE_PARSE_FAILED:${(e as Error).message}`);
  }
  if (entries.length === 0) throw new Error("ARCHIVE_EMPTY");

  // 2. 定位清单
  const manifestEntry = entries.find(
    (e) => e.name === "papex.json" || e.name.endsWith("/papex.json"),
  );
  if (!manifestEntry) throw new Error("MANIFEST_MISSING");

  // 3. 解析 + 校验清单
  let raw: unknown;
  try {
    raw = JSON.parse(manifestEntry.data.toString("utf8"));
  } catch {
    throw new Error("MANIFEST_JSON_INVALID");
  }
  const coerced = coerceManifest(raw);
  if (!coerced.ok) throw new Error(`MANIFEST_INVALID:${coerced.errors.join("; ")}`);
  const manifest = coerced.value!;

  // 4. 解包到临时工作目录（供 LaTeX 构建）
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "papex-"));
  try {
    writeEntries(entries, workDir);

    // 5. 映射 + 校验（分类 / 机构 / 版本归属）
    const input = await mapToCreatePaperInput(manifest, owner);

    // 6. 建稿
    const { paperId, version } = await createSubmission(input, owner);

    // 7. 连接引用图
    for (const c of mapReferencesToCitations(manifest)) {
      try {
        await addCitation({ paperId, ...c, createdById: owner.id });
      } catch {
        warnings.push(
          `引用未解析: ${c.targetDoi ?? c.targetTitle ?? c.targetArxivId ?? "(未知)"}`,
        );
      }
    }

    // 8. 可选：XeLaTeX 构建并存储 PDF
    let pdfUrl: string | undefined;
    try {
      const built = await buildAndStorePdf(workDir, paperId, version);
      if (built) {
        pdfUrl = built;
        await db
          .update(paperVersions)
          .set({ pdfUrl })
          .where(and(eq(paperVersions.paperId, paperId), eq(paperVersions.version, version)));
      }
    } catch (e) {
      warnings.push(`PDF 构建跳过: ${(e as Error).message}`);
    }

    return { paperId, version, warnings, pdfUrl };
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

function hasLatexmk(bin: string): boolean {
  try {
    const r = spawnSync(bin, ["--version"], { timeout: 5000 });
    return r.error === undefined && r.status !== null;
  } catch {
    return false;
  }
}

async function buildAndStorePdf(
  workDir: string,
  paperId: string,
  version: number,
): Promise<string | undefined> {
  const latexmk = process.env.PAPEX_LATEX_BIN || "latexmk";
  const mainTex = path.join(workDir, "papex-template.tex");
  if (!fs.existsSync(mainTex)) {
    throw new Error("归档缺少 papex-template.tex，无法编译");
  }

  // 确保 papex.cls 可用：优先归档自带，否则从 PAPEX_LATEX_DIR 拷贝
  if (!fs.existsSync(path.join(workDir, "papex.cls"))) {
    const clsSrc = process.env.PAPEX_LATEX_DIR
      ? path.join(process.env.PAPEX_LATEX_DIR, "papex.cls")
      : null;
    if (clsSrc && fs.existsSync(clsSrc)) {
      fs.copyFileSync(clsSrc, path.join(workDir, "papex.cls"));
    } else {
      throw new Error("找不到 papex.cls（请设置环境变量 PAPEX_LATEX_DIR）");
    }
  }

  if (!hasLatexmk(latexmk)) {
    throw new Error("服务端未安装 latexmk / XeLaTeX");
  }

  const proc = spawn(
    latexmk,
    ["-xelatex", "-interaction=nonstopmode", "-halt-on-error", `-outdir=${workDir}`, "papex-template.tex"],
    { cwd: workDir, env: { ...process.env, SOURCE_DATE_EPOCH: "0" } },
  );

  const code = await new Promise<number>((resolve) => {
    proc.on("close", (c) => resolve(c ?? 1));
    proc.on("error", () => resolve(1));
  });
  if (code !== 0) throw new Error(`latexmk 编译失败（exit ${code}）`);

  const pdfPath = path.join(workDir, "papex-template.pdf");
  if (!fs.existsSync(pdfPath)) throw new Error("编译未产出 PDF");

  const { pdfUrl } = await savePdfBuffer(paperId, version, fs.readFileSync(pdfPath));
  return pdfUrl;
}
