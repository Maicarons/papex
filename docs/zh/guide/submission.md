# 投稿指南

本指南说明 Papex 支持的两种论文投稿方式，并完整介绍**源码包上传**及其配套的
`papex.json` 清单与 XeLaTeX 工具链。

---

## 1. 概述

Papex 提供两种投稿入口，面向不同使用场景：

| 方式 | 入口 | 适合人群 | 特点 |
| --- | --- | --- | --- |
| **表单提交** | 网站「投稿 → 表单提交」页 / `POST /api/papers` | 偶尔投稿、希望快速录入 | 在网页直接填写标题、摘要、作者等元数据，并**直接上传 PDF 全文**（≤50MB） |
| **源码包上传** | 网站「投稿 → 源码包上传」页 / `POST /api/submit/archive` | 习惯用 LaTeX 写作的作者 | 把论文源文件与一份 `papex.json` 清单打包为 `tar.gz` 上传，平台**自动建稿、连接引用图并构建 PDF** |

> 两种方式的入库逻辑完全一致（共用 `createSubmission` 与 `addCitation`），区别仅在于元数据的来源与正文/PDF 的产生方式。

> **不想碰命令行？** 也可以用内置的[在线创作](/guide/writespace)模块在浏览器里可视化编辑 `papex.json`、撰写正文，并直接「导出 `tar.gz`」或「一键发布」——它产出的归档与源码包上传完全等价。

---

## 2. 方式一：表单提交

在网站顶部导航点击 **投稿**，选择 **表单提交** 标签页，填写以下字段后点击「提交论文」：

- **标题**、**摘要**
- **主分类**（必选，代码见分类树，如 `cs.LG`）、**交叉分类**（逗号分隔，可选）
- **作者**（可添加多位，顺序即作者次序）
- **上传 PDF**（可选）：拖拽或点击选择 PDF 文件（≤50MB），平台自动存储并抽取引用关系；**DOI**（可选）、**许可协议**（默认 `CC-BY-4.0`）、**版本说明**（可选）

提交后该论文进入审核队列。表单提交以 `multipart/form-data` 发送：`meta` 为元数据 JSON 字符串，`pdf` 为可选的 PDF 文件：

```http
POST /api/papers
Content-Type: multipart/form-data; boundary=...

--boundary
Content-Disposition: form-data; name="meta"

{"title":"…","abstract":"…","primaryCategoryId":"cs.LG","secondaryCategoryIds":["stat.ML"],"authors":[{"name":"张明","order":0}],"doi":"","license":"CC-BY-4.0","comments":"","basePaperId":null}
--boundary
Content-Disposition: form-data; name="pdf"; filename="paper.pdf"
Content-Type: application/pdf

<二进制 PDF 数据>
--boundary--
```

> PDF 为可选项；若上传，接口会把它存入论文版本并自动解析正文、连接平台内引用，返回 `{ pdfUrl, pages, referencesExtracted, referencesLinked }`。

---

## 3. 方式二：源码包上传

源码包上传是面向作者的**工作流式**投稿：你用 LaTeX 写好论文，再用一份结构化
`papex.json` 描述元数据与参考文献，打包成 `tar.gz` 一键上传。平台后端会完成
「解包 → 校验 → 建稿 → 连接引用图 → 构建 PDF」的全部工作。

### 3.1 源码包结构

一个最小可用、也是推荐的源码包结构：

```
my-paper.tar.gz
├── papex.json            # 必填：论文清单（元数据 + 章节 + 参考文献）
├── papex-template.tex    # 主文档（可直接用仓库提供的 papex-template.tex）
├── papex.cls             # 文档类（可省略，服务端会从 PAPEX_LATEX_DIR 拷贝）
├── references.bib        # 可选：手写 BibTeX；省略则由 papex.json 的 references 自动生成
└── sections/             # 论文正文章节（.tex 片段，由 papex.json 的 sections 顺序引用）
    ├── 00-intro.tex
    ├── 01-related.tex
    └── …
```

> 压缩包内**必须包含 `papex.json`**，否则上传会被拒绝（HTTP 400）。

### 3.2 `papex.json` 完整字段说明

