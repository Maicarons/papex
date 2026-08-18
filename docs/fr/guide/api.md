# API

Papex expose un ensemble d'API HTTP JSON sous `/api`.

## Référence interactive

Une spécification **OpenAPI 3.1** complète et lisible par machine est servie sur
[`/api/openapi.json`](/api/openapi.json), et un explorateur interactif capable d'essayer les appels (propulsé par [Scalar](https://scalar.com)) est disponible sur
**[/api-docs](/api-docs)**. Ouvrez-le pour parcourir chaque endpoint, inspecter les schémas de requête
et de réponse, et envoyer des requêtes en direct depuis votre navigateur.

## Garder les docs synchronisées (code-first)

Le document OpenAPI est **généré depuis le code**, et non écrit à la main. Chaque
route possède un fragment frère `route.openapi.ts` qui est la source unique de vérité pour la documentation de cet endpoint. La partie statique (info, `components/schemas`,
`components/responses`, security) réside dans `src/lib/openapi/base.ts`.

Le générateur (`src/lib/openapi/generate.ts`) analyse chaque fragment, les fusionne dans la base, et écrit `src/lib/openapi/spec.generated.ts` — le fichier servi par `/api/openapi.json`.

```bash
# regenerate after editing a fragment (/api/openapi.json + /api-docs update)
npm run openapi:generate
```

Ceci est câblé dans `predev` et `prebuild`, donc la spec est toujours reconstruite avant
`next dev` / `next build`. **N'éditez jamais `spec.generated.ts` à la main** — il est écrasé à chaque exécution.

### Documenter un nouvel endpoint

Lorsque vous ajoutez un gestionnaire de route `src/app/api/foo/bar/route.ts`, créez un frère `route.openapi.ts` :

```ts
export default {
  "/api/foo/bar": {
    get: {
      tags: ["Discovery"],
      summary: "Describe what it does",
      // security: []            // omit for public endpoints
      responses: {
        200: { description: "OK", content: { "application/json": { schema: { type: "object" } } } },
      },
    },
  },
} as const;
```

Exécutez `npm run openapi:generate` (ou lancez/construisez simplement) et l'endpoint apparaît dans
`/api/openapi.json` et `/api-docs` automatiquement. Les schémas partagés résident dans
`src/lib/openapi/base.ts` (ex. `#/components/schemas/PaperListItem`).

## Authentification

Il y a deux façons de s'authentifier :

1. **Cookie de session** (`papex_session`) — émis à la connexion et utilisé par le
   navigateur. Envoyé automatiquement pour les requêtes de même origine.
2. **Clé API** (`Authorization: Bearer pk_…`) — pour scripts et intégrations tierces. Créez des clés depuis **Paramètres → Clés API**
   (`/settings/api-keys`). Une clé est liée à votre compte et hérite des permissions RBAC de votre
   rôle, donc chaque endpoint fonctionnant avec un cookie de session fonctionne aussi avec une clé API. Le secret brut n'est affiché **qu'une seule fois** à la création ; seul son hash SHA-256 est stocké.

Exemple de requête avec une clé API :

```bash
curl -H "Authorization: Bearer pk_live_xxxx" https://your-host/api/papers?pageSize=1
```

Les endpoints publics (non authentifiés) — comme lister les articles, la recherche,
les catégories, les auteurs et la santé — fonctionnent pour les appelants anonymes, les cookies de session,
et les clés API indifféremment.

## Auth

- `POST /api/auth/register` — register `{username, email, displayName, password}`
- `POST /api/auth/login` — login `{identifier, password}`
- `POST /api/auth/logout` — logout
- `GET /api/auth/me` — current user

## Clés API

- `GET /api/settings/api-keys` — list your keys
- `POST /api/settings/api-keys` — create a key `{name, scopes?:["read"|"write"], environment?:"live"|"test", expiresAt?:ISODate|null}`
- `DELETE /api/settings/api-keys?id=<keyId>` — revoke a key

## Articles

