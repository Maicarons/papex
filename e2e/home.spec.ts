import { test, expect } from "@playwright/test";

test.describe("首页", () => {
  test("渲染 Hero、最新提交与学科分类区块", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Papex 学术文献平台" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "最新收录" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "学科分类" })).toBeVisible();
  });

  test("首页展示 arXiv 导入论文", async ({ page }) => {
    await page.goto("/");

    // db:seed-arxiv 灌入的真实 arXiv 论文（cs 领域 2608.18066）应在「最新提交」中可见
    await expect(
      page.getByRole("link", { name: /On the Fragility of Self-Improving Agents/i }),
    ).toBeVisible();
  });
});
