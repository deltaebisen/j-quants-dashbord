"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
  type MouseEventParams,
  type Time,
} from "lightweight-charts";
import type {
  DailyPrice,
  MarginInterest,
  FinancialSummary,
} from "@/lib/jquants-types";
import type { FloatingSharesData } from "@/lib/edinet-shareholders-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFloatingShares } from "@/hooks/use-floating-shares";

interface TurnoverChartsProps {
  code: string;
}

interface TurnoverDataPoint {
  time: string;
  value: number;
}

function calcTurnoverRate(
  prices: DailyPrice[],
  floatingShares: number
): TurnoverDataPoint[] {
  if (floatingShares <= 0) return [];
  return prices
    .filter((p) => p.Vo != null && p.Vo > 0)
    .map((p) => ({
      time: p.Date,
      value: ((p.Vo as number) / floatingShares) * 100,
    }));
}

function calcVolumeCoverageDays(
  marginData: MarginInterest[],
  prices: DailyPrice[],
  field: "LongStdVol" | "LongNegVol"
): TurnoverDataPoint[] {
  const dailyVol = [...prices]
    .filter((p) => p.Vo != null && p.Vo > 0)
    .sort((a, b) => a.Date.localeCompare(b.Date))
    .map((p) => ({ date: p.Date, vol: p.Vo as number }));

  if (dailyVol.length === 0) return [];

  const sortedMargin = [...marginData]
    .filter((m) => m[field] != null && (m[field] as number) > 0)
    .sort((a, b) => a.Date.localeCompare(b.Date));

  return sortedMargin.map((m) => {
    const upTo = dailyVol.filter((d) => d.date <= m.Date);
    const recent = upTo.slice(-5);
    const avgVol =
      recent.length > 0
        ? recent.reduce((a, b) => a + b.vol, 0) / recent.length
        : 0;
    const days = avgVol > 0 ? (m[field] as number) / avgVol : 0;
    return { time: m.Date, value: days };
  });
}

