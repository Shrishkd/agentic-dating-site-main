import { prisma } from "../db";
import { scrapeAllPeople } from "../scrapers/orchestrator";
import { analyzeAllPeople } from "../agents/analyzer";
import { runPairDate, buildScheduleFromDb } from "../dating/engine";
import { runWithConcurrency } from "../dating/matchmaker";
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
 * Step 3: Agents pre-screen the pool, then go on multi-turn dates with their shortlist
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

  // Step 3: Agent pre-screen + dating
  const schedule = await buildScheduleFromDb();

  if (onProgress) {
    onProgress({
      step: 3,
      stepName: "Agents Dating",
      current: 0,
      total: schedule.length,
      message: `Agents pre-screened the pool and booked ${schedule.length} dates...`,
    });
  }

  let completedDatesCount = 0;
  const concurrency = parseInt(process.env.DATE_CONCURRENCY || "3", 10);
  await runWithConcurrency(schedule, concurrency, async (pair) => {
    try {
      await runPairDate(pair.personAId, pair.personBId);
    } catch (err) {
      console.error("[Pipeline] Date failed:", pair, err);
    }
    completedDatesCount++;

    if (onProgress) {
      onProgress({
        step: 3,
        stepName: "Agents Dating",
        current: completedDatesCount,
        total: schedule.length,
        message: `Completed date ${completedDatesCount} of ${schedule.length}...`,
      });
    }
  });

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
