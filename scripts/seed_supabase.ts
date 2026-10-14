import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function seedSupabase() {
  console.log("🌱 Seeding Supabase database with demo snapshot...");
  const snapshotPath = path.join(process.cwd(), "data", "demo-snapshot.json");
  const raw = fs.readFileSync(snapshotPath, "utf-8");
  const data = JSON.parse(raw);

  // 1. Seed People & Profiles
  for (const c of data.candidates) {
    const person = await prisma.person.upsert({
      where: { id: c.id },
      update: {
        name: c.name,
        linkedin_url: c.linkedin_url,
        instagram_url: c.instagram_url,
        status: c.status,
      },
      create: {
        id: c.id,
        name: c.name,
        linkedin_url: c.linkedin_url,
        instagram_url: c.instagram_url,
        status: c.status,
      },
    });

    if (c.profile) {
      await prisma.profile.upsert({
        where: { person_id: person.id },
        update: {
          summary: c.profile.summary,
          needs: JSON.stringify(c.profile.needs || []),
          hobbies: JSON.stringify(c.profile.hobbies || []),
          interests: JSON.stringify(c.profile.interests || []),
          values: JSON.stringify(c.profile.values || []),
          personality_traits: JSON.stringify(c.profile.personality_traits || {}),
          communication_style: c.profile.communication_style || "",
          lifestyle: c.profile.lifestyle || "",
          looking_for: c.profile.looking_for || "",
          deal_breakers: JSON.stringify(c.profile.deal_breakers || []),
          evidence: JSON.stringify(c.profile.evidence || []),
          confidence_scores: JSON.stringify(c.profile.confidence_scores || {}),
        },
        create: {
          person_id: person.id,
          summary: c.profile.summary,
          needs: JSON.stringify(c.profile.needs || []),
          hobbies: JSON.stringify(c.profile.hobbies || []),
          interests: JSON.stringify(c.profile.interests || []),
          values: JSON.stringify(c.profile.values || []),
          personality_traits: JSON.stringify(c.profile.personality_traits || {}),
          communication_style: c.profile.communication_style || "",
          lifestyle: c.profile.lifestyle || "",
          looking_for: c.profile.looking_for || "",
          deal_breakers: JSON.stringify(c.profile.deal_breakers || []),
          evidence: JSON.stringify(c.profile.evidence || []),
          confidence_scores: JSON.stringify(c.profile.confidence_scores || {}),
        },
      });
    }
  }

  // 2. Seed Dates
  for (const d of data.dates) {
    await prisma.dateSession.upsert({
      where: { id: d.id },
      update: {
        person_a_id: d.person_a_id,
        person_b_id: d.person_b_id,
        venue: JSON.stringify(d.venue || {}),
        transcript: JSON.stringify(d.turns || []),
        score_a_to_b: d.scoreAToB?.overall_score || 85,
        score_b_to_a: d.scoreBToA?.overall_score || 88,
        reason_a: d.scoreAToB?.reason || "",
        reason_b: d.scoreBToA?.reason || "",
        highlights: JSON.stringify(d.scoreAToB?.highlights || []),
        status: "completed",
      },
      create: {
        id: d.id,
        person_a_id: d.person_a_id,
        person_b_id: d.person_b_id,
        venue: JSON.stringify(d.venue || {}),
        transcript: JSON.stringify(d.turns || []),
        score_a_to_b: d.scoreAToB?.overall_score || 85,
        score_b_to_a: d.scoreBToA?.overall_score || 88,
        reason_a: d.scoreAToB?.reason || "",
        reason_b: d.scoreBToA?.reason || "",
        highlights: JSON.stringify(d.scoreAToB?.highlights || []),
        status: "completed",
      },
    });
  }

  const peopleCount = await prisma.person.count();
  const datesCount = await prisma.dateSession.count();
  console.log(`✅ Supabase successfully seeded! People: ${peopleCount}, Dates: ${datesCount}`);
  await prisma.$disconnect();
}

seedSupabase().catch((e) => {
  console.error("Seeding error:", e);
  process.exit(1);
});
