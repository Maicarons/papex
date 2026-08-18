# Papex Desktop

> Banco de trabajo de investigación de escritorio para la plataforma de literatura académica Papex — Windows · Linux · macOS

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)]()
[![Tauri](https://img.shields.io/badge/Tauri-2.x-24c8db.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Papex Desktop convierte [Papex](https://github.com/Maicarons/papex) — una plataforma de literatura académica de código abierto — en un **banco de trabajo de investigación** completo que vive en su escritorio: una biblioteca local-primero, lectura profunda de PDF con resaltados y notas, gestión de citas, búsqueda de texto completo offline, y sincronización en la nube.

Construida con **Tauri 2.x** (núcleo Rust + WebView del sistema) y **Vite + React 19**, se distribuye como una app nativa ligera (instalador ≈5–15 MB, 30–50 MB de memoria).

> ⚠️ **Dependencia**: esta app consume la API del servidor Papex. Despliegue primero el [backend de Papex](https://github.com/Maicarons/papex).

---

## Características

| Prioridad | Característica | Estado |
| --- | --- | --- |
| P0 | Inicio / cierre de sesión / multi-cuenta (tokens en keychain del SO) | planificado |
| P0 | Biblioteca de tres paneles: 257 categorías bilingües / lista / detalle, filtros y orden | planificado |
| P0 | Búsqueda semántica + por palabras clave online (`/api/search?semantic=1`) | planificado |
| P0 | Lector PDF (pdf.js): paginado, zoom, búsqueda, marcadores, progreso, inversión oscura | planificado |
| P0 | Resaltados (multicolor) + notas de texto, SQLite local + sincronización en la nube | planificado |
| P0 | Caché de PDF offline, lectura offline, gestión de caché | planificado |
| P0 | Grafo de citas interactivo (ECharts), notificaciones de suscripción | planificado |
| P0 | Bandeja del sistema, atajos globales (Ctrl/Cmd+K), bloqueo de instancia única | planificado |
| P1 | Generación de citas (CSL: GB/T 7714, APA, MLA, …), exportación BibTeX / RIS | planificado |
| P1 | Integración LaTeX (`\cite{key}` + bloque de bibliografía, vía papex-latex) | planificado |
| P1 | **Subidas de archivos e imágenes**: envío de artículos, importación de PDF local, avatar, portada de artículo | planificado |
| P1 | Búsquedas guardadas (carpetas inteligentes), etiquetas por lotes, estadísticas de lectura, lectura de doble panel | planificado |
| P2 | Índice de texto completo local (tantivy), búsqueda offline en milisegundos | planificado |
| P2 | Vista de colaboración (co-revisión / respaldos / comentarios, solo lectura) | planificado |
| P3 | Incrustaciones locales opcionales (Ollama) para búsqueda semántica offline, prototipo de plugin | planificado |

> Las funciones de admin / moderación **no** se incluyen intencionalmente en el cliente de escritorio — use la versión web para eso.

---

## Plataformas

| Plataforma | Artefacto | Canal |
| --- | --- | --- |
| Windows 10+ | NSIS / MSI | Descarga desde sitio web + winget (opcional) |
| macOS 11+ | .dmg (Developer ID + notarización) | Sitio web + App Store (opcional) |
| Linux (WebKitGTK 2.44+) | .deb / AppImage / .rpm | Sitio web + repos de distro (más adelante) |

---

## Instalación

### Binarios preconstruidos

Descargue el instalador para su plataforma desde la página de [Releases](https://github.com/Maicarons/papex-desktop/releases) (una vez publicados).

### Desde el código fuente

Requisitos previos:

- Node.js 20+ y pnpm 9+
- Toolchain de Rust (estable)
- Windows: WebView2 (preinstalado en Win10/11); Linux: `libwebkit2gtk-4.1-dev` etc. (ver abajo)

```bash
git clone https://github.com/Maicarons/papex-desktop.git
cd papex-desktop
pnpm install

# generar tipos de API desde el documento OpenAPI del servidor Papex
pnpm gen:types

# configurar URL base de la API
cp .env.example .env

# desarrollo (HMR de frontend + ventana Tauri)
pnpm tauri dev

# construir para la plataforma actual
pnpm tauri build
```

Dependencias de Linux (Debian/Ubuntu):

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

Variables de entorno (`.env`):

| Variable | Descripción | Por defecto |
| --- | --- | --- |
| `API_BASE_URL` | URL base del servidor Papex | `https://api.papex.example.com` |
| `I18N_FALLBACK` | Idioma de respaldo | `zh` |
| `CACHE_LIMIT_MB` | Límite de caché PDF local (MB) | `2048` |

---

## Desarrollo

```bash
pnpm lint            # eslint
pnpm typecheck       # tsc --noEmit
pnpm test            # pruebas unitarias de frontend (Vitest, cobertura)
cargo test           # pruebas unitarias de Rust (en src-tauri)
cargo clippy         # lints de Rust (CI fuerza -D warnings)
pnpm e2e             # E2E Playwright contra un backend Papex local
pnpm gen:types       # regenerar tipos de API desde openapi.json
pnpm sync:i18n       # sincronizar diccionarios zh/en desde el repo Papex
```

Cobertura de pruebas: frontend ≥80% de cobertura de sentencias en módulos centrales; Rust ≥85% en `commands/*`, `db/*` e `indexer/*`; el E2E cubre los flujos P0 (auth → biblioteca → leer → anotar → offline → subir). Los escenarios entre dispositivos (escritorio ↔ móvil ↔ web) se cubren junto con el cliente móvil — ver el [plan de desarrollo](https://github.com/Maicarons/papex/blob/main/docs/development/papex-desktop.md).

---

## Arquitectura (destacados)

- **Auth**: token de acceso (JWT, 15 min) + token de refresco (30 d, rotativo, ligado al dispositivo). Los tokens viven en el keychain del SO: Windows Credential Manager / macOS Keychain / Linux Secret Service (respaldo de archivo).
- **Local-primero**: SQLite `papex_local.db` para caché / anotaciones / progreso / cola de sincronización; tantivy para índice de texto completo offline (P2).
- **Subidas**: envío e importación de PDF, avatar, portada de artículo — validado en Rust, subido al servidor Papex con progreso y reintento.
- **Tipos**: generados desde `openapi.json` del servidor Papex — nunca escritos a mano.

Vea [`docs/development/papex-desktop.md`](https://github.com/Maicarons/papex/blob/main/docs/development/papex-desktop.md) en el repo Papex para el plan de desarrollo completo.

---

## Proyectos relacionados

- [Papex](https://github.com/Maicarons/papex) — plataforma backend (Next.js + PostgreSQL)
- [Papex App](https://github.com/Maicarons/papex-app) — cliente móvil oficial (React Native + RNOH)

---

## Licencia

[Apache-2.0](LICENSE) — Copyright 2026 The Papex Authors.
