"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, X, Tag as TagIcon, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/i18n-provider";

export interface PaperTag {
  id: number;
  name: string;
}

/**
 * Tag list for a paper. Anyone can view (links browse /papers?tag=...);
 * the paper owner / moderators / admins can attach (create on the fly) or detach.
 */
export function PaperTags({
  paperId,
  initialTags,
  canManage = false,
}: {
  paperId: string;
  initialTags: PaperTag[];
  canManage?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [tags, setTags] = React.useState<PaperTag[]>(initialTags);
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function addTag() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/papers/${encodeURIComponent(paperId)}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "添加失败");
        return;
      }
      setTags((prev) => {
        if (prev.some((x) => x.id === data.tag.id)) return prev;
        return [...prev, data.tag];
      });
      setName("");
      router.refresh();
    } catch {
      setError("添加失败");
    } finally {
      setBusy(false);
    }
  }

  async function removeTag(tagId: number) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/papers/${encodeURIComponent(paperId)}/tags?tagId=${tagId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "移除失败");
        return;
      }
      setTags((prev) => prev.filter((x) => x.id !== tagId));
      router.refresh();
    } catch {
      setError("移除失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <TagIcon className="h-4 w-4" />
        {t("tags.title")}
      </div>
      {tags.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("tags.empty")}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag.id} className="group inline-flex items-center gap-1">
              <Link href={`/papers?tag=${encodeURIComponent(tag.name)}`}>
                <Badge variant="secondary" className="cursor-pointer transition-colors hover:bg-accent">
                  {tag.name}
                </Badge>
              </Link>
              {canManage && (
                <button
                  type="button"
                  aria-label={t("tags.remove")}
                  onClick={() => removeTag(tag.id)}
                  className="rounded-full p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {canManage && (
        <div className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTag()}
            placeholder={t("tags.addPlaceholder")}
            className="h-8 max-w-52"
            maxLength={40}
          />
          <Button size="sm" variant="outline" onClick={addTag} disabled={busy || !name.trim()}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {t("tags.add")}
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">{t("tags.filterHint")}</p>
    </div>
  );
}
