# Online Authoring (Writespace)

This guide covers Papex's built-in **online authoring** module (entry point
`/writespace`) — a browser-based writing desk that requires no local TeX install and
no hand-written JSON. It pushes the [Submission guide](/en/guide/submission)'s
"source package upload" flow directly into the browser: you fill in metadata and write
the body online, and the system generates a compliant `papex.json` plus section `.tex`
files. You can then **export a `tar.gz`** or **publish to the platform in one click**.

---

## 1. Overview

### 1.1 What pain points it solves

| Pain point with the classic "source package upload" | What online authoring does |
| --- | --- |
| Hand-writing `papex.json` is error-prone (missing fields, bad format) | Visual editor + real-time validation |
| Verifying structure needs a local Python / TeX install | Intermediate `.tex` is generated in the browser — no local toolchain |
| Packaging and uploading are two separate steps | "Export" and "Publish" in a single click from the editor |
| Losing work mid-draft | Auto-saved to browser `localStorage` |

### 1.2 The three tabs

| Tab | Purpose |
| --- | --- |
| **Metadata** | Paper info, authors, references, build options — a visual editor for `papex.json` |
| **Body** | Structured section / appendix workbench for writing LaTeX body text |
| **Export & Publish** | Real-time validation, archive file preview, export `tar.gz` / one-click publish |

### 1.3 Relationship to the submission system

