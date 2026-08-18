# Administración y permisos

Además del envío y la búsqueda centrales, Papex incluye un **área de administración** orientada a operadores y un **sistema de permisos detallado**. Esta guía cubre cuatro capacidades:

1. **Roles y permisos (RBAC)** — controlar la publicación, visualización, descarga y comentado de artículos por rol o por usuario.
2. **Gestión de permisos de usuario** — asignar roles extra y definir anulaciones por usuario de permitir / denegar para cualquier permiso.
3. **Co-revisión (revisión por pares)** — los admins envían solicitudes de co-revisión; los revisores aceptan, envían opiniones y reciben acuses de recibo, formando un bucle cerrado.
4. **Mensajes categorizados y difusión** — un centro de notificaciones unificado que abarca avisos del sistema, resultados de revisión, acuses de tickets, solicitudes de co-revisión, DM de admin y respuestas de la comunidad, además de difusiones dirigidas.

---

## 1. Roles y permisos (RBAC)

Papex usa un modelo de tres capas — **rol base + roles asignados + anulaciones por usuario** — que soporta tanto la autorización masiva por rol como las restricciones personalizadas por usuario.

### 1.1 Modelo de permisos

| Capa | Descripción | Mantenido en |
| --- | --- | --- |
| Rol base | El rol inherente a cada usuario en `users.role`: `author` / `moderator` / `admin` | `author` por defecto al registrarse |
| Roles asignados | Roles extra superpuestos a un usuario vía la tabla de unión `user_roles` | Página de gestión de usuarios |
| Anulaciones por usuario | *Permitir* o *denegar* explícitos para un solo permiso en un usuario; máxima prioridad | Página de gestión de usuarios |

> ℹ️ `reader` es un rol RBAC **asignado** (en la tabla `roles`), no un rol base de base de datos (`users.role` solo permite `author` / `moderator` / `admin`). El rol base define el límite de inicio de sesión y permiso por defecto; los roles asignados se apilan encima.

### 1.2 Catálogo de permisos

El sistema incluye **15 permisos** en **6 grupos**:

| Grupo | Clave de permiso | Nombre | Descripción |
| --- | --- | --- | --- |
| paper | `paper:publish` | Publicar artículo | Enviar un artículo o versión nuevos |
| | `paper:view` | Ver artículo | Explorar artículos publicados |
| | `paper:download` | Descargar artículo | Descargar PDF / paquete fuente |
| | `paper:moderate` | Moderar artículo | Aprobar / rechazar / retirar |
| comment | `comment:create` | Publicar comentario | Comentar y responder bajo artículos |
| | `comment:view` | Ver comentarios | Explorar la sección de comentarios |
| ticket | `ticket:create` | Crear ticket | Abrir comentario / ticket |
| | `ticket:manage` | Gestionar tickets | Responder / manejar tickets |
| co_review | `co_review:assign` | Asignar co-revisión | Enviar una solicitud de co-revisión |
| | `co_review:respond` | Tomar co-revisión | Aceptar / declinar una solicitud |
| | `co_review:manage` | Gestionar co-revisión | Ver todo el progreso de co-revisión |
| message | `message:broadcast` | Difusión | Enviar mensajes a usuarios |
| admin | `user:manage` | Gestionar usuarios | Ver / editar usuarios |
| | `role:manage` | Gestionar roles | Configurar roles y permisos |
| | `permission:manage` | Gestionar anulaciones | Permitir / denegar por usuario |

### 1.3 Permisos por defecto de rol

El seed (`db:seed`) escribe un mapeo de permisos por defecto para cada rol del sistema:

| Rol | Cantidad | Permisos |
| --- | --- | --- |
| `admin` | 15 | Todos los permisos |
| `moderator` | 12 | ver/descargar/moderar artículo, crear/ver comentario, crear/gestionar ticket, asignar/responder/gestionar co-revisión, difusión, gestionar usuarios |
| `author` | 6 | publicar/ver/descargar artículo, crear/ver comentario, crear ticket |
| `reader` | 3 | ver/descargar artículo, ver comentario |

### 1.4 Orden de resolución

Cuando se ejecuta una operación protegida, los permisos efectivos se resuelven así:

```
permisos del rol base
  ∪ permisos de roles asignados      (unión de roles)
  ∪ anulaciones por usuario marcadas permitir
  − anulaciones por usuario marcadas denegar  (ganan las anulaciones)
```

Así, aunque ni el rol base ni los asignados concedan `paper:publish`, una anulación *permitir* explícita aún lo permite; a la inversa, un *denegar* explícito lo bloquea aunque los roles lo concedan.

