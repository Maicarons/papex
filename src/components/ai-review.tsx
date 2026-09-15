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

interface ReviewResult {
  enabled: boolean;
  q: string;
  title: string;
  points: ReviewPoint[];
  papers: { id: string; title: string }[];
}

/**
 * RAG corpus review (P1-C): a "generate a review of the search results" entry
 * point for the papers list page. Only rendered when the deployment has an LLM
 * backend; every point cites the exact paper it derives from.
 */
export function AiReview({ q }: { q: string }) {
  const { t, locale } = useI18n();
  const [enabled, setEnabled] = React.useState<boolean | null>(null);
  const [result, setResult] = React.useState<ReviewResult | null>(null);
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
      const res = await fetch("/api/papers/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q, lang: locale === "zh" ? "zh" : "en" }),
        cache: "no-store",
      });
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

  if (enabled === false || enabled === null) return null;

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-medium">{t("paper.aiReviewTitle")}</h2>
        </div>
        {!result && (
          <Button size="sm" onClick={generate} disabled={busy}>
            {busy ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Bot className="mr-1.5 h-3.5 w-3.5" />
            )}
            {t("paper.aiReviewGenerate")}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{t("paper.aiReviewHint")}</p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && (
        <div className="space-y-3 text-sm">
          {result.title && <p className="font-medium">{result.title}</p>}
          {result.points.length === 0 ? (
            <p className="text-muted-foreground">{t("paper.aiReviewEmpty")}</p>
          ) : (
            <ul className="space-y-2.5">
              {result.points.map((p, i) => {
                const paper = result.papers.find((x) => x.id === p.paperId);
                return (
                  <li key={i} className="rounded-lg bg-muted/40 p-3">
                    <p className="font-medium leading-snug">{p.claim}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("paper.aiEvidence")}：“{p.evidence}”
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span className="text-muted-foreground">
                        {t("paper.aiConfidence")}{" "}
                        {Math.round(p.confidence * 100)}%
                      </span>
                      {paper && (
                        <Link
                          href={`/papers/${p.paperId}`}
                          className="inline-flex max-w-full items-center gap-1 truncate text-primary hover:underline"
                        >
                          <span className="truncate">{paper.title}</span>
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
