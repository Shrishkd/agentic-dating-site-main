import { prisma } from "../db";
import { callGemini } from "../llm/client";

export interface ComputedRankItem {
  rankedPersonId: string;
  rankedPersonName: string;
  rankedPersonPhoto?: string;
  rank: number;
  scoreGiven: number;
  scoreReceived: number;
  finalScore: number;
  fitCategory: "mutual_spark" | "high_fit" | "good_potential" | "one_sided" | "low_fit";
  explanation: string;
  dateSessionId: string;
}

export interface TopMutualPair {
  personAId: string;
  personAName: string;
  personAPhoto?: string;
  personBId: string;
  personBName: string;
  personBPhoto?: string;
  scoreAToB: number;
  scoreBToA: number;
  mutualScore: number;
  dateSessionId: string;
}

export interface HeatmapCell {
  personAId: string;
  personAName: string;
  personBId: string;
  personBName: string;
  scoreAToB: number | null;
  scoreBToA: number | null;
  mutualScore: number | null;
  dateSessionId?: string;
}

function extractPhotoUrl(rawData: any[]): string | undefined {
  if (!rawData) return undefined;
  for (const raw of rawData) {
    try {
      const parsed = JSON.parse(raw.json_data);
      if (parsed.profilePhotoUrl) return parsed.profilePhotoUrl;
    } catch {}
  }
  return undefined;
}

/**
 * Computes the compatibility category based on mutual scores.
 */
export function getFitCategory(
  scoreGiven: number,
  scoreReceived: number,
  finalScore: number
): ComputedRankItem["fitCategory"] {
  if (scoreGiven >= 75 && scoreReceived >= 75) return "mutual_spark";
  if (finalScore >= 75) return "high_fit";
  if (Math.abs(scoreGiven - scoreReceived) >= 25) return "one_sided";
  if (finalScore >= 55) return "good_potential";
  return "low_fit";
}

/**
 * Computes and persists rankings for all candidates who have completed dates.
 */
export async function computeAllRankings(): Promise<{
  totalRanked: number;
  topMutualPairs: TopMutualPair[];
}> {
  // Fetch all candidates and completed dates
  const [candidates, dates] = await Promise.all([
    prisma.person.findMany({
      include: { profile: true, rawData: true },
    }),
    prisma.dateSession.findMany({
      where: { status: "completed" },
      include: { person_a: true, person_b: true },
    }),
  ]);

  if (candidates.length === 0 || dates.length === 0) {
    return { totalRanked: 0, topMutualPairs: [] };
  }

  // Clear existing rankings table for clean refresh
  await prisma.ranking.deleteMany();

  const candidateMap = new Map(candidates.map((c) => [c.id, c]));
  let totalRanked = 0;

  for (const candidate of candidates) {
    // Find all dates involving this candidate
    const relevantDates = dates.filter(
      (d) => d.person_a_id === candidate.id || d.person_b_id === candidate.id
    );

    if (relevantDates.length === 0) continue;

    const candidateMatches: Array<{
      partnerId: string;
      scoreGiven: number;
      scoreReceived: number;
      finalScore: number;
      dateSessionId: string;
      reasonGiven: string;
      reasonReceived: string;
    }> = [];

    for (const d of relevantDates) {
      const isCandidateA = d.person_a_id === candidate.id;
      const partnerId = isCandidateA ? d.person_b_id : d.person_a_id;
      const scoreGiven = isCandidateA ? d.score_a_to_b ?? 70 : d.score_b_to_a ?? 70;
      const scoreReceived = isCandidateA ? d.score_b_to_a ?? 70 : d.score_a_to_b ?? 70;
      const reasonGiven = isCandidateA ? d.reason_a || "" : d.reason_b || "";
      const reasonReceived = isCandidateA ? d.reason_b || "" : d.reason_a || "";

      // Weighted formula: 0.6 * given + 0.4 * received
      const finalScore = parseFloat((0.6 * scoreGiven + 0.4 * scoreReceived).toFixed(1));

      candidateMatches.push({
        partnerId,
        scoreGiven,
        scoreReceived,
        finalScore,
        dateSessionId: d.id,
        reasonGiven,
        reasonReceived,
      });
    }

    // Sort by finalScore in descending order
    candidateMatches.sort((a, b) => b.finalScore - a.finalScore);

    // Save rankings to DB
    for (let rankIndex = 0; rankIndex < candidateMatches.length; rankIndex++) {
      const match = candidateMatches[rankIndex];
      const rank = rankIndex + 1;
      const partner = candidateMap.get(match.partnerId);

      let explanation = `${candidate.name} scored ${partner?.name || "them"} ${Math.round(
        match.scoreGiven
      )}/100, while ${partner?.name || "they"} rated ${candidate.name} ${Math.round(
        match.scoreReceived
      )}/100. Overall compatibility: ${match.finalScore}%.`;

      // Generate Gemini explanation for top 3 matches
      if (rank <= 3 && candidate.profile && partner?.profile) {
        try {
          const prompt = `Explain in 2 concise sentences why ${candidate.name} and ${partner.name} matched with a compatibility score of ${match.finalScore}%.
Highlight their key shared lifestyle or values, and 1 subtle difference or area to watch.

${candidate.name}'s Profile: ${candidate.profile.summary} | Hobbies: ${candidate.profile.hobbies} | Values: ${candidate.profile.values}
${partner.name}'s Profile: ${partner.profile.summary} | Hobbies: ${partner.profile.hobbies} | Values: ${partner.profile.values}`;

          const res = await callGemini(prompt, {
            model: process.env.GEMINI_MODEL_DATING || "gemini-2.5-flash-lite",
            temperature: 0.4,
          });
          if (res.text && res.text.trim().length > 10) {
            explanation = res.text.trim();
          }
        } catch (llmErr) {
          // Fallback to formatted explanation
        }
      }

      await prisma.ranking.create({
        data: {
          person_id: candidate.id,
          ranked_person_id: match.partnerId,
          rank,
          final_score: match.finalScore,
          explanation,
        },
      });

      totalRanked++;
    }
  }

  // Calculate top mutual pairs
  const topMutualPairs: TopMutualPair[] = [];
  const processedPairKeys = new Set<string>();

  for (const d of dates) {
    const pairKey = [d.person_a_id, d.person_b_id].sort().join("-");
    if (processedPairKeys.has(pairKey)) continue;
    processedPairKeys.add(pairKey);

    const scoreA = d.score_a_to_b ?? 70;
    const scoreB = d.score_b_to_a ?? 70;
    const mutualScore = parseFloat(((scoreA + scoreB) / 2).toFixed(1));

    const pA = candidateMap.get(d.person_a_id);
    const pB = candidateMap.get(d.person_b_id);

    if (pA && pB) {
      topMutualPairs.push({
        personAId: pA.id,
        personAName: pA.name,
        personAPhoto: extractPhotoUrl(pA.rawData),
        personBId: pB.id,
        personBName: pB.name,
        personBPhoto: extractPhotoUrl(pB.rawData),
        scoreAToB: scoreA,
        scoreBToA: scoreB,
        mutualScore,
        dateSessionId: d.id,
      });
    }
  }

  topMutualPairs.sort((a, b) => b.mutualScore - a.mutualScore);

  return { totalRanked, topMutualPairs: topMutualPairs.slice(0, 10) };
}

