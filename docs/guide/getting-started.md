# Getting Started

This guide helps you run Papex locally.

## Requirements

- Node.js ≥ 18.18
- PostgreSQL ≥ 16 (Docker recommended)
- npm or pnpm

## 1. Install dependencies

```bash
npm install
```

## 2. Prepare the database

Start Postgres with the bundled `docker-compose.yml`:

```bash
docker compose up -d db
```

Copy and fill in the environment file:

```bash
cp .env.example .env
# Set at least DATABASE_URL and AUTH_SECRET
```

## 3. Run migrations and seed

```bash
npm run db:migrate
npm run db:seed
```

`db:seed` writes the full category taxonomy, sample papers and an admin account.

## 4. Start the dev server

```bash
npm run dev
```

Visit http://localhost:3000.

## Default accounts

| Role | Username | Password |
| --- | --- | --- |
| Admin | `admin` | `admin123456` |
| Author (sample) | `demo` | `password123` |

> Change default passwords in production and use a long random `AUTH_SECRET`.
