# Administration & Permissions

Beyond core submission and search, Papex ships an operator-facing **admin area** and a **fine-grained permission system**. This guide covers four capabilities:

1. **Roles & permissions (RBAC)** — control paper publishing, viewing, downloading and commenting by role or per-user.
2. **User permission management** — assign extra roles and set per-user allow / deny overrides for any permission.
3. **Co-review (peer review)** — admins send co-review requests; reviewers accept, submit opinions and receive receipts, forming a closed loop.
4. **Categorized messages & broadcast** — a unified notification center spanning system notices, review results, ticket receipts, co-review requests, admin DMs and community replies, plus targeted broadcasts.

---

## 1. Roles & Permissions (RBAC)

Papex uses a three-layer model — **base role + assigned roles + per-user overrides** — supporting both bulk role-based authorization and personalized per-user restrictions.

### 1.1 Permission model

| Layer | Description | Maintained at |
| --- | --- | --- |
| Base role | The role inherent to every user in `users.role`: `author` / `moderator` / `admin` | Default `author` at registration |
| Assigned roles | Extra roles layered on a user via the `user_roles` join table | User management page |
| Per-user overrides | Explicit *allow* or *deny* for a single permission on a user; highest priority | User management page |

> ℹ️ `reader` is an **assigned** RBAC role (in the `roles` table), not a database base role (`users.role` only allows `author` / `moderator` / `admin`). The base role defines the login and default permission boundary; assigned roles stack on top.

### 1.2 Permission catalog

The system ships **15 permissions** across **6 groups**:

| Group | Permission key | Name | Description |
| --- | --- | --- | --- |
| paper | `paper:publish` | Publish paper | Submit a new paper or version |
| | `paper:view` | View paper | Browse published papers |
| | `paper:download` | Download paper | Download PDF / source package |
| | `paper:moderate` | Moderate paper | Approve / reject / withdraw |
| comment | `comment:create` | Post comment | Comment & reply under papers |
| | `comment:view` | View comments | Browse the comment section |
| ticket | `ticket:create` | Create ticket | Open feedback / ticket |
| | `ticket:manage` | Manage tickets | Reply to / handle tickets |
| co_review | `co_review:assign` | Assign co-review | Send a co-review request |
| | `co_review:respond` | Take co-review | Accept / decline a request |
| | `co_review:manage` | Manage co-review | View all co-review progress |
| message | `message:broadcast` | Broadcast | Send messages to users |
| admin | `user:manage` | Manage users | View / edit users |
| | `role:manage` | Manage roles | Configure roles & permissions |
| | `permission:manage` | Manage overrides | Per-user allow / deny |

### 1.3 Default role permissions

The seed (`db:seed`) writes a default permission mapping for each system role:

| Role | Count | Permissions |
| --- | --- | --- |
| `admin` | 15 | All permissions |
| `moderator` | 12 | paper view/download/moderate, comment create/view, ticket create/manage, co-review assign/respond/manage, broadcast, user manage |
| `author` | 6 | paper publish/view/download, comment create/view, ticket create |
| `reader` | 3 | paper view/download, comment view |

### 1.4 Resolution order

When a protected operation runs, effective permissions resolve as:

```
base role permissions
  ∪ assigned role permissions      (role union)
  ∪ per-user overrides marked allow
  − per-user overrides marked deny  (overrides win)
```

So even if neither the base nor assigned roles grant `paper:publish`, an explicit *allow* override still permits it; conversely, an explicit *deny* blocks it even when roles grant it.

> Fallback: if the `roles` / `permissions` tables are not yet seeded (e.g. a fresh DB without `db:seed`), the engine falls back to the constant default mapping above to avoid locking the whole site. Running `db:seed` after deploy is still recommended.

### 1.5 Protected operations (gateways)

Key operations are gated; missing permission returns `403`:

- `POST /api/papers` — requires `paper:publish`
- `POST /api/papers/:id/comments` — requires `comment:create`
- Moderation, ticket handling, co-review assignment / management, user & role edits, broadcast, etc. require their respective permissions, and the routes are protected by `middleware` (only `moderator` / `admin` may enter `/admin`).

---

## 2. User permission management

Open **`/admin/users`** (requires `user:manage`):

- **Search users** by username / email / display name, with pagination.
- **Assign extra roles**: tick system roles (`admin` / `moderator` / `author` / `reader`) in the user editor to stack onto the base role.
- **Three-state permission override**: for each of the 15 permissions set:
  - **inherit** (default) — follow the role-union result;
  - **allow** — force-grant even if roles omit it;
  - **deny** — force-block even if roles include it.

All changes save instantly via `PATCH /api/admin/users/:id` and apply to that user's subsequent authorization checks.

---

## 3. Co-review (peer review)

Co-review is a complete peer-review loop connecting **admin → reviewer → author**.

### 3.1 Closed loop

```
Admin assigns ──► Reviewer gets a "co-review request" message
     │
     ▼
Reviewer responds (accept / decline)
     │ accept
     ▼
Reviewer submits opinion (approve / reject / revise + comment)
     │
     ▼
System receipt ──► notifies assigner "opinion submitted"
                ──► notifies author "co-review completed" (if author ≠ assigner)
```

### 3.2 State machine

A co-review record (`co_reviews`) transitions as follows:

