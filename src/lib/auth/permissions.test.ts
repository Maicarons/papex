import { describe, it, expect } from "vitest";
import {
  applyOverrides,
  PERMISSION_KEYS,
  PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  SYSTEM_ROLE_KEYS,
} from "@/lib/auth/permissions";

describe("permission catalog integrity", () => {
  it("every default role permission key is a known permission", () => {
    for (const role of SYSTEM_ROLE_KEYS) {
      for (const key of DEFAULT_ROLE_PERMISSIONS[role]) {
        expect(PERMISSION_KEYS.has(key)).toBe(true);
      }
    }
  });

  it("admin holds the full permission set", () => {
    const admin = new Set(DEFAULT_ROLE_PERMISSIONS.admin);
    expect(admin.size).toBe(PERMISSIONS.length);
  });

  it("reader is a subset of author", () => {
    const reader = new Set(DEFAULT_ROLE_PERMISSIONS.reader);
    const author = new Set(DEFAULT_ROLE_PERMISSIONS.author);
    for (const p of reader) expect(author.has(p)).toBe(true);
  });
});

describe("applyOverrides", () => {
  it("adds granted permissions on top of the base set", () => {
    const eff = applyOverrides(["paper:view"], [{ key: "paper:download", grant: true }]);
    expect(eff.has("paper:view")).toBe(true);
    expect(eff.has("paper:download")).toBe(true);
  });

  it("removes denied permissions even when granted by a role", () => {
    const eff = applyOverrides(["paper:view", "paper:download"], [
      { key: "paper:download", grant: false },
    ]);
    expect(eff.has("paper:view")).toBe(true);
    expect(eff.has("paper:download")).toBe(false);
  });

  it("denying a permission the user never had is a no-op", () => {
    const eff = applyOverrides(["paper:view"], [{ key: "paper:moderate", grant: false }]);
    expect(eff.has("paper:view")).toBe(true);
    expect(eff.has("paper:moderate")).toBe(false);
  });

  it("a later deny overrides an earlier grant for the same key", () => {
    const eff = applyOverrides([], [
      { key: "x", grant: true },
      { key: "x", grant: false },
    ]);
    expect(eff.has("x")).toBe(false);
  });

  it("preserves the base set when there are no overrides", () => {
    const eff = applyOverrides(["a", "b"], []);
    expect([...eff].sort()).toEqual(["a", "b"]);
  });
});
