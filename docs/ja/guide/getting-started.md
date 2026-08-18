# はじめに

このガイドでは、Papexをローカルで実行する手順を説明します。

## 必要条件

- Node.js ≥ 18.18
- PostgreSQL ≥ 16（Docker推奨）
- npm または pnpm

## 1. 依存関係をインストールする

```bash
npm install
```

## 2. データベースを用意する

同梱の `docker-compose.yml` でPostgresを起動します。

```bash
docker compose up -d db
```

環境ファイルをコピーして記入します。

```bash
cp .env.example .env
# 最低限 DATABASE_URL と AUTH_SECRET を設定する
```

## 3. マイグレーションとシードを実行する

```bash
npm run db:migrate
npm run db:seed
```

`db:seed` は、カテゴリの全分類、サンプル論文、および管理者アカウントを書き込みます。

## 4. 開発サーバーを起動する

```bash
npm run dev
```

http://localhost:3000 を開きます。

## デフォルトアカウント

| ロール | ユーザー名 | パスワード |
| --- | --- | --- |
| 管理者 | `admin` | `admin123456` |
| 著者（サンプル） | `demo` | `password123` |

> 本番環境ではデフォルトのパスワードを変更し、長くランダムな `AUTH_SECRET` を使用してください。
