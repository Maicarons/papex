# Rédaction en ligne (Writespace)

Ce guide couvre le module intégré de **rédaction en ligne** de Papex (point d'entrée
`/writespace`) — un bureau d'écriture dans le navigateur qui ne nécessite ni installation TeX locale ni
JSON écrit à la main. Il pousse le flux de « soumission par paquet source » du
[Guide de soumission](/en/guide/submission) directement dans le navigateur : vous renseignez les métadonnées et
rédigez le corps en ligne, et le système génère un `papex.json` conforme plus des fichiers de section `.tex`.
Vous pouvez ensuite **exporter un `tar.gz`** ou **publier sur la plateforme en un clic**.

---

## 1. Aperçu

### 1.1 Problèmes résolus

| Point douloureux du classique « envoi de paquet source » | Ce que fait la rédaction en ligne |
| --- | --- |
| Écriture manuelle de `papex.json` source d'erreurs (champs manquants, mauvais format) | Éditeur visuel + validation en temps réel |
| Vérifier la structure nécessite une installation Python / TeX locale | Le `.tex` intermédiaire est généré dans le navigateur — aucune chaîne d'outils locale |
| L'empaquetage et l'envoi sont deux étapes séparées | « Exporter » et « Publier » en un seul clic depuis l'éditeur |
| Perte de travail en cours de rédaction | Enregistré automatiquement dans `localStorage` du navigateur |

### 1.2 Les trois onglets

| Onglet | Objectif |
| --- | --- |
| **Métadonnées** | Infos article, auteurs, références, options de construction — un éditeur visuel pour `papex.json` |
| **Corps** | Atelier structuré de sections / annexes pour rédiger le corps LaTeX |
| **Exporter et publier** | Validation en temps réel, aperçu du fichier archive, export `tar.gz` / publication en un clic |

### 1.3 Relation avec le système de soumission

