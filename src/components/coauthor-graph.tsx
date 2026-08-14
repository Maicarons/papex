"use client";

import * as React from "react";
import * as echarts from "echarts/core";
import { GraphChart } from "echarts/charts";
import { TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useI18n } from "@/i18n/i18n-provider";

echarts.use([GraphChart, TooltipComponent, CanvasRenderer]);

function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v})` : fallback;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

interface Coauthor {
  id: number;
  name: string;
  count: number;
}

/**
 * Author co-authorship network. Center node is the author, spokes are
 * collaborators with edge weight = number of joint papers.
 */
export function CoauthorGraph({
  authorId,
  authorName,
  coAuthors,
}: {
  authorId: number;
  authorName: string;
  coAuthors: Coauthor[];
}) {
  const { t, format } = useI18n();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const chartRef = React.useRef<ReturnType<typeof echarts.init> | null>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const chart = echarts.init(containerRef.current);
    chartRef.current = chart;
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(containerRef.current);
    const handler = (params: unknown) => {
      const p = params as { dataType?: string; data?: { id?: string | number } };
      if (p.dataType === "node" && p.data?.id && String(p.data.id) !== String(authorId)) {
        router.push(`/authors/${p.data.id}`);
      }
    };
    chart.on("click", handler);
    return () => {
      chart.off("click", handler);
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, [router, authorId]);

  React.useEffect(() => {
    const chart = chartRef.current;
    if (!chart || coAuthors.length === 0) return;

    const dark = resolvedTheme === "dark";
    const textColor = cssVar("--foreground", dark ? "#e2e8f0" : "#0f172a");
    const mutedColor = cssVar("--muted-foreground", dark ? "#94a3b8" : "#64748b");
    const primary = cssVar("--primary", dark ? "#60a5fa" : "#2563eb");
    const accent = dark ? "#a78bfa" : "#7c3aed";

    const option: EChartsOption = {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          const p = params as unknown as { dataType?: string; data?: { name?: string; value?: number } };
          if (p.dataType !== "node" || !p.data) return "";
          const extra =
            p.data.value != null
              ? `<div style="opacity:.75;font-size:11px;margin-top:2px">${escapeHtml(format(t("authors.coauthorCount"), { n: p.data.value }))}</div>`
              : "";
          return `<div style="font-weight:600">${escapeHtml(p.data.name ?? "")}</div>${extra}`;
        },
      },
      series: [
        {
          type: "graph",
          layout: "force",
          roam: true,
          draggable: false,
          data: [
            { id: String(authorId), name: authorName, symbolSize: 56, itemStyle: { color: primary } },
            ...coAuthors.map((c) => ({
              id: String(c.id),
              name: c.name,
              symbolSize: Math.max(20, Math.min(38, 16 + c.count * 5)),
              itemStyle: { color: accent },
              value: c.count,
            })),
          ],
          links: coAuthors.map((c) => ({ source: String(authorId), target: String(c.id) })),
          label: { show: true, position: "right", color: textColor, fontSize: 10 },
          lineStyle: { color: mutedColor, opacity: 0.45, width: 1.2 },
          force: { repulsion: 300, edgeLength: [80, 130], gravity: 0.1, friction: 0.6 },
          emphasis: { focus: "adjacency" },
        },
      ],
    };

    chart.setOption(option, true);
    chart.resize();
    // format is stable per locale; not a meaningful dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorId, authorName, coAuthors, resolvedTheme, t]);

  if (coAuthors.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{t("authors.noCoauthors")}</p>;
  }

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: 300 }}
      role="img"
      aria-label={t("authors.coauthors")}
    />
  );
}
