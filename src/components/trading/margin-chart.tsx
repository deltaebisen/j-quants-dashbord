"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, LineSeries } from "lightweight-charts";
import type { MarginInterest, DailyPrice } from "@/lib/jquants-types";

interface MarginChartProps {
  data: MarginInterest[];
  prices: DailyPrice[];
}

export function MarginChart({ data, prices }: MarginChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || data.length === 0) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 300,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "rgba(156, 163, 175, 0.1)" },
        horzLines: { color: "rgba(156, 163, 175, 0.1)" },
      },
      rightPriceScale: {
        borderColor: "rgba(156, 163, 175, 0.2)",
      },
      leftPriceScale: {
        visible: true,
        borderColor: "rgba(156, 163, 175, 0.2)",
      },
      timeScale: {
        borderColor: "rgba(156, 163, 175, 0.2)",
        timeVisible: false,
      },
    });

    // 買残 (Long) - red line
    const longSeries = chart.addSeries(LineSeries, {
      color: "#ef4444",
      lineWidth: 2,
      title: "",
      priceScaleId: "left",
    });

    // 売残 (Short) - blue line
    const shortSeries = chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 2,
      title: "",
      priceScaleId: "left",
    });

    // 株価 - line on right scale
    const priceSeries = chart.addSeries(LineSeries, {
      color: "#a855f7",
      lineWidth: 2,
      title: "",
      priceScaleId: "right",
    });

    const sorted = [...data].sort((a, b) => a.Date.localeCompare(b.Date));

    longSeries.setData(
      sorted
        .filter((d) => d.LongStdVol != null)
        .map((d) => ({ time: d.Date as string, value: d.LongStdVol as number }))
    );

    shortSeries.setData(
      sorted
        .filter((d) => d.ShrtStdVol != null)
        .map((d) => ({ time: d.Date as string, value: d.ShrtStdVol as number }))
    );

    // 信用残の日付範囲に合わせて価格をフィルタ
    const marginDates = new Set(sorted.map((d) => d.Date));
    const sortedPrices = [...prices]
      .filter((p) => p.AdjC != null && marginDates.has(p.Date))
      .sort((a, b) => a.Date.localeCompare(b.Date));

    priceSeries.setData(
      sortedPrices.map((p) => ({
        time: p.Date as string,
        value: p.AdjC as number,
      }))
    );

    chart.timeScale().fitContent();

    const observer = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth });
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [data, prices]);

  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-[300px] items-center justify-center">
        データがありません
      </div>
    );
  }

  return (
    <div>
      <div ref={chartContainerRef} className="h-[300px] w-full" />
      <div className="mt-2 flex items-center justify-center gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-4 bg-[#ef4444]" />
          制度買残
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-4 bg-[#3b82f6]" />
          制度売残
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-4 bg-[#a855f7]" />
          株価
        </span>
      </div>
    </div>
  );
}
