/**
 * Papex 在线创作 —— 浏览器端 tar.gz 构建器（零依赖）
 *
 * 手写 POSIX ustar 打包（含 prefix 长名处理与校验和），再用浏览器原生
 * CompressionStream('gzip') 压缩。无需任何第三方库，也不依赖 Node API。
 */

import type { ArchiveFile } from "./latex-gen";

function strToU8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

// TS 5.7+ 将 Uint8Array 泛化为 Uint8Array<ArrayBufferLike>，与 DOM 的
// BlobPart（要求确切的 ArrayBufferView）存在类型差异，此处收敛为 BlobPart。
function blobPart(u: Uint8Array): BlobPart {
  return u as unknown as BlobPart;
}

/** 写入一个八进制数值字段（fieldWidth 字节：digits + NUL，其余补零）。 */
function writeOctal(header: Uint8Array, value: number, offset: number, fieldWidth: number): void {
  const digits = Math.max(0, Math.floor(value)).toString(8);
  const padded = digits.padStart(fieldWidth - 1, "0");
  for (let i = 0; i < padded.length; i++) {
    header[offset + i] = padded.charCodeAt(i);
  }
  header[offset + padded.length] = 0; // NUL 终止
}

function makeHeader(name: string, size: number): Uint8Array {
  const header = new Uint8Array(512);
  const enc = new TextEncoder();

  let nameField = name;
  let prefixField = "";
  // 名称超过 100 字节时，按最后一个 '/' 拆分到 prefix（ustar 扩展）。
  if (name.length > 100) {
    const idx = name.lastIndexOf("/");
    if (idx > 0 && idx <= 155) {
      prefixField = name.slice(0, idx);
      nameField = name.slice(idx + 1);
    }
  }
  enc.encodeInto(nameField, header.subarray(0, 100));

  writeOctal(header, 0o644, 100, 8); // mode
  writeOctal(header, 0, 108, 8); // uid
  writeOctal(header, 0, 116, 8); // gid
  writeOctal(header, size, 124, 12); // size
  writeOctal(header, 0, 136, 12); // mtime

  // chksum 字段先填 8 个空格
  for (let i = 148; i < 156; i++) header[i] = 0x20;
  header[156] = 0x30; // typeflag '0'：普通文件

  // magic + version
  enc.encodeInto("ustar", header.subarray(257, 263));
  header[263] = 0x30; // '0'
  header[264] = 0x30; // '0'

  if (prefixField) enc.encodeInto(prefixField, header.subarray(345, 345 + 155));

  // 校验和：所有字节之和（chksum 区视为空格），6 位八进制 + NUL + 空格
  let sum = 0;
  for (let i = 0; i < 512; i++) sum += header[i];
  const ds = sum.toString(8).padStart(6, "0");
  for (let i = 0; i < ds.length; i++) header[148 + i] = ds.charCodeAt(i);
  header[154] = 0; // NUL
  header[155] = 0x20; // 空格

  return header;
}

async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream === "undefined") {
    throw new Error(
      "当前环境不支持 CompressionStream（请使用现代浏览器，并通过 https 或 localhost 访问）。",
    );
  }
  const stream = new Blob([blobPart(bytes)])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).bytes());
}

/** 将若干文本文件打包为 .tar.gz 的 Blob。 */
export async function createTarGz(files: ArchiveFile[]): Promise<Blob> {
  const chunks: Uint8Array[] = [];
  const push = (arr: Uint8Array) => {
    if (arr.length) chunks.push(arr);
  };

  for (const f of files) {
    const data = strToU8(f.content);
    push(makeHeader(f.name, data.length));
    push(data);
    const pad = (512 - (data.length % 512)) % 512;
    if (pad) push(new Uint8Array(pad));
  }
  // 归档结束：两个全零块
  push(new Uint8Array(1024));

  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }

  const gz = await gzip(out);
  return new Blob([blobPart(gz)], { type: "application/gzip" });
}
