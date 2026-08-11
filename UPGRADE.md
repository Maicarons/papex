# Papex 依赖与工具链升级总结（2026-08）

> 本文档记录 papex 项目在 2026-08 期间完成的一次系统性依赖 / 工具链现代化升级，以及验证结果。
> 配套 README 的「技术栈版本」小节已同步更新。

## 1. 升级范围与目标

将 papex 的核心依赖与构建工具升级到当前主流大版本，消除技术债、修复升级过程中暴露的真实 Bug，并确保 `lint / typecheck / test / build` 全链路可用。

涉及的关键技术栈：Next.js 16（App Router）+ React 19 + TypeScript + Tailwind CSS 4 + Drizzle ORM + ESLint 9 + Vitest 3。

---

## 2. 依赖与工具变更一览

| 领域 | 变更 | 版本（升级后） | 备注 |
| --- | --- | --- | --- |
| 框架 | Next.js | `16.3.0` | App Router；`next lint` 已在 Next 16 移除 |
| UI 运行时 | React | `19` | 配合 Next 16 |
| 样式 | Tailwind CSS | `4.3.3` | **CSS-first 配置** + `@tailwindcss/postcss` |
| 语言 | TypeScript | `5.9.0` | **暂未升 7**（见 §3.3） |
| 数据层 | Drizzle ORM / drizzle-kit | `0.45.2` / `0.31.10` | postgres-js 驱动 |
| 图表 | ECharts | `6.1.0` | 管理后台统计面板（按需 core，未用 echarts-for-react） |
| 校验 | Zod | `4.4.3` | v4 API |
| 认证 | jose / bcryptjs | `6.2.8` / `3.0.3` | bcryptjs 改 named import |
| 图标 | lucide-react | `1.31.0` | 1.x |
| 状态 | Zustand | `5.0.3` | |
| Lint | ESLint / eslint-config-next | `9.39.0` / `16.3.0` | **flat config**（见 §3.2） |
| 测试 | Vitest | `3.2.7` | 新增 4 套核心单测（42 cases） |
| PDF | pdf-parse | `2.4.5` | **v2 class-based API**（见 §3.4） |
| 文档站 | VitePress | `^1` | **补回缺失依赖**（见 §4） |

锁定文件：`package-lock.json` 已随安装更新。

---

## 3. 破坏性变更与处理

### 3.1 Tailwind CSS 4（CSS-first）

- 移除旧的 `@tailwind base/components/utilities` 三段式指令，改为 globals.css 顶部：
  ```css
  @import "tailwindcss";
  @config "../../tailwind.config.ts";   /* 复用旧 JS 配置，保留 darkMode/keyframes/容器断点 */
  ```
- PostCSS 配置 `postcss.config.mjs` 改为仅使用 `@tailwindcss/postcss` 插件（移除 `tailwindcss` + `autoprefixer` 旧组合）。
- 设计 Token（`--background` 等 HSL 变量、`@layer base` 的 `@apply`）保持不变，主题与暗色模式无回归。

### 3.2 ESLint 9 flat config（关键修复）

**根因**：`eslint-config-next@16.3.0` 现在**直接导出 flat config 数组**（`index` / `core-web-vitals` / `typescript` 均为数组），而不是旧的 eslintrc 对象。原先使用的 `FlatCompat` 把 flat 数组当成 eslintrc 去校验，触发 `@eslint/eslintrc` 的循环引用 JSON 序列化崩溃（`TypeError: Converting circular structure to JSON`），掩盖了真实错误。

**修复**：直接 import 这两个 flat 数组并展开，不再使用 `FlatCompat`：
```js
import coreWebVitals from "eslint-config-next/core-web-vitals";
import tseslint from "eslint-config-next/typescript";

export default [
  ...coreWebVitals,
  ...tseslint,
  { ignores: ["drizzle/**", ".next/**", "docs/**", ".docs-dist/**", "next-env.d.ts"] },
  { rules: { /* 见 §3.3 */ } },
];
```

### 3.3 react-hooks v7 的 React-Compiler 规则

`eslint-config-next@16` 的 base 配置会展开 `eslint-plugin-react-hooks@7` 的 `recommended`，其中新增了三条 **仅在使用 React Compiler 时才有意义** 的规则。papex 未启用 React Compiler，这些规则会产生误报，因此显式降级：

| 规则 | 处理 | 原因 |
| --- | --- | --- |
| `react-hooks/immutability` | `"off"` | React Compiler 专用 |
| `react-hooks/preserve-manual-memoization` | `"off"` | React Compiler 专用 |
| `react-hooks/set-state-in-effect` | `"warn"` | 项目存在合理的「effect 内同步 setState」（从 cookie/localStorage/DOM 读取），保留可见但不阻断 |

其余 `no-unused-vars`（error）、`no-explicit-any`（warn）沿用。

### 3.4 TypeScript 暂定 5.9（未升 7）

