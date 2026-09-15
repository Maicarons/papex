"use client";

import * as React from "react";
import { Bookmark, Highlighter, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n/i18n-provider";

interface Note {
  id: string;
  paperId: string;
  version: number;
  kind: "highlight" | "note";
  page: number | null;
  rect: Record<string, unknown> | null;
  color: string | null;
  content: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Progress {
  paperId: string;
  version: number;
  page: number;
  percent: number;
  updatedAt: string;
}

const NOTE_COLORS = ["#fde68a", "#a7f3d0", "#bfdbfe", "#fbcfe8", "#e9d5ff"];

/**
 * Reading panel (P0-E): personal reading progress + highlights/annotations for
 * one paper version, backed by the existing /api/notes and
 * /api/reading-progress endpoints.
 */
export function ReadingPanel({ paperId, version }: { paperId: string; version: number }) {
  const { t } = useI18n();
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [progress, setProgress] = React.useState<Progress | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [needsLogin, setNeedsLogin] = React.useState(false);
  const [savingProgress, setSavingProgress] = React.useState(false);
  const [progressSaved, setProgressSaved] = React.useState(false);
  const [adding, setAdding] = React.useState(false);

  // Note form state.
  const [kind, setKind] = React.useState<"highlight" | "note">("highlight");
  const [color, setColor] = React.useState(NOTE_COLORS[0]);
  const [content, setContent] = React.useState("");
  const [page, setPage] = React.useState("");

  const reload = React.useCallback(async () => {
    const [notesRes, progRes] = await Promise.all([
      fetch(`/api/notes?paperId=${encodeURIComponent(paperId)}&version=${version}`, {
        cache: "no-store",
      }),
      fetch(`/api/reading-progress/${encodeURIComponent(paperId)}?version=${version}`, {
        cache: "no-store",
      }),
    ]);
    if (notesRes.status === 401 || progRes.status === 401) {
      setNeedsLogin(true);
      return;
    }
    const nd = await notesRes.json().catch(() => ({ notes: [] }));
    const pd = await progRes.json().catch(() => ({ progress: null }));
    setNotes(nd.notes ?? []);
    setProgress(pd.progress ?? null);
  }, [paperId, version]);

  React.useEffect(() => {
    // `loading` starts true; reload() flips it off when it settles.
    Promise.resolve()
      .then(() => reload())
      .catch(() => setNeedsLogin(true))
      .finally(() => setLoading(false));
  }, [reload]);

  async function saveProgress() {
    if (!progress) return;
    setSavingProgress(true);
    setProgressSaved(false);
    try {
      const res = await fetch(`/api/reading-progress/${encodeURIComponent(paperId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: progress.page,
          percent: progress.percent,
          version,
        }),
      });
      if (res.ok) {
        setProgressSaved(true);
        setTimeout(() => setProgressSaved(false), 2000);
      }
    } finally {
      setSavingProgress(false);
    }
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperId,
          version,
          kind,
          page: page ? Number(page) : 0,
          color: kind === "highlight" ? color : null,
          content: content.trim(),
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setNotes((prev) => [d.note, ...prev]);
        setContent("");
        setPage("");
      }
    } finally {
      setAdding(false);
    }
  }

  async function deleteNote(id: string) {
    await fetch("/api/notes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => null);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {t("common.loading")}
      </div>
    );
  }

  if (needsLogin) {
    return <p className="py-6 text-sm text-muted-foreground">{t("paper.notesLoginHint")}</p>;
  }

  return (
    <div className="space-y-6">
      {/* Reading progress */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-primary" />
          <h3 className="font-medium">{t("paper.readingProgress")}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{t("paper.readingProgressHint")}</p>
        <div className="grid max-w-md grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="rp-page">{t("paper.readingPage")}</Label>
            <Input
              id="rp-page"
              type="number"
              min={0}
              value={progress?.page ?? 0}
              onChange={(e) =>
                setProgress((p) => ({ ...(p ?? { paperId, version, page: 0, percent: 0, updatedAt: "" }), page: Number(e.target.value) || 0 }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rp-percent">{t("paper.readingPercent")}</Label>
            <Input
              id="rp-percent"
              type="number"
              min={0}
              max={100}
              value={progress?.percent ?? 0}
              onChange={(e) =>
                setProgress((p) => ({
                  ...(p ?? { paperId, version, page: 0, percent: 0, updatedAt: "" }),
                  percent: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                }))
              }
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-cta transition-all"
              style={{ width: `${progress?.percent ?? 0}%` }}
            />
          </div>
          <Button size="sm" variant="outline" onClick={saveProgress} disabled={savingProgress}>
            {savingProgress ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              t("paper.readingSave")
            )}
          </Button>
          {progressSaved && <span className="text-xs text-green-600">{t("paper.readingSaved")}</span>}
        </div>
      </div>

      {/* Notes list */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Highlighter className="h-4 w-4 text-primary" />
          <h3 className="font-medium">{t("paper.myNotes")}</h3>
        </div>
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("paper.notesEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((n) => (
              <li
                key={n.id}
                className="flex items-start gap-3 rounded-lg border bg-background p-3 text-sm"
              >
                <span
                  className="mt-1 h-4 w-4 shrink-0 rounded-full border"
                  style={{ backgroundColor: n.color ?? (n.kind === "note" ? "#94a3b8" : NOTE_COLORS[0]) }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{n.kind === "highlight" ? t("paper.kindHighlight") : t("paper.kindNote")}</span>
                    {n.page != null && n.page > 0 && <span>p.{n.page}</span>}
                  </div>
                  <p className="whitespace-pre-wrap">{n.content || "—"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteNote(n.id)}
                  aria-label={t("paper.noteDelete")}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add note form */}
      <form onSubmit={addNote} className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <h4 className="flex items-center gap-2 text-sm font-medium">
          <Plus className="h-4 w-4" />
          {t("paper.addNote")}
        </h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("paper.noteKind")}</Label>
            <Select
              value={kind}
              onValueChange={(v) => setKind(v as "highlight" | "note")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="highlight">{t("paper.kindHighlight")}</SelectItem>
                <SelectItem value="note">{t("paper.kindNote")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("paper.notePage")}</Label>
            <Input
              type="number"
              min={0}
              value={page}
              onChange={(e) => setPage(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
        {kind === "highlight" && (
          <div className="space-y-1.5">
            <Label>{t("paper.noteColor")}</Label>
            <div className="flex gap-2">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full border transition-transform ${
                    color === c ? "scale-110 ring-2 ring-primary" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>{t("paper.noteContent")}</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("paper.noteContentPlaceholder")}
            className="min-h-[80px]"
          />
        </div>
        <Button type="submit" size="sm" disabled={adding || !content.trim()}>
          {adding ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          {t("paper.noteAdd")}
        </Button>
      </form>
    </div>
  );
}
