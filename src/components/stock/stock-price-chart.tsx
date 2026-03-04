"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, CrosshairMode, CandlestickSeries } from "lightweight-charts";
import type { DailyPrice } from "@/lib/jquants-types";

interface StockPriceChartProps {
  prices: DailyPrice[];
}

export function StockPriceChart({ prices }: StockPriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || prices.length === 0) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "rgba(156, 163, 175, 0.1)" },
        horzLines: { color: "rgba(156, 163, 175, 0.1)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: "rgba(156, 163, 175, 0.2)",
      },
      timeScale: {
        borderColor: "rgba(156, 163, 175, 0.2)",
        timeVisible: false,
      },
    });

    // Japanese style: bullish (up) = red, bearish (down) = blue/green
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#ef4444",
      downColor: "#3b82f6",
      borderUpColor: "#ef4444",
      borderDownColor: "#3b82f6",
      wickUpColor: "#ef4444",
      wickDownColor: "#3b82f6",
    });

    const data = prices
      .filter(
        (p) =>
          p.AdjO != null &&
          p.AdjH != null &&
          p.AdjL != null &&
          p.AdjC != null
      )
      .map((p) => ({
        time: p.Date as string,
        open: p.AdjO as number,
        high: p.AdjH as number,
        low: p.AdjL as number,
        close: p.AdjC as number,
      }));

    candlestickSeries.setData(data);
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

  if (prices.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center text-muted-foreground">
        データがありません
      </div>
    );
  }

  return <div ref={chartContainerRef} className="h-[400px] w-full" />;
}
