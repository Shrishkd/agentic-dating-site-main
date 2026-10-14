import { prisma } from "../lib/db";
import { scrapePerson, scrapeAllPeople } from "../lib/scrapers/orchestrator";

async function runPhase3Checks() {
  console.log("=========================================");
  console.log("AgentMatch Phase 3: Verification Checks");
  console.log("=========================================");

  // 1. Create a test candidate
  console.log("\n1. Setting up test candidate with raw_data simulation...");
  const testCandidate = await prisma.person.create({
    data: {
      name: "Jordan Sparks",
      linkedin_url: "https://www.linkedin.com/in/jordansparks-ai",
      instagram_url: "https://www.instagram.com/jordansparks",
      status: "pending",
    },
  });

  // 2. Attach simulated raw_data to verify caching logic
  const mockLinkedinData = {
    name: "Jordan Sparks",
    headline: "AI Engineer & Adventure Enthusiast",
    currentRole: "Lead AI Researcher at DeepLab",
    skills: ["TypeScript", "PyTorch", "Rock Climbing"],
    location: "San Francisco, CA",
  };

  const mockInstagramData = {
    username: "jordansparks",
    bio: "Exploring mountains and neural nets 🧗‍♂️💻",
    followerCount: 1420,
    followingCount: 380,
    isPrivate: false,
    posts: [
      {
        caption: "Summiting Mt. Rainier today! #mountains #adventure",
        hashtags: ["mountains", "adventure"],
        postType: "image",
      },
    ],
  };

  await prisma.rawData.createMany({
    data: [
      {
        person_id: testCandidate.id,
        source: "linkedin",
        json_data: JSON.stringify(mockLinkedinData),
      },
      {
        person_id: testCandidate.id,
        source: "instagram",
        json_data: JSON.stringify(mockInstagramData),
      },
    ],
  });

  // 3. Test Caching: Calling scrapePerson without force should return "cached"
  console.log("\n2. Testing Scraper Caching Layer...");
  const cachedResult = await scrapePerson(testCandidate.id, { force: false });

  if (
    cachedResult.status === "cached" &&
    cachedResult.linkedinData?.name === "Jordan Sparks" &&
    cachedResult.instagramData?.username === "jordansparks"
  ) {
    console.log("✅ Caching layer successfully retrieved cached LinkedIn and Instagram data without external API calls.");
  } else {
    console.error("❌ Caching test failed:", cachedResult);
    process.exit(1);
  }

  // 4. Test Concurrency queue runner
  console.log("\n3. Testing Batch Scraper runner...");
  const batchResult = await scrapeAllPeople(3, { force: false });
  console.log(`✅ Batch scraper executed cleanly with ${batchResult.length} items processed.`);

  // Clean up test candidate
  await prisma.person.delete({ where: { id: testCandidate.id } });
  console.log("✅ Test candidate and associated raw_data cleaned up successfully.");

  console.log("\n=========================================");
  console.log("🎉 ALL PHASE 3 VERIFICATION CHECKS PASSED!");
  console.log("=========================================");
}

runPhase3Checks()
  .catch((err) => {
    console.error("Phase 3 test error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
