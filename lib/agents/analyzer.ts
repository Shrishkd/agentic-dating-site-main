import { prisma } from "../db";
import { callGeminiJson } from "../llm/client";
import { AgentProfileAnalysis } from "./types";
import { LinkedInScrapedData, InstagramScrapedData } from "../scrapers/types";

/**
 * Helper to fetch an image URL and convert to base64 inlineData for Gemini multimodal input.
 */
async function fetchImageAsBase64(
  url: string
): Promise<{ inlineData: { data: string; mimeType: string } } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return {
      inlineData: {
        data: base64,
        mimeType: contentType.split(";")[0],
      },
    };
  } catch (err) {
    // Graceful fallback if image cannot be downloaded
    return null;
  }
}

/**
 * Strict JSON Schema definition for Gemini Profile Analysis
 */
const PROFILE_ANALYSIS_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: {
      type: "STRING",
      description: "3 to 4 comprehensive sentences summarizing who this person is, their vibe, career drive, and lifestyle.",
    },
    needs: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Core emotional, communication, and relationship needs.",
    },
    hobbies: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Active hobbies, sports, creative pursuits, or weekend activities.",
    },
    interests: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Topics, intellectual curiosities, music/arts, causes, or favorite domains.",
    },
    values: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Fundamental values and personal ethics (e.g. ambition, authenticity, humor, family, adventure).",
    },
    personality_traits: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          trait: { type: "STRING", description: "Trait name, e.g. Extroversion, Spontaneity, Ambition, Empathy" },
          score: { type: "INTEGER", description: "Score from 0 to 100 representing strength of trait" },
          description: { type: "STRING", description: "Short rationale explaining why this score was assigned based on evidence" },
        },
        required: ["trait", "score", "description"],
      },
      description: "4 to 6 key personality traits with 0-100 scores.",
    },
    communication_style: {
      type: "STRING",
      description: "How they communicate: e.g. Direct & energetic, Thoughtful & reflective, Playful & witty, Casual & warm.",
    },
    lifestyle: {
      type: "STRING",
      description: "Daily pace, routine, travel habits, social frequency, work-life balance.",
    },
    looking_for: {
      type: "STRING",
      description: "What kind of partner and connection would naturally complement them.",
    },
    deal_breakers: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Clear incompatibilities, lifestyle clashes, or values that would not work for them.",
    },
    evidence: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          claim: { type: "STRING", description: "The specific insight or trait claim made" },
          source: { type: "STRING", enum: ["linkedin", "instagram"], description: "Which source provided this evidence" },
          detail: { type: "STRING", description: "The exact quote, role, bio detail, or Instagram photo content supporting this claim" },
        },
        required: ["claim", "source", "detail"],
      },
      description: "Evidence citations for every key claim.",
    },
    confidence_scores: {
      type: "OBJECT",
      properties: {
        overall: { type: "STRING", enum: ["high", "medium", "low"] },
        personality: { type: "STRING", enum: ["high", "medium", "low"] },
        lifestyle: { type: "STRING", enum: ["high", "medium", "low"] },
        values: { type: "STRING", enum: ["high", "medium", "low"] },
      },
      required: ["overall", "personality", "lifestyle", "values"],
      description: "Confidence levels per category based on data completeness.",
    },
  },
  required: [
    "summary",
    "needs",
    "hobbies",
    "interests",
    "values",
    "personality_traits",
    "communication_style",
    "lifestyle",
    "looking_for",
    "deal_breakers",
    "evidence",
    "confidence_scores",
  ],
};

/**
 * Analyzes a person's scraped LinkedIn and Instagram raw data to construct an AI dating persona.
 */
