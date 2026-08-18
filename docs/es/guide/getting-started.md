# Primeros pasos

Esta guía le ayuda a ejecutar Papex localmente.

## Requisitos

- Node.js ≥ 18.18
- PostgreSQL ≥ 16 (Docker recomendado)
- npm o pnpm

## 1. Instalar dependencias

```bash
npm install
```

## 2. Preparar la base de datos

Inicie Postgres con el `docker-compose.yml` incluido:

```bash
docker compose up -d db
```

Copie y rellene el archivo de entorno:

```bash
cp .env.example .env
# Defina al menos DATABASE_URL y AUTH_SECRET
```

## 3. Ejecutar migraciones y sembrar

```bash
npm run db:migrate
npm run db:seed
```

`db:seed` escribe la taxonomía completa de categorías, artículos de ejemplo y una cuenta de administrador.

## 4. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Visite http://localhost:3000.

## Cuentas por defecto

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| Admin | `admin` | `admin123456` |
| Autor (ejemplo) | `demo` | `password123` |

> Cambie las contraseñas por defecto en producción y use un `AUTH_SECRET` largo y aleatorio.
