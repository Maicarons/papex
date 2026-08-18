# Über Papex

Papex ist eine **Open-Source-, unabhängige** Plattform zum Verwalten und Entdecken wissenschaftlicher Literatur. Unser Ziel ist es, Forschern offene, transparente und selbst hostbare Infrastruktur bereitzustellen.

## Unsere Mission

Papex senkt die Hürde für Literatur-Infrastruktur: von der Einreichung und Versionierung über die Volltextsuche bis zu offenen APIs lässt sich alles frei bereitstellen und erweitern. Wir schätzen offene Standards und Community-Zusammenarbeit mehr als Lock-in.

## Kernfunktionen

- **Einreichung & Versionierung**: mehrversionige Papers mit dauerhaft archivierten Abstracts, Autoren und PDFs; das Batch-PDF-Parsing extrahiert beim Upload Text und Referenzen; Zurückziehen mit protokolliertem Grund.
- **Volltext- & erweiterte Suche**: `tsvector` + `pg_trgm` mehrsprachige (CJK/Englisch) Suche, erweiterte boolesche Syntax (`ti/abs/au/cat/id`-Feld-Scoping, AND/OR/NOT, Klammern), mit Kategorie-, Autoren- und Datumsbereichsfiltern sowie Zitat-Sortierung.
- **Kategorien & Tags**: ein Baum von Fachkategorien mit Querverweisen, plus vom Benutzer erstellte Tags, Auto-Tagging und eine Hot-Tag-Wolke auf der Startseite.
- **Autoren & Affiliationen**: Autorenprofile, die Papers und institutionelle Affiliationen auflisten.
- **Zitationen, Analytik & Export**: ein Zitationsgraph (DOI-/Paper-ID-Beziehungen) mit kraftbasierter Darstellung, Ko-Zitations- und Mitautoren-Analyse, Zitationszähler und GB/T 7714 · BibTeX · APA-Export.
- **Bibliometrie**: Zitationen pro Autor, H-Index und ein ECharts-Mitautoren-Netzwerk.
- **Kommentare & Diskussion**: verschachtelte Antworten auf jedem Paper.
- **Abonnements, Benachrichtigungen & RSS/E-Mail**: Kategorien, Autoren und Papers folgen; ein zusammengeführter Feed mit Live-Badge für Ungelesenes; optional Resend/SMTP- oder RSS-Zustellung.
- **Lesezeichen & Gruppen**: Ein-Klick-Speichern plus benannte Lesezeichengruppen zum Organisieren einer Lese-later-Sammlung.
- **Nachrichten, Tickets & Feedback**: eingebaute interne Nachrichten, eine Ticket-Statusmaschine und Feedback für die Community-Unterstützung.
- **Co-Review (Peer-Review)**: ein vollständiger Kreislauf aus Zuweisen, Antworten, Stellungnahme einreichen und Empfangsbestätigung, mit einheitlichen Benachrichtigungen.
- **Berechtigungen, Rollen & Empfehlung**: rollenbasierter, feingranularer Zugriff mit Steuerung pro Rolle oder pro Benutzer, eine Moderations-Warteschlange und ein Empfehlungs-Gate für die Ersteinreichung.
- **Admin-Analytik**: Einreichungs-, Kategorie-, Autoren- und Review-Aggregate mit Diagrammen.
- **Open API & API-Keys**: eine OpenAPI-3.1-Spezifikation mit interaktiver Dokumentation, plus programmatische API-Keys, die die RBAC des Eigentümers erben.
- **Profile, Themes & i18n**: persönliche Profile und `/u/[username]`-Seiten, Hell-/Dunkel-Themes und eine chinesisch/englische Oberfläche.
- **Browserbasiertes Authoring (Writespace)**: LaTeX-Schreiben, Kompilieren und Ein-Klick-Veröffentlichung im Browser.

## Open Source

Papex wird unter [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) lizenziert und ist frei für kommerzielle und nicht-kommerzielle Nutzung. Beiträge sind über Tickets und Feedback willkommen.
