# Amministrazione e permessi

Oltre all'invio e alla ricerca di base, Papex include un'**area admin** rivolta agli operatori e un
**sistema di permessi granulare**. Questa guida copre quattro capacità:

1. **Ruoli e permessi (RBAC)** — controlla la pubblicazione, la visualizzazione, il download e i commenti degli articoli per ruolo o per utente.
2. **Gestione permessi utente** — assegna ruoli extra e imposta override allow / deny per utente per qualsiasi permesso.
3. **Co-review (revisione tra pari)** — gli admin inviano richieste di co-review; i revisori accettano, inviano pareri e ricevono ricevute, formando un ciclo chiuso.
4. **Messaggi categorizzati e broadcast** — un centro di notifiche unificato che abbraccia avvisi di sistema, risultati di revisione, ricevute dei ticket, richieste di co-review, DM admin e risposte della community, oltre a broadcast mirati.

---

## 1. Ruoli e permessi (RBAC)

Papex usa un modello a tre livelli — **ruolo base + ruoli assegnati + override per utente** — supportando sia l'autorizzazione di massa basata sui ruoli sia restrizioni personalizzate per utente.

### 1.1 Modello dei permessi

| Livello | Descrizione | Mantenuto in |
| --- | --- | --- |
| Ruolo base | Il ruolo intrinseco a ogni utente in `users.role`: `author` / `moderator` / `admin` | Predefinito `author` alla registrazione |
| Ruoli assegnati | Ruoli extra sovrapposti a un utente tramite la tabella di join `user_roles` | Pagina di gestione utenti |
| Override per utente | *allow* o *deny* esplicito per un singolo permesso su un utente; priorità massima | Pagina di gestione utenti |

> ℹ️ `reader` è un ruolo RBAC **assegnato** (nella tabella `roles`), non un ruolo base del database (`users.role` consente solo `author` / `moderator` / `admin`). Il ruolo base definisce il limite di login e permesso predefinito; i ruoli assegnati si sovrappongono.

### 1.2 Catalogo dei permessi

Il sistema fornisce **15 permessi** su **6 gruppi**:

| Gruppo | Chiave permesso | Nome | Descrizione |
| --- | --- | --- | --- |
| paper | `paper:publish` | Pubblica articolo | Invia un nuovo articolo o versione |
| | `paper:view` | Visualizza articolo | Sfoglia gli articoli pubblicati |
| | `paper:download` | Scarica articolo | Scarica PDF / pacchetto sorgente |
| | `paper:moderate` | Modera articolo | Approva / rifiuta / ritira |
| comment | `comment:create` | Pubblica commento | Commenta e rispondi sotto gli articoli |
| | `comment:view` | Visualizza commenti | Sfoglia la sezione commenti |
| ticket | `ticket:create` | Crea ticket | Apri feedback / ticket |
| | `ticket:manage` | Gestisci ticket | Rispondi a / gestisci i ticket |
| co_review | `co_review:assign` | Assegna co-review | Invia una richiesta di co-review |
| | `co_review:respond` | Prendi co-review | Accetta / rifiuta una richiesta |
| | `co_review:manage` | Gestisci co-review | Visualizza tutti gli avanzamenti di co-review |
| message | `message:broadcast` | Broadcast | Invia messaggi agli utenti |
| admin | `user:manage` | Gestisci utenti | Visualizza / modifica utenti |
| | `role:manage` | Gestisci ruoli | Configura ruoli e permessi |
| | `permission:manage` | Gestisci override | Allow / deny per utente |

### 1.3 Permessi predefiniti dei ruoli

Il seed (`db:seed`) scrive una mappatura dei permessi predefinita per ogni ruolo di sistema:

| Ruolo | Conteggio | Permessi |
| --- | --- | --- |
| `admin` | 15 | Tutti i permessi |
| `moderator` | 12 | visualizzazione/download/moderazione articolo, creazione/visualizzazione commenti, creazione/gestione ticket, assegnazione/risposta/gestione co-review, broadcast, gestione utenti |
| `author` | 6 | pubblicazione/visualizzazione/download articolo, creazione/visualizzazione commenti, creazione ticket |
| `reader` | 3 | visualizzazione/download articolo, visualizzazione commenti |

### 1.4 Ordine di risoluzione

Quando viene eseguita un'operazione protetta, i permessi effettivi si risolvono come:

```
permessi ruolo base
  ∪ permessi ruoli assegnati      (unione ruoli)
  ∪ override per utente marcati allow
  − override per utente marcati deny  (gli override vincono)
```

Quindi anche se né il ruolo base né quelli assegnati concedono `paper:publish`, un override *allow* esplicito lo consente comunque; viceversa, un *deny* esplicito lo blocca anche quando i ruoli lo concedono.

