# オンライン執筆（Writespace）

本ガイドでは、Papexに組み込まれた**オンライン執筆**モジュール（エントリポイント `/writespace`）を扱います。これはローカルのTeX環境も、手書きのJSONも不要なブラウザベースの執筆デスクです。[投稿ガイド](/en/guide/submission)の「ソースパッケージ投稿」フローをそのままブラウザに持ち込みます。メタデータを入力し本文をオンラインで書くと、システムが準拠した `papex.json` とセクション `.tex` ファイルを生成します。その後、**`tar.gz` を書き出す**か、**ワンクリックでプラットフォームへ公開**できます。

---

## 1. 概要

### 1.1 解決する課題

| 従来の「ソースパッケージ投稿」の課題 | オンライン執筆の対応 |
| --- | --- |
| `papex.json` の手書きはミスが起きやすい（フィールド漏れ、書式不良） | 視覚的エディタ＋リアルタイム検証 |
| 構造を確認するにはローカルのPython／TeX環境が必要 | 中間 `.tex` はブラウザ内で生成 — ローカルツールチェーン不要 |
| パッケージ化とアップロードが別々の手順 | エディタから「書き出し」と「公開」をワンクリック |
| 起草途中で作業を失う | ブラウザの `localStorage` に自動保存 |

### 1.2 3つのタブ

| タブ | 目的 |
| --- | --- |
| **Metadata** | 論文情報・著者・参考文献・構築オプション — `papex.json` の視覚的エディタ |
| **Body** | LaTeX本文を書くための、構造化されたセクション／付録ワークベンチ |
| **Export & Publish** | リアルタイム検証、アーカイブファイルのプレビュー、`tar.gz` の書き出し／ワンクリック公開 |

### 1.3 投稿システムとの関係

