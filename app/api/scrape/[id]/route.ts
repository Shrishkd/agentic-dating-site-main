import { NextRequest, NextResponse } from "next/server";
import { scrapePerson } from "@/lib/scrapers/orchestrator";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * POST /api/scrape/[id] - Scrape an individual person
 * Body: { force?: boolean }
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    let force = false;

    try {
      const body = await req.json();
      force = Boolean(body?.force);
    } catch {
      // Body is optional
    }

    const result = await scrapePerson(id, { force });

    return NextResponse.json({
      success: result.status === "scraped" || result.status === "cached",
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Scraping failed" },
      { status: 500 }
    );
  }
}
