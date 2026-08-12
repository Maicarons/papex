import { expect, request as apiRequestFactory } from "@playwright/test";

/**
 * API Key 端到端测试的共享脚手架。
 *
 * 设计要点（重要，别踩坑）：
 *   - Playwright 的 APIRequestContext 会自动累积 Set-Cookie。因此「登录/申请 key」
 *     与「用 key 调接口」必须用**两个独立的 context**：authCtx（带会话 cookie）
 *     与 keyCtx（全新、无 cookie，仅靠 Bearer）。否则 keyCtx 会沿用会话 cookie，
 *     导致 API Key 鉴权形同虚设（始终以登录用户身份通过）。
 *   - 这里用 `@playwright/test` 导出的 `request` factory 显式 newContext()，
 *     而非 `request` fixture（后者已是单个 context，无法再派生无 cookie 的子 context）。
 *   - 验证「吊销后 / 非法 key 被拒」必须用**需登录**接口（如 /api/subscriptions），
 *     公开接口（如 /api/categories）不鉴权，无法验证。
 *
 * 关于 scope：当前实现只把 scopes 注入 session，并未在路由层强制（只读 key
 * 当前也可调写接口）。因此 scope 探针只描述现状并加注释，待 scope 强制逻辑落地后再收紧。
 */

const BASE_URL = "http://localhost:3000";
export const DEMO = { username: "demo", password: "password123" };

type ApiScope = "read" | "write";
type TestContext = Awaited<ReturnType<typeof newCtx>>;

/** 创建独立的 API 上下文（baseURL 与测试环境一致，且初始无 cookie）。 */
function newCtx() {
  return apiRequestFactory.newContext({ baseURL: BASE_URL });
}

/** 在指定 context 登录。 */
async function loginAs(ctx: TestContext, username: string, password: string) {
  const res = await ctx.post("/api/auth/login", { data: { identifier: username, password } });
  expect(res.status(), "登录应成功").toBe(200);
}

/** 在指定（已登录）context 申请 API key，返回明文 token 与 keyId。 */
async function createApiKey(
  ctx: TestContext,
  name: string,
  scopes: ApiScope[] = ["read", "write"],
): Promise<{ token: string; id: string }> {
  const res = await ctx.post("/api/settings/api-keys", { data: { name, scopes } });
  expect(res.status(), "申请 API Key 应返回 201").toBe(201);
  const body = await res.json();
  expect(body.apiKey?.token, "创建响应应一次性返回明文 token").toBeTruthy();
  expect(body.apiKey?.id, "创建响应应返回 key id").toBeTruthy();
  return { token: body.apiKey.token as string, id: body.apiKey.id as string };
}

/** 吊销指定 key。 */
async function revokeApiKey(ctx: TestContext, id: string) {
  const res = await ctx.delete(`/api/settings/api-keys?id=${encodeURIComponent(id)}`);
  expect(res.status(), "吊销应返回 200").toBe(200);
  expect((await res.json()).ok).toBe(true);
}

/** 清理某用户的所有「未吊销」key（测试数据隔离，避免历史调试残留干扰列表顺序）。 */
async function cleanupApiKeys(ctx: TestContext) {
  const res = await ctx.get("/api/settings/api-keys");
  if (res.status() !== 200) return;
  const { apiKeys } = (await res.json()) as {
    apiKeys?: { id: string; revokedAt: string | null }[];
  };
  for (const k of apiKeys ?? []) {
    if (!k.revokedAt) await revokeApiKey(ctx, k.id);
  }
}

export { newCtx, loginAs, createApiKey, revokeApiKey, cleanupApiKeys };
export type { ApiScope, TestContext };
