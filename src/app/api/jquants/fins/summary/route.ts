import { NextRequest, NextResponse } from "next/server";
import { getFinancialSummary } from "@/lib/jquants-client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "code parameter is required" }, { status: 400 });
    }

    const data = await getFinancialSummary(code);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=10800" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