> Respaldo: si las tablas `roles` / `permissions` aún no tienen seed (p. ej. una BD nueva sin `db:seed`), el motor recurre al mapeo constante por defecto de arriba para evitar bloquear todo el sitio. Ejecutar `db:seed` tras el despliegue sigue recomendándose.

### 1.5 Operaciones protegidas (pasarelas)

Las operaciones clave están protegidas; la falta de permiso devuelve `403`:

- `POST /api/papers` — requiere `paper:publish`
- `POST /api/papers/:id/comments` — requiere `comment:create`
- La moderación, gestión de tickets, asignación / gestión de co-revisión, edición de usuarios y roles, difusión, etc. requieren sus permisos respectivos, y las rutas están protegidas por `middleware` (solo `moderator` / `admin` pueden entrar en `/admin`).

---

## 2. Gestión de permisos de usuario

Abra **`/admin/users`** (requiere `user:manage`):

- **Buscar usuarios** por nombre de usuario / correo / nombre para mostrar, con paginación.
- **Asignar roles extra**: marque roles del sistema (`admin` / `moderator` / `author` / `reader`) en el editor de usuario para apilar sobre el rol base.
- **Anulación de permiso de tres estados**: para cada uno de los 15 permisos defina:
  - **heredar** (por defecto) — siga el resultado de la unión de roles;
  - **permitir** — forzar la concesión aunque los roles lo omitan;
  - **denegar** — forzar el bloqueo aunque los roles lo incluyan.

Todos los cambios se guardan al instante vía `PATCH /api/admin/users/:id` y se aplican a las comprobaciones de autorización posteriores de ese usuario.

---

## 3. Co-revisión (revisión por pares)

La co-revisión es un bucle completo de revisión por pares que conecta **admin → revisor → autor**.

### 3.1 Bucle cerrado

```
Admin asigna ──► El revisor recibe un mensaje "solicitud de co-revisión"
     │
     ▼
Revisor responde (aceptar / declinar)
     │ aceptar
     ▼
Revisor envía opinión (aprobar / rechazar / revisar + comentario)
     │
     ▼
Acuse del sistema ──► notifica al asignador "opinión enviada"
                ──► notifica al autor "co-revisión completada" (si autor ≠ asignador)
```

### 3.2 Máquina de estados

Un registro de co-revisión (`co_reviews`) transiciona así:

| Estado | Significado | Entrado por |
| --- | --- | --- |
| `pending` | Esperando respuesta del revisor | Asignación del admin (`POST /api/co-reviews`) |
| `accepted` | Aceptado | Revisor acepta (`POST /api/co-reviews/:id/respond` `{accepted:true}`) |
| `declined` | Declinado | Revisor declina (`respond` `{accepted:false}`) |
| `completed` | Completado | Revisor envía opinión (`submit`) |
| `expired` | Expirado | (estado reservado para cierre por timeout) |

> Un revisor solo puede responder mientras está `pending`, y solo puede enviar una opinión mientras está `accepted`. Un estado no coincidente devuelve `INVALID_STATE`.

### 3.3 Puntos de entrada y notificaciones

- **Admin**: `/admin/co-reviews` para asignar y monitorizar todas las co-revisiones; `/admin/co-reviews/:id` para el detalle. La asignación elige entre artículos en estado `submitted`.
- **Revisor**: `/co-reviews` (mis revisiones) y `/co-reviews/:id` (aceptar / declinar + enviar opinión).
- **Notificaciones unificadas**: cada cambio de estado dispara un mensaje `co_review_request` / `co_review_result` a las partes relevantes (ver Sección 4).

---

## 4. Mensajes categorizados y difusión

### 4.1 Categorías de mensajes

Los mensajes se clasifican por `kind` en **8 categorías**, coloreadas y agrupadas en la bandeja:

| kind | Etiqueta | Tono | Fuente típica |
| --- | --- | --- | --- |
| `system` | Aviso del sistema | por defecto | Eventos del sistema |
| `ticket_reply` | Acuse de ticket | azul info | Ticket respondido |
| `announcement` | Anuncio | amarillo aviso | Difusión de admin |
| `review_result` | Resultado de revisión | verde éxito | Artículo aprobado / rechazado |
| `co_review_request` | Solicitud de co-revisión | púrpura | Co-revisión asignada |
| `co_review_result` | Acuse de co-revisión | púrpura | Respuesta / opinión enviada |
| `admin_message` | DM de admin | rojo peligro | Mensaje directo dirigido |
| `community_reply` | Respuesta de comunidad | azul info | Comentario respondido |

