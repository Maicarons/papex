# Administration & Berechtigungen

Neben Kern-Einreichung und Suche bringt Papex einen betreiberorientierten **Admin-Bereich** und ein **feingranulares Berechtigungssystem** mit. Dieses Handbuch behandelt vier Fähigkeiten:

1. **Rollen & Berechtigungen (RBAC)** — Paper-Veröffentlichung, -Ansicht, -Download und -Kommentare nach Rolle oder pro Benutzer steuern.
2. **Benutzerberechtigungs-Verwaltung** — zusätzliche Rollen zuweisen und pro-Benutzer Erlauben/Verweigern-Overrides für jede Berechtigung setzen.
3. **Co-Review (Peer-Review)** — Admins senden Co-Review-Anfragen; Reviewer nehmen an, reichen Stellungnahmen ein und erhalten Empfangsbestätigungen, was einen geschlossenen Kreislauf bildet.
4. **Kategorisierte Nachrichten & Broadcast** — ein einheitliches Benachrichtigungszentrum über Systemhinweise, Review-Ergebnisse, Ticket-Empfangsbestätigungen, Co-Review-Anfragen, Admin-DMs und Community-Antworten hinweg, plus gezielte Broadcasts.

---

## 1. Rollen & Berechtigungen (RBAC)

Papex nutzt ein Drei-Schichten-Modell — **Basisrolle + zugewiesene Rollen + pro-Benutzer-Overrides** — das sowohl massenhafte rollenbasierte Autorisierung als auch personalisierte pro-Benutzer-Einschränkungen unterstützt.

### 1.1 Berechtigungsmodell

| Schicht | Beschreibung | Gepflegt unter |
| --- | --- | --- |
| Basisrolle | Die jedem Benutzer innewohnende Rolle in `users.role`: `author` / `moderator` / `admin` | Standard `author` bei Registrierung |
| Zugewiesene Rollen | Zusätzliche Rollen, die über die Join-Tabelle `user_roles` auf einen Benutzer gelegt werden | Benutzerverwaltungsseite |
| Pro-Benutzer-Overrides | Explizites *Erlauben* oder *Verweigern* für eine einzelne Berechtigung auf einem Benutzer; höchste Priorität | Benutzerverwaltungsseite |

> ℹ️ `reader` ist eine **zugewiesene** RBAC-Rolle (in der `roles`-Tabelle), keine Datenbank-Basisrolle (`users.role` erlaubt nur `author` / `moderator` / `admin`). Die Basisrolle definiert Login und Standard-Berechtigungsgrenze; zugewiesene Rollen stapeln obenauf.

### 1.2 Berechtigungskatalog

Das System bringt **15 Berechtigungen** in **6 Gruppen** mit:

| Gruppe | Berechtigungsschlüssel | Name | Beschreibung |
| --- | --- | --- | --- |
| paper | `paper:publish` | Paper veröffentlichen | Ein neues Paper oder eine Version einreichen |
| | `paper:view` | Paper ansehen | Veröffentlichte Papers durchsuchen |
| | `paper:download` | Paper herunterladen | PDF / Quellpaket herunterladen |
| | `paper:moderate` | Paper moderieren | Freigeben / ablehnen / zurückziehen |
| comment | `comment:create` | Kommentar posten | Kommentieren & antworten unter Papers |
| | `comment:view` | Kommentare ansehen | Den Kommentarbereich durchsuchen |
| ticket | `ticket:create` | Ticket erstellen | Feedback / Ticket öffnen |
| | `ticket:manage` | Tickets verwalten | Auf Tickets antworten / sie bearbeiten |
| co_review | `co_review:assign` | Co-Review zuweisen | Eine Co-Review-Anfrage senden |
| | `co_review:respond` | Co-Review übernehmen | Eine Anfrage annehmen / ablehnen |
| | `co_review:manage` | Co-Review verwalten | Allen Co-Review-Fortschritt ansehen |
| message | `message:broadcast` | Broadcast | Nachrichten an Benutzer senden |
| admin | `user:manage` | Benutzer verwalten | Benutzer ansehen / bearbeiten |
| | `role:manage` | Rollen verwalten | Rollen & Berechtigungen konfigurieren |
| | `permission:manage` | Overrides verwalten | Pro-Benutzer Erlauben / Verweigern |

