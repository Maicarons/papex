# Papex App

> Official mobile client for the Papex academic literature platform — Android · HarmonyOS · iOS

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20HarmonyOS%20%7C%20iOS-lightgrey.svg)]()
[![React Native](https://img.shields.io/badge/React%20Native-0.82-61dafb.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Papex App is the official mobile client for [Papex](https://github.com/Maicarons/papex), an open-source academic literature platform. It is designed as a **mobile replacement for the web version**: read papers, manage your account, and stay up to date — anywhere.

Built with **React Native 0.82 + RNOH 0.82.30** (HarmonyOS adaptation), sharing one codebase across Android, HarmonyOS and iOS (~95% shared business code).

> ⚠️ **Dependency**: this app consumes the Papex server API. Deploy the [Papex backend](https://github.com/Maicarons/papex) first.

---

## Features

| Priority | Feature | Status |
| --- | --- | --- |
| P0 | Login / register / logout, multi-account switching, device management (remote revoke) | planned |
| P0 | Home feed, category tree (257 bilingual categories), pagination | planned |
| P0 | Keyword search + semantic search (`/api/search?semantic=1`) | planned |
| P0 | Paper detail, version switching, PDF reading with progress memory | planned |
| P0 | Bookmarks, subscriptions, in-app messages / tickets / feedback | planned |
| P0 | Profile, endorsements, bilingual UI (zh/en), dark mode | planned |
| P1 | Offline PDF download, metadata cache, offline browsing | planned |
| P1 | Cross-device reading progress sync, push notifications (FCM / APNs / PushKit) | planned |
| P1 | Biometric unlock, API key management, skeleton/error/empty states | planned |
| P2 | Comments, endorsements, recommendations, system share sheet, reading stats | planned |
| P3 | QR sign-in (web ↔ app), tablet layout, read-only annotation viewing | planned |

> Admin / moderation features are intentionally **not** included in the mobile client — use the web version for those.

---

## Platforms

| Platform | Channel | Status |
| --- | --- | --- |
| Android (minSdk 24+) | Google Play / CN stores | planned |
| iOS (15+) | App Store | planned |
| HarmonyOS (API 12+) | AppGallery | planned |

---

## Installation

### Prebuilt binaries

Download from the [Releases](https://github.com/Maicarons/papex-app/releases) page (once published), or install from your store of choice.

### From source

Prerequisites:

- Node.js 20+
- Android SDK (minSdk 24) for Android builds
- Xcode 15+ (macOS) for iOS builds
- DevEco Studio 5.x (API 12+) + AGC project for HarmonyOS builds

```bash
git clone https://github.com/Maicarons/papex-app.git
cd papex-app
npm install

# generate API types from the Papex server OpenAPI document
npm run gen:types

# configure API base URL
cp .env.example .env

# run on Android
npm run android

# run on iOS (macOS only)
cd ios && pod install && cd ..
npm run ios

# run on HarmonyOS: open harmony/ in DevEco Studio, sign with AGC, run on device/simulator
```

Environment variables (`.env`):

| Variable | Description | Default |
| --- | --- | --- |
| `API_BASE_URL` | Papex server base URL | `https://api.papex.example.com` |
| `PUSH_ENABLED` | Enable push registration | `true` |
| `I18N_FALLBACK` | Fallback language | `zh` |

---

## Development

```bash
npm run lint          # eslint
npm run typecheck     # tsc --noEmit
npm test              # unit tests (Jest + RNTL, coverage)
npm run e2e:ios       # Detox E2E (iOS simulator)
npm run e2e:android   # Detox E2E (Android emulator)
npm run gen:types     # regenerate API types from openapi.json
npm run sync:i18n     # sync zh/en dictionaries from the Papex repo
```

Test coverage: unit tests target ≥80% statement coverage on core modules (`lib/api`, `lib/security`, `lib/storage`, stores); E2E covers the P0 flows (auth → browse → read → bookmark → subscribe → devices). Cross-device scenarios are covered together with the desktop client (see [development plan](https://github.com/Maicarons/papex/blob/main/docs/development/papex-app.md)).

---

## Architecture (highlights)

- **Auth**: access token (JWT, 15 min) + refresh token (30 d, rotating, device-bound). Tokens live in OS secure storage: Keychain (iOS) / Keystore (Android) / HUKS (HarmonyOS).
- **Data**: MMKV for session/preferences/cache; PDF files cached in the app sandbox with LRU eviction.
- **i18n**: i18next, zh/en dictionaries synced from the Papex repo.
- **Types**: generated from the Papex server `openapi.json` — never hand-written.

See [`docs/development/papex-app.md`](https://github.com/Maicarons/papex/blob/main/docs/development/papex-app.md) in the Papex repo for the full development plan.

---

## Related projects

- [Papex](https://github.com/Maicarons/papex) — backend platform (Next.js + PostgreSQL)
- [Papex Desktop](https://github.com/Maicarons/papex-desktop) — desktop research workbench (Tauri 2)

---

## License

[Apache-2.0](LICENSE) — Copyright 2026 The Papex Authors.
