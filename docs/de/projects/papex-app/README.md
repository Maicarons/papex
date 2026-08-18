# Papex App

> Offizieller mobiler Client für die Papex-Plattform für wissenschaftliche Literatur — Android · HarmonyOS · iOS

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20HarmonyOS%20%7C%20iOS-lightgrey.svg)]()
[![React Native](https://img.shields.io/badge/React%20Native-0.82-61dafb.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Papex App ist der offizielle mobile Client für [Papex](https://github.com/Maicarons/papex), eine Open-Source-Plattform für wissenschaftliche Literatur. Er ist als **mobiler Ersatz für die Web-Version** konzipiert: Papers lesen, das Konto verwalten und auf dem Laufenden bleiben — überall.

Gebaut mit **React Native 0.82 + RNOH 0.82.30** (HarmonyOS-Anpassung), mit einer gemeinsamen Codebasis über Android, HarmonyOS und iOS (~95 % geteilter Geschäftscode).

> ⚠️ **Abhängigkeit**: diese App nutzt die Papex-Server-API. Stelle zunächst das [Papex-Backend](https://github.com/Maicarons/papex) bereit.

---

## Funktionen

| Priorität | Funktion | Status |
| --- | --- | --- |
| P0 | Login / Registrieren / Logout, Mehrkonto-Umschaltung, Geräteverwaltung (Fernwiderruf) | geplant |
| P0 | Start-Feed, Kategoriebaum (257 zweisprachige Kategorien), Pagination | geplant |
| P0 | Stichwortsuche + semantische Suche (`/api/search?semantic=1`) | geplant |
| P0 | Paper-Detail, Versionswechsel, PDF-Lesen mit Fortschrittsspeicher | geplant |
| P0 | Lesezeichen, Abonnements, In-App-Nachrichten / Tickets / Feedback | geplant |
| P0 | Profil, Empfehlungen, zweisprachige UI (zh/en), Dark-Mode | geplant |
| P1 | Offline-PDF-Download, Metadaten-Cache, Offline-Browsen | geplant |
| P1 | Lese-Fortschritt-Sync über Geräte hinweg, Push-Benachrichtigungen (FCM / APNs / PushKit) | geplant |
| P1 | Biometrisches Entsperren, API-Key-Verwaltung, Skeleton-/Fehler-/Leer-Zustände | geplant |
| P2 | Kommentare, Empfehlungen, Empfehlungen, System-Share-Sheet, Lese-Statistik | geplant |
| P3 | QR-Anmeldung (Web ↔ App), Tablet-Layout, nur-Lese-Anmerkungsanzeige | geplant |

> Admin-/Moderationsfunktionen sind im mobilen Client bewusst **nicht** enthalten — nutze dafür die Web-Version.

---

## Plattformen

| Plattform | Kanal | Status |
| --- | --- | --- |
| Android (minSdk 24+) | Google Play / CN-Stores | geplant |
| iOS (15+) | App Store | geplant |
| HarmonyOS (API 12+) | AppGallery | geplant |

---

## Installation

### Vorgebaute Binärdateien

Lade von der [Releases](https://github.com/Maicarons/papex-app/releases)-Seite (sobald veröffentlicht) herunter oder installiere aus dem Store deiner Wahl.

### Aus dem Quellcode

Voraussetzungen:

- Node.js 20+
- Android SDK (minSdk 24) für Android-Builds
- Xcode 15+ (macOS) für iOS-Builds
- DevEco Studio 5.x (API 12+) + AGC-Projekt für HarmonyOS-Builds

```bash
git clone https://github.com/Maicarons/papex-app.git
cd papex-app
npm install

# API-Typen aus dem Papex-Server-OpenAPI-Dokument generieren
npm run gen:types

# API-Basis-URL konfigurieren
cp .env.example .env

# unter Android ausführen
npm run android

# unter iOS ausführen (nur macOS)
cd ios && pod install && cd ..
npm run ios

# unter HarmonyOS ausführen: harmony/ in DevEco Studio öffnen, mit AGC signieren, auf Gerät/Simulator ausführen
```

Umgebungsvariablen (`.env`):

| Variable | Beschreibung | Standard |
| --- | --- | --- |
| `API_BASE_URL` | Papex-Server-Basis-URL | `https://api.papex.example.com` |
| `PUSH_ENABLED` | Push-Registrierung aktivieren | `true` |
| `I18N_FALLBACK` | Fallback-Sprache | `zh` |

---

## Entwicklung

```bash
npm run lint          # eslint
npm run typecheck     # tsc --noEmit
npm test              # Unit-Tests (Jest + RNTL, Coverage)
npm run e2e:ios       # Detox E2E (iOS-Simulator)
npm run e2e:android   # Detox E2E (Android-Emulator)
npm run gen:types     # API-Typen aus openapi.json neu generieren
npm run sync:i18n     # zh/en-Wörterbücher aus dem Papex-Repo synchronisieren
```

Testabdeckung: Unit-Tests zielen auf ≥80 % Anweisungsabdeckung in Kernmodulen (`lib/api`, `lib/security`, `lib/storage`, Stores); E2E deckt die P0-Flows ab (Auth → Durchsuchen → Lesen → Lesezeichen → Abonnieren → Geräte). Geräteübergreifende Szenarien werden gemeinsam mit dem Desktop-Client abgedeckt (siehe [Entwicklungsplan](https://github.com/Maicarons/papex/blob/main/docs/development/papex-app.md)).

---

## Architektur (Highlights)

- **Auth**: Access-Token (JWT, 15 min) + Refresh-Token (30 d, rotierend, gerätegebunden). Tokens liegen in OS-Secure-Storage: Keychain (iOS) / Keystore (Android) / HUKS (HarmonyOS).
- **Daten**: MMKV für Session/Präferenzen/Cache; PDF-Dateien im App-Sandbox mit LRU-Verdrängung zwischengespeichert.
- **i18n**: i18next, zh/en-Wörterbücher aus dem Papex-Repo synchronisiert.
- **Typen**: aus dem Papex-Server-`openapi.json` generiert — nie von Hand geschrieben.

Siehe [`docs/development/papex-app.md`](https://github.com/Maicarons/papex/blob/main/docs/development/papex-app.md) im Papex-Repo für den vollständigen Entwicklungsplan.

---

## Verwandte Projekte

- [Papex](https://github.com/Maicarons/papex) — Backend-Plattform (Next.js + PostgreSQL)
- [Papex Desktop](https://github.com/Maicarons/papex-desktop) — Desktop-Forschungs-Arbeitsbereich (Tauri 2)

---

## Lizenz

[Apache-2.0](LICENSE) — Copyright 2026 The Papex Authors.
