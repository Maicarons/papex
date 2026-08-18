# Papex App

> Papex学術文献プラットフォームの公式モバイルクライアント — Android・HarmonyOS・iOS

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20HarmonyOS%20%7C%20iOS-lightgrey.svg)]()
[![React Native](https://img.shields.io/badge/React%20Native-0.82-61dafb.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Papex Appは、オープンソースの学術文献プラットフォームである[Papex](https://github.com/Maicarons/papex)の公式モバイルクライアントです。Web版の**モバイル代替**として設計されており、論文を読み、アカウントを管理し、最新情報をどこでも確認できます。

**React Native 0.82 + RNOH 0.82.30**（HarmonyOS対応）で構築され、Android・HarmonyOS・iOSで1つのコードベースを共有します（共有ビジネスコード約95%）。

> ⚠️ **依存**: このアプリはPapexサーバーAPIを利用します。先に[Papexバックエンド](https://github.com/Maicarons/papex)をデプロイしてください。

---

## 機能

| 優先度 | 機能 | 状態 |
| --- | --- | --- |
| P0 | ログイン／登録／ログアウト、複数アカウント切り替え、デバイス管理（リモート失効） | 計画中 |
| P0 | ホームフィード、カテゴリツリー（257の二言語カテゴリ）、ページネーション | 計画中 |
| P0 | キーワード検索 + 意味検索（`/api/search?semantic=1`） | 計画中 |
| P0 | 論文詳細、バージョン切り替え、進捗を記憶するPDF閲覧 | 計画中 |
| P0 | ブックマーク、購読、アプリ内メッセージ／チケット／フィードバック | 計画中 |
| P0 | プロフィール、推薦、二言語UI（zh/en）、ダークモード | 計画中 |
| P1 | オフラインPDFダウンロード、メタデータキャッシュ、オフライン閲覧 | 計画中 |
| P1 | デバイス間の読書進捗同期、プッシュ通知（FCM／APNs／PushKit） | 計画中 |
| P1 | 生体認証ロック、APIキー管理、スケルトン／エラー／空状態 | 計画中 |
| P2 | コメント、推薦、レコメンド、システム共有シート、読書統計 | 計画中 |
| P3 | QRサインイン（Web ↔ アプリ）、タブレットレイアウト、読み取り専用注釈閲覧 | 計画中 |

> 管理／モデレーション機能はモバイルクライアントに**意図的に含まれていません** — それらにはWeb版を使用してください。

---

## プラットフォーム

| プラットフォーム | チャネル | 状態 |
| --- | --- | --- |
| Android (minSdk 24+) | Google Play / CNストア | 計画中 |
| iOS (15+) | App Store | 計画中 |
| HarmonyOS (API 12+) | AppGallery | 計画中 |

---

## インストール

### プレビルドバイナリ

[Releases](https://github.com/Maicarons/papex-app/releases)ページ（公開後）からダウンロードするか、お好みのストアからインストールしてください。

### ソースから

前提条件:

- Node.js 20+
- Androidビルド用 Android SDK（minSdk 24）
- iOSビルド用 Xcode 15+（macOS）
- HarmonyOSビルド用 DevEco Studio 5.x（API 12+）+ AGCプロジェクト

```bash
git clone https://github.com/Maicarons/papex-app.git
cd papex-app
npm install

# PapexサーバーのOpenAPIドキュメントからAPI型を生成
npm run gen:types

# APIベースURLを設定
cp .env.example .env

# Androidで実行
npm run android

# iOSで実行（macOSのみ）
cd ios && pod install && cd ..
npm run ios

# HarmonyOSで実行: harmony/ をDevEco Studioで開き、AGCで署名し、実機／シミュレータで実行
```

環境変数（`.env`）:

| 変数 | 説明 | デフォルト |
| --- | --- | --- |
| `API_BASE_URL` | PapexサーバーのベースURL | `https://api.papex.example.com` |
| `PUSH_ENABLED` | プッシュ登録を有効化 | `true` |
| `I18N_FALLBACK` | フォールバック言語 | `zh` |

---

## 開発

```bash
npm run lint          # eslint
npm run typecheck     # tsc --noEmit
npm test              # 単体テスト（Jest + RNTL、カバレッジ）
npm run e2e:ios       # Detox E2E（iOSシミュレータ）
npm run e2e:android   # Detox E2E（Androidエミュレータ）
npm run gen:types     # openapi.jsonからAPI型を再生成
npm run sync:i18n     # Papexリポジトリからzh/en辞書を同期
```

テストカバレッジ: 単体テストはコアモジュール（`lib/api`、`lib/security`、`lib/storage`、ストア）でステートメントカバレッジ80%以上を目標；E2EはP0フロー（認証 → 参照 → 読書 → ブックマーク → 購読 → デバイス）をカバー。デバイス間シナリオはデスクトップクライアントとともにカバーします（[開発計画](https://github.com/Maicarons/papex/blob/main/docs/development/papex-app.md)参照）。

---

## アーキテクチャ（要点）

- **認証**: アクセストークン（JWT、15分）+ リフレッシュトークン（30日、ローテーション、デバイス紐付け）。トークンはOSのセキュアストレージに格納: Keychain（iOS）/ Keystore（Android）/ HUKS（HarmonyOS）。
- **データ**: セッション／設定／キャッシュにMMKV；PDFファイルはアプリサンドボックスにLRU排除でキャッシュ。
- **i18n**: i18next、Papexリポジトリから同期したzh/en辞書。
- **型**: Papexサーバーの `openapi.json` から生成 — 手書きは一切なし。

全文の開発計画については、Papexリポジトリの [`docs/development/papex-app.md`](https://github.com/Maicarons/papex/blob/main/docs/development/papex-app.md) を参照してください。

---

## 関連プロジェクト

- [Papex](https://github.com/Maicarons/papex) — バックエンドプラットフォーム（Next.js + PostgreSQL）
- [Papex Desktop](https://github.com/Maicarons/papex-desktop) — デスクトップ研究ワークベンチ（Tauri 2）

---

## ライセンス

[Apache-2.0](LICENSE) — Copyright 2026 The Papex Authors.