export async function analyzePersonProfile(
  personId: string,
  options: { force?: boolean } = {}
): Promise<{ profile: AgentProfileAnalysis; fromCache: boolean }> {
  const person = await prisma.person.findUnique({
    where: { id: personId },
    include: {
      rawData: true,
      profile: true,
    },
  });

  if (!person) {
    throw new Error(`Person with ID "${personId}" not found.`);
  }

  // Check if profile already analyzed and not forcing re-analysis
  if (!options.force && person.profile) {
    try {
      const parsed: AgentProfileAnalysis = {
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
      return { profile: parsed, fromCache: true };
    } catch (e) {
      console.warn("Error parsing existing profile from DB, re-analyzing...");
    }
  }

  // Extract raw LinkedIn and Instagram data
  const linkedinRaw = person.rawData.find((r) => r.source === "linkedin");
  const instagramRaw = person.rawData.find((r) => r.source === "instagram");

  if (!linkedinRaw && !instagramRaw) {
    throw new Error(
      `No scraped data found for "${person.name}". Please scrape the profile first in Phase 3.`
    );
  }

  let linkedinData: LinkedInScrapedData | null = null;
  let instagramData: InstagramScrapedData | null = null;

  if (linkedinRaw) {
    try {
      linkedinData = JSON.parse(linkedinRaw.json_data);
    } catch {}
  }
  if (instagramRaw) {
    try {
      instagramData = JSON.parse(instagramRaw.json_data);
    } catch {}
  }

  // Update status to analyzing
  await prisma.person.update({
    where: { id: personId },
    data: { status: "analyzing" },
  });

  // Prepare multimodal Instagram images (up to 6 images)
  const imagePromises: Promise<{ inlineData: { data: string; mimeType: string } } | null>[] = [];
  if (instagramData && Array.isArray(instagramData.posts)) {
    const imageUrls = instagramData.posts
      .map((p) => p.imageUrl)
      .filter((url): url is string => Boolean(url && url.startsWith("http")))
      .slice(0, 6);

    for (const imgUrl of imageUrls) {
      imagePromises.push(fetchImageAsBase64(imgUrl));
    }
  }

  const fetchedImages = (await Promise.all(imagePromises)).filter(
    (img): img is { inlineData: { data: string; mimeType: string } } => img !== null
  );

  // Construct comprehensive prompt
  const systemInstruction = `You are an expert dating psychologist and AI persona builder for the AgentMatch autonomous dating engine.
Your task is to analyze raw public profile data from LinkedIn and Instagram for a real person and build their authentic dating persona.

STRICT RULES:
1. ONLY use evidence directly extracted from the provided LinkedIn data, Instagram bio/posts/captions, and the accompanying Instagram images.
2. NEVER invent, hallucinate, or assume facts not present in the sources.
3. If an aspect is not clear from the data, explicitly state "unknown" or lower the confidence score.
4. For every insight or claim in the profile, provide an item in the "evidence" list citing whether it came from "linkedin" or "instagram" and the exact detail/quote/image vibe.
5. Identify authentic deal-breakers (e.g. anti-careerists if they are workaholic founders, non-outdoorsy if their entire life is hiking, lack of ambition, smoking, high-drama, etc.) based on their lifestyle and values.
6. Provide structured output matching the JSON schema.`;

  const userPrompt = `Please analyze the candidate "${person.name}" using the following public data:

=== LINKEDIN PROFILE DATA ===
${linkedinData ? JSON.stringify(linkedinData, null, 2) : "No LinkedIn data available."}

=== INSTAGRAM PROFILE DATA ===
${instagramData ? JSON.stringify(instagramData, null, 2) : "No Instagram data available."}

=== IMAGES ATTACHED ===
${fetchedImages.length} Instagram post images attached showing activities, lifestyle, settings, and vibe.

Construct the complete dating persona according to the required schema.`;

  const modelName = process.env.GEMINI_MODEL_ANALYSIS || "gemini-2.5-flash";

  try {
    const llmResult = await callGeminiJson<AgentProfileAnalysis>(
      userPrompt,
      PROFILE_ANALYSIS_SCHEMA,
      {
        model: modelName,
        systemInstruction,
        images: fetchedImages.length > 0 ? fetchedImages : undefined,
        temperature: 0.3, // Low temperature for high factual precision
        skipCache: options.force,
      }
    );

    if (!llmResult.data) {
      throw new Error("Failed to receive structured profile analysis from Gemini.");
    }

    const analysis = llmResult.data;

    // Save to Database `profiles` table
    await prisma.profile.upsert({
      where: { person_id: personId },
      update: {
        summary: analysis.summary,
        needs: JSON.stringify(analysis.needs || []),
        hobbies: JSON.stringify(analysis.hobbies || []),
        interests: JSON.stringify(analysis.interests || []),
        values: JSON.stringify(analysis.values || []),
        personality_traits: JSON.stringify(analysis.personality_traits || []),
        communication_style: analysis.communication_style || "Casual and warm",
        lifestyle: analysis.lifestyle || "Balanced",
        looking_for: analysis.looking_for || "A compatible partner",
        deal_breakers: JSON.stringify(analysis.deal_breakers || []),
        evidence: JSON.stringify(analysis.evidence || []),
        confidence_scores: JSON.stringify(analysis.confidence_scores || {}),
      },
      create: {
        person_id: personId,
        summary: analysis.summary,
        needs: JSON.stringify(analysis.needs || []),
        hobbies: JSON.stringify(analysis.hobbies || []),
        interests: JSON.stringify(analysis.interests || []),
        values: JSON.stringify(analysis.values || []),
        personality_traits: JSON.stringify(analysis.personality_traits || []),
        communication_style: analysis.communication_style || "Casual and warm",
        lifestyle: analysis.lifestyle || "Balanced",
        looking_for: analysis.looking_for || "A compatible partner",
        deal_breakers: JSON.stringify(analysis.deal_breakers || []),
        evidence: JSON.stringify(analysis.evidence || []),
        confidence_scores: JSON.stringify(analysis.confidence_scores || {}),
      },
    });

    // Update person status to analyzed
    await prisma.person.update({
      where: { id: personId },
      data: { status: "analyzed" },
    });

    return { profile: analysis, fromCache: llmResult.cached };
  } catch (err: any) {
    // Revert status to scraped if analysis failed
    await prisma.person.update({
      where: { id: personId },
      data: { status: "scraped" },
    });
    throw err;
  }
}

/**
 * Batch analyzes all scraped candidates.
 */
export async function analyzeAllPeople(
  options: { force?: boolean } = {}
): Promise<{ successCount: number; errors: Array<{ personId: string; error: string }> }> {
  const peopleToAnalyze = await prisma.person.findMany({
    where: options.force
      ? {
          status: { in: ["scraped", "analyzed"] },
        }
      : {
          status: "scraped",
        },
  });

  let successCount = 0;
  const errors: Array<{ personId: string; error: string }> = [];

  for (const person of peopleToAnalyze) {
    try {
      await analyzePersonProfile(person.id, options);
      successCount++;
    } catch (err: any) {
      console.error(`Failed to analyze person ${person.id} (${person.name}):`, err);
      errors.push({ personId: person.id, error: err?.message || "Analysis failed" });
    }
  }

  return { successCount, errors };
}
