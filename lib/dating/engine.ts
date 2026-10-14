import { prisma } from "../db";
import { callGemini, callGeminiJson } from "../llm/client";
import { buildAgentPersonaPrompt, PersonaDetails } from "../agents/persona";
import {
  ConversationTurn,
  DateScorecard,
  DateVenueSelection,
  DateSessionData,
} from "./types";
import { AgentProfileAnalysis } from "../agents/types";
import { buildDatingSchedule, getDatesPerPerson, prescreen, ScheduledDate } from "./matchmaker";

const VENUE_SCHEMA = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING", description: "Name of the venue or place" },
    type: { type: "STRING", description: "Type of venue, e.g. Rooftop Tea Garden, Indie Vinyl Cafe, Modern Bistro" },
    reason: { type: "STRING", description: "Why this venue is a fitting setting for both candidates based on their hobbies and lifestyle" },
  },
  required: ["name", "type", "reason"],
};

const SCORECARD_SCHEMA = {
  type: "OBJECT",
  properties: {
    shared_interests: { type: "INTEGER", description: "Score 0-100 on common hobbies and curiosity" },
    values_alignment: { type: "INTEGER", description: "Score 0-100 on shared life principles, ethics, and long-term goals" },
    lifestyle_fit: { type: "INTEGER", description: "Score 0-100 on daily pace, work-life balance, and weekend vibe compatibility" },
    communication_chemistry: { type: "INTEGER", description: "Score 0-100 on conversational banter, rhythm, and mutual engagement" },
    needs_met: { type: "INTEGER", description: "Score 0-100 on whether the partner meets emotional and relational needs" },
    deal_breaker_passed: { type: "BOOLEAN", description: "True if no deal-breakers were violated; False if a deal-breaker was triggered" },
    overall_score: { type: "INTEGER", description: "Final private rating 0-100 of how well this person fits as a romantic match" },
    reason: { type: "STRING", description: "A comprehensive 1-paragraph explanation of the score from this person's perspective" },
    highlights: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Exactly 2 standout moments or conversational quotes from the date",
    },
  },
  required: [
    "shared_interests",
    "values_alignment",
    "lifestyle_fit",
    "communication_chemistry",
    "needs_met",
    "deal_breaker_passed",
    "overall_score",
    "reason",
    "highlights",
  ],
};

/**
 * Loads full persona details for a candidate from DB.
 */
export async function loadCandidatePersona(
  personId: string
): Promise<PersonaDetails> {
  const person = await prisma.person.findUnique({
    where: { id: personId },
    include: { profile: true, rawData: true },
  });

  if (!person || !person.profile) {
    throw new Error(
      `Candidate "${personId}" must have an analyzed profile to participate in dates.`
    );
  }

  let photoUrl: string | undefined;
  for (const raw of person.rawData) {
    try {
      const parsed = JSON.parse(raw.json_data);
      if (parsed.profilePhotoUrl) {
        photoUrl = parsed.profilePhotoUrl;
        break;
      }
    } catch {}
  }

  const profile: AgentProfileAnalysis = {
    summary: person.profile.summary,
    needs: JSON.parse(person.profile.needs),
    hobbies: JSON.parse(person.profile.hobbies),
    interests: JSON.parse(person.profile.interests),
    values: JSON.parse(person.profile.values),
    personality_traits: JSON.parse(person.profile.personality_traits),
    communication_style: person.profile.communication_style,
    lifestyle: person.profile.lifestyle,
    looking_for: person.profile.looking_for,
    deal_breakers: JSON.parse(person.profile.deal_breakers),
    evidence: JSON.parse(person.profile.evidence),
    confidence_scores: person.profile.confidence_scores
      ? JSON.parse(person.profile.confidence_scores)
      : { overall: "medium", personality: "medium", lifestyle: "medium", values: "medium" },
  };

  return {
    personId: person.id,
    name: person.name,
    photoUrl,
    profile,
  };
}

/**
 * Step 1: Proposes an ideal first date venue that accommodates both profiles.
 */
