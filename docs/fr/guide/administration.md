# Administration et permissions

Au-delà de la soumission et de la recherche de base, Papex embarque une **zone admin** destinée aux opérateurs et un **système de permissions granulaire**. Ce guide couvre quatre capacités :

1. **Rôles et permissions (RBAC)** — contrôler la publication, la consultation, le téléchargement et les commentaires d'articles par rôle ou par utilisateur.
2. **Gestion des permissions utilisateur** — assigner des rôles supplémentaires et définir des remplacements autoriser / refuser par utilisateur pour toute permission.
3. **Co-revue (revue par les pairs)** — les admins envoient des demandes de co-revue ; les relecteurs acceptent, soumettent des avis et reçoivent des accusés de réception, formant une boucle fermée.
4. **Messages catégorisés et diffusion** — un centre de notification unifié couvrant avis système, résultats de revue, accusés de tickets, demandes de co-revue, messages privés admin et réponses communautaires, plus des diffusions ciblées.

---

## 1. Rôles et permissions (RBAC)

Papex utilise un modèle à trois couches — **rôle de base + rôles assignés + remplacements par utilisateur** — prenant en charge à la fois l'autorisation en masse par rôle et les restrictions personnalisées par utilisateur.

### 1.1 Modèle de permission

| Couche | Description | Maintenu à |
| --- | --- | --- |
| Rôle de base | Le rôle inhérent à chaque utilisateur dans `users.role` : `author` / `moderator` / `admin` | `author` par défaut à l'inscription |
| Rôles assignés | Rôles supplémentaires superposés à un utilisateur via la table de jointure `user_roles` | Page de gestion des utilisateurs |
| Remplacements par utilisateur | *allow* ou *deny* explicite pour une seule permission sur un utilisateur ; priorité la plus haute | Page de gestion des utilisateurs |

