# Deployment

Papex può essere distribuito su Vercel, in qualsiasi ambiente Docker o su un server self-hosted.

## Vercel

1. Importa il repo in Vercel.
2. Imposta le variabili d'ambiente: `DATABASE_URL`, `AUTH_SECRET`.
3. Comando di build: `npm run build` (output gestito da Next.js).
4. Collega Postgres tramite Vercel Storage, o compila un `DATABASE_URL` esterno.
5. Esegui le migrazioni una volta dopo il deploy: `npm run db:migrate`.
6. **Storage PDF**: il filesystem di Vercel è di sola lettura a runtime, quindi imposta
   `STORAGE_DRIVER=s3` e le variabili `PAPEX_S3_*` (vedi
   [Configurazione → Storage](./configuration.md)). La route di streaming reindirizza quindi
   a un URL oggetto presigned invece di servire i byte da disco.

## Docker / self-hosted

Usa il `docker-compose.yml` alla radice per eseguire app + database insieme:

```bash
docker compose up -d
```

Oppure esegui solo Postgres in Docker e crea tu stesso l'immagine Next.js:

```bash
docker build -t papex .
docker run -e DATABASE_URL=... -e AUTH_SECRET=... -p 3000:3000 papex
```

## Sito docs

I docs sono costruiti con VitePress in `public/docs` e serviti dalla app principale su `/docs`:

```bash
npm run docs:build
```
