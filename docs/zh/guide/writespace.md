# 在线创作（Writespace）

本指南介绍 Papex 内置的**在线创作**模块（入口 `/writespace`）——一个无需本地安装
TeX、无需手敲 JSON 的浏览器内写作台。它把[投稿指南](/guide/submission)里的
「源码包上传」链路进一步前置到网页中：你在浏览器里填元数据、写正文，系统帮你生成
合规的 `papex.json` 与章节 `.tex`，可直接**导出 `tar.gz`** 或**一键发布**到平台。

---

## 1. 概述

### 1.1 它解决什么痛点

| 传统「源码包上传」的痛点 | 在线创作的解法 |
| --- | --- |
| 手写 `papex.json` 容易漏字段、格式错 | 可视化编辑器 + 实时校验 |
| 想核对结构得本地装 Python / TeX | 浏览器内生成中间 `.tex`，无需本地环境 |
| 打包、上传两步割裂 | 编辑器内「导出」与「发布」一键完成 |
| 写到一半怕丢 | 自动存浏览器 `localStorage` |

### 1.2 三个标签页

| 标签页 | 作用 |
| --- | --- |
| **元数据** | 论文信息、作者、参考文献、构建选项——可视化编辑 `papex.json` |
| **正文** | 结构化章节 / 附录工作台，撰写 LaTeX 正文 |
| **导出与发布** | 实时校验、归档文件清单预览、导出 `tar.gz` / 一键发布 |

### 1.3 与投稿系统的关系

