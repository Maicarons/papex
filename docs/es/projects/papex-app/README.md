# Papex App

> Cliente móvil oficial para la plataforma de literatura académica Papex — Android · HarmonyOS · iOS

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20HarmonyOS%20%7C%20iOS-lightgrey.svg)]()
[![React Native](https://img.shields.io/badge/React%20Native-0.82-61dafb.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Papex App es el cliente móvil oficial de [Papex](https://github.com/Maicarons/papex), una plataforma de literatura académica de código abierto. Está diseñada como un **reemplazo móvil de la versión web**: lea artículos, gestione su cuenta y manténgase al día — en cualquier lugar.

Construida con **React Native 0.82 + RNOH 0.82.30** (adaptación HarmonyOS), compartiendo una base de código entre Android, HarmonyOS e iOS (~95% de código de negocio compartido).

> ⚠️ **Dependencia**: esta app consume la API del servidor Papex. Despliegue primero el [backend de Papex](https://github.com/Maicarons/papex).

---

## Características

| Prioridad | Característica | Estado |
| --- | --- | --- |
| P0 | Inicio / registro / cierre de sesión, cambio de multi-cuenta, gestión de dispositivos (revocación remota) | planificado |
| P0 | Feed de inicio, árbol de categorías (257 categorías bilingües), paginación | planificado |
| P0 | Búsqueda por palabras clave + búsqueda semántica (`/api/search?semantic=1`) | planificado |
| P0 | Detalle de artículo, cambio de versión, lectura de PDF con memoria de progreso | planificado |
| P0 | Marcadores, suscripciones, mensajes / tickets / comentarios en la app | planificado |
| P0 | Perfil, respaldos, UI bilingüe (zh/en), modo oscuro | planificado |
| P1 | Descarga de PDF offline, caché de metadatos, navegación offline | planificado |
| P1 | Sincronización de progreso de lectura entre dispositivos, notificaciones push (FCM / APNs / PushKit) | planificado |
| P1 | Desbloqueo biométrico, gestión de claves de API, estados skeleton/error/vacío | planificado |
| P2 | Comentarios, respaldos, recomendaciones, hoja de compartir del sistema, estadísticas de lectura | planificado |
| P3 | Inicio de sesión por QR (web ↔ app), diseño para tablet, visualización de anotaciones de solo lectura | planificado |

> Las funciones de admin / moderación **no** se incluyen intencionalmente en el cliente móvil — use la versión web para eso.

---

## Plataformas

| Plataforma | Canal | Estado |
| --- | --- | --- |
| Android (minSdk 24+) | Google Play / tiendas CN | planificado |
| iOS (15+) | App Store | planificado |
| HarmonyOS (API 12+) | AppGallery | planificado |

---

## Instalación

### Binarios preconstruidos

Descargue desde la página de [Releases](https://github.com/Maicarons/papex-app/releases) (una vez publicados), o instale desde su tienda de elección.

### Desde el código fuente

Requisitos previos:

- Node.js 20+
- Android SDK (minSdk 24) para compilaciones Android
- Xcode 15+ (macOS) para compilaciones iOS
- DevEco Studio 5.x (API 12+) + proyecto AGC para compilaciones HarmonyOS

```bash
git clone https://github.com/Maicarons/papex-app.git
cd papex-app
npm install

# generar tipos de API desde el documento OpenAPI del servidor Papex
npm run gen:types

# configurar URL base de la API
cp .env.example .env

# ejecutar en Android
npm run android

# ejecutar en iOS (solo macOS)
cd ios && pod install && cd ..
npm run ios

# ejecutar en HarmonyOS: abra harmony/ en DevEco Studio, firme con AGC, ejecute en dispositivo/simulador
```

Variables de entorno (`.env`):

| Variable | Descripción | Por defecto |
| --- | --- | --- |
| `API_BASE_URL` | URL base del servidor Papex | `https://api.papex.example.com` |
| `PUSH_ENABLED` | Habilitar registro push | `true` |
| `I18N_FALLBACK` | Idioma de respaldo | `zh` |

---

## Desarrollo

```bash
npm run lint          # eslint
npm run typecheck     # tsc --noEmit
npm test              # pruebas unitarias (Jest + RNTL, cobertura)
npm run e2e:ios       # E2E Detox (simulador iOS)
npm run e2e:android   # E2E Detox (emulador Android)
npm run gen:types     # regenerar tipos de API desde openapi.json
npm run sync:i18n     # sincronizar diccionarios zh/en desde el repo Papex
```

Cobertura de pruebas: las pruebas unitarias apuntan a ≥80% de cobertura de sentencias en los módulos centrales (`lib/api`, `lib/security`, `lib/storage`, stores); el E2E cubre los flujos P0 (auth → explorar → leer → marcar → suscribir → dispositivos). Los escenarios entre dispositivos se cubren junto con el cliente de escritorio (ver [plan de desarrollo](https://github.com/Maicarons/papex/blob/main/docs/development/papex-app.md)).

---

## Arquitectura (destacados)

- **Auth**: token de acceso (JWT, 15 min) + token de refresco (30 d, rotativo, ligado al dispositivo). Los tokens viven en almacenamiento seguro del SO: Keychain (iOS) / Keystore (Android) / HUKS (HarmonyOS).
- **Datos**: MMKV para sesión/preferencias/caché; archivos PDF en caché en el sandbox de la app con expulsión LRU.
- **i18n**: i18next, diccionarios zh/en sincronizados desde el repo Papex.
- **Tipos**: generados desde `openapi.json` del servidor Papex — nunca escritos a mano.

Vea [`docs/development/papex-app.md`](https://github.com/Maicarons/papex/blob/main/docs/development/papex-app.md) en el repo Papex para el plan de desarrollo completo.

---

## Proyectos relacionados

- [Papex](https://github.com/Maicarons/papex) — plataforma backend (Next.js + PostgreSQL)
- [Papex Desktop](https://github.com/Maicarons/papex-desktop) — banco de trabajo de investigación de escritorio (Tauri 2)

---

## Licencia

[Apache-2.0](LICENSE) — Copyright 2026 The Papex Authors.
