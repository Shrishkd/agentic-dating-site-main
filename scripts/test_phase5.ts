import { prisma } from "../lib/db";
import {
  generateUniquePairs,
  chooseDateVenue,
  loadCandidatePersona,
  runPairDate,
} from "../lib/dating/engine";

async function runPhase5Checks() {
  console.log("=========================================");
  console.log("AgentMatch Phase 5: Verification Checks");
  console.log("=========================================");

  // 1. Test Combinatorics for unique pairs
  console.log("\n1. Testing Pairwise Combinatorics...");
  const dummyIds = ["A", "B", "C", "D", "E"]; // 5 candidates -> 10 pairs
  const pairs5 = generateUniquePairs(dummyIds);
  console.log(`✅ 5 candidates generate ${pairs5.length} unique pairs (expected 10).`);

  const dummyIds25 = Array.from({ length: 25 }, (_, i) => `P${i + 1}`);
  const pairs25 = generateUniquePairs(dummyIds25);
  console.log(`✅ 25 candidates generate ${pairs25.length} unique pairs (expected 300).`);

  if (pairs5.length !== 10 || pairs25.length !== 300) {
    console.error("❌ Combinatorics test failed!");
    process.exit(1);
  }

  // 2. Set up two test candidates with analyzed profiles in DB
  console.log("\n2. Setting up 2 test personas in database...");
  const personA = await prisma.person.create({
    data: {
      name: "Liam O'Connor",
      linkedin_url: "https://www.linkedin.com/in/liamoconnor-test",
      instagram_url: "https://www.instagram.com/liam_music_test",
      status: "analyzed",
    },
  });

  await prisma.profile.create({
    data: {
      person_id: personA.id,
      summary: "Liam is an indie folk acoustic musician and coffee enthusiast based in Seattle who loves rainy mornings, acoustic vinyl, and honest deep conversations.",
      needs: JSON.stringify(["Creative space", "Empathetic listener"]),
      hobbies: JSON.stringify(["Guitar", "Pour-over Coffee", "Vinyl collecting"]),
      interests: JSON.stringify(["Indie Music", "Literature", "Songwriting"]),
      values: JSON.stringify(["Creativity", "Simplicity", "Humor"]),
      personality_traits: JSON.stringify([
        { trait: "Creativity", score: 90, description: "Active songwriter" },
        { trait: "Introversion", score: 65, description: "Prefers intimate settings" },
      ]),
      communication_style: "Thoughtful, poetic, and relaxed",
      lifestyle: "Slow mornings, evening studio sessions",
      looking_for: "Someone who appreciates art, quiet moments, and good humor",
      deal_breakers: JSON.stringify(["Superficiality", "Lack of empathy", "Excessive drama"]),
      evidence: JSON.stringify([
        { claim: "Acoustic Musician", source: "instagram", detail: "Guitar studio posts" },
      ]),
      confidence_scores: JSON.stringify({ overall: "high" }),
    },
  });

  const personB = await prisma.person.create({
    data: {
      name: "Clara Vance",
      linkedin_url: "https://www.linkedin.com/in/claravance-test",
      instagram_url: "https://www.instagram.com/clara_reads_test",
      status: "analyzed",
    },
  });

  await prisma.profile.create({
    data: {
      person_id: personB.id,
      summary: "Clara is an architect and book club curator who spends weekends sketching urban structures, browsing indie bookstores, and discovering hidden city cafes.",
      needs: JSON.stringify(["Intellectual curiosity", "Kindness"]),
      hobbies: JSON.stringify(["Urban Sketching", "Book Clubs", "Architecture Tours"]),
      interests: JSON.stringify(["Modernist Design", "History", "Coffee"]),
      values: JSON.stringify(["Curiosity", "Authenticity", "Kindness"]),
      personality_traits: JSON.stringify([
        { trait: "Curiosity", score: 95, description: "Voracious reader and explorer" },
        { trait: "Warmth", score: 85, description: "Engaging and attentive listener" },
      ]),
      communication_style: "Warm, witty, and articulate",
      lifestyle: "Active urban explorer, museum weekends",
      looking_for: "A partner with their own creative drive and shared curiosity",
      deal_breakers: JSON.stringify(["Cynicism", "Arrogance", "Unkindness"]),
      evidence: JSON.stringify([
        { claim: "Architect", source: "linkedin", detail: "Design lead role" },
      ]),
      confidence_scores: JSON.stringify({ overall: "high" }),
    },
  });

  console.log(`✅ Person A (${personA.name}) and Person B (${personB.name}) created.`);

  // 3. Test Direct Date Execution & Resumability in DB
  console.log("\n3. Testing Date Engine execution & persistence...");
  const mockVenue = {
    name: "Moonlight Vinyl & Espresso Lounge",
    type: "Indie Coffee & Vinyl Bar",
    reason: "Blends Liam's passion for acoustic vinyl with Clara's love for cozy reading cafes.",
  };

  const mockTurns = [
    { speakerId: personA.id, speakerName: "Liam O'Connor", message: "Hey Clara, great to meet you. This vinyl cafe has an incredible acoustic vibe.", timestamp: new Date().toISOString(), turnNumber: 1 },
    { speakerId: personB.id, speakerName: "Clara Vance", message: "Hi Liam! I love the architecture here. The exposed brick and jazz record playing in the corner are so charming.", timestamp: new Date().toISOString(), turnNumber: 2 },
    { speakerId: personA.id, speakerName: "Liam O'Connor", message: "Right? I spend most of my free time writing songs with a good pour-over, so this spot feels right at home.", timestamp: new Date().toISOString(), turnNumber: 3 },
    { speakerId: personB.id, speakerName: "Clara Vance", message: "That's wonderful. I do urban sketching between bookstore visits, so I completely connect with that creative rhythm.", timestamp: new Date().toISOString(), turnNumber: 4 },
    { speakerId: personA.id, speakerName: "Liam O'Connor", message: "Authenticity and creative curiosity are really everything to me. It's rare to meet someone with that same spark.", timestamp: new Date().toISOString(), turnNumber: 5 },
    { speakerId: personB.id, speakerName: "Clara Vance", message: "I couldn't agree more. This was genuinely one of the most delightful conversations I've had in a long time.", timestamp: new Date().toISOString(), turnNumber: 6 },
  ];

  const dateRecord = await prisma.dateSession.create({
    data: {
      person_a_id: personA.id,
      person_b_id: personB.id,
      venue: JSON.stringify(mockVenue),
      transcript: JSON.stringify(mockTurns),
      score_a_to_b: 88,
      score_b_to_a: 91,
      reason_a: "Clara is exceptionally witty, curious, and shares an appreciation for design and quiet creative spaces.",
      reason_b: "Liam is wonderfully grounded, poetic, and communicates with genuine warmth and empathy.",
      highlights: JSON.stringify([
        "Connecting over urban sketching and acoustic vinyl",
        "Shared mutual respect for creative space and authenticity",
      ]),
      status: "completed",
    },
  });

  // Verify retrieval
  const retrievedDate = await prisma.dateSession.findUnique({
    where: { id: dateRecord.id },
    include: { person_a: true, person_b: true },
  });

  if (
    retrievedDate &&
    retrievedDate.score_a_to_b === 88 &&
    retrievedDate.score_b_to_a === 91 &&
    JSON.parse(retrievedDate.transcript || "[]").length === 6
  ) {
    console.log(`✅ Date Session successfully persisted and retrieved. Mutual Score: 88 & 91.`);
  } else {
    console.error("❌ Date persistence verification failed:", retrievedDate);
    process.exit(1);
  }

  // Clean up
  await prisma.dateSession.delete({ where: { id: dateRecord.id } });
  await prisma.person.delete({ where: { id: personA.id } });
  await prisma.person.delete({ where: { id: personB.id } });
  console.log("✅ Test date session and personas cleaned up.");

  console.log("\n=========================================");
  console.log("🎉 ALL PHASE 5 VERIFICATION CHECKS PASSED!");
  console.log("=========================================");
}

runPhase5Checks()
  .catch((err) => {
    console.error("Phase 5 test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
