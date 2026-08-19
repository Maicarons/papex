import { test, expect } from "@playwright/test";

test.describe("检索", () => {
  test("首页搜索框提交后跳转到论文列表并命中结果", async ({ page }) => {
    await page.goto("/");

    await page.getByPlaceholder("检索标题、摘要、作者或分类…").fill("Fragility");
    await page.getByRole("button", { name: "检索" }).click();

    await expect(page).toHaveURL(/\/papers\?q=Fragility/);

    // 列表页给出总数
    await expect(page.getByText(/共 \d+ 篇/)).toBeVisible();
    // 命中 arXiv 导入的真实论文标题
    await expect(
      page.getByText("On the Fragility of Self-Improving Agents"),
    ).toBeVisible();
  });

  test("无匹配的检索显示空态文案", async ({ page }) => {
    await page.goto("/papers?q=zzz_no_such_paper_zzz");

    await expect(page.getByText("没有匹配的论文。")).toBeVisible();
  });
});
