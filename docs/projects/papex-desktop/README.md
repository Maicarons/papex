# Papex Desktop

> Desktop research workbench for the Papex academic literature platform — Windows · Linux · macOS

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)]()
[![Tauri](https://img.shields.io/badge/Tauri-2.x-24c8db.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Papex Desktop turns [Papex](https://github.com/Maicarons/papex) — an open-source academic literature platform — into a full **research workbench** that lives on your desktop: a local-first library, deep PDF reading with highlights & notes, citation management, offline full-text search, and cloud sync.

Built with **Tauri 2.x** (Rust core + system WebView) and **Vite + React 19**, shipping as a lightweight native app (≈5–15 MB installer, 30–50 MB memory).

> ⚠️ **Dependency**: this app consumes the Papex server API. Deploy the [Papex backend](https://github.com/Maicarons/papex) first.

---

## Features

| Priority | Feature | Status |
| --- | --- | --- |
| P0 | Login / logout / multi-account (tokens in OS keychain) | planned |
| P0 | Three-pane library: 257 bilingual categories / list / detail, filters & sort | planned |
| P0 | Online keyword + semantic search (`/api/search?semantic=1`) | planned |
| P0 | PDF reader (pdf.js): paging, zoom, search, bookmarks, progress, dark invert | planned |
| P0 | Highlights (multi-color) + text notes, local SQLite + cloud sync | planned |
| P0 | Offline PDF cache, offline reading, cache management | planned |
| P0 | Interactive citation graph (ECharts), subscription notifications | planned |
| P0 | System tray, global shortcuts (Ctrl/Cmd+K), single-instance lock | planned |
| P1 | Citation generation (CSL: GB/T 7714, APA, MLA, …), BibTeX / RIS export | planned |
| P1 | LaTeX integration (`\cite{key}` + bibliography block, via papex-latex) | planned |
| P1 | **File & image uploads**: paper submission, local PDF import, avatar, paper cover | planned |
| P1 | Saved searches (smart folders), batch tags, reading stats, dual-pane reading | planned |
| P2 | Local full-text index (tantivy), offline millisecond search | planned |
| P2 | Collaboration view (co-review / endorsements / comments, read-only) | planned |
| P3 | Optional local embeddings (Ollama) for offline semantic search, plugin prototype | planned |

> Admin / moderation features are intentionally **not** included in the desktop client — use the web version for those.

---

## Platforms

| Platform | Artifact | Channel |
| --- | --- | --- |
| Windows 10+ | NSIS / MSI | Website download + winget (optional) |
| macOS 11+ | .dmg (Developer ID + notarization) | Website + App Store (optional) |
| Linux (WebKitGTK 2.44+) | .deb / AppImage / .rpm | Website + distro repos (later) |

---

## Installation

### Prebuilt binaries

Download the installer for your platform from the [Releases](https://github.com/Maicarons/papex-desktop/releases) page (once published).

### From source

Prerequisites:

- Node.js 20+ & pnpm 9+
- Rust toolchain (stable)
- Windows: WebView2 (preinstalled on Win10/11); Linux: `libwebkit2gtk-4.1-dev` etc. (see below)

```bash
git clone https://github.com/Maicarons/papex-desktop.git
cd papex-desktop
pnpm install

# generate API types from the Papex server OpenAPI document
pnpm gen:types

# configure API base URL
cp .env.example .env

# development (frontend HMR + Tauri window)
pnpm tauri dev

# build for the current platform
pnpm tauri build
```

Linux dependencies (Debian/Ubuntu):

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

Environment variables (`.env`):

| Variable | Description | Default |
| --- | --- | --- |
| `API_BASE_URL` | Papex server base URL | `https://api.papex.example.com` |
| `I18N_FALLBACK` | Fallback language | `zh` |
| `CACHE_LIMIT_MB` | Local PDF cache limit (MB) | `2048` |

---

## Development

```bash
pnpm lint            # eslint
pnpm typecheck       # tsc --noEmit
pnpm test            # frontend unit tests (Vitest, coverage)
cargo test           # Rust unit tests (in src-tauri)
cargo clippy         # Rust lints (CI enforces -D warnings)
pnpm e2e             # Playwright E2E against a local Papex backend
pnpm gen:types       # regenerate API types from openapi.json
pnpm sync:i18n       # sync zh/en dictionaries from the Papex repo
```

Test coverage: frontend ≥80% statement coverage on core modules; Rust ≥85% on `commands/*`, `db/*` and `indexer/*`; E2E covers the P0 flows (auth → library → read → annotate → offline → upload). Cross-device scenarios (desktop ↔ mobile ↔ web) are covered together with the mobile client — see the [development plan](https://github.com/Maicarons/papex/blob/main/docs/development/papex-desktop.md).

---

## Architecture (highlights)

- **Auth**: access token (JWT, 15 min) + refresh token (30 d, rotating, device-bound). Tokens live in the OS keychain: Windows Credential Manager / macOS Keychain / Linux Secret Service (file fallback).
- **Local-first**: SQLite `papex_local.db` for cache / annotations / progress / sync queue; tantivy for offline full-text index (P2).
- **Uploads**: PDF submission & import, avatar, paper cover — validated in Rust, uploaded to the Papex server with progress & retry.
- **Types**: generated from the Papex server `openapi.json` — never hand-written.

See [`docs/development/papex-desktop.md`](https://github.com/Maicarons/papex/blob/main/docs/development/papex-desktop.md) in the Papex repo for the full development plan.

---

## Related projects

- [Papex](https://github.com/Maicarons/papex) — backend platform (Next.js + PostgreSQL)
- [Papex App](https://github.com/Maicarons/papex-app) — official mobile client (React Native + RNOH)

---

## License

[Apache-2.0](LICENSE) — Copyright 2026 The Papex Authors.
