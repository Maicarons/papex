# Submission Guide

This guide explains the two paper-submission methods supported by Papex, and
provides a complete reference for **source-package submission** together with its
`papex.json` manifest and XeLaTeX toolchain.

---

## 1. Overview

Papex offers two submission entry points for different workflows:

| Method | Entry point | Audience | Characteristics |
| --- | --- | --- | --- |
| **Form submission** | Web "Submit → Form" page / `POST /api/papers` | Occasional submitters | Fill in title, abstract, authors, etc. in the browser; **upload the full-text PDF directly** (≤50MB) |
| **Source-package upload** | Web "Submit → Source package" page / `POST /api/submit/archive` | LaTeX authors | Pack your sources with a `papex.json` manifest into a `tar.gz`; the platform **creates the paper, links citations and builds the PDF** automatically |

> Both methods share the same ingestion logic (`createSubmission` + `addCitation`).
> They differ only in where metadata comes from and how the body/PDF are produced.

> **Prefer not to touch the command line?** You can also use the built-in
> [Online Authoring](/en/guide/writespace) module to edit `papex.json` visually, write the body,
> and "export `tar.gz`" or "publish in one click" right in the browser — the archive it produces
> is fully equivalent to a source-package upload.

---

## 2. Method 1: Form submission

Click **Submit** in the top navigation, choose the **Form** tab, fill in the fields
and click "Submit paper":

- **Title**, **Abstract**
- **Primary category** (required, code from the category tree e.g. `cs.LG`),
  **Cross categories** (comma-separated, optional)
- **Authors** (add as many as needed; order is the author order)
- **Upload PDF** (optional): drag & drop or choose a PDF (≤50MB); the platform stores it
  and auto-links references. **DOI** (optional), **License** (default `CC-BY-4.0`),
  **Version note** (optional)

The paper then enters the review queue. Form submission is sent as `multipart/form-data`:
`meta` is a JSON string of the metadata, `pdf` is the optional PDF file.

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

> The PDF is optional. When supplied, the endpoint stores it against the paper version,
> parses the body, links in-platform citations, and returns
> `{ pdfUrl, pages, referencesExtracted, referencesLinked }`. The web form sends this
> automatically; API clients may still POST plain JSON (without `pdf`).

---

## 3. Method 2: Source-package upload

Source-package upload is an **author workflow**: you write the paper in LaTeX, describe
the metadata and references in a structured `papex.json`, pack everything into a
`tar.gz` and upload it in one step. The backend handles "unpack → validate → ingest →
link citations → build PDF" end to end.

### 3.1 Package structure

A minimal yet recommended package layout:

```
my-paper.tar.gz
├── papex.json            # required: paper manifest (metadata + sections + references)
├── papex-template.tex    # main document (use the repo-provided papex-template.tex)
├── papex.cls             # document class (optional; server copies from PAPEX_LATEX_DIR if absent)
├── references.bib        # optional: hand-written BibTeX; otherwise auto-generated from references
└── sections/             # body sections (.tex fragments, referenced in order by papex.json)
    ├── 00-intro.tex
    ├── 01-related.tex
    └── …
```

> The package **must contain `papex.json`**; otherwise the upload is rejected (HTTP 400).

### 3.2 `papex.json` field reference

