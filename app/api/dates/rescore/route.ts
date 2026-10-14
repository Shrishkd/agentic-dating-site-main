import { NextRequest, NextResponse } from "next/server";
import { rescoreAllDates } from "@/lib/dating/engine";
import { computeAllRankings } from "@/lib/ranking/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/dates/rescore - Re-run both agents' private scorecards on every completed date, then re-rank.
 */
export async function POST(req: NextRequest) {
  try {
    // Optional ?before=<ISO date>: only rescore dates created before then.
    const params = new URL(req.url).searchParams;
    const before = params.get("before");
    const rescored = await rescoreAllDates(undefined, before ? new Date(before) : undefined);
    if (params.get("skipRank") === "1") {
      return NextResponse.json({ success: true, rescored });
    }
    const ranking = await computeAllRankings();
    return NextResponse.json({ success: true, rescored, totalRanked: ranking.totalRanked });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Rescore failed" }, { status: 500 });
  }
}