export async function chooseDateVenue(
  candidateA: PersonaDetails,
  candidateB: PersonaDetails
): Promise<DateVenueSelection> {
  const model = process.env.GEMINI_MODEL_DATING || "gemini-3.5-flash-lite";

  const prompt = `Select an ideal first date venue for two candidates based on their profiles:

CANDIDATE 1: ${candidateA.name}
- Summary: ${candidateA.profile.summary}
- Hobbies: ${candidateA.profile.hobbies.join(", ")}
- Lifestyle: ${candidateA.profile.lifestyle}

CANDIDATE 2: ${candidateB.name}
- Summary: ${candidateB.profile.summary}
- Hobbies: ${candidateB.profile.hobbies.join(", ")}
- Lifestyle: ${candidateB.profile.lifestyle}

Select a specific, creative, welcoming venue that feels like a natural match for their shared vibes.`;

  const result = await callGeminiJson<DateVenueSelection>(
    prompt,
    VENUE_SCHEMA,
    {
      model,
      temperature: 0.7,
    }
  );

  return (
    result.data || {
      name: "Cozy Artisan Coffee Roasters",
      type: "Artisan Cafe & Lounge",
      reason: "A warm, relaxed space for easy conversation and shared connection.",
    }
  );
}

/**
 * Step 2: Generates a single turn in the 6-turn date conversation.
 */
