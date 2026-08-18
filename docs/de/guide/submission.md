# Einreichungshandbuch

Dieses Handbuch erklärt die zwei von Papex unterstützten Paper-Einreichungsmethoden und
liefert eine vollständige Referenz für die **Quellpaket-Einreichung** samt ihrem
`papex.json`-Manifest und der XeLaTeX-Toolchain.

---

## 1. Überblick

Papex bietet zwei Einreichungswege für unterschiedliche Arbeitsabläufe:

| Methode | Eingang | Zielgruppe | Merkmale |
| --- | --- | --- | --- |
| **Formular-Einreichung** | Web-Seite „Einreichen → Formular“ / `POST /api/papers` | Gelegentliche Einreicher | Titel, Abstract, Autoren usw. im Browser ausfüllen; **Volltext-PDF direkt hochladen** (≤50MB) |
| **Quellpaket-Upload** | Web-Seite „Einreichen → Quellpaket“ / `POST /api/submit/archive` | LaTeX-Autoren | Quellen mit einem `papex.json`-Manifest zu einem `tar.gz` packen; die Plattform **erstellt das Paper, verknüpft Zitationen und baut das PDF** automatisch |

> Beide Methoden teilen sich dieselbe Ingestions-Logik (`createSubmission` + `addCitation`).
> Sie unterscheiden sich nur darin, woher die Metadaten kommen und wie Body/PDF erzeugt werden.

> **Keine Lust auf die Kommandozeile?** Du kannst auch das eingebaute
> [Online-Authoring](/en/guide/writespace)-Modul nutzen, um `papex.json` visuell zu bearbeiten, den Body
> zu schreiben und „tar.gz exportieren“ oder „mit einem Klick veröffentlichen“ direkt im Browser – das
> erzeugte Archiv ist einem Quellpaket-Upload vollkommen gleichwertig.

---

## 2. Methode 1: Formular-Einreichung

Klicke oben in der Navigation auf **Einreichen**, wähle den Reiter **Formular**, fülle die Felder
aus und klicke auf „Paper einreichen“:

- **Titel**, **Abstract**
- **Primäre Kategorie** (erforderlich, Code aus dem Kategoriebaum z. B. `cs.LG`),
  **Querkategorien** (komma-getrennt, optional)
- **Autoren** (beliebig viele hinzufügen; die Reihenfolge ist die Autorenreihenfolge)
- **PDF hochladen** (optional): PDF per Drag & Drop ablegen oder auswählen (≤50MB); die Plattform speichert es
  und verknüpft Referenzen automatisch. **DOI** (optional), **Lizenz** (Standard `CC-BY-4.0`),
  **Versionsnotiz** (optional)

Das Paper gelangt dann in die Review-Warteschlange. Die Formular-Einreichung wird als `multipart/form-data` gesendet:
`meta` ist ein JSON-String der Metadaten, `pdf` ist die optionale PDF-Datei.

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

> Das PDF ist optional. Wenn angegeben, speichert der Endpunkt es zur Paper-Version,
> parst den Body, verknüpft plattforminterne Zitationen und gibt
> `{ pdfUrl, pages, referencesExtracted, referencesLinked }` zurück. Das Web-Formular sendet dies
> automatisch; API-Clients dürfen weiterhin reines JSON (ohne `pdf`) per POST senden.

---

## 3. Methode 2: Quellpaket-Upload

Der Quellpaket-Upload ist ein **Autoren-Workflow**: du schreibst das Paper in LaTeX, beschreibst
die Metadaten und Referenzen in einem strukturierten `papex.json`, packst alles in ein
`tar.gz` und lädst es in einem Schritt hoch. Das Backend übernimmt „entpacken → validieren → ingestieren →
Zitationen verknüpfen → PDF bauen“ von Anfang bis Ende.

### 3.1 Paketstruktur

Ein minimales, aber empfohlenes Paket-Layout:

```
my-paper.tar.gz
├── papex.json            # erforderlich: Paper-Manifest (Metadaten + Abschnitte + Referenzen)
├── papex-template.tex    # Hauptdokument (verwende das repo-eigene papex-template.tex)
├── papex.cls             # Dokumentenklasse (optional; Server kopiert sie aus PAPEX_LATEX_DIR, falls fehlend)
├── references.bib        # optional: handgeschriebenes BibTeX; sonst automatisch aus Referenzen generiert
└── sections/             # Body-Abschnitte (.tex-Fragmente, in Reihenfolge von papex.json referenziert)
    ├── 00-intro.tex
    ├── 01-related.tex
    └── …
```

