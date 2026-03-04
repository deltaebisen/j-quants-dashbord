import { NextRequest, NextResponse } from "next/server";
import { getFinancialSummary } from "@/lib/jquants-client";
import { findLatestAnnualReport } from "@/lib/edinet-search";
import { getMajorShareholdersFromDoc } from "@/lib/edinet-xbrl-parser";
import { getShareholderCache, setShareholderCache } from "@/lib/edinet-db";
import type { FloatingSharesData } from "@/lib/edinet-shareholders-types";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  const secCode = code.slice(0, 5);

  try {
    // Get financial summary for issued shares and fiscal year end
    const fins = await getFinancialSummary(code);
    const latestFins = fins.length > 0 ? fins[fins.length - 1] : null;

    if (!latestFins) {
      return NextResponse.json(
        { error: "Financial data not found" },
        { status: 404 }
      );
    }

    const totalShares = Number(latestFins.ShOutFY) || 0;
    const treasuryShares = Number(latestFins.TrShFY) || 0;
    const basicFloating = totalShares - treasuryShares;

    // Check if EDINET_API_KEY is available
    if (!process.env.EDINET_API_KEY) {
      return NextResponse.json(buildFallback(basicFloating), {
        headers: cacheHeaders(),
      });
    }

    // --- Check SQLite shareholder cache first ---
    const dbCached = getShareholderCache(secCode);
    if (dbCached) {
      // Sanity check
      if (totalShares > 0 && dbCached.totalShares > totalShares) {
        console.warn(
          `[EDINET] Cached shareholder total (${dbCached.totalShares}) exceeds issued shares (${totalShares}) for ${code}. Using fallback.`
        );
        return NextResponse.json(buildFallback(basicFloating), {
          headers: cacheHeaders(),
        });
      }

      const floatingShares =
        totalShares - treasuryShares - dbCached.totalShares;
      const majorShareholderRatio =
        totalShares > 0
          ? (dbCached.totalShares / totalShares) * 100
          : dbCached.totalHoldingRatio;

      const result: FloatingSharesData = {
        floatingShares: Math.max(0, floatingShares),
        majorShareholderShares: dbCached.totalShares,
        majorShareholderRatio,
        shareholders: dbCached.shareholders,
        source: "edinet",
        docID: dbCached.docID,
        periodEnd: dbCached.periodEnd,
      };

      return NextResponse.json(result, { headers: cacheHeaders() });
    }

    // --- Find report and parse XBRL ---
    try {
      const fiscalYearEnd = latestFins.CurFYEn || undefined;
      const fiscalYearStart = latestFins.CurFYSt || undefined;
      const report = await findLatestAnnualReport(
        code,
        fiscalYearEnd,
        fiscalYearStart
      );

      if (!report) {
        return NextResponse.json(buildFallback(basicFloating), {
          headers: cacheHeaders(),
        });
      }

      const shareholders = await getMajorShareholdersFromDoc(
        report.docID,
        report.periodEnd || ""
      );

      // Sanity check
      if (totalShares > 0 && shareholders.totalShares > totalShares) {
        console.warn(
          `[EDINET] Major shareholder total (${shareholders.totalShares}) exceeds issued shares (${totalShares}) for ${code}. Falling back.`
        );
        return NextResponse.json(buildFallback(basicFloating), {
          headers: cacheHeaders(),
        });
      }

      // Store in SQLite cache for next time
      setShareholderCache(secCode, shareholders);

      const floatingShares =
        totalShares - treasuryShares - shareholders.totalShares;
      const majorShareholderRatio =
        totalShares > 0
          ? (shareholders.totalShares / totalShares) * 100
          : shareholders.totalHoldingRatio;

      const result: FloatingSharesData = {
        floatingShares: Math.max(0, floatingShares),
        majorShareholderShares: shareholders.totalShares,
        majorShareholderRatio,
        shareholders: shareholders.shareholders,
        source: "edinet",
        docID: report.docID,
        periodEnd: shareholders.periodEnd,
      };

      return NextResponse.json(result, { headers: cacheHeaders() });
    } catch (err) {
      console.error(`[EDINET] Shareholder parse error for ${code}:`, err);
      return NextResponse.json(buildFallback(basicFloating), {
        headers: cacheHeaders(),
      });
    }
  } catch (err) {
    console.error(`[EDINET] Error for ${code}:`, err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function buildFallback(floatingShares: number): FloatingSharesData {
  return {
    floatingShares,
    majorShareholderShares: 0,
    majorShareholderRatio: 0,
    shareholders: [],
    source: "fallback",
    docID: null,
    periodEnd: null,
  };
}

function cacheHeaders(): Record<string, string> {
  return {
    "Cache-Control": "s-maxage=86400, stale-while-revalidate=43200",
  };
}
