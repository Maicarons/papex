# 管理と権限

中核的な投稿と検索に加え、Papexは運用者向けの**管理エリア**と**きめ細かな権限システム**を備えています。本ガイドでは4つの機能を扱います。

1. **ロールと権限（RBAC）** — ロールごとまたはユーザーごとに、論文の公開・閲覧・ダウンロード・コメントを制御。
2. **ユーザー権限管理** — 追加ロールの割り当てと、任意の権限に対するユーザーごとの許可／拒否上書きの設定。
3. **共創レビュー（ピアレビュー）** — 管理者が共創レビューを送信；レビューアが承諾し、意見を提出し、受領通知を受け取り、閉ループを形成。
4. **分類メッセージと Broadcast** — システム通知・レビュー結果・チケット受領・共創レビュー依頼・管理者DM・コミュニティ返信を網羅する統合通知センターと、ターゲット指定のBroadcast。

---

## 1. ロールと権限（RBAC）

Papexは3層モデル — **ベースロール + 割り当てロール + ユーザーごとの上書き** — を使用し、一括のロールベース認可と、個別のユーザー制限の両方をサポートします。

### 1.1 権限モデル

| 層 | 説明 | 管理箇所 |
| --- | --- | --- |
| ベースロール | すべてのユーザーに固有の `users.role`: `author` / `moderator` / `admin` | 登録時デフォルト `author` |
| 割り当てロール | `user_roles` 結合テーブルを通じてユーザーに重ねられる追加ロール | ユーザー管理ページ |
| ユーザーごとの上書き | ユーザーに対する単一権限の明示的な *allow* または *deny*。最優先 | ユーザー管理ページ |

> ℹ️ `reader` は **割り当て** RBACロール（`roles` テーブル内）であり、データベースのベースロールではありません（`users.role` は `author` / `moderator` / `admin` のみ許可）。ベースロールはログインとデフォルト権限の境界を定義し、割り当てロールがその上に重なります。

### 1.2 権限カタログ

システムは **6グループにわたる15の権限** を同梱します。

| グループ | 権限キー | 名前 | 説明 |
| --- | --- | --- | --- |
| paper | `paper:publish` | 論文公開 | 新規論文またはバージョンを投稿 |
| | `paper:view` | 論文閲覧 | 公開済み論文を参照 |
| | `paper:download` | 論文ダウンロード | PDF／ソースパッケージをダウンロード |
| | `paper:moderate` | 論文モデレート | 承認／却下／取り下げ |
| comment | `comment:create` | コメント投稿 | 論文へのコメントと返信 |
| | `comment:view` | コメント閲覧 | コメント欄を参照 |
| ticket | `ticket:create` | チケット作成 | フィードバック／チケットを起票 |
| | `ticket:manage` | チケット管理 | チケットへの返信／処理 |
| co_review | `co_review:assign` | 共創レビュー割り当て | 共創レビュー依頼を送信 |
| | `co_review:respond` | 共創レビュー受諾 | 依頼を承諾／辞退 |
| | `co_review:manage` | 共創レビュー管理 | すべての共創レビュー進捗を参照 |
| message | `message:broadcast` | Broadcast | ユーザーへメッセージ送信 |
| admin | `user:manage` | ユーザー管理 | ユーザーの参照／編集 |
| | `role:manage` | ロール管理 | ロールと権限の設定 |
| | `permission:manage` | 上書き管理 | ユーザーごとの許可／拒否 |

### 1.3 デフォルトのロール権限

シード（`db:seed`）は各システムロールのデフォルト権限マッピングを書き込みます。

| ロール | 件数 | 権限 |
| --- | --- | --- |
| `admin` | 15 | すべての権限 |
| `moderator` | 12 | 論文閲覧／ダウンロード／モデレート、コメント作成／閲覧、チケット作成／管理、共創レビュー割り当て／応答／管理、Broadcast、ユーザー管理 |
| `author` | 6 | 論文公開／閲覧／ダウンロード、コメント作成／閲覧、チケット作成 |
| `reader` | 3 | 論文閲覧／ダウンロード、コメント閲覧 |

### 1.4 解決順序

保護された操作が実行されると、有効な権限は次のように解決されます。

```
ベースロール権限
  ∪ 割り当てロール権限      （ロールの和集合）
  ∪ 許可とマークされたユーザーごとの上書き
  − 拒否とマークされたユーザーごとの上書き  （上書きが優先）
```

したがって、ベースロールも割り当てロールも `paper:publish` を付与していなくても、明示的な *allow* 上書きがあれば許可されます。逆に、ロールが付与していても明示的な *deny* があればブロックされます。

