"use client";

import * as React from "react";
import { Diff, Loader2, X } from "lucide-react";
import { useI18n } from "@/i18n/i18n-provider";

interface DiffLine {
  type: "same" | "added" | "removed";
  text: string;
}

interface DiffResult {
  version: { from: number; to: number };
  title: { before: string; after: string; changed: boolean };
  abstract: { before: string | null; after: string | null; changed: boolean; lines: DiffLine[] };
  authors: { before: string[]; after: string[]; changed: boolean };
  doi: { before: string | null; after: string | null; changed: boolean };
  license: { before: string | null; after: string | null; changed: boolean };
  comments: { before: string | null; after: string | null; changed: boolean };
}

/**
 * Inline version comparison (P1-E). Rendered next to each entry in the
 * version-history card; toggling fetches the diff against the latest version
 * and shows field-level before/after plus an abstract line diff.
 */
export function VersionDiff({
  paperId,
  version,
  latestVersion,
}: {
  paperId: string;
  version: number;
  latestVersion: number;
}) {
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);
  const [diff, setDiff] = React.useState<DiffResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function toggle() {
    if (!open) {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/papers/${encodeURIComponent(paperId)}/diff?v1=${version}&v2=${latestVersion}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error("diff failed");
        setDiff(await res.json());
        setOpen(true);
      } catch {
        setError(t("paper.versionDiffFailed"));
        setOpen(true);
      } finally {
        setLoading(false);
      }
    } else {
      setOpen(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
      >
        {open ? <X className="h-3 w-3" /> : <Diff className="h-3 w-3" />}
        {t("paper.versionDiff")}
      </button>
      {open && (
        <div className="mt-2 rounded-lg border bg-muted/30 p-3 text-xs">
          {loading ? (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t("paper.versionDiffLoading")}
            </span>
          ) : error ? (
            <span className="text-destructive">{error}</span>
          ) : diff ? (
            <VersionDiffBody diff={diff} />
          ) : null}
        </div>
      )}
    </div>
  );
}

function VersionDiffBody({ diff }: { diff: DiffResult }) {
  const { t } = useI18n();
  const fields: { label: string; changed: boolean; before: string; after: string }[] = [
    { label: t("paper.versionDiffTitle"), changed: diff.title.changed, before: diff.title.before, after: diff.title.after },
    { label: t("paper.doi"), changed: diff.doi.changed, before: diff.doi.before ?? "—", after: diff.doi.after ?? "—" },
    { label: t("paper.license"), changed: diff.license.changed, before: diff.license.before ?? "—", after: diff.license.after ?? "—" },
    { label: t("paper.comments"), changed: diff.comments.changed, before: diff.comments.before ?? "—", after: diff.comments.after ?? "—" },
    {
      label: t("paper.authors"),
      changed: diff.authors.changed,
      before: diff.authors.before.join(", ") || "—",
      after: diff.authors.after.join(", ") || "—",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <p className="font-medium text-muted-foreground">{t("paper.versionDiffFields")}</p>
        {fields.map((f) => (
          <div key={f.label} className="space-y-0.5">
            <p>
              <span className="text-muted-foreground">{f.label}：</span>
              {f.changed ? (
                <span className="text-amber-600">{t("paper.versionDiffChanged")}</span>
              ) : (
                <span className="text-green-600">{t("paper.versionDiffSame")}</span>
              )}
            </p>
            {f.changed && (
              <div className="space-y-0.5 pl-3">
                <p className="line-clamp-2 text-red-600/90 line-through decoration-red-600/40">{f.before}</p>
                <p className="line-clamp-2 text-green-700">{f.after}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {diff.abstract.changed && (
        <div className="space-y-1.5">
          <p className="font-medium text-muted-foreground">{t("paper.versionDiffAbstract")}</p>
          <div className="max-h-48 space-y-0.5 overflow-y-auto rounded border bg-background p-2 font-mono">
            {diff.abstract.lines.map((line, i) => (
              <p
                key={i}
                className={
                  line.type === "added"
                    ? "bg-green-500/10 text-green-700"
                    : line.type === "removed"
                      ? "bg-red-500/10 text-red-600"
                      : "text-muted-foreground"
                }
              >
                {line.type === "added" ? "+ " : line.type === "removed" ? "- " : "  "}
                {line.text || " "}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
