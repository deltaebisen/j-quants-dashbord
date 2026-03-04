import { format as fnsFormat } from "date-fns";

/** J-Quants 5桁コードから表示用4桁コードに変換 */
export function displayCode(code: string): string {
  return code.slice(0, 4);
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toLocaleString("ja-JP")}円`;
}

export function formatLargeNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_0000_0000_0000) {
    return `${sign}${(abs / 1_0000_0000_0000).toFixed(1)}兆円`;
  }
  if (abs >= 1_0000_0000) {
    return `${sign}${(abs / 1_0000_0000).toFixed(1)}億円`;
  }
  if (abs >= 1_0000) {
    return `${sign}${(abs / 1_0000).toFixed(1)}万円`;
  }
  return `${sign}${abs.toLocaleString("ja-JP")}円`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatVolume(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value >= 1_0000_0000) {
    return `${(value / 1_0000_0000).toFixed(1)}億株`;
  }
  if (value >= 1_0000) {
    return `${(value / 1_0000).toFixed(1)}万株`;
  }
  return `${value.toLocaleString("ja-JP")}株`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"));
  return fnsFormat(d, "yyyy/MM/dd");
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("ja-JP");
}

export function formatPriceChange(
  current: number | null | undefined,
  previous: number | null | undefined
): { value: string; percent: string; isPositive: boolean } {
  if (current == null || previous == null || previous === 0) {
    return { value: "—", percent: "—", isPositive: false };
  }
  const diff = current - previous;
  const pct = (diff / previous) * 100;
  const sign = diff > 0 ? "+" : "";
  return {
    value: `${sign}${diff.toFixed(2)}`,
    percent: `${sign}${pct.toFixed(2)}%`,
    isPositive: diff > 0,
  };
}
