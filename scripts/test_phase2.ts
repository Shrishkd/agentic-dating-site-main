import {
  validateLinkedInUrl,
  validateInstagramUrl,
  parseBulkInput,
} from "../lib/validation";
import { prisma } from "../lib/db";

async function runPhase2Checks() {
  console.log("=========================================");
  console.log("AgentMatch Phase 2: Verification Checks");
  console.log("=========================================");

  // 1. LinkedIn Validation Test
  console.log("\n1. Testing LinkedIn URL Validation...");
  const validLinkedIn = validateLinkedInUrl("https://www.linkedin.com/in/satyanadella/?ref=tracker");
  const invalidLinkedInCompany = validateLinkedInUrl("https://linkedin.com/company/microsoft");
  const invalidLinkedInPost = validateLinkedInUrl("https://linkedin.com/feed/update/urn:li:activity:123");

  if (
    validLinkedIn.valid &&
    validLinkedIn.cleanUrl === "https://www.linkedin.com/in/satyanadella" &&
    !invalidLinkedInCompany.valid &&
    !invalidLinkedInPost.valid
  ) {
    console.log("✅ LinkedIn URL validator correctly handles valid profiles, query parameters, and rejects company/feed URLs.");
  } else {
    console.error("❌ LinkedIn validator test failed:", {
      validLinkedIn,
      invalidLinkedInCompany,
      invalidLinkedInPost,
    });
    process.exit(1);
  }

  // 2. Instagram Validation Test
  console.log("\n2. Testing Instagram URL Validation...");
  const validIG = validateInstagramUrl("https://instagram.com/natgeo?igsh=123");
  const invalidIGPost = validateInstagramUrl("https://instagram.com/p/C123456789/");
  const invalidIGReel = validateInstagramUrl("https://instagram.com/reel/C987654321/");

  if (
    validIG.valid &&
    validIG.cleanUrl === "https://www.instagram.com/natgeo" &&
    !invalidIGPost.valid &&
    !invalidIGReel.valid
  ) {
    console.log("✅ Instagram URL validator correctly handles valid profiles, query parameters, and rejects post/reel links.");
  } else {
    console.error("❌ Instagram validator test failed:", {
      validIG,
      invalidIGPost,
      invalidIGReel,
    });
    process.exit(1);
  }

  // 3. Bulk Input Parsing Test
  console.log("\n3. Testing Bulk Text Parsing...");
  const sampleBulkText = `
    Alice Walker, https://linkedin.com/in/alicewalker, https://instagram.com/alicewalker
    Bob Stone, https://linkedin.com/in/bobstone, https://instagram.com/bobstone
    # Comment line
    Invalid Line Without URLs
  `;
  const parsed = parseBulkInput(sampleBulkText);
  const validCount = parsed.filter((p) => p.isValid).length;
  const invalidCount = parsed.filter((p) => !p.isValid).length;

  if (validCount === 2 && invalidCount === 1) {
    console.log(`✅ Bulk parsing identified ${validCount} valid entries and ${invalidCount} invalid row.`);
  } else {
    console.error("❌ Bulk parsing test failed:", { validCount, invalidCount, parsed });
    process.exit(1);
  }

  // 4. Database CRUD & "pending" status verification
  console.log("\n4. Testing Database insertion and pending status...");
  const testPerson = await prisma.person.create({
    data: {
      name: "Test Candidate",
      linkedin_url: "https://www.linkedin.com/in/test-candidate-xyz",
      instagram_url: "https://www.instagram.com/test_candidate_xyz",
      status: "pending",
    },
  });

  if (testPerson.id && testPerson.status === "pending") {
    console.log(`✅ Person created with ID "${testPerson.id}" and status "${testPerson.status}".`);
  } else {
    console.error("❌ Person creation failed:", testPerson);
    process.exit(1);
  }

  // Clean up
  await prisma.person.delete({ where: { id: testPerson.id } });
  console.log("✅ Test person record cleaned up successfully.");

  console.log("\n=========================================");
  console.log("🎉 ALL PHASE 2 VERIFICATION CHECKS PASSED!");
  console.log("=========================================");
}

runPhase2Checks()
  .catch((err) => {
    console.error("Phase 2 test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
