import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listPapers } from "@/lib/services/papers";
import { getCategoryTree } from "@/lib/services/categories";
import { SearchBar } from "@/components/search-bar";
import { PaperCard } from "@/components/paper-card";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getDictionary, t as translate } from "@/i18n";

export const revalidate = 300;

export default async function HomePage() {
  // Static rendering: render the default locale on the server; the client
  // I18nProvider corrects to the user's locale cookie after hydration.
  const dict = getDictionary("zh");
  const t = (path: string) => translate(dict, path);
  const [{ rows }, tree] = await Promise.all([
    listPapers({ pageSize: 8, page: 1 }),
    getCategoryTree(),
  ]);
  const topCats = tree.slice(0, 8);

  return (
    <div className="space-y-12">
      <section className="rounded-2xl border bg-gradient-to-b from-muted to-background px-6 py-12 text-center md:px-12 md:py-20">
        <span className="inline-block rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
          {t("common.tagline")}
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
          {t("home.heroTitle")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
          {t("home.heroSubtitle")}
        </p>
        <div className="mx-auto mt-8 max-w-xl">
          <SearchBar />
        </div>
        <div className="mt-6">
          <Button asChild size="lg" className="bg-cta text-cta-foreground hover:bg-cta/90">
            <Link href="/submit">
              {t("home.submitCta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">{t("home.latestTitle")}</h2>
          <Link href="/papers" className="text-sm text-primary hover:underline">
            {t("common.viewAll")}
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((item) => (
            <PaperCard key={item.paper.id} item={item} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-5 text-2xl font-semibold tracking-tight">{t("home.categoriesTitle")}</h2>
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
