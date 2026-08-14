import Link from "next/link";
import { ChevronLeft, ChevronRight, Network } from "lucide-react";
import { listPapers, listPapersByYear } from "@/lib/services/papers";
import { listCategories } from "@/lib/services/categories";
import { listTagCoOccurrence } from "@/lib/services/tags";
import { PaperCard } from "@/components/paper-card";
import { PapersFilter } from "@/components/papers-filter";
import { TagCooccurrenceGraph } from "@/components/tag-cooccurrence-graph";
import { PublicationTrend } from "@/components/publication-trend";
import { Card, CardContent } from "@/components/ui/card";
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
  const tag = typeof sp.tag === "string" ? sp.tag : undefined;
  const sort =
    typeof sp.sort === "string" && ["updated", "by_citations"].includes(sp.sort)
      ? (sp.sort as "updated" | "by_citations")
      : "new";
  const from = typeof sp.from === "string" ? sp.from : undefined;
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : "1") || 1);
  const pageSize = 12;

  const [{ rows, total }, cats, coOccurrence, byYear] = await Promise.all([
    listPapers({ q, category, tag, sort, from, page, pageSize }),
    listCategories(),
    listTagCoOccurrence(30).catch(() => ({ nodes: [], links: [] })),
    listPapersByYear().catch(() => []),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const catOptions = cats.map((c) => ({ id: c.id, name: c.name }));
  // Reconstruct the field select state from the query prefix for the filter bar.
  const fieldFromQuery =
    q && q.includes(":")
      ? q.startsWith("au:")
        ? "fieldAuthor"
        : q.startsWith("abs:")
          ? "fieldAbstract"
          : q.startsWith("title:")
            ? "fieldTitle"
            : q.startsWith("cat:")
              ? "fieldCategory"
              : "fieldAll"
      : "fieldAll";
  const initialTime = "timeAll";

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (tag) params.set("tag", tag);
    if (sort !== "new") params.set("sort", sort);
    if (from) params.set("from", from);
    params.set("page", String(p));
    return `/papers?${params.toString()}`;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("papers.title")}</h1>
        <span className="text-sm text-muted-foreground">{format(t("papers.results"), { n: total })}</span>
      </div>

      {tag && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t("tags.title")}:</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-0.5">
            {tag}
            <Link href="/papers" className="text-muted-foreground hover:text-foreground" aria-label="clear tag">
              ×
            </Link>
          </span>
        </div>
      )}

      <PapersFilter
        categories={catOptions}
        initialQ={q}
        initialCategory={category}
        initialSort={sort}
        initialField={fieldFromQuery}
        initialTime={initialTime}
      />

      {!q && !category && !tag && (coOccurrence.nodes.length > 1 || byYear.length > 0) && (
        <details className="group mb-6" open>
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <Network className="h-4 w-4" />
            {t("papers.tagNetworkTitle")}
            <span className="ml-auto text-xs text-muted-foreground group-open:hidden">
              {t("common.expand")}
            </span>
          </summary>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {coOccurrence.nodes.length > 1 && (
              <Card>
                <CardContent className="p-4">
                  <TagCooccurrenceGraph data={coOccurrence} />
                </CardContent>
              </Card>
            )}
            {byYear.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <p className="mb-1 text-center text-xs text-muted-foreground">
                    {t("papers.publicationTrend")}
                  </p>
                  <PublicationTrend data={byYear} />
                </CardContent>
              </Card>
            )}
          </div>
        </details>
      )}

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
