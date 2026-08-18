---
title: papex-app 开发方案（移动端）
---

# papex-app 开发方案（评审稿 v0.2）

> 项目：`papex-app` — Papex 学术文献平台官方移动端（Android / HarmonyOS / iOS）
> 本文档为**开发方案**，评审通过后按其编写全部项目代码。
> 关联：papex（后端，`github.com/Maicarons/papex`）· 姊妹项目 papex-desktop（桌面端，方案见 `docs/development/papex-desktop.md`）

---

## 1. 方案总览

| 项目 | 内容 |
|---|---|
| 仓库 | `github.com/Maicarons/papex-app`（独立仓库） |
| License | Apache-2.0（与 papex 一致，Copyright 2026 The Papex Authors） |
| 技术栈 | React Native 0.82 + RNOH 0.82.30（鸿蒙适配）+ TypeScript |
| 功能范围 | P0–P3 全部实现；**admin 端功能不实现** |
| 交付物 | 完整代码 + 单测/E2E/多端联动测试 + 双语 README + 项目记忆 |
| 阻塞依赖 | papex 后端新增 tokens/refresh、devices、reading-progress、notes 接口（见 §6.2） |

**评审要点（请重点确认）**：
1. §6.2 后端新增接口清单是否与主仓库排期一致；
2. §7 tokens 系统的设备绑定 + 刷新轮换策略是否符合预期；
3. P0–P3 功能范围（§2.2）是否有增删；
4. 鸿蒙侧三方库兼容策略（§11 风险）是否接受。

---

## 2. 项目定位与功能范围

### 2.1 定位

移动端是 papex **网页版的替代品**：核心场景为移动阅读与账号管理——浏览/检索/读 PDF（含离线）/收藏/订阅/消息/背书/设备管理。**不实现**：投稿上传、管理后台、协审、PDF 批注编辑（仅查看已有高亮，V3 再评估编辑）。

### 2.2 功能范围（P0–P3 全量，全部实现）

| 优先级 | 模块 | 功能点 |
|---|---|---|
| **P0** | 认证 | 登录/注册/登出、多账号切换、设备管理（远程撤销） |
| **P0** | 浏览 | 首页信息流、分类树（257 双语）、分页/下拉刷新 |
| **P0** | 检索 | 关键词检索 + 语义检索开关（`/api/search?semantic=1`） |
| **P0** | 论文 | 详情（元数据/版本/DOI/来源）、PDF 在线阅读、阅读进度记忆 |
| **P0** | 收藏 | 收藏/取消（`/api/bookmarks`）、收藏列表 |
| **P0** | 订阅 | 订阅分类/作者（`/api/subscriptions`）管理 |
| **P0** | 消息 | 站内信/工单/反馈（`/api/messages`、`/api/tickets`、`/api/feedback`） |
| **P0** | 个人 | 个人主页、背书（`/api/endorsements`）、编辑资料 |
| **P0** | 设置 | 语言 zh/en、深色模式、关于 |
| **P1** | 离线 | PDF 离线下载（队列+进度）、元数据离线缓存、无网浏览 |
| **P1** | 同步 | 阅读进度跨设备同步（新接口） |
| **P1** | 推送 | 新论文/工单回复推送（FCM/APNs/PushKit 三通道） |
| **P1** | 账号 | 生物识别解锁、API Key 管理入口 |
| **P1** | 体验 | 骨架屏/错误态/空态三态、弱网重试、性能监控（启动/帧率） |
| **P2** | 社区 | 评论查看与发表、背书请求入口、为你推荐 |
| **P2** | 分享 | 系统分享面板（链接+摘要卡片） |
| **P2** | 统计 | 阅读时长/收藏分类分布（本地聚合） |
| **P3** | 扫码 | 网页版扫码登录（后端二维码接口就绪后启用） |
| **P3** | 平板 | 平板大屏适配（双栏布局） |
| **P3** | 批注 | PDF 高亮只读展示（桌面端产生的标注在移动端可见） |
| — | **排除** | 投稿上传、admin/管理后台、协审工作流、审核队列 |

---

## 3. 技术选型（含理由）

