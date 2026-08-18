# Deployment

Papex kann auf Vercel, in einer beliebigen Docker-Umgebung oder auf einem selbst gehosteten Server bereitgestellt werden.

## Vercel

1. Das Repo in Vercel importieren.
2. Env-Vars setzen: `DATABASE_URL`, `AUTH_SECRET`.
3. Build-Befehl: `npm run build` (Output wird von Next.js verwaltet).
4. Postgres über Vercel Storage binden oder eine externe `DATABASE_URL` füllen.
5. Migrationen einmal nach dem Deploy ausführen: `npm run db:migrate`.
6. **PDF-Speicher**: das Dateisystem von Vercel ist zur Laufzeit read-only, setze daher
   `STORAGE_DRIVER=s3` und die `PAPEX_S3_*`-Variablen (siehe
   [Konfiguration → Speicher](./configuration.md)). Die Streaming-Route
   leitet dann auf eine signierte Objekt-URL um, anstatt Bytes von der Platte auszuliefern.

## Docker / Self-Hosted

Nutze die root-`docker-compose.yml`, um App + Datenbank gemeinsam zu betreiben:

```bash
docker compose up -d
```

Oder nur Postgres in Docker ausführen und das Next.js-Image selbst bauen:

```bash
docker build -t papex .
docker run -e DATABASE_URL=... -e AUTH_SECRET=... -p 3000:3000 papex
```

## Docs-Site

Die Docs werden mit VitePress nach `public/docs` gebaut und von der Haupt-App unter `/docs` ausgeliefert:

```bash
npm run docs:build
```
