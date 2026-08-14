import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAuthor, getAuthorMetrics } from "@/lib/services/authors";
import { listPapers } from "@/lib/services/papers";
import { PaperCard } from "@/components/paper-card";
import { SubscribeButton } from "@/components/subscribe-button";
import { CoauthorGraph } from "@/components/coauthor-graph";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Quote, Hash } from "lucide-react";
import { LocaleText } from "@/components/locale-text";
import { getServerLocale } from "@/i18n/server";
import { getDictionary, t as translate } from "@/i18n";

export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const authorId = Number(id);
  if (Number.isNaN(authorId)) return {};
  const row = await getAuthor(authorId);
  if (!row) return {};
  return {
    title: row.author.name,
    description: `查看 ${row.author.name} 发表的论文`,
  };
}

export default async function AuthorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorId = Number(id);
  if (Number.isNaN(authorId)) notFound();
  const row = await getAuthor(authorId);
  if (!row) notFound();

  const [{ rows }, metrics] = await Promise.all([
    listPapers({ authorId, pageSize: 20 }),
    getAuthorMetrics(authorId).catch(() => ({
      totalPapers: 0,
      totalCitations: 0,
      hIndex: 0,
      coAuthors: [],
    })),
  ]);

  const locale = await getServerLocale();
  const dict = getDictionary(locale);
  const t = (path: string) => translate(dict, path);

  return (
    <div className="mx-auto max-w-5xl">
      <Card className="mb-6">
        <CardContent className="flex items-start justify-between gap-4 pt-6">
          <div>
            <h1 className="text-2xl font-bold">{row.author.name}</h1>
            {row.author.orcid && (
              <p className="mt-1 text-sm text-muted-foreground">ORCID: {row.author.orcid}</p>
            )}
            {row.affiliation && (
              <p className="mt-1 text-sm text-muted-foreground">{row.affiliation.name}</p>
            )}
          </div>
          <SubscribeButton type="author" refId={String(authorId)} />
        </CardContent>
      </Card>

      {(metrics.totalPapers > 0 || metrics.hIndex > 0) && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{t("authors.metrics")}</h2>
            <div className="flex flex-wrap gap-3">
              <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
                <BookOpen className="h-4 w-4" />
                {metrics.totalPapers} {t("authors.totalPapers")}
              </Badge>
              <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
                <Quote className="h-4 w-4" />
                {metrics.totalCitations} {t("authors.totalCitations")}
              </Badge>
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm">
                <Hash className="h-4 w-4 text-primary" />
                {t("authors.hIndex")} <span className="font-semibold">{metrics.hIndex}</span>
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {metrics.coAuthors.length > 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{t("authors.coauthors")}</h2>
            <CoauthorGraph
              authorId={authorId}
              authorName={row.author.name}
              coAuthors={metrics.coAuthors}
            />
          </CardContent>
        </Card>
      )}

      <h2 className="mb-4 text-lg font-semibold">
        <LocaleText path="papers.title" />
      </h2>
      {rows.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          <LocaleText path="authors.emptyPapers" />
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((item) => (
            <PaperCard key={item.paper.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
