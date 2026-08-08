import { test, expect } from "@playwright/test";

test("管理统计页无控制台报错（验证 ECharts 替换后无重复 key 问题）", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  // 以 admin 登录，拿到会话 cookie（request 与 page 共享 context cookie 存储）
  const loginRes = await context.request.post("/api/auth/login", {
    data: { identifier: "admin", password: "admin123456" },
  });
  expect(loginRes.ok()).toBeTruthy();

  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/admin/stats", { waitUntil: "domcontentloaded" });
  // 等 ECharts 渲染出 canvas（4 张图）
  await page.waitForSelector("canvas", { timeout: 20000 });
  // 再留一点时间，确保 React 完成提交与校验
  await page.waitForTimeout(1500);

  await context.close();

  expect(errors, `控制台出现错误:\n${errors.join("\n")}`).toHaveLength(0);
});
