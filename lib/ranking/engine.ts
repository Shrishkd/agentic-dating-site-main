import { prisma } from "../db";
import { callGemini } from "../llm/client";
import { prescreen } from "../dating/matchmaker";
import { AgentProfileAnalysis } from "../agents/types";

export interface ComputedRankItem {
  rankedPersonId: string;
  rankedPersonName: string;
  rankedPersonPhoto?: string;
  rank: number;
  scoreGiven: number;
  scoreReceived: number;
  finalScore: number;
  fitCategory: "mutual_spark" | "high_fit" | "good_potential" | "one_sided" | "low_fit" | "not_dated";
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

export function parseProfile(p: any): AgentProfileAnalysis | null {
  if (!p) return null;
  const arr = (v: string) => {
    try {
      const x = JSON.parse(v || "[]");
      return Array.isArray(x) ? x : [];
    } catch {
      return [];
    }
  };
  return {
    summary: p.summary,
    needs: arr(p.needs),
    hobbies: arr(p.hobbies),
    interests: arr(p.interests),
    values: arr(p.values),
    personality_traits: arr(p.personality_traits),
    communication_style: p.communication_style,
    lifestyle: p.lifestyle,
    looking_for: p.looking_for,
    deal_breakers: arr(p.deal_breakers),
    evidence: arr(p.evidence),
  } as AgentProfileAnalysis;
}

/**
 * Top mutual pairs across all completed dates (read-only, no LLM calls).
 */
export async function computeTopMutualPairs(limit = 10): Promise<TopMutualPair[]> {
  const dates = await prisma.dateSession.findMany({
    where: { status: "completed" },
    include: { person_a: { include: { rawData: true } }, person_b: { include: { rawData: true } } },
  });

  const seen = new Set<string>();
  const pairs: TopMutualPair[] = [];
  for (const d of dates) {
    const key = [d.person_a_id, d.person_b_id].sort().join("-");
    if (seen.has(key)) continue;
    seen.add(key);
    const scoreA = d.score_a_to_b ?? 70;
    const scoreB = d.score_b_to_a ?? 70;
    pairs.push({
      personAId: d.person_a.id,
      personAName: d.person_a.name,
      personAPhoto: extractPhotoUrl(d.person_a.rawData),
      personBId: d.person_b.id,
      personBName: d.person_b.name,
      personBPhoto: extractPhotoUrl(d.person_b.rawData),
      scoreAToB: scoreA,
      scoreBToA: scoreB,
      mutualScore: parseFloat(((scoreA + scoreB) / 2).toFixed(1)),
      dateSessionId: d.id,
    });
  }
  pairs.sort((a, b) => b.mutualScore - a.mutualScore);
  return pairs.slice(0, limit);
}

/**
 * Computes and persists a full ranking for every analyzed candidate:
 * people they actually dated come first (ranked by the agents' scorecards),
 * followed by everyone else ranked by the agent's pre-screen estimate.
 */
export async function computeAllRankings(): Promise<{
  totalRanked: number;
  topMutualPairs: TopMutualPair[];
}> {
  const [candidates, dates] = await Promise.all([
    prisma.person.findMany({
      where: { status: "analyzed" },
      include: { profile: true },
    }),
    prisma.dateSession.findMany({
      where: { status: "completed" },
    }),
  ]);

  if (candidates.length < 2) {
    return { totalRanked: 0, topMutualPairs: [] };
  }

  const candidateMap = new Map(candidates.map((c) => [c.id, c]));
  const profiles = new Map(candidates.map((c) => [c.id, parseProfile(c.profile)]));
  const rows: Array<{
    person_id: string;
    ranked_person_id: string;
    rank: number;
    final_score: number;
    explanation: string;
  }> = [];

  for (const candidate of candidates) {
    const dated: Array<{ partnerId: string; scoreGiven: number; scoreReceived: number; finalScore: number; reasonGiven: string }> = [];
    const datedIds = new Set<string>();

    for (const d of dates) {
      if (d.person_a_id !== candidate.id && d.person_b_id !== candidate.id) continue;
      const isA = d.person_a_id === candidate.id;
      const partnerId = isA ? d.person_b_id : d.person_a_id;
      if (datedIds.has(partnerId) || !candidateMap.has(partnerId)) continue;
      datedIds.add(partnerId);
      const scoreGiven = (isA ? d.score_a_to_b : d.score_b_to_a) ?? 70;
      const scoreReceived = (isA ? d.score_b_to_a : d.score_a_to_b) ?? 70;
      dated.push({
        partnerId,
        scoreGiven,
        scoreReceived,
        // Weighted formula: 0.6 * how much they liked the match + 0.4 * how much the match liked them
        finalScore: parseFloat((0.6 * scoreGiven + 0.4 * scoreReceived).toFixed(1)),
        reasonGiven: (isA ? d.reason_a : d.reason_b) || "",
      });
    }
    dated.sort((a, b) => b.finalScore - a.finalScore);

    const undated: Array<{ partnerId: string; finalScore: number; shared: string[] }> = [];
    const myProfile = profiles.get(candidate.id);
    for (const other of candidates) {
      if (other.id === candidate.id || datedIds.has(other.id)) continue;
      const theirProfile = profiles.get(other.id);
      if (!myProfile || !theirProfile) continue;
      const ab = prescreen(myProfile, theirProfile);
      const ba = prescreen(theirProfile, myProfile);
      undated.push({
        partnerId: other.id,
        finalScore: parseFloat((0.6 * ab.score + 0.4 * ba.score).toFixed(1)),
        shared: Array.from(new Set([...ab.shared, ...ba.shared])).slice(0, 4),
      });
    }
    undated.sort((a, b) => b.finalScore - a.finalScore);

    let rank = 0;
    for (const match of dated) {
      rank++;
      const partner = candidateMap.get(match.partnerId)!;
      let explanation = match.reasonGiven
        ? `${candidate.name}'s agent after the date: ${match.reasonGiven}`
        : `${candidate.name} scored ${partner.name} ${Math.round(match.scoreGiven)}/100; ${partner.name} scored back ${Math.round(match.scoreReceived)}/100.`;

      // Gemini synthesis for the top 3 dated matches
      if (rank <= 3 && candidate.profile && partner.profile) {
        try {
          const prompt = `Explain in 2 concise sentences why ${candidate.name} and ${partner.name} matched with a compatibility score of ${match.finalScore}% after their agents went on a date.
Highlight their key shared lifestyle or values, and 1 subtle difference or area to watch.

${candidate.name}'s agent's verdict: ${match.reasonGiven}
${candidate.name}'s Profile: ${candidate.profile.summary} | Hobbies: ${candidate.profile.hobbies} | Values: ${candidate.profile.values}
${partner.name}'s Profile: ${partner.profile.summary} | Hobbies: ${partner.profile.hobbies} | Values: ${partner.profile.values}`;

          const res = await callGemini(prompt, {
            model: process.env.GEMINI_MODEL_DATING || "gemini-3.5-flash-lite",
            temperature: 0.4,
          });
          if (res.text && res.text.trim().length > 10) {
            explanation = res.text.trim();
          }
        } catch {
          // keep the agent's own verdict
        }
      }

      rows.push({ person_id: candidate.id, ranked_person_id: match.partnerId, rank, final_score: match.finalScore, explanation });
    }

    for (const match of undated) {
      rank++;
      const partner = candidateMap.get(match.partnerId)!;
      const explanation = `Not dated yet. ${candidate.name}'s agent pre-screened ${partner.name}${
        match.shared.length ? ` and found overlap in: ${match.shared.join(", ")}` : " and found little overlap"
      }. Estimate only; a real date would replace this score.`;
      rows.push({ person_id: candidate.id, ranked_person_id: match.partnerId, rank, final_score: match.finalScore, explanation });
    }
  }

  await prisma.$transaction([prisma.ranking.deleteMany(), prisma.ranking.createMany({ data: rows })]);

  return { totalRanked: rows.length, topMutualPairs: await computeTopMutualPairs() };
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
