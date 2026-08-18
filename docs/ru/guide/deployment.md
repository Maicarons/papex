# Развёртывание

Papex можно развернуть на Vercel, в любом окружении Docker или на self-hosted сервере.

## Vercel

1. Импортируйте репозиторий в Vercel.
2. Задайте переменные окружения: `DATABASE_URL`, `AUTH_SECRET`.
3. Команда сборки: `npm run build` (вывод обрабатывается Next.js).
4. Привяжите Postgres через Vercel Storage или заполните внешний `DATABASE_URL`.
5. Выполните миграции один раз после развёртывания: `npm run db:migrate`.
6. **Хранилище PDF**: файловая система Vercel доступна только для чтения во время выполнения, поэтому задайте
   `STORAGE_DRIVER=s3` и переменные `PAPEX_S3_*` (см.
   [Конфигурация → Хранилище](./configuration.md)). Потоковый маршрут тогда
   перенаправляет на presigned URL объекта вместо отдачи байтов с диска.

## Docker / self-hosted

Используйте корневой `docker-compose.yml`, чтобы запустить приложение и базу данных вместе:

```bash
docker compose up -d
```

Или запустите только Postgres в Docker и соберите образ Next.js самостоятельно:

```bash
docker build -t papex .
docker run -e DATABASE_URL=... -e AUTH_SECRET=... -p 3000:3000 papex
```

## Сайт документации

Документация собирается VitePress в `public/docs` и обслуживается основным приложением по `/docs`:

```bash
npm run docs:build
```
