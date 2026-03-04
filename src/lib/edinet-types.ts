export interface EdinetDocument {
  seqNumber: number;
  docID: string;
  edinetCode: string | null;
  secCode: string | null;
  JCN: string | null;
  filerName: string;
  fundCode: string | null;
  ordinanceCode: string | null;
  formCode: string | null;
  docTypeCode: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  submitDateTime: string;
  docDescription: string | null;
  issuerEdinetCode: string | null;
  subjectEdinetCode: string | null;
  subsidiaryEdinetCode: string | null;
  currentReportReason: string | null;
  parentDocID: string | null;
  opeDateTime: string | null;
  withdrawalStatus: string | null;
  docInfoEditStatus: string | null;
  disclosureStatus: string | null;
  xbrlFlag: string | null;
  pdfFlag: string | null;
  attachDocFlag: string | null;
  englishDocFlag: string | null;
  csvFlag: string | null;
  legalStatus: string | null;
}

export interface EdinetMetadata {
  title: string;
  parameter: {
    date: string;
    type: string;
  };
  resultset: {
    count: number;
  };
  processDateTime: string;
  status: string;
  message: string;
}

export interface EdinetDocumentsResponse {
  metadata: EdinetMetadata;
  results: EdinetDocument[];
}
