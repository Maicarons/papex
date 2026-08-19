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

    // 「最新提交」区块应渲染至少一篇论文卡片（指向 /papers/{id}）。
    // 注意：批量导入的 20 篇 arXiv 论文 createdAt 相近，前 8 篇的具体
    // 内容不定，故只断言论文卡片存在，不绑定具体论文 id。
    await expect(page.locator('a[href^="/papers/"]').first()).toBeVisible();
  });
});
