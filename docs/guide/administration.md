# 管理与权限指南

Papex 在核心投稿 / 检索能力之外，提供了一套面向运营方的**管理后台**与**精细化权限体系**。本文档说明四大能力：

1. **角色与权限（RBAC）** —— 按角色或按用户粒度控制论文发布、查看、下载、评论等操作。
2. **用户权限管理** —— 在后台为任意用户分配附加角色、设置单项权限的允许 / 禁止覆盖。
3. **协审系统（同行评审）** —— 管理员发起协审请求，评审人接收、提交意见、回执，形成完整闭环。
4. **站内信多分类与广播** —— 统一通知中心，覆盖系统通知、审核结果、工单回执、协审请求、管理员私信、社区回复等类型，并向特定人群广播消息。

---

## 1. 角色与权限（RBAC）

Papex 采用「**基础角色 + 附加角色 + 用户级覆盖**」三层模型，既支持按角色批量授权，也支持对用户做个性化限制。

### 1.1 权限模型

| 层级 | 说明 | 维护入口 |
| --- | --- | --- |
| 基础角色（base role） | 每个用户在 `users.role` 上固有的角色，取值为 `author` / `moderator` / `admin` | 注册时默认 `author` |
| 附加角色（assigned roles） | 通过 `user_roles` 关联表为用户叠加的额外角色 | 「用户管理」页 |
| 用户级覆盖（overrides） | 对单个用户的某一项权限显式「允许」或「禁止」，优先级最高 | 「用户管理」页 |

> ℹ️ `reader` 是 RBAC 角色表（`roles`）中的一个**附加角色**，并非数据库基础角色（`users.role` 枚举仅含 `author` / `moderator` / `admin`）。基础角色决定登录与默认权限边界，附加角色在其之上叠加。

### 1.2 权限清单

系统共内置 **15 项权限**，分为 **6 个分组**：

| 分组 | 权限 Key | 名称 | 说明 |
| --- | --- | --- | --- |
| 论文 `paper` | `paper:publish` | 发布论文 | 提交新论文或新版本 |
| | `paper:view` | 查看论文 | 浏览已发布论文 |
| | `paper:download` | 下载论文 | 下载 PDF / 源码包 |
| | `paper:moderate` | 审核论文 | 通过 / 拒绝 / 撤稿 |
| 评论 `comment` | `comment:create` | 发表评论 | 在论文下评论与回复 |
| | `comment:view` | 查看评论 | 浏览评论区 |
| 工单 `ticket` | `ticket:create` | 提交工单 | 创建反馈 / 工单 |
| | `ticket:manage` | 管理工单 | 回复 / 处置工单 |
| 协审 `co_review` | `co_review:assign` | 指派协审 | 向用户发起协审请求 |
| | `co_review:respond` | 参与协审 | 接收并回应协审请求 |
| | `co_review:manage` | 管理协审 | 查看全部协审进度 |
| 站内信 `message` | `message:broadcast` | 群发通知 | 向用户广播站内信 |
| 管理 `admin` | `user:manage` | 用户管理 | 查看 / 编辑用户 |
| | `role:manage` | 角色权限管理 | 配置角色与权限 |
| | `permission:manage` | 权限覆盖管理 | 用户级权限允许 / 禁止 |

### 1.3 默认角色权限

种子数据（`db:seed`）为每个系统角色写入了默认权限映射：

| 角色 | 权限数 | 包含权限 |
| --- | --- | --- |
| `admin` | 15 | 全部权限 |
| `moderator` | 12 | 论文查看/下载/审核、评论发表/查看、工单提单/管理、协审指派/参与/管理、群发通知、用户管理 |
| `author` | 6 | 论文发布/查看/下载、评论发表/查看、工单提交 |
| `reader` | 3 | 论文查看/下载、评论查看 |

### 1.4 权限解析顺序

当用户执行受保护操作时，系统按以下顺序得出最终有效权限：

```
基础角色权限
  ∪ 附加角色权限          （角色并集）
  ∪ 用户覆盖中的「允许」
  − 用户覆盖中的「禁止」  （覆盖优先级最高）
```

因此，即使某用户的基础角色与附加角色都没授予 `paper:publish`，只要在其覆盖项中显式「允许」，该用户仍可发布；反之，即便角色已授予，显式「禁止」也会拦截。

