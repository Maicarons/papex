# API

Papex expone un conjunto de API HTTP JSON bajo `/api`.

## Referencia interactiva

Una especificación **OpenAPI 3.1** completa y legible por máquina se sirve en
[`/api/openapi.json`](/api/openapi.json), y un explorador interactivo, capaz de probar (impulsado por [Scalar](https://scalar.com)) está disponible en
**[/api-docs](/api-docs)**. Ábralo para explorar cada endpoint, inspeccionar los esquemas de petición
y respuesta, y enviar peticiones en vivo desde su navegador.

## Mantener la documentación sincronizada (código primero)

El documento OpenAPI se **genera a partir del código**, no se escribe a mano. Cada
ruta posee un fragmento hermano `route.openapi.ts` que es la única fuente de verdad para la
documentación de ese endpoint. La parte estática (info, `components/schemas`,
`components/responses`, security) vive en `src/lib/openapi/base.ts`.

El generador (`src/lib/openapi/generate.ts`) escanea cada fragmento, los fusiona
con la base, y escribe `src/lib/openapi/spec.generated.ts` — el archivo que sirve
`/api/openapi.json`.

```bash
# regenerar tras editar un fragmento (/api/openapi.json + /api-docs se actualizan)
npm run openapi:generate
```

Esto se conecta a `predev` y `prebuild`, así la especificación siempre se reconstruye antes de
`next dev` / `next build`. **Nunca edite `spec.generated.ts` a mano** — se sobrescribe en cada ejecución.

### Documentar un endpoint nuevo

Cuando añade un manejador de ruta `src/app/api/foo/bar/route.ts`, cree un hermano
`route.openapi.ts`:

```ts
export default {
  "/api/foo/bar": {
    get: {
      tags: ["Discovery"],
      summary: "Describe lo que hace",
      // security: []            // omitir para endpoints públicos
      responses: {
        200: { description: "OK", content: { "application/json": { schema: { type: "object" } } } },
      },
    },
  },
} as const;
```

Ejecute `npm run openapi:generate` (o simplemente inicie/construya) y el endpoint aparece en
`/api/openapi.json` y `/api-docs` automáticamente. Los esquemas compartidos viven en
`src/lib/openapi/base.ts` (p. ej. `#/components/schemas/PaperListItem`).

## Autenticación

Hay dos formas de autenticar:

1. **Cookie de sesión** (`papex_session`) — emitida al iniciar sesión y usada por el
   navegador. Se envía automáticamente para peticiones del mismo origen.
2. **Clave de API** (`Authorization: Bearer pk_…`) — para scripts e
   integraciones de terceros. Cree claves desde **Ajustes → Claves de API**
   (`/settings/api-keys`). Una clave se vincula a su cuenta y hereda los
   permisos RBAC de su rol, así cada endpoint que funciona con una cookie de sesión
   también funciona con una clave de API. El secreto crudo se muestra **solo una vez** al
   crearse; solo se almacena su hash SHA-256.

Ejemplo de petición con una clave de API:

```bash
curl -H "Authorization: Bearer pk_live_xxxx" https://your-host/api/papers?pageSize=1
```

Los endpoints públicos (no autenticados) — como listar artículos, búsqueda,
categorías, autores y health — funcionan para llamadores anónimos, cookies de sesión,
y claves de API por igual.

## Auth

- `POST /api/auth/register` — registrarse `{username, email, displayName, password}`
- `POST /api/auth/login` — iniciar sesión `{identifier, password}`
- `POST /api/auth/logout` — cerrar sesión
- `GET /api/auth/me` — usuario actual

## Claves de API

- `GET /api/settings/api-keys` — listar sus claves
- `POST /api/settings/api-keys` — crear una clave `{name, scopes?:["read"|"write"], environment?:"live"|"test", expiresAt?:ISODate|null}`
- `DELETE /api/settings/api-keys?id=<keyId>` — revocar una clave

## Artículos

- `GET /api/papers` — listar. Parámetros de consulta: `q` (texto completo o con prefijo `title:`/`au:`/`abs:`/`cat:`), `category`, `tag`, `sort` (`new` | `updated` | `by_citations`), `from` (fecha ISO, solo artículos creados en/después), `page`, `pageSize`. Las filas incluyen un `citationCount` resuelto.
- `GET /api/papers/:id` — detalle (incluye `submitter`, `tags`, `commentCount`)
- `GET /api/papers/:id/comments` — comentarios
- `GET /api/papers/:id/citations` — grafo de citas `{ outgoing, incoming }`
- `GET /api/papers/:id/tags` — etiquetas de un artículo
- `POST /api/papers` — enviar (requiere auth, necesita `paper:publish`); acepta JSON o multipart (meta + archivo `pdf` opcional)
- `POST /api/papers/:id/moderate` — moderar `{action:"approve"|"reject"|"withdraw", reason?}` (necesita `paper:moderate`)
- `POST /api/papers/:id/citations` — añadir una cita `{targetArxivId?|targetDoi?|targetTitle?}` (propietario/moderador/admin)
- `POST /api/papers/:id/tags` / `DELETE /api/papers/:id/tags` — adjuntar/separar una etiqueta `{tagId|name}` (propietario/moderador/admin; crea la etiqueta si el nombre es nuevo)
- `POST /api/submit/archive` — subir un `tar.gz` de paquete fuente para auto-ingerir, enlazar citas y construir PDF (requiere auth; ver [Guía de envío](/en/guide/submission))

## Categorías

- `GET /api/categories` — árbol de categorías

## Etiquetas

- `GET /api/tags` — todas las etiquetas con conteos de uso (ordenadas por popularidad)
- `POST /api/tags` — crear una etiqueta `{name}` (requiere auth; idempotente por nombre)

## Suscripciones

- `GET /api/subscriptions` — listar mis suscripciones, **enriquecidas** (nombres de categoría/autor/artículo resueltos en `title` + un `href` de enlace profundo)
- `POST /api/subscriptions` — suscribir / desuscribir (alternar) `{type:"category"|"author"|"paper", refId}`
- `DELETE /api/subscriptions` — desuscribir `{type, refId}`

## Feed y notificaciones

Los anuncios se generan cuando un artículo entra en una de sus suscripciones (nuevo-en-categoría, nuevo-de-autor), cuando alguien responde a su comentario, o por una difusión de admin.

- `GET /api/feed` — anuncios del usuario actual (`?markRead=1` también los marca todos como leídos)
- `POST /api/feed` — marcar un anuncio individual como leído `{id}`

La campana del encabezado (`FeedBell`) muestra un distintivo de no leídos en vivo mantenido sincronizado mediante un store de Zustand, así leer en cualquier lugar actualiza el distintivo de inmediato.

## Marcadores

- `GET /api/bookmarks` — listar mis marcadores (cada uno resuelto a su título de artículo y `groupName`); pase `?paperId=` para obtener en su lugar `{ bookmarked: boolean }` para un solo artículo
- `POST /api/bookmarks` — alternar un marcador `{paperId, group?}` (devuelve `{ bookmarked: true|false }`)
- `PATCH /api/bookmarks/:paperId` — mover un marcador a un grupo `{group}` (null lo limpia)
- `DELETE /api/bookmarks` — eliminar un marcador `{paperId}`

## Mensajes

Los mensajes se clasifican por `kind` en 8 categorías: `system`, `ticket_reply`, `announcement`, `review_result`, `co_review_request`, `co_review_result`, `admin_message`, `community_reply`.

- `GET /api/messages` — mensajes del usuario actual + conteo de no leídos (admite filtro `?kind=`)
- `GET /api/messages/stats` — estadísticas de no leídos
- `POST /api/messages/:id/read` — marcar como leído
- `POST /api/messages` — `{action:"read-all"}` marca todos como leídos

## Tickets

- `GET /api/tickets` — mis tickets (`?scope=all` solo admin)
- `POST /api/tickets` — crear `{subject, type, priority, message}`
- `GET /api/tickets/:id` — detalle
- `POST /api/tickets/:id` — responder
- `PATCH /api/tickets/:id` — admin actualiza estado/prioridad

## Comentarios

- `POST /api/feedback` — enviar comentarios (requiere auth, crea automáticamente un ticket)

## Co-revisión

- `GET /api/co-reviews?scope=mine|all` — listar (mías / todas, requiere permiso respectivo)
- `POST /api/co-reviews` — asignar `{paperId, reviewerId, note?}` (necesita `co_review:assign`)
- `GET /api/co-reviews/:id` — detalle
- `POST /api/co-reviews/:id/respond` — revisor responde `{accepted:boolean}`
- `POST /api/co-reviews/:id/submit` — enviar opinión `{decision:"approve"|"reject"|"revise", comment}`

## Admin

Los endpoints de admin requieren un rol base `moderator` / `admin` y se autorizan por permiso detallado.

- `GET /api/admin/users` — lista de usuarios (paginación / búsqueda, necesita `user:manage`)
- `PATCH /api/admin/users/:id` — definir roles `{roleKeys:string[]}` o anulación `{permission:{key:string, grant:boolean|null}}` (necesita `user:manage` / `permission:manage`)
- `GET /api/admin/roles` — lista de roles (necesita `role:manage`)
- `PUT /api/admin/roles/:id` — definir permisos de rol `{permissionKeys:string[]}`
- `POST /api/admin/messages` — difusión `{scope:"all"|"role"|"userIds", role?, userIds?, kind:"announcement"|"system"|"admin_message", title, body, link?}` (necesita `message:broadcast`)
- `GET /api/admin/stats` — estadísticas de la plataforma
