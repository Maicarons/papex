import { test } from "@playwright/test";
import { newCtx, loginAs, createApiKey, revokeApiKey } from "./api-key-helpers";

/**
 * 「纯 API」鉴权链路：不涉及 UI，全程用 APIRequestContext 验证
 * API Key 的签发、携带、吊销与拦截。
 */

test.describe("API Key 鉴权（纯 API）", () => {
  test("登录 → 申请 key → 用 key 调需登录接口成功 → 吊销后失效", async () => {
    // authCtx：用于登录 + 申请（会累积会话 cookie）
    const authCtx = await newCtx();
    // keyCtx：全新、无 cookie，仅带 Bearer，用于验证 API Key 鉴权
    const keyCtx = await newCtx();

    await loginAs(authCtx, "demo", "password123");
    const { token, id } = await createApiKey(authCtx, "e2e-readonly", ["read"]);

    // 用 key 调「公开只读」接口——keyCtx 不带 cookie，仅靠 Bearer
    const catRes = await keyCtx.get("/api/categories", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (catRes.status() !== 200) {
      throw new Error(`/api/categories 应返回 200，实际 ${catRes.status()}`);
    }

    // 用 key 调「需登录」接口应成功（验证 key 解析出身份，而非 cookie）
    const subRes = await keyCtx.get("/api/subscriptions", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (subRes.status() !== 200) {
      throw new Error(`用 API Key 调需登录接口应成功，实际 ${subRes.status()}`);
    }

    // 吊销后，keyCtx（无 cookie）调需登录接口应被拒（401）
    await revokeApiKey(authCtx, id);
    const afterRevoke = await keyCtx.get("/api/subscriptions", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (afterRevoke.status() !== 401) {
      throw new Error(`吊销后的 key 调需登录接口应被拒（401），实际 ${afterRevoke.status()}`);
    }

    await authCtx.dispose();
    await keyCtx.dispose();
  });

  test("格式非法的 key 调需登录接口应 401", async () => {
    const authCtx = await newCtx();
    const keyCtx = await newCtx();
    await loginAs(authCtx, "demo", "password123");
    const badRes = await keyCtx.get("/api/subscriptions", {
      headers: { Authorization: "Bearer pk_live_zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz" },
    });
    if (badRes.status() !== 401) {
      throw new Error(`非法格式 key 调需登录接口应被拒（401），实际 ${badRes.status()}`);
    }
    await authCtx.dispose();
    await keyCtx.dispose();
  });

  test("未登录申请 key 应 401", async () => {
    const ctx = await newCtx();
    const res = await ctx.post("/api/settings/api-keys", { data: { name: "fail" } });
    if (res.status() !== 401) {
      throw new Error(`未登录申请 key 应返回 401，实际 ${res.status()}`);
    }
    await ctx.dispose();
  });
});
