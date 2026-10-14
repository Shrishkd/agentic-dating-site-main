import { NextRequest, NextResponse } from "next/server";
import { analyzeAllPeople } from "@/lib/agents/analyzer";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * POST /api/analyze/all - Batch analyze all scraped candidates
 * Body: { force?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    let force = false;

    try {
      const body = await req.json();
      force = Boolean(body?.force);
    } catch {
      // Body is optional
    }

    const result = await analyzeAllPeople({ force });

    return NextResponse.json({
      success: true,
      message: `Batch analysis completed. Analyzed ${result.successCount} candidate profiles.`,
      successCount: result.successCount,
      errors: result.errors,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Batch analysis failed" },
      { status: 500 }
    );
  }
}