export async function runDateTurn(
  speaker: PersonaDetails,
  partner: PersonaDetails,
  turnsSoFar: ConversationTurn[],
  venue: DateVenueSelection,
  turnNumber: number
): Promise<ConversationTurn> {
  const model = process.env.GEMINI_MODEL_DATING || "gemini-3.5-flash-lite";
  const systemInstruction = buildAgentPersonaPrompt(speaker);

  const formattedHistory =
    turnsSoFar.length === 0
      ? "You are just arriving and greeting each other for the first time."
      : turnsSoFar
          .map((t) => `${t.speakerName}: "${t.message}"`)
          .join("\n");

  const turnGoal =
    turnNumber === 1
      ? "Greet your date warmly, comment on the venue or arrival, and open with a relaxed icebreaker."
      : turnNumber === 2
      ? "Respond genuinely to their greeting, comment on the vibe, and share a glimpse into what you've been up to lately."
      : turnNumber === 3 || turnNumber === 4
      ? "Dig deeper into lifestyle, passions, weekend rhythms, or values. If there's an intriguing difference or agreement, react to it."
      : turnNumber === 5
      ? "Discuss future aspirations, personal philosophies, or what meaningful connection means to you. Be honest about what you value."
      : "Wrap up the date with a genuine closing impression reflecting how the conversation felt to you.";

  const prompt = `VENUE: ${venue.name} (${venue.type}) - ${venue.reason}

CONVERSATION SO FAR:
${formattedHistory}

YOUR OBJECTIVE FOR THIS TURN (Turn ${turnNumber}/6):
${turnGoal}

Say your next response naturally in 2 to 4 sentences. Speak directly as ${speaker.name}. Do not include your name prefix (e.g. do not write "${speaker.name}:").`;

  const result = await callGemini(prompt, {
    model,
    systemInstruction,
    temperature: 0.8,
  });

  const cleanedMessage = result.text
    .replace(new RegExp(`^${speaker.name}:\\s*`, "i"), "")
    .replace(/^["']|["']$/g, "")
    .trim();

  return {
    speakerId: speaker.personId,
    speakerName: speaker.name,
    message: cleanedMessage,
    timestamp: new Date().toISOString(),
    turnNumber,
  };
}

/**
 * Step 3: Evaluates private scorecard from one agent's perspective.
 */
export async function scoreDateFromPersona(
  evaluator: PersonaDetails,
  partner: PersonaDetails,
  transcript: ConversationTurn[],
  venue: DateVenueSelection
): Promise<DateScorecard> {
  const model = process.env.GEMINI_MODEL_DATING || "gemini-3.5-flash-lite";

  const systemInstruction = `You are ${evaluator.name}'s dating agent, privately scoring a first date on ${evaluator.name}'s behalf.
${evaluator.name}'s profile (from their public LinkedIn & Instagram):
- Summary: ${evaluator.profile.summary}
- Lifestyle: ${evaluator.profile.lifestyle}
- Hobbies: ${evaluator.profile.hobbies.join(", ")}
- Values: ${evaluator.profile.values.join(", ")}
- Needs: ${evaluator.profile.needs.join(", ")}
- Looking for: ${evaluator.profile.looking_for}
- Deal-Breakers: ${evaluator.profile.deal_breakers.join("; ")}

SCORING RUBRIC — be a tough, calibrated matchmaker, not a polite guest:
- Everyone on these dates is friendly and articulate. Politeness and enthusiasm are NOT evidence of fit; ignore them.
- Judge real fit: overlapping daily life (city, schedule, pace), concrete shared hobbies, compatible values, whether ${evaluator.name}'s specific needs were actually met, and deal-breakers.
- Calibration: 30-50 = poor fit; 50-65 = pleasant but little real overlap; 65-78 = solid potential; 78-88 = strong, specific fit; 89+ = exceptional and rare (use for at most 1 in 10 dates).
- Name at least one concrete friction point or open question (different cities, clashing pace, mismatched life stage, differing priorities). If you can't find a strong reason to go above 70, don't.`;

  const transcriptText = transcript
    .map((t) => `${t.speakerName}: "${t.message}"`)
    .join("\n");

  const prompt = `DATE WITH: ${partner.name}
WHAT ${partner.name.toUpperCase()}'S PUBLIC PROFILE SHOWS:
- Summary: ${partner.profile.summary}
- Lifestyle: ${partner.profile.lifestyle}
- Hobbies: ${partner.profile.hobbies.join(", ")}
- Values: ${partner.profile.values.join(", ")}

VENUE: ${venue.name}

FULL DATE TRANSCRIPT:
${transcriptText}

Score ${partner.name} from ${evaluator.name}'s perspective on every category using the rubric. If any of ${evaluator.name}'s deal-breakers (${evaluator.profile.deal_breakers.join("; ")}) were triggered, set deal_breaker_passed to false. In "reason", say what genuinely fits AND the main friction point.`;

  const result = await callGeminiJson<DateScorecard>(
    prompt,
    SCORECARD_SCHEMA,
    {
      model,
      systemInstruction,
      temperature: 0.2,
    }
  );

  // Blend the model's overall verdict with a weighted average of its sub-scores, so the
  // final number reflects concrete fit dimensions rather than the date's general mood.
  if (result.data) {
    const d = result.data;
    const weighted =
      0.25 * (d.shared_interests ?? 60) +
      0.25 * (d.values_alignment ?? 60) +
      0.2 * (d.lifestyle_fit ?? 60) +
      0.1 * (d.communication_chemistry ?? 60) +
      0.2 * (d.needs_met ?? 60);
    let overall = Math.round(0.5 * (d.overall_score ?? weighted) + 0.5 * weighted);
    if (d.deal_breaker_passed === false) overall = Math.min(overall, 45);
    d.overall_score = Math.max(0, Math.min(100, overall));
  }

  return (
    result.data || {
      shared_interests: 70,
      values_alignment: 70,
      lifestyle_fit: 70,
      communication_chemistry: 70,
      needs_met: 70,
      deal_breaker_passed: true,
      overall_score: 70,
      reason: "Had a pleasant conversation and enjoyed sharing perspectives.",
      highlights: ["Great opening banter", "Engaging discussion on values"],
    }
  );
}

/**
 * Orchestrates a complete date between two candidates.
 */
export async function runPairDate(
  personAId: string,
  personBId: string,
  onEvent?: (event: {
    type: "venue" | "turn" | "score" | "done";
    data: any;
  }) => void
): Promise<DateSessionData> {
  // Check if date already exists in DB
  const existing = await prisma.dateSession.findFirst({
    where: {
      OR: [
        { person_a_id: personAId, person_b_id: personBId },
        { person_a_id: personBId, person_b_id: personAId },
      ],
      status: "completed",
    },
  });

  if (existing && existing.transcript && existing.score_a_to_b !== null) {
    let parsedVenue: any = { name: "Local Spot", type: "Cafe", reason: "Standard meetup" };
    let parsedTranscript: any[] = [];
    let parsedHighlights: string[] = [];

    try {
      parsedVenue = JSON.parse(existing.venue || "{}");
      parsedTranscript = JSON.parse(existing.transcript || "[]");
      parsedHighlights = JSON.parse(existing.highlights || "[]");
    } catch {}

    const sessionData: DateSessionData = {
      id: existing.id,
      personAId: existing.person_a_id,
      personBId: existing.person_b_id,
      venue: parsedVenue,
      turns: parsedTranscript,
      scoreAToB: {
        shared_interests: Math.round(existing.score_a_to_b || 70),
        values_alignment: Math.round(existing.score_a_to_b || 70),
        lifestyle_fit: Math.round(existing.score_a_to_b || 70),
        communication_chemistry: Math.round(existing.score_a_to_b || 70),
        needs_met: Math.round(existing.score_a_to_b || 70),
        deal_breaker_passed: true,
        overall_score: Math.round(existing.score_a_to_b || 70),
        reason: existing.reason_a || "",
        highlights: parsedHighlights.slice(0, 2),
      },
      scoreBToA: {
        shared_interests: Math.round(existing.score_b_to_a || 70),
        values_alignment: Math.round(existing.score_b_to_a || 70),
        lifestyle_fit: Math.round(existing.score_b_to_a || 70),
        communication_chemistry: Math.round(existing.score_b_to_a || 70),
        needs_met: Math.round(existing.score_b_to_a || 70),
        deal_breaker_passed: true,
        overall_score: Math.round(existing.score_b_to_a || 70),
        reason: existing.reason_b || "",
        highlights: parsedHighlights.slice(2, 4),
      },
      status: "completed",
    };

    if (onEvent) {
      onEvent({ type: "done", data: sessionData });
    }
    return sessionData;
  }

  // Load candidate personas
  const [candidateA, candidateB] = await Promise.all([
    loadCandidatePersona(personAId),
    loadCandidatePersona(personBId),
  ]);

  // Create pending date session record in DB
  const sessionRecord = await prisma.dateSession.create({
    data: {
      person_a_id: personAId,
      person_b_id: personBId,
      status: "in_progress",
    },
  });

  // 1. Choose Venue
  const venue = await chooseDateVenue(candidateA, candidateB);
  if (onEvent) {
    onEvent({ type: "venue", data: { sessionId: sessionRecord.id, venue } });
  }

  // 2. Run 6 Turns (Alternating between A and B)
  const turns: ConversationTurn[] = [];
  for (let turnNum = 1; turnNum <= 6; turnNum++) {
    const isSpeakerA = turnNum % 2 === 1;
    const speaker = isSpeakerA ? candidateA : candidateB;
    const partner = isSpeakerA ? candidateB : candidateA;

    const turn = await runDateTurn(speaker, partner, turns, venue, turnNum);
    turns.push(turn);

    if (onEvent) {
      onEvent({
        type: "turn",
        data: {
          sessionId: sessionRecord.id,
          turn,
        },
      });
    }
  }

  // 3. Score Date Asymmetrically
  const [scoreAToB, scoreBToA] = await Promise.all([
    scoreDateFromPersona(candidateA, candidateB, turns, venue),
    scoreDateFromPersona(candidateB, candidateA, turns, venue),
  ]);

  const allHighlights = [
    ...(scoreAToB.highlights || []),
    ...(scoreBToA.highlights || []),
  ];

  if (onEvent) {
    onEvent({
      type: "score",
      data: {
        sessionId: sessionRecord.id,
        scoreAToB,
        scoreBToA,
      },
    });
  }

  // 4. Save completed date session to DB
  await prisma.dateSession.update({
    where: { id: sessionRecord.id },
    data: {
      venue: JSON.stringify(venue),
      transcript: JSON.stringify(turns),
      score_a_to_b: scoreAToB.overall_score,
      score_b_to_a: scoreBToA.overall_score,
      reason_a: scoreAToB.reason,
      reason_b: scoreBToA.reason,
      highlights: JSON.stringify(allHighlights),
      status: "completed",
    },
  });

  const finalSession: DateSessionData = {
    id: sessionRecord.id,
    personAId,
    personBId,
    venue,
    turns,
    scoreAToB,
    scoreBToA,
    status: "completed",
  };

  if (onEvent) {
    onEvent({ type: "done", data: finalSession });
  }

  return finalSession;
}

/**
 * Computes all unique unordered pairs (n * (n-1) / 2).
 */
export function generateUniquePairs(
  personIds: string[]
): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < personIds.length; i++) {
    for (let j = i + 1; j < personIds.length; j++) {
      pairs.push([personIds[i], personIds[j]]);
    }
  }
  return pairs;
}

