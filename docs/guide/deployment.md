# 部署

Papex 可部署到 Vercel、任意 Docker 环境或自托管服务器。

## Vercel

1. 导入仓库到 Vercel。
2. 设置环境变量：`DATABASE_URL`、`AUTH_SECRET`。
3. 构建命令：`npm run build`；输出目录由 Next.js 自动处理。
4. 在 Vercel 的「Storage」中绑定 Postgres，或在环境变量中填写外部数据库地址。
5. 部署后执行一次迁移：`npm run db:migrate`。

## Docker / 自托管

使用仓库根目录的 `docker-compose.yml` 可一并启动应用与数据库：

```bash
docker compose up -d
```

也可仅用 Docker 运行 Postgres，再自行构建镜像运行 Next.js：

```bash
docker build -t papex .
docker run -e DATABASE_URL=... -e AUTH_SECRET=... -p 3000:3000 papex
```

## 文档站

文档基于 VitePress，构建产物输出到 `public/docs`，由主站以 `/docs` 路径提供：

```bash
npm run docs:build
```
