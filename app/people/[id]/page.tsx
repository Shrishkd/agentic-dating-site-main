"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Linkedin,
  Instagram,
  Sparkles,
  Heart,
  Target,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flame,
  Activity,
  Layers,
  Info,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { AgentProfileAnalysis } from "@/lib/agents/types";

interface PersonDetail {
  id: string;
  name: string;
  linkedin_url: string;
  instagram_url: string;
  status: string;
  created_at: string;
  rawData?: Array<{
    id: string;
    source: string;
    json_data: string;
  }>;
  profile?: {
    id: string;
    summary: string;
    needs: string;
    hobbies: string;
    interests: string;
    values: string;
    personality_traits: string;
    communication_style: string;
    lifestyle: string;
    looking_for: string;
    deal_breakers: string;
    evidence: string;
    confidence_scores?: string;
  } | null;
}

export default function PersonProfilePage() {
  const params = useParams();
  const router = useRouter();
  const personId = params.id as string;

  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(true);

  useEffect(() => {
    if (personId) {
      fetchPersonData();
    }
  }, [personId]);

  async function fetchPersonData() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/people/${personId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setPerson(json.data);
      } else {
        setError(json.error || "Person not found.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load candidate profile.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze(force = true) {
    try {
      setAnalyzing(true);
      setError(null);
      const res = await fetch(`/api/analyze/${personId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchPersonData();
      } else {
        setError(json.error || "Analysis failed.");
      }
    } catch (err: any) {
      setError(err.message || "Analysis request error.");
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-rose-500" />
        <p className="text-sm text-gray-400">Loading AI dating persona...</p>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="flex-1 max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Candidate Not Found</h2>
        <p className="text-sm text-gray-400">{error || "Could not retrieve candidate data."}</p>
        <Link
          href="/people"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-800 text-sm font-medium text-gray-200 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back to People
        </Link>
      </div>
    );
  }

  // Parse structured profile JSON fields if present
  let profileData: AgentProfileAnalysis | null = null;
  if (person.profile) {
    try {
      profileData = {
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
    } catch (e) {
      console.warn("Could not parse profile fields:", e);
    }
  }

  // Extract avatar photo if available from raw_data
  let photoUrl: string | undefined;
  if (person.rawData) {
    for (const raw of person.rawData) {
      try {
        const parsed = JSON.parse(raw.json_data);
        if (parsed.profilePhotoUrl) {
          photoUrl = parsed.profilePhotoUrl;
          break;
        }
      } catch {}
    }
  }

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full space-y-8">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/people"
          className="inline-flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Candidates
        </Link>

        <div className="flex items-center gap-2">
          {profileData && (
            <>
              <Link
                href={`/dates?person=${personId}`}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 transition-all"
              >
                <Heart className="w-3.5 h-3.5" />
                <span>Send My Agent on Dates</span>
              </Link>
              <Link
                href={`/rankings?personId=${personId}`}
                className="px-4 py-2 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-200 text-xs font-semibold flex items-center gap-2 transition-all"
              >
                <Target className="w-3.5 h-3.5" />
                <span>My Rankings</span>
              </Link>
            </>
          )}
          <button
            onClick={() => handleAnalyze(true)}
            disabled={analyzing}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-semibold shadow-md shadow-rose-500/20 disabled:opacity-50 flex items-center gap-2 transition-all"
          >
            {analyzing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>{analyzing ? "Gemini Analyzing..." : profileData ? "Re-Analyze Profile" : "Generate AI Persona"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hero Profile Header */}
      <div className="bg-[#10131d] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Avatar */}
          <Avatar name={person.name} photoUrl={photoUrl} size="xl" />

          {/* Profile Details */}
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {person.name}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  person.status === "analyzed"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : person.status === "scraped"
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}
              >
                {person.status === "analyzed" ? "AI Persona Ready" : person.status}
              </span>
            </div>

            <p className="text-xs text-gray-400 flex items-center gap-2">
              <Bot className="w-3.5 h-3.5 text-rose-400" />
              Autonomous dating persona constructed from public digital footprint
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href={person.linkedin_url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Linkedin className="w-3.5 h-3.5" /> LinkedIn Profile <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={person.instagram_url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Instagram className="w-3.5 h-3.5" /> Instagram Profile <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {!profileData ? (
        /* Not yet analyzed prompt */
        <div className="bg-[#10131d] border border-dashed border-gray-800 rounded-3xl p-12 text-center space-y-4">
          <Bot className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">AI Dating Persona Not Generated Yet</h2>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Click &quot;Generate AI Persona&quot; to send {person.name}&apos;s LinkedIn credentials,
            Instagram vibe, and post images to Gemini for deep psychological analysis.
          </p>
          <button
            onClick={() => handleAnalyze(true)}
            disabled={analyzing}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-sm font-semibold shadow-lg shadow-rose-500/25 flex items-center gap-2 mx-auto transition-all"
          >
            {analyzing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>{analyzing ? "Gemini Analyzing..." : "Generate AI Persona Now"}</span>
          </button>
        </div>
      ) : (
        /* Render Full Profile Insights */
        <div className="space-y-8">
          {/* Summary Card */}
          <div className="bg-[#10131d] border border-gray-800 rounded-2xl p-6 shadow-lg space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm uppercase tracking-wider">
              <Sparkles className="w-4 h-4" /> Persona Overview &amp; Dating Vibe
            </div>
            <p className="text-sm sm:text-base text-gray-200 leading-relaxed font-normal">
              {profileData.summary}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-800/80 text-xs">
              <div>
                <span className="text-gray-400 font-medium block mb-0.5">Communication Style:</span>
                <span className="text-rose-300 font-semibold">{profileData.communication_style}</span>
              </div>
              <div>
                <span className="text-gray-400 font-medium block mb-0.5">Lifestyle Rhythm:</span>
                <span className="text-pink-300 font-semibold">{profileData.lifestyle}</span>
              </div>
            </div>
          </div>

          {/* Personality Trait Bars & Sliders */}
          <div className="bg-[#10131d] border border-gray-800 rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm uppercase tracking-wider">
                <Sliders className="w-4 h-4" /> Personality Matrix &amp; Trait Scores
              </div>
              <span className="text-[11px] text-gray-500">Scale 0 - 100</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {profileData.personality_traits.map((trait, idx) => (
                <div key={idx} className="bg-gray-950/70 border border-gray-800/80 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{trait.trait}</span>
                    <span className="font-mono font-bold text-rose-400">{trait.score}/100</span>
                  </div>
                  <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 via-rose-500 to-pink-500 h-full rounded-full"
                      style={{ width: `${trait.score}%` }}
                    />
                  </div>
                  {trait.description && (
                    <p className="text-[11px] text-gray-400 leading-snug">{trait.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Hobbies & Interests Tag Cloud */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hobbies */}
            <div className="bg-[#10131d] border border-gray-800 rounded-2xl p-6 shadow-lg space-y-3">
              <div className="flex items-center gap-2 text-pink-400 font-bold text-sm uppercase tracking-wider">
                <Flame className="w-4 h-4" /> Active Hobbies &amp; Pursuits
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {profileData.hobbies.map((hobby, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-pink-500/10 text-pink-300 border border-pink-500/20"
                  >
                    {hobby}
                  </span>
                ))}
              </div>
            </div>

            {/* Interests */}
            <div className="bg-[#10131d] border border-gray-800 rounded-2xl p-6 shadow-lg space-y-3">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm uppercase tracking-wider">
                <Target className="w-4 h-4" /> Intellectual &amp; Cultural Interests
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {profileData.interests.map((interest, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Values & Needs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Core Values */}
            <div className="bg-[#10131d] border border-gray-800 rounded-2xl p-6 shadow-lg space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm uppercase tracking-wider">
                <Heart className="w-4 h-4" /> Core Values &amp; Ethics
              </div>
              <ul className="space-y-2 text-xs text-gray-300">
                {profileData.values.map((val, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span>{val}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Relationship Needs & Looking For */}
            <div className="bg-[#10131d] border border-gray-800 rounded-2xl p-6 shadow-lg space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-wider">
                <Target className="w-4 h-4" /> What They Are Looking For &amp; Needs
              </div>
              <p className="text-xs text-emerald-200/90 leading-relaxed font-medium bg-emerald-950/30 p-3 rounded-xl border border-emerald-500/20">
                {profileData.looking_for}
              </p>
              <ul className="space-y-1.5 text-xs text-gray-300 pt-1">
                {profileData.needs.map((need, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                    <span>{need}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Deal-Breakers Warning Section */}
          <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-6 shadow-lg space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" /> Clear Deal-Breakers &amp; Red Flags
            </div>
            <p className="text-xs text-gray-400">
              Incompatibilities that the agent will strictly evaluate and enforce during dates:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {profileData.deal_breakers.map((dealBreaker, idx) => (
                <div
                  key={idx}
                  className="bg-rose-950/40 border border-rose-500/20 p-3 rounded-xl text-xs text-rose-200 flex items-start gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span>{dealBreaker}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Expandable Evidence & Citations Section */}
          <div className="bg-[#10131d] border border-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <button
              onClick={() => setEvidenceOpen(!evidenceOpen)}
              className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-900/30 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Evidence &amp; Fact-Checking Citations ({profileData.evidence?.length || 0})
                  </h3>
                  <p className="text-xs text-gray-400">
                    Strict citations proving how Gemini derived each conclusion from LinkedIn or Instagram.
                  </p>
                </div>
              </div>
              {evidenceOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {evidenceOpen && (
              <div className="p-6 pt-0 border-t border-gray-800/80 space-y-3">
                <div className="space-y-3 pt-4">
                  {profileData.evidence.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-950 p-4 rounded-xl border border-gray-800/80 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{item.claim}</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            item.source === "linkedin"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-pink-500/10 text-pink-400 border border-pink-500/20"
                          }`}
                        >
                          {item.source === "linkedin" ? (
                            <Linkedin className="w-2.5 h-2.5" />
                          ) : (
                            <Instagram className="w-2.5 h-2.5" />
                          )}
                          {item.source}
                        </span>
                      </div>
                      <p className="text-gray-400 font-mono text-[11px] bg-gray-900/80 p-2 rounded-lg border border-gray-800/50">
                        &ldquo;{item.detail}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