> フォールバック: `roles` / `permissions` テーブルがまだシードされていない場合（例: `db:seed` なしの新規DB）、エンジンは上記の定数デフォルトマッピングにフォールバックし、サイト全体のロックを避けます。デプロイ後に `db:seed` を実行することを推奨します。

### 1.5 保護された操作（ゲートウェイ）

主要な操作はゲートされ、権限がなければ `403` を返します。

- `POST /api/papers` — `paper:publish` が必要
- `POST /api/papers/:id/comments` — `comment:create` が必要
- モデレーション、チケット処理、共創レビュー割り当て／管理、ユーザー＆ロール編集、Broadcastなどはそれぞれの権限が必要で、ルートは `middleware` で保護されています（`moderator` / `admin` のみ `/admin` に入れます）。

---

## 2. ユーザー権限管理

**`/admin/users`** を開きます（`user:manage` が必要）:

- **ユーザー検索**: ユーザー名／メール／表示名で検索、ページネーション付き。
- **追加ロールの割り当て**: ユーザーエディタでシステムロール（`admin` / `moderator` / `author` / `reader`）をチェックし、ベースロールに重ねる。
- **3状態の権限上書き**: 15の権限それぞれについて:
  - **inherit**（デフォルト） — ロール和集合の結果に従う；
  - **allow** — ロールが省略していても強制付与；
  - **deny** — ロールが含まれていても強制ブロック。

すべての変更は `PATCH /api/admin/users/:id` ですぐに保存され、そのユーザーの以降の認可チェックに適用されます。

---

## 3. 共創レビュー（ピアレビュー）

共創レビューは **管理者 → レビューア → 著者** をつなぐ完全なピアレビューループです。

### 3.1 閉ループ

```
管理者が割り当て ──► レビューアが「共創レビュー依頼」メッセージを受信
     │
     ▼
レビューアが応答（承諾 / 辞退）
     │ 承諾
     ▼
レビューアが意見を提出（承認 / 却下 / 修正 + コメント）
     │
     ▼
システム受領通知 ──► 割り当て者に「意見提出済み」を通知
                ──► 著者に「共創レビュー完了」を通知（著者 ≠ 割り当て者の場合）
```

### 3.2 状態遷移

共創レビュー記録（`co_reviews`）は次のように遷移します。

| 状態 | 意味 | 遷移元 |
| --- | --- | --- |
| `pending` | レビューアの応答待ち | 管理者の割り当て（`POST /api/co-reviews`） |
| `accepted` | 承諾済み | レビューアの承諾（`POST /api/co-reviews/:id/respond` `{accepted:true}`） |
| `declined` | 辞退済み | レビューアの辞退（`respond` `{accepted:false}`） |
| `completed` | 完了 | レビューアの意見提出（`submit`） |
| `expired` | 期限切れ | （タイムアウトクローズ用の予約状態） |

> レビューアは `pending` の間のみ応答でき、`accepted` の間のみ意見を提出できます。状態が一致しないと `INVALID_STATE` を返します。

### 3.3 エントリポイントと通知

- **管理者**: `/admin/co-reviews` で全共創レビューの割り当てと監視；`/admin/co-reviews/:id` で詳細。割り当ては `submitted` 状態の論文から選択。
- **レビューア**: `/co-reviews`（自分のレビュー）と `/co-reviews/:id`（承諾／辞退 + 意見提出）。
- **統合通知**: すべての状態変化は関係者へ `co_review_request` / `co_review_result` メッセージを送ります（セクション4参照）。

---

## 4. 分類メッセージと Broadcast

### 4.1 メッセージの分類

メッセージは `kind` により **8分類** に分けられ、受信箱で色分け・グループ化されます。

| kind | ラベル | トーン | 典型的な発生源 |
| --- | --- | --- | --- |
| `system` | システム通知 | デフォルト | システムイベント |
| `ticket_reply` | チケット受領 | 情報青 | チケット返信 |
| `announcement` | お知らせ | 警告黄 | 管理者Broadcast |
| `review_result` | レビュー結果 | 成功緑 | 論文承認／却下 |
| `co_review_request` | 共創レビュー依頼 | 紫 | 共創レビュー割り当て |
| `co_review_result` | 共創レビュー受領 | 紫 | 応答／意見提出 |
| `admin_message` | 管理者DM | 危険赤 | ターゲット指定のダイレクトメッセージ |
| `community_reply` | コミュニティ返信 | 情報青 | コメント返信 |