const CHART_LAYOUT = {
  layout: {
    background: { type: ColorType.Solid, color: "transparent" } as const,
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
} as const;

interface ChartEntry {
  chart: IChartApi;
  series: ISeriesApi<SeriesType>;
  dataMap: Map<string, number>;
}

function setupChartSync(entries: ChartEntry[]) {
  let isSyncing = false;

  for (const source of entries) {
    // Crosshair sync
    source.chart.subscribeCrosshairMove((param: MouseEventParams) => {
      if (isSyncing) return;
      isSyncing = true;

      for (const target of entries) {
        if (target === source) continue;
        if (param.time) {
          const value = target.dataMap.get(param.time as string);
          if (value !== undefined) {
            target.chart.setCrosshairPosition(
              value,
              param.time as Time,
              target.series
            );
          }
        } else {
          target.chart.clearCrosshairPosition();
        }
      }

      isSyncing = false;
    });

    // Time scale (zoom/scroll) sync — time-based for mixed daily/weekly data
    source.chart
      .timeScale()
      .subscribeVisibleTimeRangeChange((range) => {
        if (isSyncing || !range) return;
        isSyncing = true;

        for (const target of entries) {
          if (target === source) continue;
          target.chart.timeScale().setVisibleRange(range);
        }

        isSyncing = false;
      });
  }
}

function buildDataMap(data: TurnoverDataPoint[]): Map<string, number> {
  return new Map(data.map((d) => [d.time, d.value]));
}

function SyncedCharts({
  priceData,
  turnoverData,
  stdDaysData,
  negDaysData,
  floatingSharesInfo,
}: {
  priceData: TurnoverDataPoint[];
  turnoverData: TurnoverDataPoint[];
  stdDaysData: TurnoverDataPoint[];
  negDaysData: TurnoverDataPoint[];
  floatingSharesInfo: FloatingSharesData | null;
}) {
  const priceRef = useRef<HTMLDivElement>(null);
  const turnoverRef = useRef<HTMLDivElement>(null);
  const coverageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pc = priceRef.current;
    const tc = turnoverRef.current;
    const cc = coverageRef.current;
    if (!pc || !tc || !cc) return;

    const charts: IChartApi[] = [];
    const observers: ResizeObserver[] = [];

    function makeChart(container: HTMLElement, height: number) {
      const chart = createChart(container, {
        width: container.clientWidth,
        height,
        ...CHART_LAYOUT,
      });
      charts.push(chart);

      const obs = new ResizeObserver(() => {
        chart.applyOptions({ width: container.clientWidth });
      });
      obs.observe(container);
      observers.push(obs);

      return chart;
    }

    // 1. Price chart
    const priceChart = makeChart(pc, 200);
    const priceSeries = priceChart.addSeries(LineSeries, {
      color: "#6366f1",
      lineWidth: 2,
    });
    priceSeries.setData(priceData);
    priceChart.timeScale().fitContent();

    // 2. Turnover rate chart
    const turnoverChart = makeChart(tc, 250);
    const turnoverSeries = turnoverChart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 2,
      priceFormat: {
        type: "custom",
        formatter: (v: number) => v.toFixed(3) + "%",
      },
    });
    turnoverSeries.setData(turnoverData);
    turnoverChart.timeScale().fitContent();

    // 3. Coverage days chart
    const coverageChart = makeChart(cc, 250);
    const daysFmt = {
      type: "custom" as const,
      formatter: (v: number) => v.toFixed(1) + "日",
    };
    const stdSeries = coverageChart.addSeries(LineSeries, {
      color: "#10b981",
      lineWidth: 2,
      priceFormat: daysFmt,
    });
    stdSeries.setData(stdDaysData);

    const negSeries = coverageChart.addSeries(LineSeries, {
      color: "#8b5cf6",
      lineWidth: 2,
      priceFormat: daysFmt,
    });
    negSeries.setData(negDaysData);
    coverageChart.timeScale().fitContent();

    // Crosshair sync
    const entries: ChartEntry[] = [
      { chart: priceChart, series: priceSeries, dataMap: buildDataMap(priceData) },
      { chart: turnoverChart, series: turnoverSeries, dataMap: buildDataMap(turnoverData) },
      { chart: coverageChart, series: stdSeries, dataMap: buildDataMap(stdDaysData) },
    ];
    setupChartSync(entries);

    return () => {
      observers.forEach((o) => o.disconnect());
      charts.forEach((c) => c.remove());
    };
  }, [priceData, turnoverData, stdDaysData, negDaysData]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>株価</CardTitle>
        </CardHeader>
        <CardContent>
          {priceData.length > 0 ? (
            <div ref={priceRef} className="h-[200px] w-full" />
          ) : (
            <div className="text-muted-foreground flex h-[200px] items-center justify-center">
              データがありません
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>売買回転率の推移</CardTitle>
        </CardHeader>
        <CardContent>
          {turnoverData.length > 0 ? (
            <div ref={turnoverRef} className="h-[250px] w-full" />
          ) : (
            <div className="text-muted-foreground flex h-[250px] items-center justify-center">
              データがありません
            </div>
          )}
          <p className="text-muted-foreground mt-2 text-xs">
            売買回転率 = 出来高 / 浮動株数 (%)
            {floatingSharesInfo?.source === "edinet" && floatingSharesInfo.periodEnd && (
              <span className="ml-2 text-emerald-600">
                （有報 {floatingSharesInfo.periodEnd.slice(0, 7).replace("-", "/")}期）
              </span>
            )}
            {floatingSharesInfo?.source === "fallback" && (
              <span className="ml-2 text-amber-600">（推計値）</span>
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>出来高対比日数の推移</CardTitle>
        </CardHeader>
        <CardContent>
          {stdDaysData.length > 0 || negDaysData.length > 0 ? (
            <>
              <div ref={coverageRef} className="h-[250px] w-full" />
              <div className="mt-2 flex items-center justify-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-0.5 w-4 bg-[#10b981]" />
                  制度信用
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-0.5 w-4 bg-[#8b5cf6]" />
                  一般信用
                </span>
              </div>
            </>
          ) : (
            <div className="text-muted-foreground flex h-[250px] items-center justify-center">
              データがありません
            </div>
          )}
          <p className="text-muted-foreground mt-2 text-xs">
            出来高対比日数 = 信用買残 / 出来高5日移動平均（信用買残が全出来高の何日分か）
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function TurnoverCharts({ code }: TurnoverChartsProps) {
  const [priceData, setPriceData] = useState<TurnoverDataPoint[]>([]);
  const [turnoverData, setTurnoverData] = useState<TurnoverDataPoint[]>([]);
  const [stdDaysData, setStdDaysData] = useState<TurnoverDataPoint[]>([]);
  const [negDaysData, setNegDaysData] = useState<TurnoverDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: floatingSharesData } = useFloatingShares(code);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [priceRes, marginRes, finsRes] = await Promise.all([
          fetch(`/api/jquants/equities/bars/daily?code=${code}`),
          fetch(`/api/jquants/markets/margin-interest?code=${code}`),
          fetch(`/api/jquants/fins/summary?code=${code}`),
        ]);

        const prices: DailyPrice[] = priceRes.ok ? await priceRes.json() : [];
        const margin: MarginInterest[] = marginRes.ok
          ? await marginRes.json()
          : [];
        const fins: FinancialSummary[] = finsRes.ok
          ? await finsRes.json()
          : [];

        const sortedPrices = [...prices].sort((a, b) =>
          a.Date.localeCompare(b.Date)
        );

        const latestFins = fins.length > 0 ? fins[fins.length - 1] : null;
        const totalShares = latestFins ? Number(latestFins.ShOutFY) || 0 : 0;
        const treasuryShares = latestFins ? Number(latestFins.TrShFY) || 0 : 0;
        const basicFloating = totalShares - treasuryShares;

        // Use EDINET floating shares if available
        const floatingShares =
          floatingSharesData?.source === "edinet"
            ? floatingSharesData.floatingShares
            : basicFloating;

        setPriceData(
          sortedPrices
            .filter((p) => p.AdjC != null)
            .map((p) => ({ time: p.Date, value: p.AdjC as number }))
        );
        setTurnoverData(calcTurnoverRate(sortedPrices, floatingShares));
        setStdDaysData(calcVolumeCoverageDays(margin, sortedPrices, "LongStdVol"));
        setNegDaysData(calcVolumeCoverageDays(margin, sortedPrices, "LongNegVol"));
      } catch {
        setPriceData([]);
        setTurnoverData([]);
        setStdDaysData([]);
        setNegDaysData([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [code, floatingSharesData]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[270px] rounded-lg" />
        <Skeleton className="h-[320px] rounded-lg" />
        <Skeleton className="h-[320px] rounded-lg" />
      </div>
    );
  }

  return (
    <SyncedCharts
      priceData={priceData}
      turnoverData={turnoverData}
      stdDaysData={stdDaysData}
      negDaysData={negDaysData}
      floatingSharesInfo={floatingSharesData}
    />
  );
}
