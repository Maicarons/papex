# Guide de soumission

Ce guide explique les deux méthodes de soumission d'articles prises en charge par Papex, et fournit une référence complète pour la **soumission par paquet source** ainsi que son manifeste `papex.json` et sa chaîne d'outils XeLaTeX.

---

## 1. Aperçu

Papex propose deux points d'entrée de soumission pour différents flux de travail :

| Méthode | Point d'entrée | Public | Caractéristiques |
| --- | --- | --- | --- |
| **Soumission par formulaire** | Page web « Soumettre → Formulaire » / `POST /api/papers` | Soumetteurs occasionnels | Renseignez titre, résumé, auteurs, etc. dans le navigateur ; **envoyez directement le PDF texte intégral** (≤50MB) |
| **Envoi de paquet source** | Page web « Soumettre → Paquet source » / `POST /api/submit/archive` | Auteurs LaTeX | Empaquetez vos sources avec un manifeste `papex.json` dans un `tar.gz` ; la plateforme **crée l'article, lie les citations et construit le PDF** automatiquement |

> Les deux méthodes partagent la même logique d'ingestion (`createSubmission` + `addCitation`).
> Elles diffèrent uniquement par l'origine des métadonnées et la façon dont le corps/PDF sont produits.

> **Préférez ne pas toucher à la ligne de commande ?** Vous pouvez également utiliser le module intégré [Rédaction en ligne](/en/guide/writespace) pour éditer `papex.json` visuellement, rédiger le corps, et « exporter `tar.gz` » ou « publier en un clic » directement dans le navigateur — l'archive produite est entièrement équivalente à un envoi de paquet source.

---

## 2. Méthode 1 : Soumission par formulaire

Cliquez sur **Soumettre** dans la navigation supérieure, choisissez l'onglet **Formulaire**, renseignez les champs et cliquez sur « Soumettre l'article » :