`typescript-eslint@8.x` 的 peer 上限为 `<6.1.0`，在 TS 7 下会报 *"typescript-eslint does not support TS 7.0"*。因此本次将 TypeScript 固定在 `^5.9.0`，待 `typescript-eslint` 发布对 TS 7 的支持后再迁移。**这是本次升级唯一偏离「升到最新大版本」的取舍**，已记入 README 版本表。

### 3.5 pdf-parse v2（class-based API）

`pdf-parse@2` 废弃了 v1 的默认导出，改为 class API。`src/lib/pdf.ts` 重写为：
```ts
import { PDFParse } from "pdf-parse";
const parser = new PDFParse({ data: new Uint8Array(buffer) });
const result = await parser.getText();
```
对应 Next 配置 `serverExternalPackages` 已含 `pdf-parse`（包名不变）。

### 3.6 其他库

- `bcryptjs@3`：`import bcrypt from "bcryptjs"` → `import { hash, compare } from "bcryptjs"`（named）。
- `zod@4` / `jose@6` / `lucide-react@1`：按各自 v4/v6/v1 的 API 适配，无额外破坏性改动。
- `next.config.mjs`：已清理（移除过时项），`serverExternalPackages` 含 `postgres / bcryptjs / nodemailer / pdf-parse`。

---

## 4. 修复的真实 Bug（升级中发现）

1. **`bibtexEscape` 双重转义**（`src/lib/writespace/latex-gen.ts`）：旧实现先转义 `{}` 再对插入的 `\` 二次转义，导致反斜杠被翻倍。已改为单遍字符扫描。
2. **检索分词器拆分内嵌引号**（`src/lib/search.ts`）：`ti:"deep net"` 会被内部空格误拆。重写为引号感知的字符扫描器，同时让 `-term` 正确成为 NOT 前缀。
3. **21 处未使用变量清理**：覆盖 `permissions.ts` / `rbac.ts` / `messages.ts` / `co-reviews.ts` / 多个 API route 与组件（含删除死代码 `sanitizeId`、未使用的 `PapexManifest/PapexSection` 导入等）。

---

## 5. 验证结果

| 项目 | 命令 | 结果 |
| --- | --- | --- |
| Lint | `npm run lint`（`eslint .`） | ✅ 0 error，4 warning（均为 `set-state-in-effect`  advisory） |
| 类型检查 | `npm run typecheck`（`tsc --noEmit`） | ✅ exit 0 |
| 单元测试 | `npm run test`（`vitest run`） | ✅ 42 / 42 通过（search / paper-id / latex-gen / permissions） |
| 生产构建 | `npm run build` | ⚠️ 受环境限制未在本沙箱跑通（见 §6） |
| E2E | `npm run test:e2e`（Playwright） | ⚠️ 受环境限制未在本沙箱跑通（见 §6） |

> Lint/类型/单测三项已在本地（Windows 沙箱）全部绿灯，证明升级的语法、类型与核心逻辑正确性。

---

## 6. 本沙箱未能执行的步骤（环境限制，非回归）

`npm run build` 与 `npm run test:e2e` **依赖一个可连接的 PostgreSQL**：

- `next build` 在 `/categories/[slug]` 的 `generateStaticParams` 中调用 `getAllCategorySlugs()` 查询数据库；无 DB 时该预渲染步骤会抛错导致构建失败。
- E2E 需要 `docker compose up -d db` + `db:migrate` + `db:seed` 提供数据与运行中的应用。

**当前沙箱没有运行 Docker / Postgres（端口 5432 不可达）**，因此这两项无法在此环境执行。但它们在 CI 中是可用的：`.github/workflows/ci.yml` 提供了 `postgres:16` service 容器，且已采用 `npm run lint`（`eslint .`，无 `next lint`）、Node 24、构建前 `db:migrate` 的正确流程。

**在具备 Postgres 的环境中复跑验证**：
```bash
docker compose up -d db
set -a && . ./.env && set +a      # 注入 DATABASE_URL
npm run db:migrate && npm run db:seed
npm run build                      # 含 docs:build (VitePress) + next build
npm run start                     # 或 npm run dev
npm run test:e2e
```

> 注：`sitemap.ts` 已对 DB 访问做了 try/catch 兜底（DB 不可用时仅输出静态路由），但 `/categories/[slug]` 的预渲染未做兜底——这是有意的性能优化（构建期预渲染全量分类），需 DB 参与。

---

## 7. 后续待办

- [ ] 待 `typescript-eslint` 支持 TS 7 后，将 TypeScript 从 5.9 迁移到 7，并移除 README 中的版本说明。
- [ ] （可选）为 `/categories/[slug]` 的 `generateStaticParams` 增加 DB 不可达时的兜底（fallback 到按需渲染），使 `next build` 在临时无 DB 时也不硬失败。
- [ ] `docs/.vitepress/config.ts` 的 `description` 字段存在 GBK/UTF-8 乱码，建议修正（不影响构建，仅为元信息）。
- [ ] 在具备 Postgres 的 CI/本机环境补齐 §6 的 build + e2e 验证。