受信箱（`/messages`）は分類によるフィルタ（`GET /api/messages?kind=...`）をサポート。メッセージをクリックすると関連する `link`（論文、チケット、共創レビュー…）へ移動します。

### 4.2 統合通知ファネル

すべてのモジュール間アラートは単一の `notifications` サービスから発せられ、レビュー・チケット・共創レビュー・コミュニティ各モジュールが1つの通知契約を共有します。

- **レビュー**: 論文決定 → 著者へ通知（`review_result`）。
- **チケット**: スタッフ返信 → 報告者へ通知（`ticket_reply`）。
- **共創レビュー**: 割り当て／応答／提出 → レビューア・割り当て者・著者へ通知（`co_review_request` / `co_review_result`）。
- **コミュニティ**: コメント返信 → 親コメント著者へ通知（`community_reply`）。

### 4.3 Broadcast

**`/admin/messages`** を開きます（`message:broadcast` が必要）:

- **範囲**:
  - `all` — すべてのユーザー；
  - `role` — ベースロール（`author` / `moderator` / `admin`）；
  - `userIds` — 特定のユーザーIDのリスト。
- **kind**: `announcement` / `system` / `admin_message`。
- タイトル、本文（任意の `link` 付き）を入力して送信すると、メッセージは対象読者へ一括書き込みされ、成功件数が返されます。

---

## 5. 管理ナビゲーション

管理エントリポイントはログインユーザーメニューと `/admin` の概要にあり、以下を含みます。

| モジュール | ルート | 説明 |
| --- | --- | --- |
| 概要 | `/admin` | 統計カード + モジュールショートカット |
| レビューキュー | `/admin/review` | 論文の承認／却下（+ 理由） |
| 統計 | `/admin/stats` | プラットフォーム指標 |
| チケット | `/admin/tickets` | チケット処理 |
| 共創レビュー | `/admin/co-reviews` | 共創レビューの割り当てと監視 |
| ユーザー | `/admin/users` | ロールと権限上書き |
| ロール | `/admin/roles` | ロール権限マトリクス |
| メッセージ | `/admin/messages` | Broadcast |

> これらのルートは `middleware` で保護されています。`moderator` または `admin` のベースロールを持つユーザーのみがアクセスでき、書き込み操作にはさらに一致するきめ細かな権限が必要です。

---

## 6. 運用: マイグレーションとシード

4つのシステムはマイグレーション `0003_add_rbac_co_review_messages`（`roles` / `permissions` / `role_permissions` / `user_roles` / `user_permissions` / `co_reviews` / `moderation_logs` を追加し、`messages.kind` を8分類に拡張）に依存します。デプロイ時またはローカル初期化時に実行:

```bash
npm run db:migrate   # マイグレーションを適用（RBAC / 共創レビュー / メッセージ分類）
npm run db:seed      # 4つのシステムロール + 15の権限 + デフォルトを書き込み（べき等）
```

RBACシードは `onConflictDoNothing` を使用しており、再実行しても安全です。migrate + seed 後、権限エンジンは `roles` / `permissions` テーブルを使用します。シード前は定数デフォルトにフォールバックします（1.4参照）。

---

## 7. APIクイックリファレンス

| メソッド | パス | 説明 |
| --- | --- | --- |
| `GET` | `/api/messages?kind=` | 受信箱、分類でフィルタ |
| `POST` | `/api/papers/:id/moderate` | モデレート `{action:"approve"\|"reject"\|"withdraw", reason?}` |
| `GET` | `/api/co-reviews?scope=mine\|all` | 共創レビュー一覧（自分／すべて） |
| `POST` | `/api/co-reviews` | 割り当て `{paperId, reviewerId, note?}` |
| `GET` | `/api/co-reviews/:id` | 共創レビュー詳細 |
| `POST` | `/api/co-reviews/:id/respond` | 応答 `{accepted:boolean}` |
| `POST` | `/api/co-reviews/:id/submit` | 提出 `{decision:"approve"\|"reject"\|"revise", comment}` |
| `GET` | `/api/admin/users` | ユーザー一覧（ページネーション／検索） |
| `PATCH` | `/api/admin/users/:id` | ロール設定 `{roleKeys}` または上書き `{permission:{key,grant}}` |
| `GET` | `/api/admin/roles` | ロール一覧 |
| `PUT` | `/api/admin/roles/:id` | ロール権限設定 `{permissionKeys}` |
| `POST` | `/api/admin/messages` | Broadcast `{scope, role?, userIds?, kind, title, body, link?}` |
| `GET` | `/api/admin/stats` | プラットフォーム統計 |

全リストは[APIリファレンス](/en/guide/api)を参照。
