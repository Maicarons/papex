"use client";

import * as React from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
import { useTheme } from "next-themes";
import { useI18n } from "@/i18n/i18n-provider";

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v})` : fallback;
}

/** Yearly publication trend line chart (CNKI-style). */
export function PublicationTrend({
  data,
}: {
  data: { year: number; count: number }[];
}) {
  const { t } = useI18n();
  const { resolvedTheme } = useTheme();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const chartRef = React.useRef<ReturnType<typeof echarts.init> | null>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const chart = echarts.init(containerRef.current);
    chartRef.current = chart;
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(containerRef.current);
    return () => {
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    const chart = chartRef.current;
    if (!chart || data.length === 0) return;

    const dark = resolvedTheme === "dark";
    const mutedColor = cssVar("--muted-foreground", dark ? "#94a3b8" : "#64748b");
    const borderColor = cssVar("--border", dark ? "#1e293b" : "#e2e8f0");
    const primary = cssVar("--primary", dark ? "#60a5fa" : "#2563eb");

    const option: EChartsOption = {
      backgroundColor: "transparent",
      grid: { left: 8, right: 12, top: 24, bottom: 4, containLabel: true },
      tooltip: {
        trigger: "axis",
        valueFormatter: (v) => `${v}`,
      },
      xAxis: {
        type: "category",
        data: data.map((d) => String(d.year)),
        axisLabel: { color: mutedColor, fontSize: 10 },
        axisLine: { lineStyle: { color: borderColor } },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        axisLabel: { color: mutedColor, fontSize: 10 },
        splitLine: { lineStyle: { color: borderColor, type: "dashed" } },
      },
      series: [
        {
          type: "line",
          data: data.map((d) => d.count),
          smooth: true,
          symbolSize: 6,
          lineStyle: { color: primary, width: 2 },
          itemStyle: { color: primary },
          areaStyle: { color: primary, opacity: 0.08 },
        },
      ],
    };

    chart.setOption(option, true);
    chart.resize();
  }, [data, resolvedTheme]);

  if (data.length === 0) return null;

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: 220 }}
      role="img"
      aria-label={t("papers.publicationTrend")}
    />
  );
}