/**
 * Builds the pairwise matrix for the compatibility heatmap.
 */
export async function getHeatmapMatrix(): Promise<{
  candidates: Array<{ id: string; name: string; photoUrl?: string }>;
  matrix: HeatmapCell[][];
}> {
  const [candidates, dates] = await Promise.all([
    prisma.person.findMany({
      where: { status: "analyzed" },
      include: { rawData: true },
      orderBy: { name: "asc" },
    }),
    prisma.dateSession.findMany({
      where: { status: "completed" },
    }),
  ]);

  const candidateList = candidates.map((c) => ({
    id: c.id,
    name: c.name,
    photoUrl: extractPhotoUrl(c.rawData),
  }));

  const matrix: HeatmapCell[][] = [];

  for (let i = 0; i < candidates.length; i++) {
    const row: HeatmapCell[] = [];
    const pA = candidates[i];

    for (let j = 0; j < candidates.length; j++) {
      const pB = candidates[j];

      if (i === j) {
        row.push({
          personAId: pA.id,
          personAName: pA.name,
          personBId: pB.id,
          personBName: pB.name,
          scoreAToB: null,
          scoreBToA: null,
          mutualScore: null,
        });
        continue;
      }

      // Find date
      const date = dates.find(
        (d) =>
          (d.person_a_id === pA.id && d.person_b_id === pB.id) ||
          (d.person_a_id === pB.id && d.person_b_id === pA.id)
      );

      if (!date) {
        row.push({
          personAId: pA.id,
          personAName: pA.name,
          personBId: pB.id,
          personBName: pB.name,
          scoreAToB: null,
          scoreBToA: null,
          mutualScore: null,
        });
      } else {
        const isCandidateA = date.person_a_id === pA.id;
        const scoreAToB = isCandidateA ? date.score_a_to_b : date.score_b_to_a;
        const scoreBToA = isCandidateA ? date.score_b_to_a : date.score_a_to_b;
        const mutualScore =
          scoreAToB !== null && scoreBToA !== null
            ? parseFloat(((scoreAToB + scoreBToA) / 2).toFixed(1))
            : null;

        row.push({
          personAId: pA.id,
          personAName: pA.name,
          personBId: pB.id,
          personBName: pB.name,
          scoreAToB,
          scoreBToA,
          mutualScore,
          dateSessionId: date.id,
        });
      }
    }
    matrix.push(row);
  }

  return { candidates: candidateList, matrix };
}
