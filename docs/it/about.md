# Informazioni su Papex

Papex è una piattaforma **open-source e indipendente** per gestire e scoprire la letteratura accademica. Il nostro obiettivo è fornire ai ricercatori un'infrastruttura aperta, trasparente e auto-ospitabile.

## La nostra missione

Papex abbassa la barriera all'infrastruttura per la letteratura accademica: dall'invio e dal versioning alla ricerca full-text e alle API aperte, tutto può essere liberamente distribuito ed esteso. Valutiamo gli standard aperti e la collaborazione della community più del lock-in.

## Funzionalità principali

- **Invio e versioning**: articoli multi-versione con riassunti, autori e PDF archiviati in modo permanente; l'analisi batch dei PDF estrae testo e riferimenti al caricamento; ritiro con motivo registrato.
- **Ricerca full-text e avanzata**: ricerca multilingue (CJK/inglese) con `tsvector` + `pg_trgm`, sintassi booleana avanzata (scoping dei campi `ti/abs/au/cat/id`, AND/OR/NOT, parentesi), con filtri per categoria, autore e intervallo di date e ordinamento per citazioni.
- **Categorie e tag**: un albero di categorie tematiche con cross-listing, oltre a tag creati dagli utenti, auto-tagging e una nuvola dei tag più frequenti nella home.
- **Autori e affiliazioni**: profili autore che elencano articoli e affiliazioni istituzionali.
- **Citazioni, analisi ed export**: un grafo delle citazioni (relazioni DOI / paper-id) con vista a forza diretta, analisi di co-citazione e co-autorato, conteggi delle citazioni ed export GB/T 7714 · BibTeX · APA.
- **Bibliometria**: totali di citazioni per autore, indice H e una rete di co-autori ECharts.
- **Commenti e discussioni**: risposte annidate su ogni articolo.
- **Sottoscrizioni, avvisi e RSS/email**: segui categorie, autori e articoli; un feed consolidato con un badge di non letti in tempo reale; consegna opzionale via Resend/SMTP o RSS.
- **Segnalibri e gruppi**: salvataggio con un clic più gruppi di segnalibri denominati per organizzare una raccolta di lettura successiva.
- **Messaggi, ticket e feedback**: messaggi interni integrati, una macchina a stati per i ticket e feedback per il supporto della community.
- **Co-review (revisione tra pari)**: un ciclo completo di assegnazione, risposta, invio del parere e ricevuta, con notifiche unificate.
- **Permessi, ruoli ed endorsement**: accesso granulare basato sui ruoli con controllo per ruolo o per utente, una coda di moderazione e un gate di endorsement per il primo invio.
- **Analisi admin**: aggregati di invio, categoria, autore e revisione con grafici.
- **API aperta e chiavi API**: una specifica OpenAPI 3.1 con documentazione interattiva, oltre a chiavi API programmatiche che ereditano il RBAC del proprietario.
- **Profili, temi e i18n**: profili personali e pagine `/u/[username]`, temi chiaro/scuro e un'interfaccia cinese/inglese.
- **Authoring basato sul browser (Writespace)**: scrittura, compilazione e pubblicazione LaTeX con un clic nel browser.

## Open source

Papex è distribuito con licenza [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) ed è gratuito per uso commerciale e non commerciale. I contributi sono benvenuti tramite ticket e feedback.
