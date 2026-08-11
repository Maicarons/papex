# Papex — 开源论文管理与展示系统

> 开源学术论文管理与展示平台 · Apache-2.0 · 全栈 Next.js · 可部署 Vercel

Papex 是一个开源（Apache-2.0）的学术论文管理与展示系统，覆盖学术论文提交、检索与展示的核心能力：
论文提交与版本管理、预览与下载、学科分类、全文检索与筛选、作者与机构、评论讨论、订阅提醒、
个人主页与用户系统、投稿审核流程、开放 API、暗色模式与响应式布局。

- **前端 + 后端均为 Next.js（App Router）**：Server Components 直连数据库读取，Route Handlers 提供 REST API。
- **数据层**：Drizzle ORM + PostgreSQL，全文检索基于 PostgreSQL `tsvector`。
- **UI**：shadcn/ui 风格（Radix 原语 + Tailwind CSS 4，CSS-first 配置 + `@tailwindcss/postcss`），Lucide 图标，next-themes 暗色模式；图表用 ECharts 6。
- **状态**：Zustand 管理客户端筛选/交互态。
- **认证**：jose(JWT) + bcryptjs，httpOnly cookie 会话，中间件保护写操作路由。

---

## 目录

- [功能矩阵](#功能矩阵)
- [技术架构](#技术架构)
- [技术栈版本](#技术栈版本)
- [目录结构](#目录结构)
- [数据模型设计](#数据模型设计)
- [功能模块划分](#功能模块划分)
- [核心流程](#核心流程)
- [本地开发](#本地开发)
- [数据库迁移与种子](#数据库迁移与种子)
- [部署](#部署)
- [API 速览](#api-速览)
- [路线图](#路线图)

---

## 功能矩阵

| 平台核心能力 | Papex 实现 | 状态 |
| --- | --- | --- |
| 论文提交（PDF/元数据） | `/submit` 表单 + API | ✅ |
| 版本管理（v1, v2… 永久存档） | `paper_versions` 表 + 版本切换页 | ✅ |
| 论文预览与下载 | 详情页摘要/PDF 链接 + 下载 API | ✅ |
| 学科分类与标签 | `categories` 8 大类 + 子类，交叉列表 | ✅ |
| 全文检索与筛选 | `tsvector` 全文索引 + 多维过滤 API | ✅ |
| 作者与机构信息 | `authors`/`affiliations` + 作者主页 | ✅ |
| 评论与讨论 | `comments` 楼中楼 + API | ✅ |
| 订阅与提醒 | `subscriptions`（分类/作者/论文）+ 提醒列表 | ✅ |
| 个人主页与用户系统 | `/u/[username]` + 认证 | ✅ |
| 投稿审核流程 | `admin/review` 队列 + moderation 状态机 | ✅ |
| 开放 API 接口 | `/api/*` REST | ✅ |
| 暗色模式 | next-themes + CSS 变量 | ✅ |
| 响应式布局 | Tailwind 容器 + 移动优先 | ✅ |
| Endorsement（背书） | `endorsements` 表 + 首次投稿背书校验 | 🟡 基础版 |
| RSS / 邮件提醒 | RSS 路由 + Resend / SMTP 邮件投递（可配置） | ✅ |
| 高级布尔检索 | 字段限定（ti/abs/au/cat/id）+ AND/OR/NOT + 括号分组 | ✅ |
| 多语言全文检索 | CJK 走 `pg_trgm` 三元组 ILIKE，拉丁文走 `tsvector`（english/simple） | ✅ |
| 批量 PDF 解析 | pdf-parse 抽取文本/元数据 + 正则抽取参考文献（文献编号 / DOI） | ✅ |
| 引用图 | `citations` 表记录 DOI/文献编号 引用关系，手绘 SVG 关系图 | ✅ |
| 管理后台统计 | 投稿/分类/作者/审核聚合面板（ECharts 6 图表） | ✅ |

---

## 技术架构

```
┌──────────────────────────────────────────────────────────────┐
│                         Browser (RSC + Client)                 │
│   Server Components 直读 DB  ·  Client Components 调 /api       │
└───────────────┬───────────────────────────┬──────────────────┘
                │ 读 (Server)               │ 写/交互 (Client fetch)
                ▼                           ▼
┌───────────────────────────┐   ┌──────────────────────────────┐
│  Next.js App Router        │   │  Next.js Route Handlers       │
│  app/**/page.tsx           │   │  app/api/**/route.ts          │
│  lib/services/* (查询逻辑) │   │  lib/services/* (变更逻辑)     │
└───────────────┬───────────┘   └──────────────┬───────────────┘
                │                              │
                └──────────┬───────────────────┘
                           ▼
                ┌──────────────────────┐
                │  Drizzle ORM         │
                │  (postgres-js 驱动)  │
                └──────────┬───────────┘
                           ▼
                ┌──────────────────────┐
                │  PostgreSQL          │
                │  (Vercel Postgres /  │
                │   Neon / 自托管)      │
                └──────────────────────┘
```

**分层原则**
- `lib/db/*`：仅数据访问，不含业务。
- `lib/services/*`：业务查询/变更函数（服务端 only），被页面与 API 共用，避免重复逻辑。
- `app/api/**`：REST 边界，负责入参校验（zod）、鉴权、调用 service。
- `components/**`：展示与交互，客户端组件通过 `fetch('/api/...')` 调用。

---

## 技术栈版本

> 当前主版本（2026-08 升级后）。详见仓库根目录 `UPGRADE.md`。

| 领域 | 技术 | 版本 |
| --- | --- | --- |
| 框架 | Next.js（App Router） | 16.3 |
| UI 运行时 | React | 19 |
| 样式 | Tailwind CSS（CSS-first + `@tailwindcss/postcss`） | 4.3 |
| 语言 | TypeScript | 5.9 |
| 数据层 | Drizzle ORM（postgres-js） | 0.45 |
| 图表 | ECharts | 6.1 |
| 校验 | Zod | 4.4 |
| 认证 | jose（JWT）+ bcryptjs | 6 / 3 |
| 图标 | lucide-react | 1.x |
| 状态 | Zustand | 5 |
| Lint / 测试 | ESLint 9（flat config）+ Vitest 3 | — |
| PDF 解析 | pdf-parse（class-based API） | 2.4 |

> TypeScript 暂定 `5.9`：`typescript-eslint` 8.x 对 TS 7 的支持仍在跟进，待其发布后迁移至 TS 7。

---

## 目录结构

```
papex/
├── drizzle/                 # drizzle-kit 生成的迁移 SQL
├── src/
│   ├── app/
│   │   ├── layout.tsx          # 根布局：主题/字体/Header/Footer
│   │   ├── globals.css         # Tailwind + 设计 Token (CSS 变量)
│   │   ├── page.tsx            # 首页：最新/热门/分类入口
│   │   ├── (auth)/             # 登录 / 注册
│   │   ├── papers/
│   │   │   ├── page.tsx        # 列表 + 检索 + 筛选
│   │   │   ├── [id]/page.tsx   # 论文详情（最新版本）
│   │   │   ├── [id]/[version]/page.tsx  # 指定版本
│   │   │   └── [id]/edit/page.tsx      # 提交新版本
│   │   ├── submit/page.tsx     # 新投稿
│   │   ├── categories/         # 分类树 / 分类详情
│   │   ├── authors/[id]/       # 作者主页
│   │   ├── u/[username]/       # 用户个人主页
│   │   ├── me/                 # 我的投稿 / 订阅 / 提醒
│   │   ├── admin/review/       # 审核队列（moderator 可见）
│   │   └── api/                # REST API（见下）
│   ├── components/
│   │   ├── ui/                 # shadcn 风格基础组件
│   │   ├── site-header.tsx / site-footer.tsx
│   │   ├── theme-provider.tsx / theme-toggle.tsx
│   │   ├── paper-card.tsx / search-bar.tsx / category-tree.tsx
│   │   ├── comment-thread.tsx / submit-form.tsx / review-queue.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── utils.ts            # cn() 等
│   │   ├── db/
│   │   │   ├── index.ts        # drizzle 单例
│   │   │   ├── schema.ts       # 全部表 + 关系
│   │   │   └── seed.ts         # 种子数据
│   │   ├── auth/
│   │   │   ├── session.ts      # JWT 签发/校验 + cookie
│   │   │   └── password.ts     # bcrypt
│   │   ├── services/           # papers/authors/categories/comments/subscriptions/review
│   │   ├── validations.ts      # zod 校验
│   │   ├── paper-id.ts         # 文献编号生成
│   │   └── search.ts           # 全文检索拼接
│   ├── hooks/                  # 客户端 hooks
│   ├── store/                  # Zustand stores
│   └── types/                  # 共享类型
├── Dockerfile / docker-compose.yml   # 自托管
├── vercel.json                        # Vercel 配置（可选）
├── .github/workflows/ci.yml           # CI：lint + typecheck + build + migrate
├── drizzle.config.ts / tailwind.config.ts / next.config.mjs
└── LICENSE (Apache-2.0)
```

---

## 数据模型设计

采用 Drizzle + PostgreSQL。核心实体与关系：

| 表 | 用途 | 关键字段 |
| --- | --- | --- |
| `users` | 账户 | id, username, email, passwordHash, role(author/admin/moderator), displayName |
| `authors` | 作者档案（可关联 user） | id, userId?, name, orcid?, affiliationId? |
| `affiliations` | 机构 | id, name, country? |
| `papers` | 论文主记录 | id(文献编号风格), title, primaryCategoryId, status(submitted/approved/withdrawn), createdBy |
| `paper_versions` | 版本快照 | id, paperId, version, title, abstract, authors(json), pdfUrl, doi?, license, createdAt |
| `paper_authors` | 论文-作者关联 | paperId, authorId, order |
| `categories` | 学科分类 | id(slug), parentId?, name, description |
| `paper_categories` | 论文-分类（含交叉列表） | paperId, categoryId, isPrimary |
| `comments` | 评论/讨论 | id, paperId, userId, parentId?, body, createdAt |
| `subscriptions` | 订阅 | id, userId, type(category/author/paper), refId |
| `endorsements` | 背书 | id, endorserId, endorseeId, categoryId |
| `announcements` | 提醒/公告 | id, userId, kind, payload(json), read, createdAt, emailedAt |
| `citations` | 引用关系 | id, paperId, targetPaperId?, targetDoi?, targetArxivId?, targetTitle?, createdById?, createdAt |

**索引与检索**
- `paper_versions` 上 `to_tsvector('english', title || ' ' || abstract)` 生成 `search_vector`（GIN 索引），支撑拉丁文全文检索。
- `paper_versions` 上加 `pg_trgm` 三元组 GIN 索引 `(coalesce(title,'') || ' ' || coalesce(abstract,'')) gin_trgm_ops`，支撑中文等 CJK 子串/短语检索（无需 zhparser 分词插件）。
- `papers(status, primaryCategoryId, createdAt)` 复合索引支撑列表筛选与排序。
- `comments(paperId, parentId)` 支撑楼中楼。

完整定义见 `src/lib/db/schema.ts`。

---

## 功能模块划分

1. **提交与版本管理**（`services/papers.ts` + `submit`/`edit` 页）
   - 新投稿写入 `papers` + 首个 `paper_versions`（v1），状态 `submitted`。
   - 提交新版本：新增 `paper_versions`（version+1），旧版本永久保留；支持 withdraw（写 withdrawal 原因，内容不可下载）。
2. **检索与筛选**（`services/search.ts` + `/api/search` + `lib/search.ts`）
   - 高级布尔语法：字段限定（`ti:`/`title:`、`abs:`/`abstract:`、`au:`/`author:`、`cat:`/`category:`、`id:`）+ `AND`/`OR`/`NOT` + 括号分组；相邻词隐式 AND。
   - 多语言：拉丁文库 `tsvector`（english/simple）词干匹配，CJK 库 `pg_trgm` 三元组 ILIKE 子串匹配，二者 OR 组合。
   - 分类 + 作者 + 日期区间 + 排序（最新/热门）。返回分页结果。
3. **分类体系**（`services/categories.ts`）— 树形展示，分类详情页列出论文。
4. **作者与机构**（`services/authors.ts`）— 作者主页列出其论文、机构。
5. **评论讨论**（`services/comments.ts` + `/api/papers/[id]/comments`）— 楼中楼，注册用户可评。
6. **订阅与提醒**（`services/subscriptions.ts`）— 订阅分类/作者；新论文进入订阅范围生成 `announcements`。
7. **用户系统**（`lib/auth/*` + `services/users.ts`）— 注册/登录/登出、个人主页、我的投稿。
8. **审核流程**（`services/review.ts` + `/admin/review`）— moderator 可 approve/reject/withdraw；首次投稿需对应分类 endorsement。
9. **API**（`app/api/**`）— 统一 REST，zod 校验，JWT 鉴权写操作。
10. **主题与响应式** — `next-themes` + Tailwind 容器断点。

---

## 核心流程

**投稿 → 审核 → 发布**
```
作者 /submit → 创建 papers(submitted) + paper_versions v1
   ↓ （如需 endorsement：检查 endorsements 或跳过 MVP）
moderator /admin/review → approve → papers.status = approved
   ↓
进入列表/检索/首页；命中订阅者生成 announcements
```

**版本更新**
```
作者 /papers/[id]/edit → 新增 paper_versions v(N+1)，保留 vN
读者详情页默认看最新版，可切到任意历史版本
```

---

## 本地开发

```bash
# 1. 安装依赖（bun 或 npm）
bun install            # 或 npm install

# 2. 准备数据库（PostgreSQL）
docker compose up -d db     # 启动本地 Postgres

# 3. 环境变量
cp .env.example .env        # 填入 AUTH_SECRET（openssl rand -base64 48）

# 4. 迁移 + 种子
bun db:migrate              # 或 npm run db:migrate
bun db:seed                 # 可选：灌入示例数据

# 5. 启动
bun dev                     # http://localhost:3000
```

---

## 数据库迁移与种子

- 迁移由 `drizzle-kit` 生成至 `drizzle/`。
- 生产部署建议在 CI 中执行 `db:migrate`（用直连串 `DATABASE_URL_UNPOOLED`）。
- 种子脚本 `src/lib/db/seed.ts` 写入分类体系与示例论文，便于本地预览。

---

## 部署

### Vercel（首选）
1. 导入仓库 → Framework: Next.js（自动识别）。
2. 环境变量：`DATABASE_URL`（Neon 池化串）、`DATABASE_URL_UNPOOLED`（直连串）、`AUTH_SECRET`。
3. Build Command：`npm run build`；需在构建/部署前跑迁移——可在 `vercel.json` 的 `build` 钩子或 CI 中执行 `npm run db:migrate`。
4. 点击 Deploy。

### Docker（自托管）
```bash
docker compose up -d        # 含 Postgres + Next 服务
```

### CI
`.github/workflows/ci.yml`：install → lint → typecheck → build → db:migrate（preview/prod）。

---

## API 速览

| Method | Path | 说明 | 鉴权 |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | 注册 | 公开 |
| POST | `/api/auth/login` | 登录 | 公开 |
| POST | `/api/auth/logout` | 登出 | 登录 |
| GET | `/api/auth/me` | 当前用户 | 登录 |
| GET | `/api/papers` | 论文列表（分页/筛选） | 公开 |
| POST | `/api/papers` | 新投稿 | 登录 |
| GET | `/api/papers/[id]` | 论文详情 | 公开 |
| GET | `/api/papers/[id]/versions` | 版本列表 | 公开 |
| POST | `/api/papers/[id]/versions` | 提交新版本 | 作者 |
| GET/POST | `/api/papers/[id]/comments` | 评论列表 / 发表 | 公开 / 登录 |
| GET | `/api/search` | 全文检索 | 公开 |
| GET | `/api/categories` | 分类树 | 公开 |
| GET | `/api/authors` | 作者检索 | 公开 |
| GET/POST/DELETE | `/api/subscriptions` | 订阅管理 | 登录 |
| POST | `/api/papers/[id]/moderate` | 审核动作 | moderator |
| GET/POST | `/api/papers/[id]/citations` | 引用列表 / 新增引用 | 公开 / 作者·moderator |
| POST | `/api/papers/[id]/pdf` | 上传并解析 PDF（抽取元数据+参考文献） | 作者 |
| GET | `/api/papers/[id]/pdf/[version]` | 流式下载 PDF | 公开 |
| POST | `/api/admin/ingest` | 批量导入（multipart 多 PDF 或 JSON 元数据） | moderator |
| GET | `/api/admin/stats` | 管理后台统计聚合 | moderator |
| GET | `/api/feed` | 当前用户提醒/RSS | 登录 |

---

## 路线图（已完成）

- [x] **邮件提醒对接 Resend / SMTP** — `lib/email/*`：`EMAIL_PROVIDER` 切换；Resend 走 fetch REST（无需 SDK），SMTP 走 nodemailer。新论文提醒经 `services/feed.ts` 扇出，投递失败不阻塞发布。
- [x] **批量 PDF 解析与元数据抽取（pdf-parse）** — `lib/pdf.ts` + `/api/papers/[id]/pdf` 上传即解析文本/页数，正则抽取参考文献（文献编号 / DOI）并尝试自动关联站内论文；`/api/admin/ingest` 支持批量导入（多 PDF 或 JSON 元数据）。
- [x] **引用图（基于 DOI / 文献编号）** — `citations` 表记录引用关系；`/api/papers/[id]/citations` 提供出/入链；详情页渲染手绘 SVG 关系图（无图表库，符合 P0 规范）。
- [x] **高级布尔检索语法（AND/OR/NOT + 字段限定）** — `lib/search.ts` 递归下降解析器，支持 `ti/abs/au/cat/id` 字段限定与括号分组。
- [x] **多语言全文检索（中文分词）** — 拉丁文走 `tsvector`，中文等 CJK 走 `pg_trgm` 三元组 ILIKE（无需 zhparser 分词插件）；二者 OR 组合保证中英混合查询可用。
- [x] **管理后台统计面板** — `/admin/stats` + `/api/admin/stats`：总量/按状态/按分类 Top10/近 14 天投稿趋势/Top 作者等聚合，手绘 SVG 柱状图。

---

Copyright 2026 The Papex Authors — Licensed under Apache-2.0.
