"use client";

import Link from "next/link";
import { FileText, Upload, History, ExternalLink, User as UserIcon, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SubscribeButton } from "@/components/subscribe-button";
import { BookmarkButton } from "@/components/bookmark-button";
import { CommentThread } from "@/components/comment-thread";
import { CitationPanel } from "@/components/citation-panel";
import { formatDate } from "@/lib/utils";
import { useSession } from "@/lib/use-session";
import type { getPaperDetail } from "@/lib/services/papers";
import type { CitationGraph } from "@/lib/services/citations";

type Detail = NonNullable<Awaited<ReturnType<typeof getPaperDetail>>>;

const STATUS_LABEL: Record<string, string> = {
  submitted: "审核中",
  approved: "已发布",
  withdrawn: "已撤稿",
  rejected: "已拒绝",
};

export function PaperView({
  detail,
  version,
  citations,
}: {
  detail: Detail;
  version: Detail["latest"];
  citations?: CitationGraph;
}) {
  // Owner/editor permissions are computed on the client after the session
  // loads, so this view can be rendered statically (the root layout no longer
  // reads cookies). Until loaded, defaults to no owner actions.
  const { user, loaded } = useSession();
  const isOwner = loaded && !!user && user.id === detail.paper.createdById;
  const canEditCitations =
    loaded && !!user && (isOwner || user.role === "moderator" || user.role === "admin");
  const withdrawn = detail.paper.status === "withdrawn";
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/papers" className="text-sm text-muted-foreground hover:underline">
          ← 返回论文列表
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{detail.primaryCategory.id}</Badge>
          <span className="font-mono text-sm text-muted-foreground">{detail.paper.id}</span>
          <Badge variant="outline">v{version.version}</Badge>
          <Badge variant={detail.paper.status === "approved" ? "default" : "secondary"}>
            {STATUS_LABEL[detail.paper.status] ?? detail.paper.status}
          </Badge>
        </div>
        <h1 className="mt-2 text-2xl font-bold leading-tight md:text-3xl">{version.title}</h1>

        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {detail.authors.map((a) => (
            <span key={a.id} className="inline-flex items-center gap-1">
              <UserIcon className="h-3.5 w-3.5" />
              <Link href={`/authors/${a.id}`} className="hover:underline">
                {a.name}
              </Link>
              {a.affiliation?.name && <span className="text-xs">({a.affiliation.name})</span>}
            </span>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">摘要</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{version.abstract}</p>
          {withdrawn && version.withdrawalReason && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              撤稿原因：{version.withdrawalReason}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>提交于 {formatDate(detail.paper.createdAt)}</span>
            {version.license && <span>许可：{version.license}</span>}
            {version.doi && <span>DOI：{version.doi}</span>}
            {version.comments && <span>说明：{version.comments}</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {version.pdfUrl && !withdrawn && (
              <Button asChild size="sm" variant="outline">
                <a href={version.pdfUrl} target="_blank" rel="noreferrer">
                  <FileText className="h-4 w-4" />
                  下载 PDF
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
            <SubscribeButton type="paper" refId={detail.paper.id} />
            <BookmarkButton paperId={detail.paper.id} />
            {isOwner && (
              <Button asChild size="sm">
                <Link href={`/papers/${detail.paper.id}/edit`}>
                  <Upload className="h-4 w-4" />
                  提交新版本
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">分类</h2>
        <div className="flex flex-wrap gap-2">
          {detail.categories.map((c) => (
            <div key={c.id} className="inline-flex items-center gap-2">
              <Badge variant={c.isPrimary ? "default" : "outline"}>
                <Link href={`/categories/${c.id}`} className="hover:underline">
                  {c.id} · {c.name}
                </Link>
              </Badge>
              <SubscribeButton type="category" refId={c.id} />
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <div className="mb-3 flex items-center gap-2">
          <History className="h-4 w-4" />
          <h2 className="font-semibold">版本历史</h2>
        </div>
        <ul className="space-y-1 text-sm">
          {detail.paper.latestVersion >= 1 &&
            Array.from({ length: detail.paper.latestVersion }, (_, i) => i + 1).map((ver) => (
              <li key={ver}>
                <Link
                  href={`/papers/${detail.paper.id}/${ver}`}
                  className="text-muted-foreground hover:underline"
                >
                  v{ver}
                  {ver === detail.paper.latestVersion ? "（当前）" : ""}
                </Link>
              </li>
            ))}
        </ul>
      </div>

      <Separator />

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          <h2 className="font-semibold">引用关系</h2>
        </div>
        <CitationPanel
          paperId={detail.paper.id}
          initialOutgoing={citations?.outgoing ?? []}
          initialIncoming={citations?.incoming ?? []}
          canEdit={!!canEditCitations}
        />
      </div>

      <Separator />

      <div>
        <h2 className="mb-3 font-semibold">讨论（{detail.commentCount}）</h2>
        <CommentThread paperId={detail.paper.id} />
      </div>
    </div>
  );
}
