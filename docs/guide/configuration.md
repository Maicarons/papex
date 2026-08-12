# Configuration

Papex is configured via environment variables.

## Database

```bash
DATABASE_URL=postgres://papex:papex@localhost:5432/papex
```

## Auth

```bash
# Secret used to sign JWTs. MUST be a long random string in production (>= 16 chars).
AUTH_SECRET=change-me-to-a-long-random-string
# Session TTL in seconds (default 7 days)
AUTH_SESSION_TTL=604800
```

### API keys

API keys let scripts and integrations call the API without a browser session.
They are created from **Settings → API Keys** (`/settings/api-keys`); the raw
secret is shown only once. A key is hashed with SHA-256 and bound to your
account, so it inherits your role's RBAC permissions — no extra configuration
is required. Send it as:

```http
Authorization: Bearer pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Public endpoints (papers, search, categories, authors, health) accept anonymous
requests too.

## Email (optional)

The messages and tickets systems do not require email. To send notification emails, configure SMTP:

```bash
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

## Storage (optional)

Full-text (PDF / source) is referenced by URL and can target object storage or static hosting; no extra config is needed.