> Fallback: se le tabelle `roles` / `permissions` non sono ancora state popolate (es. un DB nuovo senza `db:seed`), il motore ricade sulla mappatura predefinita costante sopra per evitare di bloccare l'intero sito. Eseguire `db:seed` dopo il deploy è comunque raccomandato.

### 1.5 Operazioni protette (gateway)

Le operazioni chiave sono controllate; la mancanza di permesso restituisce `403`:

- `POST /api/papers` — richiede `paper:publish`
- `POST /api/papers/:id/comments` — richiede `comment:create`
- Moderazione, gestione ticket, assegnazione / gestione co-review, modifiche utenti e ruoli, broadcast, ecc. richiedono i rispettivi permessi, e le route sono protette dal `middleware` (solo `moderator` / `admin` possono entrare in `/admin`).

---

## 2. Gestione permessi utente

Apri **`/admin/users`** (richiede `user:manage`):

- **Cerca utenti** per nome utente / email / nome visualizzato, con paginazione.
- **Assegna ruoli extra**: seleziona i ruoli di sistema (`admin` / `moderator` / `author` / `reader`) nell'editor utente per sovrapporli al ruolo base.
- **Override permessi a tre stati**: per ciascuno dei 15 permessi imposta:
  - **inherit** (predefinito) — segui il risultato dell'unione dei ruoli;
  - **allow** — forza la concessione anche se i ruoli la omettono;
  - **deny** — forza il blocco anche se i ruoli la includono.

Tutte le modifiche si salvano istantaneamente via `PATCH /api/admin/users/:id` e si applicano ai successivi controlli di autorizzazione di quell'utente.

---

## 3. Co-review (revisione tra pari)

Il co-review è un ciclo completo di revisione tra pari che collega **admin → revisore → autore**.

### 3.1 Ciclo chiuso

```
Admin assegna ──► Il revisore riceve un messaggio "richiesta co-review"
     │
     ▼
Il revisore risponde (accetta / rifiuta)
     │ accetta
     ▼
Il revisore invia il parere (approva / rifiuta / rivedi + commento)
     │
     ▼
Ricevuta di sistema ──► notifica l'assegnatore "parere inviato"
                ──► notifica l'autore "co-review completato" (se autore ≠ assegnatore)
```

### 3.2 Macchina a stati

Un record di co-review (`co_reviews`) transisce come segue:

| Stato | Significato | Inserito da |
| --- | --- | --- |
| `pending` | In attesa della risposta del revisore | Assegnazione admin (`POST /api/co-reviews`) |
| `accepted` | Accettato | Il revisore accetta (`POST /api/co-reviews/:id/respond` `{accepted:true}`) |
| `declined` | Rifiutato | Il revisore rifiuta (`respond` `{accepted:false}`) |
| `completed` | Completato | Il revisore invia il parere (`submit`) |
| `expired` | Scaduto | (stato riservato per la chiusura per timeout) |

> Un revisore può rispondere solo mentre è `pending`, e può inviare un parere solo mentre è `accepted`. Uno stato non corrispondente restituisce `INVALID_STATE`.

### 3.3 Punti di ingresso e notifiche

- **Admin**: `/admin/co-reviews` per assegnare e monitorare tutti i co-review; `/admin/co-reviews/:id` per il dettaglio. L'assegnazione sceglie tra gli articoli nello stato `submitted`.
- **Revisore**: `/co-reviews` (le mie revisioni) e `/co-reviews/:id` (accetta / rifiuta + invia parere).
- **Notifiche unificate**: ogni cambio di stato innesca un messaggio `co_review_request` / `co_review_result` alle parti rilevanti (vedi Sezione 4).

---

## 4. Messaggi categorizzati e broadcast

### 4.1 Categorie dei messaggi

I messaggi sono classificati per `kind` in **8 categorie**, colorate e raggruppate nella casella in arrivo:

| kind | Etichetta | Tono | Fonte tipica |
| --- | --- | --- | --- |
| `system` | Avviso di sistema | predefinito | Eventi di sistema |
| `ticket_reply` | Ricevuta ticket | info blu | Ticket risposto |
| `announcement` | Annuncio | avviso giallo | Broadcast admin |
| `review_result` | Risultato revisione | successo verde | Articolo approvato / rifiutato |
| `co_review_request` | Richiesta co-review | viola | Co-review assegnato |
| `co_review_result` | Ricevuta co-review | viola | Risposta / parere inviato |
| `admin_message` | DM admin | pericolo rosso | Messaggio diretto mirato |
| `community_reply` | Risposta community | info blu | Commento risposto |

