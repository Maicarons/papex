# Deployment

Papex can be deployed to Vercel, any Docker environment, or a self-hosted server.

## Vercel

1. Import the repo into Vercel.
2. Set env vars: `DATABASE_URL`, `AUTH_SECRET`.
3. Build command: `npm run build` (output handled by Next.js).
4. Bind Postgres via Vercel Storage, or fill an external `DATABASE_URL`.
5. Run migrations once after deploy: `npm run db:migrate`.

## Docker / self-hosted

Use the root `docker-compose.yml` to run app + database together:

```bash
docker compose up -d
```

Or run only Postgres in Docker and build the Next.js image yourself:

```bash
docker build -t papex .
docker run -e DATABASE_URL=... -e AUTH_SECRET=... -p 3000:3000 papex
```

## Docs site

Docs are built with VitePress into `public/docs` and served by the main app at `/docs`:

```bash
npm run docs:build
```
