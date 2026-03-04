import { JQUANTS_API_BASE, CACHE_TTL } from "./constants";
import type {
  CompanyMaster,
  DailyPrice,
  IndexPrice,
  FinancialSummary,
  MarginInterest,
  ShortRatio,
  TradingBreakdown,
} from "./jquants-types";

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

// --- Rate limiting ---
const requestTimestamps: number[] = [];
const RATE_LIMIT = 100; // keep under 110/min
const RATE_WINDOW = 60_000;

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_WINDOW) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= RATE_LIMIT) {
    const waitTime = requestTimestamps[0] + RATE_WINDOW - now + 100;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }
  requestTimestamps.push(Date.now());
}

// --- Core fetch ---
async function jquantsFetch<T>(
  endpoint: string,
  params?: Record<string, string>
): Promise<T[]> {
  const apiKey = process.env.JQUANTS_API_KEY;
  if (!apiKey) throw new Error("JQUANTS_API_KEY is not set");

  let allData: T[] = [];
  let paginationKey: string | undefined;

  do {
    await waitForRateLimit();

    const url = new URL(`${JQUANTS_API_BASE}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    if (paginationKey) {
      url.searchParams.set("pagination_key", paginationKey);
    }

    const res = await fetch(url.toString(), {
      headers: { "x-api-key": apiKey },
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      throw new Error(`J-Quants API error ${res.status}: ${errorBody}`);
    }

    const json = await res.json();

    // J-Quants V2 responses wrap data in various keys
    const dataKey = Object.keys(json).find((k) => k !== "pagination_key");
    const data: T[] = dataKey ? json[dataKey] : [];
    allData = allData.concat(data);

    paginationKey = json.pagination_key;
  } while (paginationKey);

  return allData;
}

// --- Cached fetch wrapper ---
async function cachedFetch<T>(
  cacheKey: string,
  ttl: number,
  endpoint: string,
  params?: Record<string, string>
): Promise<T[]> {
  const cached = getCached<T[]>(cacheKey);
  if (cached) return cached;

  const data = await jquantsFetch<T>(endpoint, params);
  setCache(cacheKey, data, ttl);
  return data;
}

// --- Public API functions ---

export async function getCompanyMaster(): Promise<CompanyMaster[]> {
  return cachedFetch<CompanyMaster>(
    "master",
    CACHE_TTL.MASTER,
    "/equities/master"
  );
}

export async function getDailyPrices(
  code?: string,
  from?: string,
  to?: string
): Promise<DailyPrice[]> {
  const params: Record<string, string> = {};
  if (code) params.code = code;
  if (from) params.from = from;
  if (to) params.to = to;
  const key = `daily:${code || "all"}:${from || ""}:${to || ""}`;
  return cachedFetch<DailyPrice>(key, CACHE_TTL.DAILY_PRICE, "/equities/bars/daily", params);
}

export async function getIndexPrices(
  code?: string,
  from?: string,
  to?: string
): Promise<IndexPrice[]> {
  const params: Record<string, string> = {};
  if (code) params.code = code;
  if (from) params.from = from;
  if (to) params.to = to;
  const key = `index:${code || "all"}:${from || ""}:${to || ""}`;
  return cachedFetch<IndexPrice>(key, CACHE_TTL.INDEX_PRICE, "/indices/bars/daily", params);
}

export async function getFinancialSummary(code: string): Promise<FinancialSummary[]> {
  return cachedFetch<FinancialSummary>(
    `fins:${code}`,
    CACHE_TTL.FINANCIAL,
    "/fins/summary",
    { code }
  );
}

export async function getTradingBreakdown(
  code?: string,
  from?: string,
  to?: string
): Promise<TradingBreakdown[]> {
  const params: Record<string, string> = {};
  if (code) params.code = code;
  if (from) params.from = from;
  if (to) params.to = to;
  const key = `breakdown:${code || "all"}:${from || ""}:${to || ""}`;
  return cachedFetch<TradingBreakdown>(key, CACHE_TTL.BREAKDOWN, "/markets/breakdown", params);
}

export async function getShortRatio(
  code?: string,
  from?: string,
  to?: string
): Promise<ShortRatio[]> {
  const params: Record<string, string> = {};
  if (code) params.code = code;
  if (from) params.from = from;
  if (to) params.to = to;
  const key = `short:${code || "all"}:${from || ""}:${to || ""}`;
  return cachedFetch<ShortRatio>(key, CACHE_TTL.SHORT_RATIO, "/markets/short-ratio", params);
}

export async function getMarginInterest(
  code?: string,
  from?: string,
  to?: string
): Promise<MarginInterest[]> {
  const params: Record<string, string> = {};
  if (code) params.code = code;
  if (from) params.from = from;
  if (to) params.to = to;
  const key = `margin:${code || "all"}:${from || ""}:${to || ""}`;
  return cachedFetch<MarginInterest>(
    key,
    CACHE_TTL.MARGIN_INTEREST,
    "/markets/margin-interest",
    params
  );
}

export async function getCompaniesBySector(sectorCode: string): Promise<CompanyMaster[]> {
  const master = await getCompanyMaster();
  return master.filter((c) => c.S33 === sectorCode);
}

export async function searchCompanies(query: string): Promise<CompanyMaster[]> {
  const master = await getCompanyMaster();
  const q = query.toLowerCase();
  return master.filter(
    (c) =>
      (c.Code ?? "").startsWith(q) ||
      (c.CoName ?? "").toLowerCase().includes(q) ||
      (c.CoNameEn ?? "").toLowerCase().includes(q)
  );
}