| 层 | 选型 | 版本 | 选型理由 |
|---|---|---|---|
| 框架 | React Native | 0.82.x | 团队全栈 React+TS，组件模型/Hooks/Zustand 与网页端一致；New Architecture 唯一架构 |
| 鸿蒙适配 | RNOH | 0.82.30 | 2026-05 正式发布；华为商城改造验证；三端一套代码 |
| 导航 | React Navigation | v7 | RN 事实标准，native-stack + bottom-tabs |
| 状态 | Zustand | v5 | 与 papex 网页端一致，体积小、无样板 |
| 网络 | 自研 fetch client | — | 统一注入 token/错误归一化/401 自动刷新（§7） |
| 类型 | openapi-typescript | 最新 | 从 papex `openapi.json` 生成，禁止手写类型 |
| KV 存储 | react-native-mmkv | 最新 | 同步读写、性能高；会话/偏好/元数据缓存 |
| PDF | react-native-pdf | 最新 | 支持本地文件与 URL 流式；需核对 RNOH 适配清单 |
| 安全存储 | react-native-keychain | 最新 | iOS Keychain / Android Keystore；鸿蒙走 HUKS 原生桥（TS 接口统一） |
| 推送 | 三通道封装 | — | FCM（Android）/ APNs（iOS）/ PushKit（鸿蒙）统一抽象 |
| i18n | i18next + react-i18next | 最新 | 复用 papex zh/en 字典 |
| 测试 | Jest + RNTL + Detox | — | 单测 + iOS/Android E2E；鸿蒙真机手工回归 |
| 包管理 | npm | — | 裸 RN 工程（RNOH 需原生工程，不用 Expo managed） |

> **选型红线**：任何三方库引入前必须查 RNOH 三方库适配清单（0.72.90+/0.77.10+/0.82.x 三档）；不兼容优先换库，其次写鸿蒙原生桥（JS 接口不变、平台实现切换），**禁止**绕过 RNOH 自行编译鸿蒙原生模块。

---

## 4. 系统架构

### 4.1 架构图

```
┌──────────────────────────────────────────────────────────┐
│  papex-app (RN + RNOH)                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐         │
│  │ AuthStack  │  │ MainTabs   │  │ PaperStack │         │
│  │ 登录/注册   │  │ 首页/搜索   │  │ 详情/PDF   │         │
│  └─────┬──────┘  │ 收藏/我的   │  │ 阅读器     │         │
│        │        └─────┬──────┘  └────────────┘         │
│  ┌─────▼──────────────────────────────────────────┐     │
│  │ features: auth / papers / library / messages / │     │
│  │            profile / settings / push / sync    │     │
│  ├────────────────────────────────────────────────┤     │
│  │ lib: api(client/refresh) / storage(MMKV+PDF)  │     │
│  │      security(keychain/HUKS) / push / i18n     │     │
│  └────────────────────────────────────────────────┘     │
└──────────────────────────┬───────────────────────────────┘
                           │ HTTPS + Bearer Token
┌──────────────────────────▼───────────────────────────────┐
│  papex 后端 (Next.js API + Drizzle + PostgreSQL)          │
│  + 新增: /api/auth/refresh · devices · reading-progress   │
│         notes · avatar 上传                               │
└──────────────────────────────────────────────────────────┘
```

### 4.2 目录结构（完整）

