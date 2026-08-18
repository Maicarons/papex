# Papex Desktop

> Workbench di ricerca desktop per la piattaforma di letteratura accademica Papex — Windows · Linux · macOS

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)]()
[![Tauri](https://img.shields.io/badge/Tauri-2.x-24c8db.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Papex Desktop trasforma [Papex](https://github.com/Maicarons/papex) — una piattaforma di letteratura accademica open-source — in un vero **workbench di ricerca** che vive sul tuo desktop: una libreria local-first, lettura PDF approfondita con evidenziazioni e note, gestione delle citazioni, ricerca full-text offline e sincronizzazione cloud.

Costruita con **Tauri 2.x** (core Rust + WebView di sistema) e **Vite + React 19**, distribuita come app nativa leggera (installer ≈5–15 MB, memoria 30–50 MB).

> ⚠️ **Dipendenza**: questa app consuma l'API server di Papex. Distribuisci prima il [backend Papex](https://github.com/Maicarons/papex).

---

## Funzionalità

| Priorità | Funzionalità | Stato |
| --- | --- | --- |
| P0 | Login / logout / multi-account (token nel keychain del SO) | pianificato |
| P0 | Libreria a tre pannelli: 257 categorie bilingui / elenco / dettaglio, filtri e ordinamento | pianificato |
| P0 | Ricerca online per parole chiave + semantica (`/api/search?semantic=1`) | pianificato |
| P0 | Lettore PDF (pdf.js): paginazione, zoom, ricerca, segnalibri, progressi, inverti scuro | pianificato |
| P0 | Evidenziazioni (multi-colore) + note di testo, SQLite locale + sincronizzazione cloud | pianificato |
| P0 | Cache PDF offline, lettura offline, gestione cache | pianificato |
| P0 | Grafo delle citazioni interattivo (ECharts), notifiche di sottoscrizione | pianificato |
| P0 | System tray, scorciatoie globali (Ctrl/Cmd+K), blocco istanza singola | pianificato |
| P1 | Generazione citazioni (CSL: GB/T 7714, APA, MLA, …), export BibTeX / RIS | pianificato |
| P1 | Integrazione LaTeX (`\cite{key}` + blocco bibliografia, via papex-latex) | pianificato |
| P1 | **Caricamenti file e immagini**: invio articoli, import PDF locale, avatar, copertina articolo | pianificato |
| P1 | Ricerche salvate (cartelle smart), tag in batch, statistiche di lettura, lettura a doppio pannello | pianificato |
| P2 | Indice full-text locale (tantivy), ricerca offline in millisecondi | pianificato |
| P2 | Vista collaborazione (co-review / endorsement / commenti, in sola lettura) | pianificato |
| P3 | Embedding locali opzionali (Ollama) per ricerca semantica offline, prototipo plugin | pianificato |

> Le funzionalità admin / di moderazione sono intenzionalmente **non** incluse nel client desktop — usa la versione web per quelle.

---

## Piattaforme

| Piattaforma | Artifact | Canale |
| --- | --- | --- |
| Windows 10+ | NSIS / MSI | Download dal sito + winget (opzionale) |
| macOS 11+ | .dmg (Developer ID + notarization) | Sito + App Store (opzionale) |
| Linux (WebKitGTK 2.44+) | .deb / AppImage / .rpm | Sito + repo distro (in seguito) |

---

## Installazione

### Binari precompilati

Scarica l'installer per la tua piattaforma dalla pagina [Releases](https://github.com/Maicarons/papex-desktop/releases) (una volta pubblicata).

### Dal sorgente

Prerequisiti:

- Node.js 20+ & pnpm 9+
- Toolchain Rust (stable)
- Windows: WebView2 (preinstallato su Win10/11); Linux: `libwebkit2gtk-4.1-dev` ecc. (vedi sotto)

```bash
git clone https://github.com/Maicarons/papex-desktop.git
cd papex-desktop
pnpm install

# genera i tipi API dal documento OpenAPI del server Papex
pnpm gen:types

# configura l'URL base dell'API
cp .env.example .env

# sviluppo (frontend HMR + finestra Tauri)
pnpm tauri dev

# build per la piattaforma corrente
pnpm tauri build
```

Dipendenze Linux (Debian/Ubuntu):

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

Variabili d'ambiente (`.env`):

| Variabile | Descrizione | Predefinito |
| --- | --- | --- |
| `API_BASE_URL` | URL base del server Papex | `https://api.papex.example.com` |
| `I18N_FALLBACK` | Lingua di fallback | `zh` |
| `CACHE_LIMIT_MB` | Limite cache PDF locale (MB) | `2048` |

---

## Sviluppo

```bash
pnpm lint            # eslint
pnpm typecheck       # tsc --noEmit
pnpm test            # test unitari frontend (Vitest, coverage)
cargo test           # test unitari Rust (in src-tauri)
cargo clippy         # lint Rust (la CI impone -D warnings)
pnpm e2e             # Playwright E2E contro un backend Papex locale
pnpm gen:types       # rigenera i tipi API da openapi.json
pnpm sync:i18n       # sincronizza i dizionari zh/en dal repo Papex
```

Copertura test: frontend ≥80% di copertura delle istruzioni sui moduli core; Rust ≥85% su `commands/*`, `db/*` e `indexer/*`; l'E2E copre i flussi P0 (auth → libreria → leggi → annota → offline → carica). Gli scenari tra dispositivi (desktop ↔ mobile ↔ web) sono coperti insieme al client mobile — vedi il [piano di sviluppo](https://github.com/Maicarons/papex/blob/main/docs/development/papex-desktop.md).

---

## Architettura (punti salienti)

- **Auth**: access token (JWT, 15 min) + refresh token (30 g, rotante, vincolato al dispositivo). I token risiedono nel keychain del SO: Windows Credential Manager / macOS Keychain / Linux Secret Service (fallback su file).
- **Local-first**: SQLite `papex_local.db` per cache / annotazioni / progressi / coda di sincronizzazione; tantivy per l'indice full-text offline (P2).
- **Upload**: invio e import PDF, avatar, copertina articolo — validati in Rust, caricati sul server Papex con progressi e retry.
- **Tipi**: generati dal `openapi.json` del server Papex — mai scritti a mano.

Vedi [`docs/development/papex-desktop.md`](https://github.com/Maicarons/papex/blob/main/docs/development/papex-desktop.md) nel repo Papex per il piano di sviluppo completo.

---

## Progetti correlati

- [Papex](https://github.com/Maicarons/papex) — piattaforma backend (Next.js + PostgreSQL)
- [Papex App](https://github.com/Maicarons/papex-app) — client mobile ufficiale (React Native + RNOH)

---

## Licenza

[Apache-2.0](LICENSE) — Copyright 2026 The Papex Authors.
