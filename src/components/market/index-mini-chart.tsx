"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, LineSeries } from "lightweight-charts";
import type { IndexPrice } from "@/lib/jquants-types";

interface IndexMiniChartProps {
  prices: IndexPrice[];
  isPositive: boolean;
}

export function IndexMiniChart({ prices, isPositive }: IndexMiniChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || prices.length === 0) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 64,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "transparent",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      rightPriceScale: { visible: false },
      timeScale: { visible: false },
      handleScroll: false,
      handleScale: false,
      crosshair: {
        vertLine: { visible: false },
        horzLine: { visible: false },
      },
    });

    const lineColor = isPositive ? "#ef4444" : "#16a34a";

    const lineSeries = chart.addSeries(LineSeries, {
      color: lineColor,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    const data = prices
      .filter((p) => p.C != null)
      .map((p) => ({
        time: p.Date as string,
        value: p.C as number,
      }));

    lineSeries.setData(data);
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
  }, [prices, isPositive]);

  return <div ref={chartContainerRef} className="h-full w-full" />;
}
