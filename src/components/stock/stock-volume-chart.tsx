"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, HistogramSeries } from "lightweight-charts";
import type { DailyPrice } from "@/lib/jquants-types";

interface StockVolumeChartProps {
  prices: DailyPrice[];
}

export function StockVolumeChart({ prices }: StockVolumeChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || prices.length === 0) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 150,
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
      timeScale: {
        borderColor: "rgba(156, 163, 175, 0.2)",
        timeVisible: false,
      },
      crosshair: {
        vertLine: { visible: true },
        horzLine: { visible: true },
      },
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });

    const data = prices
      .filter(
        (p) =>
          p.AdjVo != null &&
          p.AdjC != null &&
          p.AdjO != null
      )
      .map((p) => ({
        time: p.Date as string,
        value: p.AdjVo as number,
        color:
          (p.AdjC as number) >= (p.AdjO as number)
            ? "rgba(239, 68, 68, 0.5)"
            : "rgba(59, 130, 246, 0.5)",
      }));

    volumeSeries.setData(data);
    chart.timeScale().fitContent();

    const handleResize = () => {
      chart.applyOptions({ width: container.clientWidth });
    };
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [prices]);

  if (prices.length === 0) return null;

  return <div ref={chartContainerRef} className="h-[150px] w-full" />;
}