### 1.3 Standardrollen-Berechtigungen

Der Seed (`db:seed`) schreibt eine Standard-Berechtigungszuordnung für jede Systemrolle:

| Rolle | Anzahl | Berechtigungen |
| --- | --- | --- |
| `admin` | 15 | Alle Berechtigungen |
| `moderator` | 12 | Paper ansehen/herunterladen/moderieren, Kommentar erstellen/ansehen, Ticket erstellen/verwalten, Co-Review zuweisen/übernehmen/verwalten, Broadcast, Benutzer verwalten |
| `author` | 6 | Paper veröffentlichen/ansehen/herunterladen, Kommentar erstellen/ansehen, Ticket erstellen |
| `reader` | 3 | Paper ansehen/herunterladen, Kommentar ansehen |

### 1.4 Auflösungsreihenfolge

Wenn ein geschützter Vorgang läuft, werden die effektiven Berechtigungen wie folgt aufgelöst:

```
Basisrollen-Berechtigungen
  ∪ zugewiesene Rollen-Berechtigungen      (Rollenvereinigung)
  ∪ pro-Benutzer-Overrides markiert „erlauben“
  − pro-Benutzer-Overrides markiert „verweigern“  (Overrides gewinnen)
```

Also erlaubt selbst dann, wenn weder Basis- noch zugewiesene Rollen `paper:publish` gewähren, ein expliziter *Erlauben*-Override es weiterhin; umgekehrt blockiert ein explizites *Verweigern* es selbst dann, wenn Rollen es gewähren.

> Fallback: sind die `roles` / `permissions`-Tabellen noch nicht geseedet (z. B. eine frische DB ohne `db:seed`), fällt die Engine auf die obige konstante Standard-Zuordnung zurück, um eine Sperrung der ganzen Seite zu vermeiden. `db:seed` nach dem Deploy auszuführen wird dennoch empfohlen.

### 1.5 Geschützte Vorgänge (Gateways)

Zentrale Vorgänge sind abgesichert; fehlende Berechtigung gibt `403` zurück:

- `POST /api/papers` — benötigt `paper:publish`
- `POST /api/papers/:id/comments` — benötigt `comment:create`
- Moderation, Ticket-Bearbeitung, Co-Review-Zuweisung/-Verwaltung, Benutzer- & Rollenbearbeitung, Broadcast usw. benötigen ihre jeweiligen Berechtigungen, und die Routen sind durch `middleware` geschützt (nur `moderator` / `admin` dürfen `/admin` betreten).

---

## 2. Benutzerberechtigungs-Verwaltung

Öffne **`/admin/users`** (benötigt `user:manage`):

- **Benutzer suchen** nach Benutzername / E-Mail / Anzeigename, mit Pagination.
- **Zusätzliche Rollen zuweisen**: Systemrollen (`admin` / `moderator` / `author` / `reader`) im Benutzer-Editor anhaken, um auf die Basisrolle zu stapeln.
- **Drei-Zustands-Berechtigungs-Override**: für jede der 15 Berechtigungen setzen:
  - **erben** (Standard) — dem Rollenvereinigungs-Ergebnis folgen;
  - **erlauben** — erzwingen, selbst wenn Rollen sie auslassen;
  - **verweigern** — erzwingen-blockieren, selbst wenn Rollen sie enthalten.

Alle Änderungen speichern sofort über `PATCH /api/admin/users/:id` und gelten für die nachfolgenden Autorisierungsprüfungen dieses Benutzers.

---

## 3. Co-Review (Peer-Review)

Co-Review ist ein vollständiger Peer-Review-Kreislauf, der **Admin → Reviewer → Autor** verbindet.

### 3.1 Geschlossener Kreislauf