```
papex-app/
├── android/                      # RN 原生工程（Gradle, minSdk 24）
├── ios/                          # RN 原生工程（Xcode, iOS 15+）
├── harmony/                      # RNOH 鸿蒙工程（DevEco Studio, API 12+）
├── src/
│   ├── app/
│   │   ├── navigators/           # RootStack / AuthStack / MainTabs / PaperStack
│   │   ├── routes.ts             # 路由常量 + 参数类型
│   │   └── App.tsx               # 根组件（Provider 装配：I18n/Theme/Session/Toast）
│   ├── features/
│   │   ├── auth/                 # 登录/注册/登出/多账号/设备管理
│   │   ├── papers/               # 首页/分类/检索/详情/PDF 阅读/评论
│   │   ├── library/              # 收藏/订阅/历史/下载管理
│   │   ├── messages/             # 站内信/工单/反馈
│   │   ├── profile/              # 个人主页/背书/编辑资料/统计
│   │   ├── settings/             # 语言/主题/账号/推送/关于
│   │   └── push/                 # 推送注册与路由
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts         # fetch 封装：token 注入/超时/重试
│   │   │   ├── auth-refresh.ts   # 401 队列化刷新
│   │   │   ├── endpoints.ts      # 端点常量
│   │   │   └── errors.ts         # ApiError 归一化（错误码→i18n key）
│   │   ├── types/                # openapi-typescript 生成（gen:types）
│   │   ├── storage/              # mmkv 封装 / pdf 文件缓存(LRU)
│   │   ├── security/             # secureStore(keychain/HUKS 双实现)
│   │   ├── push/                 # pushService（三通道）
│   │   ├── i18n/                 # i18next + zh/en 字典（sync:i18n）
│   │   └── analytics/            # 启动/导航性能埋点（开发期）
│   ├── components/               # PaperCard / CategoryTree / EmptyState / ErrorState / Skeleton / Tag
│   ├── theme/                    # 设计令牌 tokens.ts（深浅两套，与网页端同源）
│   └── stores/                   # sessionStore / libraryStore / settingsStore
├── scripts/
│   ├── gen-types.sh              # 拉取 openapi.json → src/lib/types
│   ├── sync-i18n.sh              # 同步 papex zh/en 字典
│   └── release-{android|ios|harmony}.sh
├── e2e/                          # Detox（iOS/Android）
├── .env.example                  # API_BASE_URL / PUSH_ENABLED 等
├── jest.config.js / jest.setup.ts
├── .github/workflows/ci.yml      # lint+typecheck+单测；e2e.yml；release.yml
├── LICENSE                       # Apache-2.0（拷贝 papex）
├── README.md / README_zh.md      # 双语（源文件在 papex/docs/projects/papex-app/）
└── package.json
```

### 4.3 依赖方向

```
App(navigators) → features → lib/*（api/security/storage/i18n）
                    └──────→ components / theme / stores
```

- features 之间禁止互相 import；跨域数据走 Zustand store 或导航参数。
- 所有网络请求必须经 `lib/api/client.ts`；`lib/` 不 import `features/`。

---

## 5. 数据模型

### 5.1 客户端本地存储（MMKV + 文件系统）

```
# MMKV（kv，键名约定）
app.session.v1          → { userId, username, accessToken, refreshToken, expiresAt, deviceId }
app.sessions.list       → [{ userId, username, lastLoginAt }]  # 多账号（脱敏，无 token）
app.lang / app.theme    → 偏好
app.paper.{id}.meta     → 论文元数据缓存 JSON（TTL 7d）
app.paper.{id}.progress → { page, percent, updatedAt }
app.downloads.index     → [{ paperId, version, path, size, status, createdAt }]
app.push.token          → { platform, token, registeredAt }
app.reading.stats       → 阅读统计（按日聚合）

# 文件系统（应用沙盒）
Documents/papex-pdfs/{paperId}/{version}.pdf     # 离线 PDF
Documents/papex-avatar.jpg                       # 本地头像缓存
```

### 5.2 与后端的数据契约（需要 papex 后端落表）

```
devices(
  id uuid PK, user_id fk→users, device_name text, platform text,   -- android/ios/harmony/desktop
  refresh_token_hash text not null, device_fingerprint text,
  last_active_at timestamptz, created_at timestamptz, revoked_at timestamptz null
)
reading_progress(
  user_id fk, paper_id fk, version text, page int, percent real,
  updated_at timestamptz, PK(user_id, paper_id)
)
notes(                       -- 桌面端批注云同步；移动端 P3 只读
  id uuid PK, user_id fk, paper_id fk, version text,
  kind text,                  -- highlight / note
  page int, rect_json jsonb, color text, content text,
  created_at, updated_at, deleted_at timestamptz null
)
```

> DDL 细节与迁移由 papex 主仓库落地；本仓库只消费接口（§6.2）。

---

## 6. 接口定义

### 6.1 对接 papex 现有 API（全复用，不新写）

| 端点 | 方法 | 用途 |
|---|---|---|
| `/api/auth/login` `/register` `/logout` `/me` | POST/POST/POST/GET | 认证 |
| `/api/papers` `/api/papers/[id]` `/api/papers/[id]/versions` | GET | 论文列表/详情/版本 |
| `/api/papers/[id]/pdf/[version]` | GET | PDF 流式（App 内下载/直读） |
| `/api/search` `/api/categories` | GET | 检索（`?semantic=1`）/ 分类树 |
| `/api/bookmarks` `/api/bookmarks/[paperId]` | GET/POST/DELETE, PATCH | 收藏 |
| `/api/subscriptions` | GET/POST/DELETE | 订阅 |
| `/api/endorsements` | GET/POST | 背书 |
| `/api/messages` `/api/tickets` `/api/feedback` | GET/POST | 消息/工单/反馈 |
| `/api/settings/api-keys` | GET/POST/DELETE | API Key 管理 |
| `/api/papers/[id]/comments` | GET/POST | 评论（P2） |

