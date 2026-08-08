import { test, expect } from "@playwright/test";

test.describe("论文详情", () => {
  test("通过深链打开论文详情页，展示标题与摘要", async ({ page }) => {
    await page.goto("/papers/2608.00001");

    await expect(
      page.getByRole("heading", { name: /A Modern Open-Source Paper Management System/i }),
    ).toBeVisible();
    await expect(page.getByText(/We present Papex/i)).toBeVisible();
  });

  test("分类详情页展示该分类下的论文", async ({ page }) => {
    await page.goto("/categories/cs.LG");

    // 种子论文 2608.00001 主分类为 cs.LG，应出现在该分类下
    // （注意：分类过滤为精确匹配，不递归子类，故直接断言叶子分类 cs.LG）
    await expect(
      page.getByRole("link", { name: /A Modern Open-Source Paper Management System/i }),
    ).toBeVisible();
  });
});
