# Papex Desktop

> Bancada de pesquisa desktop para a plataforma de literatura acadêmica Papex — Windows · Linux · macOS

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)]()
[![Tauri](https://img.shields.io/badge/Tauri-2.x-24c8db.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

O Papex Desktop transforma o [Papex](https://github.com/Maicarons/papex) — uma plataforma de literatura acadêmica de código aberto — em uma **bancada de pesquisa** completa que vive na sua área de trabalho: uma biblioteca local-first, leitura profunda de PDF com destaques e anotações, gerenciamento de citações, busca em texto integral offline e sincronização na nuvem.

Construído com **Tauri 2.x** (núcleo Rust + WebView do sistema) e **Vite + React 19**, entregue como um app nativo leve (instalador de ≈5–15 MB, 30–50 MB de memória).

> ⚠️ **Dependência**: este app consome a API do servidor Papex. Implante o [backend do Papex](https://github.com/Maicarons/papex) primeiro.

---

## Recursos

| Prioridade | Recurso | Status |
| --- | --- | --- |
| P0 | Login / logout / multiplas contas (tokens no keychain do SO) | planejado |
| P0 | Biblioteca de três painéis: 257 categorias bilíngues / lista / detalhe, filtros e ordenação | planejado |
| P0 | Busca online por palavra-chave + semântica (`/api/search?semantic=1`) | planejado |
| P0 | Leitor de PDF (pdf.js): paginação, zoom, busca, marcadores, progresso, inversão escura | planejado |
| P0 | Destaques (multicor) + anotações de texto, SQLite local + sincronização na nuvem | planejado |
| P0 | Cache offline de PDF, leitura offline, gerenciamento de cache | planejado |
| P0 | Grafo de citações interativo (ECharts), notificações de assinatura | planejado |
| P0 | Bandeja do sistema, atalhos globais (Ctrl/Cmd+K), trava de instância única | planejado |
| P1 | Geração de citações (CSL: GB/T 7714, APA, MLA, …), exportação BibTeX / RIS | planejado |
| P1 | Integração LaTeX (`\cite{key}` + bloco de bibliografia, via papex-latex) | planejado |
| P1 | **Uploads de arquivos e imagens**: submissão de artigo, importação de PDF local, avatar, capa do artigo | planejado |
| P1 | Buscas salvas (pastas inteligentes), tags em lote, estatísticas de leitura, leitura em painel duplo | planejado |
| P2 | Índice de texto integral local (tantivy), busca offline em milissegundos | planejado |
| P2 | Visão de colaboração (co-revisão / endosso / comentários, somente leitura) | planejado |
| P3 | Embeddings locais opcionais (Ollama) para busca semântica offline, protótipo de plugin | planejado |

> Recursos de admin / moderação são intencionalmente **não** incluídos no cliente desktop — use a versão web para isso.

---

## Plataformas

| Plataforma | Artefato | Canal |
| --- | --- | --- |
| Windows 10+ | NSIS / MSI | Download no site + winget (opcional) |
| macOS 11+ | .dmg (Developer ID + notarização) | Site + App Store (opcional) |
| Linux (WebKitGTK 2.44+) | .deb / AppImage / .rpm | Site + repositórios de distro (depois) |

---

## Instalação

### Binários pré-construídos

Baixe o instalador para sua plataforma na página de [Releases](https://github.com/Maicarons/papex-desktop/releases) (assim que publicados).

### A partir do código-fonte

Pré-requisitos:

- Node.js 20+ & pnpm 9+
- Toolchain Rust (stable)
- Windows: WebView2 (pré-instalado no Win10/11); Linux: `libwebkit2gtk-4.1-dev` etc. (veja abaixo)

```bash
git clone https://github.com/Maicarons/papex-desktop.git
cd papex-desktop
pnpm install

# gera os tipos da API a partir do documento OpenAPI do servidor Papex
pnpm gen:types

# configura a URL base da API
cp .env.example .env

# desenvolvimento (HMR do frontend + janela Tauri)
pnpm tauri dev

# build para a plataforma atual
pnpm tauri build
```

Dependências Linux (Debian/Ubuntu):

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

Variáveis de ambiente (`.env`):

| Variável | Descrição | Padrão |
| --- | --- | --- |
| `API_BASE_URL` | URL base do servidor Papex | `https://api.papex.example.com` |
| `I18N_FALLBACK` | Idioma de fallback | `zh` |
| `CACHE_LIMIT_MB` | Limite do cache local de PDF (MB) | `2048` |

---

## Desenvolvimento

```bash
pnpm lint            # eslint
pnpm typecheck       # tsc --noEmit
pnpm test            # testes unitários do frontend (Vitest, cobertura)
cargo test           # testes unitários Rust (em src-tauri)
cargo clippy         # lints Rust (CI impõe -D warnings)
pnpm e2e             # E2E Playwright contra um backend Papex local
pnpm gen:types       # regenera os tipos da API a partir do openapi.json
pnpm sync:i18n       # sincroniza os dicionários zh/en do repositório Papex
```

Cobertura de testes: frontend ≥80% de cobertura de statements nos módulos centrais; Rust ≥85% em `commands/*`, `db/*` e `indexer/*`; E2E cobre os fluxos P0 (auth → biblioteca → ler → anotar → offline → upload). Cenários entre dispositivos (desktop ↔ móvel ↔ web) são cobertos junto com o cliente móvel — veja o [plano de desenvolvimento](https://github.com/Maicarons/papex/blob/main/docs/development/papex-desktop.md).

---

## Arquitetura (destaques)

- **Auth**: access token (JWT, 15 min) + refresh token (30 d, rotativo, vinculado ao dispositivo). Os tokens vivem no keychain do SO: Windows Credential Manager / macOS Keychain / Linux Secret Service (fallback de arquivo).
- **Local-first**: SQLite `papex_local.db` para cache / anotações / progresso / fila de sincronização; tantivy para índice de texto integral offline (P2).
- **Uploads**: submissão e importação de PDF, avatar, capa do artigo — validados em Rust, enviados ao servidor Papex com progresso e retry.
- **Tipos**: gerados a partir do `openapi.json` do servidor Papex — nunca escritos à mão.

Veja [`docs/development/papex-desktop.md`](https://github.com/Maicarons/papex/blob/main/docs/development/papex-desktop.md) no repositório Papex para o plano de desenvolvimento completo.

---

## Projetos relacionados

- [Papex](https://github.com/Maicarons/papex) — plataforma de backend (Next.js + PostgreSQL)
- [Papex App](https://github.com/Maicarons/papex-app) — cliente móvel oficial (React Native + RNOH)

---

## Licença

[Apache-2.0](LICENSE) — Copyright 2026 The Papex Authors.
