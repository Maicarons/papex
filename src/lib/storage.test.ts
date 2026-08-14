import { describe, expect, it } from "vitest";
import { buildPresignedGetUrl, type S3Config } from "./s3-client";

// AWS Signature Version 4 test suite — "GET Object" presigned example.
// https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html
const FIXED_DATE = new Date("2013-05-24T00:00:00Z");

const awsConfig: S3Config = {
  bucket: "examplebucket",
  region: "us-east-1",
  endpoint: "https://s3.amazonaws.com",
  accessKeyId: "AKIAIOSFODNN7EXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  forcePathStyle: false,
};

function param(url: string, name: string): string {
  const u = new URL(url);
  return u.searchParams.get(name) ?? "";
}

describe("S3 SigV4 presigned GET URL", () => {
  it("matches the official AWS GET Object signing vector", () => {
    const url = buildPresignedGetUrl(awsConfig, "test.txt", 86400, FIXED_DATE);

    // Virtual-hosted style: examplebucket.s3.amazonaws.com/test.txt
    expect(url).toContain("https://examplebucket.s3.amazonaws.com/test.txt?");
    expect(param(url, "X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256");
    expect(param(url, "X-Amz-Credential")).toBe(
      "AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request",
    );
    expect(param(url, "X-Amz-Date")).toBe("20130524T000000Z");
    expect(param(url, "X-Amz-Expires")).toBe("86400");
    expect(param(url, "X-Amz-SignedHeaders")).toBe("host");
    expect(param(url, "X-Amz-Signature")).toBe(
      "aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404",
    );
  });

  it("builds a path-style URL when forcePathStyle is true", () => {
    const cfg: S3Config = { ...awsConfig, forcePathStyle: true };
    const url = buildPresignedGetUrl(cfg, "papers/X/v1.pdf", 300, FIXED_DATE);
    expect(url).toContain("https://s3.amazonaws.com/examplebucket/papers/X/v1.pdf?");
  });

  it("encodes object keys per RFC 3986 (unreserved set)", () => {
    const cfg: S3Config = { ...awsConfig, forcePathStyle: true };
    const url = buildPresignedGetUrl(cfg, "papers/ID v2/论文.pdf", 60, FIXED_DATE);
    // spaces -> %20, Chinese chars percent-encoded
    expect(url).toContain("%20");
    expect(decodeURIComponent(url.split("?")[0])).toBe(
      "https://s3.amazonaws.com/examplebucket/papers/ID v2/论文.pdf",
    );
  });
});