在线创作**不是**一种新的投稿方式，而是「源码包上传」的**创作端**。它产出的归档与
[源码包上传](/guide/submission#3-方式二源码包上传)完全一致，发布时复用同一个后端接口
`POST /api/submit/archive`，走同一套「解包 → 校验 → 建稿 → 连接引用图 → 构建 PDF」流水线
（详见[投稿指南 4 节](/guide/submission#4-端到端处理流程后端)）。

---

## 2. 入口与权限

- **入口**：`/writespace`。
- **页面鉴权**：服务端组件 `src/app/writespace/page.tsx` 调用 `getCurrentUser()`，未登录直接
  `redirect("/login")`。
- **中间件**：`src/middleware.ts` 已将 `/writespace` 加入 `PROTECTED_PREFIXES`，并在 `matcher`
  增加 `/writespace/:path*`，确保未登录请求在服务端即被拦截。
- **发布权限**：发布本质是一次源码包提交，适用[投稿指南 4 节](/guide/submission#4-端到端处理流程后端)
  中相同的 `FORBIDDEN` / `PAPER_NOT_FOUND` 规则——当 `paper.id` 声明新版本时，必须对该论文拥有提交权限。

---

## 3. 标签页一：元数据编辑器

「元数据」标签页对应 `MetadataEditor`，把 `papex.json` 的 `paper` / `authors` /
`references` / `build` 四块拆成卡片式表单，字段与
[投稿指南 3.2](/guide/submission#32-papexjson-完整字段说明)逐一对齐。

### 3.1 论文信息（`metaPaper`）

标题、副标题、摘要、关键词（逗号分隔）、主分类（下拉，必选）、次要分类（可增删）、
DOI、许可协议（下拉，默认 `CC-BY-4.0`）、发表场合、版本注记、语言、文献编号
（选填，填写且属于你已有论文则作为新版本提交）。

### 3.2 作者（`metaAuthors`）

- 可添加多位，每位卡片支持**上移 / 下移 / 删除**。
- 字段：姓名（必填）、机构、邮箱、ORCID（格式校验）、主页、通讯作者开关、同等贡献开关、备注、排序。
- 通讯作者 / 同等贡献 / 备注会以 `\thanks` 脚注渲染到 PDF；ORCID、主页也会进入脚注。

### 3.3 参考文献（`metaReferences`）

- 可添加多条 BibTeX 条目；字段含引用键（必填，含格式校验）、类型（下拉，12 种 BibTeX 类型）、
  标题、作者、期刊、会议/书名、年份、DOI、链接、arXiv ID、页码、卷、期、出版方、备注。
- 两重用途：①发布时经 `mapReferencesToCitations` 连接平台内引用图；②导出时自动生成 `references.bib`
  （见[第 7 节](#7-导出归档结构)）。

### 3.4 构建选项（`metaBuild`）

- 参考文献样式：`numeric` / `authoryear`（注入到主文档 `\documentclass[11pt,bibstyle=authoryear]`）。
- 栏数：`1` / `2`（双栏注入 `twocolumn`）。
- 其余 `build` 选项（如 `fontset`、`documentclass`）保留给服务端编译使用；默认值见
  `createDefaultDraft`。

### 3.5 实时校验

编辑器每处改动都经过 `validateDraft()`（`src/lib/writespace/manifest.ts`），校验结果
与「导出与发布」标签页共享。核心规则：

| 校验项 | 规则 | 类型 |
| --- | --- | --- |
| `schemaVersion` | 须匹配 `x.y.z` | 错误 |
| `paper.title` / `abstract` / `primaryCategoryId` | 必填且非空 | 错误 |
| `paper.id`（选填） | 若填须匹配 `YYMM.NNNNN` | 错误 |
| `authors` | 至少 1 项；每项 `name` 必填；`orcid` 须匹配 `0000-0000-0000-0000` | 错误 |
| `sections` | 至少 1 项；每项 `file` 必填；`id` 仅含字母、数字、`-`、`_` | 错误 |
| `references` | 每项 `key` 必填且仅限 `A-Za-z0-9_:+.-`；`year` ∈ [0, 3000] | 错误 |
| 章节正文为空 | 提示性 | 警告 |

> 「错误」会阻断发布；「警告」（如某章节正文留空）仅提示，不阻断。

---

## 4. 标签页二：正文工作台

「正文」标签页对应 `SectionsEditor`，用结构化方式管理论文正文与附录。

### 4.1 章节列表

- 每个章节（或附录）是一个可折叠卡片，含：标识/文件名（`file`，如 `sections/intro.tex`）、
  章节标题、层级（`section` / `subsection` / `subsubsection` / `chapter` / `part`）、
  正文（LaTeX 文本框）、字符数。
- 支持：添加章节、添加附录、上移 / 下移、删除。
- 层级决定导出时生成的命令（`\section{标题}` → `\input{sections/intro.tex}`）。

### 4.2 正文内容规则

- 章节 `.tex` 由你手写，支持**完整 LaTeX**：数学公式、图表、自定义命令，以及 `\cite{key}`
  引用（与参考文献的引用键对应）。
- 章节正文**不做转义**（与[投稿指南 3.3](/guide/submission#33-xelatex-工具链papex-latex)一致）；
  转义只作用于「元数据」里的纯文本字段。
- 提供「插入示例章节」按钮，一次性写入引言 / 相关工作 / 方法 / 实验 / 结论五段带 LaTeX
  公式的示范内容，便于快速上手。

### 4.3 附录

附录条目与章节结构相同，导出时统一置于 `\appendix` 之后。

---

## 5. 标签页三：导出与发布

「导出与发布」标签页对应 `ExportPanel`，是全流程的出口。

### 5.1 校验状态

顶部实时展示 `validateDraft()` 结果：通过（`校验通过`）或 `校验未通过` + 错误/警告清单。
存在错误时「发布」按钮禁用。

### 5.2 文件清单预览

展示本次导出将包含的归档文件（即 `buildArchiveFiles` 的输出，[第 7 节](#7-导出归档结构)），
让你在下载/发布前确认结构。

### 5.3 导出 `tar.gz`

点击「导出」：浏览器内即时生成 `tar.gz` 并触发下载（文件名取自 i18n `writespace.expDownloadName`）。

- 全程**零依赖**：`src/lib/writespace/targz.ts` 手写 POSIX ustar 打包 + 浏览器原生
  `CompressionStream('gzip')`，无需后端参与。
- 模板资产（`papex-template.tex` / `papex.cls`）在导出时从 `/writespace/papex-template.tex`、
  `/writespace/papex.cls` 即时拉取并打入归档，保证归档**自包含**（后端直接 `latexmk` 即可编译）。

### 5.4 一键发布

点击「发布」：执行与导出相同的生成步骤，然后把 `tar.gz` 作为 `multipart/form-data` 的
`file` 字段 `POST` 到 `/api/submit/archive`。

- 发布前强制要求 `validation.valid === true`。
- 成功后展示返回的「文献编号 + 版本号」与 `warnings`，并提供「查看论文」入口；同时清空本地草稿标记。
- 失败时在面板内展示后端返回的错误信息（映射见
  [投稿指南 4 节错误码表](/guide/submission#4-端到端处理流程后端)）。

---

## 6. 草稿自动保存与恢复

- 草稿（`manifest` + 各章节正文）自动存到浏览器 `localStorage`（key：`papex-writespace-draft`），
  去抖 400ms，关闭页面不丢。
- 再次打开 `/writespace` 会自动恢复上次草稿，并显示「已恢复本地草稿」；编辑后显示「已自动保存」。
- 顶部「新建」按钮会二次确认后清空 `localStorage` 并重置为空白稿（含一个示例引言章节）。

> 草稿仅存于本机浏览器，更换设备或清除浏览器数据会丢失；重要稿件请及时「导出」或「发布」。

---

## 7. 导出归档结构

「导出 / 发布」生成的 `tar.gz` 由 `buildArchiveFiles()` 组装，与后端
`papex-archive.ts` 期望的结构完全一致：

```
my-paper.tar.gz
├── papex.json            # 由编辑器 manifest 序列化（2 空格缩进）
├── papex-template.tex    # 注入 bibstyle/twocolumn 后的主文档
├── papex.cls             # 文档类（从 /writespace/papex.cls 打入）
├── references.bib        # 由 references 自动生成（无文献则省略）
├── sections/
│   ├── intro.tex         # 你在「正文」里写的章节
│   └── …
└── _papex_*.tex          # 自动生成的中间片段（请勿手改）
    ├── _papex_meta.tex       # 标题/作者/机构/关键词/running title
    ├── _papex_abstract.tex   # 摘要
    ├── _papex_sections.tex   # 章节 \section+\input 装配
    ├── _papex_backmatter.tex # 致谢/基金
    └── _papex_appendices.tex # \appendix + 附录
```

- `_papex_*.tex` 由 `genMeta` / `genAbstract` / `genSections` / `genBackmatter` /
  `genAppendices` 生成；纯文本字段经过 `latexEscape` 单遍转义，章节正文原样 `\input`。
- 该归档可直接走「源码包上传」页手动上传，也可由「发布」按钮自动提交——二者等价。

---

## 8. 技术实现要点

| 关注点 | 实现 |
| --- | --- |
| 数据模型 | `src/lib/writespace/manifest.ts`：类型对齐 `papex.schema.json` + `papex-json.ts`，纯前端、不引服务端模块 |
| LaTeX 生成 | `src/lib/writespace/latex-gen.ts`：端口 `papex-build.py` 逻辑到 TS，转义采用**单遍字符扫描**（与修正后的 `papex-build.py` 一致，避免 `\textbackslash{}` 被二次转义） |
| 打包 | `src/lib/writespace/targz.ts`：手写 ustar + `CompressionStream('gzip')`，零依赖、纯浏览器 |
| 模板资产 | `public/writespace/papex.cls` + `papex-template.tex`（从 `papex-latex/` 拷贝，LF 归一化），运行时 `fetch` 打入归档 |
| 编排 | `src/components/writespace/writespace-client.tsx`：`Tabs` 三页 + 草稿持久化 + 导出/发布 |
| 国际化 | `src/i18n/dictionaries/{zh,en}.ts` 的 `writespace` 区块（约 70 键），与界面标签一致 |

---

## 9. 安全与限制

- **权限**：进入与发布都强制登录；发布的新版本目标论文须属于当前用户（或特权角色），否则后端返回 `FORBIDDEN`。
- **不落盘**：所有生成与打包在浏览器内存完成，文件仅在你点击下载/发布时离机；平台侧仍按
  [投稿指南 6/7 节](/guide/submission#6-部署与运维)的 TeX 沙箱、体积限制、shell-escape 禁用等策略执行编译。
- **浏览器兼容**：`CompressionStream('gzip')` 需较新浏览器（Chrome/Edge 80+、Firefox 113+、Safari 16.4+）；
  不支持时导出会给出友好报错。
- **50MB 限制**：发布走 `/api/submit/archive`，受同一 50MB 上限约束。

---

## 10. 常见问题（FAQ）

**Q：在线创作和源码包上传，选哪个？**
任选其一。在线创作适合不想碰命令行、想实时校验的作者；源码包上传适合已有本地 TeX 工程、
想用 `papex-build.py` 精细控制的作者。两者入库结果完全一致。

**Q：导出的 `tar.gz` 能直接上传到「源码包上传」页吗？**
能，且等价。导出归档里已自带 `papex.cls` 与 `papex-template.tex`，后端无需再从
`PAPEX_LATEX_DIR` 拷贝。

**Q：我写的正文里用 `\cite{key}` 但发布后没连上引用？**
引用连接依赖参考文献里的 `doi` / `arxivId` 命中平台内已有论文；纯 `url` / `title` 的条目只进引用图，
不建立内部链接。检查参考文献的 DOI / arXiv ID 是否准确。

**Q：草稿会同步到云端吗？**
不会。草稿仅存浏览器 `localStorage`，换设备/清缓存会丢失。请养成「导出」或「发布」的习惯。

**Q：章节正文里的 `$...$` 公式会乱码吗？**
不会。章节 `.tex` 原样写入归档（不转义），公式由后端 XeLaTeX 编译渲染。只有「元数据」里的纯文本字段会被转义。

**Q：发布后没有立刻看到 PDF？**
同[投稿指南 FAQ](/guide/submission#8-常见问题faq)：取决于服务端是否配置 TeX Live；未配置时
`pdfUrl` 为空，页面提示「PDF 正在后台构建」。