> 兜底：若 `roles` / `permissions` 表尚未播种（例如全新数据库未跑 `db:seed`），权限引擎会回退到上文的默认角色映射，避免未播种时全站锁死。仍建议部署后即执行 `db:seed`。

### 1.5 受保护的操作（网关）

以下关键操作已接入权限校验，缺权限时返回 `403`：

- `POST /api/papers` —— 需要 `paper:publish`
- `POST /api/papers/:id/comments` —— 需要 `comment:create`
- 审核、工单处置、协审指派 / 管理、用户与角色编辑、广播等后台操作，均需对应权限，且路由受 `middleware` 保护（仅 `moderator` / `admin` 可进入 `/admin` 区域）。

---

## 2. 用户权限管理

进入 **`/admin/users`**（需 `user:manage`）：

- **搜索用户**：按用户名 / 邮箱 / 昵称过滤，分页展示。
- **分配附加角色**：在用户编辑面板勾选系统角色（`admin` / `moderator` / `author` / `reader`），叠加到基础角色之上。
- **权限三级覆盖**：对 15 项权限逐项设置三态：
  - **继承**（默认）—— 跟随角色并集结果；
  - **允许** —— 强制授予，即使角色未包含；
  - **禁止** —— 强制拦截，即使角色已包含。

所有改动通过 `PATCH /api/admin/users/:id` 即时保存；权限覆盖会同步反映到该用户后续的所有操作鉴权。

---

## 3. 协审系统（同行评审）

协审是一套完整的同行评审闭环，串起「管理员 → 评审人 → 作者」三方。

### 3.1 闭环流程

```
管理员指派 ──► 评审人收到「协审请求」站内信
     │
     ▼
评审人回应（接受 / 拒绝）
     │ 接受
     ▼
评审人提交意见（建议通过 / 拒绝 / 修改 + 评语）
     │
     ▼
系统回执 ──► 通知指派人「意见已提交」
           ──► 通知作者「论文协审完成」（若作者非指派人）
```

### 3.2 状态机

协审记录（`co_reviews`）的状态流转如下：

| 状态 | 含义 | 进入方式 |
| --- | --- | --- |
| `pending` | 待评审人回应 | 管理员指派（`POST /api/co-reviews`） |
| `accepted` | 已接受 | 评审人接受（`POST /api/co-reviews/:id/respond` `{accepted:true}`） |
| `declined` | 已拒绝 | 评审人拒绝（`respond` `{accepted:false}`） |
| `completed` | 已完成 | 评审人提交意见（`submit`） |
| `expired` | 已过期 | （预留状态，用于超时关闭） |

> 仅当状态为 `pending` 时评审人可回应；仅当状态为 `accepted` 时评审人可提交意见。状态不匹配会返回 `INVALID_STATE`。

### 3.3 入口与通知

- **管理员**：`/admin/co-reviews` 发起指派并监控全部协审进度；`/admin/co-reviews/:id` 查看详情。指派时可从「已提交（`submitted`）」状态的论文中选取。
- **评审人**：`/co-reviews`（我的协审）与 `/co-reviews/:id`（接受 / 拒绝 + 提交意见）。
- **统一通知**：每个状态变更都会通过「协审请求 / 协审回执」分类的站内信联动通知相关方（见第 4 节）。

---

## 4. 站内信多分类与广播

### 4.1 消息分类

站内信（`messages`）按 `kind` 分为 **8 类**，收件箱据此着色与归类：

| kind | 标签 | 色调 | 典型来源 |
| --- | --- | --- | --- |
| `system` | 系统通知 | 默认 | 系统事件 |
| `ticket_reply` | 工单回执 | 信息蓝 | 工单被回复 |
| `announcement` | 公告 | 警示黄 | 管理员广播 |
| `review_result` | 审核结果 | 成功绿 | 论文审核通过 / 拒绝 |
| `co_review_request` | 协审请求 | 紫色 | 协审指派 |
| `co_review_result` | 协审回执 | 紫色 | 协审回应 / 意见提交 |
| `admin_message` | 管理员私信 | 危险红 | 定向私信 |
| `community_reply` | 社区回复 | 信息蓝 | 评论被回复 |

收件箱（`/messages`）支持按分类筛选（`GET /api/messages?kind=...`），点击消息可跳转到关联的 `link`（论文、工单、协审等）。