The full JSON Schema lives at [`papex-latex/papex.schema.json`](https://github.com/).
Core fields and their targets:

| Field | Type | Required | Notes / DB target |
| --- | --- | --- | --- |
| `paper.id` | string (`YYMM.NNNNN`) | no | If it matches **your own (or admin) existing paper** → submitted as a new version; otherwise a new paper ID is assigned |
| `paper.title` | string | yes | → `papers.title` / `paper_versions.title` |
| `paper.abstract` | string | yes | → `paper_versions.abstract` |
| `paper.keywords` | string[] | no | Rendered after the abstract in the PDF (not stored separately) |
| `paper.primaryCategoryId` | string | yes | → `papers.primaryCategoryId`; **must exist** in the category table or 400 |
| `paper.secondaryCategoryIds` | string[] | no | → `paper_categories` (non-primary) |
| `paper.doi` | string | no | → `paper_versions.doi`, also written to the citation graph (`target_doi`) |
| `paper.license` | string | no | → `paper_versions.license`, default `CC-BY-4.0` |
| `paper.versionNote` | string | no | → `paper_versions.comments` |
| `paper.subtitle` | string | no | Rendered below the title in the PDF |
| `paper.venue` | string | no | Rendered in the title block (e.g. conference/journal) |
| `authors[].name` | string | yes | → `authors` + `paper_authors` (ordered by `order`) |
| `authors[].orcid` | string | no | Author footnote |
| `authors[].email` | string | no | Used as corresponding-author contact |
| `authors[].affiliation` | string | no | **String** → resolved to `affiliations.id` via `findOrCreateAffiliation` |
| `authors[].corresponding` | boolean | no | "Corresponding author" footnote |
| `authors[].equalContribution` | boolean | no | "Equal contribution" footnote |
| `authors[].footnote` | string | no | Free-text footnote |
| `references[].key` | string | yes | BibTeX citation key |
| `references[].doi` / `arxivId` | string | no | Resolved to an in-platform paper via `resolveTarget`; else `url`/`title` go into `citations` |
| `references[].url` / `title` / `authors` / `year` / `venue` | string | no | Fill `citations` and the auto-generated `references.bib` |
| `sections[]` | string[] | yes | Ordered list of section `.tex` paths; **drives LaTeX only, not stored in tables** |
| `appendices[]` | string[] | no | Ordered list of appendix `.tex` paths |
| `acknowledgments` / `funding` | string | no | Rendered in the acknowledgments/funding section of the PDF |
| `build` | object | no | Build options: `style` (numeric/authoryear), `fontset` (fandol/windows/mac/ubuntu), `passthrough` (fields exempt from escaping), etc. |

> **Difference from form submission**: `papex.json` uses an `affiliation` **string**
> instead of a numeric `affiliationId`; the mapping layer looks up or creates the
> `affiliations` row. It also adds LaTeX-only fields `sections`, `references`,
> `appendices`, `build`.

### 3.3 XeLaTeX toolchain (`papex-latex/`)

A dedicated XeLaTeX toolchain ships in [`papex-latex/`](https://github.com/):

```
papex-latex/
├── papex.cls              # document class (ctex + authblk + biblatex, CJK+English, metadata macros, headers/footers)
├── papex-template.tex     # main document, auto \input the generated _papex_*.tex and sections
├── papex-build.py         # zero-dependency builder (stdlib only; optional jsonschema)
├── papex.schema.json      # draft-07 manifest contract
├── latexmkrc              # optional latexmk config
├── README.md              # toolchain usage
└── example/               # full example package (Chinese paper + 5 sections + appendix)
```

**`papex.cls` highlights**

- **CJK + English**: built on `ctex` (`scheme=plain`), default `fontset=fandol` (bundled
  with TeX Live, compiles on the server out of the box); locally switch with
  `windows` / `mac` / `ubuntu`.
- **Authors/affiliations**: `authblk` with shared affiliations, corresponding-author and
  equal-contribution footnotes.
- **References**: `biblatex` + `biber`, `numeric` / `authoryear` selectable.
- **Metadata macros**: `\papexPaperId` (paper ID above the title), `\papexSubtitle`,
  `\papexVenue`, `\papexDoi` (auto doi.org link), `\papexVersionNote`, `\papexKeywords`
  (after abstract), `\papexLicense` (footer), `\papexRunningTitle` (header).
- **Brand-independent**: no *preprints / arXiv* wording, consistent with the
  "arXiv-free" product convention.

**`papex-build.py` workflow**

1. Read `papex.json` (input may be a directory / single json / `.tar.gz`).
2. Validate (prefer `jsonschema`, otherwise built-in checks).
3. Escape plain-text fields (`title` / `abstract` / `authors` / `affiliation` /
   `keywords` / `acknowledgments` …), generating `_papex_meta.tex`, `_papex_abstract.tex`,
   `_papex_sections.tex`, `_papex_backmatter.tex`, `_papex_appendices.tex` and
   `references.bib` (skipped if the archive already ships `references.bib`).
4. Compile with `latexmk -xelatex` (`--emit-only` emits intermediates only,
   `--validate` validates only).
5. Section `.tex` files are hand-written by the author and support full LaTeX
   (including math); they are **not escaped**. Use `build.passthrough` to exempt
   JSON text fields from escaping.

### 3.4 Local preview & build

```bash
# enter the example package
cd papex-latex/example

# emit intermediate .tex/.bib only (no TeX needed — useful to inspect escaping/structure)
python3 ../papex-build.py . --emit-only

# validate papex.json only
python3 ../papex-build.py . --validate

# generate and compile the PDF (requires a local TeX Live)
python3 ../papex-build.py .
```

Pack and submit:

```bash
tar -czf my-paper.tar.gz papex.json papex-template.tex references.bib sections/
```

### 3.5 Upload on the website

1. After signing in, click **Submit** in the top navigation and choose the
   **Source package** tab.
2. Drag the `tar.gz` into the drop zone, or click to choose a file (only `.tar.gz` /
   `.tgz`, ≤ 50MB).
3. Click "Upload & submit"; the platform returns the paper ID and version, with
   processing notes (e.g. PDF being built in the background).
4. Click "View paper" to jump to the newly created paper page.

---

## 4. End-to-end processing (backend)

After upload, the backend processes the package as follows (source under
`src/lib/latex/`):

```
author ──tar.gz──> POST /api/submit/archive (multipart: file)
                         │
                         ▼
                  ① unpack (tar.ts)
                     zero-dep gunzip + ustar/GNU/PAX parser, path-traversal guard
                         │
                         ▼
                  ② read papex.json → coerceManifest() validates required fields
                         │
                         ▼
                  ③ mapToCreatePaperInput()
                     · primaryCategoryId must exist (else 400)
                     · affiliation string → affiliations.id (findOrCreateAffiliation)
                     · paper.id matches own/privileged paper → new version
                         │
                         ▼
                  ④ createSubmission() ingests (reuses existing transaction)
                         │
                         ▼
                  ⑤ mapReferencesToCitations() → addCitation() links the citation graph
                         │
                         ▼
                  ⑥ optional XeLaTeX build (server latexmk)
                     → savePdfBuffer() stores → updates paper_versions.pdfUrl
                     (missing latexmk → warning only, ingestion unaffected)
                         │
                         ▼
                 returns { paperId, version, warnings, pdfUrl? }
```

**Key modules**

| File | Responsibility |
| --- | --- |
| `src/lib/latex/tar.ts` | Zero-dep `gunzip` + `parseTar` (ustar / GNU long names / PAX extended headers), `writeEntries` with path-traversal guard |
| `src/lib/latex/papex-json.ts` | `PapexManifest` types, `coerceManifest`, `mapToCreatePaperInput`, `mapReferencesToCitations` |
| `src/lib/latex/papex-archive.ts` | `processSubmissionArchive` orchestration; `buildAndStorePdf` probes `latexmk` and compiles/stores PDF |
| `src/app/api/submit/archive/route.ts` | Accepts `multipart/form-data` `file` (≤50MB), authenticates, maps errors to HTTP status |

**Error-code mapping (HTTP)**

| Internal error | HTTP | Meaning |
| --- | --- | --- |
| `MANIFEST_MISSING` | 400 | Archive missing `papex.json` |
| `MANIFEST_JSON_INVALID` | 400 | `papex.json` is not valid JSON |
| `MANIFEST_INVALID:…` | 400 | Missing required field (title/abstract/primaryCategoryId/authors/sections) |
| `CATEGORY_NOT_FOUND:cs.X` | 400 | Category code does not exist |
| `ARCHIVE_PARSE_FAILED` / `ARCHIVE_EMPTY` | 400 | Archive corrupt or empty |
| `FORBIDDEN` | 403 | Not allowed to submit a new version of that paper |
| `PAPER_NOT_FOUND` | 404 | Declared target paper for the new version does not exist |
| other | 500 | Internal error (incl. `ID_GENERATION_FAILED`) |

---

## 5. API reference

### `POST /api/papers`

Form-submission endpoint. Request is `multipart/form-data` (see
[Section 2](#2-method-1-form-submission)): field `meta` is a JSON string of the metadata,
field `pdf` is the optional PDF file (≤50MB). Requires auth. Returns `{ paperId, version }`,
and when a PDF was uploaded, an extra `pdf: { pdfUrl, pages, referencesExtracted, referencesLinked }`.
API clients may also POST plain JSON (without `pdf`).

### `POST /api/submit/archive`

Source-package endpoint.

- **Auth**: required (cookie).
- **Request**: `multipart/form-data`, field `file` is the `tar.gz` (≤ 50MB).
- **Success (201)**:

  ```json
  {
    "paperId": "2608.00007",
    "version": 1,
    "warnings": [],
    "pdfUrl": "https://…/api/papers/2608.00007/pdf/1"
  }
  ```

- **Failure**: JSON with the corresponding error message; status codes per the
  [error table](#4-end-to-end-processing-backend).

---

## 6. Deployment & operations

- **TeX Live**: the server needs `texlive` (with `xelatex`, `biber`, `latexmk`) and
  `collection-langchinese` so the `fandol` fonts are available.
- **Environment variables**:
  - `PAPEX_LATEX_BIN`: path to latexmk (defaults to `PATH`).
  - `PAPEX_LATEX_DIR`: directory holding `papex.cls`; copied when the archive omits it.
- **Sandbox & resources**: run LaTeX compilation in an isolated environment with
  CPU/memory/timeout limits, and **disable `\write18` (shell-escape)** and network
  access to prevent malicious sources from running commands.
- **Async**: compilation is slow; in production prefer an **async queue** (return
  `paperId` immediately, callback to update `pdfUrl` when the PDF is ready) to avoid
  blocking the request.
- **Missing degradation**: if `latexmk` is unavailable, `processSubmissionArchive`
  records `warnings` and skips PDF building; ingestion and citation linking still work.
- **PDF storage**: reuses `savePdfBuffer` (`/api/papers/{id}/pdf/{version}` streaming
  route); no new storage layer needed.

---

## 7. Security

- **Path traversal**: `writeEntries` validates each entry's real path with
  `path.relative`, rejecting `..` and absolute paths; `parseTar` strips leading `./`.
- **Size limit**: the route caps `file` at ≤ 50MB.
- **Resource abuse**: compilation has timeout/resource limits; consider per-user
  rate limiting.
- **shell-escape**: the compile command does not pass `-shell-escape`, preventing
  sources from executing system commands.

---

## 8. FAQ

**Q: Does the source package duplicate data from form submission?**
No. Both share the same ingestion logic; only the metadata source differs.

**Q: Must I use the XeLaTeX template?**
`papex.cls` and `papex-template.tex` determine the final PDF layout; you only write the
section `.tex` files and `papex.json`. If the archive omits `papex.cls`, the server uses
the one from `PAPEX_LATEX_DIR`.

**Q: Can I use math, figures, custom commands in sections?**
Yes. Section `.tex` files are hand-written and support full LaTeX, **un-escaped**. Put
custom preamble commands in the section files or `papex-template.tex`.

**Q: I don't see a PDF right after submission?**
If TeX Live is not configured server-side, `pdfUrl` is empty and the page notes "PDF is
being built in the background." Configure it and re-submit; in production pair it with an
async queue.

**Q: How do I submit a new version of a paper?**
Set `paper.id` in `papex.json` to your existing paper ID (and you must have submit
permission on it); the platform ingests it as a new version.

**Q: How are citations linked automatically?**
`doi` / `arxivId` in the `references` array are resolved to in-platform papers via
`resolveTarget` and a citation edge is created; other entries are stored as
`url` / `title` in the citation graph.
