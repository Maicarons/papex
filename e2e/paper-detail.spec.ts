import { test, expect } from "@playwright/test";

// These tests run against papers ingested from arXiv via `npm run db:seed-arxiv`.
// cs → 2608.18066 "On the Fragility of Self-Improving Agents…" (linked to cs.LG).

test.describe("论文详情", () => {
  test("通过深链打开论文详情页，展示标题与摘要", async ({ page }) => {
    await page.goto("/papers/2608.18066");

    await expect(
      page.getByRole("heading", { name: /On the Fragility of Self-Improving Agents/i }),
    ).toBeVisible();
    await expect(page.getByText(/Memory-based self-improving agents/i)).toBeVisible();
  });

  test("分类详情页展示该分类下的论文", async ({ page }) => {
    await page.goto("/categories/cs.LG");

    // 2608.18066 关联了 cs.LG 子分类，应出现在该分类下
    // （注意：分类过滤为精确匹配，不递归子类，故直接断言叶子分类 cs.LG）
    await expect(
      page.getByRole("link", { name: /On the Fragility of Self-Improving Agents/i }),
    ).toBeVisible();
  });
});
