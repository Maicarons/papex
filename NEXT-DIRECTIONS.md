# Papex 下一步发展方向研究

> 研究日期：2026-08-17 ｜ 视角：项目技术合伙人（MaiBot）
> 目的：在功能矩阵已极尽完整的前提下，找出真正能拉开差距的下一步方向，给出可落地的优先级与路线图。

## 执行摘要

1. **Papex 当前不缺"功能广度"，缺"数据深度"与"检索智能"**。投稿、版本、多语言全文检索、引用图谱、文献计量、标签、背书、RBAC、协同评审、站内信、在线写作、开放 API 全部到位，测试 53+13 通过。
2. **最大代差是检索范式**：仍是关键词/布尔检索，而 2026 年主流平台（Semantic Scholar、arXivNext、OpenReview Nexus）已全面转向"向量语义检索 + 知识图谱 + AI 综述"。
3. **第二大短板是数据稀疏**：引用网络、共引、合作网络都依赖手工录入或 PDF 正则解析，图谱很空。根因是没有外部元数据自动导入。
4. **推荐路径**：Phase 1 先补数据底座（外部导入 → 语义检索），Phase 2 上智能化（AI 层 → 代码/数据关联 → 开放评审增强），Phase 3 做成熟度治理。
5. **立即可做**：处理 GitHub 1 个 high 级依赖告警、补全 seed 分类占位描述、提交 whatsnew GIF 收尾、对齐 about/README 的功能清单——半天到一天内可清零。

> **实施状态（2026-08-17）**：**P0-A 与 P0-B 已全部落地**。
> - P0-A：新增 `pgvector` 嵌入列（`paper_versions.embedding vector(1024)` + HNSW 索引，迁移 `0009`）、可插拔 `lib/embeddings.ts`（OpenAI-compatible，能力门控，未配置则静默回退关键词检索）、`listPapers` 混合检索（语义 0.7 + ts_rank 0.3）、前端"语义/关键词"切换、回填脚本 `npm run embeddings:backfill`。
> - P0-B：新增 `services/import.ts`（Crossref / arXiv / Semantic Scholar / OpenCitations 映射与抓取，纯函数已单测）、`paper_external_ids` 跨源去重表、`POST /api/papers/import` 与 `POST /api/papers/[id]/citations/complete`、幂等导入、跳过背书门禁的受信导入。
> - 验收：已补 `EMBEDDING_*` / `IMPORT_DEFAULT_CATEGORY` 到 `.env.example`，并新增 `import.test.ts`（纯映射函数，无需网络）。下一步跑 `typecheck / lint / build / test` 全量校验。

---

## 一、现状盘点

### 1.1 已经完成的能力（非常完整）

| 能力域 | 落地情况 |
| --- | --- |
| 投稿与版本 | `/submit` + 版本快照，永久归档，撤稿原因记录 |
| 检索 | 多语言全文（tsvector + pg_trgm 中文）、布尔 AND/OR/NOT、字段作用域、时间范围、按被引排序 |
| 引用体系 | 引用图谱（ECharts 力导）、共引/同被引/二级引用、GB/T 7714·BibTeX·APA 导出、引用数排序 |
| 文献计量 | 作者被引总数、H 指数、合作网络、发文趋势、关键词共现、热词云 |
| 社区 | 标签、收藏分组、订阅/通知中心、站内信、工单状态机、反馈 |
| 治理 | RBAC（17 权限/7 组/4 角色）、角色管理后台、背书门禁、协同评审闭环 |
| 创作 | Writespace 浏览器写作（LaTeX 编译 + 导出 tar.gz + 一键发布，能力门控） |
| 工程 | 双存储后端（local/s3）、能力检测、完整中英 i18n、代码优先 OpenAPI + Scalar、CI、Docker、测试 53+13 |

### 1.2 明确的技术债与缺口

