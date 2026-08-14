import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { listPapers } from "@/lib/services/papers";
import { listCategories } from "@/lib/services/categories";
import { PaperCard } from "@/components/paper-card";
import { PapersFilter } from "@/components/papers-filter";
import { Button } from "@/components/ui/button";
import { getServerLocale } from "@/i18n/server";
import { getDictionary, t as translate, format } from "@/i18n";

export const dynamic = "force-dynamic";

type SP = { [k: string]: string | string[] | undefined };

export default async function PapersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const locale = await getServerLocale();
  const dict = getDictionary(locale);
  const t = (path: string) => translate(dict, path);
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const category = typeof sp.category === "string" ? sp.category : undefined;
  const sort = typeof sp.sort === "string" && sp.sort === "updated" ? "updated" : "new";
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : "1") || 1);
  const pageSize = 12;

  const [{ rows, total }, cats] = await Promise.all([
    listPapers({ q, category, sort, page, pageSize }),
    listCategories(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const catOptions = cats.map((c) => ({ id: c.id, name: c.name }));

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (sort !== "new") params.set("sort", sort);
    params.set("page", String(p));
    return `/papers?${params.toString()}`;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("papers.title")}</h1>
        <span className="text-sm text-muted-foreground">{format(t("papers.results"), { n: total })}</span>
      </div>

      <PapersFilter
        categories={catOptions}
        initialQ={q}
        initialCategory={category}
        initialSort={sort}
      />

      {rows.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">{t("papers.empty")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((item) => (
            <PaperCard key={item.paper.id} item={item} />
          ))}
        </div>
      )}

      <div className="mt-8 flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
          {page > 1 ? (
            <Link href={pageHref(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
              {t("papers.prevPage")}
            </Link>
          ) : (
            <span>
              <ChevronLeft className="h-4 w-4" />
              {t("papers.prevPage")}
            </span>
          )}
        </Button>
        <span className="text-sm text-muted-foreground">
          {page} / {totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} asChild={page < totalPages}>
          {page < totalPages ? (
            <Link href={pageHref(page + 1)}>
              {t("papers.nextPage")}
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span>
              {t("papers.nextPage")}
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
