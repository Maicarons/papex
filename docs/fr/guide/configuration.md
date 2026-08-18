# Configuration

Papex est configuré via des variables d'environnement.

## Base de données

```bash
DATABASE_URL=postgres://papex:papex@localhost:5432/papex
```

## Authentification

```bash
# Secret used to sign JWTs. MUST be a long random string in production (>= 16 chars).
AUTH_SECRET=change-me-to-a-long-random-string
# Session TTL in seconds (default 7 days)
AUTH_SESSION_TTL=604800
```

### Clés API

Les clés API permettent à des scripts et intégrations d'appeler l'API sans session navigateur.
Elles sont créées depuis **Paramètres → Clés API** (`/settings/api-keys`) ; le secret brut
n'est affiché qu'une seule fois. Une clé est hachée avec SHA-256 et liée à votre
compte, donc elle hérite des permissions RBAC de votre rôle — aucune configuration
supplémentaire n'est requise. Envoyez-la ainsi :

```http
Authorization: Bearer pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Les endpoints publics (articles, recherche, catégories, auteurs, santé) acceptent aussi les requêtes anonymes.

## E-mail (optionnel)

Les systèmes de messages et de tickets ne nécessitent pas d'e-mail. Pour envoyer des e-mails de notification, configurez SMTP :

```bash
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

## Stockage (backend PDF)

Les PDF envoyés sont stockés par un backend pluggable, sélectionné avec `STORAGE_DRIVER`.

### `local` (par défaut)

Le serveur gère les fichiers PDF sur son propre système de fichiers sous `PAPEX_STORAGE_DIR`
(par défaut `./storage`). Les octets sont renvoyés en streaming par la route
`/api/papers/{id}/pdf/{version}`. À utiliser pour Docker / auto-hébergé / dev.

```bash
STORAGE_DRIVER=local
PAPEX_STORAGE_DIR=./storage
```

### `s3` (stockage objet compatible S3)

Les envois vont vers un bucket compatible S3 (AWS S3, MinIO, Cloudflare R2, DigitalOcean
Spaces). La route de streaming renvoie alors une redirection `302` vers une URL d'objet
**pré-signée** (ou publique), afin que le PDF soit servi par le magasin d'objets et ne passe
jamais par le serveur — requis sur les plateformes en lecture seule / serverless comme Vercel.

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

Quel que soit le backend, le `pdfUrl` stocké sur chaque version d'article pointe toujours vers
la route de streaming, donc l'UI et l'API restent indépendants du backend.
