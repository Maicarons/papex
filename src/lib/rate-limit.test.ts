import { describe, it, expect } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit (固定窗口)", () => {
  it("允许窗口内不超过 limit 的请求，超出后返回 429 信息", () => {
    const key = `t1:${Math.random()}`;
    const limit = 3;
    expect(rateLimit(key, limit, 1000).ok).toBe(true);
    expect(rateLimit(key, limit, 1000).ok).toBe(true);
    expect(rateLimit(key, limit, 1000).ok).toBe(true);
    const fourth = rateLimit(key, limit, 1000);
    expect(fourth.ok).toBe(false);
    expect(fourth.remaining).toBe(0);
    expect(fourth.retryAfterSec).toBeGreaterThan(0);
  });

  it("不同 key 之间互不干扰", () => {
    expect(rateLimit("t2-a", 1, 1000).ok).toBe(true);
    expect(rateLimit("t2-b", 1, 1000).ok).toBe(true);
  });

  it("remaining 随请求数递减", () => {
    const key = `t3:${Math.random()}`;
    const r1 = rateLimit(key, 5, 1000);
    expect(r1.ok).toBe(true);
    expect(r1.remaining).toBe(4);
  });
});
