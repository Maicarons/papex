import { test, expect } from "@playwright/test";
import {
  newCtx,
  loginAs,
  createApiKey,
  revokeApiKey,
} from "./api-key-helpers";

/**
 * scope 探针：当前实现只把 scopes 注入 session，并未在路由层强制
 * （只读 key 当前也可调写接口）。该测试描述「现状」，不是期望目标——
 * 待 scope 强制逻辑落地后，应把断言从 200 改为 403。
 */

test("scope 现状：只读 key 也能调写接口（scope 尚未在路由层强制）", async () => {
  const authCtx = await newCtx();
  const keyCtx = await newCtx();
  await loginAs(authCtx, "demo", "password123");
  const { token, id } = await createApiKey(authCtx, "e2e-scope-probe", ["read"]);

  // 当前：只读 key 仍可调「需登录」写接口（scope 未强制）。
  const writeRes = await keyCtx.post("/api/subscriptions", {
    data: { type: "category", refId: "math" },
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(writeRes.status()).toBe(200);

  await revokeApiKey(authCtx, id);
  await authCtx.dispose();
  await keyCtx.dispose();
});
