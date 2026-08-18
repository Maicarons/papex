# Papex App

> Papex 学术文献平台官方移动端 — Android · HarmonyOS · iOS

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20HarmonyOS%20%7C%20iOS-lightgrey.svg)]()
[![React Native](https://img.shields.io/badge/React%20Native-0.82-61dafb.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Papex App 是开源学术文献平台 [Papex](https://github.com/Maicarons/papex) 的官方移动客户端，定位为**网页版的移动替代品**：随时随地读论文、管账号、追更新。

基于 **React Native 0.82 + RNOH 0.82.30**（鸿蒙适配），Android / HarmonyOS / iOS 三端一套代码（约 95% 业务代码共享）。

> ⚠️ **依赖**：本 App 消费 Papex 服务端 API。请先部署 [Papex 后端](https://github.com/Maicarons/papex)。

---

## 功能

| 优先级 | 功能 | 状态 |
| --- | --- | --- |
| P0 | 登录/注册/登出、多账号切换、设备管理（远程撤销） | 规划中 |
| P0 | 首页信息流、分类树（257 个双语分类）、分页加载 | 规划中 |
| P0 | 关键词检索 + 语义检索（`/api/search?semantic=1`） | 规划中 |
| P0 | 论文详情、版本切换、PDF 阅读（记住进度） | 规划中 |
| P0 | 收藏、订阅、站内信/工单/反馈 | 规划中 |
| P0 | 个人主页、背书、双语 UI（中/英）、深色模式 | 规划中 |
| P1 | PDF 离线下载、元数据缓存、离线浏览 | 规划中 |
| P1 | 阅读进度跨设备同步、推送通知（FCM/APNs/PushKit） | 规划中 |
| P1 | 生物识别解锁、API Key 管理、骨架屏/错误态/空态 | 规划中 |
| P2 | 评论、背书、为你推荐、系统分享、阅读统计 | 规划中 |
| P3 | 扫码登录（网页 ↔ App）、平板布局、批注只读查看 | 规划中 |

> 管理/审核类功能在移动端**有意不做**——请使用网页版。

---

## 支持平台

| 平台 | 渠道 | 状态 |
| --- | --- | --- |
| Android（minSdk 24+） | Google Play / 国内商店 | 规划中 |
| iOS（15+） | App Store | 规划中 |
| HarmonyOS（API 12+） | 华为应用市场（AppGallery） | 规划中 |

---

## 安装

### 直接安装

发布后可从 [Releases](https://github.com/Maicarons/papex-app/releases) 或各应用商店下载安装。

### 源码构建

前置要求：

- Node.js 20+
- Android：Android SDK（minSdk 24）
- iOS：macOS + Xcode 15+
- 鸿蒙：DevEco Studio 5.x（API 12+）+ AGC 工程

```bash
git clone https://github.com/Maicarons/papex-app.git
cd papex-app
npm install

# 从 Papex 服务端 OpenAPI 文档生成类型
npm run gen:types

# 配置 API 地址
cp .env.example .env

# Android 运行
npm run android

# iOS 运行（仅 macOS）
cd ios && pod install && cd ..
npm run ios

# 鸿蒙运行：用 DevEco Studio 打开 harmony/，配置 AGC 签名后在真机/模拟器运行
```

环境变量（`.env`）：

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `API_BASE_URL` | Papex 服务端地址 | `https://api.papex.example.com` |
| `PUSH_ENABLED` | 是否启用推送注册 | `true` |
| `I18N_FALLBACK` | 兜底语言 | `zh` |

---

## 开发

```bash
npm run lint          # eslint
npm run typecheck     # tsc --noEmit
npm test              # 单元测试（Jest + RNTL，含覆盖率）
npm run e2e:ios       # Detox E2E（iOS 模拟器）
npm run e2e:android   # Detox E2E（Android 模拟器）
npm run gen:types     # 重新生成 API 类型
npm run sync:i18n     # 从 Papex 仓库同步中英文字典
```

测试覆盖：核心模块（`lib/api`、`lib/security`、`lib/storage`、stores）单元测试语句覆盖 ≥80%；E2E 覆盖 P0 主流程（登录→浏览→阅读→收藏→订阅→设备管理）。跨端联动场景与桌面客户端一起覆盖（详见[开发方案](https://github.com/Maicarons/papex/blob/main/docs/development/papex-app.md)）。

---

## 架构要点

- **认证**：access token（JWT，15 分钟）+ refresh token（30 天，轮换，设备绑定）。token 存系统安全存储：iOS Keychain / Android Keystore / 鸿蒙 HUKS。
- **数据**：MMKV 存会话/偏好/缓存；PDF 文件缓存于应用沙盒，LRU 淘汰。
- **i18n**：i18next，中英文字典从 Papex 仓库同步。
- **类型**：从 Papex 服务端 `openapi.json` 生成，禁止手写。

完整开发方案见 Papex 仓库 [`docs/development/papex-app.md`](https://github.com/Maicarons/papex/blob/main/docs/development/papex-app.md)。

---

## 相关项目

- [Papex](https://github.com/Maicarons/papex) — 后端平台（Next.js + PostgreSQL）
- [Papex Desktop](https://github.com/Maicarons/papex-desktop) — 桌面科研工作平台（Tauri 2）

---

## License

[Apache-2.0](LICENSE) — Copyright 2026 The Papex Authors.
