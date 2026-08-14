"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileArchive,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/i18n-provider";

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

interface ArchiveResult {
  paperId: string;
  version: number;
  warnings: string[];
  pdfUrl?: string;
}

export function SourcePackageUpload({ latexEnabled = true }: { latexEnabled?: boolean }) {
  const { t, format } = useI18n();
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<ArchiveResult | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function pickFile(f: File | null) {
    setError(null);
    setResult(null);
    if (!f) return;
    const name = f.name.toLowerCase();
    if (!name.endsWith(".tar.gz") && !name.endsWith(".tgz")) {
      setError(t("submit.packageFormatError"));
      setFile(null);
      return;
    }
    if (f.size > MAX_SIZE) {
      setError(t("submit.packageTooLarge"));
      setFile(null);
      return;
    }
    setFile(f);
  }

  async function upload() {
    if (!file) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/submit/archive", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("submit.submitFailed"));
        return;
      }
      setResult(data as ArchiveResult);
    } catch {
      setError(t("submit.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            {t("submit.packageSuccess")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {format(t("submit.packageResultId"), {
              id: result.paperId,
              version: result.version,
            })}
          </p>

          {(!result.pdfUrl || result.warnings?.length) && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <div className="mb-1 flex items-center gap-1.5 font-medium">
                <AlertCircle className="h-4 w-4" />
                {t("submit.packageWarnings")}
              </div>
              <ul className="list-disc space-y-0.5 pl-5">
                {!result.pdfUrl && <li>{t("submit.packagePdfPending")}</li>}
                {result.warnings?.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={() => router.push(`/papers/${result.paperId}`)}>
              {t("submit.viewPaper")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              {t("submit.packageAnother")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!latexEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            {t("submit.packageUnavailable")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("submit.packageUnavailable")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("submit.packageTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("submit.packageSubtitle")}</p>

        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            pickFile(e.dataTransfer.files?.[0] ?? null);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/30 hover:border-primary/50",
          )}
        >
          <FileArchive className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("submit.packageDrop")}</p>
          <p className="text-xs text-muted-foreground/70">{t("submit.packageHint")}</p>
          <input
            ref={inputRef}
            type="file"
            accept=".tar.gz,.tgz,application/gzip"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {file && (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <FileArchive className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{file.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              aria-label={t("common.cancel")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={upload} disabled={!file || submitting} className="w-full">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          <Upload className="h-4 w-4" />
          {t("submit.packageUploadBtn")}
        </Button>
      </CardContent>
    </Card>
  );
}
