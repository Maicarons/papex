---
title: papex-desktop 开发方案（桌面端）
---

# papex-desktop 开发方案（评审稿 v0.2）

> 项目：`papex-desktop` — Papex 桌面科研工作平台（Windows / Linux / macOS）
> 本文档为**开发方案**，评审通过后按其编写全部项目代码。
> 关联：papex（后端，`github.com/Maicarons/papex`）· 姊妹项目 papex-app（移动端，方案见 `docs/development/papex-app.md`）

---

## 1. 方案总览

| 项目 | 内容 |
|---|---|
| 仓库 | `github.com/Maicarons/papex-desktop`（独立仓库） |
| License | Apache-2.0（与 papex 一致，Copyright 2026 The Papex Authors） |
| 技术栈 | Tauri 2.x（Rust + 系统 WebView）+ Vite + React 19 + TypeScript |
| 功能范围 | P0–P3 全部实现；**admin 端功能不实现**；**必须包含文件/图片上传**（§6.3） |
| 交付物 | 完整代码 + 单测/E2E/多端联动测试 + 双语 README + 项目记忆 |
| 阻塞依赖 | papex 后端新增 tokens/refresh、devices、reading-progress、notes、avatar 接口（同移动端契约） |

**评审要点（请重点确认）**：
1. §6.3 文件/图片上传功能设计（PDF 投稿、本地 PDF 导入、头像、论文封面）是否覆盖需求；
2. §7 tokens 系统与移动端同一契约，设备维度是否含 desktop 平台；
3. P0–P3 功能范围（§2.2）是否有增删；
4. Rust 侧边界（§3/§4）与本地 SQLite + tantivy 方案是否接受。

---

## 2. 项目定位与功能范围

### 2.1 定位

桌面端是 papex 的**科研工作平台**：本地优先的文献库 + PDF 深度阅读 + 批注闭环 + 引用管理 + 离线全文索引。**不实现**：投稿审核后台、管理后台、协审工作流。

### 2.2 功能范围（P0–P3 全量，全部实现）

| 优先级 | 模块 | 功能点 |
|---|---|---|
| **P0** | 认证 | 登录/登出/多账号（token 入系统钥匙串） |
| **P0** | 文献库 | 三栏布局（分类树 257 双语/列表/详情）、筛选排序分页、收藏/订阅/标签双向同步 |
| **P0** | 检索 | 在线关键词 + 语义检索（`/api/search?semantic=1`） |
| **P0** | 阅读器 | pdf.js 内嵌阅读：翻页/缩放/搜索/书签/进度记忆/深色反色 |
| **P0** | 标注 | 文本高亮（多色）+ 文本笔记；本地 SQLite 即时 + 云端同步 |
| **P0** | 同步 | 标注/进度云同步（sync_queue 失败重试） |
| **P0** | 离线 | 已读 PDF 本地缓存；离线打开；缓存管理（上限/清理） |
| **P0** | 图谱 | 交互式引文图谱（ECharts，复用网页端逻辑） |
| **P0** | 通知 | 订阅新论文系统通知（tauri-plugin-notification） |
| **P0** | 平台 | 托盘、全局快捷键（Ctrl/Cmd+K 全局搜索）、单实例锁、深色跟随系统 |
| **P1** | 引用 | CSL 引用生成（GB/T 7714/APA/MLA 等 ≥10 样式）、BibTeX/RIS 导出 |
| **P1** | 写作 | LaTeX 集成：`\cite{key}` 与参考文献块（对接 papex-latex） |
| **P1** | 文献库 | 保存的搜索（智能文件夹）、批量标签管理 |
| **P1** | 统计 | 阅读时长/分类分布/Top 引用（ECharts） |
| **P1** | 阅读器 | 双栏对比阅读 |
| **P1** | 上传 | **PDF 投稿上传**（复用 `/api/papers` multipart + `/api/papers/[id]/pdf`） |
| **P1** | 上传 | **本地 PDF 导入**：拖入解析元数据（pdfium）→ 上传服务器或仅存本地库 |
| **P1** | 上传 | **头像上传**（`/api/me/avatar`）、**论文封面上传**（`/api/papers/[id]/cover`） |
| **P2** | 索引 | tantivy 本地全文索引（标题/摘要/全文），离线毫秒检索 |
| **P2** | 协作 | 协审/背书/评论聚合视图（只读+快捷操作） |
| **P2** | 体验 | 阅读统计报表、键盘快捷键面板、首次启动引导 |
| **P3** | 语义 | 可选本地 embedding（Ollama）离线语义检索 |
| **P3** | 插件 | 插件系统雏形（脚本/外挂加载，借鉴 Zotero） |
| **P3** | 写作 | Word 集成评估（Word 加载项，P3 末定） |
| — | **排除** | 投稿审核、admin/管理后台、协审工作流 |

