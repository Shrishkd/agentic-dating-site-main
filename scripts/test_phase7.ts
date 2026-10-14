import fs from "fs";
import path from "path";

async function runPhase7Checks() {
  console.log("=========================================");
  console.log("AgentMatch Phase 7: Verification Checks");
  console.log("=========================================");

  // 1. Verify Demo Snapshot File
  console.log("\n1. Testing data/demo-snapshot.json...");
  const filePath = path.join(process.cwd(), "data", "demo-snapshot.json");

  if (!fs.existsSync(filePath)) {
    console.error("❌ Snapshot file missing:", filePath);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);

  if (
    Array.isArray(data.candidates) &&
    data.candidates.length >= 4 &&
    Array.isArray(data.dates) &&
    data.dates.length >= 2 &&
    Array.isArray(data.topMutualPairs)
  ) {
    console.log(`✅ Demo Snapshot verified with ${data.candidates.length} candidates, ${data.dates.length} completed dates, and ${data.topMutualPairs.length} top mutual pairs.`);
  } else {
    console.error("❌ Invalid snapshot structure:", data);
    process.exit(1);
  }

  // 2. Verify Date transcript integrity in snapshot
  console.log("\n2. Testing Date Transcript Structure in Demo Snapshot...");
  const date1 = data.dates[0];
  if (
    date1.turns &&
    date1.turns.length === 6 &&
    date1.venue?.name &&
    date1.scoreAToB?.overall_score &&
    date1.scoreBToA?.overall_score
  ) {
    console.log(`✅ Date "${date1.personAName} + ${date1.personBName}" verified with 6 turns, venue "${date1.venue.name}", and both scorecards.`);
  } else {
    console.error("❌ Date transcript structure invalid:", date1);
    process.exit(1);
  }

  console.log("\n=========================================");
  console.log("🎉 ALL PHASE 7 VERIFICATION CHECKS PASSED!");
  console.log("=========================================");
}

runPhase7Checks().catch((err) => {
  console.error("Phase 7 test error:", err);
  process.exit(1);
});
