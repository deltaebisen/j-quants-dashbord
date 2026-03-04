import { Card, CardContent } from "@/components/ui/card";
import { formatNumber, formatPriceChange, formatVolume } from "@/lib/format";
import type { DailyPrice } from "@/lib/jquants-types";

interface StockPriceInfoProps {
  latest: DailyPrice | null;
  previous: DailyPrice | null;
}

export function StockPriceInfo({ latest, previous }: StockPriceInfoProps) {
  if (!latest) return null;

  const change = formatPriceChange(latest.AdjC, previous?.AdjC);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-baseline gap-4">
          <div className="text-3xl font-bold">
            {latest.AdjC != null
              ? `¥${formatNumber(latest.AdjC)}`
              : "—"}
          </div>
          <div
            className={`text-lg font-medium ${
              change.isPositive ? "text-red-500" : "text-green-600"
            }`}
          >
            {change.value !== "—"
              ? `${change.value} (${change.percent})`
              : "—"}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <div className="text-sm text-muted-foreground">始値</div>
            <div className="font-medium">
              {latest.AdjO != null
                ? `¥${formatNumber(latest.AdjO)}`
                : "—"}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">高値</div>
            <div className="font-medium text-red-500">
              {latest.AdjH != null
                ? `¥${formatNumber(latest.AdjH)}`
                : "—"}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">安値</div>
            <div className="font-medium text-green-600">
              {latest.AdjL != null
                ? `¥${formatNumber(latest.AdjL)}`
                : "—"}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">出来高</div>
            <div className="font-medium">
              {formatVolume(latest.AdjVo)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