### 2.3 上传功能明细（硬性要求）

| 上传项 | 触发 | 通道 | 后端端点 |
|---|---|---|---|
| PDF 投稿 | 「投稿」向导：填元数据 + 选 PDF | multipart | `POST /api/papers`（含 pdf 字段）→ `POST /api/papers/[id]/pdf`（追加版本） |
| 本地 PDF 导入 | 拖放/文件选择 | Rust 解析 → 上传 | `POST /api/papers/import` + `/api/papers/[id]/pdf` |
| 头像 | 设置页选择图片（裁剪方形） | multipart | `POST /api/me/avatar`（≤5MB, png/jpg/webp, 服务端转存） |
| 论文封面 | 详情页上传封面 | multipart | `POST /api/papers/[id]/cover`（≤10MB） |
| 笔记配图（P2） | 笔记面板插图 | multipart | `POST /api/notes/[id]/attachment` |

上传组件统一：前端选择/拖放 → Tauri 校验（大小/类型/MIME）→ 直传后端（不走本地缓存）→ 进度条 + 失败重试；所有上传走同一 `upload.ts` 封装。

---

## 3. 技术选型（含理由）

| 层 | 选型 | 版本 | 选型理由 |
|---|---|---|---|
| 桌面壳 | Tauri 2.x | 2.11+ | 5–15MB 包、30–50MB 内存、常驻型应用体感最佳；capability 白名单安全默认 |
| 后端语言 | Rust | 2021 edition | PDF 解析/索引/SQLite/钥匙串/更新等原生能力；Tauri 生态成熟 |
| 前端 | Vite + React | 6+/19 | 复用 papex React/Tailwind 资产；非 Next.js（SSR/RSC 桌面无用） |
| UI | Tailwind CSS 4 + shadcn 风格 | 4 | 与网页端设计令牌同源；`@tailwindcss/vite` |
| 图表 | ECharts 6 | 6 | 引文图谱/统计；复用网页端配置与交互 |
| PDF 渲染 | pdfjs-dist | 4.x | 前端渲染；文本层用于高亮定位 |
| PDF 解析 | pdfium-render (Rust) | 最新 | 导入时提取元数据/文本 |
| 本地库 | SQLite（rusqlite） | 最新 | papex_local.db：缓存/标注/进度/同步队列 |
| 全文索引 | tantivy (Rust) | 0.22+ | 本地倒排索引，毫秒级离线检索（P2） |
| 钥匙串 | keyring (Rust) | 最新 | macOS Keychain / Win CredMan / Linux SecretService |
| 状态 | Zustand | v5 | 与网页端一致 |
| 网络 | 自研 fetch client | — | 与移动端同一契约（tokens 系统） |
| 类型 | openapi-typescript | 最新 | 从 papex openapi.json 生成 |
| 更新 | tauri-plugin-updater | 官方 | 全量包 + 签名清单，GitHub Releases 托管 |
| 测试 | Vitest（前端）+ cargo test（Rust）+ Playwright（可选 E2E） | — | 分语言测试，CI 矩阵 |
| 包管理 | pnpm | 9+ | monorepo 结构（前端 + src-tauri） |

> **WebView 兼容约束**：WebView2（Chromium 124+）/ WKWebView（Safari 17+）/ WebKitGTK 2.44+；开发期 Chromium 验证，发布前三平台视觉回归。

---

## 4. 系统架构

### 4.1 架构图

