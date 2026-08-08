# 快速开始

本指南帮助你在本地把 Papex 跑起来。

## 环境要求

- Node.js ≥ 18.18
- PostgreSQL ≥ 16（推荐使用 Docker 启动）
- npm 或 pnpm

## 1. 安装依赖

```bash
npm install
```

## 2. 准备数据库

使用项目内置的 `docker-compose.yml` 启动 Postgres：

```bash
docker compose up -d db
```

复制环境变量模板并填写：

```bash
cp .env.example .env
# 至少设置 DATABASE_URL 与 AUTH_SECRET
```

## 3. 执行迁移与种子

```bash
npm run db:migrate
npm run db:seed
```

`db:seed` 会写入全量学科分类、示例论文与管理员账号。

## 4. 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:3000 即可访问。

## 默认账号

| 角色 | 用户名 | 密码 |
| --- | --- | --- |
| 管理员 | `admin` | `admin123456` |
| 作者（示例） | `demo` | `password123` |

> 生产环境请务必修改默认密码，并使用随机长字符串作为 `AUTH_SECRET`。
