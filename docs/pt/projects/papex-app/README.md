# Papex App

> Cliente móvel oficial da plataforma de literatura acadêmica Papex — Android · HarmonyOS · iOS

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20HarmonyOS%20%7C%20iOS-lightgrey.svg)]()
[![React Native](https://img.shields.io/badge/React%20Native-0.82-61dafb.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

O Papex App é o cliente móvel oficial do [Papex](https://github.com/Maicarons/papex), uma plataforma de literatura acadêmica de código aberto. Ele é projetado como um **substituto móvel da versão web**: leia artigos, gerencie sua conta e mantenha-se atualizado — em qualquer lugar.

Construído com **React Native 0.82 + RNOH 0.82.30** (adaptação HarmonyOS), compartilhando uma base de código única entre Android, HarmonyOS e iOS (~95% do código de negócio compartilhado).

> ⚠️ **Dependência**: este app consome a API do servidor Papex. Implante o [backend do Papex](https://github.com/Maicarons/papex) primeiro.

---

## Recursos

| Prioridade | Recurso | Status |
| --- | --- | --- |
| P0 | Login / registro / logout, troca de multiplas contas, gerenciamento de dispositivos (revogação remota) | planejado |
| P0 | Feed inicial, árvore de categorias (257 categorias bilíngues), paginação | planejado |
| P0 | Busca por palavra-chave + busca semântica (`/api/search?semantic=1`) | planejado |
| P0 | Detalhe do artigo, troca de versão, leitura de PDF com memória de progresso | planejado |
| P0 | Marcadores, assinaturas, mensagens / tickets / feedback no app | planejado |
| P0 | Perfil, endosso, UI bilíngue (zh/en), modo escuro | planejado |
| P1 | Download offline de PDF, cache de metadados, navegação offline | planejado |
| P1 | Sincronização de progresso de leitura entre dispositivos, notificações push (FCM / APNs / PushKit) | planejado |
| P1 | Desbloqueio biométrico, gerenciamento de chaves de API, estados skeleton/erro/vazio | planejado |
| P2 | Comentários, endosso, recomendações, folha de compartilhamento do sistema, estatísticas de leitura | planejado |
| P3 | Login por QR (web ↔ app), layout para tablet, visualização somente leitura de anotações | planejado |

> Recursos de admin / moderação são intencionalmente **não** incluídos no cliente móvel — use a versão web para isso.

---

## Plataformas

| Plataforma | Canal | Status |
| --- | --- | --- |
| Android (minSdk 24+) | Google Play / lojas CN | planejado |
| iOS (15+) | App Store | planejado |
| HarmonyOS (API 12+) | AppGallery | planejado |

---

## Instalação

### Binários pré-construídos

Baixe da página de [Releases](https://github.com/Maicarons/papex-app/releases) (assim que publicados), ou instale pela loja de sua escolha.

### A partir do código-fonte

Pré-requisitos:

- Node.js 20+
- Android SDK (minSdk 24) para builds Android
- Xcode 15+ (macOS) para builds iOS
- DevEco Studio 5.x (API 12+) + projeto AGC para builds HarmonyOS

```bash
git clone https://github.com/Maicarons/papex-app.git
cd papex-app
npm install

# gera os tipos da API a partir do documento OpenAPI do servidor Papex
npm run gen:types

# configura a URL base da API
cp .env.example .env

# roda no Android
npm run android

# roda no iOS (somente macOS)
cd ios && pod install && cd ..
npm run ios

# roda no HarmonyOS: abra harmony/ no DevEco Studio, assine com AGC, rode no dispositivo/simulador
```

Variáveis de ambiente (`.env`):

| Variável | Descrição | Padrão |
| --- | --- | --- |
| `API_BASE_URL` | URL base do servidor Papex | `https://api.papex.example.com` |
| `PUSH_ENABLED` | Habilita o registro de push | `true` |
| `I18N_FALLBACK` | Idioma de fallback | `zh` |

---

## Desenvolvimento

```bash
npm run lint          # eslint
npm run typecheck     # tsc --noEmit
npm test              # testes unitários (Jest + RNTL, cobertura)
npm run e2e:ios       # E2E Detox (simulador iOS)
npm run e2e:android   # E2E Detox (emulador Android)
npm run gen:types     # regenera os tipos da API a partir do openapi.json
npm run sync:i18n     # sincroniza os dicionários zh/en do repositório Papex
```

Cobertura de testes: testes unitários visam ≥80% de cobertura de statements nos módulos centrais (`lib/api`, `lib/security`, `lib/storage`, stores); E2E cobre os fluxos P0 (auth → navegar → ler → marcar → assinar → dispositivos). Cenários entre dispositivos são cobertos junto com o cliente desktop (veja o [plano de desenvolvimento](https://github.com/Maicarons/papex/blob/main/docs/development/papex-app.md)).

---

## Arquitetura (destaques)

- **Auth**: access token (JWT, 15 min) + refresh token (30 d, rotativo, vinculado ao dispositivo). Os tokens vivem no armazenamento seguro do SO: Keychain (iOS) / Keystore (Android) / HUKS (HarmonyOS).
- **Dados**: MMKV para sessão/preferências/cache; arquivos PDF em cache no sandbox do app com evicção LRU.
- **i18n**: i18next, dicionários zh/en sincronizados do repositório Papex.
- **Tipos**: gerados a partir do `openapi.json` do servidor Papex — nunca escritos à mão.

Veja [`docs/development/papex-app.md`](https://github.com/Maicarons/papex/blob/main/docs/development/papex-app.md) no repositório Papex para o plano de desenvolvimento completo.

---

## Projetos relacionados

- [Papex](https://github.com/Maicarons/papex) — plataforma de backend (Next.js + PostgreSQL)
- [Papex Desktop](https://github.com/Maicarons/papex-desktop) — bancada de pesquisa desktop (Tauri 2)

---

## Licença

[Apache-2.0](LICENSE) — Copyright 2026 The Papex Authors.
