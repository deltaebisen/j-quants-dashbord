import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import type { EdinetDocument } from "./edinet-types";
import type {
  MajorShareholder,
  MajorShareholderResult,
} from "./edinet-shareholders-types";

// --- Singleton DB connection ---

let db: Database.Database | null = null;

function getDbPath(): string {
  if (process.env.EDINET_DB_PATH) {
    return process.env.EDINET_DB_PATH;
  }
  // Default: data/edinet.db in project root
  return path.join(process.cwd(), "data", "edinet.db");
}

export function getDb(): Database.Database | null {
  if (db) return db;

  const dbPath = getDbPath();

  // Check if DB file exists
  if (!fs.existsSync(dbPath)) {
    console.warn(`[EDINET DB] Database not found at ${dbPath}. Run 'npm run edinet:fetch' to create it.`);
    return null;
  }

  try {
    db = new Database(dbPath, { readonly: true });
    db.pragma("journal_mode = WAL");
    return db;
  } catch (err) {
    console.error("[EDINET DB] Failed to open database:", err);
    return null;
  }
}

/**
 * Open DB in write mode (for batch scripts).
 */
export function getWritableDb(): Database.Database {
  const dbPath = getDbPath();

  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const writeDb = new Database(dbPath);
  writeDb.pragma("journal_mode = WAL");
  initSchema(writeDb);
  return writeDb;
}

