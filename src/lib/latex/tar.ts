import { gunzipSync } from "node:zlib";
import fs from "fs";
import path from "path";

/**
 * 零依赖 tar.gz 解包工具。
 *
 * - gzip 解压使用 Node 内置 zlib。
 * - tar 解析手写，支持 ustar（含 prefix 拼接）、GNU 长名（'L'）与 PAX 扩展头（'x'），
 *   足以覆盖 `tar -czf` / Python tarfile 默认产出的归档。
 * - writeEntries 带路径穿越防护（防 ../ 攻击）。
 */

export interface TarEntry {
  name: string;
  data: Buffer;
  mode: number;
  type: "file" | "dir" | "symlink" | "other";
  linkname?: string;
}

function readString(buf: Buffer, off: number, len: number): string {
  let end = off;
  const max = off + len;
  while (end < max && buf[end] !== 0) end++;
  return buf.toString("utf8", off, end);
}

function readOctal(buf: Buffer, off: number, len: number): number {
  // GNU base-256 编码：首字节最高位为 1
  if (buf[off] & 0x80) {
    let val = 0;
    for (let i = 0; i < len; i++) val = val * 256 + (buf[off + i] & 0x7f);
    return val;
  }
  const s = readString(buf, off, len).trim();
  if (!s) return 0;
  const n = parseInt(s, 8);
  return Number.isNaN(n) ? 0 : n;
}

export function gunzip(buffer: Buffer): Buffer {
  return gunzipSync(buffer);
}

export function parseTar(buffer: Buffer): TarEntry[] {
  const entries: TarEntry[] = [];
  const BLOCK = 512;
  let offset = 0;
  let longName: string | null = null;

  while (offset + BLOCK <= buffer.length) {
    const header = buffer.subarray(offset, offset + BLOCK);
    // 全零块 => 归档结束
    if (header.every((b) => b === 0)) break;

    const name = readString(header, 0, 100).replace(/^\.\//, "");
    const size = readOctal(header, 124, 12);
    const typeflag = String.fromCharCode(header[156] || 0);
    const linkname = readString(header, 157, 100);
    const magic = header.toString("ascii", 257, 263);
    const prefix = readString(header, 345, 155);

    offset += BLOCK;
    const dataLen = Math.ceil(size / BLOCK) * BLOCK;
    const data = buffer.subarray(offset, offset + size);
    offset += dataLen;

    let fullName = (magic.startsWith("ustar") && prefix ? `${prefix}/${name}` : name).replace(/^\.\//, "");

    if (typeflag === "L") {
      // GNU 长文件名：数据块即真实文件名
      longName = data.toString("utf8").replace(/\0+$/, "");
      continue;
    }
    if (typeflag === "K") {
      continue; // GNU 长链接名（罕见，忽略）
    }
    if (typeflag === "x" || typeflag === "g") {
      // PAX 扩展头：解析 path= 覆盖后续文件名
      const pax = data.toString("utf8");
      const m = pax.match(/(\d+) path=([^\n]+)\n/);
      if (m) longName = m[2];
      continue;
    }
    if (longName) {
      fullName = longName;
      longName = null;
    }

    let type: TarEntry["type"] = "other";
    if (typeflag === "0" || typeflag === "\0") type = "file";
    else if (typeflag === "5") type = "dir";
    else if (typeflag === "2") type = "symlink";

    entries.push({
      name: fullName,
      data: Buffer.from(data),
      mode: readOctal(header, 100, 8),
      type,
      linkname: linkname || undefined,
    });
  }
  return entries;
}

export function extractTarGz(buffer: Buffer): TarEntry[] {
  return parseTar(gunzip(buffer));
}

export function writeEntries(entries: TarEntry[], destDir: string): void {
  const safeRoot = path.resolve(destDir);
  fs.mkdirSync(safeRoot, { recursive: true });
  for (const e of entries) {
    const target = path.resolve(safeRoot, e.name);
    const rel = path.relative(safeRoot, target);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      throw new Error(`非法路径（疑似路径穿越）: ${e.name}`);
    }
    if (e.type === "dir") {
      fs.mkdirSync(target, { recursive: true });
      continue;
    }
    if (e.type === "symlink") continue; // 不跟随符号链接
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, e.data);
  }
}
