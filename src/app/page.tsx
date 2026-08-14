import Link from "next/link";
import { ArrowRight, PenLine } from "lucide-react";
import { listPapers } from "@/lib/services/papers";
import { getCategoryTree } from "@/lib/services/categories";
import { SearchBar } from "@/components/search-bar";
import { PaperCard } from "@/components/paper-card";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { LocaleText } from "@/components/locale-text";

export const revalidate = 300;

export default async function HomePage() {
  // Static rendering: UI copy is rendered with the default locale on the
  // server and corrected to the user's locale cookie after hydration via the
  // client <LocaleText /> nodes (SSG cannot read cookies).
  // 无 DB（如构建环境缺 DATABASE_URL）时回退空数据，保证预渲染不硬失败；
  // 运行时带 DB 时由 revalidate=300 自动刷新出真实内容。
  let rows: Awaited<ReturnType<typeof listPapers>>["rows"] = [];
  let tree: Awaited<ReturnType<typeof getCategoryTree>> = [];
  try {
    const [papers, catTree] = await Promise.all([
      listPapers({ pageSize: 8, page: 1 }),
      getCategoryTree(),
    ]);
    rows = papers.rows;
    tree = catTree;
  } catch {
    // 忽略：DB 不可达，使用上方空默认值
  }
  const topCats = tree.slice(0, 8);

  return (
    <div className="space-y-12">
      <section className="rounded-2xl border bg-gradient-to-b from-muted to-background px-6 py-12 text-center md:px-12 md:py-20">
        <span className="inline-block rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
          <LocaleText path="common.tagline" />
        </span>
        <LocaleText path="home.heroTitle" as="h1" className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight md:text-5xl" />
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
          <LocaleText path="home.heroSubtitle" />
        </p>
        <div className="mx-auto mt-8 max-w-xl">
          <SearchBar />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="bg-cta text-cta-foreground hover:bg-cta/90">
            <Link href="/submit">
              <LocaleText path="home.submitCta" />
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/writespace">
              <PenLine className="h-4 w-4" />
              <LocaleText path="nav.writespace" />
            </Link>
          </Button>
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-center justify-between">
          <LocaleText path="home.latestTitle" as="h2" className="text-2xl font-semibold tracking-tight" />
          <Link href="/papers" className="text-sm text-primary hover:underline">
            <LocaleText path="common.viewAll" />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((item) => (
            <PaperCard key={item.paper.id} item={item} />
          ))}
        </div>
      </section>

      <section>
        <LocaleText path="home.categoriesTitle" as="h2" className="mb-5 text-2xl font-semibold tracking-tight" />
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {topCats.map((c) => (
            <Link key={c.id} href={`/categories/${c.id}`}>
              <Card className="transition-colors hover:border-primary">
                <CardHeader className="p-4">
                  <CardTitle className="text-sm">
                    <span className="font-mono text-xs text-muted-foreground">{c.id}</span> {c.name}
                  </CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
