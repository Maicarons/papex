# Contributing to Papex

Thanks for helping build Papex — an open-source, self-hostable academic
literature platform. This guide covers how to contribute code, docs and
reviews.

## Project layout (short version)

```
src/app/            Next.js App Router pages (server components read the DB)
src/app/api/        Route handlers — REST boundary (zod validation, auth, services)
src/lib/db/         Drizzle schema + seed; migrations in drizzle/*.sql
src/lib/services/   Business logic shared by pages and API routes
src/lib/ai/         Pluggable LLM layer (OpenAI-compatible, self-host friendly)
src/lib/push/       Web Push sender (VAPID, fire-and-forget)
src/components/     Client components (fetch /api/...)
drizzle/            SQL migrations + drizzle-kit meta journal
packages/api-client Zero-dependency cross-end API client skeleton
docs/               VitePress documentation site (9 languages)
e2e/                Playwright specs (against dockerized Postgres + seeded data)
```

## Conventions

- **Write migrations by hand** and register them in `drizzle/meta/_journal.json`
  (one entry per file, `idx` = next integer). Keep `src/lib/db/schema.ts` in
  sync with the SQL. Never ship a schema change without its migration — a
  half-finished feature is worse than none.
- **API routes self-document**: every route gets a sibling `route.openapi.ts`
  fragment (path key like `/api/papers/{id}`), then run `npm run openapi:generate`
  (also wired into `predev`/`prebuild`).
- **Capability-gate optional integrations** (embeddings, AI, push): when the
  env var is unset the feature must silently disable, never crash. See
  `src/lib/capabilities.ts` and `src/lib/embeddings.ts`.
- **Fire-and-forget for cross-cutting concerns**: email/push fan-out never
  blocks the business write; failures log, they don't roll back.
- **Self-host first**: no hard dependency on commercial SaaS; OpenAI-compatible
  endpoints, local models and VAPID keys all work on a single server.
- Comments in code are written in Chinese; commit messages in English
  Conventional Commits style (feat/fix/docs/test/refactor/chore).

## Development

```bash
docker compose up -d db      # Postgres + pgvector
cp .env.example .env         # fill AUTH_SECRET
npm install
npm run db:migrate
npm run db:seed              # optional sample data
npm run openapi:generate
npm run dev                  # http://localhost:3000
```

Optional features: set `EMBEDDING_API_URL` (+ key/model) for semantic search,
`AI_API_URL`/`AI_API_MODEL` for AI summaries, `PAPEX_VAPID_*` for Web Push.
All of them disable cleanly when unset.

## Checks before opening a PR

```bash
npm run lint                 # eslint
npm run typecheck            # tsc --noEmit
npm run openapi:generate     # keep the spec in sync
npx vitest run               # unit tests
npm audit --registry=https://registry.npmjs.org --audit-level=high
```

E2E (requires the dockerized DB, seeded via `npm run db:seed-arxiv`):

```bash
npm run test:e2e             # playwright
```

## What makes a good contribution

- A completed feature: schema migration + service + API + UI + openapi
  fragment + (unit or e2e) test. Incomplete features are the top source of
  debt in this repo — see the "半成品治理" note in `NEXT-DIRECTIONS.md`.
- Privacy-aware reviews: public co-reviews, ORCID imports and push all respect
  user intent and stay optional.
- Docs updates alongside behavior changes (`docs/`, `README*.md`).

## Releasing

Tags `v*` trigger `.github/workflows/release.yml` (build + auto release notes).