- **Titre**, **Résumé**
- **Catégorie principale** (obligatoire, code issu de l'arbre des catégories, ex. `cs.LG`),
  **Catégories transversales** (séparées par des virgules, optionnel)
- **Auteurs** (ajoutez autant que nécessaire ; l'ordre est l'ordre des auteurs)
- **Envoyer le PDF** (optionnel) : glissez-déposez ou choisissez un PDF (≤50MB) ; la plateforme le stocke
  et lie automatiquement les références. **DOI** (optionnel), **Licence** (par défaut `CC-BY-4.0`),
  **Note de version** (optionnel)

L'article entre alors dans la file de revue. La soumission par formulaire est envoyée en `multipart/form-data` :
`meta` est une chaîne JSON des métadonnées, `pdf` est le fichier PDF optionnel.

```http
POST /api/papers
Content-Type: multipart/form-data; boundary=...

--boundary
Content-Disposition: form-data; name="meta"

{"title":"…","abstract":"…","primaryCategoryId":"cs.LG","secondaryCategoryIds":["stat.ML"],"authors":[{"name":"Ming Zhang","order":0}],"doi":"","license":"CC-BY-4.0","comments":"","basePaperId":null}
--boundary
Content-Disposition: form-data; name="pdf"; filename="paper.pdf"
Content-Type: application/pdf

<binary PDF data>
--boundary--
```

> Le PDF est optionnel. Lorsqu'il est fourni, l'endpoint le stocke contre la version de l'article,
> analyse le corps, lie les citations internes à la plateforme, et renvoie
> `{ pdfUrl, pages, referencesExtracted, referencesLinked }`. Le formulaire web l'envoie
> automatiquement ; les clients API peuvent toujours envoyer du JSON simple (sans `pdf`).

---

## 3. Méthode 2 : Envoi de paquet source

L'envoi de paquet source est un **flux de travail d'auteur** : vous rédigez l'article en LaTeX, décrivez
les métadonnées et références dans un `papex.json` structuré, empaquetez le tout dans un
`tar.gz` et l'envoyez en une étape. Le backend gère « dépaquetage → validation → ingestion →
liaison des citations → construction du PDF » de bout en bout.

### 3.1 Structure du paquet

Une structure de paquet minimale mais recommandée :

```
my-paper.tar.gz
├── papex.json            # obligatoire : manifeste de l'article (métadonnées + sections + références)
├── papex-template.tex    # document principal (utilise le papex-template.tex fourni par le dépôt)
├── papex.cls             # classe de document (optionnelle ; le serveur copie depuis PAPEX_LATEX_DIR si absente)
├── references.bib        # optionnel : BibTeX écrite à la main ; sinon auto-générée depuis les références
└── sections/             # sections du corps (fragments .tex, référencés dans l'ordre par papex.json)
    ├── 00-intro.tex
    ├── 01-related.tex
    └── …
```

> Le paquet **doit contenir `papex.json`** ; sinon l'envoi est rejeté (HTTP 400).

### 3.2 Référence des champs de `papex.json`

Le schéma JSON complet se trouve dans [`papex-latex/papex.schema.json`](https://github.com/).
Champs principaux et leurs cibles :

| Champ | Type | Obligatoire | Notes / cible DB |
| --- | --- | --- | --- |
| `paper.id` | string (`YYMM.NNNNN`) | no | S'il correspond à **votre propre article (ou admin) existant** → soumis comme une nouvelle version ; sinon un nouvel identifiant d'article est attribué |
| `paper.title` | string | yes | → `papers.title` / `paper_versions.title` |
| `paper.abstract` | string | yes | → `paper_versions.abstract` |
| `paper.keywords` | string[] | no | Affiché après le résumé dans le PDF (non stocké séparément) |
| `paper.primaryCategoryId` | string | yes | → `papers.primaryCategoryId` ; **doit exister** dans la table des catégories sinon 400 |
| `paper.secondaryCategoryIds` | string[] | no | → `paper_categories` (non principale) |
| `paper.doi` | string | no | → `paper_versions.doi`, également écrit dans le graphe de citations (`target_doi`) |
| `paper.license` | string | no | → `paper_versions.license`, par défaut `CC-BY-4.0` |
| `paper.versionNote` | string | no | → `paper_versions.comments` |
| `paper.subtitle` | string | no | Affiché sous le titre dans le PDF |
| `paper.venue` | string | no | Affiché dans le bloc titre (ex. conférence/revue) |
| `authors[].name` | string | yes | → `authors` + `paper_authors` (ordonné par `order`) |
| `authors[].orcid` | string | no | Note de bas de page de l'auteur |
| `authors[].email` | string | no | Utilisé comme contact de l'auteur correspondant |
| `authors[].affiliation` | string | no | **Chaîne** → résolue en `affiliations.id` via `findOrCreateAffiliation` |
| `authors[].corresponding` | boolean | no | Note de bas de page « Auteur correspondant » |
| `authors[].equalContribution` | boolean | no | Note de bas de page « Contribution égale » |
| `authors[].footnote` | string | no | Note de bas de page en texte libre |
| `references[].key` | string | yes | Clé de citation BibTeX |
| `references[].doi` / `arxivId` | string | no | Résolu en un article interne à la plateforme via `resolveTarget` ; sinon `url`/`title` vont dans `citations` |
| `references[].url` / `title` / `authors` / `year` / `venue` | string | no | Remplissent `citations` et le `references.bib` auto-généré |
| `sections[]` | string[] | yes | Liste ordonnée des chemins de sections `.tex` ; **pilote uniquement LaTeX, non stockée dans les tables** |
| `appendices[]` | string[] | no | Liste ordonnée des chemins d'annexe `.tex` |
| `acknowledgments` / `funding` | string | no | Affiché dans la section remerciements/financement du PDF |
| `build` | object | no | Options de construction : `style` (numeric/authoryear), `fontset` (fandol/windows/mac/ubuntu), `passthrough` (champs exemptés d'échappement), etc. |

> **Différence avec la soumission par formulaire** : `papex.json` utilise une `affiliation` **chaîne**
> au lieu d'un `affiliationId` numérique ; la couche de mappage recherche ou crée la
> ligne `affiliations`. Elle ajoute également les champs LaTeX uniquement `sections`, `references`,
> `appendices`, `build`.

### 3.3 Chaîne d'outils XeLaTeX (`papex-latex/`)

Une chaîne d'outils XeLaTeX dédiée est fournie dans [`papex-latex/`](https://github.com/) :

```
papex-latex/
├── papex.cls              # classe de document (ctex + authblk + biblatex, CJK+anglais, macros de métadonnées, en-têtes/pieds de page)
├── papex-template.tex     # document principal, \input automatique des _papex_*.tex générés et des sections
├── papex-build.py         # constructeur sans dépendance (stdlib uniquement ; jsonschema optionnel)
├── papex.schema.json      # contrat de manifeste draft-07
├── latexmkrc              # configuration latexmk optionnelle
├── README.md              # utilisation de la chaîne d'outils
└── example/               # paquet d'exemple complet (article chinois + 5 sections + annexe)
```

**Points forts de `papex.cls`**

- **CJK + anglais** : basé sur `ctex` (`scheme=plain`), `fontset=fandol` par défaut (fourni
  avec TeX Live, compile sur le serveur sans configuration) ; basculez localement avec
  `windows` / `mac` / `ubuntu`.
- **Auteurs/affiliations** : `authblk` avec affiliations partagées, notes de bas de page auteur correspondant et
  contribution égale.
- **Références** : `biblatex` + `biber`, `numeric` / `authoryear` sélectionnables.
- **Macros de métadonnées** : `\papexPaperId` (identifiant d'article au-dessus du titre), `\papexSubtitle`,
  `\papexVenue`, `\papexDoi` (lien doi.org automatique), `\papexVersionNote`, `\papexKeywords`
  (après le résumé), `\papexLicense` (pied de page), `\papexRunningTitle` (en-tête).
- **Indépendant de toute marque** : aucun libellé *preprints / arXiv*, conforme à la
  convention produit « sans arXiv ».

**Flux de travail de `papex-build.py`**

1. Lire `papex.json` (l'entrée peut être un répertoire / un json seul / un `.tar.gz`).
2. Valider (préférer `jsonschema`, sinon vérifications intégrées).
3. Échapper les champs texte brut (`title` / `abstract` / `authors` / `affiliation` /
   `keywords` / `acknowledgments` …), en générant `_papex_meta.tex`, `_papex_abstract.tex`,
   `_papex_sections.tex`, `_papex_backmatter.tex`, `_papex_appendices.tex` et
   `references.bib` (ignoré si l'archive contient déjà `references.bib`).
4. Compiler avec `latexmk -xelatex` (`--emit-only` n'émet que les intermédiaires,
   `--validate` ne fait que valider).
5. Les fichiers de section `.tex` sont écrits à la main par l'auteur et prennent en charge le LaTeX
   complet (y compris les mathématiques) ; ils ne sont **pas échappés**. Utilisez `build.passthrough` pour exonérer
   des champs texte JSON de l'échappement.

### 3.4 Aperçu et construction en local

```bash
# entrer dans le paquet d'exemple
cd papex-latex/example

# émettre uniquement les .tex/.bib intermédiaires (aucun TeX requis — utile pour inspecter échappement/structure)
python3 ../papex-build.py . --emit-only

# valider uniquement papex.json
python3 ../papex-build.py . --validate

# générer et compiler le PDF (nécessite un TeX Live local)
python3 ../papex-build.py .
```

Empaquetez et soumettez :

```bash
tar -czf my-paper.tar.gz papex.json papex-template.tex references.bib sections/
```

### 3.5 Envoi sur le site web

1. Après connexion, cliquez sur **Soumettre** dans la navigation supérieure et choisissez l'onglet
   **Paquet source**.
2. Glissez le `tar.gz` dans la zone de dépôt, ou cliquez pour choisir un fichier (uniquement `.tar.gz` /
   `.tgz`, ≤ 50MB).
3. Cliquez sur « Envoyer et soumettre » ; la plateforme renvoie l'identifiant et la version de l'article, avec
   des notes de traitement (ex. PDF en cours de construction en arrière-plan).
4. Cliquez sur « Voir l'article » pour accéder à la page de l'article nouvellement créé.

---

## 4. Traitement de bout en bout (backend)

Après l'envoi, le backend traite le paquet comme suit (source dans `src/lib/latex/`) :

```
author ──tar.gz──> POST /api/submit/archive (multipart: file)
                         │
                         ▼
                  ① unpack (tar.ts)
                     gunzip zéro-dépendance + parseur ustar/GNU/PAX, garde contre la traversée de chemin
                         │
                         ▼
                  ② read papex.json → coerceManifest() valide les champs requis
                         │
                         ▼
                  ③ mapToCreatePaperInput()
                     · primaryCategoryId doit exister (sinon 400)
                     · chaîne affiliation → affiliations.id (findOrCreateAffiliation)
                     · paper.id correspond à un article propre/privilégié → nouvelle version
                         │
                         ▼
                  ④ createSubmission() ingère (réutilise la transaction existante)
                         │
                         ▼
                  ⑤ mapReferencesToCitations() → addCitation() lie le graphe de citations
                         │
                         ▼
                  ⑥ build XeLaTeX optionnel (latexmk serveur)
                     → savePdfBuffer() stocke → met à jour paper_versions.pdfUrl
                     (latexmk manquant → simple avertissement, ingestion non affectée)
                         │
                         ▼
                 renvoie { paperId, version, warnings, pdfUrl? }
```

**Modules clés**

| Fichier | Responsabilité |
| --- | --- |
| `src/lib/latex/tar.ts` | Dépendance zéro `gunzip` + `parseTar` (noms longs ustar / GNU / en-têtes étendus PAX), `writeEntries` avec protection contre la traversée de chemin |
| `src/lib/latex/papex-json.ts` | Types `PapexManifest`, `coerceManifest`, `mapToCreatePaperInput`, `mapReferencesToCitations` |
| `src/lib/latex/papex-archive.ts` | Orchestration de `processSubmissionArchive` ; `buildAndStorePdf` sonde `latexmk` et compile/stocke le PDF |
| `src/app/api/submit/archive/route.ts` | Accepte `file` `multipart/form-data` (≤50MB), authentifie, mappe les erreurs vers le statut HTTP |

**Correspondance des codes d'erreur (HTTP)**

| Erreur interne | HTTP | Signification |
| --- | --- | --- |
| `MANIFEST_MISSING` | 400 | Archive sans `papex.json` |
| `MANIFEST_JSON_INVALID` | 400 | `papex.json` n'est pas un JSON valide |
| `MANIFEST_INVALID:…` | 400 | Champ obligatoire manquant (title/abstract/primaryCategoryId/authors/sections) |
| `CATEGORY_NOT_FOUND:cs.X` | 400 | Le code de catégorie n'existe pas |
| `ARCHIVE_PARSE_FAILED` / `ARCHIVE_EMPTY` | 400 | Archive corrompue ou vide |
| `FORBIDDEN` | 403 | Non autorisé à soumettre une nouvelle version de cet article |
| `PAPER_NOT_FOUND` | 404 | L'article cible déclaré pour la nouvelle version n'existe pas |
| autre | 500 | Erreur interne (incl. `ID_GENERATION_FAILED`) |

---

## 5. Référence API

### `POST /api/papers`

Endpoint de soumission par formulaire. La requête est en `multipart/form-data` (voir
[Section 2](#2-method-1-form-submission)) : le champ `meta` est une chaîne JSON des métadonnées,
le champ `pdf` est le fichier PDF optionnel (≤50MB). Nécessite une authentification. Renvoie `{ paperId, version }`,
et lorsqu'un PDF a été envoyé, un supplément `pdf: { pdfUrl, pages, referencesExtracted, referencesLinked }`.
Les clients API peuvent également envoyer du JSON simple (sans `pdf`).

### `POST /api/submit/archive`

Endpoint de paquet source.

- **Auth** : requise (cookie).
- **Requête** : `multipart/form-data`, le champ `file` est le `tar.gz` (≤ 50MB).
- **Succès (201)** :

  ```json
  {
    "paperId": "2608.00007",
    "version": 1,
    "warnings": [],
    "pdfUrl": "https://…/api/papers/2608.00007/pdf/1"
  }
  ```

- **Échec** : JSON avec le message d'erreur correspondant ; codes d'état selon la
  [table des erreurs](#4-end-to-end-processing-backend).

---

## 6. Déploiement et exploitation

- **TeX Live** : le serveur a besoin de `texlive` (avec `xelatex`, `biber`, `latexmk`) et de
  `collection-langchinese` pour que les polices `fandol` soient disponibles.
- **Variables d'environnement** :
  - `PAPEX_LATEX_BIN` : chemin vers latexmk (par défaut `PATH`).
  - `PAPEX_LATEX_DIR` : répertoire contenant `papex.cls` ; copié lorsque l'archive l'omet.
- **Bac à sable et ressources** : exécutez la compilation LaTeX dans un environnement isolé avec
  des limites CPU/mémoire/expiration, et **désactivez `\write18` (shell-escape)** ainsi que l'accès réseau
  pour empêcher des sources malveillantes d'exécuter des commandes.
- **Asynchrone** : la compilation est lente ; en production, préférez une **file asynchrone**
  (renvoyez `paperId` immédiatement, rappel pour mettre à jour `pdfUrl` lorsque le PDF est prêt)
  afin d'éviter de bloquer la requête.
- **Dégradation en cas d'absence** : si `latexmk` est indisponible, `processSubmissionArchive`
  enregistre des `warnings` et saute la construction du PDF ; l'ingestion et la liaison des citations fonctionnent toujours.
- **Stockage PDF** : réutilise `savePdfBuffer` (route de streaming `/api/papers/{id}/pdf/{version}`) ;
  aucune nouvelle couche de stockage nécessaire.

---

## 7. Sécurité

- **Traversée de chemin** : `writeEntries` valide le chemin réel de chaque entrée avec
  `path.relative`, rejetant `..` et les chemins absolus ; `parseTar` retire le `./` initial.
- **Limite de taille** : la route limite `file` à ≤ 50 Mo.
- **Abus de ressources** : la compilation a des limites d'expiration/ressources ; envisagez une limitation de débit par utilisateur.
- **shell-escape** : la commande de compilation ne passe pas `-shell-escape`, empêchant les sources d'exécuter des commandes système.

---

## 8. FAQ

**Q : Le paquet source duplique-t-il les données de la soumission par formulaire ?**
Non. Les deux partagent la même logique d'ingestion ; seule l'origine des métadonnées diffère.

**Q : Dois-je utiliser le modèle XeLaTeX ?**
`papex.cls` et `papex-template.tex` déterminent la mise en page finale du PDF ; vous n'écrivez que les
fichiers de section `.tex` et `papex.json`. Si l'archive omet `papex.cls`, le serveur utilise
celui de `PAPEX_LATEX_DIR`.

**Q : Puis-je utiliser des mathématiques, figures, commandes personnalisées dans les sections ?**
Oui. Les fichiers de section `.tex` sont écrits à la main et prennent en charge le LaTeX complet, **non échappé**.
Placez les commandes personnalisées du préambule dans les fichiers de section ou `papex-template.tex`.

**Q : Je ne vois pas de PDF juste après la soumission ?**
Si TeX Live n'est pas configuré côté serveur, `pdfUrl` est vide et la page indique « Le PDF est
en cours de construction en arrière-plan. » Configurez-le et soumettez à nouveau ; en production, associez-le à une
file asynchrone.

**Q : Comment soumettre une nouvelle version d'un article ?**
Définissez `paper.id` dans `papex.json` avec l'identifiant de votre article existant (et vous devez y avoir la permission de soumission) ; la plateforme l'ingère comme une nouvelle version.

**Q : Comment les citations sont-elles liées automatiquement ?**
`doi` / `arxivId` dans le tableau `references` sont résolus en articles internes à la plateforme via
`resolveTarget` et un lien de citation est créé ; les autres entrées sont stockées comme
`url` / `title` dans le graphe de citations.
