# 投稿ガイド

本ガイドでは、Papexが対応する2つの論文投稿方法を説明し、**ソースパッケージ投稿**の完全なリファレンスとして、その `papex.json` マニフェストとXeLaTeXツールチェーンを提供します。

---

## 1. 概要

Papexは、異なるワークフロー向けに2つの投稿エントリポイントを提供します。

| 方法 | エントリポイント | 対象 | 特徴 |
| --- | --- | --- | --- |
| **フォーム投稿** | Webの「Submit → Form」ページ / `POST /api/papers` | 偶発的な投稿者 | ブラウザでタイトル・要約・著者などを入力し、**全文PDFを直接アップロード**（≤50MB） |
| **ソースパッケージ投稿** | Webの「Submit → Source package」ページ / `POST /api/submit/archive` | LaTeX著者 | `papex.json` マニフェストとともにソースを `tar.gz` にまとめ、プラットフォームが**論文の作成・引用の紐付け・PDFの構築**を自動で行う |

> 両方法は同じ取り込みロジック（`createSubmission` + `addCitation`）を共有しています。
> 異なるのは、メタデータの取得元と本文／PDFの生成方法のみです。

> **コマンドラインを触りたくない方へ**: 組み込みの[オンライン執筆](/en/guide/writespace)モジュールを使えば、`papex.json` を視覚的に編集し、本文を書いて、ブラウザ上で「`tar.gz`を書き出す」または「ワンクリックで公開」できます。そこで生成されるアーカイブは、ソースパッケージ投稿と完全に同等です。

---

## 2. 方法1: フォーム投稿

上部ナビゲーションの **Submit** をクリックし、**Form** タブを選んでフィールドを入力し、「Submit paper」をクリックします。

- **タイトル**、**要約**
- **主カテゴリ**（必須、カテゴリツリーのコード例: `cs.LG`）、**副カテゴリ**（カンマ区切り、任意）
- **著者**（必要な数だけ追加可。順序は著者順）
- **PDFアップロード**（任意）: PDFをドラッグ＆ドロップまたは選択（≤50MB）。プラットフォームが保存し、参考文献を自動リンクします。**DOI**（任意）、**ライセンス**（デフォルト `CC-BY-4.0`）、**バージョンメモ**（任意）

論文はその後、レビューキューに入ります。フォーム投稿は `multipart/form-data` として送信されます。`meta` はメタデータのJSON文字列、`pdf` は任意のPDFファイルです。

```http
POST /api/papers
Content-Type: multipart/form-data; boundary=...

--boundary
Content-Disposition: form-data; name="meta"

{"title":"…","abstract":"…","primaryCategoryId":"cs.LG","secondaryCategoryIds":["stat.ML"],"authors":[{"name":"Ming Zhang","order":0}],"doi":"","license":"CC-BY-4.0","comments":"","basePaperId":null}
--boundary
Content-Disposition: form-data; name="pdf"; filename="paper.pdf"
Content-Type: application/pdf

<binary PDF data>
--boundary--
```

> PDFは任意です。指定した場合、エンドポイントはそれを論文バージョンに対して保存し、本文を解析してプラットフォーム内の引用をリンクし、`{ pdfUrl, pages, referencesExtracted, referencesLinked }` を返します。Webフォームはこれを自動送信します。APIクライアントは（`pdf` なしの）プレーンなJSONをPOSTしても構いません。

---

## 3. 方法2: ソースパッケージ投稿

ソースパッケージ投稿は**著者向けのワークフロー**です。論文をLaTeXで執筆し、メタデータと参考文献を構造化された `papex.json` に記述し、すべてを `tar.gz` にまとめて1ステップでアップロードします。バックエンドが「展開 → 検証 → 取り込み → 引用リンク → PDF構築」を一貫して処理します。

### 3.1 パッケージ構成

最小でありながら推奨されるパッケージのレイアウト:

