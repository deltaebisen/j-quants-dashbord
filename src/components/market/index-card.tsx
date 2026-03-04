"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, formatPriceChange } from "@/lib/format";
import type { IndexPrice } from "@/lib/jquants-types";
import { IndexMiniChart } from "./index-mini-chart";

interface IndexCardProps {
  name: string;
  prices: IndexPrice[];
}

export function IndexCard({ name, prices }: IndexCardProps) {
  const latest = prices[prices.length - 1];
  const previous = prices.length >= 2 ? prices[prices.length - 2] : null;
  const change = formatPriceChange(latest?.C, previous?.C);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {latest?.C != null ? formatNumber(latest.C) : "—"}
        </div>
        <div
          className={`text-sm font-medium ${
            change.isPositive ? "text-red-500" : "text-green-600"
          }`}
        >
          {change.value !== "—" ? `${change.value} (${change.percent})` : "—"}
        </div>
        {prices.length > 1 && (
          <div className="mt-2 h-16">
            <IndexMiniChart prices={prices} isPositive={change.isPositive} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
