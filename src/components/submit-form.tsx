"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, FileText, Upload, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n/i18n-provider";

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

interface CategoryOption {
  id: string;
  name: string;
}

export function SubmitForm({
  categories,
  basePaperId,
  baseTitle,
  pdfUploadEnabled = true,
}: {
  categories: CategoryOption[];
  basePaperId?: string;
  baseTitle?: string;
  pdfUploadEnabled?: boolean;
}) {
  const { t, format } = useI18n();
  const router = useRouter();
  const [title, setTitle] = React.useState(baseTitle ?? "");
  const [abstract, setAbstract] = React.useState("");
  const [primaryCategory, setPrimaryCategory] = React.useState(categories[0]?.id ?? "");
  const [secondary, setSecondary] = React.useState("");
  const [doi, setDoi] = React.useState("");
  const [license, setLicense] = React.useState("CC-BY-4.0");
  const [comments, setComments] = React.useState("");
  const [authors, setAuthors] = React.useState([{ name: "" }]);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const [pdfFile, setPdfFile] = React.useState<File | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [pdfError, setPdfError] = React.useState<string | null>(null);
  const pdfInputRef = React.useRef<HTMLInputElement>(null);

  function updateAuthor(idx: number, name: string) {
    setAuthors((prev) => prev.map((a, i) => (i === idx ? { name } : a)));
  }

  function pickPdf(f: File | null) {
    setPdfError(null);
    if (!f) return;
    const name = f.name.toLowerCase();
    if (!name.endsWith(".pdf") && f.type !== "application/pdf") {
      setPdfError(t("submit.pdfFormatError"));
      setPdfFile(null);
      return;
    }
    if (f.size > MAX_SIZE) {
      setPdfError(t("submit.pdfTooLarge"));
      setPdfFile(null);
      return;
    }
    setPdfFile(f);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    const meta = {
      title,
      abstract,
      primaryCategoryId: primaryCategory,
      secondaryCategoryIds: secondary
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      authors: authors
        .map((a) => a.name.trim())
        .filter(Boolean)
        .map((name, i) => ({ name, order: i })),
      sourceUrl: "",
      doi,
      license,
      comments,
      basePaperId,
    };

    const fd = new FormData();
    fd.append("meta", JSON.stringify(meta));
    if (pdfFile) fd.append("pdf", pdfFile);

    const res = await fetch("/api/papers", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? t("submit.submitFailed"));
      setSubmitting(false);
      return;
    }
    router.push(`/papers/${data.paperId}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{basePaperId ? t("paper.newVersion") : t("submit.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">{t("submit.titleLabel")}</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="abstract">{t("submit.abstractLabel")}</Label>
          <Textarea
            id="abstract"
            rows={8}
            value={abstract}
            onChange={(e) => setAbstract(e.target.value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("submit.categoryLabel")}</Label>
            <Select value={primaryCategory} onValueChange={setPrimaryCategory}>
              <SelectTrigger>
                <SelectValue placeholder={t("submit.categoryPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.id} · {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondary">{t("submit.secondaryLabel")}</Label>
            <Input
              id="secondary"
              value={secondary}
              onChange={(e) => setSecondary(e.target.value)}
              placeholder={t("submit.secondaryPlaceholder")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("submit.authorsLabel")}</Label>
          {authors.map((a, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                value={a.name}
                onChange={(e) => updateAuthor(idx, e.target.value)}
                placeholder={format(t("submit.authorPlaceholder"), { n: idx + 1 })}
              />
              {authors.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("submit.deleteAuthor")}
                  onClick={() => setAuthors((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setAuthors((prev) => [...prev, { name: "" }])}>
            <Plus className="h-4 w-4" />
            {t("submit.addAuthor")}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("submit.pdfUploadTitle")}</Label>
            {pdfUploadEnabled ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => pdfInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  pdfInputRef.current?.click();
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
                pickPdf(e.dataTransfer.files?.[0] ?? null);
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/30 hover:border-primary/50",
              )}
            >
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("submit.pdfDrop")}</p>
              <p className="text-xs text-muted-foreground/70">{t("submit.pdfHint")}</p>
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => pickPdf(e.target.files?.[0] ?? null)}
              />
            </div>
            ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("submit.pdfUploadUnavailable")}</p>
            </div>
            )}
            {pdfFile && (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="flex min-w-0 items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{pdfFile.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setPdfFile(null);
                    if (pdfInputRef.current) pdfInputRef.current.value = "";
                  }}
                  aria-label={t("common.cancel")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            {pdfError && <p className="text-sm text-destructive">{pdfError}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="doi">{t("submit.doiLabel")}</Label>
            <Input id="doi" value={doi} onChange={(e) => setDoi(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="license">{t("submit.licenseLabel")}</Label>
          <Input id="license" value={license} onChange={(e) => setLicense(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="comments">{t("submit.commentsLabel")}</Label>
          <Input
            id="comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder={t("submit.commentsPlaceholder")}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={submit} disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          <Upload className="h-4 w-4" />
          {t("submit.submitBtn")}
        </Button>
      </CardContent>
    </Card>
  );
}