La rédaction en ligne **n'est pas** une nouvelle méthode de soumission — c'est le **front-end d'écriture**
de « l'envoi de paquet source ». L'archive qu'elle produit est compatible octet pour octet avec
[l'envoi de paquet source](/en/guide/submission#3-method-2-source-package-upload), et la publication
réutilise le même endpoint backend `POST /api/submit/archive`, suivant le même
pipeline « dépaquetage → validation → création de l'article → liaison du graphe de citations → construction du PDF »
(voir [Guide de soumission §4](/en/guide/submission#4-end-to-end-processing-flow-backend)).

---

## 2. Point d'entrée et permissions

- **Point d'entrée** : `/writespace`.
- **Auth au niveau page** : le composant serveur `src/app/writespace/page.tsx` appelle
  `getCurrentUser()` et `redirect("/login")` lorsque non authentifié.
- **Middleware** : `src/middleware.ts` ajoute `/writespace` à `PROTECTED_PREFIXES` et ajoute
  `/writespace/:path*` au `matcher`, afin que les requêtes non authentifiées soient bloquées à la périphérie.
- **Permission de publication** : la publication est fondamentalement un envoi de paquet source et est soumise
  aux mêmes règles `FORBIDDEN` / `PAPER_NOT_FOUND` du
  [Guide de soumission §4](/en/guide/submission#4-end-to-end-processing-flow-backend) — lorsque
  `paper.id` déclare une nouvelle version, vous devez y avoir la permission de soumission sur cet article.

---

## 3. Onglet un : Éditeur de métadonnées

L'onglet **Métadonnées** correspond à `MetadataEditor`. Il découpe les blocs
`paper` / `authors` / `references` / `build` de `papex.json` en formulaires de type carte, avec des champs
alignés un à un sur le [Guide de soumission §3.2](/en/guide/submission#32-papexjson-field-reference).

### 3.1 Infos article (`metaPaper`)

Titre, sous-titre, résumé, mots-clés (séparés par des virgules), catégorie principale (liste déroulante, obligatoire),
catégories secondaires (ajouter/supprimer), DOI, licence (liste déroulante, par défaut `CC-BY-4.0`), veune, note de version, langue, identifiant d'article (optionnel — s'il est renseigné et appartient à l'un de vos articles existants, soumis comme une nouvelle version).

### 3.2 Auteurs (`metaAuthors`)

- Ajoutez plusieurs auteurs ; chaque carte permet de réordonner haut / bas / supprimer.
- Champs : nom (obligatoire), affiliation, e-mail, ORCID (vérifié au format), page personnelle, bascule auteur correspondant, bascule contribution égale, note de bas de page, ordre.
- Auteur correspondant / contribution égale / note de bas de page sont rendus comme notes `\thanks` dans le PDF ;
  ORCID et la page personnelle apparaissent également dans les notes de bas de page.

### 3.3 Références (`metaReferences`)

- Ajoutez plusieurs entrées BibTeX ; champs incluant la clé de citation (obligatoire, vérifiée au format), le type
  (liste déroulante, 12 types BibTeX), titre, auteur, revue, booktitle, année, DOI, URL, identifiant arXiv,
  pages, volume, numéro, éditeur, note.
- Deux objectifs : ① à la publication, lié dans le graphe de citations de la plateforme via
  `mapReferencesToCitations` ; ② à l'export, utilisé pour auto-générer `references.bib`
  (voir [§7](#7-exported-archive-structure)).

### 3.4 Options de construction (`metaBuild`)

- Style bibliographique : `numeric` / `authoryear` (injecté dans le document principal comme
  `\documentclass[11pt,bibstyle=authoryear]`).
- Colonnes : `1` / `2` (deux colonnes injecte `twocolumn`).
- Autres options `build` (ex. `fontset`, `documentclass`) sont réservées à la
  compilation côté serveur ; les valeurs par défaut sont dans `createDefaultDraft`.

### 3.5 Validation en temps réel

Chaque édition passe par `validateDraft()` (`src/lib/writespace/manifest.ts`) ; le résultat est
partagé avec l'onglet **Exporter et publier**. Règles principales :

| Vérification | Règle | Type |
| --- | --- | --- |
| `schemaVersion` | doit correspondre à `x.y.z` | erreur |
| `paper.title` / `abstract` / `primaryCategoryId` | obligatoires et non vides | erreur |
| `paper.id` (optionnel) | si présent doit correspondre à `YYMM.NNNNN` | erreur |
| `authors` | au moins 1 ; chaque `name` obligatoire ; `orcid` doit correspondre à `0000-0000-0000-0000` | erreur |
| `sections` | au moins 1 ; chaque `file` obligatoire ; `id` uniquement lettres, chiffres, `-`, `_` | erreur |
| `references` | chaque `key` obligatoire, limitée à `A-Za-z0-9_:+.-` ; `year` ∈ [0, 3000] | erreur |
| corps de section vide | conseil | avertissement |

> Les « erreurs » bloquent la publication ; les « avertissements » (ex. un corps de section vide) sont purement consultatifs.

---

## 4. Onglet deux : Atelier de corps

L'onglet **Corps** correspond à `SectionsEditor` et gère le corps de l'article et les annexes
structurellement.

### 4.1 Liste des sections

- Chaque section (ou annexe) est une carte repliable avec : id/nom de fichier (`file`, ex.
  `sections/intro.tex`), titre de section, niveau (`section` / `subsection` / `subsubsection` /
  `chapter` / `part`), corps (zone de texte LaTeX), compteur de caractères.
- Prend en charge : ajouter une section, ajouter une annexe, monter / descendre, supprimer.
- Le niveau détermine la commande émise à l'export (`\section{Title}` → `\input{sections/intro.tex}`).

### 4.2 Règles de contenu du corps

- La section `.tex` est écrite à la main et prend en charge le **LaTeX complet** : mathématiques, figures, commandes
  personnalisées, et références `\cite{key}` (correspondant aux clés de référence).
- Le corps de section n'est **pas échappé** (cohérent avec le
  [Guide de soumission §3.3](/en/guide/submission#33-xelatex-toolchain-papex-latex)) ; seuls
  les champs texte brut de « Métadonnées » sont échappés.
- Un bouton « Insérer des sections d'exemple » écrit cinq sections de démonstration (intro / related work /
  method / experiments / conclusion) avec des formules LaTeX, pour un démarrage rapide.

### 4.3 Annexes

Les entrées d'annexe partagent la structure des sections et sont émises après un seul `\appendix`.

---

## 5. Onglet trois : Exporter et publier

L'onglet **Exporter et publier** correspond à `ExportPanel` — la sortie de tout le flux.

### 5.1 État de validation

Affiche le résultat en direct de `validateDraft()` en haut : « valide » ou « invalide » plus une liste
d'erreurs/avertissements. Le bouton **Publier** est désactivé tant qu'il y a des erreurs.

### 5.2 Aperçu du manifeste de fichiers

Affiche les fichiers d'archive qui seront produits (c'est-à-dire la sortie de `buildArchiveFiles`,
[§7](#7-exported-archive-structure)), afin que vous puissiez confirmer la structure avant le téléchargement/publication.

### 5.3 Exporter `tar.gz`

Cliquez sur **Exporter** : un `tar.gz` est généré entièrement dans le navigateur et déclenche un téléchargement
(nom de fichier depuis l'i18n `writespace.expDownloadName`).

- Entièrement **sans dépendance** : `src/lib/writespace/targz.ts` implémente à la main l'empaquetage POSIX ustar plus
  le `CompressionStream('gzip')` natif — aucun backend impliqué.
- Les ressources de modèle (`papex-template.tex` / `papex.cls`) sont récupérées à l'export depuis
  `/writespace/papex-template.tex` et `/writespace/papex.cls` et intégrées dans l'archive,
  la gardant **autonome** (le backend compile directement via `latexmk`).

### 5.4 Publication en un clic

Cliquez sur **Publier** : exécute les mêmes étapes de génération que l'export, puis `POST`e le `tar.gz` comme
le champ `file` d'une requête `multipart/form-data` vers `/api/submit/archive`.

- La publication nécessite `validation.valid === true` dès le départ.
- En cas de succès, affiche « identifiant d'article + version » et `warnings` renvoyés, avec un lien « voir l'article »,
  et efface le drapeau de brouillon local.
- En cas d'échec, affiche le message d'erreur backend en ligne (mappage dans la
  [table des erreurs du Guide de soumission §4](/en/guide/submission#4-end-to-end-processing-flow-backend)).

---

## 6. Auto-enregistrement et restauration du brouillon

- Le brouillon (`manifest` + corps par section) s'enregistre automatiquement dans `localStorage`
  du navigateur (clé : `papex-writespace-draft`), anti-rebond 400 ms — survit à la fermeture de page.
- Rouvrir `/writespace` restaure le dernier brouillon automatiquement et affiche « brouillon local restauré » ;
  après édition, affiche « enregistré automatiquement ».
- Le bouton **Nouveau** en haut demande confirmation, efface `localStorage`, et réinitialise un brouillon
  vide (avec une section d'intro d'exemple).

> Les brouillons vivent uniquement dans le navigateur local ; changer d'appareil ou vider les données du navigateur les perd.
> Pour un travail important, pensez à **Exporter** ou **Publier**.

---

## 7. Structure de l'archive exportée

Le `tar.gz` produit par **Exporter / Publier** est assemblé par `buildArchiveFiles()` et est
entièrement compatible avec ce qu'attend le backend `papex-archive.ts` :

```
my-paper.tar.gz
├── papex.json            # editor manifest, serialized (2-space indent)
├── papex-template.tex    # main doc with bibstyle/twocolumn injected
├── papex.cls             # document class (bundled from /writespace/papex.cls)
├── references.bib        # auto-generated from references (omitted if none)
├── sections/
│   ├── intro.tex         # the section you wrote in "Body"
│   └── …
└── _papex_*.tex          # auto-generated intermediate fragments (do not edit)
    ├── _papex_meta.tex       # title/authors/affiliations/keywords/running title
    ├── _papex_abstract.tex   # abstract
    ├── _papex_sections.tex   # \section + \input assembly
    ├── _papex_backmatter.tex # acknowledgments/funding
    └── _papex_appendices.tex # \appendix + appendices
```

- Les fichiers `_papex_*.tex` sont produits par `genMeta` / `genAbstract` / `genSections` /
  `genBackmatter` / `genAppendices` ; les champs texte brut passent par un `latexEscape` en un seul passage,
  tandis que les corps de section sont `\input` verbatim.
- Cette archive peut être envoyée manuellement sur la page « envoi de paquet source », ou soumise
  automatiquement par le bouton **Publier** — les deux sont équivalents.

---

## 8. Notes d'implémentation

| Sujet | Implémentation |
| --- | --- |
| Modèle de données | `src/lib/writespace/manifest.ts` : types alignés avec `papex.schema.json` + `papex-json.ts`, frontend pur, aucun import serveur |
| Génération LaTeX | `src/lib/writespace/latex-gen.ts` : porte la logique de `papex-build.py` en TS ; l'échappement utilise une **analyse de caractères en un seul passage** (cohérent avec le `papex-build.py` fixe, évitant de ré-échapper `\textbackslash{}`) |
| Empaquetage | `src/lib/writespace/targz.ts` : ustar écrit à la main + `CompressionStream('gzip')`, sans dépendance, pur navigateur |
| Ressources de modèle | `public/writespace/papex.cls` + `papex-template.tex` (copiés depuis `papex-latex/`, LF-normalisés), récupérés à l'exécution dans l'archive |
| Orchestration | `src/components/writespace/writespace-client.tsx` : trois `Tabs` + persistance du brouillon + export/publier |
| Internationalisation | `src/i18n/dictionaries/{zh,en}.ts` bloc `writespace` (~70 clés), correspondant aux libellés UI |

---

## 9. Sécurité et limites

- **Permissions** : l'entrée et la publication nécessitent toutes deux une connexion ; l'article cible d'une nouvelle version doit appartenir
  à l'utilisateur courant (ou un rôle privilégié), sinon le backend renvoie `FORBIDDEN`.
- **Aucune persistance côté serveur** : toute la génération et l'empaquetage se font en mémoire navigateur ; les fichiers quittent
  la machine uniquement lorsque vous cliquez sur télécharger/publier. La plateforme applique toujours le bac à sable TeX,
  les limites de taille, et la désactivation du shell-escape du
  [Guide de soumission §6/§7](/en/guide/submission#6-deployment-and-ops).
- **Support navigateur** : `CompressionStream('gzip')` nécessite un navigateur récent (Chrome/Edge 80+,
  Firefox 113+, Safari 16.4+) ; lorsqu'indisponible, l'export échoue avec un message convivial.
- **Limite 50 Mo** : la publication passe par `/api/submit/archive` et est soumise au même plafond de 50 Mo.

---

## 10. FAQ

**Q : Rédaction en ligne vs envoi de paquet source — lequel utiliser ?**
L'un ou l'autre. La rédaction en ligne convient aux auteurs qui ne veulent pas la ligne de commande et veulent une validation en direct ;
l'envoi de paquet source convient à ceux qui ont un projet TeX local et veulent le contrôle fin de `papex-build.py`.
Les deux produisent des résultats identiques dans la base de données.

**Q : Le `tar.gz` exporté peut-il être envoyé manuellement sur la page « envoi de paquet source » ?**
Oui, et c'est équivalent. L'archive exportée intègre déjà `papex.cls` et
`papex-template.tex`, donc le backend n'a pas besoin de les copier depuis `PAPEX_LATEX_DIR`.

**Q : J'ai utilisé `\cite{key}` dans le corps mais la citation ne s'est pas liée après publication ?**
La liaison de citation dépend du `doi` / `arxivId` de la référence correspondant à un article déjà sur la
plateforme ; les entrées avec seulement `url` / `title` vont dans le graphe de citations mais ne forment pas de
lien interne. Vérifiez que le DOI / identifiant arXiv de la référence est exact.

**Q : Les brouillons sont-ils synchronisés vers le cloud ?**
Non. Les brouillons vivent uniquement dans `localStorage` du navigateur ; changer d'appareil ou vider le cache les perd.
Prenez l'habitude d'**Exporter** ou de **Publier**.

**Q : Les formules `$...$` du corps seront-elles corrompues ?**
Non. La section `.tex` est écrite verbatim (sans échappement) ; les formules sont rendues par la compilation XeLaTeX
du backend. Seuls les champs texte brut de « Métadonnées » sont échappés.

**Q : Pas de PDF immédiatement après la publication ?**
Comme dans la [FAQ du Guide de soumission](/en/guide/submission#8-faq) : cela dépend de si le serveur
a TeX Live configuré ; sinon, `pdfUrl` est vide et la page affiche « Le PDF est en cours de construction en arrière-plan ».
