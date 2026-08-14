# API

Papex 提供一组基于 HTTP 的 JSON API（前缀 `/api`）。以下为常用端点。

## 在线文档

完整的机器可读 **OpenAPI 3.1** 规范托管在 [`/api/openapi.json`](/api/openapi.json)，
交互式（可在线调试）文档站（基于 [Scalar](https://scalar.com)）位于
**[/api-docs](/api-docs)**。打开即可浏览全部端点、查看请求/响应结构，并直接在浏览器中发起请求。

## 文档如何保持同步（代码优先）

OpenAPI 文档是**由代码生成**的，而非手写。每个路由都拥有一份同目录片段 `route.openapi.ts`，它是该端点文档的唯一真相源；静态部分（info、`components/schemas`、`components/responses`、security）则位于 `src/lib/openapi/base.ts`。

生成器（`src/lib/openapi/generate.ts`）会扫描所有片段、合并进 base，并写出 `src/lib/openapi/spec.generated.ts`——这份文件由 `/api/openapi.json` 提供。

```bash
# 编辑片段后重新生成（/api/openapi.json 与 /api-docs 随之更新）
npm run openapi:generate
```

该命令已接入 `predev` 与 `prebuild`，因此在 `next dev` / `next build` 前总会自动重建。**请勿手动编辑 `spec.generated.ts`**——每次运行都会被覆盖。

### 为新接口编写文档

当你新增路由 `src/app/api/foo/bar/route.ts` 时，在同目录创建 `route.openapi.ts`：

```ts
export default {
  "/api/foo/bar": {
    get: {
      tags: ["Discovery"],
      summary: "描述它的作用",
      // security: []            // 公开端点省略此项
      responses: {
        200: { description: "OK", content: { "application/json": { schema: { type: "object" } } } },
      },
    },
  },
} as const;
```

运行 `npm run openapi:generate`（或直接启动/构建），该端点就会自动出现在 `/api/openapi.json` 与 `/api-docs` 中。共用 schema 放在 `src/lib/openapi/base.ts`（如 `#/components/schemas/PaperListItem`）。

## 鉴权

支持两种认证方式：

1. **会话 Cookie**（`papex_session`）——登录后由浏览器自动携带，适用于同源请求。
2. **API Key**（`Authorization: Bearer pk_…`）——用于脚本与第三方集成。在
   **设置 → API 密钥**（`/settings/api-keys`）创建。密钥绑定你的账号并继承其角色的 RBAC 权限，
   因此所有支持会话 Cookie 的端点同样支持 API Key。密钥明文**仅在创建时展示一次**，服务端只保存其 SHA-256 哈希。

使用 API Key 的示例：

```bash
curl -H "Authorization: Bearer pk_live_xxxx" https://your-host/api/papers?pageSize=1
```

公开（无需登录）的端点——如论文列表、搜索、分类、作者、健康检查——对匿名访问、会话 Cookie 与 API Key 同样可用。

## 认证端点

- `POST /api/auth/register` — 注册 `{username, email, displayName, password}`
- `POST /api/auth/login` — 登录 `{identifier, password}`
- `POST /api/auth/logout` — 退出
- `GET /api/auth/me` — 当前用户

## API 密钥

- `GET /api/settings/api-keys` — 列出我的密钥
- `POST /api/settings/api-keys` — 创建密钥 `{name, scopes?:["read"|"write"], environment?:"live"|"test", expiresAt?:ISODate|null}`
- `DELETE /api/settings/api-keys?id=<keyId>` — 吊销密钥

## 论文

- `GET /api/papers` — 论文列表。查询参数：`q`（全文或 `title:`/`au:`/`abs:`/`cat:` 前缀）、`category`、`tag`、`sort`（`new` | `updated` | `by_citations`）、`from`（ISO 日期，仅返回该日期之后创建的论文）、`page`、`pageSize`。每行附带解析好的 `citationCount`。
- `GET /api/papers/:id` — 论文详情（含 `submitter` 上传者、`tags` 标签、`commentCount`）
- `GET /api/papers/:id/comments` — 评论
- `GET /api/papers/:id/citations` — 引用网络 `{ outgoing, incoming }`
- `GET /api/papers/:id/tags` — 论文的标签
- `POST /api/papers` — 提交论文（需登录，需 `paper:publish`）；支持 JSON 或 multipart（meta + 可选 `pdf` 文件）
- `POST /api/papers/:id/moderate` — 审核 `{action:"approve"|"reject"|"withdraw", reason?}`（需 `paper:moderate`）
- `POST /api/papers/:id/citations` — 新增引用 `{targetArxivId?|targetDoi?|targetTitle?}`（作者 / 审核员 / 管理员）
- `POST /api/papers/:id/tags` / `DELETE /api/papers/:id/tags` — 添加 / 移除标签 `{tagId|name}`（作者 / 审核员 / 管理员；名称不存在时自动创建）
- `POST /api/submit/archive` — 上传论文源码包 `tar.gz` 并自动建稿、连引用、构建 PDF（需登录，详见[投稿指南](/guide/submission)）

## 分类

- `GET /api/categories` — 分类树

## 标签

- `GET /api/tags` — 全部标签及使用计数（按热度排序）
- `POST /api/tags` — 创建标签 `{name}`（需登录；按名称幂等）

## 订阅

- `GET /api/subscriptions` — 列出我的订阅（**富化**：分类/作者/论文名称解析为 `title` 并附带跳转 `href`）
- `POST /api/subscriptions` — 订阅 / 取消订阅（切换）`{type:"category"|"author"|"paper", refId}`
- `DELETE /api/subscriptions` — 取消订阅 `{type, refId}`

## 提醒与通知

当新论文进入你的订阅范围（新入分类、新来自作者）、有人回复你的评论，或管理员广播时，会生成相应提醒。

- `GET /api/feed` — 当前用户的提醒列表（`?markRead=1` 一并全部标记已读）
- `POST /api/feed` — 标记单条提醒已读 `{id}`

顶部铃铛（`FeedBell`）通过 Zustand store 同步未读角标，任何一处已读都会立即更新角标。

## 收藏

- `GET /api/bookmarks` — 列出我的收藏（解析出论文标题与 `groupName` 分组）；传入 `?paperId=` 则改为返回单篇论文的 `{ bookmarked: boolean }`
- `POST /api/bookmarks` — 切换收藏 `{paperId, group?}`（返回 `{ bookmarked: true|false }`）
- `PATCH /api/bookmarks/:paperId` — 将收藏移动到分组 `{group}`（传 null 清除分组）
- `DELETE /api/bookmarks` — 移除收藏 `{paperId}`

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