Online authoring is **not** a new submission method — it is the **authoring front-end**
of "source package upload". The archive it produces is byte-for-byte compatible with the
[source package upload](/en/guide/submission#3-method-2-source-package-upload), and publishing
reuses the same backend endpoint `POST /api/submit/archive`, following the same
"unpack → validate → create paper → link citation graph → build PDF" pipeline
(see [Submission guide §4](/en/guide/submission#4-end-to-end-processing-flow-backend)).

---

## 2. Entry point and permissions

- **Entry point**: `/writespace`.
- **Page-level auth**: the server component `src/app/writespace/page.tsx` calls
  `getCurrentUser()` and `redirect("/login")` when unauthenticated.
- **Middleware**: `src/middleware.ts` adds `/writespace` to `PROTECTED_PREFIXES` and adds
  `/writespace/:path*` to the `matcher`, so unauthenticated requests are blocked at the edge.
- **Publish permission**: publishing is fundamentally a source-package submission and is subject
  to the same `FORBIDDEN` / `PAPER_NOT_FOUND` rules in
  [Submission guide §4](/en/guide/submission#4-end-to-end-processing-flow-backend) — when
  `paper.id` declares a new version, you must have submit permission on that paper.

---

## 3. Tab one: Metadata editor

The **Metadata** tab corresponds to `MetadataEditor`. It splits `papex.json`'s
`paper` / `authors` / `references` / `build` blocks into card-style forms, with fields
aligned one-to-one to [Submission guide §3.2](/en/guide/submission#32-papexjson-field-reference).

### 3.1 Paper info (`metaPaper`)

Title, subtitle, abstract, keywords (comma-separated), primary category (dropdown, required),
secondary categories (add/remove), DOI, license (dropdown, default `CC-BY-4.0`), venue,
version note, language, paper ID (optional — if filled and belonging to one of your existing
papers, submitted as a new version).

### 3.2 Authors (`metaAuthors`)

- Add multiple authors; each card supports reorder up / down / remove.
- Fields: name (required), affiliation, email, ORCID (format-checked), homepage, corresponding
  author toggle, equal contribution toggle, footnote, order.
- Corresponding author / equal contribution / footnote render as `\thanks` footnotes in the PDF;
  ORCID and homepage also appear in footnotes.

### 3.3 References (`metaReferences`)

- Add multiple BibTeX entries; fields include citation key (required, format-checked), type
  (dropdown, 12 BibTeX types), title, author, journal, booktitle, year, DOI, URL, arXiv ID,
  pages, volume, number, publisher, note.
- Two purposes: ① at publish time, linked into the platform citation graph via
  `mapReferencesToCitations`; ② at export time, used to auto-generate `references.bib`
  (see [§7](#7-exported-archive-structure)).

### 3.4 Build options (`metaBuild`)

- Bibliography style: `numeric` / `authoryear` (injected into the main document as
  `\documentclass[11pt,bibstyle=authoryear]`).
- Columns: `1` / `2` (two-column injects `twocolumn`).
- Other `build` options (e.g. `fontset`, `documentclass`) are reserved for the server-side
  compile; defaults see `createDefaultDraft`.

### 3.5 Real-time validation

Every edit runs through `validateDraft()` (`src/lib/writespace/manifest.ts`); the result is
shared with the **Export & Publish** tab. Core rules:

| Check | Rule | Type |
| --- | --- | --- |
| `schemaVersion` | must match `x.y.z` | error |
| `paper.title` / `abstract` / `primaryCategoryId` | required and non-empty | error |
| `paper.id` (optional) | if present must match `YYMM.NNNNN` | error |
| `authors` | at least 1; each `name` required; `orcid` must match `0000-0000-0000-0000` | error |
| `sections` | at least 1; each `file` required; `id` only letters, digits, `-`, `_` | error |
| `references` | each `key` required, limited to `A-Za-z0-9_:+.-`; `year` ∈ [0, 3000] | error |
| empty section body | advisory | warning |

> "errors" block publishing; "warnings" (e.g. an empty section body) are advisory only.

---

## 4. Tab two: Body workbench

The **Body** tab corresponds to `SectionsEditor` and manages the paper body and appendices
structurally.

### 4.1 Section list

- Each section (or appendix) is a collapsible card with: id/filename (`file`, e.g.
  `sections/intro.tex`), section title, level (`section` / `subsection` / `subsubsection` /
  `chapter` / `part`), body (LaTeX text area), character count.
- Supports: add section, add appendix, move up / down, remove.
- The level determines the command emitted at export (`\section{Title}` → `\input{sections/intro.tex}`).

### 4.2 Body content rules

- Section `.tex` is hand-written and supports **full LaTeX**: math, figures, custom commands,
  and `\cite{key}` references (matching the reference keys).
- Section body is **not escaped** (consistent with
  [Submission guide §3.3](/en/guide/submission#33-xelatex-toolchain-papex-latex)); only the
  plain-text fields in "Metadata" are escaped.
- An "Insert sample sections" button writes five demonstration sections (intro / related work /
  method / experiments / conclusion) with LaTeX formulas, for a quick start.

### 4.3 Appendices

Appendix entries share the section structure and are emitted after a single `\appendix`.

---

## 5. Tab three: Export & Publish

The **Export & Publish** tab corresponds to `ExportPanel` — the exit of the whole flow.

### 5.1 Validation status

Shows the live `validateDraft()` result at the top: "valid" or "invalid" plus an error/warning
list. The **Publish** button is disabled while errors exist.

### 5.2 File manifest preview

Shows the archive files that will be produced (i.e. the output of `buildArchiveFiles`,
[§7](#7-exported-archive-structure)), so you can confirm the structure before downloading/publishing.

### 5.3 Export `tar.gz`

Click **Export**: a `tar.gz` is generated entirely in the browser and triggers a download
(filename from i18n `writespace.expDownloadName`).

- Fully **dependency-free**: `src/lib/writespace/targz.ts` hand-rolls POSIX ustar packing plus
  the native `CompressionStream('gzip')` — no backend involved.
- Template assets (`papex-template.tex` / `papex.cls`) are fetched at export time from
  `/writespace/papex-template.tex` and `/writespace/papex.cls` and bundled into the archive,
  keeping it **self-contained** (the backend compiles directly via `latexmk`).

### 5.4 One-click publish

Click **Publish**: runs the same generation steps as export, then `POST`s the `tar.gz` as the
`file` field of a `multipart/form-data` request to `/api/submit/archive`.

- Publishing requires `validation.valid === true` up front.
- On success it shows the returned "paper ID + version" and `warnings`, with a "view paper"
  link, and clears the local draft flag.
- On failure it shows the backend error message inline (mapping in the
  [Submission guide §4 error table](/en/guide/submission#4-end-to-end-processing-flow-backend)).

---

## 6. Auto-save and draft restore

- The draft (`manifest` + per-section body) auto-saves to browser `localStorage`
  (key: `papex-writespace-draft`), debounced 400ms — survives page close.
- Reopening `/writespace` restores the last draft automatically and shows "local draft restored";
  after editing it shows "auto-saved".
- The top **New** button asks for confirmation, clears `localStorage`, and resets to a blank
  draft (with one sample intro section).

> Drafts live only in the local browser; switching devices or clearing browser data loses them.
> For important work, remember to **Export** or **Publish**.

---

## 7. Exported archive structure

The `tar.gz` produced by **Export / Publish** is assembled by `buildArchiveFiles()` and is
fully compatible with what the backend `papex-archive.ts` expects:

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

- The `_papex_*.tex` files are produced by `genMeta` / `genAbstract` / `genSections` /
  `genBackmatter` / `genAppendices`; plain-text fields go through a single-pass `latexEscape`,
  while section bodies are `\input` verbatim.
- This archive can be uploaded manually on the "source package upload" page, or submitted
  automatically by the **Publish** button — the two are equivalent.

---

## 8. Implementation notes

| Concern | Implementation |
| --- | --- |
| Data model | `src/lib/writespace/manifest.ts`: types aligned with `papex.schema.json` + `papex-json.ts`, pure frontend, no server imports |
| LaTeX generation | `src/lib/writespace/latex-gen.ts`: ports `papex-build.py` logic to TS; escaping uses a **single-pass character scan** (consistent with the fixed `papex-build.py`, avoiding re-escaping `\textbackslash{}`) |
| Packing | `src/lib/writespace/targz.ts`: hand-rolled ustar + `CompressionStream('gzip')`, zero-dependency, pure browser |
| Template assets | `public/writespace/papex.cls` + `papex-template.tex` (copied from `papex-latex/`, LF-normalized), fetched at runtime into the archive |
| Orchestration | `src/components/writespace/writespace-client.tsx`: three `Tabs` + draft persistence + export/publish |
| Internationalization | `src/i18n/dictionaries/{zh,en}.ts` `writespace` block (~70 keys), matching UI labels |

---

## 9. Security and limits

- **Permissions**: both entry and publishing require login; a new-version target paper must belong
  to the current user (or a privileged role), otherwise the backend returns `FORBIDDEN`.
- **No server-side persistence**: all generation and packing happen in browser memory; files leave
  the machine only when you click download/publish. The platform still applies the TeX sandbox,
  size limits, and shell-escape disabling from
  [Submission guide §6/§7](/en/guide/submission#6-deployment-and-ops).
- **Browser support**: `CompressionStream('gzip')` needs a recent browser (Chrome/Edge 80+,
  Firefox 113+, Safari 16.4+); when unavailable, export fails with a friendly message.
- **50MB limit**: publishing goes through `/api/submit/archive` and is subject to the same 50MB cap.

---

## 10. FAQ

**Q: Online authoring vs. source package upload — which to use?**
Either. Online authoring suits authors who don't want the command line and want live validation;
source package upload suits those with a local TeX project who want `papex-build.py` fine control.
Both produce identical results in the database.

**Q: Can the exported `tar.gz` be uploaded manually on the "source package upload" page?**
Yes, and it's equivalent. The exported archive already bundles `papex.cls` and
`papex-template.tex`, so the backend does not need to copy them from `PAPEX_LATEX_DIR`.

**Q: I used `\cite{key}` in the body but the citation didn't link after publishing?**
Citation linking depends on the reference's `doi` / `arxivId` matching a paper already on the
platform; entries with only `url` / `title` go into the citation graph but don't form an internal
link. Check that the reference's DOI / arXiv ID is accurate.

**Q: Are drafts synced to the cloud?**
No. Drafts live only in browser `localStorage`; switching devices or clearing cache loses them.
Make a habit of **Export** or **Publish**.

**Q: Will `$...$` formulas in the body get mangled?**
No. Section `.tex` is written verbatim (no escaping); formulas are rendered by the backend XeLaTeX
compile. Only the plain-text fields in "Metadata" are escaped.

**Q: No PDF immediately after publishing?**
Same as the [Submission guide FAQ](/en/guide/submission#8-faq): it depends on whether the server
has TeX Live configured; when not, `pdfUrl` is empty and the page shows "PDF is being built in the
background".