```
┌────────────────────────────────────────────────────────────┐
│  papex-desktop (Tauri 2)                                   │
│  ┌─────────────────────────┐   ┌─────────────────────────┐  │
│  │  Frontend (Vite+React)  │◄──│  Rust backend           │  │
│  │  三栏文献库 / 阅读器      │   │  commands: pdf/index/  │  │
│  │  标注层 / 引用 / 图谱     │   │  db/keyring/upload/    │  │
│  │  lib/api (tokens client)│   │  sync/updater          │  │
│  └───────────┬─────────────┘   └─────┬───────────────────┘  │
│              │ invoke(类型安全 bridge.ts)                    │
│              ▼                        ▼                     │
│  SQLite(papex_local.db)      tantivy 索引(可选 P2)          │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS + Bearer Token
┌──────────────────────────────▼──────────────────────────────┐
│  papex 后端 (Next.js API + Drizzle + PostgreSQL)             │
│  + 新增: /api/auth/refresh · devices · reading-progress      │
│         notes · avatar · cover · import                      │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 目录结构（完整）

```
papex-desktop/
├── src/                            # 前端（Vite + React 19）
│   ├── app/
│   │   ├── routes.tsx              # react-router v7 路由
│   │   ├── layout/                 # 三栏布局、托盘菜单联动、快捷键注册
│   │   └── providers.tsx           # I18n/Theme/Session/Toast
│   ├── features/
│   │   ├── library/                # 分类树/列表/详情/筛选/智能文件夹
│   │   ├── reader/                 # PDF 阅读器 + 高亮层 + 批注抽屉
│   │   ├── citations/              # CSL 生成 / BibTeX / LaTeX 插入
│   │   ├── graph/                  # 引文图谱（ECharts）
│   │   ├── stats/                  # 阅读统计（ECharts）
│   │   ├── upload/                 # 投稿向导 / PDF 导入 / 头像 / 封面（upload.ts）
│   │   ├── sync/                   # 同步状态面板
│   │   └── settings/               # 账号/存储/快捷键/主题/更新
│   ├── lib/
│   │   ├── api/                    # client.ts / auth-refresh.ts / errors.ts（同移动端契约）
│   │   ├── tauri/                  # bridge.ts（invoke 类型化封装）
│   │   ├── storage/                # PDF 缓存目录管理、local meta 读写
│   │   ├── citations/              # CSL 样式加载与渲染（citeproc-js）
│   │   └── theme/                  # 设计令牌（深浅两套）
│   ├── components/                 # PaperCard / AnnotationLayer / CitationPicker ...
│   └── stores/                     # sessionStore / libraryStore / readerStore / syncStore
├── src-tauri/
│   ├── src/
│   │   ├── main.rs / lib.rs        # 入口、插件注册（updater/notification/single-instance）
│   │   ├── commands/
│   │   │   ├── pdf.rs              # pdf:parse（导入元数据/文本提取）
│   │   │   ├── db.rs               # db:query_library / db:annotations CRUD
│   │   │   ├── index.rs            # indexer:search（P2 tantivy）
│   │   │   ├── keyring.rs          # keyring:get/set/delete
│   │   │   ├── upload.rs           # upload:validate（类型/大小校验）
│   │   │   └── system.rs           # 托盘/快捷键/单实例回调
│   │   ├── db/
│   │   │   ├── migrations.rs       # 版本化迁移（embedded SQL）
│   │   │   ├── dao_papers.rs / dao_annotations.rs / dao_sync.rs
│   │   │   └── schema.rs
│   │   ├── indexer/                # tantivy 索引构建/查询（P2）
│   │   └── sync/                   # 同步队列（reqwest + 指数退避）
│   ├── capabilities/default.json   # 权限白名单（最小授权）
│   ├── tauri.conf.json
│   └── Cargo.toml
├── scripts/
│   ├── gen-types.sh / sync-i18n.sh / sync-readme.sh
│   └── build-{win|linux|mac}.sh    # 三平台打包 + 签名 + 生成 latest.json
├── e2e/                            # Playwright（可连真实后端）
├── .github/workflows/
│   ├── ci.yml                      # tsc + vitest + cargo test + clippy
│   ├── build.yml                   # 三平台构建（矩阵）+ 产物上传
│   └── release.yml                 # tag v* → 构建 + 签名 + GitHub Release + updater 清单
├── LICENSE / README.md / README_zh.md
└── package.json / pnpm-workspace.yaml
```

### 4.3 前端 ↔ Rust 边界（invoke 契约）

```
invoke("pdf:parse", { path })        → { title?, authors?, pages, textPreview? }
invoke("db:query_library", { filter }) → PaperRow[]
invoke("db:annotations", { paperId, version }) → Annotation[]
invoke("indexer:search", { q, limit }) → Hit[]
invoke("keyring:get", { service, user }) → Secret | null
invoke("upload:validate", { path, kind }) → { ok, size, mime } | { error }
invoke("sync:run") / invoke("sync:status") → 同步状态
```

前端**永不直接碰文件系统**；原生能力全部经 bridge.ts 类型化封装（Rust 侧 serde 校验输入，路径统一 `app_cache_dir()` 防止穿越）。

### 4.4 本地数据库（papex_local.db，SQLite 迁移式）

```
papers_cache(id TEXT PK, title, abstract, category, status, latest_version, fetched_at)
versions_cache(paper_id, version, pdf_path_local, size, fetched_at)
annotations(id TEXT PK, paper_id, version, kind, page, rect_json, color, content,
            created_at, updated_at, deleted_at, sync_state)   -- sync_state: local|pending|synced|conflict
