export interface MajorShareholder {
  name: string;
  shares: number;
  holdingRatio: number;
}

export interface MajorShareholderResult {
  shareholders: MajorShareholder[];
  totalShares: number;
  totalHoldingRatio: number;
  docID: string;
  periodEnd: string;
}

export interface FloatingSharesData {
  floatingShares: number;
  majorShareholderShares: number;
  majorShareholderRatio: number;
  shareholders: MajorShareholder[];
  source: "edinet" | "fallback";
  docID: string | null;
  periodEnd: string | null;
}
