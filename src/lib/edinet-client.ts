import { EDINET_API_BASE, CACHE_TTL } from "./constants";
import type { EdinetDocument, EdinetDocumentsResponse } from "./edinet-types";

// --- In-memory cache ---
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttl: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

// --- Rate limiting for EDINET ---
let lastEdinetRequest = 0;
const EDINET_MIN_INTERVAL = 500; // 0.5 seconds between requests

async function waitForEdinetRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastEdinetRequest;
  if (elapsed < EDINET_MIN_INTERVAL) {
    await new Promise((resolve) =>
      setTimeout(resolve, EDINET_MIN_INTERVAL - elapsed)
    );
  }
  lastEdinetRequest = Date.now();
}

async function edinetFetchWithRetry(
  url: string,
  init?: RequestInit
): Promise<Response> {
  await waitForEdinetRateLimit();
  let res = await fetch(url, init);

  if (res.status === 429) {
    // Retry up to 2 times with 5s delay
    for (let i = 0; i < 2; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await waitForEdinetRateLimit();
      res = await fetch(url, init);
      if (res.status !== 429) break;
    }
  }

  return res;
}

// --- Public API functions ---

export async function getEdinetDocuments(date: string): Promise<EdinetDocument[]> {
  const apiKey = process.env.EDINET_API_KEY;
  if (!apiKey) throw new Error("EDINET_API_KEY is not set");

  const cacheKey = `edinet:${date}`;
  const cached = getCached<EdinetDocument[]>(cacheKey);
  if (cached) return cached;

  const url = new URL(`${EDINET_API_BASE}/documents.json`);
  url.searchParams.set("date", date);
  url.searchParams.set("type", "2");
  url.searchParams.set("Subscription-Key", apiKey);

  const res = await edinetFetchWithRetry(url.toString());

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(`EDINET API error ${res.status}: ${errorBody}`);
  }

  const json: EdinetDocumentsResponse = await res.json();
  const results = json.results ?? [];

  setCache(cacheKey, results, CACHE_TTL.EDINET);
  return results;
}

export async function getEdinetDocumentPdf(docID: string): Promise<Response> {
  const apiKey = process.env.EDINET_API_KEY;
  if (!apiKey) throw new Error("EDINET_API_KEY is not set");

  const url = new URL(`${EDINET_API_BASE}/documents/${docID}`);
  url.searchParams.set("type", "2");
  url.searchParams.set("Subscription-Key", apiKey);

  const res = await edinetFetchWithRetry(url.toString());

  if (!res.ok) {
    throw new Error(`EDINET API error ${res.status}`);
  }

  return res;
}

export async function getEdinetDocumentXbrl(
  docID: string
): Promise<ArrayBuffer> {
  const apiKey = process.env.EDINET_API_KEY;
  if (!apiKey) throw new Error("EDINET_API_KEY is not set");

  const url = new URL(`${EDINET_API_BASE}/documents/${docID}`);
  url.searchParams.set("type", "1"); // XBRL ZIP
  url.searchParams.set("Subscription-Key", apiKey);

  const res = await edinetFetchWithRetry(url.toString());

  if (!res.ok) {
    throw new Error(`EDINET XBRL download error ${res.status}`);
  }

  return res.arrayBuffer();
}

// Re-export cache helpers for use by search/parser modules
export { getCached, setCache };
