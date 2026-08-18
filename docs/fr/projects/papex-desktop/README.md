# Papex Desktop

> Bureau de recherche desktop pour la plateforme de littérature académique Papex — Windows · Linux · macOS

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)]()
[![Tauri](https://img.shields.io/badge/Tauri-2.x-24c8db.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Papex Desktop transforme [Papex](https://github.com/Maicarons/papex) — une plateforme open-source de littérature académique — en un véritable **bureau de recherche** installé sur votre poste : une bibliothèque local-first, une lecture PDF approfondie avec surlignages & notes, la gestion des citations, la recherche en texte intégral hors ligne, et la synchronisation cloud.

Construit avec **Tauri 2.x** (cœur Rust + WebView système) et **Vite + React 19**, livré comme une app native légère (installateur ≈5–15 Mo, 30–50 Mo de mémoire).

> ⚠️ **Dépendance** : cette app consomme l'API serveur de Papex. Déployez d'abord le [backend Papex](https://github.com/Maicarons/papex).

---

## Fonctionnalités

| Priorité | Fonctionnalité | Statut |
| --- | --- | --- |
| P0 | Connexion / déconnexion / multi-comptes (tokens dans le trousseau OS) | prévu |
| P0 | Bibliothèque à trois panneaux : 257 catégories bilingues / liste / détail, filtres & tri | prévu |
| P0 | Recherche en ligne par mots-clés + sémantique (`/api/search?semantic=1`) | prévu |
| P0 | Lecteur PDF (pdf.js) : pagination, zoom, recherche, signets, progression, inversion sombre | prévu |
| P0 | Surlignages (multi-couleurs) + notes texte, SQLite local + sync cloud | prévu |
| P0 | Cache PDF hors ligne, lecture hors ligne, gestion du cache | prévu |
| P0 | Graphe de citations interactif (ECharts), notifications d'abonnement | prévu |
| P0 | Zone de notification, raccourcis globaux (Ctrl/Cmd+K), verrouillage instance unique | prévu |
| P1 | Génération de citations (CSL : GB/T 7714, APA, MLA, …), export BibTeX / RIS | prévu |
| P1 | Intégration LaTeX (`\cite{key}` + bloc bibliographique, via papex-latex) | prévu |
| P1 | **Envoi de fichiers et images** : soumission d'article, import PDF local, avatar, couverture d'article | prévu |
| P1 | Recherches enregistrées (dossiers intelligents), étiquettes par lot, stats de lecture, lecture à deux panneaux | prévu |
| P2 | Index texte intégral local (tantivy), recherche hors ligne en millisecondes | prévu |
| P2 | Vue collaboration (co-revue / parrainages / commentaires, lecture seule) | prévu |
| P3 | Plongements locaux optionnels (Ollama) pour recherche sémantique hors ligne, prototype de plugin | prévu |

> Les fonctionnalités admin / modération sont volontairement **exclues** du client desktop — utilisez la version web pour celles-ci.

---

## Plateformes

| Plateforme | Artéfact | Canal |
| --- | --- | --- |
| Windows 10+ | NSIS / MSI | Téléchargement site + winget (optionnel) |
| macOS 11+ | .dmg (Developer ID + notarization) | Site + App Store (optionnel) |
| Linux (WebKitGTK 2.44+) | .deb / AppImage / .rpm | Site + dépôts distro (plus tard) |

---

## Installation

### Binaires précompilés

Téléchargez l'installateur pour votre plateforme depuis la page [Releases](https://github.com/Maicarons/papex-desktop/releases) (une fois publiée).

### Depuis les sources

Prérequis :

- Node.js 20+ & pnpm 9+
- Chaîne d'outils Rust (stable)
- Windows : WebView2 (préinstallé sur Win10/11) ; Linux : `libwebkit2gtk-4.1-dev` etc. (voir ci-dessous)

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

Dépendances Linux (Debian/Ubuntu) :

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

Variables d'environnement (`.env`) :

| Variable | Description | Défaut |
| --- | --- | --- |
| `API_BASE_URL` | URL de base du serveur Papex | `https://api.papex.example.com` |
| `I18N_FALLBACK` | Langue de repli | `zh` |
| `CACHE_LIMIT_MB` | Limite du cache PDF local (Mo) | `2048` |

---

## Développement

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

Couverture de tests : frontend ≥80 % des instructions sur les modules cœur ; Rust ≥85 % sur `commands/*`, `db/*` et `indexer/*` ; les E2E couvrent les flux P0 (auth → bibliothèque → lecture → annotation → hors ligne → envoi). Les scénarios inter-appareils (desktop ↔ mobile ↔ web) sont couverts avec le client mobile — voir le [plan de développement](https://github.com/Maicarons/papex/blob/main/docs/development/papex-desktop.md).

---

## Architecture (points clés)

- **Auth** : access token (JWT, 15 min) + refresh token (30 j, rotatif, lié à l'appareil). Les tokens résident dans le trousseau OS : Windows Credential Manager / macOS Keychain / Linux Secret Service (repli fichier).
- **Local-first** : SQLite `papex_local.db` pour cache / annotations / progression / file de sync ; tantivy pour l'index texte intégral hors ligne (P2).
- **Envois** : soumission & import PDF, avatar, couverture d'article — validés en Rust, envoyés au serveur Papex avec progression & reprise.
- **Types** : générés depuis le `openapi.json` du serveur Papex — jamais écrits à la main.

Voir [`docs/development/papex-desktop.md`](https://github.com/Maicarons/papex/blob/main/docs/development/papex-desktop.md) dans le dépôt Papex pour le plan de développement complet.

---

## Projets liés

- [Papex](https://github.com/Maicarons/papex) — plateforme backend (Next.js + PostgreSQL)
- [Papex App](https://github.com/Maicarons/papex-app) — client mobile officiel (React Native + RNOH)

---

## Licence

[Apache-2.0](LICENSE) — Copyright 2026 The Papex Authors.
