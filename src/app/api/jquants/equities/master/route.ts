import { NextResponse } from "next/server";
import { getCompanyMaster } from "@/lib/jquants-client";

export async function GET() {
  try {
    const data = await getCompanyMaster();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
