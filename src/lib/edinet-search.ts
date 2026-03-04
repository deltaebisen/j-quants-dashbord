import { format, subDays, addDays, subYears, isWeekend } from "date-fns";
import { CACHE_TTL } from "./constants";
import { getEdinetDocuments, getCached, setCache } from "./edinet-client";
import { findAnnualReportInDb } from "./edinet-db";
import type { EdinetDocument } from "./edinet-types";

/**
 * Find the latest annual securities report (有価証券報告書) for a given stock code.
 *
 * Strategy:
 * 1. Query SQLite DB (instant, populated by batch script)
 * 2. Fall back to EDINET API date-by-date search if DB unavailable
 *
 * @param code - J-Quants style code (e.g. "72030")
 * @param fiscalYearEnd - CurFYEn from J-Quants (may be future)
 * @param fiscalYearStart - CurFYSt from J-Quants
 */
export async function findLatestAnnualReport(
  code: string,
  fiscalYearEnd?: string,
  fiscalYearStart?: string
): Promise<EdinetDocument | null> {
  const secCode = code.slice(0, 5);

  // --- Strategy 1: SQLite DB lookup (instant) ---
  const dbResult = findAnnualReportInDb(secCode);
  if (dbResult) return dbResult;

  // --- Strategy 2: Fall back to EDINET API search ---
  const cacheKey = `edinet-report:${secCode}`;
  const cached = getCached<EdinetDocument | null>(cacheKey);
  if (cached !== null) return cached;
  const nullCacheKey = `edinet-report-null:${secCode}`;
  const nullCached = getCached<boolean>(nullCacheKey);
  if (nullCached) return null;

  const today = new Date();
  const searchDates: string[] = [];

  const targetFyEnds: Date[] = [];

  if (fiscalYearEnd) {
    const fyEnd = new Date(fiscalYearEnd);
    if (fyEnd <= today) {
      const daysSinceFyEnd = (today.getTime() - fyEnd.getTime()) / 86400000;
      if (daysSinceFyEnd > 45) {
        targetFyEnds.push(fyEnd);
      }
      targetFyEnds.push(subYears(fyEnd, 1));
    } else {
      if (fiscalYearStart) {
        targetFyEnds.push(subDays(new Date(fiscalYearStart), 1));
      } else {
        targetFyEnds.push(subYears(fyEnd, 1));
      }
      targetFyEnds.push(subYears(fyEnd, 2));
    }
  }

  for (const fyEnd of targetFyEnds) {
    const peakStart = addDays(fyEnd, 60);
    const peakEnd = addDays(fyEnd, 95);
    if (peakStart <= today) {
      searchDates.push(
        ...getBusinessDays(peakStart, peakEnd > today ? subDays(today, 1) : peakEnd)
      );
    }
    for (const [from, to] of [[40, 60], [95, 120]] as [number, number][]) {
      const start = addDays(fyEnd, from);
      const end = addDays(fyEnd, to);
      if (start <= today) {
        searchDates.push(
          ...getBusinessDays(start, end > today ? subDays(today, 1) : end, 3)
        );
      }
    }
  }

  const recentDates = getBusinessDays(subDays(today, 170), subDays(today, 1), 5);
  recentDates.reverse();

  const allDates = [...new Set([...searchDates, ...recentDates])];

  const MAX_API_CALLS = 40;
  let apiCalls = 0;

  for (const date of allDates) {
    if (apiCalls >= MAX_API_CALLS) break;

    try {
      apiCalls++;
      const docs = await getEdinetDocuments(date);
      const match = docs.find(
        (d) =>
          d.docTypeCode === "120" &&
          d.secCode === secCode &&
          d.xbrlFlag === "1"
      );
      if (match) {
        setCache(cacheKey, match, CACHE_TTL.EDINET_DOC_SEARCH);
        return match;
      }
    } catch (err) {
      console.error(`EDINET search error for date ${date}:`, err);
      continue;
    }
  }

  setCache(nullCacheKey, true, CACHE_TTL.EDINET_DOC_SEARCH);
  return null;
}

function getBusinessDays(start: Date, end: Date, step = 1): string[] {
  const days: string[] = [];
  let current = new Date(start);
  let count = 0;
  while (current <= end) {
    if (!isWeekend(current)) {
      if (count % step === 0) {
        days.push(format(current, "yyyy-MM-dd"));
      }
      count++;
    }
    current = addDays(current, 1);
  }
  return days;
}
