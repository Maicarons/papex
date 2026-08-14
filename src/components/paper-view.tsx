"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  FileText,
  Upload,
  History,
  ExternalLink,
  User as UserIcon,
  Link2,
  Loader2,
  BookOpen,
  MessageSquare,
  AlertCircle,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubscribeButton } from "@/components/subscribe-button";
import { BookmarkButton } from "@/components/bookmark-button";
import { CommentThread } from "@/components/comment-thread";
import { CitationPanel } from "@/components/citation-panel";
import { PaperTags } from "@/components/paper-tags";
import { formatDate } from "@/lib/utils";
import { useSession } from "@/lib/use-session";
import { useI18n } from "@/i18n/i18n-provider";
import type { getPaperDetail, RelatedPaper } from "@/lib/services/papers";
import type { CitationGraph } from "@/lib/services/citations";

type Detail = NonNullable<Awaited<ReturnType<typeof getPaperDetail>>>;

export function PaperView({
  detail,
  version,
  citations,
  related = [],
  pdfUploadEnabled = true,
}: {
  detail: Detail;
  version: Detail["latest"];
  citations?: CitationGraph;
  related?: RelatedPaper[];
  pdfUploadEnabled?: boolean;
}) {
  // Owner/editor permissions are computed on the client after the session
  // loads, so this view can be rendered statically (the root layout no longer
  // reads cookies). Until loaded, defaults to no owner actions.
  const { user, loaded } = useSession();
  const isOwner = loaded && !!user && user.id === detail.paper.createdById;
  const canEditCitations =
    loaded && !!user && (isOwner || user.role === "moderator" || user.role === "admin");
  const canUploadPdf =
    pdfUploadEnabled &&
    loaded &&
    !!user &&
    (isOwner || user.role === "moderator" || user.role === "admin");
  const withdrawn = detail.paper.status === "withdrawn";

  const { t } = useI18n();
  const router = useRouter();
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const statusMap: Record<string, string> = {
    submitted: t("paper.statusSubmitted"),
    approved: t("paper.statusApproved"),
    withdrawn: t("paper.statusWithdrawn"),
    rejected: t("paper.statusRejected"),
  };

  async function uploadPdf(f: File | null) {
    if (!f) return;
    setPdfError(null);
    setPdfUploading(true);
    try {
      const fd = new FormData();
      fd.append("pdf", f);
      const res = await fetch(`/api/papers/${encodeURIComponent(detail.paper.id)}/pdf`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setPdfError(data.error ?? t("submit.pdfUploadFailed"));
        return;
      }
      if (pdfInputRef.current) pdfInputRef.current.value = "";
      router.refresh();
    } catch {
      setPdfError(t("submit.pdfUploadFailed"));
    } finally {
      setPdfUploading(false);
    }
  }

  const pdfPreviewUrl = version.pdfUrl
    ? `/api/papers/${encodeURIComponent(detail.paper.id)}/pdf/${version.version}`
    : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Breadcrumb / back link */}
      <Link href="/papers" className="text-sm text-muted-foreground hover:underline">
        {t("paper.backToList")}
      </Link>

      {/* Header metadata + title */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{detail.primaryCategory.id}</Badge>
          <span className="font-mono text-sm text-muted-foreground">{detail.paper.id}</span>
          <Badge variant="outline">
            {t("paper.version")} {version.version}
          </Badge>
          <Badge variant={detail.paper.status === "approved" ? "default" : "secondary"}>
            {statusMap[detail.paper.status] ?? detail.paper.status}
          </Badge>
        </div>

        <h1 className="text-2xl font-bold leading-tight md:text-3xl lg:text-4xl">{version.title}</h1>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {detail.authors.map((a) => (
            <span key={a.id} className="inline-flex items-center gap-1.5">
              <UserIcon className="h-4 w-4" />
              <Link href={`/authors/${a.id}`} className="font-medium hover:underline">
                {a.name}
              </Link>
              {a.affiliation?.name && (
                <span className="text-xs">({a.affiliation.name})</span>
              )}
            </span>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {version.pdfUrl && !withdrawn && (
            <Button asChild size="sm" variant="default">
              <a href={version.pdfUrl} target="_blank" rel="noreferrer">
                <FileText className="mr-1.5 h-4 w-4" />
                {t("paper.downloadPdf")}
                <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </a>
            </Button>
          )}
          <SubscribeButton type="paper" refId={detail.paper.id} />
          <BookmarkButton paperId={detail.paper.id} />
          {canUploadPdf && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={pdfUploading}
                onClick={() => pdfInputRef.current?.click()}
              >
                {pdfUploading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-1.5 h-4 w-4" />
                )}
                {t("paper.uploadPdf")}
              </Button>
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => uploadPdf(e.target.files?.[0] ?? null)}
              />
            </>
          )}
          {isOwner && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/papers/${detail.paper.id}/edit`}>
                <Upload className="mr-1.5 h-4 w-4" />
                {t("paper.newVersion")}
              </Link>
            </Button>
          )}
        </div>
        {pdfError && (
          <p className="flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {pdfError}
          </p>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <Tabs defaultValue="abstract" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="abstract" className="gap-1.5">
                <BookOpen className="h-4 w-4" />
                {t("paper.tabAbstract")}
              </TabsTrigger>
              <TabsTrigger value="pdf" disabled={!version.pdfUrl} className="gap-1.5">
                <FileText className="h-4 w-4" />
                {t("paper.tabPdfPreview")}
              </TabsTrigger>
              <TabsTrigger value="citations" className="gap-1.5">
                <Link2 className="h-4 w-4" />
                {t("paper.tabCitations")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="abstract" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("paper.abstract")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {version.abstract ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{version.abstract}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("paper.abstractEmpty")}</p>
                  )}
                  {withdrawn && version.withdrawalReason && (
                    <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                      {t("paper.withdrawalReason")}：{version.withdrawalReason}
                    </p>
                  )}
                  <Separator />
                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    {version.doi && (
                      <div>
                        <span className="font-medium text-foreground">{t("paper.doi")}：</span>
                        {version.doi}
                      </div>
                    )}
                    {version.license && (
                      <div>
                        <span className="font-medium text-foreground">{t("paper.license")}：</span>
                        {version.license}
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-foreground">{t("paper.submittedAt")}：</span>
                      {formatDate(detail.paper.createdAt)}
                    </div>
                    {version.comments && (
                      <div className="sm:col-span-2">
                        <span className="font-medium text-foreground">{t("paper.comments")}：</span>
                        {version.comments}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pdf">
              <Card className="overflow-hidden">
                <CardHeader className="pb-0">
                  <CardTitle className="text-base">{t("paper.tabPdfPreview")}</CardTitle>
                </CardHeader>
                <CardContent className="p-0 pt-4">
                  {pdfPreviewUrl ? (
                    <iframe
                      src={pdfPreviewUrl}
                      title={t("paper.tabPdfPreview")}
                      className="h-[75vh] w-full border-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                      <Info className="mr-2 h-4 w-4" />
                      {t("paper.pdfNotAvailable")}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="citations">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Link2 className="h-4 w-4" />
                    {t("paper.tabCitations")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CitationPanel
                    paperId={detail.paper.id}
                    initialOutgoing={citations?.outgoing ?? []}
                    initialIncoming={citations?.incoming ?? []}
                    canEdit={!!canEditCitations}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Discussion */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4" />
                {t("paper.discussion")}（{detail.commentCount}）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CommentThread paperId={detail.paper.id} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6 lg:col-span-1">
          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("paper.metadata")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("paper.paperId")}</span>
                <span className="font-mono">{detail.paper.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("paper.version")}</span>
                <span>v{version.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("paper.status")}</span>
                <span>{statusMap[detail.paper.status] ?? detail.paper.status}</span>
              </div>
              {version.doi && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("paper.doi")}</span>
                  <span className="truncate pl-2">{version.doi}</span>
                </div>
              )}
              {version.license && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("paper.license")}</span>
                  <span>{version.license}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("paper.submittedAt")}</span>
                <span>{formatDate(detail.paper.createdAt)}</span>
              </div>
              {detail.submitter && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("paper.submittedBy")}</span>
                  <Link
                    href={`/u/${detail.submitter.username}`}
                    className="truncate pl-2 font-medium hover:underline"
                  >
                    @{detail.submitter.username}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("paper.categories")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {detail.categories.map((c) => (
                  <div key={c.id} className="inline-flex items-center gap-1.5">
                    <Badge variant={c.isPrimary ? "default" : "outline"}>
                      <Link href={`/categories/${c.id}`} className="hover:underline">
                        {c.id} · {c.name}
                      </Link>
                    </Badge>
                    <SubscribeButton type="category" refId={c.id} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardContent className="pt-6">
              <PaperTags
                paperId={detail.paper.id}
                initialTags={detail.tags ?? []}
                canManage={canEditCitations}
              />
            </CardContent>
          </Card>

          {/* Version history */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" />
                {t("paper.versions")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {detail.paper.latestVersion >= 1 &&
                  Array.from({ length: detail.paper.latestVersion }, (_, i) => i + 1).map((ver) => (
                    <li key={ver} className="flex items-center justify-between">
                      <Link
                        href={`/papers/${detail.paper.id}/${ver}`}
                        className="text-muted-foreground hover:underline"
                      >
                        v{ver}
                      </Link>
                      {ver === detail.paper.latestVersion && (
                        <Badge variant="outline" className="text-xs">
                          {t("paper.current")}
                        </Badge>
                      )}
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>

          {/* Related papers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("paper.relatedPapers")}</CardTitle>
            </CardHeader>
            <CardContent>
              {related.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("paper.relatedEmpty")}</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {related.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/papers/${r.id}`}
                        className="block font-medium leading-snug hover:underline"
                      >
                        {r.title}
                      </Link>
                      {r.authors.length > 0 && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {r.authors.join(", ")}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
