"use client";

import { useEffect, useState } from "react";
import type { FinancialSummary as FinancialSummaryType, DailyPrice } from "@/lib/jquants-types";
import { format, subDays } from "date-fns";
import { formatLargeNumber, formatNumber, formatCurrency, formatVolume } from "@/lib/format";
import { FinancialMetricsCard } from "./financial-metrics-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFloatingShares } from "@/hooks/use-floating-shares";

interface FinancialSummaryProps {
  code: string;
}

function toNum(v: string | number | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function calcChange(
  current: number | null,
  previous: number | null
): { text: string; isPositive: boolean } | undefined {
  if (current == null || previous == null || previous === 0) return undefined;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const sign = pct > 0 ? "+" : "";
  return { text: `前期比 ${sign}${pct.toFixed(1)}%`, isPositive: pct > 0 };
}

function avgVolume(prices: DailyPrice[], days: number): number | null {
  const recent = prices.slice(-days);
  if (recent.length === 0) return null;
  const vols = recent.map((p) => p.Vo).filter((v): v is number => v != null);
  if (vols.length === 0) return null;
  return vols.reduce((a, b) => a + b, 0) / vols.length;
}

export function FinancialSummary({ code }: FinancialSummaryProps) {
  const [data, setData] = useState<FinancialSummaryType[]>([]);
  const [prices, setPrices] = useState<DailyPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: floatingSharesData } = useFloatingShares(code);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [finsRes, priceRes] = await Promise.all([
          fetch(`/api/jquants/fins/summary?code=${code}`),
          fetch(
            `/api/jquants/equities/bars/daily?code=${code}&from=${format(subDays(new Date(), 30), "yyyyMMdd")}&to=${format(new Date(), "yyyyMMdd")}`
          ),
        ]);
        if (finsRes.ok) setData(await finsRes.json());
        if (priceRes.ok) setPrices(await priceRes.json());
      } catch {
        setData([]);
        setPrices([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [code]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          財務データがありません
        </CardContent>
      </Card>
    );
  }

  // Get the latest and previous entries
  const latest = data[data.length - 1];
  const previous = data.length >= 2 ? data[data.length - 2] : null;

  const sales = toNum(latest.Sales);
  const op = toNum(latest.OP);
  const odp = toNum(latest.OdP);
  const np = toNum(latest.NP);
  const eps = toNum(latest.EPS);
  const bps = toNum(latest.BPS);
  const eqar = toNum(latest.EqAR);
  const fDivAnn = toNum(latest.FDivAnn);
  const shOutFY = toNum(latest.ShOutFY);
  const trShFY = toNum(latest.TrShFY);
  const basicFloating =
    shOutFY != null && trShFY != null ? shOutFY - trShFY : null;

  // Use EDINET floating shares if available, otherwise fallback
  const isEdinetSource = floatingSharesData?.source === "edinet";
  const floatingShares =
    isEdinetSource && floatingSharesData
      ? floatingSharesData.floatingShares
      : basicFloating;
  const majorShareholderShares =
    isEdinetSource && floatingSharesData
      ? floatingSharesData.majorShareholderShares
      : 0;

  // 回転率の分母: EDINETありなら浮動株、なければ流通株式数
  const turnoverBase = isEdinetSource ? floatingShares : basicFloating;

  const latestVol = prices.length > 0 ? prices[prices.length - 1].Vo : null;
  const avg5Vol = avgVolume(prices, 5);
  const avg25Vol = avgVolume(prices, 25);
  const turnoverDaily =
    latestVol != null && turnoverBase != null && turnoverBase > 0
      ? latestVol / turnoverBase
      : null;
  const turnover5d =
    avg5Vol != null && turnoverBase != null && turnoverBase > 0
      ? avg5Vol / turnoverBase
      : null;
  const turnover25d =
    avg25Vol != null && turnoverBase != null && turnoverBase > 0
      ? avg25Vol / turnoverBase
      : null;

  const salesChange = calcChange(sales, toNum(previous?.Sales));
  const opChange = calcChange(op, toNum(previous?.OP));
  const odpChange = calcChange(odp, toNum(previous?.OdP));
  const npChange = calcChange(np, toNum(previous?.NP));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>主要財務指標</CardTitle>
          <p className="text-sm text-muted-foreground">
            決算期間: {latest.CurPerSt} 〜 {latest.CurPerEn}
          </p>
        </CardHeader>
      </Card>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FinancialMetricsCard
          label="売上高"
          value={formatLargeNumber(sales)}
          change={salesChange?.text}
          isPositive={salesChange?.isPositive}
        />
        <FinancialMetricsCard
          label="営業利益"
          value={formatLargeNumber(op)}
          change={opChange?.text}
          isPositive={opChange?.isPositive}
        />
        <FinancialMetricsCard
          label="経常利益"
          value={formatLargeNumber(odp)}
          change={odpChange?.text}
          isPositive={odpChange?.isPositive}
        />
        <FinancialMetricsCard
          label="純利益"
          value={formatLargeNumber(np)}
          change={npChange?.text}
          isPositive={npChange?.isPositive}
        />
        <FinancialMetricsCard
          label="EPS"
          value={
            eps != null
              ? `${formatNumber(eps)}円`
              : "—"
          }
        />
        <FinancialMetricsCard
          label="BPS"
          value={
            bps != null
              ? `${formatNumber(bps)}円`
              : "—"
          }
        />
        <FinancialMetricsCard
          label="配当（予想）"
          value={formatCurrency(fDivAnn)}
        />
        <FinancialMetricsCard
          label="自己資本比率"
          value={
            eqar != null
              ? `${(eqar * 100).toFixed(1)}%`
              : "—"
          }
        />
        <FinancialMetricsCard
          label="発行済株式数"
          value={formatVolume(shOutFY)}
        />
        <FinancialMetricsCard
          label="自己株式数"
          value={formatVolume(trShFY)}
        />
        <FinancialMetricsCard
          label="流通株式数"
          value={formatVolume(basicFloating)}
          change={
            basicFloating != null && shOutFY != null && shOutFY > 0
              ? `発行済の ${((basicFloating / shOutFY) * 100).toFixed(1)}%（自己株控除）`
              : undefined
          }
        />
        <FinancialMetricsCard
          label="浮動株数"
          value={isEdinetSource ? formatVolume(floatingShares) : "—"}
          change={
            isEdinetSource && floatingShares != null && shOutFY != null && shOutFY > 0
              ? `発行済の ${((floatingShares / shOutFY) * 100).toFixed(1)}%（大株主 ${formatVolume(majorShareholderShares)} 控除）`
              : !isEdinetSource
                ? "有報データ未取得"
                : undefined
          }
        />
        <FinancialMetricsCard
          label={`売買回転率（当日${isEdinetSource ? "・浮動株" : ""}）`}
          value={
            turnoverDaily != null
              ? `${(turnoverDaily * 100).toFixed(2)}%`
              : "—"
          }
          change={
            latestVol != null ? `出来高 ${formatVolume(latestVol)}` : undefined
          }
        />
        <FinancialMetricsCard
          label={`売買回転率（5日平均${isEdinetSource ? "・浮動株" : ""}）`}
          value={
            turnover5d != null
              ? `${(turnover5d * 100).toFixed(2)}%`
              : "—"
          }
        />
        <FinancialMetricsCard
          label={`売買回転率（25日平均${isEdinetSource ? "・浮動株" : ""}）`}
          value={
            turnover25d != null
              ? `${(turnover25d * 100).toFixed(2)}%`
              : "—"
          }
        />
      </div>
    </div>
  );
}
