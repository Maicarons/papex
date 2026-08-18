# Papex Desktop

> Настольная рабочая среда исследований для платформы академической литературы Papex — Windows · Linux · macOS

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)]()
[![Tauri](https://img.shields.io/badge/Tauri-2.x-24c8db.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Papex Desktop превращает [Papex](https://github.com/Maicarons/papex) — открытую платформу академической литературы — в полноценную **настольную рабочую среду исследований**: локальную библиотеку (local-first), глубокое чтение PDF с выделениями и заметками, управление цитированиями, офлайн-полнотекстовый поиск и синхронизацию с облаком.

Создан на **Tauri 2.x** (Rust-ядро + системный WebView) и **Vite + React 19**, поставляется как лёгкое нативное приложение (≈5–15 МБ установщик, 30–50 МБ памяти).

> ⚠️ **Зависимость**: это приложение использует серверный API Papex. Сначала разверните [сервер Papex](https://github.com/Maicarons/papex).

---

## Возможности

| Приоритет | Возможность | Статус |
| --- | --- | --- |
| P0 | Вход / выход / несколько учётных записей (токены в системном keychain) | запланировано |
| P0 | Трёхпанельная библиотека: 257 двуязычных категорий / список / детали, фильтры и сортировка | запланировано |
| P0 | Онлайн-поиск по ключевым словам + семантический (`/api/search?semantic=1`) | запланировано |
| P0 | Читалка PDF (pdf.js): постранично, масштаб, поиск, закладки, прогресс, инверсия тёмной темы | запланировано |
| P0 | Выделения (многоцветные) + текстовые заметки, локальный SQLite + синхронизация с облаком | запланировано |
| P0 | Офлайн-кэш PDF, офлайн-чтение, управление кэшем | запланировано |
| P0 | Интерактивный граф цитирований (ECharts), уведомления о подписках | запланировано |
| P0 | Системный трей, глобальные горячие клавиши (Ctrl/Cmd+K), блокировка единственного экземпляра | запланировано |
| P1 | Генерация цитирований (CSL: GB/T 7714, APA, MLA, …), экспорт BibTeX / RIS | запланировано |
| P1 | Интеграция LaTeX (`\cite{key}` + блок библиографии, через papex-latex) | запланировано |
| P1 | **Загрузка файлов и изображений**: подача работ, импорт локального PDF, аватар, обложка работы | запланировано |
| P1 | Сохранённые поиски (умные папки), пакетные теги, статистика чтения, двухпанельное чтение | запланировано |
| P2 | Локальный полнотекстовый индекс (tantivy), офлайн-поиск за миллисекунды | запланировано |
| P2 | Вид совместной работы (совместное рецензирование / одобрения / комментарии, только чтение) | запланировано |
| P3 | Необязательные локальные эмбеддинги (Ollama) для офлайн-семантического поиска, прототип плагина | запланировано |

> Админ / функции модерации намеренно **не включены** в десктоп-клиент — для них используйте веб-версию.

---

## Платформы

| Платформа | Артефакт | Канал |
| --- | --- | --- |
| Windows 10+ | NSIS / MSI | Загрузка с сайта + winget (необязательно) |
| macOS 11+ | .dmg (Developer ID + нотаризация) | Сайт + App Store (необязательно) |
| Linux (WebKitGTK 2.44+) | .deb / AppImage / .rpm | Сайт + репозитории дистро (позже) |

---

## Установка

### Готовые бинарные файлы

Скачайте установщик для вашей платформы со страницы [Releases](https://github.com/Maicarons/papex-desktop/releases) (когда будет опубликовано).

### Из исходников

Требования:

- Node.js 20+ & pnpm 9+
- Rust toolchain (stable)
- Windows: WebView2 (предустановлено на Win10/11); Linux: `libwebkit2gtk-4.1-dev` и т. д. (см. ниже)

```bash
git clone https://github.com/Maicarons/papex-desktop.git
cd papex-desktop
pnpm install

# сгенерировать типы API из OpenAPI-документа сервера Papex
pnpm gen:types

# настроить базовый URL API
cp .env.example .env

# разработка (фронтенд HMR + окно Tauri)
pnpm tauri dev

# сборка для текущей платформы
pnpm tauri build
```

Зависимости Linux (Debian/Ubuntu):

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

Переменные окружения (`.env`):

| Переменная | Описание | По умолчанию |
| --- | --- | --- |
| `API_BASE_URL` | Базовый URL сервера Papex | `https://api.papex.example.com` |
| `I18N_FALLBACK` | Резервный язык | `zh` |
| `CACHE_LIMIT_MB` | Лимит локального кэша PDF (МБ) | `2048` |

---

## Разработка

```bash
pnpm lint            # eslint
pnpm typecheck       # tsc --noEmit
pnpm test            # юнит-тесты фронтенда (Vitest, покрытие)
cargo test           # юнит-тесты Rust (в src-tauri)
cargo clippy         # линты Rust (CI требует -D warnings)
pnpm e2e             # Playwright E2E против локального бэкенда Papex
pnpm gen:types       # перегенерировать типы API из openapi.json
pnpm sync:i18n       # синхронизировать словари zh/en из репозитория Papex
```

Покрытие тестами: фронтенд ≥80% покрытия операторов в основных модулях; Rust ≥85% на `commands/*`, `db/*` и `indexer/*`; E2E покрывает потоки P0 (auth → библиотека → чтение → аннотации → офлайн → загрузка). Сценарии между устройствами (десктоп ↔ мобильное ↔ веб) покрываются совместно с мобильным клиентом — см. [план разработки](https://github.com/Maicarons/papex/blob/main/docs/development/papex-desktop.md).

---

## Архитектура (кратко)

- **Auth**: access token (JWT, 15 мин) + refresh token (30 дн, ротация, привязка к устройству). Токены хранятся в системном keychain: Windows Credential Manager / macOS Keychain / Linux Secret Service (файловый fallback).
- **Local-first**: SQLite `papex_local.db` для кэша / аннотаций / прогресса / очереди синхронизации; tantivy для офлайн-полнотекстового индекса (P2).
- **Загрузки**: подача и импорт PDF, аватар, обложка работы — проверяются в Rust, загружаются на сервер Papex с отображением прогресса и повтором.
- **Типы**: генерируются из `openapi.json` сервера Papex — никогда не пишутся вручную.

Полный план разработки см. в [`docs/development/papex-desktop.md`](https://github.com/Maicarons/papex/blob/main/docs/development/papex-desktop.md) репозитория Papex.

---

## Связанные проекты

- [Papex](https://github.com/Maicarons/papex) — серверная платформа (Next.js + PostgreSQL)
- [Papex App](https://github.com/Maicarons/papex-app) — официальный мобильный клиент (React Native + RNOH)

---

## Лицензия

[Apache-2.0](LICENSE) — Copyright 2026 The Papex Authors.
