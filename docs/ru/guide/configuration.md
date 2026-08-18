# Конфигурация

Papex настраивается через переменные окружения.

## База данных

```bash
DATABASE_URL=postgres://papex:papex@localhost:5432/papex
```

## Аутентификация

```bash
# Секрет для подписи JWT. В production ДОЛЖЕН быть длинной случайной строкой (>= 16 символов).
AUTH_SECRET=change-me-to-a-long-random-string
# Время жизни сессии в секундах (по умолчанию 7 дней)
AUTH_SESSION_TTL=604800
```

### API-ключи

API-ключи позволяют скриптам и интеграциям вызывать API без браузерной сессии.
Они создаются в **Настройки → API-ключи** (`/settings/api-keys`); исходный
секрет показывается только один раз. Ключ хешируется через SHA-256 и привязывается к вашей
учётной записи, поэтому наследует RBAC-права вашей роли — дополнительная настройка
не требуется. Отправляйте его так:

```http
Authorization: Bearer pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Публичные конечные точки (работы, поиск, категории, авторы, health) также принимают
анонимные запросы.

## Email (необязательно)

Системам сообщений и тикетов email не требуется. Чтобы отправлять уведомления по email, настройте SMTP:

```bash
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

## Хранилище (бэкенд PDF)

Загруженные PDF хранятся подключаемым бэкендом, выбираемым через `STORAGE_DRIVER`.

### `local` (по умолчанию)

Сервер управляет PDF-файлами в собственной файловой системе в `PAPEX_STORAGE_DIR`
(по умолчанию `./storage`). Байты отдаются обратно маршрутом
`/api/papers/{id}/pdf/{version}`. Используйте для Docker / self-hosted / dev.

```bash
STORAGE_DRIVER=local
PAPEX_STORAGE_DIR=./storage
```

### `s3` (объектное хранилище, совместимое с S3)

Загрузки идут в бакет, совместимый с S3 (AWS S3, MinIO, Cloudflare R2, DigitalOcean
Spaces). Потоковый маршрут затем возвращает `302` редирект на **presigned** (или
публичный) URL объекта, поэтому PDF отдаётся хранилищем объектов и никогда не проходит
через сервер — требуется на read-only/serverless платформах вроде Vercel.

```bash
STORAGE_DRIVER=s3
PAPEX_S3_BUCKET=papex-pdfs
PAPEX_S3_REGION=auto            # us-east-1 для AWS; "auto" для Cloudflare R2
PAPEX_S3_ENDPOINT=https://s3.amazonaws.com   # обязательно для R2 / MinIO / Spaces
PAPEX_S3_ACCESS_KEY_ID=...
PAPEX_S3_SECRET_ACCESS_KEY=...
PAPEX_S3_FORCE_PATH_STYLE=true  # true для MinIO/R2/Spaces; false для виртуального хостинга AWS
# Необязательно: если бакет/CDN публичный, задайте этот базовый URL, чтобы пропустить подпись:
# PAPEX_S3_PUBLIC_BASE=https://cdn.example.com
```

Независимо от бэкенда, `pdfUrl`, хранимый на каждой версии работы, всегда указывает на
потоковый маршрут, поэтому UI и API остаются независимыми от бэкенда.
