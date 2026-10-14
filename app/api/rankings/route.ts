import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeAllRankings, computeTopMutualPairs, getHeatmapMatrix, getFitCategory, parseProfile } from "@/lib/ranking/engine";
import { prescreen } from "@/lib/dating/matchmaker";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function extractPhoto(rawData: any[]): string | undefined {
  if (!rawData) return undefined;
  for (const raw of rawData) {
    try {
      const parsed = JSON.parse(raw.json_data);
      if (parsed.profilePhotoUrl) return parsed.profilePhotoUrl;
    } catch {}
  }
  return undefined;
}

/**
 * GET /api/rankings - Fetch rankings, top mutual pairs, and heatmap matrix
 * Query params: `personId` (optional)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const personId = searchParams.get("personId");

    // Fetch all analyzed candidates
    const candidates = await prisma.person.findMany({
      where: { status: "analyzed" },
      include: { rawData: true },
      orderBy: { name: "asc" },
    });

    // Check if rankings exist; if empty, compute them
    const existingCount = await prisma.ranking.count();
    if (existingCount === 0) {
      await computeAllRankings();
    }

    // If specific person requested
    let personRankings: any[] = [];
    const targetPersonId = personId || (candidates.length > 0 ? candidates[0].id : null);

    if (targetPersonId) {
      const rawRanks = await prisma.ranking.findMany({
        where: { person_id: targetPersonId },
        orderBy: { rank: "asc" },
        include: {
          ranked_person: {
            include: { rawData: true, profile: true },
          },
          person: { include: { profile: true } },
        },
      });

      // Find the corresponding date sessions to get raw scores given and received
      const dates = await prisma.dateSession.findMany({
        where: {
          OR: [{ person_a_id: targetPersonId }, { person_b_id: targetPersonId }],
          status: "completed",
        },
      });

      personRankings = rawRanks.map((r) => {
        const d = dates.find(
          (date) =>
            (date.person_a_id === targetPersonId && date.person_b_id === r.ranked_person_id) ||
            (date.person_a_id === r.ranked_person_id && date.person_b_id === targetPersonId)
        );

        let scoreGiven: number;
        let scoreReceived: number;
        if (d) {
          const isA = d.person_a_id === targetPersonId;
          scoreGiven = (isA ? d.score_a_to_b : d.score_b_to_a) ?? 70;
          scoreReceived = (isA ? d.score_b_to_a : d.score_a_to_b) ?? 70;
        } else {
          const me = parseProfile(r.person.profile);
          const them = parseProfile(r.ranked_person.profile);
          scoreGiven = me && them ? prescreen(me, them).score : r.final_score;
          scoreReceived = me && them ? prescreen(them, me).score : r.final_score;
        }

        return {
          id: r.id,
          rank: r.rank,
          rankedPersonId: r.ranked_person_id,
          rankedPersonName: r.ranked_person.name,
          rankedPersonPhoto: extractPhoto(r.ranked_person.rawData),
          finalScore: r.final_score,
          scoreGiven,
          scoreReceived,
          fitCategory: d ? getFitCategory(scoreGiven, scoreReceived, r.final_score) : "not_dated",
          explanation: r.explanation,
          dateSessionId: d?.id || "",
        };
      });
    }

    // Get Heatmap Matrix and Top Mutual Pairs
    const [{ candidates: heatmapCandidates, matrix }, topMutualPairs] = await Promise.all([
      getHeatmapMatrix(),
      computeTopMutualPairs(),
    ]);

    return NextResponse.json({
      success: true,
      selectedPersonId: targetPersonId,
      candidates: candidates.map((c) => ({
        id: c.id,
        name: c.name,
        photoUrl: extractPhoto(c.rawData),
      })),
      rankings: personRankings,
      topMutualPairs,
      heatmap: {
        candidates: heatmapCandidates,
        matrix,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch rankings" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rankings - Force re-computation of all rankings
 */
export async function POST() {
  try {
    const result = await computeAllRankings();
    return NextResponse.json({
      success: true,
      message: `Successfully recomputed rankings across all completed dates (${result.totalRanked} ranking records).`,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to recompute rankings" },
      { status: 500 }
    );
  }
}
