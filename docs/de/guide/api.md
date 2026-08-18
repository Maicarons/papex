# API

Papex stellt eine Reihe von JSON-HTTP-APIs unter `/api` bereit.

## Interaktive Referenz

Eine vollständige, maschinenlesbare **OpenAPI-3.1**-Spezifikation wird unter
[`/api/openapi.json`](/api/openapi.json) ausgeliefert, und ein interaktiver, ausprobierbarer
Explorer (betrieben von [Scalar](https://scalar.com)) ist unter
**[/api-docs](/api-docs)** verfügbar. Öffne ihn, um jeden Endpunkt zu durchsuchen, Request-
und Response-Schemas zu inspizieren und live Requests aus deinem Browser zu senden.

## Die Docs synchron halten (code-first)

Das OpenAPI-Dokument wird **aus dem Code generiert**, nicht von Hand geschrieben. Jede
Route besitzt ein Schwester-Fragment `route.openapi.ts`, das die alleinige Quelle der
Wahrheit für die Docs dieses Endpunkts ist. Der statische Teil (info, `components/schemas`,
`components/responses`, security) liegt in `src/lib/openapi/base.ts`.

Der Generator (`src/lib/openapi/generate.ts`) scannt jedes Fragment, führt sie mit der Basis
zusammen und schreibt `src/lib/openapi/spec.generated.ts` — die Datei, die von `/api/openapi.json` ausgeliefert wird.

```bash
# neu generieren nach Bearbeitung eines Fragments (/api/openapi.json + /api-docs aktualisieren)
npm run openapi:generate
```

Dies ist in `predev` und `prebuild` verdrahtet, sodass die Spezifikation immer neu gebaut wird vor
`next dev` / `next build`. **Bearbeite `spec.generated.ts` nie von Hand** — es wird bei jeder Ausführung überschrieben.

### Einen neuen Endpunkt dokumentieren

Wenn du einen Route-Handler `src/app/api/foo/bar/route.ts` hinzufügst, erstelle ein Schwester-
`route.openapi.ts`:

```ts
export default {
  "/api/foo/bar": {
    get: {
      tags: ["Discovery"],
      summary: "Describe what it does",
      // security: []            // für öffentliche Endpunkte weglassen
      responses: {
        200: { description: "OK", content: { "application/json": { schema: { type: "object" } } } },
      },
    },
  },
} as const;
```

Führe `npm run openapi:generate` aus (oder starte/build einfach), und der Endpunkt erscheint in
`/api/openapi.json` und `/api-docs` automatisch. Geteilte Schemas liegen in
`src/lib/openapi/base.ts` (z. B. `#/components/schemas/PaperListItem`).

## Authentifizierung

Es gibt zwei Möglichkeiten, sich zu authentifizieren:

1. **Session-Cookie** (`papex_session`) — bei Login ausgestellt und vom
   Browser genutzt. Für same-origin-Requests automatisch gesendet.
2. **API-Key** (`Authorization: Bearer pk_…`) — für Skripte und Drittanbieter-
   Integrationen. Keys unter **Einstellungen → API-Keys**
   (`/settings/api-keys`) erstellen. Ein Key ist an dein Konto gebunden und erbt die
   RBAC deiner Rolle, sodass jeder Endpunkt, der mit einem Session-Cookie funktioniert,
   auch mit einem API-Key funktioniert. Das rohe Secret wird **nur einmal** bei
   der Erstellung angezeigt; nur sein SHA-256-Hash wird gespeichert.

Beispiel-Request mit einem API-Key:

```bash
curl -H "Authorization: Bearer pk_live_xxxx" https://your-host/api/papers?pageSize=1
```

Öffentliche (nicht authentifizierte) Endpunkte — wie das Auflisten von Papers, Suche,
Kategorien, Autoren und Health — funktionieren für anonyme Aufrufer, Session-Cookies
und API-Keys gleichermaßen.

## Auth

- `POST /api/auth/register` — registrieren `{username, email, displayName, password}`
- `POST /api/auth/login` — login `{identifier, password}`
- `POST /api/auth/logout` — logout
- `GET /api/auth/me` — aktueller Benutzer

## API-Keys

- `GET /api/settings/api-keys` — deine Keys auflisten
- `POST /api/settings/api-keys` — einen Key erstellen `{name, scopes?:["read"|"write"], environment?:"live"|"test", expiresAt?:ISODate|null}`
- `DELETE /api/settings/api-keys?id=<keyId>` — einen Key widerrufen

## Papers

- `GET /api/papers` — Liste. Query-Params: `q` (Volltext oder `title:`/`au:`/`abs:`/`cat:`-präfixiert), `category`, `tag`, `sort` (`new` | `updated` | `by_citations`), `from` (ISO-Datum, nur Papers ab diesem erstellt), `page`, `pageSize`. Zeilen enthalten einen aufgelösten `citationCount`.
- `GET /api/papers/:id` — Detail (enthält `submitter`, `tags`, `commentCount`)
- `GET /api/papers/:id/comments` — Kommentare
- `GET /api/papers/:id/citations` — Zitationsgraph `{ outgoing, incoming }`
- `GET /api/papers/:id/tags` — Tags eines Papers
- `POST /api/papers` — einreichen (Auth erforderlich, benötigt `paper:publish`); nimmt JSON oder multipart (meta + optionale `pdf`-Datei) an
- `POST /api/papers/:id/moderate` — moderieren `{action:"approve"|"reject"|"withdraw", reason?}` (benötigt `paper:moderate`)
- `POST /api/papers/:id/citations` — eine Zitation hinzufügen `{targetArxivId?|targetDoi?|targetTitle?}` (Eigentümer/Moderator/Admin)
- `POST /api/papers/:id/tags` / `DELETE /api/papers/:id/tags` — einen Tag anhängen/abtrennen `{tagId|name}` (Eigentümer/Moderator/Admin; erstellt den Tag, falls der Name neu ist)
- `POST /api/submit/archive` — ein Quellpaket-`tar.gz` hochladen, um automatisch zu ingestieren, Zitationen zu verknüpfen und das PDF zu bauen (Auth erforderlich; siehe [Einreichungshandbuch](/en/guide/submission))

## Kategorien

- `GET /api/categories` — Kategoriebaum

## Tags

- `GET /api/tags` — alle Tags mit Nutzungszählern (nach Beliebtheit geordnet)
- `POST /api/tags` — einen Tag erstellen `{name}` (Auth erforderlich; idempotent nach Name)

## Abonnements

- `GET /api/subscriptions` — meine Abonnements auflisten, **angereichert** (Kategorie-/Autor-/Paper-Namen aufgelöst in `title` + einen `href`-Deep-Link)
- `POST /api/subscriptions` — abonnieren / abbestellen (Umschalter) `{type:"category"|"author"|"paper", refId}`
- `DELETE /api/subscriptions` — abbestellen `{type, refId}`

## Feed & Benachrichtigungen

Ankündigungen werden erzeugt, wenn ein Paper in eine deiner Abonnements gelangt (neu in Kategorie, neu vom Autor), wenn jemand auf deinen Kommentar antwortet, oder durch einen Admin-Broadcast.

- `GET /api/feed` — Ankündigungen des aktuellen Benutzers (`?markRead=1` markiert sie alle als gelesen)
- `POST /api/feed` — eine einzelne Ankündigung als gelesen markieren `{id}`

Die Kopf-Glocke (`FeedBell`) zeigt ein Live-Badge für Ungelesenes, das über einen Zustand-Store synchron gehalten wird, sodass das Lesen an einer beliebigen Stelle das Badge sofort aktualisiert.

## Lesezeichen

- `GET /api/bookmarks` — meine Lesezeichen auflisten (jeweils aufgelöst auf dessen Paper-Titel und `groupName`); mit `?paperId=` stattdessen `{ bookmarked: boolean }` für ein einzelnes Paper erhalten
- `POST /api/bookmarks` — ein Lesezeichen umschalten `{paperId, group?}` (gibt `{ bookmarked: true|false }` zurück)
- `PATCH /api/bookmarks/:paperId` — ein Lesezeichen in eine Gruppe verschieben `{group}` (null löscht es)
- `DELETE /api/bookmarks` — ein Lesezeichen entfernen `{paperId}`

## Nachrichten

Nachrichten werden nach `kind` in 8 Kategorien klassifiziert: `system`, `ticket_reply`, `announcement`, `review_result`, `co_review_request`, `co_review_result`, `admin_message`, `community_reply`.

- `GET /api/messages` — Nachrichten des aktuellen Benutzers + Ungelesen-Zähler (unterstützt `?kind=`-Filter)
- `GET /api/messages/stats` — Ungelesen-Statistik
- `POST /api/messages/:id/read` — als gelesen markieren
- `POST /api/messages` — `{action:"read-all"}` alle als gelesen markieren

## Tickets

- `GET /api/tickets` — meine Tickets (`?scope=all` nur Admin)
- `POST /api/tickets` — erstellen `{subject, type, priority, message}`
- `GET /api/tickets/:id` — Detail
- `POST /api/tickets/:id` — antworten
- `PATCH /api/tickets/:id` — Admin-Status/Priorität aktualisieren

## Feedback

- `POST /api/feedback` — Feedback einreichen (Auth erforderlich, erstellt automatisch ein Ticket)

## Co-Review

- `GET /api/co-reviews?scope=mine|all` — Liste (meine / alle, jeweilige Berechtigung erforderlich)
- `POST /api/co-reviews` — zuweisen `{paperId, reviewerId, note?}` (benötigt `co_review:assign`)
- `GET /api/co-reviews/:id` — Detail
- `POST /api/co-reviews/:id/respond` — Reviewer antwortet `{accepted:boolean}`
- `POST /api/co-reviews/:id/submit` — Stellungnahme einreichen `{decision:"approve"|"reject"|"revise", comment}`

## Admin

Admin-Endpunkte benötigen eine `moderator` / `admin`-Basisrolle und werden pro feingranularer Berechtigung autorisiert.

- `GET /api/admin/users` — Benutzerliste (Pagination / Suche, benötigt `user:manage`)
- `PATCH /api/admin/users/:id` — Rollen setzen `{roleKeys:string[]}` oder Override `{permission:{key:string, grant:boolean|null}}` (benötigt `user:manage` / `permission:manage`)
- `GET /api/admin/roles` — Rollenliste (benötigt `role:manage`)
- `PUT /api/admin/roles/:id` — Rollenberechtigungen setzen `{permissionKeys:string[]}`
- `POST /api/admin/messages` — Broadcast `{scope:"all"|"role"|"userIds", role?, userIds?, kind:"announcement"|"system"|"admin_message", title, body, link?}` (benötigt `message:broadcast`)
- `GET /api/admin/stats` — Plattform-Statistiken