### 6.2 需要 papex 后端新增的接口（阻塞依赖，契约先行）

```
POST /api/auth/login          # 扩展：App 模式返回 { accessToken, refreshToken, deviceId }（cookie 行为不变）
POST /api/auth/refresh        # body { refreshToken } → { accessToken, refreshToken(轮换), deviceId }
POST /api/auth/logout         # 撤销当前设备 refresh token（revoked_at）
GET  /api/me/devices          # → [{ id, deviceName, platform, lastActiveAt, current }]
DELETE /api/me/devices/[id]   # 远程撤销（非当前设备生效；当前设备=登出）
GET/PUT /api/reading-progress/[paperId]   # { version, page, percent }
GET/POST/PUT/DELETE /api/notes            # 批注 CRUD（桌面端为主，移动端 P3 读）
POST /api/me/avatar           # multipart 图片上传（≤5MB，png/jpg/webp）
POST /api/push/register       # { platform, deviceToken, userId? } 注册推送；POST /api/push/unregister
```

> 以上接口的 OpenAPI 描述并入 papex `openapi.json`；本仓库 `gen:types` 自动同步类型。

---

## 7. Tokens 系统设计（完整）

> 目标：认证（谁）、授权（能做什么）、配额（限流）、刷新（续期）、校验（可信）、持久化（安全存储）六要素全覆盖。

### 7.1 Token 结构（服务端签发，jose HS256，与 papex 同一密钥体系）

```
accessToken  JWT payload: { sub: userId, role, perms: [perm,...], iat, exp(15min), jti }
refreshToken 随机 256bit（base64url），不可解码的 opaque token；
             服务端存 SHA-256 哈希到 devices.refresh_token_hash（不存明文）
```

- **accessToken**：短 TTL 15 分钟；`Authorization: Bearer` 携带；`/api/auth/me` 校验（读 cookie 回退读 header，改造 `getSession()` 支持 header 优先于 cookie 的 App 模式）。
- **refreshToken**：30 天；**每次刷新必轮换**（旧 token 立即失效），防重放；绑定 `deviceId`。

### 7.2 认证时序（登录）

```
用户输入账号密码
  → POST /api/auth/login { mode: "app", deviceName, platform, fingerprint }
  → 服务端: 校验密码 → 签发 accessToken + 生成 refreshToken
            → upsert devices 行（同 fingerprint 复用 deviceId，刷新 token hash）
            → 返回 { accessToken, refreshToken, deviceId, user }
  → 客户端: token 入 security store（Keychain/Keystore/HUKS）
            → 会话元数据入 MMKV
```

### 7.3 授权（RBAC 透传）

- accessToken 内含 `perms` 数组（由 papex 现有 `auth/permissions.ts` 解析 base→附加→覆盖 后打包）；
- 客户端不做权限判断的**唯一权威**，仅用于 UI 显隐（如「投稿」入口按 `paper:create` 显示）；
- 服务端 API 依旧按 papex 的 RBAC 中间件强制校验（客户端 token 只负责证明身份，权限裁决在服务端）。

### 7.4 配额（限流）

- 服务端：沿用 papex `rate-limit.ts`（API 120/min、认证 10/min 固定窗口）；
- 客户端：401/429 处理——429 时进入退避（指数退避 + jitter），并在 UI 显示「请求过于频繁」提示；
- 离线队列（P1）对写操作（收藏/订阅/进度）做本地排队，恢复后批量重放，天然避开瞬时限流。

### 7.5 刷新与校验（核心时序）

```
请求携带 accessToken
  ① 200 → 正常
  ② 401（exp 过期 / 被撤销）→ 触发 refresh：
     ┌ 并发请求用单一 in-flight refresh 锁（队列化，避免 N 个并发刷新）
     └ POST /api/auth/refresh { refreshToken, deviceId }
        成功 → 新 accessToken + 新 refreshToken(轮换) → 重放原请求
        失败(410/401 refresh 失效/设备被撤销) → 清会话 → 跳登录页
  ③ 429 → 退避重试（P0 仅提示，P1 自动重试）
```

