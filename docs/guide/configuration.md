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

## Storage (PDF backend)

Uploaded PDFs are stored by a pluggable backend, selected with `STORAGE_DRIVER`.

### `local` (default)

The server manages the PDF files on its own filesystem under `PAPEX_STORAGE_DIR`
(default `./storage`). Bytes are streamed back by the route
`/api/papers/{id}/pdf/{version}`. Use this for Docker / self-hosted / dev.

```bash
STORAGE_DRIVER=local
PAPEX_STORAGE_DIR=./storage
```

### `s3` (S3-compatible object storage)

Uploads go to an S3-compatible bucket (AWS S3, MinIO, Cloudflare R2, DigitalOcean
Spaces). The streaming route then returns a `302` redirect to a **presigned** (or
public) object URL, so the PDF is served by the object store and never passes
through the server — required on read-only/serverless platforms like Vercel.

```bash
STORAGE_DRIVER=s3
PAPEX_S3_BUCKET=papex-pdfs
PAPEX_S3_REGION=auto            # us-east-1 for AWS; "auto" for Cloudflare R2
PAPEX_S3_ENDPOINT=https://s3.amazonaws.com   # required for R2 / MinIO / Spaces
PAPEX_S3_ACCESS_KEY_ID=...
PAPEX_S3_SECRET_ACCESS_KEY=...
PAPEX_S3_FORCE_PATH_STYLE=true  # true for MinIO/R2/Spaces; false for AWS virtual-hosted
# Optional: if the bucket/CDN is public, set this base URL to skip signing:
# PAPEX_S3_PUBLIC_BASE=https://cdn.example.com
```

Regardless of backend, the `pdfUrl` stored on each paper version always points at
the streaming route, so the UI and API stay backend-agnostic.
