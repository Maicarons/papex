# API

Papex exposes a set of JSON HTTP APIs under `/api`.

## Interactive reference

A complete, machine-readable **OpenAPI 3.1** specification is served at
[`/api/openapi.json`](/api/openapi.json), and an interactive, Try-it-capable
explorer (powered by [Scalar](https://scalar.com)) is available at
**[/api-docs](/api-docs)**. Open it to browse every endpoint, inspect request
and response schemas, and send live requests from your browser.

## Keeping the docs in sync (code-first)

The OpenAPI document is **generated from the code**, not written by hand. Each
route owns a sibling fragment `route.openapi.ts` that is the single source of
truth for that endpoint's docs. The static part (info, `components/schemas`,
`components/responses`, security) lives in `src/lib/openapi/base.ts`.

The generator (`src/lib/openapi/generate.ts`) scans every fragment, merges them
into the base, and writes `src/lib/openapi/spec.generated.ts` — the file served
by `/api/openapi.json`.

```bash
# regenerate after editing a fragment (/api/openapi.json + /api-docs update)
npm run openapi:generate
```

This is wired into `predev` and `prebuild`, so the spec is always rebuilt before
`next dev` / `next build`. **Never edit `spec.generated.ts` by hand** — it is
overwritten on every run.

### Documenting a new endpoint

When you add a route handler `src/app/api/foo/bar/route.ts`, create a sibling
`route.openapi.ts`:

```ts
export default {
  "/api/foo/bar": {
    get: {
      tags: ["Discovery"],
      summary: "Describe what it does",
      // security: []            // omit for public endpoints
      responses: {
        200: { description: "OK", content: { "application/json": { schema: { type: "object" } } } },
      },
    },
  },
} as const;
```

Run `npm run openapi:generate` (or just start/build) and the endpoint appears in
`/api/openapi.json` and `/api-docs` automatically. Shared schemas live in
`src/lib/openapi/base.ts` (e.g. `#/components/schemas/PaperListItem`).

## Authentication

There are two ways to authenticate:

1. **Session cookie** (`papex_session`) — issued on login and used by the
   browser. Sent automatically for same-origin requests.
2. **API key** (`Authorization: Bearer pk_…`) — for scripts and third-party
   integrations. Create keys from **Settings → API Keys**
   (`/settings/api-keys`). A key is bound to your account and inherits your
   role's RBAC permissions, so every endpoint that works with a session cookie
   also works with an API key. The raw secret is shown **only once** at
   creation; only its SHA-256 hash is stored.

Example request with an API key:

```bash
curl -H "Authorization: Bearer pk_live_xxxx" https://your-host/api/papers?pageSize=1
```

Public (unauthenticated) endpoints — such as listing papers, search,
categories, authors and health — work for anonymous callers, session cookies,
and API keys alike.

## Auth

- `POST /api/auth/register` — register `{username, email, displayName, password}`
- `POST /api/auth/login` — login `{identifier, password}`
- `POST /api/auth/logout` — logout
- `GET /api/auth/me` — current user

## API keys

- `GET /api/settings/api-keys` — list your keys
- `POST /api/settings/api-keys` — create a key `{name, scopes?:["read"|"write"], environment?:"live"|"test", expiresAt?:ISODate|null}`
- `DELETE /api/settings/api-keys?id=<keyId>` — revoke a key

## Papers

- `GET /api/papers` — list (supports `q`, `category`)
- `GET /api/papers/:id` — detail
- `GET /api/papers/:id/comments` — comments
- `POST /api/papers` — submit (auth required, needs `paper:publish`)
- `POST /api/papers/:id/moderate` — moderate `{action:"approve"|"reject"|"withdraw", reason?}` (needs `paper:moderate`)
- `POST /api/submit/archive` — upload a source-package `tar.gz` to auto-ingest, link citations and build PDF (auth required; see [Submission guide](/en/guide/submission))

## Categories

- `GET /api/categories` — category tree

## Messages

Messages are classified by `kind` into 8 categories: `system`, `ticket_reply`, `announcement`, `review_result`, `co_review_request`, `co_review_result`, `admin_message`, `community_reply`.

- `GET /api/messages` — current user's messages + unread count (supports `?kind=` filter)
- `GET /api/messages/stats` — unread stats
- `POST /api/messages/:id/read` — mark read
- `POST /api/messages` — `{action:"read-all"}` mark all read

## Tickets

- `GET /api/tickets` — my tickets (`?scope=all` admin only)
- `POST /api/tickets` — create `{subject, type, priority, message}`
- `GET /api/tickets/:id` — detail
- `POST /api/tickets/:id` — reply
- `PATCH /api/tickets/:id` — admin update status/priority

## Feedback

- `POST /api/feedback` — submit feedback (auth required, auto-creates a ticket)

## Co-review

- `GET /api/co-reviews?scope=mine|all` — list (mine / all, respective permission required)
- `POST /api/co-reviews` — assign `{paperId, reviewerId, note?}` (needs `co_review:assign`)
- `GET /api/co-reviews/:id` — detail
- `POST /api/co-reviews/:id/respond` — reviewer responds `{accepted:boolean}`
- `POST /api/co-reviews/:id/submit` — submit opinion `{decision:"approve"|"reject"|"revise", comment}`

## Admin

Admin endpoints require a `moderator` / `admin` base role and are authorized per fine-grained permission.

- `GET /api/admin/users` — user list (pagination / search, needs `user:manage`)
- `PATCH /api/admin/users/:id` — set roles `{roleKeys:string[]}` or override `{permission:{key:string, grant:boolean|null}}` (needs `user:manage` / `permission:manage`)
- `GET /api/admin/roles` — role list (needs `role:manage`)
- `PUT /api/admin/roles/:id` — set role permissions `{permissionKeys:string[]}`
- `POST /api/admin/messages` — broadcast `{scope:"all"|"role"|"userIds", role?, userIds?, kind:"announcement"|"system"|"admin_message", title, body, link?}` (needs `message:broadcast`)
- `GET /api/admin/stats` — platform stats
