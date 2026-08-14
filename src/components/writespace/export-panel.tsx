"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/i18n-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, UploadCloud, CheckCircle2, AlertCircle, Loader2, FileArchive } from "lucide-react";
import type { WritespaceDraft, ValidationResult, PapexManifest } from "@/lib/writespace/manifest";

export interface PublishSuccess {
  paperId: string;
  version: number;
  warnings: string[];
  pdfUrl?: string;
}

export type ExportResult =
  | { status: "success"; data: PublishSuccess }
  | { status: "error"; message: string };

function previewNames(m: PapexManifest): string[] {
  const names = ["papex.json"];
  for (const s of m.sections ?? []) names.push(s.file || `sections/${s.id}.tex`);
  for (const a of m.appendices ?? []) names.push(a.file || `sections/${a.id}.tex`);
  names.push(
    "_papex_meta.tex",
    "_papex_abstract.tex",
    "_papex_sections.tex",
    "_papex_backmatter.tex",
    "_papex_appendices.tex",
  );
  if ((m.references ?? []).length) names.push("references.bib");
  names.push("papex-template.tex", "papex.cls");
  return names;
}

export function ExportPanel({
  draft,
  validation,
  exporting,
  publishing,
  result,
  publishEnabled = true,
  onExport,
  onPublish,
  onReset,
}: {
  draft: WritespaceDraft;
  validation: ValidationResult;
  exporting: boolean;
  publishing: boolean;
  result: ExportResult | null;
  publishEnabled?: boolean;
  onExport: () => void;
  onPublish: () => void;
  onReset: () => void;
}) {
  const { t, format } = useI18n();
  const router = useRouter();
  const names = previewNames(draft.manifest);
  const busy = exporting || publishing;

  if (result?.status === "success") {
    const d = result.data;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            {t("writespace.expSuccess")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("submit.packageResultId")
              .replace("{id}", d.paperId)
              .replace("{version}", String(d.version))}
          </p>
          {(d.warnings?.length || !d.pdfUrl) && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <div className="mb-1 flex items-center gap-1.5 font-medium">
                <AlertCircle className="h-4 w-4" />
                {t("writespace.expWarnings")}
              </div>
              <ul className="list-disc space-y-0.5 pl-5">
                {!d.pdfUrl && <li>{t("writespace.expPdfPending")}</li>}
                {d.warnings?.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={() => router.push(`/papers/${d.paperId}`)}>
              {t("writespace.expViewPaper")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                onReset();
              }}
            >
              {t("writespace.expReset")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("writespace.expHeading")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("writespace.expSummary")}</p>

          {/* 校验状态 */}
          <div className="flex items-center gap-2">
            {validation.valid ? (
              <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600">
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                {t("writespace.valid")}
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertCircle className="mr-1 h-3.5 w-3.5" />
                {t("writespace.invalid")}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {validation.errors.length} {t("writespace.validationTitle")}
              {validation.warnings.length > 0 &&
                ` · ${format(t("writespace.warningsCount"), { n: validation.warnings.length })}`}
            </span>
          </div>

          {!validation.valid && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <ul className="list-disc space-y-1 pl-5 text-destructive">
                {validation.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          {validation.warnings.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <ul className="list-disc space-y-0.5 pl-5">
                {validation.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 文件清单 */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">{t("writespace.expFiles")}</p>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {names.map((n) => (
                <div
                  key={n}
                  className="flex items-center gap-2 rounded bg-muted/50 px-2 py-1 text-xs"
                >
                  <FileArchive className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <code className="truncate">{n}</code>
                </div>
              ))}
            </div>
          </div>

          {/* 操作 */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={onExport} disabled={busy} variant="outline" className="flex-1">
              {exporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Download className="mr-2 h-4 w-4" />
              {exporting ? t("writespace.expExporting") : t("writespace.expExportBtn")}
            </Button>
            <Button onClick={onPublish} disabled={busy || !validation.valid || !publishEnabled} className="flex-1">
              {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <UploadCloud className="mr-2 h-4 w-4" />
              {publishing ? t("writespace.expPublishing") : t("writespace.expPublishBtn")}
            </Button>
          </div>
          {!publishEnabled && (
            <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-3.5 w-3.5" />
              {t("writespace.publishUnavailable")}
            </p>
          )}
          {!validation.valid && (
            <p className="text-xs text-destructive">{t("writespace.expInvalid")}</p>
          )}
          <p className="text-xs text-muted-foreground">{t("writespace.expPublishHint")}</p>

          {result?.status === "error" && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {result.message}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