**校验要点**（服务端）：
- accessToken：验签 + exp + jti 撤销列表（可选，短 TTL 可依赖过期）；
- refreshToken：查 `devices` 行 → 比对 SHA-256 → 未撤销 → 签发新 token 对 → **旧 refresh 立即失效（轮换）**；
- 设备撤销：`DELETE /api/me/devices/[id]` → `revoked_at = now()` → 该设备 refresh 全失效；accessToken 最长 15 分钟自然失效。

### 7.6 持久化与安全存储

| 平台 | 存储 | 说明 |
|---|---|---|
| iOS | Keychain（`react-native-keychain`, AfterFirstUnlock） | access+refresh 同存，禁 iCloud 同步 |
| Android | Keystore + EncryptedSharedPreferences | 经 keychain 库封装 |
| HarmonyOS | **HUKS**（原生桥：`secureSet/secureGet/secureDelete(alias)`） | RNOH 无现成库则写 harmony 侧 ArkTS 模块，TS 接口与两平台一致 |

安全基线：禁明文日志 token；仅 HTTPS；`__DEV__` 才开 debug；生物识别解锁（P1）仅解锁 UI 层，不替代 token；refreshToken 永不进 MMKV/AsyncStorage/日志。

### 7.7 多账号

- MMKV `app.sessions.list` 保存脱敏会话元数据（userId/username/lastLoginAt），最多 5 个；
- 切换 = 换 security store 中 active 别名（`papex:{userId}`），MMKV 会话指针同步切；
- 登出 = 调 `/api/auth/logout`（撤销设备）→ 清 token 与缓存（保留会话元数据用于快速登录）。

---

## 8. i18n 方案

- **i18next + react-i18next**；默认 zh（与网页端一致），`app.lang` 持久化，系统语言兜底；
- 字典源：与 papex `src/i18n` 同步（`scripts/sync-i18n.sh`），命名空间 `common / auth / papers / library / messages / settings / errors`；
- **错误消息 i18n**：后端返回 `{ error: "中文" }` → 客户端 `errors.ts` 用**错误码**映射 i18n key；后端未给码时按 HTTP 状态码兜底（400/401/403/404/429/500）；
- 时间/数字格式走 `Intl`（zh-CN / en-US）；
- UI 文案一律走 `t()`，禁止硬编码；截图与产品说明中英双语。

---

## 9. 测试策略

### 9.1 单元测试（Jest + RNTL）

| 目标 | 用例数(估) | 覆盖 |
|---|---|---|
| `lib/api/*` | ~25 | token 注入、401 刷新队列、429 退避、错误归一化 |
| `lib/security/*` | ~10 | 存储抽象（mock keychain/HUKS）、别名切换 |
| `lib/storage/*` | ~12 | MMKV 封装、PDF 缓存 LRU、下载索引 |
| `lib/i18n/*` | ~6 | 字典完整性（zh/en key 对齐）、fallback |
| `stores/*` | ~10 | session/library 状态流转 |
| 组件 | ~30 | PaperCard/CategoryTree/Empty/Error/Skeleton 渲染与交互 |

运行：`npm test`（jest --coverage，门槛：语句覆盖 ≥80%，关键模块 ≥85%）。

### 9.2 E2E（Detox，iOS/Android）

场景（共享测试数据集，见 9.4）：
1. 注册→登录→首页信息流加载；
2. 分类浏览→详情→PDF 打开→进度记忆；
3. 收藏→收藏列表→取消收藏；
4. 搜索（关键词+语义）→结果跳详情；
5. 订阅→我的订阅管理；
6. 登出→多账号切换→设备列表撤销。

运行：`npm run e2e:ios` / `npm run e2e:android`（Detox 构建+测试）；CI 在 macOS runner 跑 iOS，Android runner 跑 Android。鸿蒙端暂用真机手工回归清单（`docs/e2e/harmony-checklist.md`，在项目 docs 维护）。

### 9.3 多端联动测试（web + app + desktop）

场景（跨端数据一致性，P0 验收）：
1. 网页版收藏论文 → App 收藏列表可见；
2. App 更新阅读进度 → 网页版论文页进度展示（后端支持时）；
3. 桌面端产生高亮标注（P3 桌面联调后）→ App 论文详情可见标注数；
4. 设备 A 撤销设备 B → B 下一次请求被 401 驱逐。

