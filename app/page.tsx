import Link from "next/link";
import {
  Bot,
  Sparkles,
  Link as LinkIcon,
  Flame,
  Trophy,
  ArrowRight,
  ShieldCheck,
  Zap,
  Layers,
  Cpu,
  Database,
  RefreshCw,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { globalRateLimiter } from "@/lib/llm/rate-limiter";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let dbStatus = "Connected";
  let peopleCount = 0;
  let datesCount = 0;

  try {
    peopleCount = await prisma.person.count();
    datesCount = await prisma.dateSession.count();
  } catch {
    dbStatus = "Needs Setup / Migration";
  }

  const rateLimitStatus = globalRateLimiter.getStatus();
  const hasGeminiKey = Boolean(
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5
  );
  const hasApifyToken = Boolean(
    process.env.APIFY_TOKEN && process.env.APIFY_TOKEN.length > 5
  );

  return (
    <div className="flex-1 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
      {/* Hero Section */}
      <section className="text-center pt-8 pb-12 space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Generation Autonomous Dating Intelligence</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
          AI Agents That Date On Behalf Of{" "}
          <span className="bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
            Real People
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-400 leading-relaxed">
          Each person is represented by an AI agent built strictly from two sources:
          their public <strong className="text-gray-200">LinkedIn</strong> and{" "}
          <strong className="text-gray-200">Instagram</strong> profiles. Agents
          discover values, deal-breakers, lifestyle vibes, and date every pair to
          compute genuine mutual compatibility rankings.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/people"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold shadow-lg shadow-rose-500/25 flex items-center gap-2 group transition-all"
          >
            <span>Add People (Intake)</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/dates"
            className="px-6 py-3 rounded-xl bg-gray-900/90 hover:bg-gray-800 border border-gray-800 text-gray-200 font-semibold flex items-center gap-2 transition-colors"
          >
            <Flame className="w-4 h-4 text-pink-400" />
            <span>Live Dating Floor</span>
          </Link>

          <Link
            href="/rankings"
            className="px-6 py-3 rounded-xl bg-gray-900/90 hover:bg-gray-800 border border-gray-800 text-gray-200 font-semibold flex items-center gap-2 transition-colors"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Rankings &amp; Matches</span>
          </Link>
        </div>
      </section>

      {/* 5-Step Architecture Pipeline */}
      <section className="py-10">
        <div className="text-center mb-10">
          <h2 className="text-xs uppercase font-bold tracking-widest text-rose-400">
            How AgentMatch Works
          </h2>
          <p className="text-2xl font-bold text-gray-100 mt-1">
            The Autonomous Dating Pipeline
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Step 1 */}
          <div className="bg-gray-900/50 border border-gray-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-gray-700 transition-colors">
            <div>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-sm mb-3">
                1
              </div>
              <h3 className="font-semibold text-white text-sm mb-1 flex items-center gap-1.5">
                <LinkIcon className="w-4 h-4 text-rose-400" /> Link Intake
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Paste public LinkedIn &amp; Instagram profile URLs. Validated with
                strict pattern matching.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-800/50 text-[11px] text-gray-500">
              Zero passwords or cookies
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-gray-900/50 border border-gray-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-gray-700 transition-colors">
            <div>
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center font-bold text-sm mb-3">
                2
              </div>
              <h3 className="font-semibold text-white text-sm mb-1 flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-pink-400" /> Scraping
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Apify actors extract public career history, education, bio, and
                Instagram image media.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-800/50 text-[11px] text-gray-500">
              Raw data caching layer
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-gray-900/50 border border-gray-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-gray-700 transition-colors">
            <div>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-sm mb-3">
                3
              </div>
              <h3 className="font-semibold text-white text-sm mb-1 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-purple-400" /> Agent Persona
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Gemini Multi-Modal analysis builds needs, values, deal-breakers,
                and cites source evidence.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-800/50 text-[11px] text-gray-500">
              Strict JSON schema mode
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-gray-900/50 border border-gray-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-gray-700 transition-colors">
            <div>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm mb-3">
                4
              </div>
              <h3 className="font-semibold text-white text-sm mb-1 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" /> Speed Dating
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                6-turn back-and-forth dates streamed live with SSE. Asymmetric
                scorecards &amp; highlights.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-800/50 text-[11px] text-gray-500">
              Real-time interactive turns
            </div>
          </div>

          {/* Step 5 */}
          <div className="bg-gray-900/50 border border-gray-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-gray-700 transition-colors">
            <div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm mb-3">
                5
              </div>
              <h3 className="font-semibold text-white text-sm mb-1 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-emerald-400" /> Mutual Ranking
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Final compatibility calculated with 0.6 / 0.4 weighted formula
                and match explanations.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-800/50 text-[11px] text-gray-500">
              Heatmap &amp; top matches
            </div>
          </div>
        </div>
      </section>

      {/* System Diagnostics Card */}
      <section className="mt-6 bg-[#10131d] border border-gray-800/80 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-rose-400" />
            <h2 className="font-semibold text-base text-gray-200">
              System Architecture &amp; Engine Status
            </h2>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            Phase 1 Ready
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Database */}
          <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Database className="w-4 h-4 text-blue-400" />
              <span className="font-medium text-gray-300">Database (Prisma)</span>
            </div>
            <p className="text-emerald-400 font-semibold">{dbStatus}</p>
            <p className="text-gray-500 mt-1">
              {peopleCount} people &bull; {datesCount} dates recorded
            </p>
          </div>

          {/* Gemini LLM Client */}
          <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="font-medium text-gray-300">Central Gemini LLM</span>
            </div>
            <p
              className={`font-semibold ${
                hasGeminiKey ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {hasGeminiKey ? "API Key Configured" : "Add GEMINI_API_KEY in .env"}
            </p>
            <p className="text-gray-500 mt-1">
              RPM: {rateLimitStatus.rpmLimit} &bull; RPD: {rateLimitStatus.rpdLimit}{" "}
              &bull; Hash Caching: Active
            </p>
          </div>

          {/* Apify Scraper */}
          <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span className="font-medium text-gray-300">Apify Scraper Actor</span>
            </div>
            <p
              className={`font-semibold ${
                hasApifyToken ? "text-emerald-400" : "text-gray-400"
              }`}
            >
              {hasApifyToken ? "Token Active" : "Configured for Phase 3"}
            </p>
            <p className="text-gray-500 mt-1">
              LinkedIn &amp; Instagram profile actors
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
