# デプロイ

Papexは、Vercel、任意のDocker環境、または自己ホストサーバーへデプロイできます。

## Vercel

1. リポジトリをVercelにインポート。
2. 環境変数を設定: `DATABASE_URL`、`AUTH_SECRET`。
3. ビルドコマンド: `npm run build`（出力はNext.jsが処理）。
4. Vercel StorageでPostgresをバインド、または外部の `DATABASE_URL` を入力。
5. デプロイ後に1回マイグレーションを実行: `npm run db:migrate`。
6. **PDFストレージ**: Vercelのファイルシステムは実行時に読み取り専用のため、`STORAGE_DRIVER=s3` と `PAPEX_S3_*` 変数を設定してください（[設定 → ストレージ](./configuration.md)参照）。ストリーミングルートはその後、ディスクからバイトを提供する代わりに署名付きオブジェクトURLへリダイレクトします。

## Docker / 自己ホスト

ルートの `docker-compose.yml` を使ってアプリとデータベースを一緒に実行:

```bash
docker compose up -d
```

またはDockerでPostgresのみを実行し、自分でNext.jsイメージをビルド:

```bash
docker build -t papex .
docker run -e DATABASE_URL=... -e AUTH_SECRET=... -p 3000:3000 papex
```

## ドキュメントサイト

ドキュメントはVitePressで `public/docs` にビルドされ、メインアプリから `/docs` で提供されます。

```bash
npm run docs:build
```
