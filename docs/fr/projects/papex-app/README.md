# Papex App

> Client mobile officiel de la plateforme de littérature académique Papex — Android · HarmonyOS · iOS

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20HarmonyOS%20%7C%20iOS-lightgrey.svg)]()
[![React Native](https://img.shields.io/badge/React%20Native-0.82-61dafb.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Papex App est le client mobile officiel de [Papex](https://github.com/Maicarons/papex), une plateforme open-source de littérature académique. Il est conçu comme un **remplaçant mobile de la version web** : lire des articles, gérer votre compte, et rester à jour — partout.

Construit avec **React Native 0.82 + RNOH 0.82.30** (adaptation HarmonyOS), partageant une seule base de code sur Android, HarmonyOS et iOS (~95 % de code métier partagé).

> ⚠️ **Dépendance** : cette app consomme l'API serveur de Papex. Déployez d'abord le [backend Papex](https://github.com/Maicarons/papex).

---

## Fonctionnalités

| Priorité | Fonctionnalité | Statut |
| --- | --- | --- |
| P0 | Connexion / inscription / déconnexion, bascule multi-comptes, gestion des appareils (révocation à distance) | prévu |
| P0 | Fil d'accueil, arbre des catégories (257 catégories bilingues), pagination | prévu |
| P0 | Recherche par mots-clés + recherche sémantique (`/api/search?semantic=1`) | prévu |
| P0 | Détail d'article, bascule de version, lecture PDF avec mémorisation de progression | prévu |
| P0 | Signets, abonnements, messages / tickets / retours in-app | prévu |
| P0 | Profil, parrainages, UI bilingue (zh/en), mode sombre | prévu |
| P1 | Téléchargement PDF hors ligne, cache de métadonnées, navigation hors ligne | prévu |
| P1 | Sync progression de lecture inter-appareils, notifications push (FCM / APNs / PushKit) | prévu |
| P1 | Déverrouillage biométrique, gestion des clés API, états skeleton/erreur/vide | prévu |
| P2 | Commentaires, parrainages, recommandations, partage système, stats de lecture | prévu |
| P3 | Connexion QR (web ↔ app), disposition tablette, visualisation d'annotations en lecture seule | prévu |

> Les fonctionnalités admin / modération sont volontairement **exclues** du client mobile — utilisez la version web pour celles-ci.

---

## Plateformes

| Plateforme | Canal | Statut |
| --- | --- | --- |
| Android (minSdk 24+) | Google Play / magasins CN | prévu |
| iOS (15+) | App Store | prévu |
| HarmonyOS (API 12+) | AppGallery | prévu |

---

## Installation

### Binaires précompilés

Téléchargez depuis la page [Releases](https://github.com/Maicarons/papex-app/releases) (une fois publiée), ou installez depuis le magasin de votre choix.

### Depuis les sources

Prérequis :

- Node.js 20+
- Android SDK (minSdk 24) pour les builds Android
- Xcode 15+ (macOS) pour les builds iOS
- DevEco Studio 5.x (API 12+) + projet AGC pour les builds HarmonyOS

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

Variables d'environnement (`.env`) :

| Variable | Description | Défaut |
| --- | --- | --- |
| `API_BASE_URL` | URL de base du serveur Papex | `https://api.papex.example.com` |
| `PUSH_ENABLED` | Activer l'enregistrement push | `true` |
| `I18N_FALLBACK` | Langue de repli | `zh` |

---

## Développement

```bash
npm run lint          # eslint
npm run typecheck     # tsc --noEmit
npm test              # unit tests (Jest + RNTL, coverage)
npm run e2e:ios       # Detox E2E (iOS simulator)
npm run e2e:android   # Detox E2E (Android emulator)
npm run gen:types     # regenerate API types from openapi.json
npm run sync:i18n     # sync zh/en dictionaries from the Papex repo
```

Couverture de tests : les tests unitaires visent ≥80 % de couverture des instructions sur les modules cœur (`lib/api`, `lib/security`, `lib/storage`, stores) ; les E2E couvrent les flux P0 (auth → parcourir → lire → signet → abonner → appareils). Les scénarios inter-appareils sont couverts avec le client desktop (voir [plan de développement](https://github.com/Maicarons/papex/blob/main/docs/development/papex-app.md)).

---

## Architecture (points clés)

- **Auth** : access token (JWT, 15 min) + refresh token (30 j, rotatif, lié à l'appareil). Les tokens résident dans le stockage sécurisé de l'OS : Keychain (iOS) / Keystore (Android) / HUKS (HarmonyOS).
- **Données** : MMKV pour session/préférences/cache ; fichiers PDF mis en cache dans le sandbox de l'app avec éviction LRU.
- **i18n** : i18next, dictionnaires zh/en synchronisés depuis le dépôt Papex.
- **Types** : générés depuis le `openapi.json` du serveur Papex — jamais écrits à la main.

Voir [`docs/development/papex-app.md`](https://github.com/Maicarons/papex/blob/main/docs/development/papex-app.md) dans le dépôt Papex pour le plan de développement complet.

---

## Projets liés

- [Papex](https://github.com/Maicarons/papex) — plateforme backend (Next.js + PostgreSQL)
- [Papex Desktop](https://github.com/Maicarons/papex-desktop) — bureau de recherche desktop (Tauri 2)

---

## Licence

[Apache-2.0](LICENSE) — Copyright 2026 The Papex Authors.
