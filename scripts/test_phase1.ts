import { prisma } from "../lib/db";
import { globalRateLimiter } from "../lib/llm/rate-limiter";
import { computeInputHash } from "../lib/llm/client";

async function runPhase1Checks() {
  console.log("=========================================");
  console.log("AgentMatch Phase 1: Verification Checks");
  console.log("=========================================");

  // 1. Test Hash generation
  console.log("\n1. Testing LLM Input Hashing...");
  const prompt = "Test prompt for agent persona";
  const hash1 = computeInputHash(prompt, { model: "gemini-2.5-flash" });
  const hash2 = computeInputHash(prompt, { model: "gemini-2.5-flash" });
  const hash3 = computeInputHash(prompt, { model: "gemini-2.5-flash-lite" });

  if (hash1 === hash2 && hash1 !== hash3) {
    console.log("✅ SHA-256 Hash computation is deterministic and model-sensitive.");
    console.log(`   Sample Hash: ${hash1}`);
  } else {
    console.error("❌ Hash computation test failed!");
    process.exit(1);
  }

  // 2. Test Database models
  console.log("\n2. Testing Database models with Prisma...");
  try {
    // Test cache write & read
    const testHash = "test-hash-" + Date.now();
    await prisma.llmCache.create({
      data: {
        input_hash: testHash,
        output: JSON.stringify({ status: "success", test: true }),
      },
    });

    const cached = await prisma.llmCache.findUnique({
      where: { input_hash: testHash },
    });

    if (cached && JSON.parse(cached.output).status === "success") {
      console.log("✅ LLM Cache table read/write working.");
    }

    // Clean up test cache
    await prisma.llmCache.delete({ where: { input_hash: testHash } });

    // Test Person count
    const count = await prisma.person.count();
    console.log(`✅ Person table accessible. Current records: ${count}`);
  } catch (err: any) {
    console.error("❌ Database test failed:", err.message);
    process.exit(1);
  }

  // 3. Test Rate Limiter Status
  console.log("\n3. Testing Rate Limiter Status & Config...");
  const status = globalRateLimiter.getStatus();
  console.log(`✅ Rate Limiter initialized: RPM Limit=${status.rpmLimit}, RPD Limit=${status.rpdLimit}, Keys Configured=${status.totalKeys}`);

  console.log("\n=========================================");
  console.log("🎉 ALL PHASE 1 VERIFICATION CHECKS PASSED!");
  console.log("=========================================");
}

runPhase1Checks()
  .catch((err) => {
    console.error("Fatal test error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
