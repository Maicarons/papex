# 設定

Papexは環境変数によって設定します。

## データベース

```bash
DATABASE_URL=postgres://papex:papex@localhost:5432/papex
```

## 認証

```bash
# Secret used to sign JWTs. MUST be a long random string in production (>= 16 chars).
AUTH_SECRET=change-me-to-a-long-random-string
# Session TTL in seconds (default 7 days)
AUTH_SESSION_TTL=604800
```

### APIキー

APIキーを使うと、スクリプトや連携がブラウザセッションなしでAPIを呼び出せます。
APIキーは **Settings → API Keys**（`/settings/api-keys`）から作成され、生のシークレットは一度だけ表示されます。キーはSHA-256でハッシュ化されアカウントに紐付けられるため、あなたのロールのRBAC権限を継承します — 追加の設定は不要です。次のように送信します。

```http
Authorization: Bearer pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

パブリックなエンドポイント（論文、検索、カテゴリ、著者、ヘルス）は匿名リクエストも受け付けます。

## メール（任意）

メッセージとチケットのシステムにメールは不要です。通知メールを送信するには、SMTPを設定します。

```bash
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

## ストレージ（PDFバックエンド）

アップロードされたPDFは、入れ替え可能なバックエンドにより保存され、`STORAGE_DRIVER` で選択します。

### `local`（デフォルト）

サーバーは自身のファイルシステム上の `PAPEX_STORAGE_DIR`（デフォルト `./storage`）でPDFファイルを管理します。バイトはルート `/api/papers/{id}/pdf/{version}` からストリーミングで返されます。Docker／自己ホスト／開発に使用してください。

```bash
STORAGE_DRIVER=local
PAPEX_STORAGE_DIR=./storage
```

### `s3`（S3互換オブジェクトストレージ）

アップロードはS3互換バケット（AWS S3、MinIO、Cloudflare R2、DigitalOcean Spaces）へ送られます。ストリーミングルートはその後、**署名付き**（または公開）オブジェクトURLへの `302` リダイレクトを返すため、PDFはオブジェクトストアから提供され、サーバーを経由しません — Vercelのような読み取り専用／サーバーレスのプラットフォームで必須です。

```bash
STORAGE_DRIVER=s3
PAPEX_S3_BUCKET=papex-pdfs
PAPEX_S3_REGION=auto            # us-east-1 for AWS; "auto" for Cloudflare R2
PAPEX_S3_ENDPOINT=https://s3.amazonaws.com   # required for R2 / MinIO / Spaces
PAPEX_S3_ACCESS_KEY_ID=...
PAPEX_S3_SECRET_ACCESS_KEY=...
PAPEX_S3_FORCE_PATH_STYLE=true  # true for MinIO/R2/Spaces; false for AWS virtual-hosted
# Optional: if the bucket/CDN is public, set this base URL to skip signing:
# PAPEX_S3_PUBLIC_BASE=https://cdn.example.com
```

バックエンドにかかわらず、各論文バージョンに保存される `pdfUrl` は常にストリーミングルートを指すため、UIとAPIはバックエンドに依存しません。
