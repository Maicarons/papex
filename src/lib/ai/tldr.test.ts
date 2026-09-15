import { describe, it, expect } from "vitest";
import { normalizeSummary } from "./tldr";
import { normalizeReview } from "./review";

const ABSTRACT =
  "We introduce a retrieval system that combines dense vector search with keyword filtering. " +
  "Experiments on the BEIR benchmark show a 47% relative improvement in recall.";

describe("normalizeSummary (provenance gate)", () => {
  it("keeps points whose evidence is quoted from the abstract", () => {
    const out = normalizeSummary(
      {
        summary: "A hybrid retrieval system.",
        points: [
          { claim: "Combines dense search with filtering", evidence: "combines dense vector search with keyword filtering", confidence: 0.9 },
          { claim: "Unsupported claim", evidence: "not in the abstract at all", confidence: 0.9 },
        ],
      },
      ABSTRACT,
    );
    expect(out.summary).toBe("A hybrid retrieval system.");
    expect(out.points).toHaveLength(1);
    expect(out.points[0].claim).toContain("Combines dense search");
  });

  it("clamps confidence to [0,1] and defaults missing values", () => {
    const out = normalizeSummary(
      {
        summary: "s",
        points: [
          { claim: "c1", evidence: "dense vector search", confidence: 5 },
          { claim: "c2", evidence: "keyword filtering", confidence: -1 },
          { claim: "c3", evidence: "BEIR benchmark" },
        ],
      },
      ABSTRACT,
    );
    expect(out.points.map((p) => p.confidence)).toEqual([1, 0, 0.5]);
  });

  it("drops points with too-short evidence", () => {
    const out = normalizeSummary(
      { summary: "s", points: [{ claim: "c", evidence: "a short", confidence: 0.5 }] },
      ABSTRACT,
    );
    expect(out.points).toHaveLength(0);
  });
});

describe("normalizeReview", () => {
  it("keeps only points citing provided paper ids", () => {
    const out = normalizeReview(
      {
        title: "Review",
        points: [
          { claim: "ok", paperId: "p1", evidence: "evidence one", confidence: 0.8 },
          { claim: "stale", paperId: "p999", evidence: "evidence two", confidence: 0.8 },
        ],
      },
      new Set(["p1", "p2"]),
    );
    expect(out.title).toBe("Review");
    expect(out.points).toHaveLength(1);
    expect(out.points[0].paperId).toBe("p1");
  });

  it("caps at 8 points and clamps confidence", () => {
    const rawPoints = Array.from({ length: 12 }, (_, i) => ({
      claim: `c${i}`,
      paperId: "p1",
      evidence: `evidence ${i}`,
      confidence: 3,
    }));
    const out = normalizeReview({ title: "t", points: rawPoints }, new Set(["p1"]));
    expect(out.points).toHaveLength(8);
    expect(out.points.every((p) => p.confidence === 1)).toBe(true);
  });
});
