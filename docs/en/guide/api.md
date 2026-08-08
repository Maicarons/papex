# API

Papex exposes a set of JSON HTTP APIs under `/api`.

## Auth

- `POST /api/auth/register` — register `{username, email, displayName, password}`
- `POST /api/auth/login` — login `{identifier, password}`
- `POST /api/auth/logout` — logout
- `GET /api/auth/me` — current user

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