| State | Meaning | Entered by |
| --- | --- | --- |
| `pending` | Awaiting reviewer response | Admin assignment (`POST /api/co-reviews`) |
| `accepted` | Accepted | Reviewer accepts (`POST /api/co-reviews/:id/respond` `{accepted:true}`) |
| `declined` | Declined | Reviewer declines (`respond` `{accepted:false}`) |
| `completed` | Completed | Reviewer submits opinion (`submit`) |
| `expired` | Expired | (reserved state for timeout closure) |

> A reviewer may only respond while `pending`, and may only submit an opinion while `accepted`. A mismatched state returns `INVALID_STATE`.

### 3.3 Entry points & notifications

- **Admin**: `/admin/co-reviews` to assign and monitor all co-reviews; `/admin/co-reviews/:id` for detail. Assignment picks from papers in `submitted` status.
- **Reviewer**: `/co-reviews` (my reviews) and `/co-reviews/:id` (accept / decline + submit opinion).
- **Unified notifications**: every state change fires a `co_review_request` / `co_review_result` message to the relevant parties (see Section 4).

---

## 4. Categorized messages & broadcast

### 4.1 Message categories

Messages are classified by `kind` into **8 categories**, colored and grouped in the inbox:

| kind | Label | Tone | Typical source |
| --- | --- | --- | --- |
| `system` | System notice | default | System events |
| `ticket_reply` | Ticket receipt | info blue | Ticket replied |
| `announcement` | Announcement | warning yellow | Admin broadcast |
| `review_result` | Review result | success green | Paper approved / rejected |
| `co_review_request` | Co-review request | purple | Co-review assigned |
| `co_review_result` | Co-review receipt | purple | Response / opinion submitted |
| `admin_message` | Admin DM | danger red | Targeted direct message |
| `community_reply` | Community reply | info blue | Comment replied to |

The inbox (`/messages`) supports filtering by category (`GET /api/messages?kind=...`); clicking a message navigates to its associated `link` (paper, ticket, co-review, …).

### 4.2 Unified notification funnel

All cross-module alerts are emitted through a single `notifications` service so review, ticket, co-review and community modules share one notification contract:

- **Review**: paper decision → notify author (`review_result`).
- **Tickets**: staff reply → notify reporter (`ticket_reply`).
- **Co-review**: assign / respond / submit → notify reviewer, assigner, author (`co_review_request` / `co_review_result`).
- **Community**: comment replied → notify parent-comment author (`community_reply`).

### 4.3 Broadcast

Open **`/admin/messages`** (requires `message:broadcast`):

- **Scope**:
  - `all` — every user;
  - `role` — a base role (`author` / `moderator` / `admin`);
  - `userIds` — a list of specific user IDs.
- **Kind**: `announcement` / `system` / `admin_message`.
- Fill in title, body (with optional `link`), submit, and the message is written in bulk to the target audience; the success count is returned.

---

## 5. Admin navigation

Admin entry points live in the logged-in user menu and the `/admin` overview, including:

| Module | Route | Description |
| --- | --- | --- |
| Overview | `/admin` | Stats cards + module shortcuts |
| Review queue | `/admin/review` | Approve / reject papers (+ reason) |
| Stats | `/admin/stats` | Platform metrics |
| Tickets | `/admin/tickets` | Ticket handling |
| Co-review | `/admin/co-reviews` | Assign & monitor co-reviews |
| Users | `/admin/users` | Roles & permission overrides |
| Roles | `/admin/roles` | Role permission matrix |
| Messages | `/admin/messages` | Broadcast |

> These routes are protected by `middleware`; only users with a `moderator` or `admin` base role may access them, and write actions additionally require the matching fine-grained permission.

---

## 6. Ops: migrate & seed

The four systems depend on migration `0003_add_rbac_co_review_messages` (adds `roles` / `permissions` / `role_permissions` / `user_roles` / `user_permissions` / `co_reviews` / `moderation_logs`, and extends `messages.kind` to 8 categories). On deploy or local init run:

```bash
npm run db:migrate   # apply migrations (RBAC / co-review / message categories)
npm run db:seed      # write 4 system roles + 15 permissions + defaults (idempotent)
```

The RBAC seed uses `onConflictDoNothing` and is safe to re-run. After migrate + seed, the permission engine uses the `roles` / `permissions` tables; before seeding it falls back to the constant defaults (see 1.4).

---

## 7. API quick reference

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/messages?kind=` | Inbox, filter by category |
| `POST` | `/api/papers/:id/moderate` | Moderate `{action:"approve"\|"reject"\|"withdraw", reason?}` |
| `GET` | `/api/co-reviews?scope=mine\|all` | Co-review list (mine / all) |
| `POST` | `/api/co-reviews` | Assign `{paperId, reviewerId, note?}` |
| `GET` | `/api/co-reviews/:id` | Co-review detail |
| `POST` | `/api/co-reviews/:id/respond` | Respond `{accepted:boolean}` |
| `POST` | `/api/co-reviews/:id/submit` | Submit `{decision:"approve"\|"reject"\|"revise", comment}` |
| `GET` | `/api/admin/users` | User list (pagination / search) |
| `PATCH` | `/api/admin/users/:id` | Set roles `{roleKeys}` or override `{permission:{key,grant}}` |
| `GET` | `/api/admin/roles` | Role list |
| `PUT` | `/api/admin/roles/:id` | Set role permissions `{permissionKeys}` |
| `POST` | `/api/admin/messages` | Broadcast `{scope, role?, userIds?, kind, title, body, link?}` |
| `GET` | `/api/admin/stats` | Platform stats |

See the [API reference](/en/guide/api) for the full list.