function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS edinet_documents (
      doc_id TEXT PRIMARY KEY,
      sec_code TEXT,
      edinet_code TEXT,
      filer_name TEXT,
      doc_type_code TEXT,
      doc_description TEXT,
      period_start TEXT,
      period_end TEXT,
      submit_date TEXT,
      xbrl_flag TEXT,
      pdf_flag TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_doc_seccode_type
      ON edinet_documents(sec_code, doc_type_code);
    CREATE INDEX IF NOT EXISTS idx_doc_submit_date
      ON edinet_documents(submit_date);

    CREATE TABLE IF NOT EXISTS shareholder_cache (
      sec_code TEXT PRIMARY KEY,
      doc_id TEXT,
      period_end TEXT,
      total_shares INTEGER,
      total_holding_ratio REAL,
      shareholders_json TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fetch_log (
      date TEXT PRIMARY KEY,
      doc_count INTEGER,
      fetched_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

// --- Document queries ---

/**
 * Find the latest annual report (docTypeCode=120) for a secCode.
 * Returns the most recent by period_end, then submit_date.
 */
export function findAnnualReportInDb(
  secCode: string
): EdinetDocument | null {
  const database = getDb();
  if (!database) return null;

  try {
    const row = database
      .prepare(
        `SELECT * FROM edinet_documents
         WHERE sec_code = ? AND doc_type_code = '120' AND xbrl_flag = '1'
         ORDER BY period_end DESC, submit_date DESC
         LIMIT 1`
      )
      .get(secCode) as DbDocRow | undefined;

    if (!row) return null;
    return rowToEdinetDocument(row);
  } catch (err) {
    console.error("[EDINET DB] Query error:", err);
    return null;
  }
}

/**
 * Check if a date has already been fetched.
 */
export function isDateFetched(database: Database.Database, date: string): boolean {
  const row = database
    .prepare("SELECT 1 FROM fetch_log WHERE date = ?")
    .get(date);
  return !!row;
}

/**
 * Bulk insert documents for a given date.
 */
export function insertDocuments(
  database: Database.Database,
  date: string,
  docs: EdinetDocument[]
): void {
  const insert = database.prepare(`
    INSERT OR REPLACE INTO edinet_documents
      (doc_id, sec_code, edinet_code, filer_name, doc_type_code,
       doc_description, period_start, period_end, submit_date, xbrl_flag, pdf_flag)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const logInsert = database.prepare(`
    INSERT OR REPLACE INTO fetch_log (date, doc_count) VALUES (?, ?)
  `);

  const transaction = database.transaction(() => {
    for (const doc of docs) {
      insert.run(
        doc.docID,
        doc.secCode,
        doc.edinetCode,
        doc.filerName,
        doc.docTypeCode,
        doc.docDescription,
        doc.periodStart,
        doc.periodEnd,
        doc.submitDateTime?.slice(0, 10) ?? date,
        doc.xbrlFlag,
        doc.pdfFlag
      );
    }
    logInsert.run(date, docs.length);
  });

  transaction();
}

// --- Shareholder cache ---

export interface ShareholderCacheRow {
  sec_code: string;
  doc_id: string;
  period_end: string;
  total_shares: number;
  total_holding_ratio: number;
  shareholders_json: string;
  updated_at: string;
}

export function getShareholderCache(
  secCode: string
): MajorShareholderResult | null {
  const database = getDb();
  if (!database) return null;

  try {
    const row = database
      .prepare("SELECT * FROM shareholder_cache WHERE sec_code = ?")
      .get(secCode) as ShareholderCacheRow | undefined;

    if (!row) return null;

    const shareholders: MajorShareholder[] = JSON.parse(
      row.shareholders_json
    );

    return {
      shareholders,
      totalShares: row.total_shares,
      totalHoldingRatio: row.total_holding_ratio,
      docID: row.doc_id,
      periodEnd: row.period_end,
    };
  } catch (err) {
    console.error("[EDINET DB] Shareholder cache read error:", err);
    return null;
  }
}

export function setShareholderCache(
  secCode: string,
  result: MajorShareholderResult
): void {
  const database = getDb();
  if (!database) return;

  try {
    // Need writable DB for this — reopen if readonly
    const dbPath = getDbPath();
    const writeDb = new Database(dbPath);
    writeDb.pragma("journal_mode = WAL");

    // Ensure table exists
    writeDb.exec(`
      CREATE TABLE IF NOT EXISTS shareholder_cache (
        sec_code TEXT PRIMARY KEY,
        doc_id TEXT,
        period_end TEXT,
        total_shares INTEGER,
        total_holding_ratio REAL,
        shareholders_json TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    writeDb
      .prepare(
        `INSERT OR REPLACE INTO shareholder_cache
         (sec_code, doc_id, period_end, total_shares, total_holding_ratio, shareholders_json, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .run(
        secCode,
        result.docID,
        result.periodEnd,
        result.totalShares,
        result.totalHoldingRatio,
        JSON.stringify(result.shareholders)
      );

    writeDb.close();
  } catch (err) {
    console.error("[EDINET DB] Shareholder cache write error:", err);
  }
}

// --- Helpers ---

interface DbDocRow {
  doc_id: string;
  sec_code: string | null;
  edinet_code: string | null;
  filer_name: string;
  doc_type_code: string | null;
  doc_description: string | null;
  period_start: string | null;
  period_end: string | null;
  submit_date: string | null;
  xbrl_flag: string | null;
  pdf_flag: string | null;
}

function rowToEdinetDocument(row: DbDocRow): EdinetDocument {
  return {
    seqNumber: 0,
    docID: row.doc_id,
    edinetCode: row.edinet_code,
    secCode: row.sec_code,
    JCN: null,
    filerName: row.filer_name,
    fundCode: null,
    ordinanceCode: null,
    formCode: null,
    docTypeCode: row.doc_type_code,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    submitDateTime: row.submit_date ?? "",
    docDescription: row.doc_description,
    issuerEdinetCode: null,
    subjectEdinetCode: null,
    subsidiaryEdinetCode: null,
    currentReportReason: null,
    parentDocID: null,
    opeDateTime: null,
    withdrawalStatus: null,
    docInfoEditStatus: null,
    disclosureStatus: null,
    xbrlFlag: row.xbrl_flag,
    pdfFlag: row.pdf_flag,
    attachDocFlag: null,
    englishDocFlag: null,
    csvFlag: null,
    legalStatus: null,
  };
}
