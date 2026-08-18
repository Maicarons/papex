# Per iniziare

Questa guida ti aiuta a eseguire Papex in locale.

## Requisiti

- Node.js ≥ 18.18
- PostgreSQL ≥ 16 (Docker consigliato)
- npm o pnpm

## 1. Installa le dipendenze

```bash
npm install
```

## 2. Prepara il database

Avvia Postgres con il `docker-compose.yml` fornito:

```bash
docker compose up -d db
```

Copia e compila il file di ambiente:

```bash
cp .env.example .env
# Imposta almeno DATABASE_URL e AUTH_SECRET
```

## 3. Esegui le migrazioni e il seed

```bash
npm run db:migrate
npm run db:seed
```

`db:seed` scrive l'intera tassonomia delle categorie, articoli di esempio e un account admin.

## 4. Avvia il server di sviluppo

```bash
npm run dev
```

Visita http://localhost:3000.

## Account predefiniti

| Ruolo | Nome utente | Password |
| --- | --- | --- |
| Admin | `admin` | `admin123456` |
| Author (esempio) | `demo` | `password123` |

> Cambia le password predefinite in produzione e usa un `AUTH_SECRET` lungo e casuale.
