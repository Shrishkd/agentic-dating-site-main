import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { globalRateLimiter } from "@/lib/llm/rate-limiter";

export async function GET() {
  const diagnostics: {
    status: "ok" | "degraded" | "error";
    timestamp: string;
    database: { connected: boolean; countPeople: number; error?: string };
    gemini: {
      configured: boolean;
      totalKeys: number;
      activeKeyIndex: number;
      modelAnalysis: string;
      modelDating: string;
      rateLimiter: ReturnType<typeof globalRateLimiter.getStatus>;
    };
    apify: { configured: boolean };
  } = {
    status: "ok",
    timestamp: new Date().toISOString(),
    database: { connected: false, countPeople: 0 },
    gemini: {
      configured: false,
      totalKeys: 0,
      activeKeyIndex: 0,
      modelAnalysis: process.env.GEMINI_MODEL_ANALYSIS || "gemini-3.8-flash",
      modelDating: process.env.GEMINI_MODEL_DATING || "gemini-3.5-flash-lite",
      rateLimiter: globalRateLimiter.getStatus(),
    },
    apify: {
      configured: Boolean(process.env.APIFY_TOKEN && process.env.APIFY_TOKEN.length > 5),
    },
  };

  // Test Database Connection
  try {
    const peopleCount = await prisma.person.count();
    diagnostics.database.connected = true;
    diagnostics.database.countPeople = peopleCount;
  } catch (err: any) {
    diagnostics.status = "degraded";
    diagnostics.database.connected = false;
    diagnostics.database.error = err?.message || "Failed to query database";
  }

  // Check Gemini config
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5);
  diagnostics.gemini.configured = hasKey;
  diagnostics.gemini.totalKeys = globalRateLimiter.getTotalKeys();
  diagnostics.gemini.activeKeyIndex = globalRateLimiter.getActiveKeyIndex();

  return NextResponse.json(diagnostics);
}
