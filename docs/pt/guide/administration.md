# Administração e permissões

Além da submissão e da busca centrais, o Papex traz uma **área de administração** voltada ao operador e um **sistema de permissões refinadas**. Este guia cobre quatro capacidades:

1. **Papéis e permissões (RBAC)** — controlar publicação, visualização, download e comentários de artigos por papel ou por usuário.
2. **Gerenciamento de permissões de usuário** — atribuir papéis extras e definir sobrescritas allow / deny por usuário para qualquer permissão.
3. **Co-revisão (revisão por pares)** — admins enviam pedidos de co-revisão; revisores aceitam, enviam pareceres e recebem recibos, formando um ciclo fechado.
4. **Mensagens categorizadas e broadcast** — um centro de notificação unificado abrangendo avisos do sistema, resultados de revisão, recibos de tickets, pedidos de co-revisão, DMs de admin e respostas da comunidade, além de broadcasts direcionados.

---

## 1. Papéis e permissões (RBAC)

O Papex usa um modelo de três camadas — **papel base + papéis atribuídos + sobrescritas por usuário** — dando suporte tanto a autorização em massa baseada em papéis quanto a restrições personalizadas por usuário.

### 1.1 Modelo de permissão

| Camada | Descrição | Mantido em |
| --- | --- | --- |
| Papel base | O papel inerente a todo usuário em `users.role`: `author` / `moderator` / `admin` | `author` padrão no registro |
| Papéis atribuídos | Papéis extras sobrepostos a um usuário via tabela de junção `user_roles` | Página de gerenciamento de usuários |
| Sobrescritas por usuário | *allow* ou *deny* explícito para uma única permissão em um usuário; prioridade máxima | Página de gerenciamento de usuários |

> ℹ️ `reader` é um papel RBAC **atribuído** (na tabela `roles`), não um papel base do banco (`users.role` só permite `author` / `moderator` / `admin`). O papel base define o limite de login e de permissão padrão; papéis atribuídos se empilham por cima.

### 1.2 Catálogo de permissões

O sistema traz **15 permissões** em **6 grupos**:

| Grupo | Chave de permissão | Nome | Descrição |
| --- | --- | --- | --- |
| paper | `paper:publish` | Publicar artigo | Enviar um novo artigo ou versão |
| | `paper:view` | Ver artigo | Navegar artigos publicados |
| | `paper:download` | Baixar artigo | Baixar PDF / pacote de fontes |
| | `paper:moderate` | Moderar artigo | Aprovar / rejeitar / retirar |
| comment | `comment:create` | Comentar | Comentar e responder em artigos |
| | `comment:view` | Ver comentários | Navegar a seção de comentários |
| ticket | `ticket:create` | Criar ticket | Abrir feedback / ticket |
| | `ticket:manage` | Gerenciar tickets | Responder a / tratar tickets |
| co_review | `co_review:assign` | Atribuir co-revisão | Enviar um pedido de co-revisão |
| | `co_review:respond` | Assumir co-revisão | Aceitar / recusar um pedido |
| | `co_review:manage` | Gerenciar co-revisão | Ver todo o progresso de co-revisão |
| message | `message:broadcast` | Broadcast | Enviar mensagens a usuários |
| admin | `user:manage` | Gerenciar usuários | Ver / editar usuários |
| | `role:manage` | Gerenciar papéis | Configurar papéis e permissões |
| | `permission:manage` | Gerenciar sobrescritas | allow / deny por usuário |

### 1.3 Permissões padrão por papel

O seed (`db:seed`) grava um mapeamento de permissões padrão para cada papel do sistema:

| Papel | Contagem | Permissões |
| --- | --- | --- |
| `admin` | 15 | Todas as permissões |
| `moderator` | 12 | ver/baixar/moderar artigo, criar/ver comentário, criar/gerenciar ticket, atribuir/responder/gerenciar co-revisão, broadcast, gerenciar usuários |
| `author` | 6 | publicar/ver/baixar artigo, criar/ver comentário, criar ticket |
| `reader` | 3 | ver/baixar artigo, ver comentário |

### 1.4 Ordem de resolução

Quando uma operação protegida é executada, as permissões efetivas são resolvidas como:

```
permissões do papel base
  ∪ permissões de papéis atribuídos      (união de papéis)
  ∪ sobrescritas por usuário marcadas allow
  − sobrescritas por usuário marcadas deny  (sobrescritas vencem)
```

Assim, mesmo que nem o papel base nem os atribuídos concedam `paper:publish`, uma sobrescrita *allow* explícita ainda o permite; inversamente, um *deny* explícito o bloqueia mesmo quando os papéis o concedem.

