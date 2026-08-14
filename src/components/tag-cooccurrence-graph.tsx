"use client";

import * as React from "react";
import * as echarts from "echarts/core";
import { GraphChart } from "echarts/charts";
import { TooltipComponent, TitleComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useI18n } from "@/i18n/i18n-provider";
import type { TagCoOccurrence } from "@/lib/services/tags";

echarts.use([GraphChart, TooltipComponent, TitleComponent, CanvasRenderer]);

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

/**
 * Keyword co-occurrence network (ECharts graph, force layout).
 * Clicking a tag navigates to the tag-filtered paper list.
 */
export function TagCooccurrenceGraph({ data }: { data: TagCoOccurrence }) {
  const { t } = useI18n();
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
      const p = params as { dataType?: string; data?: { name?: string } };
      if (p.dataType === "node" && p.data?.name) {
        router.push(`/papers?tag=${encodeURIComponent(p.data.name)}`);
      }
    };
    chart.on("click", handler);
    return () => {
      chart.off("click", handler);
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, [router]);

  React.useEffect(() => {
    const chart = chartRef.current;
    if (!chart || data.nodes.length === 0) return;

    const dark = resolvedTheme === "dark";
    const textColor = cssVar("--foreground", dark ? "#e2e8f0" : "#0f172a");
    const mutedColor = cssVar("--muted-foreground", dark ? "#94a3b8" : "#64748b");
    const primary = cssVar("--primary", dark ? "#60a5fa" : "#2563eb");

    const option: EChartsOption = {
      backgroundColor: "transparent",
      title: {
        text: t("papers.tagNetworkTitle"),
        left: "center",
        top: 4,
        textStyle: { color: mutedColor, fontSize: 12, fontWeight: "normal" },
      },
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          const p = params as unknown as {
            dataType?: string;
            data?: { name?: string };
          };
          if (p.dataType !== "node" || !p.data?.name) return "";
          return `<div style="font-weight:600">${escapeHtml(p.data.name)}</div><div style="opacity:.7;font-size:11px">${escapeHtml(t("tags.filterHint"))}</div>`;
        },
      },
      series: [
        {
          type: "graph",
          layout: "force",
          roam: true,
          draggable: false,
          data: data.nodes.map((n) => ({
            id: String(n.id),
            name: n.name,
            symbolSize: Math.max(18, Math.min(42, 14 + n.count * 6)),
            itemStyle: { color: primary },
          })),
          links: data.links.map((l) => ({
            source: l.source,
            target: l.target,
            value: l.weight,
          })),
          label: { show: true, position: "right", color: textColor, fontSize: 10 },
          lineStyle: { color: mutedColor, opacity: 0.45, width: 1 },
          force: { repulsion: 380, edgeLength: [60, 110], gravity: 0.08, friction: 0.6 },
          emphasis: { focus: "adjacency" },
        },
      ],
    };

    chart.setOption(option, true);
    chart.resize();
  }, [data, resolvedTheme, t]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: 340 }}
      role="img"
      aria-label={t("papers.tagNetworkTitle")}
    />
  );
}
