# Konfiguration

Papex wird über Umgebungsvariablen konfiguriert.

## Datenbank

```bash
DATABASE_URL=postgres://papex:papex@localhost:5432/papex
```

## Auth

```bash
# Secret zum Signieren von JWTs. MUSS in der Produktion ein langer Zufallsstring sein (>= 16 Zeichen).
AUTH_SECRET=change-me-to-a-long-random-string
# Session-TTL in Sekunden (Standard 7 Tage)
AUTH_SESSION_TTL=604800
```

### API-Keys

API-Keys erlauben Skripten und Integrationen, die API ohne Browser-Session aufzurufen.
Sie werden unter **Einstellungen → API-Keys** (`/settings/api-keys`) erstellt; das rohe
Secret wird nur einmal angezeigt. Ein Key wird mit SHA-256 gehasht und an dein
Konto gebunden, erbt also die RBAC deiner Rolle — keine zusätzliche Konfiguration
ist nötig. Sende ihn als:

```http
Authorization: Bearer pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Öffentliche Endpunkte (Papers, Suche, Kategorien, Autoren, Health) akzeptieren auch anonyme
Requests.

## E-Mail (optional)

Die Nachrichten- und Ticket-Systeme benötigen keine E-Mail. Um Benachrichtigungs-E-Mails zu senden, konfiguriere SMTP:

```bash
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

## Speicher (PDF-Backend)

Hochgeladene PDFs werden von einem austauschbaren Backend gespeichert, ausgewählt mit `STORAGE_DRIVER`.

### `local` (Standard)

Der Server verwaltet die PDF-Dateien auf seinem eigenen Dateisystem unter `PAPEX_STORAGE_DIR`
(Standard `./storage`). Die Bytes werden von der Route
`/api/papers/{id}/pdf/{version}` zurückgestreamt. Nutze dies für Docker / Self-Hosted / Dev.

```bash
STORAGE_DRIVER=local
PAPEX_STORAGE_DIR=./storage
```

### `s3` (S3-kompatibler Objektspeicher)

Uploads gehen in einen S3-kompatiblen Bucket (AWS S3, MinIO, Cloudflare R2, DigitalOcean
Spaces). Die Streaming-Route gibt dann einen `302`-Redirect auf eine **signierte** (oder
öffentliche) Objekt-URL zurück, sodass das PDF vom Objektspeicher ausgeliefert wird und nie
durch den Server geht — erforderlich auf read-only/serverless-Plattformen wie Vercel.

```bash
STORAGE_DRIVER=s3
PAPEX_S3_BUCKET=papex-pdfs
PAPEX_S3_REGION=auto            # us-east-1 für AWS; "auto" für Cloudflare R2
PAPEX_S3_ENDPOINT=https://s3.amazonaws.com   # erforderlich für R2 / MinIO / Spaces
PAPEX_S3_ACCESS_KEY_ID=...
PAPEX_S3_SECRET_ACCESS_KEY=...
PAPEX_S3_FORCE_PATH_STYLE=true  # true für MinIO/R2/Spaces; false für AWS virtual-hosted
# Optional: ist der Bucket/CDN öffentlich, setze diese Basis-URL, um das Signieren zu überspringen:
# PAPEX_S3_PUBLIC_BASE=https://cdn.example.com
```

Unabhängig vom Backend zeigt die auf jeder Paper-Version gespeicherte `pdfUrl` immer auf
die Streaming-Route, sodass UI und API backend-agnostisch bleiben.
