import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { computeTopMutualPairs } from "@/lib/ranking/engine";

export const dynamic = "force-dynamic";

/**
 * GET /api/demo/export - Returns demo snapshot JSON (or reads from file)
 */
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "demo-snapshot.json");
    if (fs.existsSync(filePath)) {
      const snap = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (Array.isArray(snap.candidates) && snap.candidates.length > 0) {
        return NextResponse.json({ success: true, data: snap });
      }
    }

    // No exported snapshot: serve the finished run straight from the database.
    return NextResponse.json({ success: true, data: await buildSnapshot() });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to read demo snapshot" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/demo/export - Snapshots current database state into data/demo-snapshot.json
 */
async function buildSnapshot() {
    const [candidates, dates, topMutualPairs] = await Promise.all([
      prisma.person.findMany({
        where: { status: "analyzed" },
        include: { profile: true, rawData: true },
      }),
      prisma.dateSession.findMany({
        where: { status: "completed" },
        include: { person_a: true, person_b: true },
      }),
      computeTopMutualPairs(),
    ]);

    const formattedCandidates = candidates.map((c) => {
      let photoUrl: string | undefined;
      for (const raw of c.rawData) {
        try {
          const parsed = JSON.parse(raw.json_data);
          if (parsed.profilePhotoUrl) photoUrl = parsed.profilePhotoUrl;
        } catch {}
      }

      let prof: any = {};
      if (c.profile) {
        try {
          prof = {
            summary: c.profile.summary,
            needs: JSON.parse(c.profile.needs),
            hobbies: JSON.parse(c.profile.hobbies),
            interests: JSON.parse(c.profile.interests),
            values: JSON.parse(c.profile.values),
            personality_traits: JSON.parse(c.profile.personality_traits),
            communication_style: c.profile.communication_style,
            lifestyle: c.profile.lifestyle,
            looking_for: c.profile.looking_for,
            deal_breakers: JSON.parse(c.profile.deal_breakers),
            evidence: JSON.parse(c.profile.evidence),
          };
        } catch {}
      }

      return {
        id: c.id,
        name: c.name,
        photoUrl,
        linkedin_url: c.linkedin_url,
        instagram_url: c.instagram_url,
        status: c.status,
        ...prof,
      };
    });

    const formattedDates = dates.map((d) => {
      let venue: any = {};
      let turns: any[] = [];
      let highlights: string[] = [];

      try {
        venue = JSON.parse(d.venue || "{}");
        turns = JSON.parse(d.transcript || "[]");
        highlights = JSON.parse(d.highlights || "[]");
      } catch {}

      return {
        id: d.id,
        personAId: d.person_a_id,
        personAName: d.person_a.name,
        personBId: d.person_b_id,
        personBName: d.person_b.name,
        venue,
        turns,
        scoreAToB: {
          overall_score: d.score_a_to_b,
          reason: d.reason_a,
          highlights: highlights.slice(0, 2),
        },
        scoreBToA: {
          overall_score: d.score_b_to_a,
          reason: d.reason_b,
          highlights: highlights.slice(2, 4),
        },
      };
    });

    return {
      exportedAt: new Date().toISOString(),
      appName: "AgentMatch",
      description: "Live snapshot of finished autonomous run.",
      candidates: formattedCandidates,
      dates: formattedDates,
      topMutualPairs,
    };
}

export async function POST() {
  try {
    const snapshot = await buildSnapshot();

    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(dataDir, "demo-snapshot.json"),
      JSON.stringify(snapshot, null, 2),
      "utf-8"
    );

    return NextResponse.json({
      success: true,
      message: "Current run state successfully exported to /data/demo-snapshot.json.",
      snapshot,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Export failed" },
      { status: 500 }
    );
  }
}
