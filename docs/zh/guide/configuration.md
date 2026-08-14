# 配置

Papex 通过环境变量配置，关键变量如下。

## 数据库连接

```bash
DATABASE_URL=postgres://papex:papex@localhost:5432/papex
```

## 认证

```bash
# 用于签发 JWT 的密钥，生产环境必须替换为随机长字符串（≥16 字符）
AUTH_SECRET=change-me-to-a-long-random-string
# 会话有效期（秒），默认 7 天
AUTH_SESSION_TTL=604800
```

### API 密钥

API 密钥让脚本与第三方集成无需浏览器会话即可调用接口。在 **设置 → API 密钥**（`/settings/api-keys`）创建，明文仅在创建时展示一次。密钥以 SHA-256 哈希存储并绑定你的账号，因此继承其角色的 RBAC 权限——无需额外配置。调用时通过请求头携带：

```http
Authorization: Bearer pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

公开端点（论文、搜索、分类、作者、健康检查）同样支持匿名访问。

## 邮件（可选）

站内信与工单系统默认不依赖邮件。如需发送通知邮件，可配置 SMTP：

```bash
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

## 存储（PDF 后端）

上传的 PDF 由可插拔的后端存储，通过 `STORAGE_DRIVER` 选择。

### `local`（默认）

服务器自行管理文件系统上的 PDF 文件，目录为 `PAPEX_STORAGE_DIR`（默认 `./storage`）。字节由路由 `/api/papers/{id}/pdf/{version}` 流式返回。适用于 Docker / 自托管 / 本地开发。

```bash
STORAGE_DRIVER=local
PAPEX_STORAGE_DIR=./storage
```

### `s3`（兼容 S3 的对象存储）

上传到兼容 S3 的存储桶（AWS S3、MinIO、Cloudflare R2、DigitalOcean Spaces）。流式路由随后返回 `302` 重定向到**预签名**（或公开）对象 URL，PDF 由对象存储直接服务、不再经过应用服务器——在 Vercel 等只读 / Serverless 平台上必须使用此项。

```bash
STORAGE_DRIVER=s3
PAPEX_S3_BUCKET=papex-pdfs
PAPEX_S3_REGION=auto            # AWS 用 us-east-1；Cloudflare R2 用 auto
PAPEX_S3_ENDPOINT=https://s3.amazonaws.com   # R2 / MinIO / Spaces 必填
PAPEX_S3_ACCESS_KEY_ID=...
PAPEX_S3_SECRET_ACCESS_KEY=...
PAPEX_S3_FORCE_PATH_STYLE=true  # MinIO/R2/Spaces 用 true；AWS 虚拟主机风格用 false
# 可选：若存储桶/CDN 已公开，可设置此基址跳过签名：
# PAPEX_S3_PUBLIC_BASE=https://cdn.example.com
```

无论采用哪种后端，每个论文版本上存储的 `pdfUrl` 始终指向流式路由，因此前端与 API 与具体后端解耦。
