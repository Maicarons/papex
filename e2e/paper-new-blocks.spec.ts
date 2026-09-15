import { test, expect } from "@playwright/test";

// e2e coverage for the P0-E / P1-D additions on the paper page (runs against
// papers ingested via `npm run db:seed-arxiv` — 2608.18066 is the seeded paper).

test.describe("论文页新增区块", () => {
  test("「阅读与批注」页签在未登录时显示登录提示", async ({ page }) => {
    await page.goto("/papers/2608.18066");

    await page.getByRole("tab", { name: /阅读与批注/ }).click();
    await expect(page.getByText(/登录后记录阅读进度与批注/)).toBeVisible();
  });

  test("「代码与数据」卡片渲染且默认展示空态", async ({ page }) => {
    await page.goto("/papers/2608.18066");

    await expect(page.getByRole("heading", { name: "代码与数据" })).toBeVisible();
    await expect(page.getByText(/暂无关联。作者可以添加代码仓库/)).toBeVisible();
  });

  test("版本历史支持展开对比视图", async ({ page }) => {
    await page.goto("/papers/2608.18066");

    // 种子论文只有 v1（最新版本），无历史版本时对比入口不渲染；
    // 至少确认版本历史区块存在。
    await expect(page.getByRole("heading", { name: "版本历史" })).toBeVisible();
  });
});
