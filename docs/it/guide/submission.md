# Guida all'invio

Questa guida spiega i due metodi di invio degli articoli supportati da Papex e
fornisce un riferimento completo per l'**invio tramite pacchetto sorgente** insieme al
relativo manifest `papex.json` e alla toolchain XeLaTeX.

---

## 1. Panoramica

Papex offre due punti di ingresso per l'invio adatti a flussi di lavoro diversi:

| Metodo | Punto di ingresso | Pubblico | Caratteristiche |
| --- | --- | --- | --- |
| **Invio tramite modulo** | Pagina web "Invia → Modulo" / `POST /api/papers` | Invianti occasionali | Compila titolo, riassunto, autori, ecc. nel browser; **carica il PDF full-text direttamente** (≤50MB) |
| **Caricamento pacchetto sorgente** | Pagina web "Invia → Pacchetto sorgente" / `POST /api/submit/archive` | Autori LaTeX | Impacchetta le fonti con un manifest `papex.json` in un `tar.gz`; la piattaforma **crea l'articolo, collega le citazioni e compila il PDF** automaticamente |

> Entrambi i metodi condividono la stessa logica di ingestione (`createSubmission` + `addCitation`).
> Differiscono solo nella provenienza dei metadati e nel modo in cui corpo/PDF vengono prodotti.

> **Preferisci non toccare la riga di comando?** Puoi anche usare il modulo integrato
> [Authoring online](/en/guide/writespace) per modificare `papex.json` in modo visuale, scrivere il corpo,
> ed "esportare il `tar.gz`" o "pubblicare con un clic" direttamente nel browser — l'archivio prodotto
> è pienamente equivalente a un caricamento di pacchetto sorgente.

---

## 2. Metodo 1: Invio tramite modulo

Clicca **Invia** nella barra di navigazione superiore, scegli la scheda **Modulo**, compila i campi
e clicca "Invia articolo":

