# API

Papex предоставляет набор JSON HTTP API под префиксом `/api`.

## Интерактивная справка

Полная, машиночитаемая спецификация **OpenAPI 3.1** отдаётся по адресу
[`/api/openapi.json`](/api/openapi.json), а интерактивный обозреватель с возможностью
«Try-it» (на базе [Scalar](https://scalar.com)) доступен по адресу
**[/api-docs](/api-docs)**. Откройте его, чтобы просмотреть каждую конечную точку, изучить схемы
запросов и ответов и отправлять живые запросы из браузера.

## Синхронизация документации (code-first)

Документ OpenAPI **генерируется из кода**, а не пишется вручную. Каждый
маршрут владеет соседним фрагментом `route.openapi.ts`, который является единственным
источником истины для документации этой конечной точки. Статическая часть (info, `components/schemas`,
`components/responses`, security) живёт в `src/lib/openapi/base.ts`.

Генератор (`src/lib/openapi/generate.ts`) сканирует каждый фрагмент, объединяет их
с базой и записывает `src/lib/openapi/spec.generated.ts` — файл, отдаваемый
через `/api/openapi.json`.

```bash
# перегенерировать после правки фрагмента (/api/openapi.json + обновление /api-docs)
npm run openapi:generate
```

Это подключено в `predev` и `prebuild`, поэтому спецификация всегда пересобирается перед
`next dev` / `next build`. **Никогда не редактируйте `spec.generated.ts` вручную** — он
перезаписывается при каждом запуске.

### Документирование новой конечной точки

Когда вы добавляете обработчик маршрута `src/app/api/foo/bar/route.ts`, создайте соседний
`route.openapi.ts`:

```ts
export default {
  "/api/foo/bar": {
    get: {
      tags: ["Discovery"],
      summary: "Describe what it does",
      // security: []            // убрать для публичных конечных точек
      responses: {
        200: { description: "OK", content: { "application/json": { schema: { type: "object" } } } },
      },
    },
  },
} as const;
```

Выполните `npm run openapi:generate` (или просто запустите/соберите), и конечная точка появится в
`/api/openapi.json` и `/api-docs` автоматически. Общие схемы живут в
`src/lib/openapi/base.ts` (напр. `#/components/schemas/PaperListItem`).

## Аутентификация

Есть два способа аутентификации:

1. **Сессионная cookie** (`papex_session`) — выдаётся при входе и используется
   браузером. Отправляется автоматически для same-origin запросов.
2. **API-ключ** (`Authorization: Bearer pk_…`) — для скриптов и сторонних
   интеграций. Создавайте ключи в **Настройки → API-ключи**
   (`/settings/api-keys`). Ключ привязан к вашей учётной записи и наследует RBAC-права
   вашей роли, поэтому каждая конечная точка, работающая с сессионной cookie,
   также работает с API-ключом. Исходный секрет показывается **только один раз**
   при создании; хранится только его хеш SHA-256.

Пример запроса с API-ключом:

```bash
curl -H "Authorization: Bearer pk_live_xxxx" https://your-host/api/papers?pageSize=1
```

Публичные (неаутентифицированные) конечные точки — такие как список работ, поиск,
категории, авторы и health — работают для анонимных вызовов, сессионных cookie
и API-ключей одинаково.

## Auth

- `POST /api/auth/register` — регистрация `{username, email, displayName, password}`
- `POST /api/auth/login` — вход `{identifier, password}`
- `POST /api/auth/logout` — выход
- `GET /api/auth/me` — текущий пользователь

## API-ключи

- `GET /api/settings/api-keys` — список ваших ключей
- `POST /api/settings/api-keys` — создать ключ `{name, scopes?:["read"|"write"], environment?:"live"|"test", expiresAt?:ISODate|null}`
- `DELETE /api/settings/api-keys?id=<keyId>` — отозвать ключ

## Работы

- `GET /api/papers` — список. Параметры запроса: `q` (полнотекстовый или с префиксами `title:`/`au:`/`abs:`/`cat:`), `category`, `tag`, `sort` (`new` | `updated` | `by_citations`), `from` (ISO-дата, только работы, созданные на/после), `page`, `pageSize`. Строки включают разрешённый `citationCount`.
- `GET /api/papers/:id` — детали (включают `submitter`, `tags`, `commentCount`)
- `GET /api/papers/:id/comments` — комментарии
- `GET /api/papers/:id/citations` — граф цитирований `{ outgoing, incoming }`
- `GET /api/papers/:id/tags` — теги работы
- `POST /api/papers` — подать (требуется auth, нужно `paper:publish`); принимает JSON или multipart (meta + необязательный файл `pdf`)
- `POST /api/papers/:id/moderate` — модерация `{action:"approve"|"reject"|"withdraw", reason?}` (нужно `paper:moderate`)
- `POST /api/papers/:id/citations` — добавить цитирование `{targetArxivId?|targetDoi?|targetTitle?}` (владелец/модератор/админ)
- `POST /api/papers/:id/tags` / `DELETE /api/papers/:id/tags` — прикрепить/открепить тег `{tagId|name}` (владелец/модератор/админ; создаёт тег, если имя новое)
- `POST /api/submit/archive` — загрузить исходный пакет `tar.gz` для авто-приёма, связывания цитирований и сборки PDF (требуется auth; см. [Руководство по подаче](/en/guide/submission))

## Категории

- `GET /api/categories` — дерево категорий

## Теги

- `GET /api/tags` — все теги с счётчиками использования (упорядочены по популярности)
- `POST /api/tags` — создать тег `{name}` (требуется auth; идемпотентен по имени)

## Подписки

- `GET /api/subscriptions` — список моих подписок, **обогащённый** (имена категории/автора/работы разрешены в `title` + глубокая ссылка `href`)
- `POST /api/subscriptions` — подписаться / отписаться (переключение) `{type:"category"|"author"|"paper", refId}`
- `DELETE /api/subscriptions` — отписаться `{type, refId}`

## Лента и уведомления

Объявления генерируются, когда работа попадает в одну из ваших подписок (новое в категории, новое от автора), когда кто-то отвечает на ваш комментарий, или по рассылке админа.

- `GET /api/feed` — объявления текущего пользователя (`?markRead=1` также помечает их все прочитанными)
- `POST /api/feed` — пометить одно объявление прочитанным `{id}`

Колокольчик в шапке (`FeedBell`) показывает живой индикатор непрочитанного, синхронизируемый через Zustand-стор, поэтому чтение где угодно мгновенно обновляет индикатор.

## Закладки

- `GET /api/bookmarks` — список моих закладок (каждая разрешена в название работы и `groupName`); передайте `?paperId=`, чтобы вместо этого получить `{ bookmarked: boolean }` для одной работы
- `POST /api/bookmarks` — переключить закладку `{paperId, group?}` (возвращает `{ bookmarked: true|false }`)
- `PATCH /api/bookmarks/:paperId` — переместить закладку в группу `{group}` (null очищает)
- `DELETE /api/bookmarks` — удалить закладку `{paperId}`

## Сообщения

Сообщения классифицируются по `kind` на 8 категорий: `system`, `ticket_reply`, `announcement`, `review_result`, `co_review_request`, `co_review_result`, `admin_message`, `community_reply`.

- `GET /api/messages` — сообщения текущего пользователя + счётчик непрочитанных (поддерживает фильтр `?kind=`)
- `GET /api/messages/stats` — статистика непрочитанного
- `POST /api/messages/:id/read` — пометить прочитанным
- `POST /api/messages` — `{action:"read-all"}` пометить все прочитанными

## Тикеты

- `GET /api/tickets` — мои тикеты (`?scope=all` только для админа)
- `POST /api/tickets` — создать `{subject, type, priority, message}`
- `GET /api/tickets/:id` — детали
- `POST /api/tickets/:id` — ответ
- `PATCH /api/tickets/:id` — админ обновляет статус/приоритет

## Обратная связь

- `POST /api/feedback` — отправить отзыв (требуется auth, автоматически создаёт тикет)

## Совместное рецензирование

- `GET /api/co-reviews?scope=mine|all` — список (мои / все, требуется соответствующее право)
- `POST /api/co-reviews` — назначить `{paperId, reviewerId, note?}` (нужно `co_review:assign`)
- `GET /api/co-reviews/:id` — детали
- `POST /api/co-reviews/:id/respond` — ответ рецензента `{accepted:boolean}`
- `POST /api/co-reviews/:id/submit` — отправить мнение `{decision:"approve"|"reject"|"revise", comment}`

## Админ

Админ-конечные точки требуют базовой роли `moderator` / `admin` и авторизуются по тонкому праву.

- `GET /api/admin/users` — список пользователей (постранично / поиск, нужно `user:manage`)
- `PATCH /api/admin/users/:id` — установить роли `{roleKeys:string[]}` или переопределение `{permission:{key:string, grant:boolean|null}}` (нужно `user:manage` / `permission:manage`)
- `GET /api/admin/roles` — список ролей (нужно `role:manage`)
- `PUT /api/admin/roles/:id` — установить права роли `{permissionKeys:string[]}`
- `POST /api/admin/messages` — рассылка `{scope:"all"|"role"|"userIds", role?, userIds?, kind:"announcement"|"system"|"admin_message", title, body, link?}` (нужно `message:broadcast`)
- `GET /api/admin/stats` — статистика платформы
