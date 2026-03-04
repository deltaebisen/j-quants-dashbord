"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StockPriceInfo } from "./stock-price-info";
import { PeriodSelector } from "./period-selector";
import { StockPriceChart } from "./stock-price-chart";
import { StockVolumeChart } from "./stock-volume-chart";
import { FinancialSummary } from "@/components/financial/financial-summary";
import { TradingTabs } from "@/components/trading/trading-tabs";
import { TurnoverCharts } from "@/components/trading/turnover-charts";
import { useStockPrices } from "@/hooks/use-stock-prices";
import { PERIOD_OPTIONS } from "@/lib/constants";

interface StockDetailClientProps {
  code: string;
}

export function StockDetailClient({ code }: StockDetailClientProps) {
  const [period, setPeriod] = useState("3m");
  const days =
    PERIOD_OPTIONS.find((p) => p.value === period)?.days ?? 90;
  const { prices, isLoading } = useStockPrices(code, days);

  const latest = prices.length > 0 ? prices[prices.length - 1] : null;
  const previous = prices.length >= 2 ? prices[prices.length - 2] : null;

  return (
    <Tabs defaultValue="chart" className="space-y-4">
      <TabsList>
        <TabsTrigger value="chart">チャート</TabsTrigger>
        <TabsTrigger value="financial">財務サマリー</TabsTrigger>
        <TabsTrigger value="trading">信用取引</TabsTrigger>
        <TabsTrigger value="turnover">回転率</TabsTrigger>
      </TabsList>

      <TabsContent value="chart" className="space-y-4">
        {isLoading ? (
          <>
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-[400px] rounded-lg" />
          </>
        ) : (
          <>
            <StockPriceInfo latest={latest} previous={previous} />
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>株価チャート</CardTitle>
                <PeriodSelector selected={period} onSelect={setPeriod} />
              </CardHeader>
              <CardContent>
                <StockPriceChart prices={prices} />
                <div className="mt-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    出来高
                  </div>
                  <StockVolumeChart prices={prices} />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </TabsContent>

      <TabsContent value="financial">
        <FinancialSummary code={code} />
      </TabsContent>

      <TabsContent value="trading">
        <TradingTabs code={code} />
      </TabsContent>

      <TabsContent value="turnover">
        <TurnoverCharts code={code} />
      </TabsContent>
    </Tabs>
  );
}
