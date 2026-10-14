"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Flame,
  Heart,
  MapPin,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Trophy,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { ConversationTurn, DateScorecard, DateVenueSelection } from "@/lib/dating/types";

interface DateSessionDetail {
  id: string;
  person_a_id: string;
  person_b_id: string;
  person_a: { id: string; name: string; rawData?: any[] };
  person_b: { id: string; name: string; rawData?: any[] };
  venue?: string;
  transcript?: string;
  score_a_to_b?: number;
  score_b_to_a?: number;
  reason_a?: string;
  reason_b?: string;
  highlights?: string;
  status: string;
  created_at: string;
}

function getCandidatePhoto(candidate: { rawData?: any[] }): string | undefined {
  if (!candidate.rawData) return undefined;
  for (const raw of candidate.rawData) {
    try {
      const parsed = JSON.parse(raw.json_data);
      if (parsed.profilePhotoUrl) return parsed.profilePhotoUrl;
    } catch {}
  }
  return undefined;
}

export default function DateReplayPage() {
  const params = useParams();
  const dateId = params.id as string;

  const [dateSession, setDateSession] = useState<DateSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dateId) {
      fetchDateDetails();
    }
  }, [dateId]);

  async function fetchDateDetails() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/dates/${dateId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setDateSession(json.data);
      } else {
        setError(json.error || "Date session not found.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load date details.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-rose-500" />
        <p className="text-sm text-gray-400">Loading date replay transcript...</p>
      </div>
    );
  }

  if (!dateSession) {
    return (
      <div className="flex-1 max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Date Session Not Found</h2>
        <p className="text-sm text-gray-400">{error || "Could not retrieve date data."}</p>
        <Link
          href="/dates"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-800 text-sm font-medium text-gray-200 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dating Floor
        </Link>
      </div>
    );
  }

  let venueObj: DateVenueSelection = {
    name: "Cozy Spot",
    type: "Cafe",
    reason: "Relaxed meetup setting",
  };
  let turns: ConversationTurn[] = [];
  let highlights: string[] = [];

  try {
    if (dateSession.venue) venueObj = JSON.parse(dateSession.venue);
    if (dateSession.transcript) turns = JSON.parse(dateSession.transcript);
    if (dateSession.highlights) highlights = JSON.parse(dateSession.highlights);
  } catch {}

  const scoreA = dateSession.score_a_to_b ?? 70;
  const scoreB = dateSession.score_b_to_a ?? 70;
  const mutualScore = Math.round(0.6 * scoreA + 0.4 * scoreB);

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full space-y-8">
      {/* Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/dates"
          className="inline-flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dating Floor
        </Link>
        <Link
          href="/rankings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300"
        >
          <Trophy className="w-4 h-4" /> View Match Rankings
        </Link>
      </div>

      {/* Date Header Showcase */}
      <div className="bg-[#10131d] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Couple Avatars */}
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href={`/people/${dateSession.person_a_id}`}
              className="flex flex-col items-center group"
            >
              <Avatar
                name={dateSession.person_a.name}
                photoUrl={getCandidatePhoto(dateSession.person_a)}
                size="lg"
              />
              <span className="text-xs font-bold text-white mt-1 group-hover:text-rose-300 transition-colors">
                {dateSession.person_a.name}
              </span>
            </Link>

            <div className="flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-inner">
                <Heart className="w-5 h-5 fill-rose-500/20" />
              </div>
              <span className="text-[10px] text-gray-500 mt-1 font-mono">Date Replay</span>
            </div>

            <Link
              href={`/people/${dateSession.person_b_id}`}
              className="flex flex-col items-center group"
            >
              <Avatar
                name={dateSession.person_b.name}
                photoUrl={getCandidatePhoto(dateSession.person_b)}
                size="lg"
              />
              <span className="text-xs font-bold text-white mt-1 group-hover:text-pink-300 transition-colors">
                {dateSession.person_b.name}
              </span>
            </Link>
          </div>

          {/* Compatibility Score Badge */}
          <div className="bg-gray-950/80 border border-gray-800 rounded-2xl p-4 min-w-[240px] text-center space-y-1">
            <span className="text-gray-400 text-xs font-medium">Weighted Mutual Fit</span>
            <div className="text-3xl font-extrabold bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent">
              {mutualScore}%
            </div>
            <p className="text-[11px] text-gray-500">
              Formula: 0.6 &times; A&rarr;B + 0.4 &times; B&rarr;A
            </p>
          </div>
        </div>

        {/* Venue Spotlight */}
        <div className="mt-6 pt-6 border-t border-gray-800/80 flex items-start gap-3 text-xs">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 flex-shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <strong className="text-white text-sm">{venueObj.name}</strong>
              <span className="text-rose-400 font-medium">({venueObj.type})</span>
            </div>
            <p className="text-gray-400 mt-0.5 leading-relaxed">{venueObj.reason}</p>
          </div>
        </div>
      </div>

      {/* 6-Turn Chat Transcript */}
      <div className="bg-[#10131d] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-rose-400 font-bold text-sm uppercase tracking-wider">
          <MessageSquare className="w-4 h-4" /> 6-Turn Date Conversation Transcript
        </div>

        <div className="bg-gray-950/80 border border-gray-800/80 rounded-2xl p-6 space-y-4">
          {turns.map((turn, idx) => {
            const isA = turn.speakerName === dateSession.person_a.name;
            return (
              <div
                key={idx}
                className={`flex items-start gap-3 ${isA ? "justify-start" : "justify-end"}`}
              >
                {isA && (
                  <Avatar
                    name={turn.speakerName}
                    photoUrl={getCandidatePhoto(dateSession.person_a)}
                    size="sm"
                  />
                )}
                <div
                  className={`max-w-[78%] rounded-2xl p-4 text-xs space-y-1.5 ${
                    isA
                      ? "bg-gray-900 border border-gray-800 text-gray-200 rounded-tl-sm"
                      : "bg-gradient-to-tr from-rose-950/60 to-pink-950/60 border border-rose-500/30 text-rose-100 rounded-tr-sm"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 text-[10px] text-gray-400 font-medium">
                    <span className="font-semibold text-white">{turn.speakerName}</span>
                    <span className="font-mono">Turn {turn.turnNumber}/6</span>
                  </div>
                  <p className="leading-relaxed text-sm">{turn.message}</p>
                </div>
                {!isA && (
                  <Avatar
                    name={turn.speakerName}
                    photoUrl={getCandidatePhoto(dateSession.person_b)}
                    size="sm"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Side-by-Side Asymmetric Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scorecard A to B */}
        <div className="bg-[#10131d] border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <div>
              <h3 className="font-bold text-sm text-white">
                {dateSession.person_a.name}&apos;s Evaluation
              </h3>
              <p className="text-[11px] text-gray-400">
                Private assessment of {dateSession.person_b.name}
              </p>
            </div>
            <span className="text-2xl font-extrabold text-rose-400">{scoreA}/100</span>
          </div>

          <p className="text-xs text-gray-300 leading-relaxed bg-gray-950 p-4 rounded-xl border border-gray-800">
            {dateSession.reason_a || "Evaluated positively across conversation and values."}
          </p>

          {/* Highlights */}
          {highlights.length > 0 && (
            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold block">
                Highlights Noted:
              </span>
              <ul className="space-y-1 text-xs text-rose-200">
                {highlights.slice(0, 2).map((h, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <span>&ldquo;{h}&rdquo;</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Scorecard B to A */}
        <div className="bg-[#10131d] border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <div>
              <h3 className="font-bold text-sm text-white">
                {dateSession.person_b.name}&apos;s Evaluation
              </h3>
              <p className="text-[11px] text-gray-400">
                Private assessment of {dateSession.person_a.name}
              </p>
            </div>
            <span className="text-2xl font-extrabold text-pink-400">{scoreB}/100</span>
          </div>

          <p className="text-xs text-gray-300 leading-relaxed bg-gray-950 p-4 rounded-xl border border-gray-800">
            {dateSession.reason_b || "Evaluated positively across conversation and values."}
          </p>

          {/* Highlights */}
          {highlights.length > 2 && (
            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold block">
                Highlights Noted:
              </span>
              <ul className="space-y-1 text-xs text-pink-200">
                {highlights.slice(2, 4).map((h, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-pink-400 flex-shrink-0 mt-0.5" />
                    <span>&ldquo;{h}&rdquo;</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
