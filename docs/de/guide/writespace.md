# Online-Authoring (Writespace)

Dieses Handbuch behandelt das eingebaute **Online-Authoring**-Modul von Papex (Eingang
`/writespace`) – ein browserbasierter Schreibtisch, der weder lokales TeX noch
von Hand geschriebenes JSON benötigt. Er holt den [Einreichungshandbuch](/en/guide/submission)s
„Quellpaket-Upload“-Flow direkt in den Browser: du füllst die Metadaten aus und schreibst
den Body online, und das System erzeugt ein konformes `papex.json` plus Abschnitt-`.tex`-Dateien. Du kannst dann **ein `tar.gz` exportieren** oder **mit einem Klick auf die Plattform veröffentlichen**.

---

## 1. Überblick

### 1.1 Welche Probleme es löst

| Problempunkt beim klassischen „Quellpaket-Upload“ | Was Online-Authoring tut |
| --- | --- |
| `papex.json` von Hand zu schreiben ist fehleranfällig (fehlende Felder, falsches Format) | Visueller Editor + Echtzeit-Validierung |
| Struktur zu prüfen braucht lokales Python / TeX | Zwischen-.tex wird im Browser generiert — keine lokale Toolchain |
| Packen und Hochladen sind zwei getrennte Schritte | „Exportieren“ und „Veröffentlichen“ mit einem Klick aus dem Editor |
| Arbeit während des Entwurfs zu verlieren | Automatisch im Browser-`localStorage` gespeichert |

### 1.2 Die drei Reiter

| Reiter | Zweck |
| --- | --- |
| **Metadaten** | Paper-Infos, Autoren, Referenzen, Build-Optionen — visueller Editor für `papex.json` |
| **Body** | Strukturiertes Abschnitts-/Anhang-Arbeitsbrett zum Schreiben von LaTeX-Body-Text |
| **Export & Veröffentlichen** | Echtzeit-Validierung, Archivdatei-Vorschau, `tar.gz` exportieren / Ein-Klick-Veröffentlichung |

### 1.3 Verhältnis zum Einreichungssystem

