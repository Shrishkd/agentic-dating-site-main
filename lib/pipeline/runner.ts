import { prisma } from "../db";
import { scrapeAllPeople } from "../scrapers/orchestrator";
import { analyzeAllPeople } from "../agents/analyzer";
import { runPairDate, generateUniquePairs } from "../dating/engine";
import { computeAllRankings } from "../ranking/engine";

export interface PipelineProgressEvent {
  step: 1 | 2 | 3 | 4;
  stepName: string;
  current: number;
  total: number;
  message: string;
  data?: any;
}

/**
 * Runs the complete autonomous AgentMatch pipeline:
 * Step 1: Scrape All Candidates
 * Step 2: Generate AI Personas via Gemini
 * Step 3: Run Multi-Turn Speed Dates across all unique pairs
 * Step 4: Compute Mutual Compatibility Rankings & Explanations
 */
export async function runEntirePipeline(
  onProgress?: (event: PipelineProgressEvent) => void
): Promise<{
  scrapedCount: number;
  analyzedCount: number;
  datesCount: number;
  rankingsCount: number;
}> {
  // Step 1: Scraping Pipeline
  if (onProgress) {
    onProgress({
      step: 1,
      stepName: "Scraping Profiles",
      current: 0,
      total: 100,
      message: "Scraping public LinkedIn & Instagram profile footprint via Apify...",
    });
  }

  const scrapeResults = await scrapeAllPeople(3, { force: false });
  const scrapedCount = scrapeResults.filter((r) => r.status === "scraped" || r.status === "cached").length;

  if (onProgress) {
    onProgress({
      step: 1,
      stepName: "Scraping Profiles",
      current: 100,
      total: 100,
      message: `Scraping completed. ${scrapedCount} candidate profiles ready.`,
      data: { scrapedCount },
    });
  }

  // Step 2: Gemini Agent Persona Analysis
  if (onProgress) {
    onProgress({
      step: 2,
      stepName: "Analyzing AI Personas",
      current: 0,
      total: 100,
      message: "Generating structured dating personas and citing evidence with Gemini...",
    });
  }

  const analysisResult = await analyzeAllPeople({ force: false });

  if (onProgress) {
    onProgress({
      step: 2,
      stepName: "Analyzing AI Personas",
      current: 100,
      total: 100,
      message: `Persona generation completed. ${analysisResult.successCount} personas ready.`,
      data: analysisResult,
    });
  }

  // Step 3: Speed Dating Engine
  const analyzedCandidates = await prisma.person.findMany({
    where: { status: "analyzed" },
    select: { id: true, name: true },
  });

  const pairs = generateUniquePairs(analyzedCandidates.map((c) => c.id));

  if (onProgress) {
    onProgress({
      step: 3,
      stepName: "Pairwise Speed Dating",
      current: 0,
      total: pairs.length,
      message: `Running speed dates across ${pairs.length} unique pairs...`,
    });
  }

  let completedDatesCount = 0;
  for (let i = 0; i < pairs.length; i++) {
    const [pA, pB] = pairs[i];
    await runPairDate(pA, pB);
    completedDatesCount++;

    if (onProgress) {
      onProgress({
        step: 3,
        stepName: "Pairwise Speed Dating",
        current: completedDatesCount,
        total: pairs.length,
        message: `Completed date ${completedDatesCount} of ${pairs.length}...`,
      });
    }
  }

  // Step 4: Mutual Rankings Calculation
  if (onProgress) {
    onProgress({
      step: 4,
      stepName: "Mutual Fit Rankings",
      current: 0,
      total: 100,
      message: "Computing weighted mutual scores and match explanations...",
    });
  }

  const rankingResult = await computeAllRankings();

  if (onProgress) {
    onProgress({
      step: 4,
      stepName: "Mutual Fit Rankings",
      current: 100,
      total: 100,
      message: `Pipeline complete! ${rankingResult.totalRanked} rankings computed.`,
      data: rankingResult,
    });
  }

  return {
    scrapedCount,
    analyzedCount: analysisResult.successCount,
    datesCount: completedDatesCount,
    rankingsCount: rankingResult.totalRanked,
  };
}
