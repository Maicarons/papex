# API

Papexは、`/api` 配下に一連のJSON HTTP APIを公開します。

## インタラクティブリファレンス

完全で機械可読な **OpenAPI 3.1** 仕様が [`/api/openapi.json`](/api/openapi.json) で提供され、インタラクティブで試せるエクスプローラ（[Scalar](https://scalar.com)製）が **[/api-docs](/api-docs)** で利用できます。これを開くと、すべてのエンドポイントを参照し、リクエストとレスポンスのスキーマを確認し、ブラウザからライブリクエストを送信できます。

## ドキュメントの同期を保つ（コードファースト）

OpenAPIドキュメントは手書きではなく、**コードから生成**されます。各ルートは、そのエンドポイントのドキュメントの単一情報源となる兄弟フラグメント `route.openapi.ts` を持ちます。静的部品（info、`components/schemas`、`components/responses`、security）は `src/lib/openapi/base.ts` にあります。

ジェネレータ（`src/lib/openapi/generate.ts`）は各フラグメントをスキャンし、ベースにマージして `src/lib/openapi/spec.generated.ts` を書き出します — これが `/api/openapi.json` が提供するファイルです。

```bash
# フラグメント編集後に再生成（/api/openapi.json + /api-docs を更新）
npm run openapi:generate
```

これは `predev` と `prebuild` に組み込まれているため、スペックは常に `next dev` / `next build` の前に再構築されます。**`spec.generated.ts` を手動で編集してはいけません** — 毎回の実行で上書きされます。

### 新しいエンドポイントの文書化

ルートハンドラ `src/app/api/foo/bar/route.ts` を追加する際、兄弟の `route.openapi.ts` を作成します。

```ts
export default {
  "/api/foo/bar": {
    get: {
      tags: ["Discovery"],
      summary: "Describe what it does",
      // security: []            // omit for public endpoints
      responses: {
        200: { description: "OK", content: { "application/json": { schema: { type: "object" } } } },
      },
    },
  },
} as const;
```

`npm run openapi:generate`（または単にstart/build）を実行すると、エンドポイントは `/api/openapi.json` と `/api-docs` に自動的に現れます。共有スキーマは `src/lib/openapi/base.ts`（例: `#/components/schemas/PaperListItem`）にあります。

## 認証

認証には2つの方法があります。

1. **セッションクッキー**（`papex_session`） — ログイン時に発行され、ブラウザで使用。同一オリジンのリクエストに自動送信。
2. **APIキー**（`Authorization: Bearer pk_…`） — スクリプトやサードパーティ連携向け。**Settings → API Keys**（`/settings/api-keys`）からキーを作成。キーはアカウントに紐付けられ、あなたのロールのRBAC権限を継承するため、セッションクッキーで動作するすべてのエンドポイントはAPIキーでも動作します。生のシークレットは作成時 **一度だけ** 表示され、SHA-256ハッシュのみが保存されます。

APIキーを使ったリクエスト例:

```bash
curl -H "Authorization: Bearer pk_live_xxxx" https://your-host/api/papers?pageSize=1
```

パブリック（非認証）なエンドポイント — 論文一覧、検索、カテゴリ、著者、ヘルスなど — は、匿名呼び出し、セッションクッキー、APIキーのいずれでも動作します。

## 認証（Auth）

- `POST /api/auth/register` — 登録 `{username, email, displayName, password}`
- `POST /api/auth/login` — ログイン `{identifier, password}`
- `POST /api/auth/logout` — ログアウト
- `GET /api/auth/me` — 現在のユーザー

## APIキー

- `GET /api/settings/api-keys` — 自分のキー一覧
- `POST /api/settings/api-keys` — キー作成 `{name, scopes?:["read"|"write"], environment?:"live"|"test", expiresAt?:ISODate|null}`
- `DELETE /api/settings/api-keys?id=<keyId>` — キーを失効

## 論文（Papers）

- `GET /api/papers` — 一覧。クエリパラメータ: `q`（全文、または `title:`/`au:`/`abs:`/`cat:` 接頭辞）、`category`、`tag`、`sort`（`new` | `updated` | `by_citations`）、`from`（ISO日付、その日以降に作成された論文のみ）、`page`、`pageSize`。行には解決済みの `citationCount` を含む。
- `GET /api/papers/:id` — 詳細（`submitter`、`tags`、`commentCount` を含む）
- `GET /api/papers/:id/comments` — コメント
- `GET /api/papers/:id/citations` — 引用グラフ `{ outgoing, incoming }`
- `GET /api/papers/:id/tags` — 論文のタグ
- `POST /api/papers` — 投稿（認証必須、`paper:publish` が必要）；JSONまたはmultipart（meta + 任意の `pdf` ファイル）を受け付け
- `POST /api/papers/:id/moderate` — モデレート `{action:"approve"|"reject"|"withdraw", reason?}`（`paper:moderate` が必要）
- `POST /api/papers/:id/citations` — 引用追加 `{targetArxivId?|targetDoi?|targetTitle?}`（所有者／モデレータ／管理者）
- `POST /api/papers/:id/tags` / `DELETE /api/papers/:id/tags` — タグの付着／分離 `{tagId|name}`（所有者／モデレータ／管理者；名前が新規ならタグを作成）
- `POST /api/submit/archive` — ソースパッケージ `tar.gz` をアップロードし、自動取り込み・引用リンク・PDF構築を行う（認証必須；[投稿ガイド](/en/guide/submission)参照）

## カテゴリ

- `GET /api/categories` — カテゴリツリー

## タグ

- `GET /api/tags` — 使用回数付きのすべてのタグ（人気順）
- `POST /api/tags` — タグ作成 `{name}`（認証必須；名前でべき等）

## 購読

- `GET /api/subscriptions` — 自分の購読一覧を**充実化**（カテゴリ／著者／論文名を `title` + `href` ディープリンクに解決）
- `POST /api/subscriptions` — 購読／解除（トグル）`{type:"category"|"author"|"paper", refId}`
- `DELETE /api/subscriptions` — 解除 `{type, refId}`

## フィードと通知

お知らせは、論文があなたの購読のいずれかに入ったとき（カテゴリ新着、著者新着）、誰かがあなたのコメントに返信したとき、または管理者のBroadcastによって生成されます。

- `GET /api/feed` — 現在のユーザーのお知らせ（`?markRead=1` で全件既読にもする）
- `POST /api/feed` — 単一のお知らせを既読に `{id}`

ヘッダーのベル（`FeedBell`）は、Zustandストアで同期されたライブな未読バッジを表示するため、どこで読んでもバッジは即座に更新されます。

## ブックマーク

- `GET /api/bookmarks` — 自分のブックマーク一覧（それぞれ論文タイトルと `groupName` に解決）；`?paperId=` を渡すと単一論文の `{ bookmarked: boolean }` を返す
- `POST /api/bookmarks` — ブックマークのトグル `{paperId, group?}`（`{ bookmarked: true|false }` を返す）
- `PATCH /api/bookmarks/:paperId` — ブックマークをグループに移動 `{group}`（nullでクリア）
- `DELETE /api/bookmarks` — ブックマーク削除 `{paperId}`

## メッセージ

メッセージは `kind` により8分類に分類されます: `system`、`ticket_reply`、`announcement`、`review_result`、`co_review_request`、`co_review_result`、`admin_message`、`community_reply`。

- `GET /api/messages` — 現在のユーザーのメッセージ + 未読数（`?kind=` フィルタ対応）
- `GET /api/messages/stats` — 未読統計
- `POST /api/messages/:id/read` — 既読に
- `POST /api/messages` — `{action:"read-all"}` で全件既読

## チケット

- `GET /api/tickets` — 自分のチケット（`?scope=all` は管理者のみ）
- `POST /api/tickets` — 作成 `{subject, type, priority, message}`
- `GET /api/tickets/:id` — 詳細
- `POST /api/tickets/:id` — 返信
- `PATCH /api/tickets/:id` — 管理者がステータス／優先度を更新

## フィードバック

- `POST /api/feedback` — フィードバックを送信（認証必須、自動でチケットを作成）

## 共創レビュー

- `GET /api/co-reviews?scope=mine|all` — 一覧（自分／すべて、それぞれの権限が必要）
- `POST /api/co-reviews` — 割り当て `{paperId, reviewerId, note?}`（`co_review:assign` が必要）
- `GET /api/co-reviews/:id` — 詳細
- `POST /api/co-reviews/:id/respond` — レビューアが応答 `{accepted:boolean}`
- `POST /api/co-reviews/:id/submit` — 意見提出 `{decision:"approve"|"reject"|"revise", comment}`

## 管理

管理エンドポイントは `moderator` / `admin` のベースロールが必要で、きめ細かな権限ごとに認可されます。

- `GET /api/admin/users` — ユーザー一覧（ページネーション／検索、`user:manage` が必要）
- `PATCH /api/admin/users/:id` — ロール設定 `{roleKeys:string[]}` または上書き `{permission:{key:string, grant:boolean|null}}`（`user:manage` / `permission:manage` が必要）
- `GET /api/admin/roles` — ロール一覧（`role:manage` が必要）
- `PUT /api/admin/roles/:id` — ロール権限設定 `{permissionKeys:string[]}`
- `POST /api/admin/messages` — Broadcast `{scope:"all"|"role"|"userIds", role?, userIds?, kind:"announcement"|"system"|"admin_message", title, body, link?}`（`message:broadcast` が必要）
- `GET /api/admin/stats` — プラットフォーム統計
