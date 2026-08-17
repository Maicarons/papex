# Papex — Open-Source Academic Literature Platform

> Open-source academic literature management & showcase platform · Apache-2.0 · Full-stack Next.js · Deployable on Vercel

Papex is an open-source (Apache-2.0) platform for managing and showcasing academic literature. It covers the core capabilities of academic paper submission, discovery and presentation: paper submission and versioning, preview and download, subject categorization, full-text search and filtering, authors and affiliations, comments and discussion, subscription alerts, personal profiles and user accounts, a moderation/review workflow, an open API, dark mode and a responsive layout.

<p align="center">
  <img src="docs/public/papex-explainer.gif" alt="Papex 60-second product demo" width="720" />
</p>

> A 60-second tour of Papex — submission, versioning, full-text search, community and open-source deployment.

<p align="center">
  <img src="docs/public/papex-whatsnew.gif" alt="What's new in Papex" width="720" />
</p>

> What's new in Papex — browser-based authoring (`/writespace`), the co-review loop, unified messages & tickets, and the role-based permission system.

- **Front end and back end are both Next.js (App Router)**: Server Components read the database directly, Route Handlers expose the REST API.
- **Data layer**: Drizzle ORM + PostgreSQL, full-text search backed by PostgreSQL `tsvector`.
- **UI**: shadcn/ui style (Radix primitives + Tailwind CSS 4, CSS-first config + `@tailwindcss/postcss`), Lucide icons, next-themes dark mode; charts use ECharts 6.
- **State**: Zustand for client-side filtering/interaction state.
- **Auth**: jose (JWT) + bcryptjs, httpOnly cookie session, middleware protecting write-operation routes.

---

## Table of Contents