> Fallback: se as tabelas `roles` / `permissions` ainda não foram semeadas (ex. um BD novo sem `db:seed`), o motor recai no mapeamento constante padrão acima para evitar bloquear todo o site. Rodar `db:seed` após a implantação ainda é recomendado.

### 1.5 Operações protegidas (gateways)

Operações-chave são protegidas; permissão ausente retorna `403`:

- `POST /api/papers` — requer `paper:publish`
- `POST /api/papers/:id/comments` — requer `comment:create`
- Moderação, tratamento de tickets, atribuição / gerenciamento de co-revisão, edições de usuário & papel, broadcast etc. requerem suas respectivas permissões, e as rotas são protegidas por `middleware` (apenas `moderator` / `admin` podem entrar em `/admin`).

---

## 2. Gerenciamento de permissões de usuário

Abra **`/admin/users`** (requer `user:manage`):

- **Buscar usuários** por nome de usuário / e-mail / nome de exibição, com paginação.
- **Atribuir papéis extras**: marque papéis do sistema (`admin` / `moderator` / `author` / `reader`) no editor de usuário para sobrepor ao papel base.
- **Sobrescrita de permissão de três estados**: para cada uma das 15 permissões defina:
  - **herdar** (padrão) — seguir o resultado da união de papéis;
  - **allow** — forçar a concessão mesmo que os papéis a omitam;
  - **deny** — forçar o bloqueio mesmo que os papéis a incluam.

Todas as alterações são salvas instantaneamente via `PATCH /api/admin/users/:id` e aplicam-se às verificações de autorização subsequentes desse usuário.

---

## 3. Co-revisão (revisão por pares)

A co-revisão é um ciclo completo de revisão por pares conectando **admin → revisor → autor**.

### 3.1 Ciclo fechado

```
Admin atribui ──► Revisor recebe uma mensagem de "pedido de co-revisão"
     │
     ▼
Revisor responde (aceitar / recusar)
     │ aceitar
     ▼
Revisor envia parecer (aprovar / rejeitar / revisar + comentário)
     │
     ▼
Recibo do sistema ──► notifica o atribuidor "parecer enviado"
                ──► notifica o autor "co-revisão concluída" (se autor ≠ atribuidor)
```

### 3.2 Máquina de estados

Um registro de co-revisão (`co_reviews`) transita assim:

| Estado | Significado | Entrado por |
| --- | --- | --- |
| `pending` | Aguardando resposta do revisor | Atribuição do admin (`POST /api/co-reviews`) |
| `accepted` | Aceito | Revisor aceita (`POST /api/co-reviews/:id/respond` `{accepted:true}`) |
| `declined` | Recusado | Revisor recusa (`respond` `{accepted:false}`) |
| `completed` | Concluído | Revisor envia parecer (`submit`) |
| `expired` | Expirado | (estado reservado para fechamento por timeout) |

> Um revisor só pode responder enquanto `pending`, e só pode enviar um parecer enquanto `accepted`. Um estado incompatível retorna `INVALID_STATE`.

### 3.3 Pontos de entrada e notificações

- **Admin**: `/admin/co-reviews` para atribuir e monitorar todas as co-revisões; `/admin/co-reviews/:id` para detalhe. A atribuição escolhe entre artigos no status `submitted`.
- **Revisor**: `/co-reviews` (minhas revisões) e `/co-reviews/:id` (aceitar / recusar + enviar parecer).
- **Notificações unificadas**: toda mudança de estado dispara uma mensagem `co_review_request` / `co_review_result` para as partes relevantes (veja Seção 4).

---

## 4. Mensagens categorizadas e broadcast

### 4.1 Categorias de mensagem

As mensagens são classificadas por `kind` em **8 categorias**, coloridas e agrupadas na caixa de entrada:

| kind | Rótulo | Tom | Fonte típica |
| --- | --- | --- | --- |
| `system` | Aviso do sistema | padrão | Eventos do sistema |
| `ticket_reply` | Recibo de ticket | info azul | Ticket respondido |
| `announcement` | Anúncio | aviso amarelo | Broadcast do admin |
| `review_result` | Resultado de revisão | sucesso verde | Artigo aprovado / rejeitado |
| `co_review_request` | Pedido de co-revisão | roxo | Co-revisão atribuída |
| `co_review_result` | Recibo de co-revisão | roxo | Resposta / parecer enviado |
| `admin_message` | DM do admin | perigo vermelho | Mensagem direta direcionada |
| `community_reply` | Resposta da comunidade | info azul | Comentário respondido |