```
my-paper.tar.gz
├── papex.json            # 必須: 論文マニフェスト（メタデータ + セクション + 参考文献）
├── papex-template.tex    # メイン文書（リポジトリ提供の papex-template.tex を使用）
├── papex.cls             # 文書クラス（任意；省略時はPAPEX_LATEX_DIRからサーバーがコピー）
├── references.bib        # 任意: 手書きのBibTeX；省略時はreferencesから自動生成
└── sections/             # 本文セクション（papex.jsonで順序指定された .tex 断片）
    ├── 00-intro.tex
    ├── 01-related.tex
    └── …
```

> パッケージには **`papex.json` が含まれていなければなりません**。さもないとアップロードは拒否されます（HTTP 400）。

### 3.2 `papex.json` フィールドリファレンス

完全なJSON Schemaは [`papex-latex/papex.schema.json`](https://github.com/) にあります。
主要なフィールドとその保存先:

| フィールド | 型 | 必須 | 備考 / DB保存先 |
| --- | --- | --- | --- |
| `paper.id` | string (`YYMM.NNNNN`) | いいえ | **自分（または管理者）の既存論文**に一致する場合 → 新バージョンとして投稿；それ以外は新しい論文IDが割り当てられる |
| `paper.title` | string | はい | → `papers.title` / `paper_versions.title` |
| `paper.abstract` | string | はい | → `paper_versions.abstract` |
| `paper.keywords` | string[] | いいえ | PDFでは要約の後に出力される（別途保存はされない） |
| `paper.primaryCategoryId` | string | はい | → `papers.primaryCategoryId`；カテゴリテーブルに**存在する必要あり**、さもないと400 |
| `paper.secondaryCategoryIds` | string[] | いいえ | → `paper_categories`（主以外） |
| `paper.doi` | string | いいえ | → `paper_versions.doi`、引用グラフ（`target_doi`）にも書き込まれる |
| `paper.license` | string | いいえ | → `paper_versions.license`、デフォルト `CC-BY-4.0` |
| `paper.versionNote` | string | いいえ | → `paper_versions.comments` |
| `paper.subtitle` | string | いいえ | PDFではタイトル下に出力される |
| `paper.venue` | string | いいえ | タイトルブロックに出力される（学会／ジャーナルなど） |
| `authors[].name` | string | はい | → `authors` + `paper_authors`（`order`順） |
| `authors[].orcid` | string | いいえ | 著者脚注 |
| `authors[].email` | string | いいえ | 責任著者の連絡先として使用 |
| `authors[].affiliation` | string | いいえ | **文字列** → `findOrCreateAffiliation` により `affiliations.id` に解決 |
| `authors[].corresponding` | boolean | いいえ | 「責任著者」脚注 |
| `authors[].equalContribution` | boolean | いいえ | 「共同貢献」脚注 |
| `authors[].footnote` | string | いいえ | 自由記述の脚注 |
| `references[].key` | string | はい | BibTeX引用キー |
| `references[].doi` / `arxivId` | string | いいえ | `resolveTarget` によりプラットフォーム内論文に解決；それ以外は `url` / `title` が `citations` に入る |
| `references[].url` / `title` / `authors` / `year` / `venue` | string | いいえ | `citations` と自動生成される `references.bib` を埋める |
| `sections[]` | string[] | はい | セクション `.tex` パスの順序付きリスト；**LaTeXのみを駆動し、テーブルには保存されない** |
| `appendices[]` | string[] | いいえ | 付録 `.tex` パスの順序付きリスト |
| `acknowledgments` / `funding` | string | いいえ | PDFの謝辞／資金源セクションに出力される |
| `build` | object | いいえ | 構築オプション: `style`（numeric/authoryear）、`fontset`（fandol/windows/mac/ubuntu）、`passthrough`（エスケープ除外フィールド）など |

> **フォーム投稿との違い**: `papex.json` は数値の `affiliationId` ではなく `affiliation` **文字列**を使用します。マッピング層が `affiliations` 行を検索または作成します。またLaTeX専用のフィールド `sections`、`references`、`appendices`、`build` が追加されます。

### 3.3 XeLaTeXツールチェーン（`papex-latex/`）

専用のXeLaTeXツールチェーンが [`papex-latex/`](https://github.com/) に同梱されています。

```
papex-latex/
├── papex.cls              # 文書クラス（ctex + authblk + biblatex、CJK+英語、メタデータマクロ、ヘッダ／フッタ）
├── papex-template.tex     # メイン文書、生成された _papex_*.tex とセクションを自動 \input
├── papex-build.py         # 依存ゼロのビルダー（標準ライブラリのみ；jsonschemaは任意）
├── papex.schema.json      # draft-07 マニフェスト契約
├── latexmkrc              # 任意の latexmk 設定
├── README.md              # ツールチェーンの使い方
└── example/               # 完全なサンプルパッケージ（中国語論文 + 5セクション + 付録）
```

**`papex.cls` の要点**

- **CJK + 英語**: `ctex`（`scheme=plain`）ベース、デフォルト `fontset=fandol`（TeX Liveに同梱、サーバーでそのままコンパイル可能）。ローカルでは `windows` / `mac` / `ubuntu` で切り替え。
- **著者／所属**: 共有所属、責任著者、共同貢献の脚注を持つ `authblk`。
- **参考文献**: `biblatex` + `biber`、`numeric` / `authoryear` 選択可。
- **メタデータマクロ**: `\papexPaperId`（タイトル上の論文ID）、`\papexSubtitle`、`\papexVenue`、`\papexDoi`（自動doi.orgリンク）、`\papexVersionNote`、`\papexKeywords`（要約の後）、`\papexLicense`（フッタ）、`\papexRunningTitle`（ヘッダ）。
- **ブランド非依存**: 「preprints／arXiv」の文言はなく、「arXivフリー」の製品方針と一致。

**`papex-build.py` の流れ**

1. `papex.json` を読む（入力はディレクトリ／単一json／`.tar.gz` のいずれも可）。
2. 検証（`jsonschema` 優先、なければ組み込みチェック）。
3. プレーンテキストフィールド（`title` / `abstract` / `authors` / `affiliation` / `keywords` / `acknowledgments` …）をエスケープし、`_papex_meta.tex`、`_papex_abstract.tex`、`_papex_sections.tex`、`_papex_backmatter.tex`、`_papex_appendices.tex`、`references.bib`（アーカイブに既に `references.bib` がある場合はスキップ）を生成。
4. `latexmk -xelatex` でコンパイル（`--emit-only` は中間ファイルのみ出力、`--validate` は検証のみ）。
5. セクション `.tex` ファイルは著者が手書きし、数式を含む完全なLaTeXをサポート；**エスケープされません**。JSONテキストフィールドをエスケープ対象から外すには `build.passthrough` を使用。

### 3.4 ローカルでのプレビューと構築

```bash
# サンプルパッケージに入る
cd papex-latex/example

# 中間 .tex/.bib のみを出力（TeX不要 — エスケープ／構造の確認に便利）
python3 ../papex-build.py . --emit-only

# papex.json のみを検証
python3 ../papex-build.py . --validate

# PDFを生成してコンパイル（ローカルのTeX Liveが必要）
python3 ../papex-build.py .
```

まとめて投稿:

```bash
tar -czf my-paper.tar.gz papex.json papex-template.tex references.bib sections/
```

### 3.5 Webサイトでのアップロード

1. サインイン後、上部ナビゲーションの **Submit** をクリックし、**Source package** タブを選びます。
2. `tar.gz` をドロップゾーンにドラッグ、またはクリックしてファイルを選択（`.tar.gz` / `.tgz` のみ、≤50MB）。
3. 「Upload & submit」をクリックすると、プラットフォームが論文IDとバージョン、および処理メモ（PDFがバックグラウンドで構築中など）を返します。
4. 「View paper」をクリックすると、新しく作成された論文ページへ移動します。

---

## 4. エンドツーエンド処理（バックエンド）

アップロード後、バックエンドはソース（`src/lib/latex/`）配下で次のようにパッケージを処理します。

```
author ──tar.gz──> POST /api/submit/archive (multipart: file)
                         │
                         ▼
                  ① unpack (tar.ts)
                     zero-dep gunzip + ustar/GNU/PAX parser, path-traversal guard
                         │
                         ▼
                  ② read papex.json → coerceManifest() validates required fields
                         │
                         ▼
                  ③ mapToCreatePaperInput()
                     · primaryCategoryId must exist (else 400)
                     · affiliation string → affiliations.id (findOrCreateAffiliation)
                     · paper.id matches own/privileged paper → new version
                         │
                         ▼
                  ④ createSubmission() ingests (reuses existing transaction)
                         │
                         ▼
                  ⑤ mapReferencesToCitations() → addCitation() links the citation graph
                         │
                         ▼
                  ⑥ optional XeLaTeX build (server latexmk)
                     → savePdfBuffer() stores → updates paper_versions.pdfUrl
                     (missing latexmk → warning only, ingestion unaffected)
                         │
                         ▼
                 returns { paperId, version, warnings, pdfUrl? }
```

**主要モジュール**

| ファイル | 責任 |
| --- | --- |
| `src/lib/latex/tar.ts` | 依存ゼロの `gunzip` + `parseTar`（ustar / GNU長名 / PAX拡張ヘッダ）、パストラバーサルガード付き `writeEntries` |
| `src/lib/latex/papex-json.ts` | `PapexManifest` 型、`coerceManifest`、`mapToCreatePaperInput`、`mapReferencesToCitations` |
| `src/lib/latex/papex-archive.ts` | `processSubmissionArchive` のオーケストレーション；`buildAndStorePdf` が `latexmk` を検出しPDFをコンパイル／保存 |
| `src/app/api/submit/archive/route.ts` | `multipart/form-data` の `file`（≤50MB）を受け取り、認証し、エラーをHTTPステータスにマップ |

**エラーコードのマッピング（HTTP）**

| 内部エラー | HTTP | 意味 |
| --- | --- | --- |
| `MANIFEST_MISSING` | 400 | アーカイブに `papex.json` がない |
| `MANIFEST_JSON_INVALID` | 400 | `papex.json` が有効なJSONではない |
| `MANIFEST_INVALID:…` | 400 | 必須フィールド欠落（title/abstract/primaryCategoryId/authors/sections） |
| `CATEGORY_NOT_FOUND:cs.X` | 400 | カテゴリコードが存在しない |
| `ARCHIVE_PARSE_FAILED` / `ARCHIVE_EMPTY` | 400 | アーカイブが破損または空 |
| `FORBIDDEN` | 403 | その論文の新バージョンを投稿する権限がない |
| `PAPER_NOT_FOUND` | 404 | 宣言された新バージョンの対象論文が存在しない |
| その他 | 500 | 内部エラー（`ID_GENERATION_FAILED` を含む） |

---

## 5. APIリファレンス

### `POST /api/papers`

フォーム投稿のエンドポイント。リクエストは `multipart/form-data`（[セクション2](#2-method-1-form-submission)参照）: フィールド `meta` はメタデータのJSON文字列、フィールド `pdf` は任意のPDFファイル（≤50MB）。認証が必要。 `{ paperId, version }` を返し、PDFがアップロードされた場合は追加で `pdf: { pdfUrl, pages, referencesExtracted, referencesLinked }` を返します。
APIクライアントはプレーンなJSON（`pdf` なし）をPOSTしても構いません。

### `POST /api/submit/archive`

ソースパッケージのエンドポイント。

- **認証**: 必須（クッキー）。
- **リクエスト**: `multipart/form-data`、フィールド `file` が `tar.gz`（≤ 50MB）。
- **成功（201）**:

  ```json
  {
    "paperId": "2608.00007",
    "version": 1,
    "warnings": [],
    "pdfUrl": "https://…/api/papers/2608.00007/pdf/1"
  }
  ```

- **失敗**: 対応するエラーメッセージを含むJSON。ステータスコードは[エラーテーブル](#4-end-to-end-processing-backend)のとおり。

---

## 6. 導入と運用

- **TeX Live**: サーバーには `texlive`（`xelatex`、`biber`、`latexmk` 付き）と `collection-langchinese` が必要で、`fandol` フォントが利用可能になります。
- **環境変数**:
  - `PAPEX_LATEX_BIN`: latexmkへのパス（デフォルトは `PATH`）。
  - `PAPEX_LATEX_DIR`: `papex.cls` を保持するディレクトリ。アーカイブに省略された場合にコピーされる。
- **サンドボックスとリソース**: LaTeXコンパイルはCPU／メモリ／タイムアウト制限のある分離環境で実行し、悪意あるソースがコマンドを実行できないよう **`\write18`（shell-escape）とネットワークアクセスを無効** にしてください。
- **非同期**: コンパイルは遅いため、本番では **非同期キュー**（PDF準備完了時に `paperId` を即座に返し、コールバックで `pdfUrl` を更新）を推奨し、リクエストのブロックを避けてください。
- **欠落時の劣化**: `latexmk` が利用できない場合、`processSubmissionArchive` は `warnings` を記録してPDF構築をスキップします。取り込みと引用リンクは引き続き機能します。
- **PDF保存**: `savePdfBuffer`（`/api/papers/{id}/pdf/{version}` のストリーミングルート）を再利用。新たな保存層は不要です。

---

## 7. セキュリティ

- **パストラバーサル**: `writeEntries` は各エントリの実パスを `path.relative` で検証し、`..` と絶対パスを拒否します。`parseTar` は先頭の `./` を取り除きます。
- **サイズ制限**: ルートは `file` を ≤ 50MB に制限します。
- **リソースの悪用**: コンパイルにはタイムアウト／リソース制限があります。ユーザーごとのレート制限を検討してください。
- **shell-escape**: コンパイルコマンドは `-shell-escape` を渡さないため、ソースがシステムコマンドを実行することを防ぎます。

---

## 8. FAQ

**Q: ソースパッケージはフォーム投稿のデータと重複しませんか？**
いいえ。両者は同じ取り込みロジックを共有し、メタデータの取得元のみが異なります。

**Q: XeLaTeXテンプレートを使う必要がありますか？**
`papex.cls` と `papex-template.tex` が最終的なPDFレイアウトを決定します。あなたが書くのはセクション `.tex` ファイルと `papex.json` のみです。アーカイブに `papex.cls` が省略されている場合、サーバーは `PAPEX_LATEX_DIR` のものを使用します。

**Q: セクションで数式・図・独自コマンドを使えますか？**
はい。セクション `.tex` ファイルは手書きで完全なLaTeXをサポートし、**エスケープされません**。独自のプリアンブルコマンドはセクションファイルまたは `papex-template.tex` に記述してください。

**Q: 投稿直後にPDFが表示されませんか？**
TeX Liveがサーバー側で設定されていない場合、`pdfUrl` は空になり、ページに「PDF is being built in the background.」と表示されます。設定して再投稿してください。本番では非同期キューと組み合わせてください。

**Q: 論文の新バージョンを投稿するには？**
`papex.json` の `paper.id` を既存の論文IDに設定します（その論文への投稿権限が必要）。プラットフォームはそれを新バージョンとして取り込みます。

**Q: 引用はどのように自動リンクされますか？**
`references` 配列内の `doi` / `arxivId` は `resolveTarget` を通じてプラットフォーム内論文に解決され、引用エッジが作成されます。その他の項目は `url` / `title` として引用グラフに保存されます。