```
Admin weist zu ──► Reviewer erhält eine „Co-Review-Anfrage“-Nachricht
     │
     ▼
Reviewer antwortet (annehmen / ablehnen)
     │ annehmen
     ▼
Reviewer reicht Stellungnahme ein (freigeben / ablehnen / überarbeiten + Kommentar)
     │
     ▼
System-Empfangsbestätigung ──► benachrichtigt Zuweiser „Stellungnahme eingereicht“
                ──► benachrichtigt Autor „Co-Review abgeschlossen“ (falls Autor ≠ Zuweiser)
```

### 3.2 Zustandsmaschine

Ein Co-Review-Datensatz (`co_reviews`) wechselt wie folgt:

| Zustand | Bedeutung | Eingetreten durch |
| --- | --- | --- |
| `pending` | Wartet auf Reviewer-Antwort | Admin-Zuweisung (`POST /api/co-reviews`) |
| `accepted` | Angenommen | Reviewer nimmt an (`POST /api/co-reviews/:id/respond` `{accepted:true}`) |
| `declined` | Abgelehnt | Reviewer lehnt ab (`respond` `{accepted:false}`) |
| `completed` | Abgeschlossen | Reviewer reicht Stellungnahme ein (`submit`) |
| `expired` | Abgelaufen | (reservierter Zustand für Timeout-Schließung) |

> Ein Reviewer darf nur antworten, solange `pending`, und nur eine Stellungnahme einreichen, solange `accepted`. Ein nicht passender Zustand gibt `INVALID_STATE` zurück.

### 3.3 Eingänge & Benachrichtigungen

- **Admin**: `/admin/co-reviews` zum Zuweisen und Überwachen aller Co-Reviews; `/admin/co-reviews/:id` für Detail. Die Zuweisung wählt aus Papers im Status `submitted`.
- **Reviewer**: `/co-reviews` (meine Reviews) und `/co-reviews/:id` (annehmen / ablehnen + Stellungnahme einreichen).
- **Einheitliche Benachrichtigungen**: jede Zustandsänderung feuert eine `co_review_request` / `co_review_result`-Nachricht an die Beteiligten (siehe Abschnitt 4).

---

## 4. Kategorisierte Nachrichten & Broadcast

### 4.1 Nachrichtenkategorien

Nachrichten werden nach `kind` in **8 Kategorien** klassifiziert, farbig und gruppiert im Posteingang:

| kind | Label | Ton | Typische Quelle |
| --- | --- | --- | --- |
| `system` | Systemhinweis | Standard | Systemereignisse |
| `ticket_reply` | Ticket-Empfangsbestätigung | Info blau | Ticket beantwortet |
| `announcement` | Ankündigung | Warnung gelb | Admin-Broadcast |
| `review_result` | Review-Ergebnis | Erfolg grün | Paper freigegeben / abgelehnt |
| `co_review_request` | Co-Review-Anfrage | lila | Co-Review zugewiesen |
| `co_review_result` | Co-Review-Empfangsbestätigung | lila | Antwort / Stellungnahme eingereicht |
| `admin_message` | Admin-DM | Gefahr rot | Gezielte Direktnachricht |
| `community_reply` | Community-Antwort | Info blau | Auf Kommentar geantwortet |

Der Posteingang (`/messages`) unterstützt Filtern nach Kategorie (`GET /api/messages?kind=...`); Klick auf eine Nachricht navigiert zu deren zugehörigem `link` (Paper, Ticket, Co-Review, …).

### 4.2 Einheitlicher Benachrichtigungs-Trichter

Alle cross-modularen Alarme werden über einen einzigen `notifications`-Service ausgesendet, sodass Review-, Ticket-, Co-Review- und Community-Module einen gemeinsamen Benachrichtigungsvertrag teilen:

- **Review**: Paper-Entscheidung → Autor benachrichtigen (`review_result`).
- **Tickets**: Mitarbeiter-Antwort → Reporter benachrichtigen (`ticket_reply`).
- **Co-Review**: zuweisen / antworten / einreichen → Reviewer, Zuweiser, Autor benachrichtigen (`co_review_request` / `co_review_result`).
- **Community**: auf Kommentar geantwortet → Autor des Eltern-Kommentars benachrichtigen (`community_reply`).

### 4.3 Broadcast

Öffne **`/admin/messages`** (benötigt `message:broadcast`):