A caixa de entrada (`/messages`) suporta filtragem por categoria (`GET /api/messages?kind=...`); clicar em uma mensagem navega para seu `link` associado (artigo, ticket, co-revisão, …).

### 4.2 Funil de notificação unificado

Todos os alertas entre módulos são emitidos através de um único serviço `notifications`, para que revisão, ticket, co-revisão e comunidade compartilhem um contrato de notificação:

- **Revisão**: decisão do artigo → notificar autor (`review_result`).
- **Tickets**: resposta da equipe → notificar o relator (`ticket_reply`).
- **Co-revisão**: atribuir / responder / enviar → notificar revisor, atribuidor, autor (`co_review_request` / `co_review_result`).
- **Comunidade**: comentário respondido → notificar o autor do comentário pai (`community_reply`).

### 4.3 Broadcast

Abra **`/admin/messages`** (requer `message:broadcast`):

- **Escopo**:
  - `all` — todo usuário;
  - `role` — um papel base (`author` / `moderator` / `admin`);
  - `userIds` — uma lista de IDs de usuários específicos.
- **Kind**: `announcement` / `system` / `admin_message`.
- Preencha título, corpo (com `link` opcional), envie, e a mensagem é escrita em massa para o público-alvo; a contagem de sucesso é retornada.

---

## 5. Navegação administrativa

Os pontos de entrada de admin ficam no menu do usuário logado e na visão geral de `/admin`, incluindo:

| Módulo | Rota | Descrição |
| --- | --- | --- |
| Visão geral | `/admin` | Cartões de estatísticas + atalhos de módulo |
| Fila de revisão | `/admin/review` | Aprovar / rejeitar artigos (+ motivo) |
| Estatísticas | `/admin/stats` | Métricas da plataforma |
| Tickets | `/admin/tickets` | Tratamento de tickets |
| Co-revisão | `/admin/co-reviews` | Atribuir e monitorar co-revisões |
| Usuários | `/admin/users` | Papéis e sobrescritas de permissão |
| Papéis | `/admin/roles` | Matriz de permissões por papel |
| Mensagens | `/admin/messages` | Broadcast |

> Essas rotas são protegidas por `middleware`; apenas usuários com papel base `moderator` ou `admin` podem acessá-las, e ações de escrita exigem adicionalmente a permissão refinada correspondente.

---

## 6. Operações: migrar e semear

Os quatro sistemas dependem da migração `0003_add_rbac_co_review_messages` (adiciona `roles` / `permissions` / `role_permissions` / `user_roles` / `user_permissions` / `co_reviews` / `moderation_logs`, e estende `messages.kind` para 8 categorias). Na implantação ou inicialização local, rode:

```bash
npm run db:migrate   # aplica migrações (RBAC / co-revisão / categorias de mensagem)
npm run db:seed      # grava 4 papéis do sistema + 15 permissões + padrões (idempotente)
```

O seed RBAC usa `onConflictDoNothing` e é seguro de rodar novamente. Após migrar + semear, o motor de permissões usa as tabelas `roles` / `permissions`; antes do seed ele recai nos padrões constantes (veja 1.4).

---

## 7. Referência rápida de API

| Método | Caminho | Descrição |
| --- | --- | --- |
| `GET` | `/api/messages?kind=` | Caixa de entrada, filtrar por categoria |
| `POST` | `/api/papers/:id/moderate` | Moderar `{action:"approve"\|"reject"\|"withdraw", reason?}` |
| `GET` | `/api/co-reviews?scope=mine\|all` | Lista de co-revisão (minha / todas) |
| `POST` | `/api/co-reviews` | Atribuir `{paperId, reviewerId, note?}` |
| `GET` | `/api/co-reviews/:id` | Detalhe da co-revisão |
| `POST` | `/api/co-reviews/:id/respond` | Responder `{accepted:boolean}` |
| `POST` | `/api/co-reviews/:id/submit` | Enviar `{decision:"approve"\|"reject"\|"revise", comment}` |
| `GET` | `/api/admin/users` | Lista de usuários (paginação / busca) |
| `PATCH` | `/api/admin/users/:id` | Definir papéis `{roleKeys}` ou sobrescrever `{permission:{key,grant}}` |
| `GET` | `/api/admin/roles` | Lista de papéis |
| `PUT` | `/api/admin/roles/:id` | Definir permissões do papel `{permissionKeys}` |
| `POST` | `/api/admin/messages` | Broadcast `{scope, role?, userIds?, kind, title, body, link?}` |
| `GET` | `/api/admin/stats` | Estatísticas da plataforma |

Veja a [referência de API](/en/guide/api) para a lista completa.
