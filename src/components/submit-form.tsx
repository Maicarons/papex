"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
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

interface CategoryOption {
  id: string;
  name: string;
}

export function SubmitForm({
  categories,
  basePaperId,
  baseTitle,
}: {
  categories: CategoryOption[];
  basePaperId?: string;
  baseTitle?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [title, setTitle] = React.useState(baseTitle ?? "");
  const [abstract, setAbstract] = React.useState("");
  const [primaryCategory, setPrimaryCategory] = React.useState(categories[0]?.id ?? "");
  const [secondary, setSecondary] = React.useState("");
  const [pdfUrl, setPdfUrl] = React.useState("");
  const [doi, setDoi] = React.useState("");
  const [license, setLicense] = React.useState("CC-BY-4.0");
  const [comments, setComments] = React.useState("");
  const [authors, setAuthors] = React.useState([{ name: "" }]);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  function updateAuthor(idx: number, name: string) {
    setAuthors((prev) => prev.map((a, i) => (i === idx ? { name } : a)));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    const payload = {
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
      pdfUrl,
      sourceUrl: "",
      doi,
      license,
      comments,
      basePaperId,
    };
    const res = await fetch("/api/papers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "提交失败");
      setSubmitting(false);
      return;
    }
    router.push(`/papers/${data.paperId}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{basePaperId ? "提交新版本" : "提交新论文"}</CardTitle>
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
                <SelectValue placeholder="选择分类" />
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
            <Label htmlFor="secondary">交叉分类（逗号分隔，可选）</Label>
            <Input
              id="secondary"
              value={secondary}
              onChange={(e) => setSecondary(e.target.value)}
              placeholder="例如 cs.LG, stat.ML"
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
                placeholder={`作者 ${idx + 1} 姓名`}
              />
              {authors.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="删除该作者"
                  onClick={() => setAuthors((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setAuthors((prev) => [...prev, { name: "" }])}>
            <Plus className="h-4 w-4" />
            添加作者
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pdf">PDF 链接（可选）</Label>
            <Input id="pdf" value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doi">DOI（可选）</Label>
            <Input id="doi" value={doi} onChange={(e) => setDoi(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="license">{t("submit.licenseLabel")}</Label>
          <Input id="license" value={license} onChange={(e) => setLicense(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="comments">版本说明（可选）</Label>
          <Input
            id="comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="例如 v2: camera-ready 版本"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={submit} disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("submit.submitBtn")}
        </Button>
      </CardContent>
    </Card>
  );
}
