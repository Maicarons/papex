import { test, expect } from "@playwright/test";
import {
  newCtx,
  loginAs,
  createApiKey,
  revokeApiKey,
} from "./api-key-helpers";

/**
 * scope 强制：API Key scope 已在路由层（getSession ← x-papex-method ← scope 校验）
 * 生效。只读 key（scopes:["read"]）调写接口应被拒绝（401，等同未授权）。
 */

test("scope 强制：只读 key 不能调写接口（返回 401）", async () => {
  const authCtx = await newCtx();
  const keyCtx = await newCtx();
  await loginAs(authCtx, "demo", "password123");
  const { token, id } = await createApiKey(authCtx, "e2e-scope-probe", ["read"]);

  // 期望：只读 key 调「需登录」写接口被拒（scope 不足 → 视为未认证）。
  const writeRes = await keyCtx.post("/api/subscriptions", {
    data: { type: "category", refId: "math" },
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(writeRes.status()).toBe(401);

  await revokeApiKey(authCtx, id);
  await authCtx.dispose();
  await keyCtx.dispose();
});