/**
 * Agent pre-screen + schedule: loads analyzed candidates (optionally a subset) and returns
 * the dates the agents chose to go on. Small groups (<= DATES_PER_PERSON+1) date everyone.
 */
export async function buildScheduleFromDb(
  personIds?: string[]
): Promise<ScheduledDate[]> {
  const people = await prisma.person.findMany({
    where: personIds && personIds.length > 0
      ? { id: { in: personIds }, profile: { isNot: null } }
      : { status: "analyzed", profile: { isNot: null } },
    include: { profile: true },
  });

  const parsed = people.map((p) => ({
    id: p.id,
    profile: {
      summary: p.profile!.summary,
      needs: safeJson(p.profile!.needs),
      hobbies: safeJson(p.profile!.hobbies),
      interests: safeJson(p.profile!.interests),
      values: safeJson(p.profile!.values),
      personality_traits: safeJson(p.profile!.personality_traits),
      communication_style: p.profile!.communication_style,
      lifestyle: p.profile!.lifestyle,
      looking_for: p.profile!.looking_for,
      deal_breakers: safeJson(p.profile!.deal_breakers),
      evidence: safeJson(p.profile!.evidence),
    } as AgentProfileAnalysis,
  }));

  return buildDatingSchedule(parsed, getDatesPerPerson());
}

