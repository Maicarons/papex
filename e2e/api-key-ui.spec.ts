import { test, expect } from "@playwright/test";
import {
  newCtx,
  loginAs,
  cleanupApiKeys,
} from "./api-key-helpers";

/**
 * 「混合」链路：UI 登录 + 页面申请 key + 抓取一次性明文 token +
 * 用 key 调写接口 / 权限拦截 + 页面吊销，并覆盖未登录访问的提示态。
 */

test("混合流程：UI 登录 → 申请 key → 抓取明文 → key 调需登录写接口与权限拦截", async ({
  page,
}) => {
  // ---- UI 登录 ----
  await page.goto("/login");
  await page.fill("#identifier", "demo");
  await page.fill("#password", "password123");
  await page.getByRole("button", { name: /登录|Sign in|Login/i }).click();
  await expect(page).toHaveURL(/\/(?!login)/);

  // 进入 API Key 管理页
  await page.goto("/settings/api-keys");
  await expect(
    page.getByRole("heading", { name: /API 密钥|API Keys|API Key/i }),
  ).toBeVisible();

  // 清洁环境：清掉该用户历史遗留的 key，确保列表里只有本次新申请的，
  // 避免 listItem 命中旧 key 导致「吊销了错误的 key / rawToken 仍有效」。
  const cleanupCtx = await newCtx();
  await loginAs(cleanupCtx, "demo", "password123");
  await cleanupApiKeys(cleanupCtx);
  await cleanupCtx.dispose();
  // 重新加载页面以反映清理后的列表
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /API 密钥|API Keys|API Key/i }),
  ).toBeVisible();

  // ---- 申请一个 key（开启 write 权限）----
  await page.locator("#keyName").fill("e2e-ui-key");
  const writeSwitch = page.getByRole("switch");
  if (await writeSwitch.count()) {
    const checked = await writeSwitch.first().getAttribute("aria-checked");
    if (checked !== "true") await writeSwitch.first().click();
  }
  await page.getByRole("button", { name: /创建|Create|生成/i }).click();

  // ---- 抓取仅展示一次的明文 token ----
  // 用完整长度正则，排除列表中「pk_live_xxxx…」的省略号版本，精准命中明文段落。
  const tokenLocator = page.getByText(/pk_(live|test)_[A-Za-z0-9_-]{16,}/).first();
  await expect(tokenLocator).toBeVisible({ timeout: 10_000 });
  const tokenText = (await tokenLocator.textContent()) ?? "";
  const rawToken = tokenText.match(/pk_(live|test)_[A-Za-z0-9_-]{20,}/)?.[0] ?? "";
  expect(rawToken.startsWith("pk_"), "明文 token 应以 pk_ 前缀开头").toBe(true);

  // ---- 用该 key 调「需登录」的写接口：订阅某分类（keyCtx 无 cookie，仅靠 Bearer）----
  const keyCtx = await newCtx();
  const writeRes = await keyCtx.post("/api/subscriptions", {
    data: { type: "category", refId: "cs" },
    headers: { Authorization: `Bearer ${rawToken}` },
  });
  expect(writeRes.status(), "用 API Key 调需登录写接口应成功").toBe(200);

  // ---- 用同一 key 调「需 moderator 权限」的接口：应被 RBAC 拦截 ----
  const adminRes = await keyCtx.get("/api/admin/stats", {
    headers: { Authorization: `Bearer ${rawToken}` },
  });
  expect(adminRes.status(), "普通 author 的 key 调管理接口应被权限拦截").toBe(403);

  // ---- 吊销该 key（列表里最新的「未吊销」项；用 .first() 避开历史残留）----
  const listItem = page
    .locator("li", { hasText: "e2e-ui-key" })
    .filter({ hasNotText: "已吊销" })
    .first();
  await expect(listItem).toBeVisible();
  const revokedBadgesBefore = await page.getByText(/已吊销|revoked/i).count();
  page.once("dialog", (d) => d.accept());
  await listItem.getByRole("button").last().click();

  // 吊销后列表里「已吊销」徽章数量应 +1（UI 反馈）。用 count 增量而非严格定位，
  // 以容忍历史调试遗留的已吊销 key。
  await expect
    .poll(async () => page.getByText(/已吊销|revoked/i).count(), {
      timeout: 10_000,
    })
    .toBeGreaterThan(revokedBadgesBefore);

  // 吊销后调用「需登录」接口应被拒（401）——这是吊销生效的实质证据
  const afterRevoke = await keyCtx.get("/api/subscriptions", {
    headers: { Authorization: `Bearer ${rawToken}` },
  });
  expect(afterRevoke.status(), "吊销后的 key 调需登录接口应被拒").toBe(401);

  await keyCtx.dispose();
});

test("混合流程：未登录访问 /settings/api-keys 显示登录提示（非重定向）", async ({
  page,
}) => {
  await page.goto("/settings/api-keys");
  // 该页是客户端组件：未登录时显示「需登录」提示 + 去登录按钮，而非服务端重定向
  await expect(
    page.getByText(/请先登录|需登录|登录后|loginRequired/i),
  ).toBeVisible();
  // 提供指向登录页的入口
  await expect(page.locator('a[href="/login"]').first()).toBeVisible();
});
