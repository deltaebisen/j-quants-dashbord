#!/usr/bin/env node

/**
 * EDINET Document List Batch Fetcher
 *
 * Fetches EDINET document lists for a date range and stores them in SQLite.
 * Run: npm run edinet:fetch [-- --days 365] [-- --from 2025-01-01 --to 2026-03-01]
 *
 * Requires EDINET_API_KEY in .env.local
 * DB path: EDINET_DB_PATH env var or default data/edinet.db
 */

import { readFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import Database from "better-sqlite3";

// --- Load .env.local ---
const envPath = join(process.cwd(), ".env.local");
const envVars = {};
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.+)/);
    if (m) envVars[m[1]] = m[2].trim();
  }
}

const EDINET_API_KEY = envVars.EDINET_API_KEY || process.env.EDINET_API_KEY;
if (!EDINET_API_KEY) {
  console.error("Error: EDINET_API_KEY not found in .env.local or environment");
  process.exit(1);
}

const EDINET_API_BASE = "https://api.edinet-fsa.go.jp/api/v2";
const MIN_INTERVAL = 500; // ms between API requests

// --- Parse CLI args ---
const args = process.argv.slice(2);
let fromDate, toDate;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--days") {
    const days = parseInt(args[++i], 10) || 365;
    toDate = new Date();
    toDate.setDate(toDate.getDate() - 1); // yesterday
    fromDate = new Date(toDate);
    fromDate.setDate(fromDate.getDate() - days);
  } else if (args[i] === "--from") {
    fromDate = new Date(args[++i]);
  } else if (args[i] === "--to") {
    toDate = new Date(args[++i]);
  }
}

if (!fromDate || !toDate) {
  // Default: last 400 days
  toDate = new Date();
  toDate.setDate(toDate.getDate() - 1);
  fromDate = new Date(toDate);
  fromDate.setDate(fromDate.getDate() - 400);
}

// --- Open DB ---
const dbPath =
  envVars.EDINET_DB_PATH || process.env.EDINET_DB_PATH || join(process.cwd(), "data", "edinet.db");
const dbDir = dirname(dbPath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

// Init schema
db.exec(`
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

const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO edinet_documents
    (doc_id, sec_code, edinet_code, filer_name, doc_type_code,
     doc_description, period_start, period_end, submit_date, xbrl_flag, pdf_flag)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const logStmt = db.prepare(
  "INSERT OR REPLACE INTO fetch_log (date, doc_count) VALUES (?, ?)"
);

const checkStmt = db.prepare("SELECT 1 FROM fetch_log WHERE date = ?");

const insertBatch = db.transaction((date, docs) => {
  for (const doc of docs) {
    insertStmt.run(
      doc.docID,
      doc.secCode,
      doc.edinetCode,
      doc.filerName,
      doc.docTypeCode,
      doc.docDescription,
      doc.periodStart,
      doc.periodEnd,
      (doc.submitDateTime || "").slice(0, 10) || date,
      doc.xbrlFlag,
      doc.pdfFlag
    );
  }
  logStmt.run(date, docs.length);
});

// --- Generate dates ---
function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isWeekend(d) {
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

const dates = [];
const current = new Date(fromDate);
while (current <= toDate) {
  if (!isWeekend(current)) {
    dates.push(formatDate(current));
  }
  current.setDate(current.getDate() + 1);
}

// --- Fetch ---
let lastRequest = 0;

async function fetchWithRateLimit(url) {
  const now = Date.now();
  const elapsed = now - lastRequest;
  if (elapsed < MIN_INTERVAL) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL - elapsed));
  }
  lastRequest = Date.now();

  const res = await fetch(url);
  if (res.status === 429) {
    console.log("  Rate limited, waiting 10s...");
    await new Promise((r) => setTimeout(r, 10000));
    lastRequest = Date.now();
    return fetch(url);
  }
  return res;
}

console.log(`EDINET Document Fetcher`);
console.log(`DB: ${dbPath}`);
console.log(`Date range: ${formatDate(fromDate)} ~ ${formatDate(toDate)}`);
console.log(`Business days to process: ${dates.length}`);
console.log();

let fetched = 0;
let skipped = 0;
let totalDocs = 0;
let errors = 0;

for (let i = 0; i < dates.length; i++) {
  const date = dates[i];

  // Skip if already fetched
  if (checkStmt.get(date)) {
    skipped++;
    continue;
  }

  try {
    const url = `${EDINET_API_BASE}/documents.json?date=${date}&type=2&Subscription-Key=${EDINET_API_KEY}`;
    const res = await fetchWithRateLimit(url);

    if (!res.ok) {
      console.error(`  [${date}] HTTP ${res.status}`);
      errors++;
      continue;
    }

    const json = await res.json();

    // EDINET returns 200 even for errors
    if (json.metadata?.status && json.metadata.status !== "200") {
      console.error(`  [${date}] API error: ${json.metadata.message}`);
      errors++;
      continue;
    }

    const docs = json.results || [];
    insertBatch(date, docs);
    totalDocs += docs.length;
    fetched++;

    const progress = ((i + 1) / dates.length * 100).toFixed(1);
    process.stdout.write(
      `\r  [${progress}%] ${date}: ${docs.length} docs | Fetched: ${fetched}, Skipped: ${skipped}, Docs: ${totalDocs}`
    );
  } catch (err) {
    console.error(`\n  [${date}] Error: ${err.message}`);
    errors++;
  }
}

console.log(`\n`);
console.log(`Done!`);
console.log(`  Fetched: ${fetched} days`);
console.log(`  Skipped (already in DB): ${skipped} days`);
console.log(`  Total documents inserted: ${totalDocs}`);
if (errors > 0) console.log(`  Errors: ${errors}`);

// Show DB stats
const stats = db.prepare("SELECT COUNT(*) as cnt FROM edinet_documents").get();
const annuals = db
  .prepare(
    "SELECT COUNT(*) as cnt FROM edinet_documents WHERE doc_type_code = '120' AND xbrl_flag = '1'"
  )
  .get();
console.log(`\nDB total: ${stats.cnt} documents, ${annuals.cnt} annual reports (有報)`);

db.close();
