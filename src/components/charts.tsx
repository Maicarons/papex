"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart as EChartsBarChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
import { useTheme } from "next-themes";

// 按需注册，避免把完整 echarts 打进包里
echarts.use([EChartsBarChart, GridComponent, TooltipComponent, CanvasRenderer]);

interface BarDatum {
  label: string;
  value: number;
}

/** 读取 Tailwind 的 CSS 变量（HSL 三元组），包成 hsl() 给 ECharts 用 */
function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v})` : fallback;
}

/**
 * 基于 ECharts 的柱状图。
 * - 用 xAxis.data 渲染分类，天然支持重复 label（如两个同名作者），不再有 React key 冲突。
 * - 通过 next-themes 的 resolvedTheme + CSS 变量做亮/暗自适应。
 */
export function BarChart({
  data,
  height = 260,
  valueSuffix = "",
}: {
  data: BarDatum[];
  height?: number;
  valueSuffix?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof echarts.init> | null>(null);
  const { resolvedTheme } = useTheme();

  // 初始化一次，并监听容器尺寸变化
  useEffect(() => {
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

  // 数据或主题变化时重绘
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const dark = resolvedTheme === "dark";
    const textColor = cssVar("--foreground", dark ? "#e2e8f0" : "#0f172a");
    const mutedColor = cssVar("--muted-foreground", dark ? "#94a3b8" : "#64748b");
    const borderColor = cssVar("--border", dark ? "#1e293b" : "#e2e8f0");
    const primary = cssVar("--primary", dark ? "#3b82f6" : "#2563eb");

    const option: EChartsOption = {
      backgroundColor: "transparent",
      grid: { left: 4, right: 12, top: 28, bottom: 4, containLabel: true },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        valueFormatter: (v) => `${v}${valueSuffix}`,
      },
      xAxis: {
        type: "category",
        data: data.map((d) => d.label),
        axisLabel: {
          color: mutedColor,
          interval: 0,
          rotate: data.length > 6 ? 30 : 0,
          hideOverlap: true,
        },
        axisLine: { lineStyle: { color: borderColor } },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: mutedColor },
        splitLine: { lineStyle: { color: borderColor, type: "dashed" } },
      },
      series: [
        {
          type: "bar",
          data: data.map((d) => d.value),
          itemStyle: { color: primary, borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 40,
          label: {
            show: true,
            position: "top",
            color: textColor,
            fontSize: 11,
            formatter: (p) => `${p.value}${valueSuffix}`,
          },
        },
      ],
    };

    chart.setOption(option, true); // notMerge：数据变少时清掉旧系列
    chart.resize();
  }, [data, valueSuffix, resolvedTheme]);

  return <div ref={containerRef} style={{ width: "100%", height }} />;
}