- **语义检索 / 向量嵌入 / RAG：完全没有**（代码库中无 embedding / vector / rag 字样）。
- **外部元数据自动导入：完全没有**（无 arXiv / Crossref / DOI / OpenCitations / Semantic Scholar 接入）。引用靠手工填或 PDF 正则。
- **DOI 注册 / ORCID 深度集成：仅字段**。ORCID 只是用户资料的一个输入框，DOI 由用户手填，未真正注册或校验。
- **AI 辅助：无**。无摘要生成、无综述、无语义推荐。
- **论文-代码-数据集关联：无**（无 Papers With Code 式的 repository/dataset 关联与 benchmark）。
- **社交关注流 / Altmetrics：弱**。有订阅机制但偏通知，无"关注作者/用户动态流""影响力动量"等。
- **安全**：GitHub 仍提示 1 个 high 级依赖告警（dependabot/21），未调查处理。
- **内容占位**：`seed.ts` 中多个分类 `description: "Description coming soon"`。
- **升级阻塞**：TS 7、ESLint 10 被上游插件卡死（待 eslint-plugin-react、typescript-eslint 解封）。

---

## 二、行业对标信号（2026）

来源：Semantic Scholar 2026 架构、arXivNext / OpenReview Nexus 改版、Papers With Code、AI 论文平台评测（检索于 2026-08-17）。

- **语义/向量检索已成主流**：传统 Boolean 检索被"混合检索"（关键词 + 概念 + 公式嵌入）补充，实测准确率提升约 47%；跨语言语义检索（中文问→英文答）已落地。
- **多模态发现**：代码仓库、数据集、视频摘要、图表搜索被纳入索引（Semantic Scholar、Papers With Code）。
- **AI 综述 + RAG + 溯源**：Semantic Scholar 提供 RAG API；分层 TLDR 摘要；每条 AI 结论带"置信度 + 溯源地图"，强制可验证。
- **开放评审透明化**：OpenReview 公开评审意见、动态版本修订、ORCID 导入出版物、LLM 辅助评审（NeurIPS/AAAI/ICLR 已用）。
- **论文-代码-数据集强关联**：Papers With Code 的 benchmark 排行榜与复现验证成为工程化标配。
- **影响力动量 / 引用速度**：用"高度影响力引用""采用动量"替代滞后的累计引用量。
- **跨平台互认与去重**：平台间通过 API 共享论文身份与引用网络，强制维护 S2/arXiv/DOI 映射表去重。

> 结论：Papex 的"功能完整度"已接近商用平台，但"检索智能"和"数据富度"还停留在 2023 年水平。下一步应优先补这两条。

---

## 三、下一步方向（按优先级）

每条含：是什么 / 为什么 / 落地要点 / 工作量 / 风险。工作量：S<3天，M≈1-2周，L≈1月+。

### P0 — 差异化核心（填补最大空白）

#### P0-A 语义检索 + 向量嵌入层 ✅ 已落地（2026-08-17）
- **是什么**：PostgreSQL 加 `pgvector`，对 title+abstract(+正文) 生成 multilingual embedding；检索改为"tsvector 关键词 + 向量 ANN + 重排"的混合检索。
- **为什么**：这是项目最大的"代差"。中文混合检索可直接受益于跨语言 embedding；也为后续 AI 层（P1-C）打底。
- **落地要点**：
  - embedding 后端可插拔：本地 ONNX 模型（bge-m3 / multilingual-e5）或 OpenAI-compatible endpoint，并用 `capabilities` 门控（沿用 latex 模式）。
  - 迁移 `0009` 加 `paper_versions.embedding vector(1024)` + HNSW 索引；提供一次性 backfill 脚本。
  - `listPapers` 增加 `semantic` 模式；前端检索框加"语义/关键词"切换；结果可标注相似度。
- **工作量**：M
- **风险**：Vercel Postgres 已支持 pgvector；本地模型体积与冷启动；HNSW 建索引期锁表（用半同步或分批）。

#### P0-B 外部元数据自动导入 + 引用补全 ✅ 已落地（2026-08-17）
- **是什么**：按 DOI / arXiv ID 一键导入元数据 + PDF（Crossref / arXiv / Semantic Scholar API）；并自动补全 `citations`（OpenCitations / Semantic Scholar），真正填满引用图谱。
- **为什么**：引用图谱稀疏是**当前最大的数据短板**，根源是手工录入。自动补全后，共引、合作网络、文献计量才有意义。
- **落地要点**：
  - `services/import.ts` + `POST /api/papers/import`；尊重速率限制与版权（仅元数据 + 链接，PDF 需授权）。
  - 维护 `external_ids` 映射表（S2 / arXiv / DOI）做跨源去重。
  - 支持后台任务或同步小批量；CLI 批量灌入 seed 数据。
- **工作量**：M–L
- **风险**：外部 API 限流与字段覆盖不均；需处理 48 小时索引滞后；PDF 版权。