- **Umfang**:
  - `all` — jeder Benutzer;
  - `role` — eine Basisrolle (`author` / `moderator` / `admin`);
  - `userIds` — eine Liste spezifischer Benutzer-IDs.
- **Kind**: `announcement` / `system` / `admin_message`.
- Titel, Body (mit optionalem `link`) ausfüllen, absenden, und die Nachricht wird in Massen an die Zielgruppe geschrieben; die Erfolgszahl wird zurückgegeben.

---

## 5. Admin-Navigation

Admin-Eingänge liegen im angemeldeten Benutzermenü und der `/admin`-Übersicht, einschließlich:

| Modul | Route | Beschreibung |
| --- | --- | --- |
| Übersicht | `/admin` | Stat-Karten + Modul-Shortcuts |
| Review-Warteschlange | `/admin/review` | Papers freigeben / ablehnen (+ Grund) |
| Statistiken | `/admin/stats` | Plattform-Kennzahlen |
| Tickets | `/admin/tickets` | Ticket-Bearbeitung |
| Co-Review | `/admin/co-reviews` | Co-Reviews zuweisen & überwachen |
| Benutzer | `/admin/users` | Rollen & Berechtigungs-Overrides |
| Rollen | `/admin/roles` | Rollen-Berechtigungsmatrix |
| Nachrichten | `/admin/messages` | Broadcast |

> Diese Routen sind durch `middleware` geschützt; nur Benutzer mit einer `moderator`- oder `admin`-Basisrolle dürfen sie betreten, und Schreib-Aktionen benötigen zusätzlich die passende feingranulare Berechtigung.

---

## 6. Ops: migrieren & seeden

Die vier Systeme hängen von der Migration `0003_add_rbac_co_review_messages` ab (fügt `roles` / `permissions` / `role_permissions` / `user_roles` / `user_permissions` / `co_reviews` / `moderation_logs` hinzu und erweitert `messages.kind` auf 8 Kategorien). Beim Deploy oder lokaler Init ausführen:

```bash
npm run db:migrate   # Migrationen anwenden (RBAC / Co-Review / Nachrichtenkategorien)
npm run db:seed      # 4 Systemrollen + 15 Berechtigungen + Defaults schreiben (idempotent)
```

Der RBAC-Seed nutzt `onConflictDoNothing` und ist sicher erneut ausführbar. Nach Migrate + Seed nutzt die Berechtigungs-Engine die `roles` / `permissions`-Tabellen; vor dem Seeden fällt sie auf die konstanten Defaults zurück (siehe 1.4).

---

## 7. API-Kurzreferenz

| Methode | Pfad | Beschreibung |
| --- | --- | --- |
| `GET` | `/api/messages?kind=` | Posteingang, nach Kategorie filtern |
| `POST` | `/api/papers/:id/moderate` | Moderieren `{action:"approve"\|"reject"\|"withdraw", reason?}` |
| `GET` | `/api/co-reviews?scope=mine\|all` | Co-Review-Liste (meine / alle) |
| `POST` | `/api/co-reviews` | Zuweisen `{paperId, reviewerId, note?}` |
| `GET` | `/api/co-reviews/:id` | Co-Review-Detail |
| `POST` | `/api/co-reviews/:id/respond` | Antworten `{accepted:boolean}` |
| `POST` | `/api/co-reviews/:id/submit` | Einreichen `{decision:"approve"\|"reject"\|"revise", comment}` |
| `GET` | `/api/admin/users` | Benutzerliste (Pagination / Suche) |
| `PATCH` | `/api/admin/users/:id` | Rollen setzen `{roleKeys}` oder Override `{permission:{key,grant}}` |
| `GET` | `/api/admin/roles` | Rollenliste |
| `PUT` | `/api/admin/roles/:id` | Rollenberechtigungen setzen `{permissionKeys}` |
| `POST` | `/api/admin/messages` | Broadcast `{scope, role?, userIds?, kind, title, body, link?}` |
| `GET` | `/api/admin/stats` | Plattform-Statistiken |

Siehe die [API-Referenz](/en/guide/api) für die vollständige Liste.
