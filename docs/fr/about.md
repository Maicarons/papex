# À propos de Papex

Papex est une plateforme **open-source et indépendante** pour gérer et découvrir la littérature académique. Notre objectif est de fournir aux chercheurs une infrastructure ouverte, transparente et auto-hébergeable.

## Notre mission

Papex abaisse la barrière d'entrée de l'infrastructure de littérature académique : de la soumission et la gestion des versions à la recherche en texte intégral et aux API ouvertes, tout peut être déployé et étendu librement. Nous privilégions les standards ouverts et la collaboration communautaire plutôt que le verrouillage propriétaire.

## Fonctionnalités clés

- **Soumission et gestion des versions** : articles multi-versions avec résumés, auteurs et PDF archivés de façon permanente ; l'analyse par lot des PDF extrait le texte et les références à l'envoi ; retrait avec motif enregistré.
- **Recherche en texte intégral et avancée** : recherche multilingue (CJK/anglais) `tsvector` + `pg_trgm`, syntaxe booléenne avancée (portée de champ `ti/abs/au/cat/id`, ET/OU/NON, parenthèses), avec filtres par catégorie, auteur et plage de dates et tri par citations.
- **Catégories et étiquettes** : un arbre de catégories thématiques avec référencement croisé, plus des étiquettes créées par les utilisateurs, l'auto-étiquetage et un nuage de tags populaires sur la page d'accueil.
- **Auteurs et affiliations** : profils d'auteurs listant les articles et les affiliations institutionnelles.
- **Citations, analytique et export** : un graphe de citations (relations DOI / identifiant d'article) avec vue à forces dirigées, analyse de co-citation et de co-auteurs, compteurs de citations, et export GB/T 7714 · BibTeX · APA.
- **Bibliométrie** : totaux de citations par auteur, indice H et un réseau de co-auteurs ECharts.
- **Commentaires et discussion** : réponses threadées sur chaque article.
- **Abonnements, alertes et RSS/e-mail** : suivez catégories, auteurs et articles ; un flux consolidé avec compteur de non-lus en direct ; livraison Resend/SMTP ou RSS optionnelle.
- **Signets et groupes** : enregistrement en un clic plus groupes de signets nommés pour organiser une collection de lecture ultérieure.
- **Messages, tickets et retours** : messages internes intégrés, une machine à états de tickets et des retours pour le support communautaire.
- **Co-revue (revue par les pairs)** : une boucle complète d'assignation, de réponse, de soumission d'avis et d'accusé de réception, avec notifications unifiées.
- **Permissions, rôles et parrainage** : accès granulaire basé sur les rôles avec contrôle par rôle ou par utilisateur, une file de modération, et un seuil de parrainage pour la première soumission.
- **Analytique admin** : agrégats de soumission, catégorie, auteur et revue avec graphiques.
- **API ouverte et clés API** : une spécification OpenAPI 3.1 avec documentation interactive, plus des clés API programmatiques qui héritent du RBAC du propriétaire.
- **Profils, thèmes et i18n** : profils personnels et pages `/u/[username]`, thèmes clair/sombre et une interface chinois/anglais.
- **Rédaction via navigateur (Writespace)** : écriture LaTeX dans le navigateur, compilation et publication en un clic.

## Open source

Papex est publié sous la licence [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) et est gratuit pour un usage commercial et non commercial. Les contributions sont les bienvenues via les tickets et les retours.
