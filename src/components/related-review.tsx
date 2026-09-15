"use client";

import * as React from "react";
import Link from "next/link";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/i18n-provider";

interface ReviewPoint {
  claim: string;
  paperId: string;
  evidence: string;
  confidence: number;
}

interface RelatedReviewResult {
  enabled: boolean;
  title: string;
  points: ReviewPoint[];
  papers: { id: string; title: string }[];
}

/**
 * B2: an AI synthesis of the current paper's related works, generated on
 * demand and rendered on the paper page. Every point cites the source paper.
 */
export function RelatedReview({ paperId }: { paperId: string }) {
  const { t, locale } = useI18n();
  const [enabled, setEnabled] = React.useState<boolean | null>(null);
  const [result, setResult] = React.useState<RelatedReviewResult | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/capabilities", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { aiSummaries?: boolean } | null) => setEnabled(d?.aiSummaries ?? false))
      .catch(() => setEnabled(false));
  }, []);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/papers/${encodeURIComponent(paperId)}/related-review?lang=${locale === "zh" ? "zh" : "en"}`,
        { method: "POST", cache: "no-store" },
      );
      if (res.status === 401) {
        setError(t("paper.aiLoginHint"));
        return;
      }
      if (res.status === 429) {
        setError(t("paper.aiRateLimited"));
        return;
      }
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? t("paper.aiError"));
        return;
      }
      setResult(d);
    } catch {
      setError(t("paper.aiError"));
    } finally {
      setBusy(false);
    }
  }

  if (enabled === null || enabled === false) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          {t("paper.relatedReviewTitle")}
        </h3>
        {!result && (
          <Button size="sm" variant="ghost" onClick={generate} disabled={busy}>
            {busy ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Bot className="mr-1.5 h-3.5 w-3.5" />
            )}
            {t("paper.aiReviewGenerate")}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{t("paper.relatedReviewHint")}</p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && (
        <div className="space-y-2.5 text-sm">
          {result.title && <p className="font-medium">{result.title}</p>}
          {result.points.length === 0 ? (
            <p className="text-muted-foreground">{t("paper.aiReviewEmpty")}</p>
          ) : (
            result.points.map((p, i) => {
              const paper = result.papers.find((x) => x.id === p.paperId);
              return (
                <div key={i} className="rounded-lg bg-muted/40 p-3">
                  <p className="font-medium leading-snug">{p.claim}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("paper.aiEvidence")}：“{p.evidence}”
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="text-muted-foreground">
                      {t("paper.aiConfidence")} {Math.round(p.confidence * 100)}%
                    </span>
                    {paper && (
                      <Link
                        href={`/papers/${p.paperId}`}
                        className="inline-flex max-w-full items-center truncate text-primary hover:underline"
                      >
                        {paper.title || p.paperId}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}