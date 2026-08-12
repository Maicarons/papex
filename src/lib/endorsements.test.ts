import { describe, it, expect } from "vitest";
import { isSelfEndorse, requiresEndorsement } from "@/lib/services/endorsements";

describe("endorsement rules", () => {
  it("blocks a first submission with no prior paper and no endorsement", () => {
    expect(requiresEndorsement(false, false)).toBe(true);
  });

  it("allows when the author already has a paper in the category", () => {
    expect(requiresEndorsement(true, false)).toBe(false);
  });

  it("allows when the author holds an endorsement for the category", () => {
    expect(requiresEndorsement(false, true)).toBe(false);
  });

  it("never requires endorsement once both conditions are met", () => {
    expect(requiresEndorsement(true, true)).toBe(false);
  });

  it("treats endorsing oneself as self-endorsement", () => {
    expect(isSelfEndorse("u1", "u1")).toBe(true);
    expect(isSelfEndorse("u1", "u2")).toBe(false);
  });
});