完整 JSON Schema 见仓库 [`papex-latex/papex.schema.json`](https://github.com/)。下表列出核心字段及其目标：

| 字段 | 类型 | 必填 | 说明 / 数据库目标 |
| --- | --- | --- | --- |
| `paper.id` | string (`YYMM.NNNNN`) | 否 | 若匹配**本人（或管理员）已有论文** → 作为新版本提交；否则平台自动分配新「文献编号」 |
| `paper.title` | string | 是 | → `papers.title` / `paper_versions.title` |
| `paper.abstract` | string | 是 | → `paper_versions.abstract` |
| `paper.keywords` | string[] | 否 | 在 PDF 摘要后呈现（暂不单独入库） |
| `paper.primaryCategoryId` | string | 是 | → `papers.primaryCategoryId`；**必须存在于分类表**，否则 400 |
| `paper.secondaryCategoryIds` | string[] | 否 | → `paper_categories`（非主分类） |
| `paper.doi` | string | 否 | → `paper_versions.doi`，同时写入引用图（`target_doi`） |
| `paper.license` | string | 否 | → `paper_versions.license`，默认 `CC-BY-4.0` |
| `paper.versionNote` | string | 否 | → `paper_versions.comments`（版本说明） |
| `paper.subtitle` | string | 否 | 在 PDF 标题下方呈现 |
| `paper.venue` | string | 否 | 在 PDF 标题区呈现（如会议/期刊名） |
| `authors[].name` | string | 是 | → `authors` + `paper_authors`（按 `order` 排序） |
| `authors[].orcid` | string | 否 | 作者页脚呈现 |
| `authors[].email` | string | 否 | 通讯作者时用于联系邮箱 |
| `authors[].affiliation` | string | 否 | **字符串** → 经 `findOrCreateAffiliation` 转 `affiliations.id` |
| `authors[].corresponding` | boolean | 否 | 渲染为「通讯作者」脚注 |
| `authors[].equalContribution` | boolean | 否 | 渲染为「同等贡献」脚注 |
| `authors[].footnote` | string | 否 | 自由文本脚注 |
| `references[].key` | string | 是 | BibTeX 引用键 |
| `references[].doi` / `arxivId` | string | 否 | 经 `resolveTarget` 连接平台内论文；否则 `url`/`title` 入 `citations` |
| `references[].url` / `title` / `authors` / `year` / `venue` | string | 否 | 填充 `citations` 与自动生成的 `references.bib` |
| `sections[]` | string[] | 是 | 章节 `.tex` 文件相对路径列表（顺序即正文顺序）；**仅驱动 LaTeX，不入关系表** |
| `appendices[]` | string[] | 否 | 附录 `.tex` 路径列表 |
| `acknowledgments` / `funding` | string | 否 | 在 PDF 致谢/基金部分呈现 |
| `build` | object | 否 | 构建选项：`style`（numeric/authoryear）、`fontset`（fandol/windows/mac/ubuntu）、`passthrough`（豁免转义的字段）等 |

> **与表单提交的差异**：`papex.json` 用 `affiliation` **字符串**而非数字
> `affiliationId`，映射层负责查/建 `affiliations` 表并回填；并新增 `sections`、
> `references`、`appendices`、`build` 等 LaTeX 专属字段。

### 3.3 XeLaTeX 工具链（`papex-latex/`）

仓库内置一套专用于 papex 的 XeLaTeX 工具链，位于 [`papex-latex/`](https://github.com/)：

```
papex-latex/
├── papex.cls              # 文档类（ctex + authblk + biblatex，中英混排、元数据宏、页眉页脚）
├── papex-template.tex     # 主文档，自动 \input 生成的 _papex_*.tex 与章节
├── papex-build.py         # 零依赖构建器（仅标准库；可选 jsonschema）
├── papex.schema.json      # papex.json 的 draft-07 清单契约
├── latexmkrc              # latexmk 配置（可选）
├── README.md              # 工具链使用说明
└── example/               # 完整示例提交包（中文论文 + 5 章节 + 附录）
```

**`papex.cls` 设计要点**

- **中英混排**：基于 `ctex`（`scheme=plain`），默认 `fontset=fandol`（TeX Live 自带，服务端可直接编译）；本地可切 `windows` / `mac` / `ubuntu`。
- **作者/机构块**：`authblk`，支持多作者共享机构、通讯作者与同等贡献脚注。
- **参考文献**：`biblatex` + `biber`，`numeric` / `authoryear` 可选。
- **元数据宏**：`\papexPaperId`（标题上方「文献编号」）、`\papexSubtitle`、`\papexVenue`、`\papexDoi`（自动加 doi.org 链接）、`\papexVersionNote`、`\papexKeywords`（摘要后）、`\papexLicense`（页脚）、`\papexRunningTitle`（页眉）。
- **品牌独立**：不出现 *preprints / arXiv* 字样，与全站「去 arXiv 化」约定一致。

**`papex-build.py` 工作流程**

1. 读取 `papex.json`（输入可为目录 / 单个 json / `.tar.gz`）。
2. 校验（优先 `jsonschema`，否则内置基础校验）。
3. 转义纯文本字段（`title` / `abstract` / `authors` / `affiliation` / `keywords` / `acknowledgments` 等），生成 `_papex_meta.tex`、`_papex_abstract.tex`、`_papex_sections.tex`、`_papex_backmatter.tex`、`_papex_appendices.tex` 与 `references.bib`（归档自带 `references.bib` 则跳过）。
4. 调用 `latexmk -xelatex` 编译（`--emit-only` 仅生成中间文件，`--validate` 仅校验）。
5. 章节 `.tex` 由作者手写，支持完整 LaTeX（含数学公式），**不做转义**；如需在 JSON 文本字段内嵌 LaTeX，用 `build.passthrough` 豁免转义。

### 3.4 本地预览与构建

```bash
# 进入示例包
cd papex-latex/example

# 仅生成中间 .tex/.bib（无需 TeX 环境，可用于核对转义与结构）
python3 ../papex-build.py . --emit-only

# 仅校验 papex.json
python3 ../papex-build.py . --validate

# 生成并编译 PDF（需要本地安装 TeX Live）
python3 ../papex-build.py .
```

打包并提交：

```bash
tar -czf my-paper.tar.gz papex.json papex-template.tex references.bib sections/
```

### 3.5 在网站上上传

1. 登录后点击顶部导航 **投稿**，选择 **源码包上传** 标签页。
2. 将 `tar.gz` 拖入上传区，或点击选择文件（仅接受 `.tar.gz` / `.tgz`，≤ 50MB）。
3. 点击「上传并提交」，平台返回「文献编号」与版本号，并给出处理提示（例如 PDF 正在后台构建）。
4. 点击「查看论文」跳转到新创建的论文页。

---

## 4. 端到端处理流程（后端）

源码包上传后，后端按以下流水线处理（源码位于 `src/lib/latex/`）：

```
作者 ──tar.gz──> POST /api/submit/archive (multipart: file)
                       │
                       ▼
                ① 解包 (tar.ts)
                   零依赖 gunzip + ustar/GNU/PAX 解析，路径穿越防护
                       │
                       ▼
                ② 读取 papex.json → coerceManifest() 校验必填字段
                       │
                       ▼
                ③ mapToCreatePaperInput()
                   · primaryCategoryId 必须存在（否则 400）
                   · affiliation 字符串 → affiliations.id（findOrCreateAffiliation）
                   · paper.id 匹配本人/特权角色已有论文 → 新版本
                       │
                       ▼
                ④ createSubmission() 建稿（复用既有事务逻辑）
                       │
                       ▼
                ⑤ mapReferencesToCitations() → addCitation() 逐条连接引用图
                       │
                       ▼
                ⑥ 可选 XeLaTeX 构建（服务端 latexmk）
                   → savePdfBuffer() 存盘 → 更新 paper_versions.pdfUrl
                   （latexmk 缺失则仅记 warning，不影响建稿）
                       │
                       ▼
                 返回 { paperId, version, warnings, pdfUrl? }
```

**关键模块**

| 文件 | 职责 |
| --- | --- |
| `src/lib/latex/tar.ts` | 零依赖 `gunzip` + `parseTar`（ustar / GNU 长名 / PAX 扩展头），`writeEntries` 带路径穿越防护 |
| `src/lib/latex/papex-json.ts` | `PapexManifest` 类型、`coerceManifest` 校验、`mapToCreatePaperInput`、`mapReferencesToCitations` |
| `src/lib/latex/papex-archive.ts` | `processSubmissionArchive` 编排；`buildAndStorePdf` 探测 `latexmk` 并编译、存 PDF |
| `src/app/api/submit/archive/route.ts` | 接收 `multipart/form-data` 的 `file`（≤50MB），认证后调用编排，错误映射到 HTTP 状态码 |

**错误码映射（HTTP）**

| 内部错误 | HTTP | 含义 |
| --- | --- | --- |
| `MANIFEST_MISSING` | 400 | 归档缺少 `papex.json` |
| `MANIFEST_JSON_INVALID` | 400 | `papex.json` 非合法 JSON |
| `MANIFEST_INVALID:…` | 400 | 必填字段缺失（title/abstract/primaryCategoryId/authors/sections） |
| `CATEGORY_NOT_FOUND:cs.X` | 400 | 分类代码不存在 |
| `ARCHIVE_PARSE_FAILED` / `ARCHIVE_EMPTY` | 400 | 压缩包损坏或为空 |
| `FORBIDDEN` | 403 | 无权向该论文提交新版本 |
| `PAPER_NOT_FOUND` | 404 | 声明的新版本目标论文不存在 |
| 其它 | 500 | 内部错误（含 `ID_GENERATION_FAILED`） |

---

## 5. API 参考

### `POST /api/papers`

表单提交接口。请求为 `multipart/form-data`（见[第 2 节](#2-方式一表单提交)）：字段
`meta` 为元数据 JSON 字符串，字段 `pdf` 为可选的 PDF 文件（≤50MB）。需登录。成功返回
`{ paperId, version }`，若上传了 PDF 则附带 `pdf: { pdfUrl, pages, referencesExtracted, referencesLinked }`。

### `POST /api/submit/archive`

源码包提交接口。

- **鉴权**：需登录（Cookie）。
- **请求**：`multipart/form-data`，字段 `file` 为 `tar.gz`（≤ 50MB）。
- **成功（201）**：

  ```json
  {
    "paperId": "2608.00007",
    "version": 1,
    "warnings": [],
    "pdfUrl": "https://…/api/papers/2608.00007/pdf/1"
  }
  ```

- **失败**：返回对应错误信息的 JSON，状态码见[错误码表](#4-端到端处理流程后端)。

---

## 6. 部署与运维

- **TeX Live**：服务端需安装 `texlive`（含 `xelatex`、`biber`、`latexmk`），并包含
  `collection-langchinese` 以保证 `fandol` 字体可用。
- **环境变量**：
  - `PAPEX_LATEX_BIN`：latexmk 路径（默认依赖 `PATH`）。
  - `PAPEX_LATEX_DIR`：存放 `papex.cls` 的目录；归档未自带 `papex.cls` 时从此处拷贝。
- **沙箱与资源**：LaTeX 编译应在隔离环境中执行，限制 CPU/内存/超时，并**禁用
  `\write18`（shell-escape）** 与网络访问，防止恶意源码执行命令。
- **异步化**：编译耗时较长，生产环境建议改为**消息队列异步编译**（提交先返回
  `paperId`，PDF 就绪后回调更新 `pdfUrl`），避免阻塞请求。
- **缺失降级**：若 `latexmk` 不可用，`processSubmissionArchive` 仅记录 `warnings` 并跳过
  PDF 构建，建稿与引用连接不受影响。
- **PDF 存储**：复用既有 `savePdfBuffer`（`/api/papers/{id}/pdf/{version}` 流式路由），
  无需新建存储层。

---

## 7. 安全

- **路径穿越**：`writeEntries` 对每个条目真实路径做 `path.relative` 校验，拒绝 `..` 与
  绝对路径；`parseTar` 去除条目前的 `./`。
- **体积限制**：路由层限制 `file` ≤ 50MB。
- **资源滥用**：编译设超时与资源上限；建议对单用户提交频率限流。
- **shell-escape**：编译命令不传 `-shell-escape`，避免源码执行系统命令。

---

## 8. 常见问题（FAQ）

**Q：源码包和表单提交，数据会重复吗？**
不会。两者共用同一套建稿逻辑，仅在元数据来源上不同。

**Q：必须用 XeLaTeX 模板吗？**
`papex.cls` 与 `papex-template.tex` 决定了 PDF 的最终版式；你只需编写章节 `.tex` 与
`papex.json`。若归档未自带 `papex.cls`，服务端会用 `PAPEX_LATEX_DIR` 中的版本。

**Q：章节里可以用数学公式、图表、自定义命令吗？**
可以。章节 `.tex` 由作者手写，支持完整 LaTeX，**不做转义**。自定义导言区命令请放在
章节文件内或 `papex-template.tex` 中。

**Q：提交后没有立刻看到 PDF？**
若服务端未配置 TeX Live，`pdfUrl` 为空，页面会提示「PDF 正在后台构建」。配置后重新
提交即可；生产环境建议配合异步队列。

**Q：如何提交论文的新版本？**
在 `papex.json` 的 `paper.id` 填写你已有的「文献编号」（且你对该论文有提交权限），
平台会将其作为新版本入库。

**Q：引用如何自动连接？**
`references` 数组中的 `doi` / `arxivId` 会被 `resolveTarget` 解析为平台内已有论文，
并建立引用关系；其余条目以 `url` / `title` 形式存入引用图。
