const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function seedSupabase() {
  console.log("🌱 Seeding Supabase database with demo snapshot...");
  const snapshotPath = path.join(process.cwd(), "data", "demo-snapshot.json");
  const raw = fs.readFileSync(snapshotPath, "utf-8");
  const data = JSON.parse(raw);

  for (const c of data.candidates) {
    const person = await prisma.person.upsert({
      where: { id: c.id },
      update: {
        name: c.name,
        linkedin_url: c.linkedin_url,
        instagram_url: c.instagram_url,
        status: c.status || "analyzed",
      },
      create: {
        id: c.id,
        name: c.name,
        linkedin_url: c.linkedin_url,
        instagram_url: c.instagram_url,
        status: c.status || "analyzed",
      },
    });

    if (c.summary) {
      await prisma.profile.upsert({
        where: { person_id: person.id },
        update: {
          summary: c.summary || "",
          needs: JSON.stringify(c.needs || []),
          hobbies: JSON.stringify(c.hobbies || []),
          interests: JSON.stringify(c.interests || []),
          values: JSON.stringify(c.values || []),
          personality_traits: JSON.stringify(c.personality_traits || []),
          communication_style: c.communication_style || "",
          lifestyle: c.lifestyle || "",
          looking_for: c.looking_for || "",
          deal_breakers: JSON.stringify(c.deal_breakers || []),
          evidence: JSON.stringify(c.evidence || []),
          confidence_scores: JSON.stringify(c.confidence_scores || {}),
        },
        create: {
          person_id: person.id,
          summary: c.summary || "",
          needs: JSON.stringify(c.needs || []),
          hobbies: JSON.stringify(c.hobbies || []),
          interests: JSON.stringify(c.interests || []),
          values: JSON.stringify(c.values || []),
          personality_traits: JSON.stringify(c.personality_traits || []),
          communication_style: c.communication_style || "",
          lifestyle: c.lifestyle || "",
          looking_for: c.looking_for || "",
          deal_breakers: JSON.stringify(c.deal_breakers || []),
          evidence: JSON.stringify(c.evidence || []),
          confidence_scores: JSON.stringify(c.confidence_scores || {}),
        },
      });
    }
  }

  for (const d of data.dates) {
    const personAId = d.person_a_id || d.personAId;
    const personBId = d.person_b_id || d.personBId;

    await prisma.dateSession.upsert({
      where: { id: d.id },
      update: {
        person_a_id: personAId,
        person_b_id: personBId,
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
        person_a_id: personAId,
        person_b_id: personBId,
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
  const profileCount = await prisma.profile.count();
  const datesCount = await prisma.dateSession.count();
  console.log(`✅ Supabase successfully seeded! People: ${peopleCount}, Profiles: ${profileCount}, Dates: ${datesCount}`);
  await prisma.$disconnect();
}

seedSupabase().catch((e) => {
  console.error("Seeding error:", e);
  process.exit(1);
});