reading_progress(paper_id PK, version, page, percent, updated_at, sync_state)
collections(id, name, parent_id)          -- 本地收藏夹（V2）
sync_queue(id PK, kind, payload_json, retry_count, next_retry_at)
settings(key PK, value)
```

冲突策略（MVP）：last-write-wins + `updated_at` 版本号；冲突行标记 `conflict`，UI 提示用户保留其一（P2 再评估合并）。

---

## 5. 数据模型（与后端契约）

- 复用 papex 服务端表（papers/paper_versions/categories/citations/endorsements/bookmarks/subscriptions/messages/tickets）；
- 新增后端表（与移动端同一契约）：`devices`、`reading_progress`、`notes`；
- 新增后端表（桌面端独有需求）：`paper_covers`（论文封面，`paper_id fk, url, uploaded_at`）或复用 paper_versions 增列 `cover_url`；`user_avatars` 或 users 增列 `avatar_url`——**由 papex 主仓库排期落地，本仓库只消费接口**。

---

## 6. 接口定义

### 6.1 复用 papex 现有 API（同移动端清单）

认证、论文、版本、PDF 流式、检索、分类、收藏、订阅、背书、消息、工单、反馈、API Key——全复用。

### 6.2 需要 papex 后端新增的接口（与移动端共享契约）

```
POST /api/auth/login            # App 模式返回 { accessToken, refreshToken, deviceId }
POST /api/auth/refresh          # 轮换刷新
POST /api/auth/logout           # 撤销当前设备
GET/DELETE /api/me/devices(/:id)
GET/PUT /api/reading-progress/[paperId]
GET/POST/PUT/DELETE /api/notes
POST /api/me/avatar             # multipart ≤5MB
POST /api/papers/[id]/cover     # multipart ≤10MB（新）
```

### 6.3 上传通道明细

| 上传 | 前端 | Rust | 后端 |
|---|---|---|---|
| PDF 投稿/版本 | 拖放/选择 → 校验 | `upload:validate` | `POST /api/papers`（multipart）/ `POST /api/papers/[id]/pdf` |
| PDF 导入 | 拖放 | `pdf:parse` 提取元数据 → 用户确认 → 上传 | `POST /api/papers/import` |
| 头像 | 选择 → 预览裁剪 | 校验类型/大小 | `POST /api/me/avatar` |
| 封面 | 选择 → 预览 | 校验 | `POST /api/papers/[id]/cover` |

统一进度/失败重试：`features/upload/upload.ts`（Tauri 端直连后端 fetch，带进度事件回调）。

---

## 7. Tokens 系统设计（完整，与移动端同一契约）

> 六要素：认证、授权、配额、刷新、校验、持久化。

### 7.1 Token 结构

```
accessToken  JWT HS256: { sub, role, perms[], iat, exp(15min), jti }   # Authorization: Bearer
refreshToken 256bit opaque；服务端存 SHA-256 哈希于 devices.refresh_token_hash
```

### 7.2 认证时序（与移动端一致）

登录（含 `deviceName`/`platform: "desktop"`/`fingerprint`）→ 服务端签发 token 对 + upsert devices → 客户端存系统钥匙串（keyring crate：macOS Keychain / Windows CredMan / Linux SecretService，Linux 无桌面环境回退加密文件 0600）→ MMKV/本地 settings 存脱敏会话。

### 7.3 授权

- accessToken 内嵌 `perms`（papex `auth/permissions.ts` 解析结果打包）；
- 客户端仅用于 UI 显隐；服务端 RBAC 中间件是唯一权威；
- 桌面端独有：本地命令（db/index/upload）不依赖 token，但**云操作**（收藏/订阅/同步）强制走 API token。

### 7.4 配额

- 服务端 papex rate-limit（API 120/min，认证 10/min）；
- 客户端 429 → 指数退避 + jitter，UI 提示；同步队列天然错峰；
- 本地读操作（缓存/索引）不受限。

### 7.5 刷新与校验（单飞锁 + 轮换）

```
401 → 队列化单飞刷新（并发请求共享一次 refresh）
  成功 → 新 accessToken + 新 refreshToken(轮换) → 重放
  失败 → 清会话 → 跳登录
