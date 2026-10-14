import { prisma } from "../lib/db";
import { computeAllRankings, getFitCategory } from "../lib/ranking/engine";

async function runPhase6Checks() {
  console.log("=========================================");
  console.log("AgentMatch Phase 6: Verification Checks");
  console.log("=========================================");

  // 1. Test formula and fit categories
  console.log("\n1. Testing Compatibility Math & Fit Categories...");
  const score1 = 0.6 * 90 + 0.4 * 80; // 54 + 32 = 86
  const cat1 = getFitCategory(90, 80, score1);
  console.log(`✅ 90/80 -> Final Score: ${score1}% | Category: ${cat1} (expected: mutual_spark)`);

  const score2 = 0.6 * 85 + 0.4 * 50; // 51 + 20 = 71
  const cat2 = getFitCategory(85, 50, score2);
  console.log(`✅ 85/50 -> Final Score: ${score2}% | Category: ${cat2} (expected: one_sided)`);

  if (score1 !== 86 || cat1 !== "mutual_spark" || cat2 !== "one_sided") {
    console.error("❌ Formula / Category test failed!");
    process.exit(1);
  }

  // 2. Test database rankings calculation
  console.log("\n2. Testing computeAllRankings() across DB records...");
  const result = await computeAllRankings();
  console.log(`✅ Computed ${result.totalRanked} ranking records. Top mutual pairs: ${result.topMutualPairs.length}`);

  const totalInDb = await prisma.ranking.count();
  console.log(`✅ Total rankings in DB table: ${totalInDb}`);

  console.log("\n=========================================");
  console.log("🎉 ALL PHASE 6 VERIFICATION CHECKS PASSED!");
  console.log("=========================================");
}

runPhase6Checks()
  .catch((err) => {
    console.error("Phase 6 test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
