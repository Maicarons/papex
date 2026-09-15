"use client";

import * as React from "react";
import Link from "next/link";
import { Code2, Database, ExternalLink, Globe, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n/i18n-provider";

interface PaperLink {
  id: string;
  kind: "repository" | "dataset" | "website";
  url: string;
  title: string | null;
  addedById: string | null;
  createdAt: string;
}

const KIND_ICONS: Record<PaperLink["kind"], typeof Code2> = {
  repository: Code2,
  dataset: Database,
  website: Globe,
};

/**
 * Code & data card (P1-D, Papers With Code style). Public read-only for
 * everyone; owner/staff get an inline add + delete form. Only metadata links —
 * nothing is fetched or mirrored.
 */
export function PaperLinks({
  paperId,
  canManage,
}: {
  paperId: string;
  canManage: boolean;
}) {
  const { t } = useI18n();
  const [links, setLinks] = React.useState<PaperLink[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [kind, setKind] = React.useState<PaperLink["kind"]>("repository");
  const [url, setUrl] = React.useState("");
  const [title, setTitle] = React.useState("");

  React.useEffect(() => {
    fetch(`/api/papers/${encodeURIComponent(paperId)}/links`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { links?: PaperLink[] } | null) => setLinks(d?.links ?? []))
      .catch(() => setLinks([]))
      .finally(() => setLoaded(true));
  }, [paperId]);

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/papers/${encodeURIComponent(paperId)}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, url: url.trim(), title: title.trim() || undefined }),
      });
      if (!res.ok) {
        setError(t("paper.linksAddFailed"));
        return;
      }
      const d = await res.json();
      setLinks((prev) => [...prev, d.link]);
      setUrl("");
      setTitle("");
    } catch {
      setError(t("paper.linksAddFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function removeLink(id: string) {
    setLinks((prev) => prev.filter((l) => l.id !== id));
    await fetch(`/api/papers/${encodeURIComponent(paperId)}/links/${id}`, {
      method: "DELETE",
    }).catch(() => null);
  }

  const kindLabel = (k: PaperLink["kind"]) =>
    k === "repository" ? t("paper.kindRepository") : k === "dataset" ? t("paper.kindDataset") : t("paper.kindWebsite");

  return (
    <div className="space-y-3">
      {!loaded ? null : links.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("paper.linksEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {links.map((link) => {
            const Icon = KIND_ICONS[link.kind] ?? Globe;
            let host = "";
            try {
              host = new URL(link.url).hostname;
            } catch {
              /* keep host empty */
            }
            return (
              <li key={link.id} className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 truncate font-medium hover:underline"
                  >
                    <span className="truncate">{link.title ?? link.url}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {kindLabel(link.kind)} · {host}
                  </p>
                </div>
                {canManage && (
                  <button
                    type="button"
                    aria-label={t("paper.linksDelete")}
                    onClick={() => removeLink(link.id)}
                    className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canManage && (
        <form onSubmit={addLink} className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">{t("paper.linksKind")}</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as PaperLink["kind"])}>
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="repository">{t("paper.kindRepository")}</SelectItem>
                  <SelectItem value="dataset">{t("paper.kindDataset")}</SelectItem>
                  <SelectItem value="website">{t("paper.kindWebsite")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("paper.linksTitleLabel")}</Label>
              <Input
                className="h-8 text-xs"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("paper.linksUrl")}</Label>
            <Input
              className="h-8 text-xs"
              type="url"
              required
              placeholder={t("paper.linksUrlPlaceholder")}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" size="sm" className="w-full" disabled={busy || !url.trim()}>
            {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
            {t("paper.linksAdd")}
          </Button>
        </form>
      )}
    </div>
  );
}