> Das Paket **muss `papex.json` enthalten**; andernfalls wird der Upload abgelehnt (HTTP 400).

### 3.2 `papex.json`-Feldreferenz

Das vollständige JSON-Schema liegt unter [`papex-latex/papex.schema.json`](https://github.com/).
Kernfelder und ihre Ziele:

| Feld | Typ | Erforderlich | Hinweise / DB-Ziel |
| --- | --- | --- | --- |
| `paper.id` | string (`YYMM.NNNNN`) | nein | Wenn es **dein eigenes (oder admin) bestehendes Paper** trifft → als neue Version eingereicht; sonst wird eine neue Paper-ID zugewiesen |
| `paper.title` | string | ja | → `papers.title` / `paper_versions.title` |
| `paper.abstract` | string | ja | → `paper_versions.abstract` |
| `paper.keywords` | string[] | nein | Im PDF nach dem Abstract gerendert (nicht separat gespeichert) |
| `paper.primaryCategoryId` | string | ja | → `papers.primaryCategoryId`; **muss existieren** in der Kategorietabelle oder 400 |
| `paper.secondaryCategoryIds` | string[] | nein | → `paper_categories` (nicht-primär) |
| `paper.doi` | string | nein | → `paper_versions.doi`, ebenfalls in den Zitationsgraph geschrieben (`target_doi`) |
| `paper.license` | string | nein | → `paper_versions.license`, Standard `CC-BY-4.0` |
| `paper.versionNote` | string | nein | → `paper_versions.comments` |
| `paper.subtitle` | string | nein | Unter dem Titel im PDF gerendert |
| `paper.venue` | string | nein | Im Titelblock gerendert (z. B. Konferenz/Journal) |
| `authors[].name` | string | ja | → `authors` + `paper_authors` (geordnet nach `order`) |
| `authors[].orcid` | string | nein | Autoren-Fußnote |
| `authors[].email` | string | nein | Als Kontakt des korrespondierenden Autors verwendet |
| `authors[].affiliation` | string | nein | **String** → über `findOrCreateAffiliation` zu `affiliations.id` aufgelöst |
| `authors[].corresponding` | boolean | nein | Fußnote „Korrespondierender Autor“ |
| `authors[].equalContribution` | boolean | nein | Fußnote „Gleicher Beitrag“ |
| `authors[].footnote` | string | nein | Freitext-Fußnote |
| `references[].key` | string | ja | BibTeX-Zitationsschlüssel |
| `references[].doi` / `arxivId` | string | nein | Über `resolveTarget` zu einem plattforminternen Paper aufgelöst; sonst gehen `url`/`title` in `citations` |
| `references[].url` / `title` / `authors` / `year` / `venue` | string | nein | Füllen `citations` und das automatisch generierte `references.bib` |
| `sections[]` | string[] | ja | Geordnete Liste von Abschnitt-`.tex`-Pfaden; **steuert nur LaTeX, wird nicht in Tabellen gespeichert** |
| `appendices[]` | string[] | nein | Geordnete Liste von Anhang-`.tex`-Pfaden |
| `acknowledgments` / `funding` | string | nein | Im Danksagungs-/Förderungsabschnitt des PDFs gerendert |
| `build` | object | nein | Build-Optionen: `style` (numeric/authoryear), `fontset` (fandol/windows/mac/ubuntu), `passthrough` (von Escaping ausgenommene Felder), usw. |

> **Unterschied zur Formular-Einreichung**: `papex.json` verwendet eine `affiliation` als **String**
> statt einer numerischen `affiliationId`; die Mapping-Schicht sucht die
> `affiliations`-Zeile oder legt sie an. Es fügt außerdem LaTeX-only-Felder `sections`, `references`,
> `appendices`, `build` hinzu.

### 3.3 XeLaTeX-Toolchain (`papex-latex/`)

Eine eigene XeLaTeX-Toolchain liegt in [`papex-latex/`](https://github.com/):

```
papex-latex/
├── papex.cls              # Dokumentenklasse (ctex + authblk + biblatex, CJK+Englisch, Metadaten-Makros, Kopf-/Fußzeilen)
├── papex-template.tex     # Hauptdokument, auto \input der generierten _papex_*.tex und Abschnitte
├── papex-build.py         # Abhängigkeitsfreier Builder (nur stdlib; optional jsonschema)
├── papex.schema.json      # draft-07-Manifest-Vertrag
├── latexmkrc              # optionale latexmk-Konfiguration
├── README.md              # Toolchain-Nutzung
└── example/               # vollständiges Beispielpaket (chinesisches Paper + 5 Abschnitte + Anhang)
```

**`papex.cls`-Highlights**

- **CJK + Englisch**: aufbaut auf `ctex` (`scheme=plain`), Standard `fontset=fandol` (mit TeX Live
  ausgeliefert, kompiliert auf dem Server direkt); lokal umschalten mit
  `windows` / `mac` / `ubuntu`.
- **Autoren/Affiliationen**: `authblk` mit geteilten Affiliationen, korrespondierendem Autor und
  Gleicher-Beitrag-Fußnoten.
- **Referenzen**: `biblatex` + `biber`, `numeric` / `authoryear` wählbar.
- **Metadaten-Makros**: `\papexPaperId` (Paper-ID über dem Titel), `\papexSubtitle`,
  `\papexVenue`, `\papexDoi` (automatischer doi.org-Link), `\papexVersionNote`, `\papexKeywords`
  (nach dem Abstract), `\papexLicense` (Fußzeile), `\papexRunningTitle` (Kopfzeile).
- **Markenunabhängig**: keine *preprints / arXiv*-Formulierungen, konsistent mit der
  „arXiv-freien“ Produktkonvention.

**`papex-build.py`-Ablauf**

1. `papex.json` lesen (Eingabe kann ein Verzeichnis / einzelnes json / `.tar.gz` sein).
2. Validieren (bevorzugt `jsonschema`, sonst eingebaute Prüfungen).
3. Klartextfelder escapen (`title` / `abstract` / `authors` / `affiliation` /
   `keywords` / `acknowledgments` …), wobei `_papex_meta.tex`, `_papex_abstract.tex`,
   `_papex_sections.tex`, `_papex_backmatter.tex`, `_papex_appendices.tex` und
   `references.bib` generiert werden (übersprungen, wenn das Archiv bereits `references.bib` mitbringt).
4. Mit `latexmk -xelatex` kompilieren (`--emit-only` gibt nur Zwischenstufen aus,
   `--validate` validiert nur).
5. Abschnitt-`.tex`-Dateien werden vom Autor von Hand geschrieben und unterstützen volles LaTeX
   (inkl. Mathe); sie werden **nicht escaped**. Nutze `build.passthrough`, um JSON-Textfelder
   vom Escaping auszunehmen.

### 3.4 Lokale Vorschau & Build

```bash
# in das Beispielpaket wechseln
cd papex-latex/example

# nur Zwischen-.tex/.bib ausgeben (kein TeX nötig — nützlich zum Prüfen von Escaping/Struktur)
python3 ../papex-build.py . --emit-only

# nur papex.json validieren
python3 ../papex-build.py . --validate

# PDF generieren und kompilieren (benötigt lokales TeX Live)
python3 ../papex-build.py .
```

Packen und einreichen:

```bash
tar -czf my-paper.tar.gz papex.json papex-template.tex references.bib sections/
```

### 3.5 Upload auf der Website

1. Klicke nach dem Anmelden oben in der Navigation auf **Einreichen** und wähle den
   Reiter **Quellpaket**.
2. Ziehe das `tar.gz` in die Ablagezone, oder klicke zum Dateiauswählen (nur `.tar.gz` /
   `.tgz`, ≤ 50MB).
3. Klicke auf „Hochladen & einreichen“; die Plattform gibt die Paper-ID und Version zurück, mit
   Verarbeitungshinweisen (z. B. PDF wird im Hintergrund gebaut).
4. Klicke auf „Paper ansehen“, um zur neu erstellten Paper-Seite zu springen.

---

## 4. End-to-End-Verarbeitung (Backend)

Nach dem Upload verarbeitet das Backend das Paket wie folgt (Quelle unter
`src/lib/latex/`):

```
author ──tar.gz──> POST /api/submit/archive (multipart: file)
                         │
                         ▼
                  ① entpacken (tar.ts)
                     zero-dep gunzip + ustar/GNU/PAX-Parser, Path-Traversal-Schutz
                         │
                         ▼
                  ② papex.json lesen → coerceManifest() validiert Pflichtfelder
                         │
                         ▼
                  ③ mapToCreatePaperInput()
                     · primaryCategoryId muss existieren (sonst 400)
                     · Affiliation-String → affiliations.id (findOrCreateAffiliation)
                     · paper.id trifft eigenes/privilegiertes Paper → neue Version
                         │
                         ▼
                  ④ createSubmission() ingestiert (nutzt bestehende Transaktion)
                         │
                         ▼
                  ⑤ mapReferencesToCitations() → addCitation() verknüpft den Zitationsgraph
                         │
                         ▼
                  ⑥ optionaler XeLaTeX-Build (Server-latexmk)
                     → savePdfBuffer() speichert → aktualisiert paper_versions.pdfUrl
                     (fehlendes latexmk → nur Warnung, Ingestion unbeeinflusst)
                         │
                         ▼
                 gibt { paperId, version, warnings, pdfUrl? } zurück
```

**Schlüsselmodule**

| Datei | Zuständigkeit |
| --- | --- |
| `src/lib/latex/tar.ts` | Zero-dep `gunzip` + `parseTar` (ustar / GNU long names / PAX extended headers), `writeEntries` mit Path-Traversal-Schutz |
| `src/lib/latex/papex-json.ts` | `PapexManifest`-Typen, `coerceManifest`, `mapToCreatePaperInput`, `mapReferencesToCitations` |
| `src/lib/latex/papex-archive.ts` | `processSubmissionArchive`-Orchestrierung; `buildAndStorePdf` prüft `latexmk` und kompiliert/speichert PDF |
| `src/app/api/submit/archive/route.ts` | Nimmt `multipart/form-data` `file` (≤50MB) an, authentifiziert, mappt Fehler auf HTTP-Status |

**Fehlercode-Zuordnung (HTTP)**

| Interner Fehler | HTTP | Bedeutung |
| --- | --- | --- |
| `MANIFEST_MISSING` | 400 | Archiv ohne `papex.json` |
| `MANIFEST_JSON_INVALID` | 400 | `papex.json` ist kein gültiges JSON |
| `MANIFEST_INVALID:…` | 400 | Fehlendes Pflichtfeld (title/abstract/primaryCategoryId/authors/sections) |
| `CATEGORY_NOT_FOUND:cs.X` | 400 | Kategoriecode existiert nicht |
| `ARCHIVE_PARSE_FAILED` / `ARCHIVE_EMPTY` | 400 | Archiv beschädigt oder leer |
| `FORBIDDEN` | 403 | Keine Berechtigung, eine neue Version dieses Papers einzureichen |
| `PAPER_NOT_FOUND` | 404 | Erklärtes Ziel-Paper für die neue Version existiert nicht |
| other | 500 | Interner Fehler (inkl. `ID_GENERATION_FAILED`) |

---

## 5. API-Referenz

### `POST /api/papers`

Endpunkt für Formular-Einreichung. Request ist `multipart/form-data` (siehe
[Abschnitt 2](#2-method-1-form-submission)): Feld `meta` ist ein JSON-String der Metadaten,
Feld `pdf` ist die optionale PDF-Datei (≤50MB). Benötigt Auth. Gibt `{ paperId, version }` zurück,
und bei hochgeladenem PDF zusätzlich ein `pdf: { pdfUrl, pages, referencesExtracted, referencesLinked }`.
API-Clients dürfen auch reines JSON (ohne `pdf`) per POST senden.

### `POST /api/submit/archive`

Endpunkt für Quellpakete.

- **Auth**: erforderlich (Cookie).
- **Request**: `multipart/form-data`, Feld `file` ist das `tar.gz` (≤ 50MB).
- **Erfolg (201)**:

  ```json
  {
    "paperId": "2608.00007",
    "version": 1,
    "warnings": [],
    "pdfUrl": "https://…/api/papers/2608.00007/pdf/1"
  }
  ```

- **Fehler**: JSON mit der entsprechenden Fehlermeldung; Statuscodes gemäß der
  [Fehlertabelle](#4-end-to-end-processing-backend).

---

## 6. Deployment & Betrieb

- **TeX Live**: der Server benötigt `texlive` (mit `xelatex`, `biber`, `latexmk`) und
  `collection-langchinese`, damit die `fandol`-Fonts verfügbar sind.
- **Umgebungsvariablen**:
  - `PAPEX_LATEX_BIN`: Pfad zu latexmk (Standard `PATH`).
  - `PAPEX_LATEX_DIR`: Verzeichnis mit `papex.cls`; wird kopiert, wenn das Archiv es weglässt.
- **Sandbox & Ressourcen**: LaTeX-Kompilierung in isolierter Umgebung mit
  CPU/Speicher/Timeout-Limits ausführen und **`\write18` (Shell-Escape)** sowie Netzwerkzugriff
  deaktivieren, um bösartige Quellen am Ausführen von Befehlen zu hindern.
- **Async**: Kompilierung ist langsam; in der Produktion wird eine **Async-Queue** empfohlen
  (gibt `paperId` sofort zurück, Callback zum Aktualisieren von `pdfUrl`, wenn das PDF fertig ist),
  um den Request nicht zu blockieren.
- **Fehlendes Degradation**: ist `latexmk` nicht verfügbar, protokolliert `processSubmissionArchive`
  `warnings` und überspringt den PDF-Build; Ingestion und Zitationsverknüpfung funktionieren weiter.
- **PDF-Speicher**: nutzt erneut `savePdfBuffer` (Streaming-Route `/api/papers/{id}/pdf/{version}`);
  keine neue Speicherschicht nötig.

---

## 7. Sicherheit

- **Path Traversal**: `writeEntries` prüft den echten Pfad jedes Eintrags mit
  `path.relative` und verwirft `..` und absolute Pfade; `parseTar` entfernt führende `./`.
- **Größenlimit**: die Route begrenzt `file` auf ≤ 50MB.
- **Ressourcenmissbrauch**: Kompilierung hat Timeout/Ressourcenlimits; ggf. Rate-Limiting pro Benutzer erwägen.
- **shell-escape**: der Compile-Befehl übergibt kein `-shell-escape` und verhindert so,
  dass Quellen Systembefehle ausführen.

---

## 8. FAQ

**F: Dupliziert das Quellpaket Daten aus der Formular-Einreichung?**
Nein. Beide teilen sich dieselbe Ingestions-Logik; nur die Metadatenquelle unterscheidet sich.

**F: Muss ich die XeLaTeX-Vorlage verwenden?**
`papex.cls` und `papex-template.tex` bestimmen das finale PDF-Layout; du schreibst nur die
Abschnitt-`.tex`-Dateien und `papex.json`. Lässt das Archiv `papex.cls` weg, verwendet der Server
die aus `PAPEX_LATEX_DIR`.

**F: Kann ich Mathe, Abbildungen, eigene Befehle in Abschnitten nutzen?**
Ja. Abschnitt-`.tex`-Dateien werden von Hand geschrieben und unterstützen volles LaTeX, **un-escaped**. Eigene
Präambel-Befehle gehören in die Abschnittsdateien oder `papex-template.tex`.

**F: Ich sehe nach der Einreichung kein PDF?**
Ist TeX Live server-seitig nicht konfiguriert, ist `pdfUrl` leer und die Seite vermerkt „PDF wird
im Hintergrund gebaut“. Konfiguriere es und reiche erneut ein; in der Produktion mit einer
Async-Queue kombinieren.

**F: Wie reiche ich eine neue Version eines Papers ein?**
Setze `paper.id` in `papex.json` auf deine bestehende Paper-ID (und du musst Einreichberechtigung
dafür haben); die Plattform ingestiert es als neue Version.

**F: Wie werden Zitationen automatisch verknüpft?**
`doi` / `arxivId` im `references`-Array werden über `resolveTarget` zu plattforminternen Papers
aufgelöst und eine Zitationskante erzeugt; andere Einträge werden als
`url` / `title` im Zitationsgraph gespeichert.
