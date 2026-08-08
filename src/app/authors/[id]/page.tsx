import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAuthor } from "@/lib/services/authors";
import { listPapers } from "@/lib/services/papers";
import { PaperCard } from "@/components/paper-card";
import { SubscribeButton } from "@/components/subscribe-button";
import { Card, CardContent } from "@/components/ui/card";

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

  const { rows } = await listPapers({ authorId, pageSize: 20 });

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

      <h2 className="mb-4 text-lg font-semibold">论文</h2>
      {rows.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">暂无论文。</p>
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