- **Titolo**, **Riassunto**
- **Categoria primaria** (obbligatoria, codice dall'albero delle categorie es. `cs.LG`),
  **Categorie secondarie** (separate da virgola, opzionale)
- **Autori** (aggiungine quanti necessari; l'ordine è l'ordine degli autori)
- **Carica PDF** (opzionale): trascina e rilascia o scegli un PDF (≤50MB); la piattaforma lo memorizza
  e collega automaticamente i riferimenti. **DOI** (opzionale), **Licenza** (predefinita `CC-BY-4.0`),
  **Nota di versione** (opzionale)

L'articolo entra quindi nella coda di revisione. L'invio tramite modulo viene inviato come `multipart/form-data`:
`meta` è una stringa JSON dei metadati, `pdf` è il file PDF opzionale.

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

> Il PDF è opzionale. Quando fornito, l'endpoint lo memorizza associandolo alla versione dell'articolo,
> analizza il corpo, collega le citazioni nella piattaforma e restituisce
> `{ pdfUrl, pages, referencesExtracted, referencesLinked }`. Il modulo web lo invia
> automaticamente; i client API possono comunque inviare JSON semplice (senza `pdf`).

---

## 3. Metodo 2: Caricamento pacchetto sorgente

Il caricamento del pacchetto sorgente è un **flusso di lavoro per autori**: scrivi l'articolo in LaTeX, descrivi
i metadati e i riferimenti in un `papex.json` strutturato, impacchetta il tutto in un
`tar.gz` e lo carichi in un unico passaggio. Il backend gestisce "decomprimi → valida → ingerisci →
collega le citazioni → compila il PDF" end to end.

### 3.1 Struttura del pacchetto

Un layout di pacchetto minimo ma consigliato:

```
my-paper.tar.gz
├── papex.json            # obbligatorio: manifest dell'articolo (metadati + sezioni + riferimenti)
├── papex-template.tex    # documento principale (usa il papex-template.tex fornito dal repo)
├── papex.cls             # classe documento (opzionale; il server la copia da PAPEX_LATEX_DIR se assente)
├── references.bib        # opzionale: BibTeX scritto a mano; altrimenti auto-generato dai riferimenti
└── sections/             # sezioni del corpo (.tex frammenti, referenziati in ordine da papex.json)
    ├── 00-intro.tex
    ├── 01-related.tex
    └── …
```

> Il pacchetto **deve contenere `papex.json`**; altrimenti il caricamento viene rifiutato (HTTP 400).

### 3.2 Riferimento dei campi di `papex.json`

Lo schema JSON completo si trova in [`papex-latex/papex.schema.json`](https://github.com/).
Campi principali e le loro destinazioni:

| Campo | Tipo | Obbligatorio | Note / destinazione DB |
| --- | --- | --- | --- |
| `paper.id` | stringa (`YYMM.NNNNN`) | no | Se corrisponde al **tuo (o admin) articolo esistente** → inviato come nuova versione; altrimenti viene assegnato un nuovo ID articolo |
| `paper.title` | stringa | sì | → `papers.title` / `paper_versions.title` |
| `paper.abstract` | stringa | sì | → `paper_versions.abstract` |
| `paper.keywords` | stringa[] | no | Reso dopo il riassunto nel PDF (non memorizzato separatamente) |
| `paper.primaryCategoryId` | stringa | sì | → `papers.primaryCategoryId`; **deve esistere** nella tabella delle categorie o 400 |
| `paper.secondaryCategoryIds` | stringa[] | no | → `paper_categories` (non primarie) |
| `paper.doi` | stringa | no | → `paper_versions.doi`, scritto anche nel grafo delle citazioni (`target_doi`) |
| `paper.license` | stringa | no | → `paper_versions.license`, predefinita `CC-BY-4.0` |
| `paper.versionNote` | stringa | no | → `paper_versions.comments` |
| `paper.subtitle` | stringa | no | Reso sotto il titolo nel PDF |
| `paper.venue` | stringa | no | Reso nel blocco del titolo (es. conferenza/rivista) |
| `authors[].name` | stringa | sì | → `authors` + `paper_authors` (ordinati per `order`) |
| `authors[].orcid` | stringa | no | Nota a piè di pagina dell'autore |
| `authors[].email` | stringa | no | Usata come contatto per l'autore corrispondente |
| `authors[].affiliation` | stringa | no | **Stringa** → risolta in `affiliations.id` tramite `findOrCreateAffiliation` |
| `authors[].corresponding` | booleano | no | Nota a piè di pagina "Autore corrispondente" |
| `authors[].equalContribution` | booleano | no | Nota a piè di pagina "Contributo uguale" |
| `authors[].footnote` | stringa | no | Nota a piè di pagina a testo libero |
| `references[].key` | stringa | sì | Chiave di citazione BibTeX |
| `references[].doi` / `arxivId` | stringa | no | Risolta in un articolo della piattaforma tramite `resolveTarget`; altrimenti `url`/`title` finiscono in `citations` |
| `references[].url` / `title` / `authors` / `year` / `venue` | stringa | no | Compilano `citations` e il `references.bib` auto-generato |
| `sections[]` | stringa[] | sì | Elenco ordinato dei percorsi `.tex` delle sezioni; **guida solo LaTeX, non memorizzato nelle tabelle** |
| `appendices[]` | stringa[] | no | Elenco ordinato dei percorsi `.tex` degli allegati |
| `acknowledgments` / `funding` | stringa | no | Reso nella sezione riconoscimenti/finanziamenti del PDF |
| `build` | oggetto | no | Opzioni di compilazione: `style` (numeric/authoryear), `fontset` (fandol/windows/mac/ubuntu), `passthrough` (campi esenti da escaping), ecc. |

> **Differenza rispetto all'invio tramite modulo**: `papex.json` usa una **stringa** `affiliation`
> invece di un `affiliationId` numerico; il livello di mappatura cerca o crea la
> riga `affiliations`. Aggiunge inoltre campi solo-LaTeX `sections`, `references`,
> `appendices`, `build`.

### 3.3 Toolchain XeLaTeX (`papex-latex/`)

Una toolchain XeLaTeX dedicata è fornita in [`papex-latex/`](https://github.com/):

```
papex-latex/
├── papex.cls              # classe documento (ctex + authblk + biblatex, CJK+inglese, macro metadati, intestazioni/piè di pagina)
├── papex-template.tex     # documento principale, auto \input dei _papex_*.tex generati e delle sezioni
├── papex-build.py         # builder senza dipendenze (solo stdlib; jsonschema opzionale)
├── papex.schema.json      # contratto manifest draft-07
├── latexmkrc              # configurazione latexmk opzionale
├── README.md              # uso della toolchain
└── example/               # pacchetto di esempio completo (articolo cinese + 5 sezioni + allegato)
```

**Punti salienti di `papex.cls`**

- **CJK + inglese**: basato su `ctex` (`scheme=plain`), predefinito `fontset=fandol` (fornito
  con TeX Live, compila sul server subito pronto); in locale commutare con
  `windows` / `mac` / `ubuntu`.
- **Autori/affiliazioni**: `authblk` con affiliazioni condivise, nota a piè di pagina per l'autore
  corrispondente e contributo uguale.
- **Riferimenti**: `biblatex` + `biber`, `numeric` / `authoryear` selezionabili.
- **Macro metadati**: `\papexPaperId` (ID articolo sopra il titolo), `\papexSubtitle`,
  `\papexVenue`, `\papexDoi` (link automatico doi.org), `\papexVersionNote`, `\papexKeywords`
  (dopo il riassunto), `\papexLicense` (piè di pagina), `\papexRunningTitle` (intestazione).
- **Indipendente dal brand**: nessuna dicitura *preprints / arXiv*, coerente con la
  convenzione di prodotto "senza arXiv".

**Flusso di lavoro di `papex-build.py`**

1. Legge `papex.json` (l'input può essere una directory / un singolo json / un `.tar.gz`).
2. Convalida (preferisce `jsonschema`, altrimenti controlli integrati).
3. Escapa i campi di testo semplice (`title` / `abstract` / `authors` / `affiliation` /
   `keywords` / `acknowledgments` …), generando `_papex_meta.tex`, `_papex_abstract.tex`,
   `_papex_sections.tex`, `_papex_backmatter.tex`, `_papex_appendices.tex` e
   `references.bib` (saltato se l'archivio contiene già `references.bib`).
4. Compila con `latexmk -xelatex` (`--emit-only` emette solo gli intermedi,
   `--validate` convalida solo).
5. I file di sezione `.tex` sono scritti a mano dall'autore e supportano il LaTeX completo
   (inclusa la matematica); **non vengono escapati**. Usa `build.passthrough` per esentare
   campi di testo JSON dall'escaping.

### 3.4 Anteprima e compilazione in locale

```bash
# entra nel pacchetto di esempio
cd papex-latex/example

# emetti solo .tex/.bib intermedi (non serve TeX — utile per ispezionare escaping/struttura)
python3 ../papex-build.py . --emit-only

# convalida solo papex.json
python3 ../papex-build.py . --validate

# genera e compila il PDF (richiede un TeX Live locale)
python3 ../papex-build.py .
```

Impacchetta e invia:

```bash
tar -czf my-paper.tar.gz papex.json papex-template.tex references.bib sections/
```

### 3.5 Caricamento sul sito web

1. Dopo aver effettuato l'accesso, clicca **Invia** nella barra di navigazione superiore e scegli la
   scheda **Pacchetto sorgente**.
2. Trascina il `tar.gz` nella zona di rilascio, o clicca per scegliere un file (solo `.tar.gz` /
   `.tgz`, ≤ 50MB).
3. Clicca "Carica e invia"; la piattaforma restituisce l'ID e la versione dell'articolo, con
   note di elaborazione (es. PDF in compilazione in background).
4. Clicca "Visualizza articolo" per andare alla pagina dell'articolo appena creato.

---

## 4. Elaborazione end-to-end (backend)

Dopo il caricamento, il backend elabora il pacchetto come segue (sorgente in
`src/lib/latex/`):

```
author ──tar.gz──> POST /api/submit/archive (multipart: file)
                         │
                         ▼
                  ① unpack (tar.ts)
                     gunzip e parser ustar/GNU/PAX zero-dep, guardia path-traversal
                         │
                         ▼
                  ② read papex.json → coerceManifest() convalida i campi obbligatori
                         │
                         ▼
                  ③ mapToCreatePaperInput()
                     · primaryCategoryId deve esistere (altrimenti 400)
                     · stringa affiliation → affiliations.id (findOrCreateAffiliation)
                     · paper.id corrisponde a articolo proprio/privilegiato → nuova versione
                         │
                         ▼
                  ④ createSubmission() ingerisce (riusa la transazione esistente)
                         │
                         ▼
                  ⑤ mapReferencesToCitations() → addCitation() collega il grafo delle citazioni
                         │
                         ▼
                  ⑥ build XeLaTeX opzionale (latexmk server)
                     → savePdfBuffer() memorizza → aggiorna paper_versions.pdfUrl
                     (latexmk mancante → solo avviso, ingestione non influenzata)
                         │
                         ▼
                 restituisce { paperId, version, warnings, pdfUrl? }
```

**Moduli principali**

| File | Responsabilità |
| --- | --- |
| `src/lib/latex/tar.ts` | Zero-dep `gunzip` + `parseTar` (ustar / nomi lunghi GNU / header estesi PAX), `writeEntries` con guardia path-traversal |
| `src/lib/latex/papex-json.ts` | Tipi `PapexManifest`, `coerceManifest`, `mapToCreatePaperInput`, `mapReferencesToCitations` |
| `src/lib/latex/papex-archive.ts` | Orchestrazione `processSubmissionArchive`; `buildAndStorePdf` verifica `latexmk` e compila/memorizza il PDF |
| `src/app/api/submit/archive/route.ts` | Accetta `multipart/form-data` `file` (≤50MB), autentica, mappa gli errori allo stato HTTP |

**Mappatura dei codici di errore (HTTP)**

| Errore interno | HTTP | Significato |
| --- | --- | --- |
| `MANIFEST_MISSING` | 400 | Archivio senza `papex.json` |
| `MANIFEST_JSON_INVALID` | 400 | `papex.json` non è JSON valido |
| `MANIFEST_INVALID:…` | 400 | Campo obbligatorio mancante (title/abstract/primaryCategoryId/authors/sections) |
| `CATEGORY_NOT_FOUND:cs.X` | 400 | Il codice di categoria non esiste |
| `ARCHIVE_PARSE_FAILED` / `ARCHIVE_EMPTY` | 400 | Archivio corrotto o vuoto |
| `FORBIDDEN` | 403 | Non autorizzato a inviare una nuova versione di quell'articolo |
| `PAPER_NOT_FOUND` | 404 | L'articolo target dichiarato per la nuova versione non esiste |
| altro | 500 | Errore interno (incl. `ID_GENERATION_FAILED`) |

---

## 5. Riferimento API

### `POST /api/papers`

Endpoint di invio tramite modulo. La richiesta è `multipart/form-data` (vedi
[Sezione 2](#2-method-1-form-submission)): il campo `meta` è una stringa JSON dei metadati,
il campo `pdf` è il file PDF opzionale (≤50MB). Richiede autenticazione. Restituisce `{ paperId, version }`,
e quando è stato caricato un PDF, un extra `pdf: { pdfUrl, pages, referencesExtracted, referencesLinked }`.
I client API possono anche inviare JSON semplice (senza `pdf`).

### `POST /api/submit/archive`

Endpoint del pacchetto sorgente.

- **Auth**: richiesta (cookie).
- **Richiesta**: `multipart/form-data`, il campo `file` è il `tar.gz` (≤ 50MB).
- **Successo (201)**:

  ```json
  {
    "paperId": "2608.00007",
    "version": 1,
    "warnings": [],
    "pdfUrl": "https://…/api/papers/2608.00007/pdf/1"
  }
  ```

- **Fallimento**: JSON con il relativo messaggio di errore; codici di stato secondo la
  [tabella errori](#4-end-to-end-processing-backend).

---

## 6. Deployment e operazioni

- **TeX Live**: il server necessita di `texlive` (con `xelatex`, `biber`, `latexmk`) e
  `collection-langchinese` così che i font `fandol` siano disponibili.
- **Variabili d'ambiente**:
  - `PAPEX_LATEX_BIN`: percorso di latexmk (predefinito `PATH`).
  - `PAPEX_LATEX_DIR`: directory contenente `papex.cls`; copiata quando l'archivio la omette.
- **Sandbox e risorse**: esegui la compilazione LaTeX in un ambiente isolato con
  limiti di CPU/memoria/timeout, e **disabilita `\write18` (shell-escape)** e l'accesso
  di rete per impedire a fonti malevole di eseguire comandi.
- **Async**: la compilazione è lenta; in produzione preferisci una **coda async** (restituisci
  `paperId` immediatamente, callback per aggiornare `pdfUrl` quando il PDF è pronto) per evitare
  di bloccare la richiesta.
- **Degrado in caso di mancanza**: se `latexmk` non è disponibile, `processSubmissionArchive`
  registra `warnings` e salta la compilazione del PDF; l'ingestione e il collegamento delle citazioni continuano a funzionare.
- **Memorizzazione PDF**: riusa `savePdfBuffer` (route di streaming `/api/papers/{id}/pdf/{version}`);
  non serve un nuovo livello di memorizzazione.

---

## 7. Sicurezza

- **Path traversal**: `writeEntries` convalida il percorso reale di ogni entry con
  `path.relative`, rifiutando `..` e percorsi assoluti; `parseTar` rimuove il `./` iniziale.
- **Limite di dimensione**: la route limita `file` a ≤ 50MB.
- **Abuso di risorse**: la compilazione ha limiti di timeout/risorse; considera un rate limiting per utente.
- **shell-escape**: il comando di compilazione non passa `-shell-escape`, impedendo
  alle fonti di eseguire comandi di sistema.

---

## 8. FAQ

**D: Il pacchetto sorgente duplica i dati dell'invio tramite modulo?**
No. Entrambi condividono la stessa logica di ingestione; differisce solo la fonte dei metadati.

**D: Devo usare il template XeLaTeX?**
`papex.cls` e `papex-template.tex` determinano il layout finale del PDF; scrivi solo i
file di sezione `.tex` e `papex.json`. Se l'archivio omette `papex.cls`, il server usa
quello di `PAPEX_LATEX_DIR`.

**D: Posso usare matematica, figure, comandi personalizzati nelle sezioni?**
Sì. I file di sezione `.tex` sono scritti a mano e supportano il LaTeX completo, **non escapati**. Metti
i comandi personalizzati del preambolo nei file di sezione o in `papex-template.tex`.

**D: Non vedo un PDF subito dopo l'invio?**
Se TeX Live non è configurato lato server, `pdfUrl` è vuoto e la pagina nota "Il PDF è
in compilazione in background." Configuralo e reinvia; in produzione abbinarlo a una
coda async.

**D: Come invio una nuova versione di un articolo?**
Imposta `paper.id` in `papex.json` sul tuo ID articolo esistente (e devi avere il permesso di invio
su di esso); la piattaforma lo ingerisce come nuova versione.

**D: Come vengono collegate automaticamente le citazioni?**
`doi` / `arxivId` nell'array `references` sono risolti in articoli della piattaforma tramite
`resolveTarget` e viene creata un'arco di citazione; le altre voci sono memorizzate come
`url` / `title` nel grafo delle citazioni.
