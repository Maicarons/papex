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
