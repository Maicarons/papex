# API

Papex 提供一组基于 HTTP 的 JSON API（前缀 `/api`）。以下为常用端点。

## 认证

- `POST /api/auth/register` — 注册 `{username, email, displayName, password}`
- `POST /api/auth/login` — 登录 `{identifier, password}`
- `POST /api/auth/logout` — 退出
- `GET /api/auth/me` — 当前用户

## 论文

- `GET /api/papers` — 论文列表（支持 `q`、`category` 参数）
- `GET /api/papers/:id` — 论文详情
- `GET /api/papers/:id/comments` — 评论
- `POST /api/papers` — 提交论文（需登录，需 `paper:publish`）
- `POST /api/papers/:id/moderate` — 审核 `{action:"approve"|"reject"|"withdraw", reason?}`（需 `paper:moderate`）
- `POST /api/submit/archive` — 上传论文源码包 `tar.gz` 并自动建稿、连引用、构建 PDF（需登录，详见[投稿指南](/guide/submission)）

## 分类

- `GET /api/categories` — 分类树

## 站内信

站内信按 `kind` 分为 8 类：系统通知 `system`、工单回执 `ticket_reply`、公告 `announcement`、审核结果 `review_result`、协审请求 `co_review_request`、协审回执 `co_review_result`、管理员私信 `admin_message`、社区回复 `community_reply`。

- `GET /api/messages` — 当前用户消息列表与未读数（支持 `?kind=` 按分类筛选）
- `GET /api/messages/stats` — 未读统计
- `POST /api/messages/:id/read` — 标记已读
- `POST /api/messages` — `{action:"read-all"}` 全部已读

## 工单

- `GET /api/tickets` — 我的工单（`?scope=all` 仅管理员）
- `POST /api/tickets` — 创建工单 `{subject, type, priority, message}`
- `GET /api/tickets/:id` — 工单详情
- `POST /api/tickets/:id` — 回复
- `PATCH /api/tickets/:id` — 管理员更新状态/优先级

## 反馈

- `POST /api/feedback` — 提交反馈（需登录，自动创建工单）

## 协审

- `GET /api/co-reviews?scope=mine|all` — 协审列表（我的 / 全部，需相应权限）
- `POST /api/co-reviews` — 指派协审 `{paperId, reviewerId, note?}`（需 `co_review:assign`）
- `GET /api/co-reviews/:id` — 协审详情
- `POST /api/co-reviews/:id/respond` — 评审人回应 `{accepted:boolean}`
- `POST /api/co-reviews/:id/submit` — 提交意见 `{decision:"approve"|"reject"|"revise", comment}`

## 管理（Admin）

后台接口均需 `moderator` / `admin` 基础角色，并按细粒度权限鉴权。

- `GET /api/admin/users` — 用户列表（分页 / 搜索，需 `user:manage`）
- `PATCH /api/admin/users/:id` — 设置角色 `{roleKeys:string[]}`，或设置权限覆盖 `{permission:{key:string, grant:boolean|null}}`（分别需 `user:manage` / `permission:manage`）
- `GET /api/admin/roles` — 角色列表（需 `role:manage`）
- `PUT /api/admin/roles/:id` — 设置角色权限 `{permissionKeys:string[]}`
- `POST /api/admin/messages` — 广播 `{scope:"all"|"role"|"userIds", role?, userIds?, kind:"announcement"|"system"|"admin_message", title, body, link?}`（需 `message:broadcast`）
- `GET /api/admin/stats` — 平台统计
