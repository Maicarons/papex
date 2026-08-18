# API

O Papex expõe um conjunto de APIs HTTP JSON sob `/api`.

## Referência interativa

Uma especificação **OpenAPI 3.1** completa e legível por máquina é servida em
[`/api/openapi.json`](/api/openapi.json), e um explorador interativo, com capacidade de Try-it
(alimentado por [Scalar](https://scalar.com)) está disponível em
**[/api-docs](/api-docs)**. Abra-o para navegar por cada endpoint, inspecionar esquemas de requisição
e resposta, e enviar requisições ao vivo a partir do seu navegador.

## Mantendo a documentação em sincronia (code-first)

O documento OpenAPI é **gerado a partir do código**, não escrito à mão. Cada
rota possui um fragmento irmão `route.openapi.ts` que é a única fonte de verdade para a documentação
daquele endpoint. A parte estática (info, `components/schemas`,
`components/responses`, security) vive em `src/lib/openapi/base.ts`.

O gerador (`src/lib/openapi/generate.ts`) varre cada fragmento, os mescla
na base e escreve `src/lib/openapi/spec.generated.ts` — o arquivo servido
por `/api/openapi.json`.

```bash
# regenera após editar um fragmento (/api/openapi.json + /api-docs atualizam)
npm run openapi:generate
```

Isto está conectado a `predev` e `prebuild`, então a especificação é sempre reconstruída antes
de `next dev` / `next build`. **Nunca edite `spec.generated.ts` à mão** — ele é
sobrescrito a cada execução.

### Documentando um novo endpoint

Quando você adiciona um manipulador de rota `src/app/api/foo/bar/route.ts`, crie um irmão
`route.openapi.ts`:

```ts
export default {
  "/api/foo/bar": {
    get: {
      tags: ["Discovery"],
      summary: "Describe what it does",
      // security: []            // omita para endpoints públicos
      responses: {
        200: { description: "OK", content: { "application/json": { schema: { type: "object" } } } },
      },
    },
  },
} as const;
```

Rode `npm run openapi:generate` (ou apenas inicie/construa) e o endpoint aparece em
`/api/openapi.json` e `/api-docs` automaticamente. Esquemas compartilhados vivem em
`src/lib/openapi/base.ts` (ex. `#/components/schemas/PaperListItem`).

## Autenticação

Há duas formas de autenticar:

1. **Cookie de sessão** (`papex_session`) — emitido no login e usado pelo
   navegador. Enviado automaticamente para requisições da mesma origem.
2. **Chave de API** (`Authorization: Bearer pk_…`) — para scripts e
   integrações de terceiros. Crie chaves em **Configurações → Chaves de API**
   (`/settings/api-keys`). Uma chave é vinculada à sua conta e herda as
   permissões RBAC do seu papel, então todo endpoint que funciona com cookie de sessão
   também funciona com chave de API. O segredo cru é mostrado **apenas uma vez** na
   criação; apenas seu hash SHA-256 é armazenado.

Exemplo de requisição com chave de API:

```bash
curl -H "Authorization: Bearer pk_live_xxxx" https://your-host/api/papers?pageSize=1
```

Endpoints públicos (não autenticados) — como listar artigos, busca,
categorias, autores e health — funcionam para chamadores anônimos, cookies de sessão
e chaves de API igualmente.

## Auth

- `POST /api/auth/register` — registrar `{username, email, displayName, password}`
- `POST /api/auth/login` — login `{identifier, password}`
- `POST /api/auth/logout` — logout
- `GET /api/auth/me` — usuário atual

## Chaves de API

- `GET /api/settings/api-keys` — listar suas chaves
- `POST /api/settings/api-keys` — criar uma chave `{name, scopes?:["read"|"write"], environment?:"live"|"test", expiresAt?:ISODate|null}`
- `DELETE /api/settings/api-keys?id=<keyId>` — revogar uma chave

## Artigos

- `GET /api/papers` — listar. Parâmetros de query: `q` (texto integral ou prefixado com `title:`/`au:`/`abs:`/`cat:`), `category`, `tag`, `sort` (`new` | `updated` | `by_citations`), `from` (data ISO, apenas artigos criados em/ após), `page`, `pageSize`. As linhas incluem um `citationCount` resolvido.
- `GET /api/papers/:id` — detalhe (inclui `submitter`, `tags`, `commentCount`)
- `GET /api/papers/:id/comments` — comentários
- `GET /api/papers/:id/citations` — grafo de citações `{ outgoing, incoming }`
- `GET /api/papers/:id/tags` — tags de um artigo
- `POST /api/papers` — submeter (auth obrigatório, precisa de `paper:publish`); aceita JSON ou multipart (meta + arquivo `pdf` opcional)
- `POST /api/papers/:id/moderate` — moderar `{action:"approve"|"reject"|"withdraw", reason?}` (precisa de `paper:moderate`)
- `POST /api/papers/:id/citations` — adicionar uma citação `{targetArxivId?|targetDoi?|targetTitle?}` (dono/moderador/admin)
- `POST /api/papers/:id/tags` / `DELETE /api/papers/:id/tags` — anexar/desanexar uma tag `{tagId|name}` (dono/moderador/admin; cria a tag se o nome for novo)
- `POST /api/submit/archive` — enviar um `tar.gz` de pacote de fontes para auto-ingerir, vincular citações e compilar PDF (auth obrigatório; veja [Guia de submissão](/en/guide/submission))

## Categorias

- `GET /api/categories` — árvore de categorias

## Tags

- `GET /api/tags` — todas as tags com contagem de uso (ordenadas por popularidade)
- `POST /api/tags` — criar uma tag `{name}` (auth obrigatório; idempotente por nome)

## Assinaturas

- `GET /api/subscriptions` — listar minhas assinaturas, **enriquecidas** (nomes de categoria/autor/artigo resolvidos em `title` + um `href` de link profundo)
- `POST /api/subscriptions` — assinar / cancelar assinatura (alternar) `{type:"category"|"author"|"paper", refId}`
- `DELETE /api/subscriptions` — cancelar assinatura `{type, refId}`

## Feed e notificações

Anúncios são gerados quando um artigo entra em uma de suas assinaturas (novo-na-categoria, novo-do-autor), quando alguém responde seu comentário, ou por um broadcast de admin.

- `GET /api/feed` — anúncios do usuário atual (`?markRead=1` também os marca todos como lidos)
- `POST /api/feed` — marcar um único anúncio como lido `{id}`

O sino de cabeçalho (`FeedBell`) mostra um indicador de não lidas em tempo real mantido em sincronia por uma store Zustand, então ler em qualquer lugar atualiza o indicador imediatamente.

## Marcadores

- `GET /api/bookmarks` — listar meus marcadores (cada um resolvido para o título do artigo e `groupName`); passe `?paperId=` para obter em vez disso `{ bookmarked: boolean }` para um único artigo
- `POST /api/bookmarks` — alternar um marcador `{paperId, group?}` (retorna `{ bookmarked: true|false }`)
- `PATCH /api/bookmarks/:paperId` — mover um marcador para um grupo `{group}` (null o limpa)
- `DELETE /api/bookmarks` — remover um marcador `{paperId}`

## Mensagens

As mensagens são classificadas por `kind` em 8 categorias: `system`, `ticket_reply`, `announcement`, `review_result`, `co_review_request`, `co_review_result`, `admin_message`, `community_reply`.

- `GET /api/messages` — mensagens do usuário atual + contagem de não lidas (suporta filtro `?kind=`)
- `GET /api/messages/stats` — estatísticas de não lidas
- `POST /api/messages/:id/read` — marcar como lido
- `POST /api/messages` — `{action:"read-all"}` marcar tudo como lido

## Tickets

- `GET /api/tickets` — meus tickets (`?scope=all` apenas admin)
- `POST /api/tickets` — criar `{subject, type, priority, message}`
- `GET /api/tickets/:id` — detalhe
- `POST /api/tickets/:id` — responder
- `PATCH /api/tickets/:id` — admin atualiza status/prioridade

## Feedback

- `POST /api/feedback` — enviar feedback (auth obrigatório, cria um ticket automaticamente)

## Co-revisão

- `GET /api/co-reviews?scope=mine|all` — listar (minha / todas, permissão respectiva obrigatória)
- `POST /api/co-reviews` — atribuir `{paperId, reviewerId, note?}` (precisa de `co_review:assign`)
- `GET /api/co-reviews/:id` — detalhe
- `POST /api/co-reviews/:id/respond` — revisor responde `{accepted:boolean}`
- `POST /api/co-reviews/:id/submit` — enviar parecer `{decision:"approve"|"reject"|"revise", comment}`

## Admin

Os endpoints de admin exigem um papel base `moderator` / `admin` e são autorizados por permissão refinada.

- `GET /api/admin/users` — lista de usuários (paginação / busca, precisa de `user:manage`)
- `PATCH /api/admin/users/:id` — definir papéis `{roleKeys:string[]}` ou sobrescrever `{permission:{key:string, grant:boolean|null}}` (precisa de `user:manage` / `permission:manage`)
- `GET /api/admin/roles` — lista de papéis (precisa de `role:manage`)
- `PUT /api/admin/roles/:id` — definir permissões do papel `{permissionKeys:string[]}`
- `POST /api/admin/messages` — broadcast `{scope:"all"|"role"|"userIds", role?, userIds?, kind:"announcement"|"system"|"admin_message", title, body, link?}` (precisa de `message:broadcast`)
- `GET /api/admin/stats` — estatísticas da plataforma