Online-Authoring ist **keine** neue Einreichungsmethode — es ist das **Authoring-Front-End**
des „Quellpaket-Uploads“. Das erzeugte Archiv ist byte-für-byte kompatibel mit dem
[Quellpaket-Upload](/en/guide/submission#3-method-2-source-package-upload), und Veröffentlichen
nutzt denselben Backend-Endpunkt `POST /api/submit/archive` und folgt derselben
„entpacken → validieren → Paper erstellen → Zitationsgraph verknüpfen → PDF bauen“-Pipeline
(siehe [Einreichungshandbuch §4](/en/guide/submission#4-end-to-end-processing-flow-backend)).

---

## 2. Eingang und Berechtigungen

- **Eingang**: `/writespace`.
- **Seitenebene-Auth**: die Server-Komponente `src/app/writespace/page.tsx` ruft
  `getCurrentUser()` auf und bei fehlender Authentifizierung `redirect("/login")`.
- **Middleware**: `src/middleware.ts` fügt `/writespace` zu `PROTECTED_PREFIXES` hinzu und fügt
  `/writespace/:path*` zum `matcher` hinzu, sodass nicht authentifizierte Requests an der Kante blockiert werden.
- **Veröffentlichungsberechtigung**: Veröffentlichen ist grundsätzlich ein Quellpaket-Upload und unterliegt
  denselben `FORBIDDEN` / `PAPER_NOT_FOUND`-Regeln im
  [Einreichungshandbuch §4](/en/guide/submission#4-end-to-end-processing-flow-backend) — wenn
  `paper.id` eine neue Version deklariert, musst du Einreichberechtigung für dieses Paper haben.

---

## 3. Reiter eins: Metadaten-Editor

Der **Metadaten**-Reiter entspricht `MetadataEditor`. Er teilt `papex.json`s
`paper` / `authors` / `references` / `build`-Blöcke in kartenartige Formulare, mit Feldern
eins-zu-eins abgeglichen mit [Einreichungshandbuch §3.2](/en/guide/submission#32-papexjson-field-reference).

### 3.1 Paper-Info (`metaPaper`)

Titel, Untertitel, Abstract, Keywords (komma-getrennt), primäre Kategorie (Dropdown, erforderlich),
sekundäre Kategorien (hinzufügen/entfernen), DOI, Lizenz (Dropdown, Standard `CC-BY-4.0`), Venue,
Versionsnotiz, Sprache, Paper-ID (optional — wenn ausgefüllt und zu einem deiner bestehenden
Papers gehörend, als neue Version eingereicht).

### 3.2 Autoren (`metaAuthors`)

- Mehrere Autoren hinzufügen; jede Karte unterstützt Reihenfolge ändern hoch / runter / entfernen.
- Felder: Name (erforderlich), Affiliation, E-Mail, ORCID (formatgeprüft), Homepage, Umschalter korrespondierender
  Autor, Umschalter gleicher Beitrag, Fußnote, Reihenfolge.
- Korrespondierender Autor / gleicher Beitrag / Fußnote werden als `\thanks`-Fußnoten im PDF gerendert;
  ORCID und Homepage erscheinen ebenfalls in Fußnoten.

### 3.3 Referenzen (`metaReferences`)

- Mehrere BibTeX-Einträge hinzufügen; Felder umfassen Zitationsschlüssel (erforderlich, formatgeprüft), Typ
  (Dropdown, 12 BibTeX-Typen), Titel, Autor, Journal, Buchtitel, Jahr, DOI, URL, arXiv-ID,
  Seiten, Band, Nummer, Verlag, Notiz.
- Zwei Zwecke: ① beim Veröffentlichen über `mapReferencesToCitations` in den Plattform-Zitationsgraph eingehängt;
  ② beim Export zur automatischen Generierung von `references.bib` genutzt
  (siehe [§7](#7-exported-archive-structure)).

### 3.4 Build-Optionen (`metaBuild`)

- Literaturstil: `numeric` / `authoryear` (in das Hauptdokument injiziert als
  `\documentclass[11pt,bibstyle=authoryear]`).
- Spalten: `1` / `2` (zweispaltig injiziert `twocolumn`).
- Weitere `build`-Optionen (z. B. `fontset`, `documentclass`) sind für die server-seitige
  Kompilierung reserviert; Defaults siehe `createDefaultDraft`.

### 3.5 Echtzeit-Validierung

Jede Bearbeitung läuft durch `validateDraft()` (`src/lib/writespace/manifest.ts`); das Ergebnis wird
mit dem Reiter **Export & Veröffentlichen** geteilt. Kernregeln:

| Prüfung | Regel | Typ |
| --- | --- | --- |
| `schemaVersion` | muss `x.y.z` entsprechen | Fehler |
| `paper.title` / `abstract` / `primaryCategoryId` | erforderlich und nicht leer | Fehler |
| `paper.id` (optional) | falls vorhanden muss `YYMM.NNNNN` entsprechen | Fehler |
| `authors` | mindestens 1; jeder `name` erforderlich; `orcid` muss `0000-0000-0000-0000` entsprechen | Fehler |
| `sections` | mindestens 1; jeder `file` erforderlich; `id` nur Buchstaben, Ziffern, `-`, `_` | Fehler |
| `references` | jeder `key` erforderlich, beschränkt auf `A-Za-z0-9_:+.-`; `year` ∈ [0, 3000] | Fehler |
| leerer Abschnittsbody | Hinweis | Warnung |

> „Fehler“ blockieren das Veröffentlichen; „Warnungen“ (z. B. ein leerer Abschnittsbody) sind nur Hinweise.

---

## 4. Reiter zwei: Body-Arbeitsbrett

Der **Body**-Reiter entspricht `SectionsEditor` und verwaltet den Paper-Body und Anhänge
strukturell.

### 4.1 Abschnittsliste

- Jeder Abschnitt (oder Anhang) ist eine einklappbare Karte mit: id/Dateiname (`file`, z. B.
  `sections/intro.tex`), Abschnittstitel, Ebene (`section` / `subsection` / `subsubsection` /
  `chapter` / `part`), Body (LaTeX-Textbereich), Zeichenzahl.
- Unterstützt: Abschnitt hinzufügen, Anhang hinzufügen, hoch / runter, entfernen.
- Die Ebene bestimmt den beim Export ausgegebenen Befehl (`\section{Titel}` → `\input{sections/intro.tex}`).

### 4.2 Body-Inhaltsregeln

- Abschnitt-`.tex` wird von Hand geschrieben und unterstützt **volles LaTeX**: Mathe, Abbildungen, eigene Befehle,
  und `\cite{key}`-Referenzen (passend zu den Referenzschlüsseln).
- Abschnittsbody wird **nicht escaped** (konsistent mit
  [Einreichungshandbuch §3.3](/en/guide/submission#33-xelatex-toolchain-papex-latex)); nur
  die Klartextfelder in „Metadaten“ werden escaped.
- Ein Button „Beispielabschnitte einfügen“ schreibt fünf Demonstrationsabschnitte (Intro / Verwandte Arbeiten /
  Methode / Experimente / Fazit) mit LaTeX-Formeln für einen schnellen Start.

### 4.3 Anhänge

Anhang-Einträge teilen die Abschnittsstruktur und werden nach einem einzelnen `\appendix` ausgegeben.

---

## 5. Reiter drei: Export & Veröffentlichen

Der Reiter **Export & Veröffentlichen** entspricht `ExportPanel` — dem Ausgang des gesamten Flows.

### 5.1 Validierungsstatus

Zeigt oben das live `validateDraft()`-Ergebnis: „gültig“ oder „ungültig“ plus eine Fehler-/Warnliste.
Der Button **Veröffentlichen** ist bei vorhandenen Fehlern deaktiviert.

### 5.2 Datei-Manifest-Vorschau

Zeigt die Archivdateien, die erzeugt werden (also die Ausgabe von `buildArchiveFiles`,
[§7](#7-exported-archive-structure)), damit du die Struktur vor dem Download/Veröffentlichen bestätigen kannst.

### 5.3 `tar.gz` exportieren

Klicke **Exportieren**: ein `tar.gz` wird vollständig im Browser erzeugt und löst einen Download aus
(Dateiname aus i18n `writespace.expDownloadName`).

- Völlig **abhängigkeitsfrei**: `src/lib/writespace/targz.ts` rollt POSIX-ustar-Packen plus
  das native `CompressionStream('gzip')` von Hand — kein Backend beteiligt.
- Vorlagen-Assets (`papex-template.tex` / `papex.cls`) werden beim Export von
  `/writespace/papex-template.tex` und `/writespace/papex.cls` geholt und in das Archiv gebündelt,
  das es **selbstständig** hält (das Backend kompiliert direkt über `latexmk`).

### 5.4 Ein-Klick-Veröffentlichung

Klicke **Veröffentlichen**: führt dieselben Generierungsschritte wie der Export aus, dann `POST`et das
`tar.gz` als `file`-Feld eines `multipart/form-data`-Requests an `/api/submit/archive`.

- Veröffentlichen erfordert vorab `validation.valid === true`.
- Bei Erfolg zeigt es die zurückgegebene „Paper-ID + Version“ und `warnings` mit einem „Paper ansehen“-
  Link und löscht das lokale Entwurfs-Flag.
- Bei Fehler zeigt es die Backend-Fehlermeldung inline an (Mapping im
  [Einreichungshandbuch §4-Fehlertabelle](/en/guide/submission#4-end-to-end-processing-flow-backend)).

---

## 6. Auto-Speichern und Entwurfswiederherstellung

- Der Entwurf (`manifest` + Body pro Abschnitt) speichert sich automatisch in den Browser-`localStorage`
  (Schlüssel: `papex-writespace-draft`), entprellt 400ms — übersteht das Schließen der Seite.
- Erneutes Öffnen von `/writespace` stellt den letzten Entwurf automatisch wieder her und zeigt „lokaler Entwurf wiederhergestellt“;
  nach dem Bearbeiten zeigt es „automatisch gespeichert“.
- Der obere Button **Neu** fragt zur Bestätigung, leert `localStorage` und setzt auf einen leeren
  Entwurf zurück (mit einem Beispiel-Intro-Abschnitt).

> Entwürfe leben nur im lokalen Browser; Gerätewechsel oder Leeren der Browserdaten gehen verloren.
> Für wichtige Arbeit: denk daran, **Exportieren** oder **Veröffentlichen**.

---

## 7. Exportierte Archivstruktur

Das von **Export / Veröffentlichen** erzeugte `tar.gz` wird von `buildArchiveFiles()` zusammengesetzt und ist
vollständig kompatibel mit dem, was das Backend `papex-archive.ts` erwartet:

```
my-paper.tar.gz
├── papex.json            # Editor-Manifest, serialisiert (2-Leerzeichen-Einzug)
├── papex-template.tex    # Hauptdokument mit injiziertem bibstyle/twocolumn
├── papex.cls             # Dokumentenklasse (gebündelt aus /writespace/papex.cls)
├── references.bib        # automatisch aus Referenzen generiert (weggelassen, falls keine)
├── sections/
│   ├── intro.tex         # der Abschnitt, den du in „Body“ geschrieben hast
│   └── …
└── _papex_*.tex          # automatisch generierte Zwischenfragmente (nicht bearbeiten)
    ├── _papex_meta.tex       # Titel/Autoren/Affiliationen/Keywords/laufender Titel
    ├── _papex_abstract.tex   # Abstract
    ├── _papex_sections.tex   # \section + \input-Zusammenbau
    ├── _papex_backmatter.tex # Danksagung/Förderung
    └── _papex_appendices.tex # \appendix + Anhänge
```

- Die `_papex_*.tex`-Dateien werden von `genMeta` / `genAbstract` / `genSections` /
  `genBackmatter` / `genAppendices` erzeugt; Klartextfelder durchlaufen ein einfaches `latexEscape`,
  während Abschnittsbodies per `\input` wortwörtlich übernommen werden.
- Dieses Archiv kann manuell auf der „Quellpaket-Upload“-Seite hochgeladen oder automatisch vom
  Button **Veröffentlichen** eingereicht werden — beide sind gleichwertig.

---

## 8. Implementierungshinweise

| Anliegen | Implementierung |
| --- | --- |
| Datenmodell | `src/lib/writespace/manifest.ts`: Typen abgeglichen mit `papex.schema.json` + `papex-json.ts`, reines Frontend, keine Server-Imports |
| LaTeX-Generierung | `src/lib/writespace/latex-gen.ts`: portiert `papex-build.py`-Logik nach TS; Escaping nutzt einen **einpassigen Zeichenscan** (konsistent mit dem festen `papex-build.py`, vermeidet erneutes Escapen von `\textbackslash{}`) |
| Packen | `src/lib/writespace/targz.ts`: von Hand gerolltes ustar + `CompressionStream('gzip')`, null Abhängigkeiten, reiner Browser |
| Vorlagen-Assets | `public/writespace/papex.cls` + `papex-template.tex` (kopiert aus `papex-latex/`, LF-normalisiert), zur Laufzeit ins Archiv geholt |
| Orchestrierung | `src/components/writespace/writespace-client.tsx`: drei `Tabs` + Entwurfs-Persistenz + Export/Veröffentlichen |
| Internationalisierung | `src/i18n/dictionaries/{zh,en}.ts` `writespace`-Block (~70 Schlüssel), passend zu UI-Labels |

---

## 9. Sicherheit und Grenzen

- **Berechtigungen**: sowohl Eingang als auch Veröffentlichen erfordern Login; ein Ziel-Paper für eine neue Version muss dem
  aktuellen Benutzer gehören (oder eine privilegierte Rolle haben), sonst gibt das Backend `FORBIDDEN` zurück.
- **Keine Server-Persistenz**: alle Generierung und das Packen laufen im Browser-Speicher; Dateien verlassen
  das Gerät nur, wenn du Download/Veröffentlichen klickst. Die Plattform wendet weiterhin die TeX-Sandbox,
  Größenlimits und Shell-Escape-Deaktivierung aus dem
  [Einreichungshandbuch §6/§7](/en/guide/submission#6-deployment-and-ops) an.
- **Browser-Support**: `CompressionStream('gzip')` braucht einen neueren Browser (Chrome/Edge 80+,
  Firefox 113+, Safari 16.4+); wenn nicht verfügbar, schlägt der Export mit einer freundlichen Meldung fehl.
- **50MB-Limit**: Veröffentlichen läuft über `/api/submit/archive` und unterliegt demselben 50MB-Limit.

---

## 10. FAQ

**F: Online-Authoring vs. Quellpaket-Upload — was nutzen?**
Beides. Online-Authoring eignet sich für Autoren, die keine Kommandozeile wollen und live validieren möchten;
Quellpaket-Upload eignet sich für die mit lokalem TeX-Projekt, die `papex-build.py`-Feinsteuerung wollen.
Beide erzeugen identische Ergebnisse in der Datenbank.

**F: Kann das exportierte `tar.gz` manuell auf der „Quellpaket-Upload“-Seite hochgeladen werden?**
Ja, und es ist gleichwertig. Das exportierte Archiv bündelt bereits `papex.cls` und
`papex-template.tex`, sodass das Backend sie nicht aus `PAPEX_LATEX_DIR` kopieren muss.

**F: Ich habe `\cite{key}` im Body genutzt, aber die Zitation wurde nach dem Veröffentlichen nicht verknüpft?**
Zitationsverknüpfung hängt davon ab, dass die `doi` / `arxivId` der Referenz zu einem bereits auf der
Plattform vorhandenen Paper passt; Einträge mit nur `url` / `title` landen im Zitationsgraph, bilden aber keinen internen
Link. Prüfe, dass die DOI / arXiv-ID der Referenz korrekt ist.

**F: Werden Entwürfe in die Cloud synchronisiert?**
Nein. Entwürfe leben nur im Browser-`localStorage`; Gerätewechsel oder Cache-Leeren gehen verloren.
Mach zur Gewohnheit, **Exportieren** oder **Veröffentlichen**.

**F: Werden `$...$`-Formeln im Body verstümmelt?**
Nein. Abschnitt-`.tex` wird wortwörtlich geschrieben (kein Escaping); Formeln werden von der Backend-XeLaTeX-
Kompilierung gerendert. Nur die Klartextfelder in „Metadaten“ werden escaped.

**F: Kein PDF sofort nach Veröffentlichen?**
Wie im [Einreichungshandbuch-FAQ](/en/guide/submission#8-faq): es hängt davon ab, ob der Server
TeX Live konfiguriert hat; wenn nicht, ist `pdfUrl` leer und die Seite zeigt „PDF wird im Hintergrund gebaut“.