运行：起 papex 后端（docker db + `npm run dev`）→ 分别跑 App/Desktop 的对应用例；提供 `scripts/e2e-cross.sh`（papex 仓库侧维护测试账号种子）。

### 9.4 测试数据

- 复用 papex `db:seed` 数据；新增 3 个联动账号（`app-e2e`/`desktop-e2e`/`cross-e2e`，密码 `password123`）与 5 篇已知论文（固定 ID），由 papex 种子脚本提供。

---

## 10. 平台集成与发布

| 平台 | 产物 | 签名 | 分发 | CI |
|---|---|---|---|---|
| Android | AAB/APK | 自有 keystore（CI secrets） | Play + 国内商店 | `release-android.yml` |
| iOS | IPA | Apple Developer 证书 | TestFlight → App Store | `release-ios.yml`（macOS runner） |
| HarmonyOS | HAP/APP | AGC 签名 | AppGallery | `release-harmony.yml`（DevEco CLI） |

CI 工作流：`ci.yml`（lint+typecheck+单测，三端矩阵）→ `e2e.yml`（Detox，tag `v*` 或 PR label）→ `release-*.yml`（tag `v*` 触发，产物上传 Release）。版本语义化 `0.x.0`，与 papex 发布节奏解耦。

---

## 11. 风险与已知问题

| 风险 | 等级 | 对策 |
|---|---|---|
| RNOH 三方库不兼容（pdf/keychain/push） | 高 | 引入前查适配清单；鸿蒙原生桥兜底（接口不变） |
| 后端 tokens/refresh 接口未按期交付 | 高（阻塞 P0） | 先用 API Key（已有 Bearer）打通演示；refresh 为 P0 同步开发 |
| 鸿蒙真机/AGC 资源 | 中 | 尽早申请；模拟器 API 19+ 先行 |
| 推送三通道差异 | 中 | 统一抽象；iOS/Android 先行，鸿蒙 PushKit 后置 |
| 离线与在线冲突（进度/收藏） | 中 | last-write-wins + 时间戳；写操作离线队列 |
| WebView/系统深色差异 | 低 | 跟随系统 + 手动覆盖；设计令牌统一 |

**已知问题（记录在项目记忆）**：RNOH 0.82.30 的 `react-native-pdf` 鸿蒙适配待实测验证；鸿蒙推送需 AGC 应用配置；iOS 后台下载需 URLSession 配置（P1 实现时确认）。

---

## 12. GitHub 发布与文档

1. 仓库 `Maicarons/papex-app`，license **Apache-2.0**（拷贝 papex LICENSE，保留 Copyright 2026 The Papex Authors）；
2. `README.md`（英文）与 `README_zh.md`（中文）：徽章（License/CI/平台/版本）、功能矩阵、截图占位、安装（三端下载）、开发（本地运行）、测试、部署/上架、贡献、致谢（引用 papex）；源文件维护在 `papex/docs/projects/papex-app/`，发布时拷贝到仓库根；
3. papex README/README_zh 增加「官方客户端」段落链接两个新仓库；
4. `docs/development/papex-app.md`（本方案）归档于 papex 仓库 docs。

---

## 13. 里程碑与验收

| 里程碑 | 内容 | 验收 |
|---|---|---|
| M0 基建（2 周） | 三端工程跑通、API client、tokens 联调、CI | 三端登录拉首页；ci.yml 全绿 |
| M1 MVP（5–6 周） | P0 全部 | iOS/Android 内测 + 鸿蒙真机可用 |
| M2 离线+推送（3–4 周） | P1 全部 | 离线读 PDF；推送可达；设备管理可用 |
| M3 发布（3 周） | P2 + 三端上架 | 商店正式版 |
| M4 迭代 | P3 + 联动回归 | 持续 |

**M1 验收口径**：三端登录/浏览/检索/读 PDF/收藏/收消息；设备撤销生效；zh/en + 深色模式；App Store/Play/AppGallery 各一版。

---

## 14. 记忆留存与新会话续接

- 项目根 `.workbuddy/memory/2026-08-18.md` 已写入：架构、tokens 设计、后端接口依赖、待办（M0 起）、已知问题（§11）、决策记录（§12）——新会话打开即读，无缝续接；
- 后续每次里程碑结束更新记忆（追加当日日志）。
