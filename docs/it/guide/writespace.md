# Authoring online (Writespace)

Questa guida copre il modulo integrato di **authoring online** di Papex (punto di ingresso
`/writespace`) — una scrivania di scrittura basata sul browser che non richiede installazioni TeX locali né
JSON scritti a mano. Porta il flusso di ["caricamento pacchetto sorgente"](/en/guide/submission) della
[Guida all'invio](/en/guide/submission) direttamente nel browser: compili i metadati e scrivi
il corpo online, e il sistema genera un `papex.json` conforme più i file di sezione `.tex`.
Puoi quindi **esportare un `tar.gz`** o **pubblicare sulla piattaforma con un clic**.

---

## 1. Panoramica

### 1.1 Quali punti critici risolve

| Punto critico del classico "caricamento pacchetto sorgente" | Cosa fa l'authoring online |
| --- | --- |
| Scrivere a mano `papex.json` è soggetto a errori (campi mancanti, formato errato) | Editor visuale + convalida in tempo reale |
| Verificare la struttura richiede un'installazione Python / TeX locale | L'intermedio `.tex` è generato nel browser — nessuna toolchain locale |
| Impacchettare e caricare sono due passaggi separati | "Esporta" e "Pubblica" in un singolo clic dall'editor |
| Perdere il lavoro a metà bozza | Salvataggio automatico nel `localStorage` del browser |

### 1.2 Le tre schede

| Scheda | Scopo |
| --- | --- |
| **Metadati** | Informazioni articolo, autori, riferimenti, opzioni di compilazione — un editor visuale per `papex.json` |
| **Corpo** | Area di lavoro strutturata per sezioni / allegati per scrivere il corpo LaTeX |
| **Esporta e pubblica** | Convalida in tempo reale, anteprima del file di archivio, esporta `tar.gz` / pubblica con un clic |

### 1.3 Relazione con il sistema di invio

L'authoring online **non** è un nuovo metodo di invio — è il **front-end di authoring**
del "caricamento pacchetto sorgente". L'archivio che produce è compatibile byte-per-byte con il
[caricamento pacchetto sorgente](/en/guide/submission#3-method-2-source-package-upload), e la pubblicazione
riusa lo stesso endpoint backend `POST /api/submit/archive`, seguendo la stessa
pipeline "decomprimi → valida → crea articolo → collega grafo citazioni → compila PDF"
(vedi [Guida all'invio §4](/en/guide/submission#4-end-to-end-processing-flow-backend)).

---

## 2. Punto di ingresso e permessi

- **Punto di ingresso**: `/writespace`.
- **Auth a livello di pagina**: il componente server `src/app/writespace/page.tsx` chiama
  `getCurrentUser()` e `redirect("/login")` quando non autenticato.
- **Middleware**: `src/middleware.ts` aggiunge `/writespace` a `PROTECTED_PREFIXES` e aggiunge
  `/writespace/:path*` al `matcher`, così le richieste non autenticate sono bloccate al bordo.
- **Permesso di pubblicazione**: pubblicare è fondamentalmente un invio di pacchetto sorgente ed è soggetto
  alle stesse regole `FORBIDDEN` / `PAPER_NOT_FOUND` nella
  [Guida all'invio §4](/en/guide/submission#4-end-to-end-processing-flow-backend) — quando
  `paper.id` dichiara una nuova versione, devi avere il permesso di invio su quell'articolo.

---

## 3. Scheda uno: Editor dei metadati

La scheda **Metadati** corrisponde a `MetadataEditor`. Suddivide i blocchi
`paper` / `authors` / `references` / `build` di `papex.json` in moduli di modulo stile card, con campi
allineati uno-a-uno alla [Guida all'invio §3.2](/en/guide/submission#32-papexjson-field-reference).

### 3.1 Informazioni articolo (`metaPaper`)

Titolo, sottotitolo, riassunto, parole chiave (separate da virgola), categoria primaria (menu a tendina, obbligatoria),
categorie secondarie (aggiungi/rimuovi), DOI, licenza (menu a tendina, predefinita `CC-BY-4.0`), venue,
nota di versione, lingua, ID articolo (opzionale — se compilato e appartenente a uno dei tuoi articoli
esistenti, inviato come nuova versione).

### 3.2 Autori (`metaAuthors`)

- Aggiungi più autori; ogni card supporta riordino su / giù / rimuovi.
- Campi: nome (obbligatorio), affiliazione, email, ORCID (controllo formato), homepage, interruttore autore
  corrispondente, interruttore contributo uguale, nota a piè di pagina, ordine.
- Autore corrispondente / contributo uguale / nota a piè di pagina sono resi come note a piè di pagina `\thanks` nel PDF;
  ORCID e homepage compaiono anch'essi nelle note a piè di pagina.

### 3.3 Riferimenti (`metaReferences`)

- Aggiungi più voci BibTeX; i campi includono chiave di citazione (obbligatoria, controllo formato), tipo
  (menu a tendina, 12 tipi BibTeX), titolo, autore, rivista, booktitle, anno, DOI, URL, ID arXiv,
  pagine, volume, numero, editore, nota.
- Due scopi: ① al momento della pubblicazione, collegati nel grafo delle citazioni della piattaforma tramite
  `mapReferencesToCitations`; ② al momento dell'export, usati per auto-generare `references.bib`
  (vedi [§7](#7-exported-archive-structure)).

### 3.4 Opzioni di compilazione (`metaBuild`)

- Stile bibliografia: `numeric` / `authoryear` (iniettato nel documento principale come
  `\documentclass[11pt,bibstyle=authoryear]`).
- Colonne: `1` / `2` (due colonne inietta `twocolumn`).
- Altre opzioni `build` (es. `fontset`, `documentclass`) sono riservate per la
  compilazione lato server; i valori predefiniti vedere `createDefaultDraft`.

### 3.5 Convalida in tempo reale

Ogni modifica passa attraverso `validateDraft()` (`src/lib/writespace/manifest.ts`); il risultato è
condiviso con la scheda **Esporta e pubblica**. Regole principali:

| Controllo | Regola | Tipo |
| --- | --- | --- |
| `schemaVersion` | deve corrispondere a `x.y.z` | errore |
| `paper.title` / `abstract` / `primaryCategoryId` | obbligatori e non vuoti | errore |
| `paper.id` (opzionale) | se presente deve corrispondere a `YYMM.NNNNN` | errore |
| `authors` | almeno 1; ogni `name` obbligatorio; `orcid` deve corrispondere a `0000-0000-0000-0000` | errore |
| `sections` | almeno 1; ogni `file` obbligatorio; `id` solo lettere, cifre, `-`, `_` | errore |
| `references` | ogni `key` obbligatorio, limitato a `A-Za-z0-9_:+.-`; `year` ∈ [0, 3000] | errore |
| corpo sezione vuoto | avviso | warning |

> "errors" bloccano la pubblicazione; "warnings" (es. un corpo di sezione vuoto) sono solo di avviso.

---

## 4. Scheda due: Area di lavoro del corpo

La scheda **Corpo** corrisponde a `SectionsEditor` e gestisce il corpo e gli allegati dell'articolo
strutturalmente.

### 4.1 Elenco delle sezioni

- Ogni sezione (o allegato) è una card comprimibile con: id/nomefile (`file`, es.
  `sections/intro.tex`), titolo di sezione, livello (`section` / `subsection` / `subsubsection` /
  `chapter` / `part`), corpo (area di testo LaTeX), conteggio caratteri.
- Supporta: aggiungi sezione, aggiungi allegato, sposta su / giù, rimuovi.
- Il livello determina il comando emesso all'export (`\section{Title}` → `\input{sections/intro.tex}`).

### 4.2 Regole per il contenuto del corpo

- La sezione `.tex` è scritta a mano e supporta **il LaTeX completo**: matematica, figure, comandi personalizzati,
  e riferimenti `\cite{key}` (corrispondenti alle chiavi di riferimento).
- Il corpo della sezione **non viene escapato** (coerente con la
  [Guida all'invio §3.3](/en/guide/submission#33-xelatex-toolchain-papex-latex)); solo
  i campi di testo semplice in "Metadati" vengono escapati.
- Un pulsante "Inserisci sezioni di esempio" scrive cinque sezioni dimostrative (intro / lavori correlati /
  metodo / esperimenti / conclusione) con formule LaTeX, per una partenza rapida.

### 4.3 Allegati

Le voci di allegato condividono la struttura delle sezioni e sono emesse dopo un singolo `\appendix`.

---

## 5. Scheda tre: Esporta e pubblica

La scheda **Esporta e pubblica** corrisponde a `ExportPanel` — l'uscita dell'intero flusso.

### 5.1 Stato di convalida

Mostra in alto il risultato live di `validateDraft()`: "valido" o "non valido" più un elenco di errori/avvisi.
Il pulsante **Pubblica** è disabilitato finché esistono errori.

### 5.2 Anteprima del manifesto dei file

Mostra i file di archivio che verranno prodotti (ovvero l'output di `buildArchiveFiles`,
[§7](#7-exported-archive-structure)), così puoi confermare la struttura prima di scaricare/pubblicare.

### 5.3 Esporta `tar.gz`

Clicca **Esporta**: un `tar.gz` è generato interamente nel browser e avvia un download
(nomefile da i18n `writespace.expDownloadName`).

- Completamente **senza dipendenze**: `src/lib/writespace/targz.ts` implementa a mano l'impacchettamento POSIX ustar più
  il nativo `CompressionStream('gzip')` — nessun backend coinvolto.
- Gli asset del template (`papex-template.tex` / `papex.cls`) sono recuperati al momento dell'export da
  `/writespace/papex-template.tex` e `/writespace/papex.cls` e inclusi nell'archivio,
  mantenendolo **auto-contenuto** (il backend compila direttamente via `latexmk`).

### 5.4 Pubblicazione con un clic

Clicca **Pubblica**: esegue gli stessi passaggi di generazione dell'export, poi `POST`a il `tar.gz` come
campo `file` di una richiesta `multipart/form-data` a `/api/submit/archive`.

- La pubblicazione richiede `validation.valid === true` in anticipo.
- In caso di successo mostra "ID articolo + versione" e `warnings` restituiti, con un link "visualizza articolo",
  e cancella il flag della bozza locale.
- In caso di fallimento mostra inline il messaggio di errore del backend (mappatura nella
  [tabella errori Guida all'invio §4](/en/guide/submission#4-end-to-end-processing-flow-backend)).

---

## 6. Salvataggio automatico e ripristino bozza

- La bozza (`manifest` + corpo per sezione) si salva automaticamente nel `localStorage` del browser
  (chiave: `papex-writespace-draft`), debounce 400ms — sopravvive alla chiusura della pagina.
- Riaprire `/writespace` ripristina automaticamente l'ultima bozza e mostra "bozza locale ripristinata";
  dopo la modifica mostra "salvato automaticamente".
- Il pulsante in alto **Nuovo** chiede conferma, cancella `localStorage` e ripristina a una
  bozza vuota (con una sezione di intro di esempio).

> Le bozze vivono solo nel browser locale; cambiare dispositivo o cancellare i dati del browser le fa perdere.
> Per lavori importanti, ricorda di **Esportare** o **Pubblicare**.

---

## 7. Struttura dell'archivio esportato

Il `tar.gz` prodotto da **Esporta / Pubblica** è assemblato da `buildArchiveFiles()` ed è
pienamente compatibile con quanto si aspetta il backend `papex-archive.ts`:

```
my-paper.tar.gz
├── papex.json            # manifest dell'editor, serializzato (indentazione 2 spazi)
├── papex-template.tex    # doc principale con bibstyle/twocolumn iniettati
├── papex.cls             # classe documento (inclusa da /writespace/papex.cls)
├── references.bib        # auto-generato dai riferimenti (omesso se assenti)
├── sections/
│   ├── intro.tex         # la sezione che hai scritto in "Corpo"
│   └── …
└── _papex_*.tex          # frammenti intermedi auto-generati (non modificare)
    ├── _papex_meta.tex       # titolo/autori/affiliazioni/parole chiave/titolo running
    ├── _papex_abstract.tex   # riassunto
    ├── _papex_sections.tex   # assemblaggio \section + \input
    ├── _papex_backmatter.tex # riconoscimenti/finanziamenti
    └── _papex_appendices.tex # \appendix + allegati
```

- I file `_papex_*.tex` sono prodotti da `genMeta` / `genAbstract` / `genSections` /
  `genBackmatter` / `genAppendices`; i campi di testo semplice passano attraverso un singolo `latexEscape`,
  mentre i corpi di sezione sono `\input` verbatim.
- Questo archivio può essere caricato manualmente nella pagina "caricamento pacchetto sorgente", o inviato
  automaticamente dal pulsante **Pubblica** — i due sono equivalenti.

---

## 8. Note di implementazione

| Aspetto | Implementazione |
| --- | --- |
| Modello dati | `src/lib/writespace/manifest.ts`: tipi allineati con `papex.schema.json` + `papex-json.ts`, puro frontend, nessun import server |
| Generazione LaTeX | `src/lib/writespace/latex-gen.ts`: porta la logica di `papex-build.py` a TS; l'escaping usa una **scansione carattere a passaggio singolo** (coerente con il `papex-build.py` fisso, evitando il re-escaping di `\textbackslash{}`) |
| Impacchettamento | `src/lib/writespace/targz.ts`: ustar implementato a mano + `CompressionStream('gzip')`, zero-dipendenze, puro browser |
| Asset template | `public/writespace/papex.cls` + `papex-template.tex` (copiati da `papex-latex/`, normalizzati LF), recuperati a runtime nell'archivio |
| Orchestrazione | `src/components/writespace/writespace-client.tsx`: tre `Tabs` + persistenza bozza + export/pubblica |
| Internazionalizzazione | `src/i18n/dictionaries/{zh,en}.ts` blocco `writespace` (~70 chiavi), corrispondenti alle etichette UI |

---

## 9. Sicurezza e limiti

- **Permessi**: sia l'ingresso che la pubblicazione richiedono il login; un articolo target di nuova versione deve appartenere
  all'utente corrente (o a un ruolo privilegiato), altrimenti il backend restituisce `FORBIDDEN`.
- **Nessuna persistenza lato server**: tutta la generazione e l'impacchettamento avvengono in memoria nel browser; i file lasciano
  la macchina solo quando clicchi download/pubblica. La piattaforma applica comunque il sandbox TeX,
  i limiti di dimensione e la disabilitazione dello shell-escape dalla
  [Guida all'invio §6/§7](/en/guide/submission#6-deployment-and-ops).
- **Supporto browser**: `CompressionStream('gzip')` richiede un browser recente (Chrome/Edge 80+,
  Firefox 113+, Safari 16.4+); quando non disponibile, l'export fallisce con un messaggio amichevole.
- **Limite 50MB**: la pubblicazione passa tramite `/api/submit/archive` ed è soggetta allo stesso limite di 50MB.

---

## 10. FAQ

**D: Authoring online vs. caricamento pacchetto sorgente — quale usare?**
Entrambi. L'authoring online si adatta agli autori che non vogliono la riga di comando e vogliono una convalida live;
il caricamento pacchetto sorgente si adatta a chi ha un progetto TeX locale e vuole il controllo fine di `papex-build.py`.
Entrambi producono risultati identici nel database.

**D: Il `tar.gz` esportato può essere caricato manualmente nella pagina "caricamento pacchetto sorgente"?**
Sì, ed è equivalente. L'archivio esportato include già `papex.cls` e
`papex-template.tex`, quindi il backend non deve copiarli da `PAPEX_LATEX_DIR`.

**D: Ho usato `\cite{key}` nel corpo ma la citazione non si è collegata dopo la pubblicazione?**
Il collegamento delle citazioni dipende dal fatto che il `doi` / `arxivId` del riferimento corrisponda a un articolo già presente
sulla piattaforma; le voci con solo `url` / `title` finiscono nel grafo delle citazioni ma non formano un
link interno. Controlla che il DOI / ID arXiv del riferimento sia accurato.

**D: Le bozze sono sincronizzate sul cloud?**
No. Le bozze vivono solo nel `localStorage` del browser; cambiare dispositivo o cancellare la cache le fa perdere.
Prendi l'abitudine di **Esportare** o **Pubblicare**.

**D: Le formule `$...$` nel corpo verranno danneggiate?**
No. La sezione `.tex` è scritta verbatim (nessun escaping); le formule sono renderizzate dalla compilazione XeLaTeX del backend.
Solo i campi di testo semplice in "Metadati" vengono escapati.

**D: Nessun PDF subito dopo la pubblicazione?**
Come nella [FAQ della Guida all'invio](/en/guide/submission#8-faq): dipende dal fatto che il server
abbia TeX Live configurato; se non lo ha, `pdfUrl` è vuoto e la pagina mostra "Il PDF è in compilazione in background".
