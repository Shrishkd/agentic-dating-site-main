import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "../db";
import { globalRateLimiter } from "./rate-limiter";
import { LlmCallOptions, LlmResponse } from "./types";

/**
 * Computes a deterministic SHA-256 hash of prompt, system instruction, schema, and model.
 */
export function computeInputHash(
  prompt: string,
  options: LlmCallOptions
): string {
  const payload = JSON.stringify({
    prompt,
    model: options.model,
    systemInstruction: options.systemInstruction,
    responseSchema: options.responseSchema,
    responseMimeType: options.responseMimeType,
    temperature: options.temperature,
    imagesCount: options.images?.length || 0,
  });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

/**
 * Central Google Gemini LLM caller with rate limiting, queueing, caching, retry, and key rotation.
 */
export async function callGemini<T = any>(
  prompt: string,
  options: LlmCallOptions = {}
): Promise<LlmResponse<T>> {
  const model =
    options.model ||
    process.env.GEMINI_MODEL_ANALYSIS ||
    "gemini-3.8-flash";

  // Check database cache first (unless skipCache is requested)
  const inputHash = computeInputHash(prompt, { ...options, model });
  if (!options.skipCache) {
    try {
      const cached = await prisma.llmCache.findUnique({
        where: { input_hash: inputHash },
      });
      if (cached) {
        let parsedData: T | undefined = undefined;
        if (options.responseMimeType === "application/json") {
          try {
            parsedData = JSON.parse(cached.output) as T;
          } catch {
            // fallback
          }
        }
        return {
          text: cached.output,
          data: parsedData,
          cached: true,
          model,
          keyIndex: -1,
        };
      }
    } catch (dbErr) {
      console.warn("[LLM Client] Cache check error, proceeding with API call:", dbErr);
    }
  }

  // Schedule through global rate limiter queue; fall back to a lighter model if this one is overloaded or retired.
  try {
    return await scheduleCall<T>(prompt, options, model, inputHash);
  } catch (err: any) {
    const fallback = process.env.GEMINI_MODEL_FALLBACK || "gemini-3.5-flash-lite";
    const msg = String(err?.message || "");
    const retryable = /503|UNAVAILABLE|overloaded|high demand|404|no longer available|not found|PerDay/i.test(msg);
    if (retryable && model !== fallback) {
      console.warn(`[LLM Client] ${model} failed (${msg.slice(0, 80)}). Falling back to ${fallback}.`);
      return callGemini<T>(prompt, { ...options, model: fallback });
    }
    throw err;
  }
}

async function scheduleCall<T>(
  prompt: string,
  options: LlmCallOptions,
  model: string,
  inputHash: string
): Promise<LlmResponse<T>> {
  return globalRateLimiter.schedule(async () => {
    const apiKey = globalRateLimiter.getActiveApiKey();
    const keyIndex = globalRateLimiter.getActiveKeyIndex();
    const ai = new GoogleGenAI({ apiKey });

    // Prepare contents
    const contents: any[] = [];

    // Add inline images if provided
    if (options.images && options.images.length > 0) {
      for (const img of options.images) {
        contents.push({
          inlineData: img.inlineData,
        });
      }
    }

    // Add text prompt
    contents.push(prompt);

    // Build config
    const config: any = {};
    if (options.systemInstruction) {
      config.systemInstruction = options.systemInstruction;
    }
    if (typeof options.temperature === "number") {
      config.temperature = options.temperature;
    }
    if (options.responseMimeType) {
      config.responseMimeType = options.responseMimeType;
    }
    if (options.responseSchema) {
      config.responseSchema = options.responseSchema;
      config.responseMimeType = "application/json";
    }

    // Call Gemini models.generateContent API
    const timeoutMs = parseInt(process.env.GEMINI_TIMEOUT_MS || "60000", 10);
    const response: any = await Promise.race([
      ai.models.generateContent({
        model,
        contents,
        config,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`503 UNAVAILABLE: ${model} timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);

    const outputText = response.text || "";

    let parsedData: T | undefined = undefined;
    if (options.responseMimeType === "application/json" || options.responseSchema) {
      try {
        // Strip markdown code fences if model returned them
        const cleanedText = outputText
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/, "")
          .trim();
        parsedData = JSON.parse(cleanedText) as T;
      } catch (parseErr) {
        console.warn("[LLM Client] Failed to parse JSON response:", outputText);
      }
    }

    // Save to database cache immediately
    try {
      await prisma.llmCache.upsert({
        where: { input_hash: inputHash },
        update: { output: outputText },
        create: {
          input_hash: inputHash,
          output: outputText,
        },
      });
    } catch (saveErr) {
      console.warn("[LLM Client] Failed to cache output in database:", saveErr);
    }

    return {
      text: outputText,
      data: parsedData,
      cached: false,
      model,
      keyIndex,
    };
  });
}

/**
 * Helper to call Gemini in structured JSON mode
 */
export async function callGeminiJson<T = any>(
  prompt: string,
  responseSchema: Record<string, any>,
  options: Omit<LlmCallOptions, "responseSchema" | "responseMimeType"> = {}
): Promise<LlmResponse<T>> {
  return callGemini<T>(prompt, {
    ...options,
    responseMimeType: "application/json",
    responseSchema,
  });
}
