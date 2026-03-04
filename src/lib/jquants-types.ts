export interface JQuantsResponse<T> {
  data: T[];
  pagination_key?: string;
}

export interface CompanyMaster {
  Date: string;
  Code: string;
  CoName: string;
  CoNameEn: string;
  S17: string;
  S17Nm: string;
  S33: string;
  S33Nm: string;
  ScaleCat: string;
  Mkt: string;
  MktNm: string;
  Mrgn: string;
  MrgnNm: string;
}

export interface DailyPrice {
  Date: string;
  Code: string;
  O: number | null;
  H: number | null;
  L: number | null;
  C: number | null;
  UL: string;
  LL: string;
  Vo: number | null;
  Va: number | null;
  AdjFactor: number | null;
  AdjO: number | null;
  AdjH: number | null;
  AdjL: number | null;
  AdjC: number | null;
  AdjVo: number | null;
}

export interface IndexPrice {
  Date: string;
  Code: string;
  O: number | null;
  H: number | null;
  L: number | null;
  C: number | null;
}

export interface FinancialSummary {
  DiscDate: string;
  DiscTime: string;
  Code: string;
  DiscNo: string;
  DocType: string;
  CurPerType: string;
  CurPerSt: string;
  CurPerEn: string;
  CurFYSt: string;
  CurFYEn: string;
  NxtFYSt: string;
  NxtFYEn: string;
  Sales: string;
  OP: string;
  OdP: string;
  NP: string;
  EPS: string;
  DEPS: string;
  TA: string;
  Eq: string;
  EqAR: string;
  BPS: string;
  CFO: string;
  CFI: string;
  CFF: string;
  CashEq: string;
  Div1Q: string;
  Div2Q: string;
  Div3Q: string;
  DivFY: string;
  DivAnn: string;
  DivUnit: string;
  DivTotalAnn: string;
  PayoutRatioAnn: string;
  FDiv1Q: string;
  FDiv2Q: string;
  FDiv3Q: string;
  FDivFY: string;
  FDivAnn: string;
  FDivUnit: string;
  FDivTotalAnn: string;
  FPayoutRatioAnn: string;
  NxFDiv1Q: string;
  NxFDiv2Q: string;
  NxFDiv3Q: string;
  NxFDivFY: string;
  NxFDivAnn: string;
  NxFDivUnit: string;
  NxFPayoutRatioAnn: string;
  FSales: string;
  FOP: string;
  FOdP: string;
  FNP: string;
  FEPS: string;
  NxFSales: string;
  NxFOP: string;
  NxFOdP: string;
  NxFNp: string;
  NxFEPS: string;
  MatChgSub: string;
  SigChgInC: string;
  ChgByASRev: string;
  ChgNoASRev: string;
  ChgAcEst: string;
  RetroRst: string;
  ShOutFY: string;
  TrShFY: string;
  AvgSh: string;
}

export interface MarginInterest {
  Date: string;
  Code: string;
  ShrtVol: number | null;
  LongVol: number | null;
  ShrtNegVol: number | null;
  LongNegVol: number | null;
  ShrtStdVol: number | null;
  LongStdVol: number | null;
  IssType: string;
}

export interface ShortRatio {
  Date: string;
  Code: string;
  Sell: number | null;
  SellShort: number | null;
  SellShortWoR: number | null;
  Total: number | null;
  Ratio: number | null;
}

export interface TradingBreakdown {
  Date: string;
  Code: string;
  LongSellVa: number | null;
  ShrtNoMrgnVa: number | null;
  MrgnSellNewVa: number | null;
  MrgnSellCloseVa: number | null;
  LongBuyVa: number | null;
  MrgnBuyNewVa: number | null;
  MrgnBuyCloseVa: number | null;
  LongSellVo: number | null;
  ShrtNoMrgnVo: number | null;
  MrgnSellNewVo: number | null;
  MrgnSellCloseVo: number | null;
  LongBuyVo: number | null;
  MrgnBuyNewVo: number | null;
  MrgnBuyCloseVo: number | null;
}
