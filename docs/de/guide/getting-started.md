# Erste Schritte

Dieses Handbuch hilft dir, Papex lokal auszuführen.

## Voraussetzungen

- Node.js ≥ 18.18
- PostgreSQL ≥ 16 (Docker empfohlen)
- npm oder pnpm

## 1. Abhängigkeiten installieren

```bash
npm install
```

## 2. Datenbank vorbereiten

Starte Postgres mit der mitgelieferten `docker-compose.yml`:

```bash
docker compose up -d db
```

Kopiere und fülle die Umgebungsdatei aus:

```bash
cp .env.example .env
# Setze mindestens DATABASE_URL und AUTH_SECRET
```

## 3. Migrationen ausführen und befüllen

```bash
npm run db:migrate
npm run db:seed
```

`db:seed` schreibt die vollständige Kategorietaxonomie, Beispiel-Papers und ein Admin-Konto.

## 4. Entwicklungsserver starten

```bash
npm run dev
```

Öffne http://localhost:3000.

## Standardkonten

| Rolle | Benutzername | Passwort |
| --- | --- | --- |
| Admin | `admin` | `admin123456` |
| Autor (Beispiel) | `demo` | `password123` |

> Ändere die Standardpasswörter in der Produktion und verwende ein langes, zufälliges `AUTH_SECRET`.
