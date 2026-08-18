# Papex App

> Client mobile ufficiale per la piattaforma di letteratura accademica Papex — Android · HarmonyOS · iOS

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20HarmonyOS%20%7C%20iOS-lightgrey.svg)]()
[![React Native](https://img.shields.io/badge/React%20Native-0.82-61dafb.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Papex App è il client mobile ufficiale per [Papex](https://github.com/Maicarons/papex), una piattaforma di letteratura accademica open-source. È progettata come una **sostituzione mobile della versione web**: leggi articoli, gestisci il tuo account e rimani aggiornato — ovunque.

Costruita con **React Native 0.82 + RNOH 0.82.30** (adattamento HarmonyOS), condividendo un unico codebase su Android, HarmonyOS e iOS (~95% di codice business condiviso).

> ⚠️ **Dipendenza**: questa app consuma l'API server di Papex. Distribuisci prima il [backend Papex](https://github.com/Maicarons/papex).

---

## Funzionalità

| Priorità | Funzionalità | Stato |
| --- | --- | --- |
| P0 | Login / registrazione / logout, commutazione multi-account, gestione dispositivi (revoca remota) | pianificato |
| P0 | Feed home, albero delle categorie (257 categorie bilingui), paginazione | pianificato |
| P0 | Ricerca per parole chiave + ricerca semantica (`/api/search?semantic=1`) | pianificato |
| P0 | Dettaglio articolo, commutazione versione, lettura PDF con memoria dei progressi | pianificato |
| P0 | Segnalibri, sottoscrizioni, messaggi / ticket / feedback in-app | pianificato |
| P0 | Profilo, endorsement, UI bilingue (zh/en), modalità scura | pianificato |
| P1 | Download PDF offline, cache metadati, navigazione offline | pianificato |
| P1 | Sincronizzazione progressi di lettura tra dispositivi, notifiche push (FCM / APNs / PushKit) | pianificato |
| P1 | Sblocco biometrico, gestione chiavi API, stati skeleton/errore/vuoto | pianificato |
| P2 | Commenti, endorsement, raccomandazioni, foglio condivisione di sistema, statistiche di lettura | pianificato |
| P3 | Accesso QR (web ↔ app), layout tablet, visualizzazione annotazioni in sola lettura | pianificato |

> Le funzionalità admin / di moderazione sono intenzionalmente **non** incluse nel client mobile — usa la versione web per quelle.

---

## Piattaforme

| Piattaforma | Canale | Stato |
| --- | --- | --- |
| Android (minSdk 24+) | Google Play / store CN | pianificato |
| iOS (15+) | App Store | pianificato |
| HarmonyOS (API 12+) | AppGallery | pianificato |

---

## Installazione

### Binari precompilati

Scarica dalla pagina [Releases](https://github.com/Maicarons/papex-app/releases) (una volta pubblicata), o installa dal tuo store preferito.

### Dal sorgente

Prerequisiti:

- Node.js 20+
- Android SDK (minSdk 24) per le build Android
- Xcode 15+ (macOS) per le build iOS
- DevEco Studio 5.x (API 12+) + progetto AGC per le build HarmonyOS

```bash
git clone https://github.com/Maicarons/papex-app.git
cd papex-app
npm install

# genera i tipi API dal documento OpenAPI del server Papex
npm run gen:types

# configura l'URL base dell'API
cp .env.example .env

# esegui su Android
npm run android

# esegui su iOS (solo macOS)
cd ios && pod install && cd ..
npm run ios

# esegui su HarmonyOS: apri harmony/ in DevEco Studio, firma con AGC, esegui su dispositivo/simulatore
```

Variabili d'ambiente (`.env`):

| Variabile | Descrizione | Predefinito |
| --- | --- | --- |
| `API_BASE_URL` | URL base del server Papex | `https://api.papex.example.com` |
| `PUSH_ENABLED` | Abilita la registrazione push | `true` |
| `I18N_FALLBACK` | Lingua di fallback | `zh` |

---

## Sviluppo

```bash
npm run lint          # eslint
npm run typecheck     # tsc --noEmit
npm test              # test unitari (Jest + RNTL, coverage)
npm run e2e:ios       # Detox E2E (simulatore iOS)
npm run e2e:android   # Detox E2E (emulatore Android)
npm run gen:types     # rigenera i tipi API da openapi.json
npm run sync:i18n     # sincronizza i dizionari zh/en dal repo Papex
```

Copertura test: i test unitari mirano a ≥80% di copertura delle istruzioni sui moduli core (`lib/api`, `lib/security`, `lib/storage`, store); l'E2E copre i flussi P0 (auth → sfoglia → leggi → segnalibro → sottoscrivi → dispositivi). Gli scenari tra dispositivi sono coperti insieme al client desktop (vedi [piano di sviluppo](https://github.com/Maicarons/papex/blob/main/docs/development/papex-app.md)).

---

## Architettura (punti salienti)

- **Auth**: access token (JWT, 15 min) + refresh token (30 g, rotante, vincolato al dispositivo). I token risiedono nello storage sicuro del SO: Keychain (iOS) / Keystore (Android) / HUKS (HarmonyOS).
- **Dati**: MMKV per sessione/preferenze/cache; i file PDF sono cached nella sandbox dell'app con evacuazione LRU.
- **i18n**: i18next, dizionari zh/en sincronizzati dal repo Papex.
- **Tipi**: generati dal `openapi.json` del server Papex — mai scritti a mano.

Vedi [`docs/development/papex-app.md`](https://github.com/Maicarons/papex/blob/main/docs/development/papex-app.md) nel repo Papex per il piano di sviluppo completo.

---

## Progetti correlati

- [Papex](https://github.com/Maicarons/papex) — piattaforma backend (Next.js + PostgreSQL)
- [Papex Desktop](https://github.com/Maicarons/papex-desktop) — workbench di ricerca desktop (Tauri 2)

---

## Licenza

[Apache-2.0](LICENSE) — Copyright 2026 The Papex Authors.