### P1 — AI 增强 + 生态连接

#### P1-C AI 辅助层（可插拔 LLM）
- **是什么**：论文 TLDR / 分层摘要、站内语料 RAG 综述生成、"相关论文"语义推荐；LLM 后端可插拔（OpenAI / 兼容 / 本地）。
- **为什么**：2026 用户期待 AI 综述 + 溯源；但必须"可关、可本地"，守住开源自托管定位。
- **落地要点**：`lib/ai/` 抽象 + `capabilities` 门控；**每条结论强制带引用溯源（Provenance）+ 置信度**，杜绝幻觉；RAG over P0-A 的站内向量。
- **工作量**：M（依赖 P0-A）
- **风险**：幻觉 → 强制溯源；成本/延迟；本地模型质量。

#### P1-D 论文-代码-数据集关联（Papers With Code 风格）
- **是什么**：新增 `repositories` / `datasets` 表；论文页展示 GitHub / 数据集链接 + 轻量 benchmark 占位。
- **为什么**：代码/数据关联是 2026 主流，直接提升可复现与实用价值。
- **落地要点**：先做"链接关联"（作者填 URL + 自动识别），**暂不做排行榜**（维护成本极高）。
- **工作量**：S–M
- **风险**：benchmark 数据维护 → 先只做关联不做排名。

#### P1-E 开放评审透明化增强
- **是什么**：在现有 co-review 基础上支持评审意见公开、版本修订对比、ORCID 导入出版物。
- **为什么**：OpenReview 范式的透明评审是学术趋势；Papex 已有 co-review 闭环，基础好。
- **落地要点**：评审可见性开关；版本 diff 视图；ORCID API 拉取作者已发表作品。
- **工作量**：M
- **风险**：公开评审的隐私与争议治理。

### P2 — 成熟度 / 治理 / 技术债

- **P2-F 安全与依赖治理**：处理 GitHub high 级告警；持续跟踪 TS7 / ESLint10 解封；CI 加依赖审计。
- **P2-G 性能与可扩展性验证**：大规模数据下检索/分页/缓存基准；pgvector 索引调优；CDN/缓存策略。
- **P2-H 质量与测试加固**：为 tag / bookmark-group / citation-analytics / bibliometrics / co-review 补 e2e；明确覆盖率目标。
- **P2-I 内容与文档完善**：seed 分类描述补全；`about.md` 与 `README` 功能清单对齐；新增 CONTRIBUTING；部署公开演示实例。
- **P2-J 分发与社区**：PWA / 移动端基础、演示站点、badges、规范 release 流程。

---

## 四、推荐优先级与分阶段路线图

**顺序判断**：P0-B（先有数据）应略优先于 P0-A（检索），但两者可并行启动——没有数据，语义检索也无米下锅。P1-C 强依赖 P0-A 的向量层，故放 Phase 2。

- **Phase 1 · 数据底座（1–2 月）**：P0-B 外部导入 → P0-A 语义检索（混合检索上线）。
- **Phase 2 · 智能化（1–2 月）**：P1-C AI 层 → P1-D 代码/数据关联 → P1-E 开放评审增强。
- **Phase 3 · 成熟度（持续）**：P2 全部（安全 / 性能 / 测试 / 文档 / 分发）。

---

## 五、立即可做的小项（技术债，半天～1 天）

1. 处理 GitHub 1 个 high 级依赖告警（dependabot/21）。
2. 补全 `seed.ts` 中 "Description coming soon" 的分类描述。
3. 提交 README / docs 的 whatsnew GIF 收尾改动（工作树当前未提交）。
4. 对齐 `about.md` 与 `README` 的功能清单（about 仍列旧 9 项）。

---

## 六、风险与开放问题

- **定位取舍**：Papex 是"通用学术基础设施"还是"某细分领域（如 CS）平台"？这决定外部导入优先接哪些源（arXiv 偏 CS，Crossref 全覆盖）。
- **自托管约束**：语义检索/AI 层必须可关、可本地，否则违背开源自托管卖点。
- **版权红线**：PDF 与全文抓取受版权限制，导入层只动元数据 + 链接，PDF 走授权路径。
- **范围控制**：P1-D 的 benchmark 排行榜、P1-C 的"可执行综述"等是深坑，建议本期只做最小可用版本，留待后续。
