import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPaperDetail, getPaperVersion } from "@/lib/services/papers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
}

export default async function PaperVersionPage({
  params,
}: {
  params: Promise<{ id: string; version: string }>;
}) {
  const { id, version } = await params;
  const detail = await getPaperDetail(id);
  if (!detail) notFound();
  const ver = await getPaperVersion(id, Number(version));
  if (!ver) notFound();

  const authors = (ver.authorsJson as { name: string }[] | null) ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href={`/papers/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="h-4 w-4" />
        返回最新版本
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{detail.primaryCategory.id}</Badge>
        <span className="font-mono text-sm text-muted-foreground">{id}</span>
        <Badge variant="outline">v{ver.version}</Badge>
      </div>
      <h1 className="text-2xl font-bold">{ver.title}</h1>
      <p className="text-sm text-muted-foreground">{authors.map((a) => a.name).join(", ")}</p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">摘要（v{ver.version}）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{ver.abstract}</p>
          <div className="text-sm text-muted-foreground">
            该版本发布于 {formatDate(ver.createdAt)}
            {ver.comments && ` · ${ver.comments}`}
            {ver.withdrawalReason && ` · 撤稿：${ver.withdrawalReason}`}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