服务端校验: access 验签+exp；refresh 查 devices 哈希+未撤销 → 签发新对 → 旧 refresh 立即失效
设备撤销: revoked_at=now() → 该设备 refresh 全失效；access ≤15min 自然过期
```

### 7.6 持久化

| 平台 | 存储 |
|---|---|
| Windows | Credential Manager（keyring wincred） |
| macOS | Keychain（Security.framework） |
| Linux | SecretService（libsecret）；无桌面环境回退加密文件（0600） |

安全基线：refreshToken 永不落 SQLite/日志；仅 HTTPS；capabilities 白名单最小授权；CSP 收紧（不加载远程脚本）；`app_cache_dir()` 统一路径防穿越。

### 7.7 多账号

- keyring 按 `service:"papex-desktop"` + `user:"{userId}"` 分别名存 token；
- 本地 settings 存会话元数据列表（≤5）；切换 = 换别名；登出 = `/api/auth/logout` 撤销设备 + 清本地会话（保留元数据快速登录）。

---

## 8. i18n 方案

- **i18next + react-i18next**（前端）+ Rust 侧仅输出错误码（`AppError{code, params}`），前端映射 i18n key；
- 默认 zh；`settings.lang` 持久化；系统语言兜底；
- 字典同步：`scripts/sync-i18n.sh`（源：papex `src/i18n` + 本仓 `src/i18n/desktop/*.json` 追加命名空间：`reader/annotations/citations/stats/upload`）；
- 错误消息：后端错误码 → 前端 key；HTTP 状态码兜底；
- UI 文案全部 `t()`；无硬编码；`Intl` 格式化时间/数字。

---

## 9. 测试策略

### 9.1 单元测试

| 目标 | 框架 | 用例数(估) | 覆盖 |
|---|---|---|---|
| `lib/api/*` | Vitest | ~25 | token 注入/401 刷新/429 退避/错误归一化 |
| `lib/tauri/bridge.ts` | Vitest | ~15 | invoke mock、参数校验 |
| `lib/citations/*` | Vitest | ~12 | CSL 样式渲染、BibTeX 序列化 |
| `features/reader/*` | Vitest | ~20 | 高亮层坐标计算、批注模型、进度 |
| `features/upload/*` | Vitest | ~10 | 校验/进度/重试 |
| `stores/*` | Vitest | ~12 | session/library/sync 状态流 |
| Rust `commands/*` | cargo test | ~20 | pdf 解析、db DAO、keyring mock、sync 队列、上传校验 |
| Rust `indexer/*` | cargo test | ~8 | tantivy 构建/查询 |

运行：`npm test`（Vitest）+ `cargo test`；门槛：前端语句覆盖 ≥80%，Rust 关键模块 ≥85%；`cargo clippy -- -D warnings` CI 强制。

### 9.2 E2E（Playwright + Tauri WebView 可测模式）

场景（连真实 papex 后端 + 本地 SQLite）：
1. 登录 → 三栏加载 → 列表/详情；
2. 在线检索 → 打开 PDF → 翻页/缩放 → 进度记忆（重启应用后恢复）；
3. 文本高亮 → 批注 → 重启 → 标注仍在 → 云同步状态 synced；
4. 收藏/订阅 → 断开网络 → 离线打开已读 PDF；
5. 投稿向导 → 上传 PDF（mock 后端收包校验 multipart 字段）→ 成功回调；
6. 头像上传 → 封面上传 → 服务端可访问。

运行：`npm run e2e`（起后端 `papex` dev + 本应用，Playwright 驱动 WebView 的 dev 模式）；CI 三平台矩阵跑冒烟子集。

### 9.3 多端联动测试（与 papex-app 共享契约）

1. 桌面高亮 → 移动端详情可见标注数（notes 接口）；
2. 桌面更新进度 → 移动端续读页码一致（reading-progress）；
3. 移动端收藏 → 桌面收藏列表同步；
4. 设备撤销（移动端撤销桌面设备）→ 桌面下次请求 401 → 跳登录。

运行：`scripts/e2e-cross.sh`（papex 仓库维护；起 docker db + dev server + 测试账号 `desktop-e2e`/`cross-e2e`）。

### 9.4 测试数据

复用 papex `db:seed` + 3 个联动账号（`app-e2e`/`desktop-e2e`/`cross-e2e`，`password123`）+ 5 篇固定 ID 论文；`e2e/fixtures/` 内置 2 个样本 PDF（标题/页数已知，断言解析结果）。

---

## 10. 平台集成与发布

| 平台 | 产物 | 签名/公证 | 分发 |
|---|---|---|---|
| Windows | NSIS/MSI | 代码签名证书（OV/EV） | 官网下载 + winget（可选） |
| macOS | .dmg | Developer ID + notarization | 官网 + App Store（可选） |
| Linux | .deb / AppImage / .rpm | 无强要求 | 官网 + 发行版源（后续） |

- 自动更新：tauri-plugin-updater，GitHub Releases 托管全量包 + `latest.json`（签名），启动静默检查 + 手动检查；
- CI：`ci.yml`（tsc+vitest+cargo）→ `build.yml`（三平台矩阵产物）→ `release.yml`（tag `v*`：构建+签名+Release+更新清单）；
- 语义化版本 `0.x.0`；与 papex 发布节奏解耦。

---

## 11. 风险与已知问题

| 风险 | 等级 | 对策 |
|---|---|---|
| 三平台 WebView 渲染差异（ECharts/pdf.js） | 中 | 锁定最低内核版本；发布前视觉回归清单 |
| Linux WebKitGTK 兼容怪癖 | 中 | 保守 CSS；AppImage 优先 |
| 高亮层自绘工作量 | 中 | 分层：文本高亮（pdf.js text layer）→ 矩形/手绘（P2） |
| 后端新接口未按期交付 | 高（阻塞 P0 同步） | API Key 先打通；本地 SQLite 先行（离线可用）再补云同步 |
| 签名/公证/更新密钥成本 | 中 | M0 建发布流水线；密钥规范 |
| Rust 编译/学习成本 | 低 | Rust 保持薄（原生能力）；前端 80% 工作量 |

**已知问题（记录在项目记忆）**：Linux 下 keyring 依赖 SecretService，无桌面环境需回退路径；WebKitGTK 的 pdf.js worker 加载需本地打包；RNOH（移动端）与桌面端共享后端契约，接口变更需同步 `gen-types`。

---

## 12. GitHub 发布与文档

1. 仓库 `Maicarons/papex-desktop`，license **Apache-2.0**（拷贝 papex LICENSE，保留 Copyright 2026 The Papex Authors）；
2. `README.md`（英文）/ `README_zh.md`（中文）：徽章（License/CI/平台/版本）、功能矩阵、截图占位、安装（三平台）、开发（本地运行）、测试、打包/部署、贡献、致谢；源文件维护于 `papex/docs/projects/papex-desktop/`，发布时拷贝仓库根；
3. papex README/README_zh 增加「官方客户端」段落链接两仓库；
4. `docs/development/papex-desktop.md`（本方案）归档于 papex docs。

---

## 13. 里程碑与验收

| 里程碑 | 内容 | 验收 |
|---|---|---|
| M0 基建（2–3 周） | Tauri 三平台跑通、bridge 契约、API client、tokens 联调、CI | 三平台登录浏览；ci 全绿 |
| M1 MVP（6–8 周） | P0 全部（阅读器+标注+缓存+同步+上传基础） | 三平台安装包；核心闭环可用 |
| M2 平台化（5–6 周） | P1 全部（引用/BibTeX/LaTeX/导入/头像封面/统计） | 科研工作平台完整可用 |
| M3 发布（2–3 周） | 签名/公证/自动更新/官网下载 | 三平台正式版 + 更新链路 |
| M4 进阶 | P2–P3（索引/语义/插件） | 迭代发布 |

**M1 验收口径**：三平台安装后登录 → 浏览/检索/读 PDF/高亮笔记本地持久 → 离线缓存可读 → 上传（PDF 投稿/头像）可用 → 托盘/快捷键/通知可用 → 自动更新链路（内测）打通。

---

## 14. 记忆留存与新会话续接

- 项目根 `.workbuddy/memory/2026-08-18.md` 已写入：架构、tokens 契约、后端接口依赖、上传设计、本地库 schema、待办（M0 起）、已知问题、决策记录——新会话打开即读续接；
- 每次里程碑结束追加当日日志。
