import { NextRequest, NextResponse } from "next/server";
import { analyzePersonProfile } from "@/lib/agents/analyzer";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * POST /api/analyze/[id] - Analyze a single person by ID using Gemini
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

    const result = await analyzePersonProfile(id, { force });

    return NextResponse.json({
      success: true,
      data: result.profile,
      fromCache: result.fromCache,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
