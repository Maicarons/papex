import { describe, it, expect } from "vitest";
import { normalizeUrl, inferLinkTitle, normalizeLink } from "./paper-links";

describe("normalizeUrl", () => {
  it("accepts http(s) URLs", () => {
    expect(normalizeUrl("https://github.com/foo/bar")).toBe("https://github.com/foo/bar");
    expect(normalizeUrl("  http://example.com/a  ")).toBe("http://example.com/a");
  });

  it("rejects non-http(s) or invalid URLs", () => {
    expect(normalizeUrl("ftp://example.com")).toBeNull();
    expect(normalizeUrl("not a url")).toBeNull();
    expect(normalizeUrl("")).toBeNull();
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("inferLinkTitle", () => {
  it("extracts owner/repo from GitHub URLs", () => {
    expect(inferLinkTitle("https://github.com/openai/gpt-4")).toBe("openai/gpt-4");
    expect(inferLinkTitle("https://github.com/foo/bar/tree/main/src")).toBe("foo/bar");
  });

  it("returns null for non-GitHub hosts", () => {
    expect(inferLinkTitle("https://example.com/dataset")).toBeNull();
  });
});

describe("normalizeLink", () => {
  it("coerces kind and fills title for GitHub repos", () => {
    const link = normalizeLink({
      url: "https://github.com/foo/bar",
      kind: "repository",
    });
    expect(link).not.toBeNull();
    expect(link!.kind).toBe("repository");
    expect(link!.title).toBe("foo/bar");
  });

  it("rejects unusable input", () => {
    expect(normalizeLink({ url: "nope", kind: "dataset" })).toBeNull();
    expect(normalizeLink({})).toBeNull();
  });
});
