# Papex：SSR 与 SSG 结合优化研究报告

> 目标：在不改写业务逻辑的前提下，把"公开、可缓存"的页面从纯 SSR 改成 SSG/ISR，  
> 把"个性化/鉴权"页面保留 SSR，从而在构建期/缓存层消灭大量重复的数据库查询，  
> 降低 TTFB、提升 SEO、减轻数据库压力。
>
> 调研日期：2026-08-08 ｜ 适用版本：Next.js 15.5 App Router + React 19

---

## 一、现状诊断（结论先行）

**当前整个应用 100% 是 SSR，不存在 SSG/ISR。**

证据（基于全仓扫描）：

| 现象                                              | 数量 / 位置  | 说明                      |
| ----------------------------------------------- | -------- | ----------------------- |
| 标记 `export const dynamic = "force-dynamic"` 的文件 | **33 个** | 13 个页面 + 20 个 API route |
| 使用 `export const revalidate =`                  | **0**    | 没有任何时间驱动的再生成            |
| 使用 `generateStaticParams`                       | **0**    | 没有任何构建期预渲染              |
| 使用 `fetchCache` / `runtime` 配置                  | **0**    | —                       |
| 服务端 fetch 带 `cache`/`next:{revalidate}`         | **0**    | 服务端查询全部默认按请求实时执行        |
| `revalidatePath` / `revalidateTag`              | **0**    | 没有任何按需失效逻辑              |

### 根因（最关键）

`src/app/layout.tsx:34-36` 在**根布局**里每请求调用两个会读 `cookies()` 的函数：

```ts
const user = await getCurrentUser();      // → session.ts:69 cookies()
const locale = await getServerLocale();   // → i18n/server.ts:12 cookies()
```

在 Next.js App Router 中，`cookies()` / `headers()` / `searchParams` 是"动态 API"，  
**只要被调用，所在路由段及其所有子段都会被强制动态渲染**。根布局被污染，等于整站被污染——  
哪怕某个子页面想静态，也会被根布局强制拉回动态。

这才是"为什么 33 个 force-dynamic 都没法去掉"的真正原因：即使去掉子页面的  
`force-dynamic`，根布局的 cookie 读取仍会让它们全部回退到动态。

**因此，解锁 SSG/ISR 的唯一前提，是把 cookie 读取从根布局里移出去。**

---

## 二、为什么根布局读 cookie 会"传染"全站

Next.js 的渲染决策是自顶向下传播的：

```
RootLayout (读 cookies → 动态)
  ├─ /papers/[id]      → 被父布局传染，强制动态（即便自己想静态）
  ├─ /categories       → 同上
  └─ /me               → 动态（本就需要）
```

- 动态 API（`cookies()`、`headers()`、`searchParams`）一旦出现在某段，该段标记为非静态。
- **子段无法比父段更"静态"**。父布局动态 ⇒ 子页面无法静态。
- 反过来，父布局静态 + 子页面用 `force-dynamic` 是允许的（个性化的页面自己保持动态）。

所以改造顺序是：**先让根布局变静态 ⇒ 子页面才有资格选择 ISR/SSG。**

---

## 三、目标架构：三类路由

把页面按"是否需要按请求个性化"分成三类，分别采用不同策略。

### 类别 A — 公开、可缓存 → 改为 SSG / ISR（主要优化对象）

| 路由                       | 当前            | 建议                               | TTL 建议              | 备注                         |
| ------------------------ | ------------- | -------------------------------- | ------------------- | -------------------------- |
| `/` 首页                   | force-dynamic | **ISR**                          | `revalidate = 300`  | 含"最新论文"，时效性强，短 TTL         |
| `/categories` 分类树        | force-dynamic | **SSG**                          | `revalidate = 3600` | 数据极稳定                      |
| `/categories/[slug]`     | force-dynamic | **SSG + `generateStaticParams`** | `revalidate = 3600` | 全 166 个分类可构建期预渲染           |
| `/papers/[id]`           | force-dynamic | **ISR**                          | `revalidate = 3600` | 论文详情是 SEO 核心，必须静态          |
| `/papers/[id]/[version]` | force-dynamic | **ISR**                          | `revalidate = 3600` | 版本内容稳定                     |
| `/authors/[id]`          | force-dynamic | **ISR**                          | `revalidate = 3600` | 作者页                        |
| `/u/[username]`          | force-dynamic | **ISR**                          | `revalidate = 3600` | 用户主页                       |
| `/papers` 列表             | force-dynamic | **ISR 或保留**（见下）                  | `revalidate = 600`  | 若依赖 `searchParams` 过滤则保留动态 |

