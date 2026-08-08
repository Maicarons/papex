# Papex LaTeX 工具链（papex-latex）

一套**专用于 papex 项目的 XeLaTeX 模板与构建工具**。作者把论文源文件（`.tex` 章节）与一个 `papex.json` 清单一起打成 `tar.gz` 提交；平台后端据此自动建稿、连引用图，并用本工具链自动填充元数据、生成 PDF。

核心特性：

- **元数据自动填充**：标题、作者、机构、文献编号、关键词、许可、DOI、venue 全部从 `papex.json` 读取，无需手写 `\title` / `\author`。
- **参考文献自动生成**：`papex.json` 的 `references` 数组 → `references.bib` → `biblatex` 渲染；章节里直接用 `\cite{key}`。
- **中英混排**：基于 `ctex`（默认 `fandol` 字体集，服务端 TeX Live 可直接编译）。
- **零依赖生成器**：`papex-build.py` 仅用 Python 标准库（可选 `jsonschema` 增强校验），可在无 TeX 环境时仅 `--emit-only` 产出中间文件。

---

## 目录结构

```
papex-latex/
├── papex.cls              # 文档类（标题块 / 作者块 / 参考文献 / 页眉页脚）
├── papex-template.tex     # 主文档（\input 自动生成片段 + 章节）
├── papex-build.py         # 构建器：papex.json -> _papex_*.tex + references.bib -> PDF
├── papex.schema.json      # papex.json 的 JSON Schema（draft-07）
├── latexmkrc              # latexmk 配置（可选，放在主文档同目录）
├── README.md
└── example/               # 完整示例提交包
    ├── papex.json
    ├── build.sh
    └── sections/
        ├── 00-intro.tex
        ├── 01-related.tex
        ├── 02-method.tex
        ├── 03-experiments.tex
        ├── 04-conclusion.tex
        └── appendix-proof.tex
```

## 提交包（tar.gz）结构

```
submission.tar.gz
├── papex.json            # 必需：清单
├── papex-template.tex    # 可选：若未提供，平台用默认主文档
├── references.bib        # 可选：若 papex.json 已含 references 数组则不需要
└── sections/             # 章节源文件（路径对应 papex.json 的 sections[].file）
    ├── 00-intro.tex
    └── ...
```

### 本地打包

```bash
cd example
tar -czf ../my-paper.tar.gz papex.json papex-template.tex references.bib sections/
# 若使用默认主文档与 json 内 references，可省略后两者：
# tar -czf ../my-paper.tar.gz papex.json sections/
```

## 本地构建

需要本机安装 **TeX Live**（含 `xelatex`、`biber`、`latexmk`）。

```bash
# 进入含 papex.json 的目录（或解包后的目录）
cd example

# 仅生成中间文件（无需 TeX，便于检查转义结果）
python3 ../papex-build.py . --emit-only

# 生成并编译 PDF
python3 ../papex-build.py .

# 校验 papex.json（不生成不编译）
python3 ../papex-build.py . --validate

# 指定主文档 / 输出目录
python3 ../papex-build.py . --main papex-template.tex --out ./build
```

输入 `<path>` 可以是：目录、单个 `papex.json`、或 `.tar.gz`（自动解包）。

### 生成的中间文件

| 文件 | 内容 |
|------|------|
| `_papex_meta.tex` | `\title` `\author` `\affil` `\papexPaperId` `\papexKeywords` `\papexLicense` … |
| `_papex_abstract.tex` | 摘要正文（来自 `paper.abstract`） |
| `_papex_sections.tex` | 按 `sections` 顺序的 `\input` 列表 |
| `_papex_backmatter.tex` | 致谢 / 基金 |
| `_papex_appendices.tex` | 附录（`\appendix` 块） |
| `references.bib` | 由 `references` 数组生成（若归档自带则跳过） |

> 这些 `_papex_*.tex` 每次构建都会被重写，**请勿手工编辑**；修改请在 `papex.json` 中完成。

## papex.json 字段 ↔ 数据库映射

| papex.json 字段 | 数据库目标 | 说明 |
|-----------------|-----------|------|
| `paper.id` (`YYMM.NNNNN`) | `papers.id` | 若匹配本人已有论文 → 视为新版本；否则平台分配新编号 |
| `paper.title` | `papers.title` / `paper_versions.title` | |
| `paper.abstract` | `paper_versions.abstract` | |
| `paper.keywords[]` | （元数据，PDF 内呈现） | 暂不入库独立表 |
| `paper.primaryCategoryId` | `papers.primaryCategoryId` | 必须存在于 `categories` |
| `paper.secondaryCategoryIds[]` | `paper_categories` (is_primary=false) | |
| `paper.doi` | `paper_versions.doi` | → 也写入 `citations.target_doi`（自引解析） |
| `paper.license` | `paper_versions.license` | 默认 `CC-BY-4.0` |
| `paper.versionNote` | `paper_versions.comments` | |
| `authors[].name/orcid/email/affiliation` | `authors` + `paper_authors` + `affiliations` | `order` 控制顺序，`corresponding`/`equalContribution` 渲染脚注 |
| `references[].key/.../doi/url/arxivId` | `citations` | `doi`/`arxivId` 用于解析内部引用图；`url` 入 `target_url` |
| `sections[]` | （PDF 正文结构） | 不入关系表，仅驱动 `\input` |
| `acknowledgments` / `funding` | PDF 内呈现 | |

## 可用的文档类宏（papex.cls）

生成器已自动注入以下宏，作者一般无需手动调用；如需覆盖可在 `\input{_papex_meta.tex}` 之后重设：

| 宏 | 作用 |
|----|------|
| `\papexPaperId{ID}` | 标题上方显示「文献编号」 |
| `\papexSubtitle{...}` | 标题下方副标题 |
| `\papexVenue{...}` | 会议 / 期刊名 |
| `\papexDoi{...}` | DOI 行（自动加 doi.org 链接） |
| `\papexVersionNote{...}` | 版本注记 |
| `\papexKeywords{...}` | 摘要后关键词 |
| `\papexLicense{...}` | 页脚许可声明 |
| `\papexRunningTitle{...}` | 页眉右侧短标题 |
| `\papexPdfAuthor{...}` | PDF 元数据作者 |

文档类选项：`\documentclass[11pt,fontset=fandol,twocolumn,bibstyle=authoryear]{papex}`。

`build` 可选字段：`fontset`（windows/mac/ubuntu/fandol）、`bibStyle`（numeric/authoryear）、`columns`（1/2）、`passthrough`（字段路径列表，豁免 LaTeX 转义，如 `["paper.abstract"]`）。

## 转义与安全

- 从 `papex.json` 注入的**纯文本字段**（标题、摘要、作者名、机构、关键词、致谢等）会被自动转义，避免破坏 LaTeX 编译。
- **章节 `.tex` 文件**由作者手写，支持完整 LaTeX（数学公式、表格、图形等），不做转义。
- 若某纯文本字段确实需要内嵌 LaTeX（如摘要含公式），在 `build.passthrough` 中列出该字段路径即可跳过转义（作者自行保证语法正确）。

## 服务端编译注意事项

- 后端应在**隔离沙箱**中执行 `latexmk`，限制资源、禁用网络与 `\write18`（shell-escape）。
- 推荐服务端 TeX Live 安装 `collection-langchinese` 以保证 `fandol` 字体可用；作者本地可用 `fontset=windows/mac` 享受系统字体。
- 详见仓库 `docs/guide/submission.md` 的「部署与运维」「安全」章节。
