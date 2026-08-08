import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { PaperListItem } from "@/lib/services/papers";

export function PaperCard({ item }: { item: PaperListItem }) {
  const authors = (item.version.authorsJson as { name: string }[] | null) ?? [];
  const names = authors.map((a) => a.name);
  const shown = names.slice(0, 4).join(", ") + (names.length > 4 ? " 等" : "");

  return (
    <Card className="flex flex-col transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{item.category.id}</Badge>
          <span className="font-mono">{item.paper.id}</span>
          <span>v{item.version.version}</span>
        </div>
        <CardTitle className="text-base leading-snug">
          <Link href={`/papers/${item.paper.id}`} className="hover:underline">
            {item.version.title}
          </Link>
        </CardTitle>
        <CardDescription className="line-clamp-1">{shown || "匿名"}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <p className="line-clamp-3 text-sm text-muted-foreground">{item.version.abstract}</p>
        <div className="mt-3 text-xs text-muted-foreground">
          提交于 {formatDate(item.paper.createdAt)}
        </div>
      </CardContent>
    </Card>
  );
}
