import { NextRequest, NextResponse } from "next/server";
import { searchCompanies } from "@/lib/jquants-client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const query = searchParams.get("q");

    if (!query || query.length < 1) {
      return NextResponse.json([]);
    }

    const results = await searchCompanies(query);
    // Limit to 20 results for UI performance
    return NextResponse.json(results.slice(0, 20), {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/jquants/search] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
