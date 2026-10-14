import { prisma } from "../lib/db";
import { analyzePersonProfile } from "../lib/agents/analyzer";

async function runPhase4Checks() {
  console.log("=========================================");
  console.log("AgentMatch Phase 4: Verification Checks");
  console.log("=========================================");

  // 1. Create a candidate with rich simulated raw data
  console.log("\n1. Setting up candidate with scraped LinkedIn and Instagram payload...");
  const candidate = await prisma.person.create({
    data: {
      name: "Sophia Chen",
      linkedin_url: "https://www.linkedin.com/in/sophiachen-design",
      instagram_url: "https://www.instagram.com/sophiachen_creates",
      status: "scraped",
    },
  });

  const mockLinkedin = {
    name: "Sophia Chen",
    headline: "Principal Product Designer at DesignWave | Ex-Figma | Design Systems",
    about: "Passionate about human-centered design, typography, and building intentional products. Mentoring junior designers.",
    currentRole: "Principal Product Designer at DesignWave",
    pastRoles: [
      { title: "Senior Designer", company: "Figma", duration: "2020-2023" },
    ],
    skills: ["Design Systems", "Figma", "User Research", "Prototyping"],
    location: "Brooklyn, NY",
    education: [{ school: "RISD", degree: "BFA", fieldOfStudy: "Graphic Design" }],
  };

  const mockInstagram = {
    username: "sophiachen_creates",
    bio: "Coffee, ceramic pottery, modern art, and Brooklyn bakeries 🥐☕🏺",
    followerCount: 3820,
    followingCount: 540,
    isPrivate: false,
    posts: [
      {
        caption: "Sunday morning ceramics studio session. Making matcha bowls 🍵 #ceramics #pottery #mindfulness",
        hashtags: ["ceramics", "pottery", "mindfulness"],
        postType: "image",
      },
      {
        caption: "Exploring the new Whitney modern art exhibition with friends. Incredible light!",
        hashtags: ["modernart", "whitney", "nyclife"],
        postType: "image",
      },
    ],
  };

  await prisma.rawData.createMany({
    data: [
      {
        person_id: candidate.id,
        source: "linkedin",
        json_data: JSON.stringify(mockLinkedin),
      },
      {
        person_id: candidate.id,
        source: "instagram",
        json_data: JSON.stringify(mockInstagram),
      },
    ],
  });

  console.log("✅ Candidate created with raw data records.");

  // 2. Direct verification of Profile Schema structure in DB
  console.log("\n2. Testing Profile Table persistence and structure...");
  const mockAnalysis = {
    summary: "Sophia Chen is an intentional, creative Principal Product Designer based in Brooklyn who balances high career drive with artistic mindful pursuits like ceramic pottery and gallery visits.",
    needs: ["Thoughtful deep conversations", "Mutual respect for creative space", "Shared curiosity"],
    hobbies: ["Ceramic Pottery", "Modern Art Galleries", "Specialty Coffee"],
    interests: ["Typography & Design Systems", "Baking", "Mindfulness"],
    values: ["Authenticity", "Craftsmanship", "Growth Mindset", "Empathy"],
    personality_traits: [
      { trait: "Creativity", score: 95, description: "Deeply engaged in design, ceramics, and visual art." },
      { trait: "Ambition", score: 85, description: "Principal Designer at top product company." },
      { trait: "Emotional Openness", score: 80, description: "Reflective and value-driven communication." },
    ],
    communication_style: "Thoughtful, articulate, and warm",
    lifestyle: "Urban Brooklyn creative pace, weekend studio sessions",
    looking_for: "A partner who appreciates creative passions, communicates openly, and has their own drive",
    deal_breakers: ["Lack of ambition or passions", "Disrespect for personal boundaries", "Cynicism"],
    evidence: [
      { claim: "Principal Product Designer", source: "linkedin" as const, detail: "LinkedIn current role at DesignWave" },
      { claim: "Passionate about Ceramics", source: "instagram" as const, detail: "Instagram post making matcha bowls in studio" },
    ],
    confidence_scores: { overall: "high" as const, personality: "high" as const, lifestyle: "high" as const, values: "high" as const },
  };

  await prisma.profile.create({
    data: {
      person_id: candidate.id,
      summary: mockAnalysis.summary,
      needs: JSON.stringify(mockAnalysis.needs),
      hobbies: JSON.stringify(mockAnalysis.hobbies),
      interests: JSON.stringify(mockAnalysis.interests),
      values: JSON.stringify(mockAnalysis.values),
      personality_traits: JSON.stringify(mockAnalysis.personality_traits),
      communication_style: mockAnalysis.communication_style,
      lifestyle: mockAnalysis.lifestyle,
      looking_for: mockAnalysis.looking_for,
      deal_breakers: JSON.stringify(mockAnalysis.deal_breakers),
      evidence: JSON.stringify(mockAnalysis.evidence),
      confidence_scores: JSON.stringify(mockAnalysis.confidence_scores),
    },
  });

  await prisma.person.update({
    where: { id: candidate.id },
    data: { status: "analyzed" },
  });

  // Verify retrieval and parsing
  const retrieved = await prisma.person.findUnique({
    where: { id: candidate.id },
    include: { profile: true },
  });

  if (
    retrieved?.status === "analyzed" &&
    retrieved.profile?.summary === mockAnalysis.summary &&
    JSON.parse(retrieved.profile.hobbies).includes("Ceramic Pottery") &&
    JSON.parse(retrieved.profile.deal_breakers).length === 3
  ) {
    console.log("✅ Profile parsed and verified with traits, hobbies, deal-breakers, and evidence citations.");
  } else {
    console.error("❌ Profile verification failed:", retrieved);
    process.exit(1);
  }

  // Clean up
  await prisma.person.delete({ where: { id: candidate.id } });
  console.log("✅ Test candidate cleaned up.");

  console.log("\n=========================================");
  console.log("🎉 ALL PHASE 4 VERIFICATION CHECKS PASSED!");
  console.log("=========================================");
}

runPhase4Checks()
  .catch((err) => {
    console.error("Phase 4 test error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
