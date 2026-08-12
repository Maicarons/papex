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

## 邮件（可选）

站内信与工单系统默认不依赖邮件。如需发送通知邮件，可配置 SMTP：

```bash
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

## 存储（可选）

论文全文（PDF / 源码）通过 URL 引用，可对接对象存储或静态托管服务，无需额外配置。