- `GET /api/papers` — lister. Paramètres de requête : `q` (texte intégral ou préfixé par `title:`/`au:`/`abs:`/`cat:`), `category`, `tag`, `sort` (`new` | `updated` | `by_citations`), `from` (date ISO, uniquement articles créés à partir de), `page`, `pageSize`. Les lignes incluent un `citationCount` résolu.
- `GET /api/papers/:id` — détail (inclut `submitter`, `tags`, `commentCount`)
- `GET /api/papers/:id/comments` — commentaires
- `GET /api/papers/:id/citations` — graphe de citations `{ outgoing, incoming }`
- `GET /api/papers/:id/tags` — étiquettes d'un article
- `POST /api/papers` — soumettre (auth requise, nécessite `paper:publish`) ; accepte JSON ou multipart (meta + fichier `pdf` optionnel)
- `POST /api/papers/:id/moderate` — modérer `{action:"approve"|"reject"|"withdraw", reason?}` (nécessite `paper:moderate`)
- `POST /api/papers/:id/citations` — ajouter une citation `{targetArxivId?|targetDoi?|targetTitle?}` (propriétaire/modérateur/admin)
- `POST /api/papers/:id/tags` / `DELETE /api/papers/:id/tags` — attacher/détacher une étiquette `{tagId|name}` (propriétaire/modérateur/admin ; crée l'étiquette si le nom est nouveau)
- `POST /api/submit/archive` — envoyer un `tar.gz` de paquet source pour auto-ingérer, lier les citations et construire le PDF (auth requise ; voir [Guide de soumission](/en/guide/submission))

## Catégories

- `GET /api/categories` — arbre des catégories

## Étiquettes

- `GET /api/tags` — toutes les étiquettes avec compteurs d'usage (ordonnées par popularité)
- `POST /api/tags` — créer une étiquette `{name}` (auth requise ; idempotent par nom)

## Abonnements

- `GET /api/subscriptions` — lister mes abonnements, **enrichis** (noms catégorie/auteur/article résolus en `title` + un lien profond `href`)
- `POST /api/subscriptions` — s'abonner / se désabonner (bascule) `{type:"category"|"author"|"paper", refId}`
- `DELETE /api/subscriptions` — se désabonner `{type, refId}`

## Flux et notifications

Les annonces sont générées lorsqu'un article entre dans l'un de vos abonnements (nouveau-dans-catégorie, nouveau-d-auteur), lorsque quelqu'un répond à votre commentaire, ou par une diffusion admin.

- `GET /api/feed` — annonces de l'utilisateur courant (`?markRead=1` les marque aussi toutes lues)
- `POST /api/feed` — marquer une annonce lue `{id}`

La cloche d'en-tête (`FeedBell`) affiche un compteur de non-lus en direct gardé synchronisé via un store Zustand, donc lire n'importe où met à jour le compteur immédiatement.

## Signets

- `GET /api/bookmarks` — lister mes signets (chacun résolu vers le titre de l'article et `groupName`) ; passez `?paperId=` pour obtenir à la place `{ bookmarked: boolean }` pour un article unique
- `POST /api/bookmarks` — basculer un signet `{paperId, group?}` (renvoie `{ bookmarked: true|false }`)
- `PATCH /api/bookmarks/:paperId` — déplacer un signet dans un groupe `{group}` (null l'efface)
- `DELETE /api/bookmarks` — supprimer un signet `{paperId}`

## Messages

Les messages sont classés par `kind` en 8 catégories : `system`, `ticket_reply`, `announcement`, `review_result`, `co_review_request`, `co_review_result`, `admin_message`, `community_reply`.

- `GET /api/messages` — messages de l'utilisateur courant + compte de non-lus (supporte le filtre `?kind=`)
- `GET /api/messages/stats` — stats de non-lus
- `POST /api/messages/:id/read` — marquer lu
- `POST /api/messages` — `{action:"read-all"}` marquer tout lu

## Tickets

- `GET /api/tickets` — mes tickets (`?scope=all` admin uniquement)
- `POST /api/tickets` — créer `{subject, type, priority, message}`
- `GET /api/tickets/:id` — détail
- `POST /api/tickets/:id` — répondre
- `PATCH /api/tickets/:id` — admin met à jour statut/priorité

## Retours

- `POST /api/feedback` — soumettre un retour (auth requise, crée automatiquement un ticket)

## Co-revue

- `GET /api/co-reviews?scope=mine|all` — lister (miennes / toutes, permission respective requise)
- `POST /api/co-reviews` — assigner `{paperId, reviewerId, note?}` (nécessite `co_review:assign`)
- `GET /api/co-reviews/:id` — détail
- `POST /api/co-reviews/:id/respond` — le relecteur répond `{accepted:boolean}`
- `POST /api/co-reviews/:id/submit` — soumettre un avis `{decision:"approve"|"reject"|"revise", comment}`

## Admin

Les endpoints admin nécessitent un rôle de base `moderator` / `admin` et sont autorisés selon une permission granulaire.

- `GET /api/admin/users` — liste utilisateurs (pagination / recherche, nécessite `user:manage`)
- `PATCH /api/admin/users/:id` — définir rôles `{roleKeys:string[]}` ou remplacement `{permission:{key:string, grant:boolean|null}}` (nécessite `user:manage` / `permission:manage`)
- `GET /api/admin/roles` — liste des rôles (nécessite `role:manage`)
- `PUT /api/admin/roles/:id` — définir permissions de rôle `{permissionKeys:string[]}`
- `POST /api/admin/messages` — diffuser `{scope:"all"|"role"|"userIds", role?, userIds?, kind:"announcement"|"system"|"admin_message", title, body, link?}` (nécessite `message:broadcast`)
- `GET /api/admin/stats` — stats de la plateforme
