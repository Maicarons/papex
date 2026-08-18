# Configurazione

Papex è configurato tramite variabili d'ambiente.

## Database

```bash
DATABASE_URL=postgres://papex:papex@localhost:5432/papex
```

## Auth

```bash
# Segreto usato per firmare i JWT. DEVE essere una stringa lunga e casuale in produzione (>= 16 caratteri).
AUTH_SECRET=change-me-to-a-long-random-string
# TTL di sessione in secondi (predefinito 7 giorni)
AUTH_SESSION_TTL=604800
```

### Chiavi API

Le chiavi API permettono a script e integrazioni di chiamare l'API senza una sessione browser.
Sono create da **Impostazioni → Chiavi API** (`/settings/api-keys`); il segreto grezzo
viene mostrato solo una volta. Una chiave è hashata con SHA-256 e associata al tuo
account, così eredita i permessi RBAC del tuo ruolo — non è richiesta alcuna configurazione
aggiuntiva. Inviarla come:

```http
Authorization: Bearer pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Anche gli endpoint pubblici (articoli, ricerca, categorie, autori, health) accettano
richieste anonime.

## Email (opzionale)

I sistemi di messaggi e ticket non richiedono email. Per inviare email di notifica, configura SMTP:

```bash
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

## Storage (backend PDF)

I PDF caricati sono memorizzati da un backend pluggable, selezionato con `STORAGE_DRIVER`.

### `local` (predefinito)

Il server gestisce i file PDF sul proprio filesystem sotto `PAPEX_STORAGE_DIR`
(predefinito `./storage`). I byte sono restituiti in streaming dalla route
`/api/papers/{id}/pdf/{version}`. Usa questo per Docker / self-hosted / dev.

```bash
STORAGE_DRIVER=local
PAPEX_STORAGE_DIR=./storage
```

### `s3` (storage oggetti compatibile S3)

I caricamenti vanno in un bucket compatibile S3 (AWS S3, MinIO, Cloudflare R2, DigitalOcean
Spaces). La route di streaming restituisce quindi un redirect `302` a un URL oggetto **presigned** (o
pubblico), così il PDF è servito dallo store di oggetti e non passa mai
attraverso il server — richiesto su piattaforme read-only/serverless come Vercel.

```bash
STORAGE_DRIVER=s3
PAPEX_S3_BUCKET=papex-pdfs
PAPEX_S3_REGION=auto            # us-east-1 per AWS; "auto" per Cloudflare R2
PAPEX_S3_ENDPOINT=https://s3.amazonaws.com   # richiesto per R2 / MinIO / Spaces
PAPEX_S3_ACCESS_KEY_ID=...
PAPEX_S3_SECRET_ACCESS_KEY=...
PAPEX_S3_FORCE_PATH_STYLE=true  # true per MinIO/R2/Spaces; false per virtual-hosted AWS
# Opzionale: se il bucket/CDN è pubblico, imposta questa URL base per saltare la firma:
# PAPEX_S3_PUBLIC_BASE=https://cdn.example.com
```

Indipendentemente dal backend, il `pdfUrl` memorizzato su ogni versione dell'articolo punta sempre alla
route di streaming, così la UI e l'API restano agnostichi rispetto al backend.
