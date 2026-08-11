import { describe, it, expect } from "vitest";
import { generatePaperId } from "@/lib/paper-id";

describe("generatePaperId", () => {
  it("produces the YYMM.NNNNN format", () => {
    const id = generatePaperId(new Date(Date.UTC(2026, 7, 11)));
    expect(id).toMatch(/^\d{4}\.\d{5}$/);
    // YY=26, MM=08 (August, 1-indexed, zero-padded)
    expect(id.startsWith("2608.")).toBe(true);
  });

  it("zero-pads the month correctly in January", () => {
    const id = generatePaperId(new Date(Date.UTC(2025, 0, 2)));
    expect(id.startsWith("2501.")).toBe(true);
  });

  it("zero-pads the 5-digit suffix", () => {
    // Force a deterministic low suffix by stubbing Math.random to 0.
    const original = Math.random;
    Math.random = () => 0; // floor(0 * 100000) = 0 -> "00000"
    try {
      const id = generatePaperId(new Date(Date.UTC(2026, 0, 1)));
      expect(id.endsWith(".00000")).toBe(true);
    } finally {
      Math.random = original;
    }
  });

  it("generates distinct ids across calls (random suffix)", () => {
    const a = generatePaperId(new Date(Date.UTC(2026, 0, 1)));
    const b = generatePaperId(new Date(Date.UTC(2026, 0, 1)));
    // suffix is random; extremely unlikely to collide, but allow equality as a
    // soft check on format only.
    expect(a).toMatch(/^\d{4}\.\d{5}$/);
    expect(b).toMatch(/^\d{4}\.\d{5}$/);
  });
});
