"use client";

import { useEffect, useState } from "react";
import type { MarginInterest, DailyPrice } from "@/lib/jquants-types";
import { formatDate, formatNumber } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MarginChart } from "./margin-chart";

function calcRatio(long: number | null, short: number | null): string {
  if (short == null || short === 0 || long == null) return "—";
  return (long / short).toFixed(2);
}

function calcTurnoverDays(
  marginVol: number | null,
  prices: DailyPrice[]
): string {
  if (marginVol == null || marginVol === 0 || prices.length === 0) return "—";
  const recent = prices.slice(-20);
  const volumes = recent
    .map((p) => p.Vo)
    .filter((v): v is number => v != null && v > 0);
  if (volumes.length === 0) return "—";
  const avgVol = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  if (avgVol === 0) return "—";
  return (marginVol / avgVol).toFixed(1);
}

interface MarginTradingTableProps {
  code: string;
}

export function MarginTradingTable({ code }: MarginTradingTableProps) {
  const [data, setData] = useState<MarginInterest[]>([]);
  const [prices, setPrices] = useState<DailyPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [marginRes, priceRes] = await Promise.all([
          fetch(`/api/jquants/markets/margin-interest?code=${code}`),
          fetch(`/api/jquants/equities/bars/daily?code=${code}`),
        ]);
        if (marginRes.ok) setData(await marginRes.json());
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
    return <Skeleton className="h-64 rounded-lg" />;
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          信用取引データがありません
        </CardContent>
      </Card>
    );
  }

  const entries = data.slice(-20).reverse();
  const latest = data[data.length - 1];
  const sortedPrices = [...prices].sort((a, b) =>
    a.Date.localeCompare(b.Date)
  );

  const longTurnover = calcTurnoverDays(latest?.LongStdVol, sortedPrices);
  const shortTurnover = calcTurnoverDays(latest?.ShrtStdVol, sortedPrices);
  const marginRatio = calcRatio(latest?.LongVol, latest?.ShrtVol);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-muted-foreground text-xs">
              信用買残回転日数
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums">
              {longTurnover}
              {longTurnover !== "—" && (
                <span className="text-muted-foreground ml-1 text-sm font-normal">
                  日
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-muted-foreground text-xs">
              信用売残回転日数
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums">
              {shortTurnover}
              {shortTurnover !== "—" && (
                <span className="text-muted-foreground ml-1 text-sm font-normal">
                  日
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-muted-foreground text-xs">貸借倍率</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">
              {marginRatio}
              {marginRatio !== "—" && (
                <span className="text-muted-foreground ml-1 text-sm font-normal">
                  倍
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>信用残推移</CardTitle>
        </CardHeader>
        <CardContent>
          <MarginChart data={data} prices={prices} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>信用残明細</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead rowSpan={2} className="align-bottom">
                    日付
                  </TableHead>
                  <TableHead
                    colSpan={3}
                    className="border-b text-center"
                  >
                    制度信用
                  </TableHead>
                  <TableHead
                    colSpan={3}
                    className="border-b text-center"
                  >
                    一般信用
                  </TableHead>
                  <TableHead rowSpan={2} className="text-right align-bottom">
                    貸借倍率
                  </TableHead>
                </TableRow>
                <TableRow>
                  <TableHead className="text-right">売残</TableHead>
                  <TableHead className="text-right">買残</TableHead>
                  <TableHead className="text-right">倍率</TableHead>
                  <TableHead className="text-right">売残</TableHead>
                  <TableHead className="text-right">買残</TableHead>
                  <TableHead className="text-right">倍率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((row) => (
                  <TableRow key={row.Date}>
                    <TableCell>{formatDate(row.Date)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.ShrtStdVol)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.LongStdVol)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {calcRatio(row.LongStdVol, row.ShrtStdVol)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.ShrtNegVol)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.LongNegVol)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {calcRatio(row.LongNegVol, row.ShrtNegVol)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {calcRatio(row.LongVol, row.ShrtVol)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
