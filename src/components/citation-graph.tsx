"use client";

import * as React from "react";
import * as echarts from "echarts/core";
import { GraphChart } from "echarts/charts";
import { TooltipComponent, LegendComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import type { CitationOut } from "@/lib/services/citations";
import { useI18n } from "@/i18n/i18n-provider";

// Register only what this chart needs to keep the bundle small.
echarts.use([GraphChart, TooltipComponent, LegendComponent, CanvasRenderer]);

const HEIGHT = 420;

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

function truncate(s: string | null, n = 26): string {
  if (!s) return "";
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

interface GraphNode {
  id: string;
  name: string;
  full: string;
  href?: string;
  category: number;
  symbolSize: number;
}

/**
 * Citation network rendered with the ECharts graph series (force layout).
 * - Force-directed layout distributes nodes automatically (no hand-placed columns).
 * - roam:true gives wheel-zoom + drag-pan; clicking a node navigates via the app router.
 * - Three categories: cited-by (incoming), this paper, references (outgoing).
 */
export function CitationGraph({
  paperTitle,
  outgoing,
  incoming,
}: {
  paperId: string;
  paperTitle: string;
  outgoing: CitationOut[];
  incoming: CitationOut[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const chartRef = React.useRef<ReturnType<typeof echarts.init> | null>(null);

  // Init once; bind click handler inside the same effect so it always attaches
  // to the *current* instance (React Strict Mode would otherwise leave the
  // handler bound on the first, disposed instance).
  React.useEffect(() => {
    if (!containerRef.current) return;
    const chart = echarts.init(containerRef.current);
    chartRef.current = chart;
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(containerRef.current);
    const handler = (params: unknown) => {
      const p = params as { dataType?: string; data?: { href?: string } };
      if (p.dataType === "node" && p.data?.href) router.push(p.data.href);
    };
    chart.on("click", handler);
    return () => {
      chart.off("click", handler);
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, [router]);

  const catIncoming = t("citations.incomingShort");
  const catCurrent = t("citations.currentPaper");
  const catOutgoing = t("citations.outgoingShort");

  const nodes = React.useMemo<GraphNode[]>(() => {
    const list: GraphNode[] = [
      {
        id: "center",
        name: truncate(paperTitle, 20),
        full: paperTitle,
        category: 1,
        symbolSize: 64,
      },
    ];
    incoming.forEach((c, i) => {
      list.push({
        id: `in-${i}-${c.id}`,
        name: truncate(c.resolvedTitle) || t("citations.unknownSource"),
        full: c.resolvedTitle || t("citations.unknownSource"),
        href: `/papers/${c.paperId}`,
        category: 0,
        symbolSize: 36,
      });
    });
    outgoing.forEach((c, i) => {
      const full = c.targetTitle || c.targetArxivId || c.targetDoi || t("citations.external");
      list.push({
        id: `out-${i}-${c.id}`,
        name: truncate(full),
        full,
        href: c.targetPaperId ? `/papers/${c.targetPaperId}` : c.targetUrl || undefined,
        category: 2,
        symbolSize: 36,
      });
    });
    return list;
  }, [paperTitle, incoming, outgoing, t]);

  const links = React.useMemo(
    () => [
      ...incoming.map((c, i) => ({ source: `in-${i}-${c.id}`, target: "center" })),
      ...outgoing.map((c, i) => ({ source: "center", target: `out-${i}-${c.id}` })),
    ],
    [incoming, outgoing],
  );

  // Redraw when data, theme or locale change.
  React.useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const dark = resolvedTheme === "dark";
    const textColor = cssVar("--foreground", dark ? "#e2e8f0" : "#0f172a");
    const mutedColor = cssVar("--muted-foreground", dark ? "#94a3b8" : "#64748b");
    const borderColor = cssVar("--border", dark ? "#1e293b" : "#e2e8f0");
    const primary = cssVar("--primary", dark ? "#60a5fa" : "#2563eb");
    const inColor = dark ? "#60a5fa" : "#3b82f6";
    const outColor = dark ? "#a78bfa" : "#7c3aed";

    const option: EChartsOption = {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          const p = params as unknown as {
            dataType?: string;
            data?: { id?: string; full?: string; href?: string };
          };
          if (p.dataType !== "node" || !p.data) return "";
          const typeLabel =
            p.data.id === "center"
              ? catCurrent
              : p.data.id?.startsWith("in-")
                ? catIncoming
                : catOutgoing;
          const head = `<div style="max-width:280px;font-weight:600;line-height:1.35">${escapeHtml(p.data.full ?? "")}</div>`;
          const hint = p.data.href
            ? `<div style="margin-top:4px;opacity:.7;font-size:11px">${escapeHtml(t("citations.zoomHint"))}</div>`
            : "";
          return `<div style="opacity:.75;font-size:11px;margin-bottom:2px">${escapeHtml(typeLabel)}</div>${head}${hint}`;
        },
      },
      legend: {
        data: [catIncoming, catCurrent, catOutgoing],
        bottom: 0,
        itemWidth: 12,
        itemHeight: 12,
        itemGap: 16,
        textStyle: { color: mutedColor, fontSize: 11 },
      },
      series: [
        {
          type: "graph",
          layout: "force",
          roam: true,
          draggable: false,
          data: nodes,
          links,
          categories: [
            { name: catIncoming, itemStyle: { color: inColor } },
            { name: catCurrent, itemStyle: { color: primary } },
            { name: catOutgoing, itemStyle: { color: outColor } },
          ],
          label: {
            show: true,
            position: "right",
            distance: 6,
            color: textColor,
            fontSize: 11,
          },
          edgeSymbol: ["none", "arrow"],
          edgeSymbolSize: [0, 9],
          lineStyle: { color: mutedColor, opacity: 0.5, width: 1.2, curveness: 0.08 },
          force: { repulsion: 420, edgeLength: [70, 130], gravity: 0.08, friction: 0.6 },
          emphasis: { focus: "adjacency", lineStyle: { width: 2.5, opacity: 1 } },
          itemStyle: { borderColor, borderWidth: 1 },
        },
      ],
    };

    chart.setOption(option, true);
    chart.resize();
  }, [nodes, links, resolvedTheme, t, catIncoming, catCurrent, catOutgoing]);

  // (Click handler is bound inside the init effect above so it tracks the
  // current instance across React Strict Mode's double-invoke.)

  if (incoming.length === 0 && outgoing.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">{t("citations.empty")}</p>
    );
  }

  return (
    <div>
      <div
        ref={containerRef}
        style={{ width: "100%", height: HEIGHT }}
        role="img"
        aria-label={t("citations.graphTitle")}
      />
      <p className="mt-1 text-center text-[11px] text-muted-foreground">{t("citations.zoomHint")}</p>
    </div>
  );
}
