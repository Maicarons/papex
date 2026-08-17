# About Papex

Papex is an **open-source, independent** platform for managing and discovering academic literature. Our goal is to provide researchers with open, transparent and self-hostable infrastructure.

## Our mission

Papex lowers the barrier to academic literature infrastructure: from submission and versioning to full-text search and open APIs, everything can be freely deployed and extended. We value open standards and community collaboration over lock-in.

## Key features

- **Submission & versioning**: multi-version papers with permanently archived abstracts, authors and PDFs; batch PDF parsing extracts text and references on upload; withdraw with a recorded reason.
- **Full-text & advanced search**: `tsvector` + `pg_trgm` multilingual (CJK/English) search, advanced boolean syntax (`ti/abs/au/cat/id` field scoping, AND/OR/NOT, parentheses), with category, author and date-range filters and citation sorting.
- **Categories & tags**: a tree of subject categories with cross-listing, plus user-created tags, auto-tagging and a homepage hot-tag cloud.
- **Authors & affiliations**: author profiles that list papers and institutional affiliations.
- **Citations, analytics & export**: a citation graph (DOI / paper-id relations) with a force-directed view, co-citation and co-author analysis, citation counts, and GB/T 7714 · BibTeX · APA export.
- **Bibliometrics**: per-author citation totals, H-index and an ECharts co-author network.
- **Comments & discussion**: threaded replies on every paper.
- **Subscriptions, alerts & RSS/email**: follow categories, authors and papers; a consolidated feed with a live unread badge; optional Resend/SMTP or RSS delivery.
- **Bookmarks & groups**: one-click save plus named bookmark groups to organize a read-later collection.
- **Messages, tickets & feedback**: built-in internal messages, a ticket status machine and feedback for community support.
- **Co-review (peer review)**: a complete loop of assign, respond, submit opinion and receipt, with unified notifications.
- **Permissions, roles & endorsement**: role-based fine-grained access with per-role or per-user control, a moderation queue, and a first-submission endorsement gate.
- **Admin analytics**: submission, category, author and review aggregates with charts.
- **Open API & API keys**: an OpenAPI 3.1 spec with interactive docs, plus programmatic API keys that inherit the owner's RBAC.
- **Profiles, themes & i18n**: personal profiles and `/u/[username]` pages, light/dark themes and a Chinese/English interface.
- **Browser-based authoring (Writespace)**: in-browser LaTeX writing, compilation and one-click publishing.

## Open source

Papex is licensed under [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) and is free for commercial and non-commercial use. Contributions are welcome via tickets and feedback.
