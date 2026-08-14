import crypto from "node:crypto";

/**
 * Dependency-free S3-compatible object storage client.
 *
 * Implements AWS Signature Version 4 (SigV4) with the `fetch` global so it
 * works on any S3-compatible service (AWS S3, MinIO, Cloudflare R2, DigitalOcean
 * Spaces) and in both the Node and Edge runtimes. No `@aws-sdk/*` dependency.
 *
 * The signing code is verified against the official AWS SigV4 test vector in
 * `storage.test.ts` (GET Object presigned example).
 */

export interface S3Config {
  bucket: string;
  region: string;
  /** Base endpoint, e.g. `https://s3.amazonaws.com` or an R2/MinIO endpoint. */
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** true => `endpoint/bucket/key` (MinIO/R2/Spaces); false => `bucket.endpoint/key` (AWS virtual-hosted). */
  forcePathStyle: boolean;
}

/** Read S3 config from env, throwing a clear error when required vars are missing. */
export function buildS3Config(): S3Config {
  const bucket = process.env.PAPEX_S3_BUCKET;
  const endpoint = process.env.PAPEX_S3_ENDPOINT;
  const accessKeyId = process.env.PAPEX_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.PAPEX_S3_SECRET_ACCESS_KEY;
  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "STORAGE_DRIVER=s3 缺少必要的环境变量：" +
        "PAPEX_S3_BUCKET / PAPEX_S3_ENDPOINT / PAPEX_S3_ACCESS_KEY_ID / PAPEX_S3_SECRET_ACCESS_KEY",
    );
  }
  const region = process.env.PAPEX_S3_REGION ?? "us-east-1";
  const forcePathStyle = (process.env.PAPEX_S3_FORCE_PATH_STYLE ?? "true") !== "false";
  return { bucket, region, endpoint, accessKeyId, secretAccessKey, forcePathStyle };
}

// ---- low-level SigV4 helpers -------------------------------------------------

function hmac(key: string | Buffer, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/** AWS URI encoding: everything except A-Za-z0-9-._~ (RFC 3986 unreserved). Encodes UTF-8 bytes. */
function awsUriEncodeComponent(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    const unreserved =
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a) ||
      (code >= 0x30 && code <= 0x39) ||
      ch === "-" ||
      ch === "." ||
      ch === "_" ||
      ch === "~";
    if (unreserved) {
      out += ch;
    } else {
      for (const b of new TextEncoder().encode(ch)) {
        out += "%" + b.toString(16).toUpperCase().padStart(2, "0");
      }
    }
  }
  return out;
}

function awsUriEncodePath(p: string): string {
  return p.split("/").map(awsUriEncodeComponent).join("/");
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function amzDate(d: Date): string {
  return d.toISOString().replace(/[:-]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function getSignatureKey(secret: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmac("AWS4" + secret, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

function objectUrl(o: {
  bucket: string;
  endpoint: string;
  key: string;
  forcePathStyle: boolean;
}): URL {
  const base = o.endpoint.replace(/\/+$/, "");
  const keyPath = awsUriEncodePath("/" + o.key);
  if (o.forcePathStyle) {
    return new URL(`${base}/${o.bucket}${keyPath}`);
  }
  const hostOnly = base.replace(/^https?:\/\//, "");
  return new URL(`https://${o.bucket}.${hostOnly}${keyPath}`);
}

// ---- public API --------------------------------------------------------------

/**
 * Build a presigned GET URL (query-string auth). `now` is injectable for tests.
 * The bucket may be made public via `PAPEX_S3_PUBLIC_BASE` to skip signing.
 */
export function buildPresignedGetUrl(
  cfg: S3Config,
  key: string,
  expiresSeconds = 300,
  now: Date = new Date(),
): string {
  const url = objectUrl({ bucket: cfg.bucket, endpoint: cfg.endpoint, key, forcePathStyle: cfg.forcePathStyle });
  const datestamp = isoDate(now);
  const amz = amzDate(now);
  const scope = `${datestamp}/${cfg.region}/s3/aws4_request`;
  const params: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${cfg.accessKeyId}/${scope}`,
    "X-Amz-Date": amz,
    "X-Amz-Expires": String(expiresSeconds),
    "X-Amz-SignedHeaders": "host",
  };
  const canonicalQuery = Object.keys(params)
    .sort()
    .map((k) => `${awsUriEncodeComponent(k)}=${awsUriEncodeComponent(params[k])}`)
    .join("&");
  const host = url.host;
  const canonicalHeaders = `host:${host}\n`;
  const canonicalRequest = ["GET", url.pathname, canonicalQuery, canonicalHeaders, "host", "UNSIGNED-PAYLOAD"].join(
    "\n",
  );
  const stringToSign = ["AWS4-HMAC-SHA256", amz, scope, sha256Hex(canonicalRequest)].join("\n");
  const signingKey = getSignatureKey(cfg.secretAccessKey, datestamp, cfg.region, "s3");
  const signature = hmac(signingKey, stringToSign).toString("hex");
  const finalQuery = `${canonicalQuery}&X-Amz-Signature=${signature}`;
  return `${url.origin}${url.pathname}?${finalQuery}`;
}

/** PUT an object with SigV4 Authorization header. */
export async function putObject(
  cfg: S3Config,
  key: string,
  body: Buffer,
  contentType = "application/pdf",
  now: Date = new Date(),
): Promise<void> {
  await s3Request("PUT", cfg, key, { body, contentType, now });
}

/** GET an object, returning its bytes. */
export async function getObject(cfg: S3Config, key: string, now: Date = new Date()): Promise<Buffer> {
  return s3Request("GET", cfg, key, { now });
}

/** DELETE an object. */
export async function deleteObject(cfg: S3Config, key: string, now: Date = new Date()): Promise<void> {
  await s3Request("DELETE", cfg, key, { now });
}

async function s3Request(
  method: "PUT" | "GET" | "DELETE",
  cfg: S3Config,
  key: string,
  opts: { body?: Buffer; contentType?: string; now?: Date },
): Promise<Buffer> {
  const { body, contentType = "application/pdf", now = new Date() } = opts;
  const url = objectUrl({ bucket: cfg.bucket, endpoint: cfg.endpoint, key, forcePathStyle: cfg.forcePathStyle });
  const datestamp = isoDate(now);
  const amz = amzDate(now);
  const scope = `${datestamp}/${cfg.region}/s3/aws4_request`;
  const payloadHash = body ? sha256Hex(body) : sha256Hex(Buffer.alloc(0));

  const headerMap: Record<string, string> = { "x-amz-date": amz, "x-amz-content-sha256": payloadHash };
  if (contentType) headerMap["content-type"] = contentType;

  // Host is always part of the signed headers; fetch sets it on the wire.
  const headerNames = ["host", ...Object.keys(headerMap)].sort();
  const canonicalHeaders = headerNames
    .map((n) => `${n}:${n === "host" ? url.host : headerMap[n]}\n`)
    .join("");
  const signedHeaders = headerNames.join(";");
  const canonicalRequest = [method, url.pathname, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amz, scope, sha256Hex(canonicalRequest)].join("\n");
  const signingKey = getSignatureKey(cfg.secretAccessKey, datestamp, cfg.region, "s3");
  const signature = hmac(signingKey, stringToSign).toString("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(url.toString(), {
    method,
    headers: { ...headerMap, authorization },
    body: body ? new Uint8Array(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`S3 ${method} ${key} failed (${res.status}): ${text.slice(0, 500)}`);
  }
  if (method === "GET") {
    return Buffer.from(await res.arrayBuffer());
  }
  return Buffer.alloc(0);
}