> 说明：`/papers` 列表若用 `searchParams` 做服务端过滤，本身是动态的；  
> 当前筛选是客户端 Zustand（`listPapers` 默认取第一页），可改 ISR 基础列表 + 客户端过滤。  
> 这一项优先级可放低，先搞定上面 7 个确定性页面。

### 类别 B — 个性化 / 鉴权 → 保持 SSR（不动）

| 路由                                   | 原因           |
| ------------------------------------ | ------------ |
| `/me`                                | 读当前用户，中间件保护  |
| `/submit`                            | 需登录，提交表单     |
| `/admin/*`（stats / review / tickets） | 中间件按 role 保护 |
| `/papers/[id]/edit`                  | 中间件保护 + 编辑态  |

这些页面的 `force-dynamic` **保留**，是正确的。

### 类别 C — 客户端壳（已是静态壳 + 运行时取数，无需改）

`/messages`、`/tickets`、`/tickets/[id]`、`/feedback`、`/status`、`/login`、`/register`  
都是 `"use client"`，服务端只渲染空壳，数据靠客户端 `fetch` 在运行时拿。  
它们本来就不会产生服务端 DB 查询压力，保持现状即可。

---

## 四、关键改造步骤（含代码模式）

### 步骤 1：根布局解耦 cookie —— 解锁全站静态化的前提（最重要）

**1.1 改造 `src/app/layout.tsx`**

把 `getCurrentUser()` 和 `getServerLocale()` 从布局移除，布局只渲染静态结构：

```tsx
// src/app/layout.tsx（改造后）
import "./globals.css";
import type { Metadata } from "next";
import { Poppins, Open_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";   // 不再传 user
import { SiteFooter } from "@/components/site-footer";
import { I18nProvider } from "@/i18n/i18n-provider";

// 布局本身不再读 cookie → 可以静态；子页面各自决定 dynamic
export const dynamic = "force-static"; // 可选：显式声明，便于排查

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={`${poppins.variable} ${openSans.variable}`}>
      <body className="flex min-h-screen flex-col font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <I18nProvider>                      {/* 客户端自行读 locale cookie */}
            <SiteHeader />                    {/* 客户端自行 fetch /api/auth/me */}
            <main className="container flex-1 py-8">{children}</main>
            <SiteFooter />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

要点：

- 删掉 `getCurrentUser` / `getServerLocale` 两个 import 与调用。
- `<html lang>` 先写默认 `zh-CN`，由客户端 `I18nProvider` 在挂载后按 cookie 校正（与现有 `next-themes` 的客户端校正模式一致）。

**1.2 `SiteHeader` 改为自己取登录态（复用已有端点）**

好消息：**`/api/auth/me` 已经存在**（`src/app/api/auth/me/route.ts`），而且  
`/tickets/[id]/page.tsx:66-67` 已经在用 `fetch('/api/auth/me', { cache: 'no-store' })`  
获取登录态——说明"客户端取 session"在你们代码库里是既有实践，方案完全可行。

把 `SiteHeader` 从"接收 `user` prop"改成"内部 fetch"：

```tsx
// src/components/site-header.tsx（改造后，删掉 user prop，加客户端拉取）
"use client";
import * as React from "react";
import type { HeaderUser } from "./site-header-types"; // 把 HeaderUser 类型抽到共享处

export function SiteHeader() {
  const [user, setUser] = React.useState<HeaderUser | null>(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.user) setUser(d.user); })
      .catch(() => {})
      .finally(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, []);

  // ... 其余 UI 不变，用 user 控制登录/未登录分支
}
```

- 加载完成前可渲染"未登录"态（或骨架），加载后切换到登录态。这是主流站点的标准做法，  
  代价仅是已登录用户刷新时有极短的菜单闪烁（毫秒级）。
- `HeaderUser` 类型目前定义在 `site-header.tsx` 内（`HeaderUser` 接口），  
  若别的文件引用，抽成独立类型文件即可（搜一下确认引用面）。

**1.3 locale 客户端化**

`I18nProvider` 改为在客户端读 `papex_locale` cookie 决定字典；`getDictionary` 已在客户端安全  
（按记忆 `src/i18n/index.ts` 已禁止 import `next/headers`）。服务端渲染默认 zh，  
客户端挂载后按 cookie 切换。en 用户会有一次字典文本闪烁，可接受。

> **权衡**：若不能接受 locale 闪烁，更彻底的方案是把 i18n 改成**路由段前缀**  
> （`/[locale]/...`），在 `generateStaticParams` 里同时枚举 locale 与页面，实现真正的  
> 多语言静态化。这是更大的重构，可作为二期，本报告不展开。

---

### 步骤 2：公开页转 ISR（去掉 `force-dynamic`，加 `revalidate`）

以 `/categories/[slug]`（最适合 SSG）和 `/papers/[id]`（最适合 ISR）为例：

**`/categories/[slug]/page.tsx` —— 全量 SSG**

```tsx
export const revalidate = 3600;                 // 每小时最多重算一次
export const dynamic = "force-static";          // 显式静态（可选）

