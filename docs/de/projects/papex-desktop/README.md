# Papex Desktop

> Desktop-Forschungs-Arbeitsbereich für die Papex-Plattform für wissenschaftliche Literatur — Windows · Linux · macOS

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)]()
[![Tauri](https://img.shields.io/badge/Tauri-2.x-24c8db.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Papex Desktop verwandelt [Papex](https://github.com/Maicarons/papex) — eine Open-Source-Plattform für wissenschaftliche Literatur — in einen vollständigen **Forschungs-Arbeitsbereich** auf dem Desktop: eine Local-First-Bibliothek, tiefes PDF-Lesen mit Markierungen & Notizen, Zitationsverwaltung, Offline-Volltextsuche und Cloud-Sync.

Gebaut mit **Tauri 2.x** (Rust-Kern + System-WebView) und **Vite + React 19**, ausgeliefert als leichtgewichtige native App (≈5–15 MB Installer, 30–50 MB Speicher).

> ⚠️ **Abhängigkeit**: diese App nutzt die Papex-Server-API. Stelle zunächst das [Papex-Backend](https://github.com/Maicarons/papex) bereit.

---

## Funktionen

| Priorität | Funktion | Status |
| --- | --- | --- |
| P0 | Login / Logout / Mehrkonto (Tokens im OS-Keychain) | geplant |
| P0 | Drei-Bereich-Bibliothek: 257 zweisprachige Kategorien / Liste / Detail, Filter & Sortierung | geplant |
| P0 | Online-Stichwort + semantische Suche (`/api/search?semantic=1`) | geplant |
| P0 | PDF-Reader (pdf.js): Paginierung, Zoom, Suche, Lesezeichen, Fortschritt, Dunkel-Invertierung | geplant |
| P0 | Markierungen (mehrfarbig) + Textnotizen, lokales SQLite + Cloud-Sync | geplant |
| P0 | Offline-PDF-Cache, Offline-Lesen, Cache-Verwaltung | geplant |
| P0 | Interaktiver Zitationsgraph (ECharts), Abonnement-Benachrichtigungen | geplant |
| P0 | System-Tray, globale Tastenkürzel (Ctrl/Cmd+K), Single-Instance-Sperre | geplant |
| P1 | Zitatgenerierung (CSL: GB/T 7714, APA, MLA, …), BibTeX / RIS-Export | geplant |
| P1 | LaTeX-Integration (`\cite{key}` + Literatur-Block, via papex-latex) | geplant |
| P1 | **Datei- & Bild-Uploads**: Paper-Einreichung, lokaler PDF-Import, Avatar, Paper-Cover | geplant |
| P1 | Gespeicherte Suchen (Smart-Folders), Batch-Tags, Lese-Statistik, Zwei-Bereich-Lesen | geplant |
| P2 | Lokaler Volltext-Index (tantivy), Offline-Suche in Millisekunden | geplant |
| P2 | Kollaborationsansicht (Co-Review / Empfehlungen / Kommentare, nur-Lesen) | geplant |
| P3 | Optionale lokale Embeddings (Ollama) für Offline-Semantik-Suche, Plugin-Prototyp | geplant |

> Admin-/Moderationsfunktionen sind im Desktop-Client bewusst **nicht** enthalten — nutze dafür die Web-Version.

---

## Plattformen

| Plattform | Artefakt | Kanal |
| --- | --- | --- |
| Windows 10+ | NSIS / MSI | Website-Download + winget (optional) |
| macOS 11+ | .dmg (Developer ID + Notarisierung) | Website + App Store (optional) |
| Linux (WebKitGTK 2.44+) | .deb / AppImage / .rpm | Website + Distro-Repos (später) |

---

## Installation

### Vorgebaute Binärdateien

Lade den Installer für deine Plattform von der [Releases](https://github.com/Maicarons/papex-desktop/releases)-Seite (sobald veröffentlicht) herunter.

### Aus dem Quellcode

Voraussetzungen:

- Node.js 20+ & pnpm 9+
- Rust-Toolchain (stable)
- Windows: WebView2 (vorinstalliert auf Win10/11); Linux: `libwebkit2gtk-4.1-dev` usw. (siehe unten)

```bash
git clone https://github.com/Maicarons/papex-desktop.git
cd papex-desktop
pnpm install

# API-Typen aus dem Papex-Server-OpenAPI-Dokument generieren
pnpm gen:types

# API-Basis-URL konfigurieren
cp .env.example .env

# Entwicklung (Frontend-HMR + Tauri-Fenster)
pnpm tauri dev

# für die aktuelle Plattform bauen
pnpm tauri build
```

Linux-Abhängigkeiten (Debian/Ubuntu):

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

Umgebungsvariablen (`.env`):

| Variable | Beschreibung | Standard |
| --- | --- | --- |
| `API_BASE_URL` | Papex-Server-Basis-URL | `https://api.papex.example.com` |
| `I18N_FALLBACK` | Fallback-Sprache | `zh` |
| `CACHE_LIMIT_MB` | Lokales PDF-Cache-Limit (MB) | `2048` |

---

## Entwicklung

```bash
pnpm lint            # eslint
pnpm typecheck       # tsc --noEmit
pnpm test            # Frontend-Unit-Tests (Vitest, Coverage)
cargo test           # Rust-Unit-Tests (in src-tauri)
cargo clippy         # Rust-Lints (CI erzwingt -D warnings)
pnpm e2e             # Playwright E2E gegen ein lokales Papex-Backend
pnpm gen:types       # API-Typen aus openapi.json neu generieren
pnpm sync:i18n       # zh/en-Wörterbücher aus dem Papex-Repo synchronisieren
```

Testabdeckung: Frontend ≥80 % Anweisungsabdeckung in Kernmodulen; Rust ≥85 % in `commands/*`, `db/*` und `indexer/*`; E2E deckt die P0-Flows ab (Auth → Bibliothek → Lesen → Annotieren → Offline → Upload). Geräteübergreifende Szenarien (Desktop ↔ mobil ↔ Web) werden gemeinsam mit dem mobilen Client abgedeckt — siehe den [Entwicklungsplan](https://github.com/Maicarons/papex/blob/main/docs/development/papex-desktop.md).

---

## Architektur (Highlights)

- **Auth**: Access-Token (JWT, 15 min) + Refresh-Token (30 d, rotierend, gerätegebunden). Tokens liegen im OS-Keychain: Windows Credential Manager / macOS Keychain / Linux Secret Service (Datei-Fallback).
- **Local-First**: SQLite `papex_local.db` für Cache / Annotationen / Fortschritt / Sync-Queue; tantivy für Offline-Volltext-Index (P2).
- **Uploads**: PDF-Einreichung & -Import, Avatar, Paper-Cover — in Rust validiert, mit Fortschritt & Retry auf den Papex-Server hochgeladen.
- **Typen**: aus dem Papex-Server-`openapi.json` generiert — nie von Hand geschrieben.

Siehe [`docs/development/papex-desktop.md`](https://github.com/Maicarons/papex/blob/main/docs/development/papex-desktop.md) im Papex-Repo für den vollständigen Entwicklungsplan.

---

## Verwandte Projekte

- [Papex](https://github.com/Maicarons/papex) — Backend-Plattform (Next.js + PostgreSQL)
- [Papex App](https://github.com/Maicarons/papex-app) — offizieller mobiler Client (React Native + RNOH)

---

## Lizenz

[Apache-2.0](LICENSE) — Copyright 2026 The Papex Authors.