La casella in arrivo (`/messages`) supporta il filtro per categoria (`GET /api/messages?kind=...`); cliccando un messaggio si naviga verso il suo `link` associato (articolo, ticket, co-review, …).

### 4.2 Imbuto di notifica unificato

Tutti gli avvisi tra moduli sono emessi tramite un singolo servizio `notifications` così che i moduli di revisione, ticket, co-review e community condividano un unico contratto di notifica:

- **Revisione**: decisione articolo → notifica autore (`review_result`).
- **Ticket**: risposta dello staff → notifica il segnalatore (`ticket_reply`).
- **Co-review**: assegna / rispondi / invia → notifica revisore, assegnatore, autore (`co_review_request` / `co_review_result`).
- **Community**: commento risposto → notifica l'autore del commento padre (`community_reply`).

### 4.3 Broadcast

Apri **`/admin/messages`** (richiede `message:broadcast`):

- **Ambito**:
  - `all` — ogni utente;
  - `role` — un ruolo base (`author` / `moderator` / `admin`);
  - `userIds` — un elenco di ID utente specifici.
- **Kind**: `announcement` / `system` / `admin_message`.
- Compila titolo, corpo (con `link` opzionale), invia, e il messaggio viene scritto in blocco al pubblico target; viene restituito il conteggio di successo.

---

## 5. Navigazione admin

I punti di ingresso admin si trovano nel menu utente connesso e nella panoramica `/admin`, includendo:

| Modulo | Route | Descrizione |
| --- | --- | --- |
| Panoramica | `/admin` | Card statistiche + scorciatoie modulo |
| Coda revisione | `/admin/review` | Approva / rifiuta articoli (+ motivo) |
| Statistiche | `/admin/stats` | Metriche della piattaforma |
| Ticket | `/admin/tickets` | Gestione ticket |
| Co-review | `/admin/co-reviews` | Assegna e monitora co-review |
| Utenti | `/admin/users` | Ruoli e override permessi |
| Ruoli | `/admin/roles` | Matrice permessi ruolo |
| Messaggi | `/admin/messages` | Broadcast |

> Queste route sono protette dal `middleware`; solo gli utenti con ruolo base `moderator` o `admin` possono accedervi, e le azioni di scrittura richiedono inoltre il permesso granulare corrispondente.

---

## 6. Ops: migra e seed

I quattro sistemi dipendono dalla migrazione `0003_add_rbac_co_review_messages` (aggiunge `roles` / `permissions` / `role_permissions` / `user_roles` / `user_permissions` / `co_reviews` / `moderation_logs`, ed estende `messages.kind` a 8 categorie). Al deploy o all'inizializzazione locale esegui:

```bash
npm run db:migrate   # applica le migrazioni (RBAC / co-review / categorie messaggi)
npm run db:seed      # scrive 4 ruoli di sistema + 15 permessi + default (idempotente)
```

Il seed RBAC usa `onConflictDoNothing` ed è sicuro da rieseguire. Dopo migrate + seed, il motore dei permessi usa le tabelle `roles` / `permissions`; prima del seed ricade sui default costanti (vedi 1.4).

---

## 7. Riferimento rapido API

| Metodo | Path | Descrizione |
| --- | --- | --- |
| `GET` | `/api/messages?kind=` | Casella in arrivo, filtra per categoria |
| `POST` | `/api/papers/:id/moderate` | Modera `{action:"approve"\|"reject"\|"withdraw", reason?}` |
| `GET` | `/api/co-reviews?scope=mine\|all` | Elenco co-review (miei / tutti) |
| `POST` | `/api/co-reviews` | Assegna `{paperId, reviewerId, note?}` |
| `GET` | `/api/co-reviews/:id` | Dettaglio co-review |
| `POST` | `/api/co-reviews/:id/respond` | Rispondi `{accepted:boolean}` |
| `POST` | `/api/co-reviews/:id/submit` | Invia `{decision:"approve"\|"reject"\|"revise", comment}` |
| `GET` | `/api/admin/users` | Elenco utenti (paginazione / ricerca) |
| `PATCH` | `/api/admin/users/:id` | Imposta ruoli `{roleKeys}` o override `{permission:{key,grant}}` |
| `GET` | `/api/admin/roles` | Elenco ruoli |
| `PUT` | `/api/admin/roles/:id` | Imposta permessi ruolo `{permissionKeys}` |
| `POST` | `/api/admin/messages` | Broadcast `{scope, role?, userIds?, kind, title, body, link?}` |
| `GET` | `/api/admin/stats` | Statistiche piattaforma |

Vedi il [riferimento API](/en/guide/api) per l'elenco completo.
