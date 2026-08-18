# API

Papex espone un insieme di API HTTP JSON sotto `/api`.

## Riferimento interattivo

Una specifica **OpenAPI 3.1** completa e leggibile dal computer è servita su
[`/api/openapi.json`](/api/openapi.json), e un explorer interattivo, capace di Try-it,
(alimentato da [Scalar](https://scalar.com)) è disponibile su
**[/api-docs](/api-docs)**. Aprilo per sfogliare ogni endpoint, ispezionare schemi di
richiesta e risposta, e inviare richieste live dal tuo browser.

## Mantenere i docs sincronizzati (code-first)

Il documento OpenAPI è **generato dal codice**, non scritto a mano. Ogni
route possiede un frammento fratello `route.openapi.ts` che è la singola fonte di
verità per la documentazione di quell'endpoint. La parte statica (info, `components/schemas`,
`components/responses`, security) risiede in `src/lib/openapi/base.ts`.

Il generatore (`src/lib/openapi/generate.ts`) scansiona ogni frammento, li unisce nella base,
e scrive `src/lib/openapi/spec.generated.ts` — il file servito da `/api/openapi.json`.

```bash
# rigenera dopo aver modificato un frammento (/api/openapi.json + /api-docs aggiornati)
npm run openapi:generate
```

Questo è collegato in `predev` e `prebuild`, così la specifica è sempre ricostruita prima
di `next dev` / `next build`. **Non modificare mai `spec.generated.ts` a mano** — viene
sovrascritto a ogni esecuzione.

### Documentare un nuovo endpoint

Quando aggiungi un handler di route `src/app/api/foo/bar/route.ts`, crea un fratello
`route.openapi.ts`:

```ts
export default {
  "/api/foo/bar": {
    get: {
      tags: ["Discovery"],
      summary: "Describe what it does",
      // security: []            // ometti per gli endpoint pubblici
      responses: {
        200: { description: "OK", content: { "application/json": { schema: { type: "object" } } } },
      },
    },
  },
} as const;
```

Esegui `npm run openapi:generate` (o semplicemente avvia/costruisci) e l'endpoint appare in
`/api/openapi.json` e `/api-docs` automaticamente. Gli schemi condivisi risiedono in
`src/lib/openapi/base.ts` (es. `#/components/schemas/PaperListItem`).

## Autenticazione

Ci sono due modi per autenticarsi:

1. **Cookie di sessione** (`papex_session`) — emesso al login e usato dal
   browser. Inviato automaticamente per le richieste same-origin.
2. **Chiave API** (`Authorization: Bearer pk_…`) — per script e
   integrazioni di terze parti. Crea le chiavi da **Impostazioni → Chiavi API**
   (`/settings/api-keys`). Una chiave è associata al tuo account ed eredita i
   permessi RBAC del tuo ruolo, così ogni endpoint che funziona con un cookie di sessione
   funziona anche con una chiave API. Il segreto grezzo è mostrato **solo una volta**
   alla creazione; ne è memorizzato solo l'hash SHA-256.

Esempio di richiesta con una chiave API:

```bash
curl -H "Authorization: Bearer pk_live_xxxx" https://your-host/api/papers?pageSize=1
```

Gli endpoint pubblici (non autenticati) — come elencare articoli, ricerca,
categorie, autori e health — funzionano per chiamanti anonimi, cookie di sessione,
e chiavi API allo stesso modo.

## Auth

- `POST /api/auth/register` — registra `{username, email, displayName, password}`
- `POST /api/auth/login` — login `{identifier, password}`
- `POST /api/auth/logout` — logout
- `GET /api/auth/me` — utente corrente

## Chiavi API

- `GET /api/settings/api-keys` — elenca le tue chiavi
- `POST /api/settings/api-keys` — crea una chiave `{name, scopes?:["read"|"write"], environment?:"live"|"test", expiresAt?:ISODate|null}`
- `DELETE /api/settings/api-keys?id=<keyId>` — revoca una chiave

## Articoli

- `GET /api/papers` — elenco. Parametri query: `q` (full-text o prefissi `title:`/`au:`/`abs:`/`cat:`), `category`, `tag`, `sort` (`new` | `updated` | `by_citations`), `from` (data ISO, solo articoli creati il/ dopo), `page`, `pageSize`. Le righe includono un `citationCount` risolto.
- `GET /api/papers/:id` — dettaglio (inclusi `submitter`, `tags`, `commentCount`)
- `GET /api/papers/:id/comments` — commenti
- `GET /api/papers/:id/citations` — grafo delle citazioni `{ outgoing, incoming }`
- `GET /api/papers/:id/tags` — tag di un articolo
- `POST /api/papers` — invia (auth richiesta, necessita di `paper:publish`); accetta JSON o multipart (meta + file `pdf` opzionale)
- `POST /api/papers/:id/moderate` — modera `{action:"approve"|"reject"|"withdraw", reason?}` (necessita di `paper:moderate`)
- `POST /api/papers/:id/citations` — aggiungi una citazione `{targetArxivId?|targetDoi?|targetTitle?}` (owner/moderator/admin)
- `POST /api/papers/:id/tags` / `DELETE /api/papers/:id/tags` — collega/stacca un tag `{tagId|name}` (owner/moderator/admin; crea il tag se il nome è nuovo)
- `POST /api/submit/archive` — carica un `tar.gz` di pacchetto sorgente per auto-ingerire, collegare le citazioni e compilare il PDF (auth richiesta; vedi [Guida all'invio](/en/guide/submission))

## Categorie

- `GET /api/categories` — albero delle categorie

## Tag

- `GET /api/tags` — tutti i tag con conteggi d'uso (ordinati per popolarità)
- `POST /api/tags` — crea un tag `{name}` (auth richiesta; idempotente per nome)

## Sottoscrizioni

- `GET /api/subscriptions` — elenca le mie sottoscrizioni, **arricchite** (nomi categoria/autore/articolo risolti in `title` + un deep link `href`)
- `POST /api/subscriptions` — sottoscrivi / annulla sottoscrizione (toggle) `{type:"category"|"author"|"paper", refId}`
- `DELETE /api/subscriptions` — annulla sottoscrizione `{type, refId}`

## Feed e notifiche

Gli annunci sono generati quando un articolo entra in una delle tue sottoscrizioni (nuovo-in-categoria, nuovo-da-autore), quando qualcuno risponde al tuo commento, o tramite un broadcast admin.

- `GET /api/feed` — annunci dell'utente corrente (`?markRead=1` li marca anche tutti come letti)
- `POST /api/feed` — marca un singolo annuncio come letto `{id}`

La campana nell'intestazione (`FeedBell`) mostra un badge di non letti in tempo reale mantenuto sincronizzato tramite uno store Zustand, così leggere ovunque aggiorna il badge immediatamente.

## Segnalibri

- `GET /api/bookmarks` — elenca i miei segnalibri (ciascuno risolto al titolo dell'articolo e `groupName`); passa `?paperId=` per ottenere invece `{ bookmarked: boolean }` per un singolo articolo
- `POST /api/bookmarks` — attiva/disattiva un segnalibro `{paperId, group?}` (restituisce `{ bookmarked: true|false }`)
- `PATCH /api/bookmarks/:paperId` — sposta un segnalibro in un gruppo `{group}` (null lo cancella)
- `DELETE /api/bookmarks` — rimuovi un segnalibro `{paperId}`

## Messaggi

I messaggi sono classificati per `kind` in 8 categorie: `system`, `ticket_reply`, `announcement`, `review_result`, `co_review_request`, `co_review_result`, `admin_message`, `community_reply`.

- `GET /api/messages` — messaggi dell'utente corrente + conteggio non letti (supporta filtro `?kind=`)
- `GET /api/messages/stats` — statistiche non letti
- `POST /api/messages/:id/read` — marca come letto
- `POST /api/messages` — `{action:"read-all"}` marca tutti come letti

## Ticket

- `GET /api/tickets` — i miei ticket (`?scope=all` solo admin)
- `POST /api/tickets` — crea `{subject, type, priority, message}`
- `GET /api/tickets/:id` — dettaglio
- `POST /api/tickets/:id` — rispondi
- `PATCH /api/tickets/:id` — admin aggiorna stato/priorità

## Feedback

- `POST /api/feedback` — invia feedback (auth richiesta, crea automaticamente un ticket)

## Co-review

- `GET /api/co-reviews?scope=mine|all` — elenco (miei / tutti, permesso rispettivo richiesto)
- `POST /api/co-reviews` — assegna `{paperId, reviewerId, note?}` (necessita di `co_review:assign`)
- `GET /api/co-reviews/:id` — dettaglio
- `POST /api/co-reviews/:id/respond` — il revisore risponde `{accepted:boolean}`
- `POST /api/co-reviews/:id/submit` — invia parere `{decision:"approve"|"reject"|"revise", comment}`

## Admin

Gli endpoint admin richiedono un ruolo base `moderator` / `admin` e sono autorizzati per permesso granulare.

- `GET /api/admin/users` — elenco utenti (paginazione / ricerca, necessita di `user:manage`)
- `PATCH /api/admin/users/:id` — imposta ruoli `{roleKeys:string[]}` o override `{permission:{key:string, grant:boolean|null}}` (necessita di `user:manage` / `permission:manage`)
- `GET /api/admin/roles` — elenco ruoli (necessita di `role:manage`)
- `PUT /api/admin/roles/:id` — imposta permessi ruolo `{permissionKeys:string[]}`
- `POST /api/admin/messages` — broadcast `{scope:"all"|"role"|"userIds", role?, userIds?, kind:"announcement"|"system"|"admin_message", title, body, link?}` (necessita di `message:broadcast`)
- `GET /api/admin/stats` — statistiche piattaforma
