import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright e2e 配置（papex-store）
 *
 * - 数据库由 docker compose 启动的 Postgres 提供（见 docker-compose.yml 的 db 服务）。
 * - 应用通过 `npm run dev` 提供；这里设 reuseExistingServer，
 *   若外部已手动起好 dev server 则直接复用，否则由 Playwright 拉起。
 * - 前置：先 `docker compose up -d db` + `npm run db:migrate`(+`db:seed`)。
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    // 跨平台清空 NODE_OPTIONS（避免沙箱 safe-delete shim 导致 Next 清理命令 ENAMETOOLONG）
    // RATE_LIMIT_DISABLED=1：e2e 下跳过生产限流，避免被 429 干扰（对业务无影响）。
    env: { NODE_OPTIONS: "", RATE_LIMIT_DISABLED: "1" },
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