> ℹ️ `reader` est un rôle RBAC **assigné** (dans la table `roles`), et non un rôle de base de la base de données (`users.role` n'autorise que `author` / `moderator` / `admin`). Le rôle de base définit la connexion et la limite de permission par défaut ; les rôles assignés s'empilent par-dessus.

### 1.2 Catalogue de permissions

Le système embarque **15 permissions** réparties en **6 groupes** :

| Groupe | Clé de permission | Nom | Description |
| --- | --- | --- | --- |
| paper | `paper:publish` | Publier l'article | Soumettre un nouvel article ou version |
| | `paper:view` | Voir l'article | Parcourir les articles publiés |
| | `paper:download` | Télécharger l'article | Télécharger le PDF / paquet source |
| | `paper:moderate` | Modérer l'article | Approuver / rejeter / retirer |
| comment | `comment:create` | Publier un commentaire | Commenter et répondre sous les articles |
| | `comment:view` | Voir les commentaires | Parcourir la section commentaires |
| ticket | `ticket:create` | Créer un ticket | Ouvrir un retour / ticket |
| | `ticket:manage` | Gérer les tickets | Répondre à / traiter les tickets |
| co_review | `co_review:assign` | Assigner la co-revue | Envoyer une demande de co-revue |
| | `co_review:respond` | Prendre la co-revue | Accepter / décliner une demande |
| | `co_review:manage` | Gérer la co-revue | Voir toute la progression de la co-revue |
| message | `message:broadcast` | Diffuser | Envoyer des messages aux utilisateurs |
| admin | `user:manage` | Gérer les utilisateurs | Voir / éditer les utilisateurs |
| | `role:manage` | Gérer les rôles | Configurer rôles et permissions |
| | `permission:manage` | Gérer les remplacements | Autoriser / refuser par utilisateur |

### 1.3 Permissions par rôle par défaut

Le seed (`db:seed`) écrit une correspondance de permissions par défaut pour chaque rôle système :

| Rôle | Nombre | Permissions |
| --- | --- | --- |
| `admin` | 15 | Toutes les permissions |
| `moderator` | 12 | article voir/télécharger/modérer, commentaire créer/voir, ticket créer/gérer, co-revue assigner/répondre/gérer, diffuser, gérer utilisateurs |
| `author` | 6 | article publier/voir/télécharger, commentaire créer/voir, ticket créer |
| `reader` | 3 | article voir/télécharger, commentaire voir |

### 1.4 Ordre de résolution

Lorsqu'une opération protégée s'exécute, les permissions effectives se résolvent ainsi :

```
permissions du rôle de base
  ∪ permissions des rôles assignés      (union des rôles)
  ∪ remplacements par utilisateur marqués allow
  − remplacements par utilisateur marqués deny  (les remplacements gagnent)
```

Ainsi, même si ni le rôle de base ni les rôles assignés n'octroient `paper:publish`, un remplacement *allow* explicite le permet toujours ; à l'inverse, un *deny* explicite le bloque même lorsque les rôles l'octroient.

> Repli : si les tables `roles` / `permissions` ne sont pas encore remplies (ex. une DB neuve sans `db:seed`), le moteur retombe sur la correspondance par défaut constante ci-dessus pour éviter de verrouiller tout le site. Exécuter `db:seed` après le déploiement reste recommandé.

### 1.5 Opérations protégées (passerelles)

Les opérations clés sont gardées ; l'absence de permission renvoie `403` :

- `POST /api/papers` — nécessite `paper:publish`
- `POST /api/papers/:id/comments` — nécessite `comment:create`
- La modération, le traitement des tickets, l'assignation / gestion de la co-revue, les éditions d'utilisateurs et de rôles, la diffusion, etc. nécessitent leurs permissions respectives, et les routes sont protégées par `middleware` (seuls `moderator` / `admin` peuvent entrer dans `/admin`).

---

## 2. Gestion des permissions utilisateur

Ouvrez **`/admin/users`** (nécessite `user:manage`) :

- **Rechercher des utilisateurs** par nom d'utilisateur / e-mail / nom affiché, avec pagination.
- **Assigner des rôles supplémentaires** : cochez des rôles système (`admin` / `moderator` / `author` / `reader`) dans l'éditeur utilisateur pour les superposer au rôle de base.
- **Remplacement de permission à trois états** : pour chacune des 15 permissions définies :
  - **hériter** (par défaut) — suivre le résultat de l'union des rôles ;
  - **autoriser** — force l'octroi même si les rôles l'omettent ;
  - **refuser** — force le blocage même si les rôles l'incluent.

Toutes les modifications s'enregistrent instantanément via `PATCH /api/admin/users/:id` et s'appliquent aux vérifications d'autorisation ultérieures de cet utilisateur.

---

## 3. Co-revue (revue par les pairs)

La co-revue est une boucle complète de revue par les pairs reliant **admin → relecteur → auteur**.

### 3.1 Boucle fermée

```
Admin assigne ──► Le relecteur reçoit un message « demande de co-revue »
     │
     ▼
Le relecteur répond (accepte / décline)
     │ accepte
     ▼
Le relecteur soumet un avis (approuve / rejette / révise + commentaire)
     │
     ▼
Accusé système ──► notifie l'assigneur « avis soumis »
                ──► notifie l'auteur « co-revue terminée » (si auteur ≠ assigneur)
```

### 3.2 Machine à états

Un enregistrement de co-revue (`co_reviews`) transitionne comme suit :

| État | Signification | Entré par |
| --- | --- | --- |
| `pending` | En attente de la réponse du relecteur | Assignation admin (`POST /api/co-reviews`) |
| `accepted` | Acceptée | Le relecteur accepte (`POST /api/co-reviews/:id/respond` `{accepted:true}`) |
| `declined` | Déclinée | Le relecteur décline (`respond` `{accepted:false}`) |
| `completed` | Terminée | Le relecteur soumet un avis (`submit`) |
| `expired` | Expirée | (état réservé pour la fermeture par expiration) |

> Un relecteur ne peut répondre que tant que `pending`, et ne peut soumettre un avis que tant que `accepted`. Un état incohérent renvoie `INVALID_STATE`.

### 3.3 Points d'entrée et notifications

- **Admin** : `/admin/co-reviews` pour assigner et suivre toutes les co-revues ; `/admin/co-reviews/:id` pour le détail. L'assignation choisit parmi les articles au statut `submitted`.
- **Relecteur** : `/co-reviews` (mes revues) et `/co-reviews/:id` (accepter / décliner + soumettre un avis).
- **Notifications unifiées** : chaque changement d'état déclenche un message `co_review_request` / `co_review_result` vers les parties concernées (voir Section 4).

---

## 4. Messages catégorisés et diffusion

### 4.1 Catégories de messages

Les messages sont classés par `kind` en **8 catégories**, colorées et groupées dans la boîte de réception :

| kind | Libellé | Ton | Source typique |
| --- | --- | --- | --- |
| `system` | Avis système | default | Événements système |
| `ticket_reply` | Accusé de ticket | info blue | Ticket répondu |
| `announcement` | Annonce | warning yellow | Diffusion admin |
| `review_result` | Résultat de revue | success green | Article approuvé / rejeté |
| `co_review_request` | Demande de co-revue | purple | Co-revue assignée |
| `co_review_result` | Accusé de co-revue | purple | Réponse / avis soumis |
| `admin_message` | Message privé admin | danger red | Message direct ciblé |
| `community_reply` | Réponse communautaire | info blue | Commentaire répondu |

La boîte de réception (`/messages`) prend en charge le filtrage par catégorie (`GET /api/messages?kind=...`) ; cliquer sur un message navigue vers son `link` associé (article, ticket, co-revue, …).

### 4.2 Entonnoir de notification unifié

Toutes les alertes inter-modules sont émises via un service unique `notifications` afin que les modules revue, ticket, co-revue et communautaire partagent un contrat de notification unique :

- **Revue** : décision sur l'article → notifier l'auteur (`review_result`).
- **Tickets** : réponse du personnel → notifier le rapporteur (`ticket_reply`).
- **Co-revue** : assigner / répondre / soumettre → notifier relecteur, assigneur, auteur (`co_review_request` / `co_review_result`).
- **Communauté** : commentaire répondu → notifier l'auteur du commentaire parent (`community_reply`).

### 4.3 Diffusion

Ouvrez **`/admin/messages`** (nécessite `message:broadcast`) :

- **Portée** :
  - `all` — tous les utilisateurs ;
  - `role` — un rôle de base (`author` / `moderator` / `admin`) ;
  - `userIds` — une liste d'identifiants utilisateur spécifiques.
- **Kind** : `announcement` / `system` / `admin_message`.
- Renseignez le titre, le corps (avec `link` optionnel), soumettez, et le message est écrit en masse vers le public cible ; le nombre de succès est renvoyé.

---

## 5. Navigation admin

Les points d'entrée admin se trouvent dans le menu utilisateur connecté et la vue d'ensemble `/admin`, incluant :

| Module | Route | Description |
| --- | --- | --- |
| Vue d'ensemble | `/admin` | Cartes de stats + raccourcis de modules |
| File de revue | `/admin/review` | Approuver / rejeter des articles (+ motif) |
| Stats | `/admin/stats` | Métriques de la plateforme |
| Tickets | `/admin/tickets` | Traitement des tickets |
| Co-revue | `/admin/co-reviews` | Assigner et suivre les co-revues |
| Utilisateurs | `/admin/users` | Rôles et remplacements de permission |
| Rôles | `/admin/roles` | Matrice de permissions des rôles |
| Messages | `/admin/messages` | Diffusion |

> Ces routes sont protégées par `middleware` ; seuls les utilisateurs avec un rôle de base `moderator` ou `admin` peuvent y accéder, et les actions d'écriture nécessitent en plus la permission granulaire correspondante.

---

## 6. Ops : migrer et seeder

Les quatre systèmes dépendent de la migration `0003_add_rbac_co_review_messages` (ajoute `roles` / `permissions` / `role_permissions` / `user_roles` / `user_permissions` / `co_reviews` / `moderation_logs`, et étend `messages.kind` à 8 catégories). Au déploiement ou à l'initialisation locale, exécutez :

```bash
npm run db:migrate   # apply migrations (RBAC / co-review / message categories)
npm run db:seed      # write 4 system roles + 15 permissions + defaults (idempotent)
```

Le seed RBAC utilise `onConflictDoNothing` et est sûr à réexécuter. Après migrate + seed, le moteur de permission utilise les tables `roles` / `permissions` ; avant le seed, il retombe sur les valeurs par défaut constantes (voir 1.4).

---

## 7. Référence rapide API

| Méthode | Chemin | Description |
| --- | --- | --- |
| `GET` | `/api/messages?kind=` | Boîte de réception, filtrer par catégorie |
| `POST` | `/api/papers/:id/moderate` | Modérer `{action:"approve"|"reject"|"withdraw", reason?}` |
| `GET` | `/api/co-reviews?scope=mine|all` | Liste des co-revues (miennes / toutes) |
| `POST` | `/api/co-reviews` | Assigner `{paperId, reviewerId, note?}` |
| `GET` | `/api/co-reviews/:id` | Détail de la co-revue |
| `POST` | `/api/co-reviews/:id/respond` | Répondre `{accepted:boolean}` |
| `POST` | `/api/co-reviews/:id/submit` | Soumettre `{decision:"approve"|"reject"|"revise", comment}` |
| `GET` | `/api/admin/users` | Liste utilisateurs (pagination / recherche) |
| `PATCH` | `/api/admin/users/:id` | Définir rôles `{roleKeys}` ou remplacement `{permission:{key,grant}}` |
| `GET` | `/api/admin/roles` | Liste des rôles |
| `PUT` | `/api/admin/roles/:id` | Définir permissions de rôle `{permissionKeys}` |
| `POST` | `/api/admin/messages` | Diffuser `{scope, role?, userIds?, kind, title, body, link?}` |
| `GET` | `/api/admin/stats` | Stats de la plateforme |

Voir la [référence API](/en/guide/api) pour la liste complète.
