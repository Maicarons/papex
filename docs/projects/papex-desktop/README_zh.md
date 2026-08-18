# Papex Desktop

> Papex 学术文献平台桌面科研工作平台 — Windows · Linux · macOS

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)]()
[![Tauri](https://img.shields.io/badge/Tauri-2.x-24c8db.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Papex Desktop 把开源学术文献平台 [Papex](https://github.com/Maicarons/papex) 变成常驻桌面的**科研工作平台**：本地优先的文献库、带高亮与笔记的深度 PDF 阅读、引用管理、离线全文检索与云同步。

基于 **Tauri 2.x**（Rust 内核 + 系统 WebView）与 **Vite + React 19**，原生级轻量安装包（约 5–15 MB，内存 30–50 MB）。

> ⚠️ **依赖**：本应用消费 Papex 服务端 API。请先部署 [Papex 后端](https://github.com/Maicarons/papex)。

---

## 功能

| 优先级 | 功能 | 状态 |
| --- | --- | --- |
| P0 | 登录/登出/多账号（token 存系统钥匙串） | 规划中 |
| P0 | 三栏文献库：257 个双语分类 / 列表 / 详情，筛选与排序 | 规划中 |
| P0 | 在线关键词 + 语义检索（`/api/search?semantic=1`） | 规划中 |
| P0 | PDF 阅读器（pdf.js）：翻页/缩放/搜索/书签/进度/深色反色 | 规划中 |
| P0 | 多色高亮 + 文本笔记，本地 SQLite + 云端同步 | 规划中 |
| P0 | 离线 PDF 缓存、离线阅读、缓存管理 | 规划中 |
| P0 | 交互式引文图谱（ECharts）、订阅新论文系统通知 | 规划中 |
| P0 | 系统托盘、全局快捷键（Ctrl/Cmd+K）、单实例锁 | 规划中 |
| P1 | 引用生成（CSL：GB/T 7714、APA、MLA 等）、BibTeX/RIS 导出 | 规划中 |
| P1 | LaTeX 集成（`\cite{key}` + 参考文献块，对接 papex-latex） | 规划中 |
| P1 | **文件与图片上传**：论文投稿、本地 PDF 导入、头像、论文封面 | 规划中 |
| P1 | 保存的搜索（智能文件夹）、批量标签、阅读统计、双栏对比阅读 | 规划中 |
| P2 | 本地全文索引（tantivy），离线毫秒级检索 | 规划中 |
| P2 | 协作视图（协审/背书/评论，只读） | 规划中 |
| P3 | 可选本地 embedding（Ollama）离线语义检索、插件系统雏形 | 规划中 |

> 管理/审核类功能在桌面端**有意不做**——请使用网页版。

---

## 支持平台

| 平台 | 产物 | 渠道 |
| --- | --- | --- |
| Windows 10+ | NSIS / MSI | 官网下载 + winget（可选） |
| macOS 11+ | .dmg（Developer ID + 公证） | 官网 + App Store（可选） |
| Linux（WebKitGTK 2.44+） | .deb / AppImage / .rpm | 官网 + 发行版源（后续） |

---

## 安装

### 直接安装

发布后从 [Releases](https://github.com/Maicarons/papex-desktop/releases) 下载对应平台安装包即可。

### 源码构建

前置要求：

- Node.js 20+ 与 pnpm 9+
- Rust 工具链（stable）
- Windows：WebView2（Win10/11 预装）；Linux：见下方依赖

```bash
git clone https://github.com/Maicarons/papex-desktop.git
cd papex-desktop
pnpm install

# 从 Papex 服务端 OpenAPI 文档生成类型
pnpm gen:types

# 配置 API 地址
cp .env.example .env

# 开发（前端 HMR + Tauri 窗口）
pnpm tauri dev

# 构建当前平台产物
pnpm tauri build
```

Linux 依赖（Debian/Ubuntu）：

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

环境变量（`.env`）：

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `API_BASE_URL` | Papex 服务端地址 | `https://api.papex.example.com` |
| `I18N_FALLBACK` | 兜底语言 | `zh` |
| `CACHE_LIMIT_MB` | 本地 PDF 缓存上限（MB） | `2048` |

---

## 开发

```bash
pnpm lint            # eslint
pnpm typecheck       # tsc --noEmit
pnpm test            # 前端单元测试（Vitest，含覆盖率）
cargo test           # Rust 单元测试（src-tauri 内）
cargo clippy         # Rust 静态检查（CI 强制 -D warnings）
pnpm e2e             # Playwright E2E（连本地 Papex 后端）
pnpm gen:types       # 重新生成 API 类型
pnpm sync:i18n       # 从 Papex 仓库同步中英文字典
```

测试覆盖：前端核心模块语句覆盖 ≥80%；Rust `commands/*`、`db/*`、`indexer/*` ≥85%；E2E 覆盖 P0 主流程（登录→文献库→阅读→标注→离线→上传）。跨端联动场景（桌面↔移动↔网页）与移动端一起覆盖——详见[开发方案](https://github.com/Maicarons/papex/blob/main/docs/development/papex-desktop.md)。

---

## 架构要点

- **认证**：access token（JWT，15 分钟）+ refresh token（30 天，轮换，设备绑定）。token 存系统钥匙串：Windows 凭据管理器 / macOS Keychain / Linux Secret Service（文件回退）。
- **本地优先**：SQLite `papex_local.db` 存缓存/标注/进度/同步队列；tantivy 做离线全文索引（P2）。
- **上传**：PDF 投稿与导入、头像、论文封面——Rust 侧校验，直传 Papex 服务端，带进度与重试。
- **类型**：从 Papex 服务端 `openapi.json` 生成，禁止手写。

完整开发方案见 Papex 仓库 [`docs/development/papex-desktop.md`](https://github.com/Maicarons/papex/blob/main/docs/development/papex-desktop.md)。

---

## 相关项目

- [Papex](https://github.com/Maicarons/papex) — 后端平台（Next.js + PostgreSQL）
- [Papex App](https://github.com/Maicarons/papex-app) — 官方移动端（React Native + RNOH）

---

## License

[Apache-2.0](LICENSE) — Copyright 2026 The Papex Authors.