export async function generateStaticParams() {
  const cats = await getAllCategorySlugs();      // 新增一个小查询：返回所有 {slug}
  return cats;                                    // 构建期把 166 个分类全部预渲染
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = await getCategory(slug);
  if (!cat) notFound();
  const { rows, total } = await listPapers({ category: slug, pageSize: 20 });
  // ... 渲染（不再需要 user/isOwner）
}
```

**`/papers/[id]/page.tsx` —— ISR（按需预渲染 + 定时再生）**

```tsx
export const revalidate = 3600;

export default async function PaperPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPaperDetail(id);
  if (!detail) notFound();
  const graph = await listCitations(id);

  // isOwner / canEdit 这类鉴权 UI 不放在服务端：交给客户端 <SessionGate>
  return (
    <PaperView
      detail={detail}
      version={detail.latest}
      citations={graph}
      sessionGate={<PaperActionsGate paperId={id} createdById={detail.paper.createdById} />}
    />
  );
}
```

- 删除服务端 `getCurrentUser()` 调用；`isOwner`/`canEditCitations` 由客户端  
  `PaperActionsGate` 在挂载后 `fetch('/api/auth/me')` 计算，未登录则只显示公开按钮。
- 论文数量太大，不适合 `generateStaticParams` 全量预渲染，用 ISR：首次访问时渲染并缓存，  
  之后 1 小时内直接命中缓存。`dynamicParams` 默认 `true`，新论文首次访问即生成，无需构建期枚举。

> 同理处理：`/`（revalidate=300）、`/papers/[id]/[version]`、`/authors/[id]`、`/u/[username]`。

---

### 步骤 3：写失效（revalidation）—— 让 ISR 内容保持新鲜

目前全仓 **没有任何 `revalidatePath` / `revalidateTag`**。改为 ISR 后，必须在"内容变更点"  
主动失效，否则缓存会一直返回旧页面。

在两个层面加：

**(a) 基于路径（简单直接）**——在以下 mutation 完成后调用：

- 投稿创建：API `POST /api/papers` → `revalidatePath('/')`、`revalidatePath('/papers')`
- 论文编辑：API `PATCH /api/papers/[id]` / edit 页 → `revalidatePath('/papers/[id]')`
- 引用增删：citations route → `revalidatePath('/papers/[id]')`
- 审核/弃权 moderate → `revalidatePath('/papers/[id]')`

**(b) 基于标签（更优雅，推荐）**——给查询打 tag，一次失效一类：

```ts
// 在数据层给查询加 tag（示意）
import { unstable_cache } from "next/cache";
export const getPaperDetail = unstable_cache(
  async (id: string) => db.query...,
  ["paper-detail"],
  { tags: ["paper", `paper:${id}`], revalidate: 3600 }
);
// 变更时：
import { revalidateTag } from "next/cache";
await revalidateTag(`paper:${id}`);   // 只失效这一篇
// 或 revalidateTag("paper") 失效全部
```



> 注意：`unstable_cache` 与服务端组件里的 DB 查询配合良好；若查询函数被多个页面复用，  
> 打 tag 比逐页 `revalidatePath` 更好维护。

---

### 步骤 4：补 `generateMetadata`（顺手提升 SEO）

当前**只有根 layout 有 `metadata`**，所有页面没有 `generateMetadata`。公开页转静态后，  
正好补上每页的标题/描述/OG：

```tsx
// /papers/[id]/page.tsx
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPaperDetail(id);
  if (!detail) return {};
  return {
    title: detail.paper.title,
    description: detail.latest.abstract?.slice(0, 160),
    openGraph: { title: detail.paper.title, type: "article" },
  };
}
```

---

## 五、收益预估

| 指标                | 现状                    | 改造后                       |
| ----------------- | --------------------- | ------------------------- |
| 首页/分类/论文详情的 DB 查询 | 每次请求都查                | TTL 内 0 次（直接读缓存）          |
| TTFB（公开页）         | 受 DB 延迟拖累             | 接近 CDN 命中，显著下降            |
| SEO               | 仅首页有 metadata，详情页无 OG | 每篇论文有独立标题/OG，利于收录         |
| 构建产物              | 全部运行时渲染               | 分类等可构建期预渲染，冷启动即命中         |
| 数据库压力             | 与公开页流量 1:1            | 公开页流量被缓存吸收，DB 只服务写操作与个性化页 |

> 量化数字取决于流量与 TTL，建议在 Vercel/Neon 上用 `next build` 后的  
> "○ (Static)" / "● (SSG)" / "λ (Server)" 标记和 Analytics 验证。

---

## 六、风险与取舍

1. **locale 闪烁**：en 用户在 SSR 阶段看到 zh，挂载后切换。可接受；如需彻底解决改路由前缀（二期）。
2. **登录态闪烁**：已登录用户刷新时，header 菜单有极短"未登录→登录"切换。主流站点通用做法。
3. **动态内容的时效性**：首页"最新论文"用 `revalidate=300`，最坏 5 分钟延迟；可按业务调小。
4. **中间件与静态化不冲突**：middleware 只保护 `/me /submit /admin /papers/[id]/edit`，  
   这些本就保留动态，其余公开页可正常静态化。
5. **`force-static` 与子页面 `force-dynamic` 可共存**：布局静态、个性化子页动态，是合法组合。
6. **回滚安全**：每步独立、可逆；先只改布局 + 一个页面（如 `/categories`）验证构建标记，  
   再逐步铺开，避免一次性大改。

---

## 七、实施优先级建议

| 阶段     | 动作                                                                   | 风险 | 解锁价值                |
| ------ | -------------------------------------------------------------------- | -- | ------------------- |
| **P0** | 根布局解耦 cookie（步骤 1）+ `SiteHeader` 客户端取 session                        | 低  | 解锁全站静态化的前提          |
| **P1** | `/categories` + `/categories/[slug]` 改 SSG（含 `generateStaticParams`） | 低  | 166 个分类构建期预渲染，最稳的甜头 |
| **P2** | `/papers/[id]`、`/[version]`、`/authors/[id]`、`/u/[username]` 改 ISR    | 中  | SEO 核心页缓存化          |
| **P3** | 首页 `/` 改 ISR（短 TTL）                                                  | 低  | 首页提速                |
| **P4** | 接 `revalidatePath`/`revalidateTag`（步骤 3）                             | 中  | 保证 ISR 内容新鲜，否则会返回旧页 |
| **P5** | 补 `generateMetadata`（步骤 4）                                           | 低  | SEO 收尾              |

> 关键顺序：**P4（写失效）必须在 P1–P3 之后、上线之前完成**，否则缓存会一直返回旧内容。  
> 开发期可先不加 TTL（用 `revalidate = 1` 之类短值）观察，确认失效链路通了再调大。

---

## 八、结论

Papex 当前的"全 SSR"是**非故意的**：根布局读 cookie 把整站拖入动态渲染，  
子页面的 `force-dynamic` 只是叠加，而非根因。

**最优解是"分层混合"**：

- 根布局去 cookie → 解锁静态；
- 公开页（分类/论文/作者/用户页/首页）走 SSG/ISR，配合 `revalidateTag` 按需失效；
- 个性化/鉴权页（/me、/submit、/admin、编辑页）保留 SSR；
- 鉴权相关 UI 下沉到客户端 `SessionGate`，复用已有 `/api/auth/me`。

这样能在**不改写任何业务逻辑**的前提下，把公开流量从数据库压力中解放出来，  
同时显著提升 SEO 与首屏速度。

---

### 附：需要你拍板的两个取舍

1. **locale 处理方式**：接受"客户端校正 + 轻微闪烁"（改动小，推荐），  
   还是改造成"路由前缀 `/[locale]/...`"实现真正的多语言静态化（改动大，二期）？
2. **是否要我直接落地 P0+P1**：我可以先实施"根布局解耦 + `/categories` 改 SSG"，  
   跑一次 `next build` 验证出现 `○ (Static)` 标记，再继续后续阶段。

需要我动手实现哪一步，告诉我即可。