オンライン執筆は新しい投稿方法ではなく、「ソースパッケージ投稿」の**執筆フロントエンド**です。そこで生成されるアーカイブは[ソースパッケージ投稿](/en/guide/submission#3-method-2-source-package-upload)とバイト単位で互換性があり、公開は同じバックエンドエンドポイント `POST /api/submit/archive` を再利用し、同じ「展開 → 検証 → 論文作成 → 引用グラフリンク → PDF構築」パイプラインに従います（[投稿ガイド §4](/en/guide/submission#4-end-to-end-processing-flow-backend)参照）。

---

## 2. エントリポイントと権限

- **エントリポイント**: `/writespace`。
- **ページレベル認証**: サーバーコンポーネント `src/app/writespace/page.tsx` は `getCurrentUser()` を呼び、未認証時に `redirect("/login")` します。
- **ミドルウェア**: `src/middleware.ts` は `/writespace` を `PROTECTED_PREFIXES` に追加し、`matcher` に `/writespace/:path*` を追加するため、未認証リクエストはエッジでブロックされます。
- **公開権限**: 公開は本質的にソースパッケージ投稿であり、[投稿ガイド §4](/en/guide/submission#4-end-to-end-processing-flow-backend) の同じ `FORBIDDEN` / `PAPER_NOT_FOUND` ルールに従います — `paper.id` が新バージョンを宣言する場合、その論文への投稿権限が必要です。

---

## 3. タブ1: メタデータエディタ

**Metadata** タブは `MetadataEditor` に対応します。これは `papex.json` の `paper` / `authors` / `references` / `build` ブロックをカード形式のフォームに分割し、フィールドは[投稿ガイド §3.2](/en/guide/submission#32-papexjson-field-reference)と1対1で対応します。

### 3.1 論文情報（`metaPaper`）

タイトル、サブタイトル、要約、キーワード（カンマ区切り）、主カテゴリ（ドロップダウン、必須）、副カテゴリ（追加／削除）、DOI、ライセンス（ドロップダウン、デフォルト `CC-BY-4.0`）、venue、バージョンメモ、言語、論文ID（任意 — 入力し、自分の既存論文のいずれかであれば新バージョンとして投稿）。

### 3.2 著者（`metaAuthors`）

- 複数の著者を追加。各カードは上下移動／削除をサポート。
- フィールド: 氏名（必須）、所属、メール、ORCID（書式チェック）、ホームページ、責任著者トグル、共同貢献トグル、脚注、順序。
- 責任著者／共同貢献／脚注はPDF内で `\thanks` 脚注として出力されます。ORCIDとホームページも脚注に表示されます。

### 3.3 参考文献（`metaReferences`）

- 複数のBibTeX項目を追加。フィールドには引用キー（必須、書式チェック）、タイプ（ドロップダウン、12のBibTeXタイプ）、タイトル、著者、journal、booktitle、year、DOI、URL、arXiv ID、pages、volume、number、publisher、note が含まれます。
- 2つの目的: ① 公開時に `mapReferencesToCitations` を通じてプラットフォームの引用グラフにリンクされる；② 書き出し時に `references.bib` の自動生成に使われる（[§7](#7-exported-archive-structure)参照）。

### 3.4 構築オプション（`metaBuild`）

- 文献スタイル: `numeric` / `authoryear`（メイン文書に `\documentclass[11pt,bibstyle=authoryear]` として注入）。
- 段組: `1` / `2`（2段組は `twocolumn` を注入）。
- その他の `build` オプション（例: `fontset`、`documentclass`）はサーバー側コンパイル用に予約。デフォルトは `createDefaultDraft` 参照。

### 3.5 リアルタイム検証

すべての編集は `validateDraft()`（`src/lib/writespace/manifest.ts`）を通り、その結果は **Export & Publish** タブと共有されます。主なルール:

| チェック | ルール | 種別 |
| --- | --- | --- |
| `schemaVersion` | `x.y.z` に一致必須 | エラー |
| `paper.title` / `abstract` / `primaryCategoryId` | 必須かつ非空 | エラー |
| `paper.id`（任意） | 存在する場合 `YYMM.NNNNN` に一致必須 | エラー |
| `authors` | 最低1件；各 `name` 必須；`orcid` は `0000-0000-0000-0000` に一致 | エラー |
| `sections` | 最低1件；各 `file` 必須；`id` は英数字・`-`・`_` のみ | エラー |
| `references` | 各 `key` 必須、`A-Za-z0-9_:+.-` に限定；`year` ∈ [0, 3000] | エラー |
| 空のセクション本文 | 助言 | 警告 |

> 「エラー」は公開をブロックします。「警告」（空のセクション本文など）は助言のみです。

---

## 4. タブ2: 本文ワークベンチ

**Body** タブは `SectionsEditor` に対応し、論文本文と付録を構造的に管理します。

### 4.1 セクション一覧

- 各セクション（または付録）は折りたたみ可能なカードで、id／ファイル名（`file`、例: `sections/intro.tex`）、セクションタイトル、レベル（`section` / `subsection` / `subsubsection` / `chapter` / `part`）、本文（LaTeXテキストエリア）、文字数を持ちます。
- サポート: セクション追加、付録追加、上下移動、削除。
- レベルは書き出し時に出力されるコマンドを決定します（`\section{Title}` → `\input{sections/intro.tex}`）。

### 4.2 本文の内容ルール

- セクション `.tex` は手書きで**完全なLaTeX**をサポートします。数式、図、独自コマンド、および参照キーに合わせた `\cite{key}` が使えます。
- セクション本文は**エスケープされません**（[投稿ガイド §3.3](/en/guide/submission#33-xelatex-toolchain-papex-latex)と一致）。エスケープされるのは「Metadata」内のプレーンテキストフィールドのみです。
- 「Insert sample sections」ボタンは、LaTeX数式を含む5つのデモセクション（intro／related work／method／experiments／conclusion）を書き込み、クイックスタートに役立てます。

### 4.3 付録

付録項目はセクション構造を共有し、単一の `\appendix` の後に出力されます。

---

## 5. タブ3: 書き出しと公開

**Export & Publish** タブは `ExportPanel` に対応し、全体フローの出口です。

### 5.1 検証ステータス

上部に `validateDraft()` のライブ結果（「valid」または「invalid」とエラー／警告リスト）を表示します。エラーがある間は **Publish** ボタンが無効になります。

### 5.2 ファイルマニフェストプレビュー

生成されるアーカイブファイル（すなわち `buildArchiveFiles` の出力、[§7](#7-exported-archive-structure)）を表示し、ダウンロード／公開前に構造を確認できます。

### 5.3 `tar.gz` の書き出し

**Export** をクリックすると、`tar.gz` が完全にブラウザ内で生成され、ダウンロードを開始します（ファイル名はi18nの `writespace.expDownloadName` から）。

- 完全に**依存ゼロ**: `src/lib/writespace/targz.ts` はPOSIX ustarパッキングとネイティブの `CompressionStream('gzip')` を自作 — バックエンドは関与しません。
- テンプレート資産（`papex-template.tex` / `papex.cls`）は書き出し時に `/writespace/papex-template.tex` と `/writespace/papex.cls` から取得されアーカイブに同梱されるため、**自己完結**します（バックエンドは `latexmk` で直接コンパイル）。

### 5.4 ワンクリック公開

**Publish** をクリックすると、書き出しと同じ生成ステップを実行し、その後 `tar.gz` を `multipart/form-data` リクエストの `file` フィールドとして `/api/submit/archive` に `POST` します。

- 公開には事前に `validation.valid === true` が必要です。
- 成功時は返された「論文ID + バージョン」と `warnings` を「view paper」リンクとともに表示し、ローカルの下書きフラグをクリアします。
- 失敗時はバックエンドのエラーメッセージをインライン表示します（[投稿ガイド §4 エラーテーブル](/en/guide/submission#4-end-to-end-processing-flow-backend)のマッピング）。

---

## 6. 自動保存と下書き復元

- 下書き（`manifest` + セクションごとの本文）はブラウザの `localStorage`（キー: `papex-writespace-draft`）に自動保存され、デバウンス400ms — ページを閉じても保持されます。
- `/writespace` を再び開くと最後の下書きが自動復元され「local draft restored」と表示され、編集後は「auto-saved」と表示されます。
- 上部の **New** ボタンは確認を求め、`localStorage` をクリアして（サンプルのintroセクション1つ付きの）空の下書きにリセットします。

> 下書きはローカルブラウザのみに存在します。デバイスの切り替えやブラウザデータの削除で失われます。重要な作業は **Export** または **Publish** を忘れずに。

---

## 7. 書き出されるアーカイブ構成

**Export / Publish** で生成される `tar.gz` は `buildArchiveFiles()` により組み立てられ、バックエンドの `papex-archive.ts` が期待するものと完全に互換です。

```
my-paper.tar.gz
├── papex.json            # エディタのマニフェスト（2スペースインデントでシリアライズ）
├── papex-template.tex    # bibstyle/twocolumn を注入したメイン文書
├── papex.cls             # 文書クラス（/writespace/papex.cls から同梱）
├── references.bib        # 参考文献から自動生成（ない場合は省略）
├── sections/
│   ├── intro.tex         # 「Body」で書いたセクション
│   └── …
└── _papex_*.tex          # 自動生成された中間断片（編集しない）
    ├── _papex_meta.tex       # title/authors/affiliations/keywords/running title
    ├── _papex_abstract.tex   # abstract
    ├── _papex_sections.tex   # \section + \input の組み立て
    ├── _papex_backmatter.tex # acknowledgments/funding
    └── _papex_appendices.tex # \appendix + appendices
```

- `_papex_*.tex` ファイルは `genMeta` / `genAbstract` / `genSections` / `genBackmatter` / `genAppendices` により生成され、プレーンテキストフィールドは1パス方式の `latexEscape` を通り、セクション本文は `\input` でそのまま出力されます。
- このアーカイブは「ソースパッケージ投稿」ページで手動アップロードしても、**Publish** ボタンで自動送信しても — 両者は同等です。

---

## 8. 実装メモ

| 関心事 | 実装 |
| --- | --- |
| データモデル | `src/lib/writespace/manifest.ts`: `papex.schema.json` + `papex-json.ts` に合わせた型、純フロントエンド、サーバーimportなし |
| LaTeX生成 | `src/lib/writespace/latex-gen.ts`: `papex-build.py` のロジックをTSに移植；エスケープは**1パス文字スキャン**（固定された `papex-build.py` と一致し、`\textbackslash{}` の再エスケープを回避） |
| パッキング | `src/lib/writespace/targz.ts`: 自作ustar + `CompressionStream('gzip')`、依存ゼロ、純ブラウザ |
| テンプレート資産 | `public/writespace/papex.cls` + `papex-template.tex`（`papex-latex/` からコピー、LF正規化）、実行時にアーカイブへ取得 |
| オーケストレーション | `src/components/writespace/writespace-client.tsx`: 3つの `Tabs` + 下書き永続化 + 書き出し／公開 |
| 国際化 | `src/i18n/dictionaries/{zh,en}.ts` の `writespace` ブロック（約70キー）、UIラベルと一致 |

---

## 9. セキュリティと制限

- **権限**: エントリと公開の両方にログインが必要。新バージョンの対象論文は現在のユーザー（または特権ロール）に属している必要があり、さもないとバックエンドは `FORBIDDEN` を返します。
- **サーバー側の永続化なし**: 生成とパッキングはすべてブラウザメモリ内で行われます。ファイルがマシンを離れるのはダウンロード／公開をクリックしたときのみです。プラットフォームはそれでも[投稿ガイド §6/§7](/en/guide/submission#6-deployment-and-ops)のTeXサンドボックス、サイズ制限、shell-escape無効化を適用します。
- **ブラウザ対応**: `CompressionStream('gzip')` には最近のブラウザ（Chrome/Edge 80+、Firefox 113+、Safari 16.4+）が必要。利用できない場合、書き出しは親切なメッセージで失敗します。
- **50MB制限**: 公開は `/api/submit/archive` を通り、同じ50MB上限の対象です。

---

## 10. FAQ

**Q: オンライン執筆とソースパッケージ投稿、どちらを使うべき？**
どちらでも。オンライン執筆はコマンドラインを避け、ライブ検証を望む著者に適し、ソースパッケージ投稿はローカルのTeXプロジェクトがあり `papex-build.py` の細かな制御を望む著者に適します。両者はデータベース上で同一の結果を生成します。

**Q: 書き出した `tar.gz` を「ソースパッケージ投稿」ページで手動アップロードできますか？**
はい、同等です。書き出したアーカイブは既に `papex.cls` と `papex-template.tex` を同梱しているため、バックエンドが `PAPEX_LATEX_DIR` からコピーする必要はありません。

**Q: 本文で `\cite{key}` を使ったのに公開後に引用がリンクしませんでした？**
引用リンクは、参考文献の `doi` / `arxivId` がプラットフォーム上の論文と一致することに依存します。`url` / `title` のみの項目は引用グラフに入りますが内部リンクは形成されません。参考文献のDOI／arXiv IDが正確か確認してください。

**Q: 下書きはクラウドに同期されますか？**
いいえ。下書きはブラウザの `localStorage` のみに存在します。デバイスの切り替えやキャッシュの削除で失われます。**Export** または **Publish** を習慣にしてください。

**Q: 本文の `$...$` 数式が壊れますか？**
いいえ。セクション `.tex` はそのまま（エスケープなし）書き出されます。数式はバックエンドのXeLaTeXコンパイルでレンダリングされます。エスケープされるのは「Metadata」内のプレーンテキストフィールドのみです。

**Q: 公開直後にPDFがありませんか？**
[投稿ガイド FAQ](/en/guide/submission#8-faq)と同じ: サーバーにTeX Liveが設定されているかどうかに依存します。設定されていない場合、`pdfUrl` は空で、ページに「PDF is being built in the background」と表示されます。