### 4.2 统一通知联动

所有跨模块提醒都经由统一的 `notifications` 服务漏斗发出，确保审核、工单、协审、社区等模块的通知口径一致：

- **审核系统**：论文审核结果 → 通知作者（`review_result`）。
- **工单系统**：客服回复工单 → 通知提交人（`ticket_reply`）。
- **协审系统**：指派 / 回应 / 提交意见 → 通知评审人、指派人、作者（`co_review_request` / `co_review_result`）。
- **社区系统**：评论被回复 → 通知父评论作者（`community_reply`）。

### 4.3 广播消息

进入 **`/admin/messages`**（需 `message:broadcast`）：

- **范围 `scope`**：
  - `all` —— 全部用户；
  - `role` —— 指定基础角色（`author` / `moderator` / `admin`）；
  - `userIds` —— 指定若干用户 ID。
- **类型 `kind`**：`announcement`（公告）/ `system`（系统）/ `admin_message`（管理员私信）。
- 填写标题、正文（支持跳转 `link`），提交后向目标人群批量写入站内信，并返回成功发送数量。

---

## 5. Admin 面板导航

后台入口集中在登录后的用户菜单与 `/admin` 概览页，包含：

| 模块 | 路由 | 说明 |
| --- | --- | --- |
| 管理概览 | `/admin` | 统计卡片 + 各模块入口 |
| 审核队列 | `/admin/review` | 论文审核（通过 / 拒绝 + 理由） |
| 统计面板 | `/admin/stats` | 平台运营数据 |
| 工单管理 | `/admin/tickets` | 工单处置 |
| 协审管理 | `/admin/co-reviews` | 协审指派与监控 |
| 用户管理 | `/admin/users` | 角色与权限覆盖 |
| 角色权限 | `/admin/roles` | 角色权限矩阵配置 |
| 站内信广播 | `/admin/messages` | 群发通知 |

> 上述路由受 `middleware` 保护，仅有 `moderator` 或 `admin` 基础角色的用户可访问；模块内的写操作还需对应细粒度权限。

---

## 6. 运维：迁移与种子

四大系统依赖数据库迁移 `0003_add_rbac_co_review_messages`（新增 `roles` / `permissions` / `role_permissions` / `user_roles` / `user_permissions` / `co_reviews` / `moderation_logs` 等表，并将 `messages.kind` 扩展为 8 类）。部署或本地初始化时请执行：

```bash
npm run db:migrate   # 应用迁移（含 RBAC / 协审 / 消息分类）
npm run db:seed      # 写入 4 个系统角色 + 15 项权限 + 默认关联（幂等）
```

`db:seed` 中的 RBAC 播种使用 `onConflictDoNothing`，可重复执行而不产生重复数据。完成迁移与播种后，权限引擎即以 `roles` / `permissions` 表为准；未播种时自动回退到常量默认映射（见 1.4）。

---

## 7. 相关 API 速查

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/messages?kind=` | 收件箱，按分类筛选 |
| `POST` | `/api/papers/:id/moderate` | 审核 `{action:"approve"\|"reject"\|"withdraw", reason?}` |
| `GET` | `/api/co-reviews?scope=mine\|all` | 协审列表（我的 / 全部） |
| `POST` | `/api/co-reviews` | 指派协审 `{paperId, reviewerId, note?}` |
| `GET` | `/api/co-reviews/:id` | 协审详情 |
| `POST` | `/api/co-reviews/:id/respond` | 回应 `{accepted:boolean}` |
| `POST` | `/api/co-reviews/:id/submit` | 提交意见 `{decision:"approve"\|"reject"\|"revise", comment}` |
| `GET` | `/api/admin/users` | 用户列表（分页 / 搜索） |
| `PATCH` | `/api/admin/users/:id` | 设置角色 `{roleKeys}` 或权限覆盖 `{permission:{key,grant}}` |
| `GET` | `/api/admin/roles` | 角色列表 |
| `PUT` | `/api/admin/roles/:id` | 设置角色权限 `{permissionKeys}` |
| `POST` | `/api/admin/messages` | 广播 `{scope, role?, userIds?, kind, title, body, link?}` |
| `GET` | `/api/admin/stats` | 平台统计 |

更完整的接口说明见 [API 参考](/guide/api)。
