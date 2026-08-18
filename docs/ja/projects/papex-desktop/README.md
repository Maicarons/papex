# Papex Desktop

> Papex学術文献プラットフォームのデスクトップ研究ワークベンチ — Windows・Linux・macOS

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)]()
[![Tauri](https://img.shields.io/badge/Tauri-2.x-24c8db.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Papex Desktopは、オープンソースの学術文献プラットフォームである[Papex](https://github.com/Maicarons/papex)を、デスクトップ上で動く本格的な**研究ワークベンチ**に変えます。ローカルファーストのライブラリ、ハイライトとメモ付きの深いPDF閲覧、引用管理、オフライン全文検索、およびクラウド同期を備えます。

**Tauri 2.x**（Rustコア + システムWebView）と **Vite + React 19** で構築され、軽量なネイティブアプリとして提供されます（インストーラ約5–15MB、メモリ30–50MB）。

> ⚠️ **依存**: このアプリはPapexサーバーAPIを利用します。先に[Papexバックエンド](https://github.com/Maicarons/papex)をデプロイしてください。

---

## 機能

| 優先度 | 機能 | 状態 |
| --- | --- | --- |
| P0 | ログイン／ログアウト／複数アカウント（トークンはOSキーチェーン） | 計画中 |
| P0 | 3ペインライブラリ: 257の二言語カテゴリ／一覧／詳細、フィルタと並び替え | 計画中 |
| P0 | オンラインキーワード + 意味検索（`/api/search?semantic=1`） | 計画中 |
| P0 | PDFリーダー（pdf.js）: ページ送り、ズーム、検索、ブックマーク、進捗、ダーク反転 | 計画中 |
| P0 | ハイライト（複数色）+ テキストメモ、ローカルSQLite + クラウド同期 | 計画中 |
| P0 | オフラインPDFキャッシュ、オフライン閲覧、キャッシュ管理 | 計画中 |
| P0 | インタラクティブな引用グラフ（ECharts）、購読通知 | 計画中 |
| P0 | システムトレイ、グローバルショートカット（Ctrl/Cmd+K）、単一インスタンスロック | 計画中 |
| P1 | 引用生成（CSL: GB/T 7714、APA、MLA、…）、BibTeX／RIS書き出し | 計画中 |
| P1 | LaTeX統合（`\cite{key}` + 文献ブロック、papex-latex経由） | 計画中 |
| P1 | **ファイルと画像のアップロード**: 論文投稿、ローカルPDF取り込み、アバター、論文表紙 | 計画中 |
| P1 | 保存検索（スマートフォルダ）、一括タグ、読書統計、2ペイン閲覧 | 計画中 |
| P2 | ローカル全文インデックス（tantivy）、オフラインでのミリ秒検索 | 計画中 |
| P2 | コラボレーション表示（共創レビュー／推薦／コメント、読み取り専用） | 計画中 |
| P3 | 任意のローカル埋め込み（Ollama）によるオフライン意味検索、プラグインプロトタイプ | 計画中 |

> 管理／モデレーション機能はデスクトップクライアントに**意図的に含まれていません** — それらにはWeb版を使用してください。

---

## プラットフォーム

| プラットフォーム | 成果物 | チャネル |
| --- | --- | --- |
| Windows 10+ | NSIS / MSI | Webサイトダウンロード + winget（任意） |
| macOS 11+ | .dmg（Developer ID + 公证） | Webサイト + App Store（任意） |
| Linux (WebKitGTK 2.44+) | .deb / AppImage / .rpm | Webサイト + ディストロリポジトリ（後日） |

---

## インストール

### プレビルドバイナリ

お使いのプラットフォーム用のインストーラを[Releases](https://github.com/Maicarons/papex-desktop/releases)ページ（公開後）からダウンロードしてください。

### ソースから

前提条件:

- Node.js 20+ & pnpm 9+
- Rustツールチェーン（stable）
- Windows: WebView2（Win10/11にプリインストール）；Linux: `libwebkit2gtk-4.1-dev` など（下記参照）

```bash
git clone https://github.com/Maicarons/papex-desktop.git
cd papex-desktop
pnpm install

# PapexサーバーのOpenAPIドキュメントからAPI型を生成
pnpm gen:types

# APIベースURLを設定
cp .env.example .env

# 開発（フロントエンドHMR + Tauriウィンドウ）
pnpm tauri dev

# 現在のプラットフォーム向けにビルド
pnpm tauri build
```

Linuxの依存関係（Debian/Ubuntu）:

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

環境変数（`.env`）:

| 変数 | 説明 | デフォルト |
| --- | --- | --- |
| `API_BASE_URL` | PapexサーバーのベースURL | `https://api.papex.example.com` |
| `I18N_FALLBACK` | フォールバック言語 | `zh` |
| `CACHE_LIMIT_MB` | ローカルPDFキャッシュ上限（MB） | `2048` |

---

## 開発

```bash
pnpm lint            # eslint
pnpm typecheck       # tsc --noEmit
pnpm test            # フロントエンド単体テスト（Vitest、カバレッジ）
cargo test           # Rust単体テスト（src-tauri内）
cargo clippy         # Rustリント（CIは -D warnings を強制）
pnpm e2e             # ローカルPapexバックエンドに対するPlaywright E2E
pnpm gen:types       # openapi.jsonからAPI型を再生成
pnpm sync:i18n       # Papexリポジトリからzh/en辞書を同期
```

テストカバレッジ: フロントエンドはコアモジュールでステートメントカバレッジ80%以上；Rustは `commands/*`、`db/*`、`indexer/*` で85%以上；E2EはP0フロー（認証 → ライブラリ → 読書 → 注釈 → オフライン → アップロード）をカバー。デバイス間シナリオ（デスクトップ ↔ モバイル ↔ Web）はモバイルクライアントとともにカバー — [開発計画](https://github.com/Maicarons/papex/blob/main/docs/development/papex-desktop.md)参照。

---

## アーキテクチャ（要点）

- **認証**: アクセストークン（JWT、15分）+ リフレッシュトークン（30日、ローテーション、デバイス紐付け）。トークンはOSキーチェーンに格納: Windows Credential Manager／macOS Keychain／Linux Secret Service（ファイルフォールバック）。
- **ローカルファースト**: キャッシュ／注釈／進捗／同期キュー用のSQLite `papex_local.db`；オフライン全文インデックスにtantivy（P2）。
- **アップロード**: PDF投稿＆取り込み、アバター、論文表紙 — Rustで検証し、進捗とリトライ付きでPapexサーバーへアップロード。
- **型**: Papexサーバーの `openapi.json` から生成 — 手書きは一切なし。

全文の開発計画については、Papexリポジトリの [`docs/development/papex-desktop.md`](https://github.com/Maicarons/papex/blob/main/docs/development/papex-desktop.md) を参照してください。

---

## 関連プロジェクト

- [Papex](https://github.com/Maicarons/papex) — バックエンドプラットフォーム（Next.js + PostgreSQL）
- [Papex App](https://github.com/Maicarons/papex-app) — 公式モバイルクライアント（React Native + RNOH）

---

## ライセンス

[Apache-2.0](LICENSE) — Copyright 2026 The Papex Authors.