- [Feature Matrix](#feature-matrix)
- [Technical Architecture](#technical-architecture)
- [Tech Stack Versions](#tech-stack-versions)
- [Directory Structure](#directory-structure)
- [Data Model](#data-model)
- [Feature Modules](#feature-modules)
- [Core Flows](#core-flows)
- [Local Development](#local-development)
- [Database Migration & Seed](#database-migration--seed)
- [Deployment](#deployment)
- [API Overview](#api-overview)
- [Roadmap](#roadmap)

---

## Feature Matrix

| Core capability | Papex implementation | Status |
| --- | --- | --- |
| Paper submission (PDF / metadata) | `/submit` form + API | Yes |
| Versioning (v1, v2… permanently archived) | `paper_versions` table + version switcher page | Yes |
| Paper preview & download | detail page abstract / PDF link + download API | Yes |
| Subject categories & tags | `categories` 8 top-level + subcategories, cross-listing | Yes |
| Full-text search & filtering | `tsvector` full-text index + multi-dimensional filter API | Yes |
| Authors & affiliations | `authors` / `affiliations` + author profile | Yes |
| Comments & discussion | `comments` threaded replies + API | Yes |
| Subscriptions & alerts | `subscriptions` (category/author/paper) + alert list | Yes |
| Personal profile & user system | `/u/[username]` + auth | Yes |
| Submission moderation flow | `admin/review` queue + moderation state machine | Yes |
| Open API | `/api/*` REST + OpenAPI 3.1 spec + interactive docs | Yes |
| API key management | `/settings/api-keys` — programmatic access, inherits RBAC | Yes |
| Dark mode | next-themes + CSS variables | Yes |
| Responsive layout | Tailwind containers + mobile-first | Yes |
| Endorsement | `endorsements` table + first-submission endorsement gate | Basic |
| RSS / email alerts | RSS route + Resend / SMTP delivery (configurable) | Yes |
| Advanced boolean search | field scoping (ti/abs/au/cat/id) + AND/OR/NOT + parentheses | Yes |
| Multilingual full-text search | CJK via `pg_trgm` trigram ILIKE, Latin via `tsvector` (english/simple) | Yes |
| Batch PDF parsing | pdf-parse extracts text/metadata + regex references (paper id / DOI) | Yes |
| Citation graph | `citations` table records DOI/paper-id relations, ECharts force-directed graph with zoom/pan/click | Yes |
| Citation analytics | co-cited / co-citing / second-level references + citation counts & sort | Yes |
| Citation export | GB/T 7714 · BibTeX · APA one-click copy on the paper page | Yes |
| Bibliometrics | per-author citation totals, H-index, co-author network (ECharts) | Yes |
| Hot tags & keyword networks | homepage tag cloud, keyword co-occurrence graph + publication trend on the list page | Yes |
| Advanced search UI | field selector (full-text/title/author/abstract/category) + time range + sort-by-citations | Yes |
| Admin analytics | submission/category/author/review aggregate panel (ECharts 6) | Yes |
| Notification center | `/feed` announcements hub + Rss bell with a live unread badge (Zustand-synced) | Yes |
| Bookmarks | `bookmarks` table + `/bookmarks` collection page + one-click save on paper detail | Yes |
| Bookmark groups | organize bookmarks into named groups, move items between groups | Yes |

---

## Technical Architecture

```
+-----------------------------Browser (RSC + Client)-----------------------------+
|   Server Components read DB directly  ·  Client Components call /api           |
+------------------+-------------------------------+----------------------------+
                   | read (Server)                 | write/interaction (Client fetch)
                   v                               v
+--------------------------------+   +----------------------------------+
|  Next.js App Router            |   |  Next.js Route Handlers          |
|  app/**/page.tsx               |   |  app/api/**/route.ts             |
|  lib/services/* (queries)      |   |  lib/services/* (mutations)      |
+---------------+----------------+   +----------------+------------------+
                |                                  |
                +------------------+-----------------+
                                   v
                     +--------------------------+
                     |  Drizzle ORM             |
                     |  (postgres-js driver)    |
                     +------------+-------------+
                                  v
                     +--------------------------+
                     |  PostgreSQL              |
                     |  (Vercel Postgres /      |
                     |   Neon / self-hosted)    |
                     +--------------------------+
```

**Layering principles**
- `lib/db/*`: data access only, no business logic.
- `lib/services/*`: business query/mutation functions (server-only), shared by pages and APIs to avoid duplication.
- `app/api/**`: REST boundary, responsible for input validation (zod), auth, and calling services.
- `components/**`: presentation and interaction; client components call via `fetch('/api/...')`.

---

## Tech Stack Versions

> Current major versions (after the 2026-08 upgrade). See `UPGRADE.md` at the repo root for details.

| Area | Technology | Version |
| --- | --- | --- |
| Framework | Next.js (App Router) | 16.3 |
| UI runtime | React | 19 |
| Styling | Tailwind CSS (CSS-first + `@tailwindcss/postcss`) | 4.3 |
| Language | TypeScript | 5.9 |
| Data layer | Drizzle ORM (postgres-js) | 0.45 |
| Charts | ECharts | 6.1 |
| Validation | Zod | 4.4 |
| Auth | jose (JWT) + bcryptjs | 6 / 3 |
| Icons | lucide-react | 1.x |
| State | Zustand | 5 |
| Lint / Test | ESLint 9 (flat config) + Vitest 4 | — |
| PDF parsing | pdf-parse (class-based API) | 2.4 |

> TypeScript is pinned at `5.9` for now: `typescript-eslint` 8.x is still catching up to TS 7, and will be migrated once it ships support.

---

## Directory Structure

```
papex/
├── drizzle/                 # migration SQL generated by drizzle-kit
├── src/
│   ├── app/
│   │   ├── layout.tsx          # root layout: theme/font/Header/Footer
│   │   ├── globals.css         # Tailwind + design tokens (CSS variables)
│   │   ├── page.tsx            # home: latest/popular/category entries
│   │   ├── (auth)/             # login / register
│   │   ├── papers/
│   │   │   ├── page.tsx        # list + search + filter
│   │   │   ├── [id]/page.tsx   # paper detail (latest version)
│   │   │   ├── [id]/[version]/page.tsx  # specific version
│   │   │   └── [id]/edit/page.tsx      # submit a new version
│   │   ├── submit/page.tsx     # new submission
│   │   ├── categories/         # category tree / category detail
│   │   ├── authors/[id]/       # author profile
│   │   ├── u/[username]/       # user profile
│   │   ├── me/                 # my submissions / subscriptions / alerts
│   │   ├── feed/               # announcements / notification center
│   │   ├── subscriptions/      # manage my subscriptions
│   │   ├── bookmarks/          # my bookmarked papers
│   │   ├── admin/review/       # review queue (moderator only)
│   │   └── api/                # REST API (see below)
│   ├── components/
│   │   ├── ui/                 # shadcn-style base components
│   │   ├── site-header.tsx / site-footer.tsx
│   │   ├── theme-provider.tsx / theme-toggle.tsx
│   │   ├── paper-card.tsx / search-bar.tsx / category-tree.tsx
│   │   ├── comment-thread.tsx / submit-form.tsx / review-queue.tsx
│   │   ├── feed-bell.tsx / bookmark-button.tsx   # notification + bookmark toggles
│   │   └── ...
│   ├── lib/
│   │   ├── utils.ts            # cn() etc.
│   │   ├── db/
│   │   │   ├── index.ts        # drizzle singleton
│   │   │   ├── schema.ts       # all tables + relations
│   │   │   └── seed.ts         # seed data
│   │   ├── auth/
│   │   │   ├── session.ts      # JWT sign/verify + cookie
│   │   │   └── password.ts     # bcrypt
│   │   ├── services/           # papers/authors/categories/comments/subscriptions/bookmarks/feed/review
│   │   ├── validations.ts      # zod validation
│   │   ├── paper-id.ts         # paper id generation
│   │   └── search.ts           # full-text search composition
│   ├── hooks/                  # client hooks
│   ├── store/                  # Zustand stores (filters, notification badges)
│   └── types/                  # shared types
├── Dockerfile / docker-compose.yml   # self-hosting
├── vercel.json                        # Vercel config (optional)
├── .github/workflows/ci.yml           # CI: lint + typecheck + build + migrate
├── drizzle.config.ts / tailwind.config.ts / next.config.mjs
└── LICENSE (Apache-2.0)
```

---

## Data Model

Built with Drizzle + PostgreSQL. Core entities and relationships:

| Table | Purpose | Key fields |
| --- | --- | --- |
| `users` | accounts | id, username, email, passwordHash, role(author/admin/moderator), displayName |
| `authors` | author profile (may link to user) | id, userId?, name, orcid?, affiliationId? |
| `affiliations` | institutions | id, name, country? |
| `papers` | paper master record | id (paper-id style), title, primaryCategoryId, status(submitted/approved/withdrawn), createdBy |
| `paper_versions` | version snapshot | id, paperId, version, title, abstract, authors(json), pdfUrl, doi?, license, createdAt |
| `paper_authors` | paper-author association | paperId, authorId, order |
| `categories` | subject categories | id(slug), parentId?, name, description |
| `paper_categories` | paper-category (incl. cross-listing) | paperId, categoryId, isPrimary |
| `comments` | comments / discussion | id, paperId, userId, parentId?, body, createdAt |
| `subscriptions` | subscriptions | id, userId, type(category/author/paper), refId |
| `endorsements` | endorsements | id, endorserId, endorseeId, categoryId |
| `announcements` | alerts / announcements | id, userId, kind, payload(json), read, createdAt, emailedAt |
| `citations` | citation relations | id, paperId, targetPaperId?, targetDoi?, targetArxivId?, targetTitle?, createdById?, createdAt |
| `bookmarks` | read-later collection | id, userId→users.id, paperId→papers.id, createdAt, unique(userId, paperId) |

**Indexes & search**
- `paper_versions` has `to_tsvector('english', title || ' ' || abstract)` generating `search_vector` (GIN index) for Latin full-text search.
- `paper_versions` has a `pg_trgm` trigram GIN index `(coalesce(title,'') || ' ' || coalesce(abstract,'')) gin_trgm_ops` for CJK substring/phrase search (no zhparser required).
- `papers(status, primaryCategoryId, createdAt)` composite index supports list filtering and sorting.
- `comments(paperId, parentId)` supports threaded replies.

See `src/lib/db/schema.ts` for the full definition.

---

## Feature Modules

1. **Submission & versioning** (`services/papers.ts` + `submit`/`edit` pages)
   - New submission writes `papers` + first `paper_versions` (v1), status `submitted`.
   - Submitting a new version adds `paper_versions` (version+1); old versions are kept permanently; supports withdraw (records a reason, content becomes non-downloadable).
2. **Search & filter** (`services/search.ts` + `/api/search` + `lib/search.ts`)
   - Advanced boolean syntax: field scoping (`ti:`/`title:`, `abs:`/`abstract:`, `au:`/`author:`, `cat:`/`category:`, `id:`) + `AND`/`OR`/`NOT` + parentheses; adjacent terms imply AND.
   - Multilingual: Latin via `tsvector` (english/simple) stemming, CJK via `pg_trgm` trigram ILIKE substring, combined with OR.
   - Category + author + date range + sorting (latest/popular). Returns paginated results.
3. **Category system** (`services/categories.ts`) — tree display; category detail page lists papers.
4. **Authors & affiliations** (`services/authors.ts`) — author profile lists their papers and affiliation.
5. **Comments** (`services/comments.ts` + `/api/papers/[id]/comments`) — threaded replies; registered users may comment.
6. **Subscriptions & alerts** (`services/subscriptions.ts`) — subscribe to categories/authors/papers; new papers in scope generate `announcements`. The `/subscriptions` page lists enriched subscriptions (resolved titles + deep links to the subscribed resource) and lets you unsubscribe per row.
7. **User system** (`lib/auth/*` + `services/users.ts`) — register/login/logout, profile, my submissions.
8. **Moderation flow** (`services/review.ts` + `/admin/review`) — moderator can approve/reject/withdraw; first submission in a category requires that category's endorsement.
9. **API** (`app/api/**`) — unified REST, zod validation, JWT auth for write ops.
10. **Feed & notifications** (`services/feed.ts` + `/feed`) — a consolidated announcements hub for the current user (new-in-category, new-from-author, comment replies, admin announcements). Mark single or all as read via `POST /api/feed` / `GET /api/feed?markRead=1`. The header `FeedBell` shows a live unread badge synced through a Zustand notifications store, so marking read anywhere updates the badge immediately.
11. **Bookmarks** (`services/bookmarks.ts` + `/bookmarks`) — save papers for later with a one-click `BookmarkButton` on the paper detail page; `/bookmarks` lists saved papers with titles resolved from `papers`; the user profile shows a "N bookmarks" badge.
12. **Theme & responsive** — `next-themes` + Tailwind container breakpoints.

---

## Core Flows

**Submit → Review → Publish**
```
author /submit -> create papers(submitted) + paper_versions v1
   | (if endorsement needed: check endorsements, or skip for MVP)
   v
moderator /admin/review -> approve -> papers.status = approved
   |
   v
enter list/search/home; subscribers get announcements
```

**Version update**
```
author /papers/[id]/edit -> add paper_versions v(N+1), keep vN
reader sees latest version by default on detail page, can switch to any historical version
```

---

## Local Development

```bash
# 1. Install dependencies (bun or npm)
bun install            # or npm install

# 2. Prepare the database (PostgreSQL)
docker compose up -d db     # start local Postgres

# 3. Environment variables
cp .env.example .env        # fill in AUTH_SECRET (openssl rand -base64 48)

# 4. Migrate + seed
bun db:migrate              # or npm run db:migrate
bun db:seed                 # optional: load sample data

# 5. Start
bun dev                     # http://localhost:3000
```

---

## Database Migration & Seed

- Migrations are generated by `drizzle-kit` into `drizzle/`.
- For production deploys, run `db:migrate` in CI (using the direct `DATABASE_URL_UNPOOLED` connection string).
- The seed script `src/lib/db/seed.ts` writes the category system and sample papers for local preview.

---

## Deployment

### Vercel (recommended)
1. Import the repo → Framework: Next.js (auto-detected).
2. Environment variables: `DATABASE_URL` (Neon pooled string), `DATABASE_URL_UNPOOLED` (direct string), `AUTH_SECRET`.
3. Build Command: `npm run build`; migrations must run before build/deploy — use a `vercel.json` build hook or run `npm run db:migrate` in CI.
4. Click Deploy.
5. **PDF storage**: Vercel's runtime FS is read-only — set `STORAGE_DRIVER=s3` plus `PAPEX_S3_*` (see `docs/guide/configuration.md`). The PDF route then redirects to a presigned object URL.

### Docker (self-hosted)
```bash
docker compose up -d        # includes Postgres + Next service
```

### CI
`.github/workflows/ci.yml`: install → lint → typecheck → build → db:migrate (preview/prod).

---

## API Overview

A complete OpenAPI 3.1 document is served at `/api/openapi.json`, and an
interactive explorer (Scalar) is available at **[/api-docs](/api-docs)**.
The spec is **code-first**: each route's docs live in a sibling
`route.openapi.ts` and are merged by `npm run openapi:generate` (wired into
`predev`/`prebuild`) into `src/lib/openapi/spec.generated.ts`.

**Authentication:** endpoints accept either the session cookie (`papex_session`)
or an API key (`Authorization: Bearer pk_…`). API keys are created from
**Settings → API Keys** and inherit the owner's RBAC permissions. Public
endpoints work anonymously, with a cookie, or with an API key.

| Method | Path | Description | Auth |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Register | Public |
| POST | `/api/auth/login` | Login | Public |
| POST | `/api/auth/logout` | Logout | Logged in |
| GET | `/api/auth/me` | Current user | Logged in |
| GET/POST/DELETE | `/api/settings/api-keys` | List / create / revoke API keys | Logged in |
| GET | `/api/papers` | Paper list (paginated/filtered) | Public |
| POST | `/api/papers` | New submission | Logged in |
| GET | `/api/papers/[id]` | Paper detail | Public |
| GET | `/api/papers/[id]/versions` | Version list | Public |
| POST | `/api/papers/[id]/versions` | Submit new version | Author |
| GET/POST | `/api/papers/[id]/comments` | Comment list / post | Public / Logged in |
| GET | `/api/search` | Full-text search | Public |
| GET | `/api/categories` | Category tree | Public |
| GET | `/api/authors` | Author search | Public |
| GET/POST/DELETE | `/api/subscriptions` | Subscription management | Logged in |
| POST | `/api/papers/[id]/moderate` | Moderation action | Moderator |
| GET/POST | `/api/papers/[id]/citations` | Citation list / add citation | Public / Author·Moderator |
| POST | `/api/papers/[id]/pdf` | Upload & parse PDF (metadata + references) | Author |
| GET | `/api/papers/[id]/pdf/[version]` | Stream PDF download | Public |
| POST | `/api/admin/ingest` | Batch import (multipart multi-PDF or JSON metadata) | Moderator |
| GET | `/api/admin/stats` | Admin analytics aggregation | Moderator |
| GET | `/api/feed` | Current user alerts / RSS (`?markRead=1` marks all read) | Logged in |
| POST | `/api/feed` | Mark a single announcement read `{id}` | Logged in |
| GET/POST/DELETE | `/api/bookmarks` | List / toggle / remove bookmarks | Logged in |

---

## Roadmap (completed)

- [x] **Email alerts via Resend / SMTP** — `lib/email/*`: switch with `EMAIL_PROVIDER`; Resend uses fetch REST (no SDK), SMTP uses nodemailer. New-paper alerts fan out via `services/feed.ts`; delivery failure does not block publishing.
- [x] **Batch PDF parsing & metadata extraction (pdf-parse)** — `lib/pdf.ts` + `/api/papers/[id]/pdf` parses text/page count on upload, regex-extracts references (paper id / DOI) and attempts to auto-link on-site papers; `/api/admin/ingest` supports batch import (multi-PDF or JSON metadata).
- [x] **Citation graph (by DOI / paper id)** — `citations` table records relations; `/api/papers/[id]/citations` exposes in/out links; the detail page renders an ECharts force-directed graph with wheel zoom, drag pan and click-to-navigate.
- [x] **Citation analytics** — co-cited / co-citing / second-level reference blocks on the paper page (`citationRelated`), citation counts on cards and `sort=by_citations`, GB/T 7714 · BibTeX · APA export via the `CiteButton`.
- [x] **Bibliometrics** — author pages show citation totals, H-index and an ECharts co-author network (`getAuthorMetrics`).
- [x] **Tag system** — `tags` / `paper_tags` (migration `0006_add_tags.sql`), user-created tags, keyword auto-tagging on submit, `?tag=` filtering, homepage hot-tag cloud, keyword co-occurrence graph on the list page.
- [x] **Advanced search UI** — field selector, time-range filter (`?from=`), sort-by-citations on the paper list (`PapersFilter`).
- [x] **Publication trend** — yearly approved-paper line chart on the list page.
- [x] **Bookmark groups** — `group_name` column (migration `0008_add_bookmark_groups.sql`), grouped collection page, move between groups via `PATCH /api/bookmarks/:paperId`.
- [x] **Ticket status machine** — five states incl. `awaiting_user`, reply-driven auto transitions, reporter resolve/reopen, status filter (migration `0007_add_awaiting_user_status.sql`).
- [x] **Advanced boolean search syntax (AND/OR/NOT + field scoping)** — `lib/search.ts` recursive-descent parser supporting `ti/abs/au/cat/id` field scoping and parentheses.
- [x] **Multilingual full-text search (CJK tokenization)** — Latin via `tsvector`, CJK via `pg_trgm` trigram ILIKE (no zhparser plugin needed); combined with OR for mixed Chinese/English queries.
- [x] **Admin analytics panel** — `/admin/stats` + `/api/admin/stats`: totals / by status / Top10 by category / last-14-day submission trend / Top authors aggregates, hand-drawn SVG bar charts.
- [x] **Notification center (`/feed`)** — a consolidated announcements hub (new-in-category, new-from-author, comment replies, admin announcements) with single (`POST /api/feed`) and bulk (`?markRead=1`) mark-read; the header `FeedBell` shows a live unread badge synced through a Zustand store so it updates the moment anything is read.
- [x] **Bookmarks / read-later** — `bookmarks` table (migration `0005_add_bookmarks.sql`), one-click save on the paper detail page via `BookmarkButton`, a `/bookmarks` collection page with titles resolved from `papers`, and a "N bookmarks" badge on the user profile.

---

Copyright 2026 The Papex Authors — Licensed under Apache-2.0.
