# Papex App

> Официальный мобильный клиент платформы академической литературы Papex — Android · HarmonyOS · iOS

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20HarmonyOS%20%7C%20iOS-lightgrey.svg)]()
[![React Native](https://img.shields.io/badge/React%20Native-0.82-61dafb.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Papex App — это официальный мобильный клиент для [Papex](https://github.com/Maicarons/papex), открытой платформы академической литературы. Он задуман как **мобильная замена веб-версии**: читайте работы, управляйте учётной записью и будьте в курсе — где угодно.

Создан на **React Native 0.82 + RNOH 0.82.30** (адаптация HarmonyOS), с единой кодовой базой для Android, HarmonyOS и iOS (~95% общего бизнес-кода).

> ⚠️ **Зависимость**: это приложение использует серверный API Papex. Сначала разверните [сервер Papex](https://github.com/Maicarons/papex).

---

## Возможности

| Приоритет | Возможность | Статус |
| --- | --- | --- |
| P0 | Вход / регистрация / выход, переключение нескольких учётных записей, управление устройствами (удалённый отзыв) | запланировано |
| P0 | Лента главной, дерево категорий (257 двуязычных категорий), постраничный вывод | запланировано |
| P0 | Поиск по ключевым словам + семантический поиск (`/api/search?semantic=1`) | запланировано |
| P0 | Детали работы, переключение версий, чтение PDF с запоминанием прогресса | запланировано |
| P0 | Закладки, подписки, внутренние сообщения / тикеты / обратная связь | запланировано |
| P0 | Профиль, одобрения, двуязычный UI (zh/en), тёмная тема | запланировано |
| P1 | Офлайн-скачивание PDF, кэш метаданных, офлайн-просмотр | запланировано |
| P1 | Синхронизация прогресса чтения между устройствами, push-уведомления (FCM / APNs / PushKit) | запланировано |
| P1 | Биометрическая разблокировка, управление API-ключами, состояния-скелетон/ошибка/пусто | запланировано |
| P2 | Комментарии, одобрения, рекомендации, система общего доступа, статистика чтения | запланировано |
| P3 | Вход по QR (веб ↔ приложение), планшетный макет, просмотр аннотаций только для чтения | запланировано |

> Админ / функции модерации намеренно **не включены** в мобильный клиент — для них используйте веб-версию.

---

## Платформы

| Платформа | Канал | Статус |
| --- | --- | --- |
| Android (minSdk 24+) | Google Play / китайские сторы | запланировано |
| iOS (15+) | App Store | запланировано |
| HarmonyOS (API 12+) | AppGallery | запланировано |

---

## Установка

### Готовые бинарные файлы

Скачайте со страницы [Releases](https://github.com/Maicarons/papex-app/releases) (когда будет опубликовано) или установите из выбранного стора.

### Из исходников

Требования:

- Node.js 20+
- Android SDK (minSdk 24) для сборки под Android
- Xcode 15+ (macOS) для сборки под iOS
- DevEco Studio 5.x (API 12+) + проект AGC для сборки под HarmonyOS

```bash
git clone https://github.com/Maicarons/papex-app.git
cd papex-app
npm install

# сгенерировать типы API из OpenAPI-документа сервера Papex
npm run gen:types

# настроить базовый URL API
cp .env.example .env

# запустить на Android
npm run android

# запустить на iOS (только macOS)
cd ios && pod install && cd ..
npm run ios

# запустить на HarmonyOS: откройте harmony/ в DevEco Studio, подпишите через AGC, запустите на устройстве/симуляторе
```

Переменные окружения (`.env`):

| Переменная | Описание | По умолчанию |
| --- | --- | --- |
| `API_BASE_URL` | Базовый URL сервера Papex | `https://api.papex.example.com` |
| `PUSH_ENABLED` | Включить регистрацию push | `true` |
| `I18N_FALLBACK` | Резервный язык | `zh` |

---

## Разработка

```bash
npm run lint          # eslint
npm run typecheck     # tsc --noEmit
npm test              # юнит-тесты (Jest + RNTL, покрытие)
npm run e2e:ios       # Detox E2E (симулятор iOS)
npm run e2e:android   # Detox E2E (эмулятор Android)
npm run gen:types     # перегенерировать типы API из openapi.json
npm run sync:i18n     # синхронизировать словари zh/en из репозитория Papex
```

Покрытие тестами: юнит-тесты нацелены на ≥80% покрытия операторов в основных модулях (`lib/api`, `lib/security`, `lib/storage`, stores); E2E покрывает потоки P0 (auth → просмотр → чтение → закладка → подписка → устройства). Сценарии между устройствами покрываются совместно с десктоп-клиентом (см. [план разработки](https://github.com/Maicarons/papex/blob/main/docs/development/papex-app.md)).

---

## Архитектура (кратко)

- **Auth**: access token (JWT, 15 мин) + refresh token (30 дн, ротация, привязка к устройству). Токены хранятся в защищённом хранилище ОС: Keychain (iOS) / Keystore (Android) / HUKS (HarmonyOS).
- **Данные**: MMKV для сессии/настроек/кэша; PDF-файлы кэшируются в песочнице приложения с вытеснением LRU.
- **i18n**: i18next, словари zh/en синхронизируются из репозитория Papex.
- **Типы**: генерируются из `openapi.json` сервера Papex — никогда не пишутся вручную.

Полный план разработки см. в [`docs/development/papex-app.md`](https://github.com/Maicarons/papex/blob/main/docs/development/papex-app.md) репозитория Papex.

---

## Связанные проекты

- [Papex](https://github.com/Maicarons/papex) — серверная платформа (Next.js + PostgreSQL)
- [Papex Desktop](https://github.com/Maicarons/papex-desktop) — настольная рабочая среда исследований (Tauri 2)

---

## Лицензия

[Apache-2.0](LICENSE) — Copyright 2026 The Papex Authors.
