import { Card, CardContent } from "@/components/ui/card";

interface FinancialMetricsCardProps {
  label: string;
  value: string;
  change?: string;
  isPositive?: boolean;
}

export function FinancialMetricsCard({
  label,
  value,
  change,
  isPositive,
}: FinancialMetricsCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-xl font-bold">{value}</div>
        {change && (
          <div
            className={`mt-1 text-sm font-medium ${
              isPositive ? "text-red-500" : "text-green-600"
            }`}
          >
            {change}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
