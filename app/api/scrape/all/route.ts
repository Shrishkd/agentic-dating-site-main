import { NextRequest, NextResponse } from "next/server";
import { scrapeAllPeople } from "@/lib/scrapers/orchestrator";

/**
 * POST /api/scrape/all - Trigger batch scraping for all pending/failed candidates
 * Body: { concurrency?: number, force?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    let concurrency = 3;
    let force = false;

    try {
      const body = await req.json();
      if (typeof body?.concurrency === "number") concurrency = body.concurrency;
      if (typeof body?.force === "boolean") force = body.force;
    } catch {
      // Body is optional
    }

    const results = await scrapeAllPeople(concurrency, { force });

    const scrapedCount = results.filter(
      (r) => r.status === "scraped" || r.status === "cached"
    ).length;
    const privateCount = results.filter((r) => r.status === "instagram_private").length;
    const failedCount = results.filter((r) => r.status === "failed").length;

    return NextResponse.json({
      success: true,
      message: `Batch scrape completed. ${scrapedCount} ready, ${privateCount} private IG, ${failedCount} failed.`,
      totalProcessed: results.length,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Batch scraping failed" },
      { status: 500 }
    );
  }
}
