import { describe, it, expect } from "vitest";
import { diffLines } from "./diff";

describe("diffLines", () => {
  it("returns same lines for identical input", () => {
    expect(diffLines("a\nb\nc", "a\nb\nc")).toEqual([
      { type: "same", text: "a" },
      { type: "same", text: "b" },
      { type: "same", text: "c" },
    ]);
  });

  it("marks inserted and removed lines", () => {
    const out = diffLines("a\nb\nc", "a\nx\nc");
    const added = out.filter((l) => l.type === "added").map((l) => l.text);
    const removed = out.filter((l) => l.type === "removed").map((l) => l.text);
    expect(added).toContain("x");
    expect(removed).toContain("b");
    // both sides of a changed line are reported
    expect(out.filter((l) => l.type === "added")).toHaveLength(1);
    expect(out.filter((l) => l.type === "removed")).toHaveLength(1);
  });

  it("handles append-only changes", () => {
    const out = diffLines("a", "a\nb");
    expect(out.filter((l) => l.type === "added").map((l) => l.text)).toEqual(["b"]);
  });

  it("handles empty before", () => {
    const out = diffLines("", "a\nb");
    expect(out.every((l) => l.type === "added")).toBe(true);
  });
});
