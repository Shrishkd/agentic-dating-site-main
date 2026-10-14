import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function loadDemoPool(): any[] {
  try {
    const file = path.join(process.cwd(), "data", "demo-snapshot.json");
    const snap = JSON.parse(fs.readFileSync(file, "utf-8"));
    return Array.isArray(snap.candidates) ? snap.candidates : [];
  } catch {
    return [];
  }
}

export async function POST() {
  try {
    const created: string[] = [];

    const DEMO_POOL = loadDemoPool();
    for (const item of DEMO_POOL) {
      const existing = await prisma.person.findFirst({
        where: {
          OR: [
            { linkedin_url: item.linkedin_url },
            { instagram_url: item.instagram_url },
          ],
        },
      });

      let personId: string;

      if (!existing) {
        const p = await prisma.person.create({
          data: {
            name: item.name,
            linkedin_url: item.linkedin_url ?? "",
            instagram_url: item.instagram_url ?? "",
            status: "analyzed",
          },
        });
        personId = p.id;
      } else {
        personId = existing.id;
        await prisma.person.update({
          where: { id: existing.id },
          data: { status: "analyzed" },
        });
      }

      // Upsert profile
      if (personId) {
        await prisma.profile.upsert({
          where: { person_id: personId },
          update: {
            summary: item.summary,
            needs: JSON.stringify(item.needs),
            hobbies: JSON.stringify(item.hobbies),
            interests: JSON.stringify(item.interests),
            values: JSON.stringify(item.values),
            personality_traits: JSON.stringify(item.personality_traits),
            communication_style: item.communication_style,
            lifestyle: item.lifestyle,
            looking_for: item.looking_for,
            deal_breakers: JSON.stringify(item.deal_breakers),
            evidence: JSON.stringify(item.evidence),
            confidence_scores: JSON.stringify({ overall: "high" }),
          },
          create: {
            person_id: personId,
            summary: item.summary,
            needs: JSON.stringify(item.needs),
            hobbies: JSON.stringify(item.hobbies),
            interests: JSON.stringify(item.interests),
            values: JSON.stringify(item.values),
            personality_traits: JSON.stringify(item.personality_traits),
            communication_style: item.communication_style,
            lifestyle: item.lifestyle,
            looking_for: item.looking_for,
            deal_breakers: JSON.stringify(item.deal_breakers),
            evidence: JSON.stringify(item.evidence),
            confidence_scores: JSON.stringify({ overall: "high" }),
          },
        });
        created.push(item.name);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully populated and analyzed ${created.length} candidates for speed dating!`,
      candidates: created,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to seed demo candidates" },
      { status: 500 }
    );
  }
}
