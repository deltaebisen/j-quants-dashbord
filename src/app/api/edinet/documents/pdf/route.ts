import { NextRequest, NextResponse } from "next/server";
import { getEdinetDocumentPdf } from "@/lib/edinet-client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const docID = searchParams.get("docID");

    if (!docID) {
      return NextResponse.json(
        { error: "docID parameter is required" },
        { status: 400 }
      );
    }

    const res = await getEdinetDocumentPdf(docID);
    const contentType = res.headers.get("content-type") ?? "application/pdf";
    const body = res.body;

    if (!body) {
      return NextResponse.json({ error: "Empty response" }, { status: 502 });
    }

    return new NextResponse(body as ReadableStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${docID}.pdf"`,
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