function safeJson(s: string | null | undefined): any[] {
  try {
    const v = JSON.parse(s || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/**
 * A single agent's dating run: the person's agent pre-screens everyone and dates its top picks.
 */
export async function buildScheduleForPerson(personId: string, count = 3): Promise<ScheduledDate[]> {
  const people = await prisma.person.findMany({
    where: { status: "analyzed", profile: { isNot: null } },
    include: { profile: true },
  });
  const me = people.find((p) => p.id === personId);
  if (!me) return [];
  const toProfile = (p: (typeof people)[number]) =>
    ({
      summary: p.profile!.summary,
      needs: safeJson(p.profile!.needs),
      hobbies: safeJson(p.profile!.hobbies),
      interests: safeJson(p.profile!.interests),
      values: safeJson(p.profile!.values),
      personality_traits: safeJson(p.profile!.personality_traits),
      communication_style: p.profile!.communication_style,
      lifestyle: p.profile!.lifestyle,
      looking_for: p.profile!.looking_for,
      deal_breakers: safeJson(p.profile!.deal_breakers),
      evidence: safeJson(p.profile!.evidence),
    }) as AgentProfileAnalysis;
  const mine = toProfile(me);
  return people
    .filter((p) => p.id !== personId)
    .map((p) => {
      const theirs = toProfile(p);
      const ab = prescreen(mine, theirs);
      const ba = prescreen(theirs, mine);
      return {
        personAId: personId,
        personBId: p.id,
        mutualPrescreen: Math.round((ab.score + ba.score) / 2),
        shared: Array.from(new Set([...ab.shared, ...ba.shared])).slice(0, 6),
      };
    })
    .sort((a, b) => b.mutualPrescreen - a.mutualPrescreen)
    .slice(0, count);
}

/**
 * Re-runs both private scorecards for every completed date (transcripts are kept).
 */
export async function rescoreAllDates(
  onProgress?: (done: number, total: number) => void,
  before?: Date
): Promise<number> {
  const dates = await prisma.dateSession.findMany({
    where: { status: "completed", ...(before ? { created_at: { lt: before } } : {}) },
  });
  let done = 0;
  for (const d of dates) {
    try {
      const [a, b] = await Promise.all([loadCandidatePersona(d.person_a_id), loadCandidatePersona(d.person_b_id)]);
      const turns: ConversationTurn[] = JSON.parse(d.transcript || "[]");
      const venue: DateVenueSelection = JSON.parse(d.venue || "{}");
      const [ab, ba] = await Promise.all([
        scoreDateFromPersona(a, b, turns, venue),
        scoreDateFromPersona(b, a, turns, venue),
      ]);
      await prisma.dateSession.update({
        where: { id: d.id },
        data: {
          score_a_to_b: ab.overall_score,
          score_b_to_a: ba.overall_score,
          reason_a: ab.reason,
          reason_b: ba.reason,
          highlights: JSON.stringify([...(ab.highlights || []), ...(ba.highlights || [])]),
        },
      });
    } catch (err) {
      console.error("[Rescore] failed for date", d.id, err);
    }
    done++;
    onProgress?.(done, dates.length);
  }
  return done;
}
