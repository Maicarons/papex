# Démarrage

Ce guide vous aide à exécuter Papex en local.

## Prérequis

- Node.js ≥ 18.18
- PostgreSQL ≥ 16 (Docker recommandé)
- npm ou pnpm

## 1. Installer les dépendances

```bash
npm install
```

## 2. Préparer la base de données

Démarrez Postgres avec le `docker-compose.yml` fourni :

```bash
docker compose up -d db
```

Copiez et renseignez le fichier d'environnement :

```bash
cp .env.example .env
# Renseignez au minimum DATABASE_URL et AUTH_SECRET
```

## 3. Exécuter les migrations et le seed

```bash
npm run db:migrate
npm run db:seed
```

`db:seed` écrit la taxonomie complète des catégories, des articles d'exemple et un compte admin.

## 4. Démarrer le serveur de développement

```bash
npm run dev
```

Rendez-vous sur http://localhost:3000.

## Comptes par défaut

| Rôle | Nom d'utilisateur | Mot de passe |
| --- | --- | --- |
| Admin | `admin` | `admin123456` |
| Auteur (exemple) | `demo` | `password123` |

> Changez les mots de passe par défaut en production et utilisez un `AUTH_SECRET` long et aléatoire.