La bandeja (`/messages`) admite filtrar por categoría (`GET /api/messages?kind=...`); al hacer clic en un mensaje se navega a su `link` asociado (artículo, ticket, co-revisión, …).

### 4.2 Embudo de notificación unificado

Todas las alertas entre módulos se emiten a través de un único servicio `notifications` para que los módulos de revisión, ticket, co-revisión y comunidad compartan un contrato de notificación:

- **Revisión**: decisión de artículo → notificar al autor (`review_result`).
- **Tickets**: respuesta de personal → notificar al reportador (`ticket_reply`).
- **Co-revisión**: asignar / responder / enviar → notificar a revisor, asignador, autor (`co_review_request` / `co_review_result`).
- **Comunidad**: comentario respondido → notificar al autor del comentario padre (`community_reply`).

### 4.3 Difusión

Abra **`/admin/messages`** (requiere `message:broadcast`):

- **Alcance**:
  - `all` — cada usuario;
  - `role` — un rol base (`author` / `moderator` / `admin`);
  - `userIds` — una lista de IDs de usuario específicos.
- **Kind**: `announcement` / `system` / `admin_message`.
- Rellene título, cuerpo (con `link` opcional), envíe, y el mensaje se escribe en masa a la audiencia objetivo; se devuelve el conteo de éxitos.

---

## 5. Navegación de administración

Los puntos de entrada de administración están en el menú del usuario con sesión y en el resumen `/admin`, incluyendo:

| Módulo | Ruta | Descripción |
| --- | --- | --- |
| Resumen | `/admin` | Tarjetas de estadísticas + atajos de módulo |
| Cola de revisión | `/admin/review` | Aprobar / rechazar artículos (+ motivo) |
| Estadísticas | `/admin/stats` | Métricas de la plataforma |
| Tickets | `/admin/tickets` | Gestión de tickets |
| Co-revisión | `/admin/co-reviews` | Asignar y monitorizar co-revisiones |
| Usuarios | `/admin/users` | Roles y anulaciones de permisos |
| Roles | `/admin/roles` | Matriz de permisos por rol |
| Mensajes | `/admin/messages` | Difusión |

> Estas rutas están protegidas por `middleware`; solo usuarios con un rol base `moderator` o `admin` pueden acceder a ellas, y las acciones de escritura requieren además el permiso detallado correspondiente.

---

## 6. Operaciones: migrar y sembrar

Los cuatro sistemas dependen de la migración `0003_add_rbac_co_review_messages` (añade `roles` / `permissions` / `role_permissions` / `user_roles` / `user_permissions` / `co_reviews` / `moderation_logs`, y extiende `messages.kind` a 8 categorías). En el despliegue o la inicialización local ejecute:

```bash
npm run db:migrate   # aplicar migraciones (RBAC / co-revisión / categorías de mensajes)
npm run db:seed      # escribir 4 roles del sistema + 15 permisos + defectos (idempotente)
```

El seed de RBAC usa `onConflictDoNothing` y es seguro de re-ejecutar. Tras migrar + sembrar, el motor de permisos usa las tablas `roles` / `permissions`; antes del seed recurre a los defectos constantes (ver 1.4).

---

## 7. Referencia rápida de API

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/messages?kind=` | Bandeja, filtrar por categoría |
| `POST` | `/api/papers/:id/moderate` | Moderar `{action:"approve"\|"reject"\|"withdraw", reason?}` |
| `GET` | `/api/co-reviews?scope=mine\|all` | Lista de co-revisión (mías / todas) |
| `POST` | `/api/co-reviews` | Asignar `{paperId, reviewerId, note?}` |
| `GET` | `/api/co-reviews/:id` | Detalle de co-revisión |
| `POST` | `/api/co-reviews/:id/respond` | Responder `{accepted:boolean}` |
| `POST` | `/api/co-reviews/:id/submit` | Enviar `{decision:"approve"\|"reject"\|"revise", comment}` |
| `GET` | `/api/admin/users` | Lista de usuarios (paginación / búsqueda) |
| `PATCH` | `/api/admin/users/:id` | Definir roles `{roleKeys}` o anulación `{permission:{key,grant}}` |
| `GET` | `/api/admin/roles` | Lista de roles |
| `PUT` | `/api/admin/roles/:id` | Definir permisos de rol `{permissionKeys}` |
| `POST` | `/api/admin/messages` | Difusión `{scope, role?, userIds?, kind, title, body, link?}` |
| `GET` | `/api/admin/stats` | Estadísticas de la plataforma |

Vea la [referencia de API](/en/guide/api) para la lista completa.
