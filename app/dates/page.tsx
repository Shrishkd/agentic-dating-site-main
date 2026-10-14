"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Flame,
  Bot,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  MapPin,
  Heart,
  Trophy,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Users,
  MessageSquare,
  ShieldCheck,
  RefreshCw,
  X,
  Sliders,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { ConversationTurn, DateVenueSelection, DateScorecard } from "@/lib/dating/types";

interface CandidateOption {
  id: string;
  name: string;
  status: string;
  rawData?: any[];
}

interface CompletedDateItem {
  id: string;
  person_a_id: string;
  person_b_id: string;
  person_a: { id: string; name: string; rawData?: any[] };
  person_b: { id: string; name: string; rawData?: any[] };
  venue?: string;
  score_a_to_b?: number;
  score_b_to_a?: number;
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

export default function DatingFloorPage() {
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [completedDates, setCompletedDates] = useState<CompletedDateItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Live Dating State
  const [isDatingRunning, setIsDatingRunning] = useState(false);
  const [activeVenue, setActiveVenue] = useState<DateVenueSelection | null>(null);
  const [activePersonA, setActivePersonA] = useState<{ id: string; name: string } | null>(null);
  const [activePersonB, setActivePersonB] = useState<{ id: string; name: string } | null>(null);
  const [activeTurns, setActiveTurns] = useState<ConversationTurn[]>([]);
  const [activeScores, setActiveScores] = useState<{
    scoreAToB?: DateScorecard;
    scoreBToA?: DateScorecard;
  } | null>(null);
  const [progressInfo, setProgressInfo] = useState<{ current: number; total: number } | null>(null);
  const [streamNotice, setStreamNotice] = useState<string | null>(null);

  // Test Run Selector Modal
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchInitialData();
    return () => {
      stopDatingStream();
    };
  }, []);

  // Auto-scroll chat to bottom as new turns arrive
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeTurns]);

  async function fetchInitialData() {
    try {
      setLoading(true);
      const [peopleRes, datesRes] = await Promise.all([
        fetch("/api/people"),
        fetch("/api/dates"),
      ]);

      const peopleJson = await peopleRes.json();
      const datesJson = await datesRes.json();

      if (peopleJson.success) {
        setCandidates(peopleJson.data || []);
      }
      if (datesJson.success) {
        setCompletedDates(datesJson.data || []);
      }
    } catch (err) {
      console.error("Failed to load dating floor data:", err);
    } finally {
      setLoading(false);
    }
  }

  function startDatingStream(candidateIds?: string[]) {
    stopDatingStream();
    setIsDatingRunning(true);
    setActiveTurns([]);
    setActiveScores(null);
    setActiveVenue(null);
    setStreamNotice(null);

    let url = "/api/dates/stream";
    if (candidateIds && candidateIds.length > 0) {
      url += `?ids=${encodeURIComponent(candidateIds.join(","))}`;
    } else {
      url += "?all=true";
    }

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener("init", (e: any) => {
      const data = JSON.parse(e.data);
      setProgressInfo({ current: 0, total: data.totalPairs });
    });

    es.addEventListener("date_start", (e: any) => {
      const data = JSON.parse(e.data);
      setActivePersonA(data.personA);
      setActivePersonB(data.personB);
      setActiveTurns([]);
      setActiveScores(null);
      setActiveVenue(null);
      setProgressInfo({ current: data.pairIndex, total: data.totalPairs });
    });

    es.addEventListener("venue_selected", (e: any) => {
      const data = JSON.parse(e.data);
      setActiveVenue(data.venue);
    });

    es.addEventListener("turn_generated", (e: any) => {
      const data = JSON.parse(e.data);
      setActiveTurns((prev) => [...prev, data.turn]);
    });

    es.addEventListener("date_scored", (e: any) => {
      const data = JSON.parse(e.data);
      setActiveScores({
        scoreAToB: data.scoreAToB,
        scoreBToA: data.scoreBToA,
      });
    });

    es.addEventListener("date_complete", (e: any) => {
      fetchInitialData();
    });

    es.addEventListener("all_complete", (e: any) => {
      const data = JSON.parse(e.data);
      setStreamNotice(data.message || "All dates completed!");
      setIsDatingRunning(false);
      fetchInitialData();
      stopDatingStream();
    });

    es.addEventListener("error", (e: any) => {
      console.error("SSE Error:", e);
      setIsDatingRunning(false);
      stopDatingStream();
    });
  }

  function stopDatingStream() {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsDatingRunning(false);
  }

  function toggleCandidateSelection(id: string) {
    if (selectedTestIds.includes(id)) {
      setSelectedTestIds((prev) => prev.filter((i) => i !== id));
    } else {
      if (selectedTestIds.length >= 6) {
        alert("Select between 3 and 6 candidates for a test run.");
        return;
      }
      setSelectedTestIds((prev) => [...prev, id]);
    }
  }

  function handleStartTestRun() {
    if (selectedTestIds.length < 2) {
      alert("Please select at least 2 analyzed candidates.");
      return;
    }
    setShowTestModal(false);
    startDatingStream(selectedTestIds);
  }

  const [seeding, setSeeding] = useState(false);

  async function handleSeedDemoPool() {
    try {
      setSeeding(true);
      const res = await fetch("/api/demo/seed", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setStreamNotice(json.message);
        await fetchInitialData();
      } else {
        alert(json.error || "Failed to seed demo candidates.");
      }
    } catch (err: any) {
      alert(err.message || "Seeding error.");
    } finally {
      setSeeding(false);
    }
  }

  const analyzedCandidates = candidates.filter((c) => c.status === "analyzed");
  const totalPossiblePairs =
    analyzedCandidates.length >= 2
      ? (analyzedCandidates.length * (analyzedCandidates.length - 1)) / 2
      : 0;

  const mutualHighMatches = completedDates.filter(
    (d) =>
      d.score_a_to_b !== undefined &&
      d.score_b_to_a !== undefined &&
      d.score_a_to_b >= 75 &&
      d.score_b_to_a >= 75
  ).length;

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Top Header & Overview */}
      <div className="bg-gradient-to-r from-gray-900 via-[#131722] to-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-xs font-semibold border border-rose-500/20">
              <Flame className="w-3.5 h-3.5" /> Phase 5: Autonomous Dating Floor
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Live Speed Dating Arena
            </h1>
            <p className="text-sm text-gray-400 max-w-xl">
              AI agents represent real people in authentic 6-turn dates across every unique pair,
              choosing customized venues and privately scoring compatibility.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {analyzedCandidates.length < 2 && (
              <button
                onClick={handleSeedDemoPool}
                disabled={seeding}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-purple-500/20 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>{seeding ? "Populating..." : "Populate 4 Demo Candidates"}</span>
              </button>
            )}

            {!isDatingRunning ? (
              <>
                <button
                  onClick={() => setShowTestModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-200 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                  <Users className="w-4 h-4 text-purple-400" />
                  <span>Test Run (Select 3-5)</span>
                </button>

                <button
                  onClick={() => startDatingStream()}
                  disabled={analyzedCandidates.length < 2}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-bold shadow-lg shadow-rose-500/25 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Full Run ({totalPossiblePairs} Pairs)</span>
                </button>
              </>
            ) : (
              <button
                onClick={stopDatingStream}
                className="px-5 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 text-xs font-bold flex items-center gap-2 transition-colors"
              >
                <Pause className="w-4 h-4" />
                <span>Pause Dating Stream</span>
              </button>
            )}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-800/80">
          <div className="bg-gray-950/60 border border-gray-800/80 p-3.5 rounded-2xl">
            <span className="text-gray-400 text-xs font-medium block">Analyzed Candidates</span>
            <span className="text-xl font-bold text-white mt-1 block">
              {analyzedCandidates.length}
            </span>
          </div>

          <div className="bg-gray-950/60 border border-gray-800/80 p-3.5 rounded-2xl">
            <span className="text-gray-400 text-xs font-medium block">Total Unique Pairs</span>
            <span className="text-xl font-bold text-rose-400 mt-1 block">
              {totalPossiblePairs} pairs
            </span>
          </div>

          <div className="bg-gray-950/60 border border-gray-800/80 p-3.5 rounded-2xl">
            <span className="text-gray-400 text-xs font-medium block">Dates Completed</span>
            <span className="text-xl font-bold text-emerald-400 mt-1 block">
              {completedDates.length} / {totalPossiblePairs}
            </span>
          </div>

          <div className="bg-gray-950/60 border border-gray-800/80 p-3.5 rounded-2xl">
            <span className="text-gray-400 text-xs font-medium block">Mutual Sparks (&gt;75%)</span>
            <span className="text-xl font-bold text-amber-400 mt-1 block">
              {mutualHighMatches} couples
            </span>
          </div>
        </div>
      </div>

      {streamNotice && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{streamNotice}</span>
          </div>
          <button onClick={() => setStreamNotice(null)} className="hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Dating Floor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Live Date Active Stage (Left / Main Column) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-[#10131d] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between min-h-[560px]">
            {/* Stage Header */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        isDatingRunning ? "bg-rose-500 animate-ping" : "bg-gray-600"
                      }`}
                    />
                    <div
                      className={`w-3 h-3 rounded-full absolute inset-0 ${
                        isDatingRunning ? "bg-rose-500" : "bg-gray-600"
                      }`}
                    />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    {isDatingRunning ? "Live Date In Progress" : "Date Arena Idle"}
                  </span>
                </div>

                {progressInfo && (
                  <span className="text-xs text-gray-400 font-mono">
                    Pair {progressInfo.current} of {progressInfo.total}
                  </span>
                )}
              </div>

              {/* Candidates on Date Showcase */}
              {activePersonA && activePersonB ? (
                <div className="py-6 flex items-center justify-center gap-6 sm:gap-12">
                  {/* Candidate A */}
                  <div className="flex flex-col items-center text-center space-y-2">
                    <Avatar name={activePersonA.name} size="lg" />
                    <span className="font-bold text-sm text-white">{activePersonA.name}</span>
                    <span className="text-[10px] text-rose-400 uppercase font-medium">Agent A</span>
                  </div>

                  <div className="flex flex-col items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-inner">
                      <Heart className="w-5 h-5 fill-rose-500/20" />
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1">6 Turns</span>
                  </div>

                  {/* Candidate B */}
                  <div className="flex flex-col items-center text-center space-y-2">
                    <Avatar name={activePersonB.name} size="lg" />
                    <span className="font-bold text-sm text-white">{activePersonB.name}</span>
                    <span className="text-[10px] text-pink-400 uppercase font-medium">Agent B</span>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center space-y-3">
                  <Bot className="w-12 h-12 text-gray-600 mx-auto" />
                  <h3 className="font-bold text-gray-300 text-sm">No Active Date in Arena</h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Click &quot;Start Full Run&quot; or &quot;Test Run&quot; above to watch AI agents
                    meet, converse, and score their dates live turn-by-turn.
                  </p>
                </div>
              )}

              {/* Venue Card */}
              {activeVenue && (
                <div className="mb-4 bg-gradient-to-r from-gray-950 via-[#131722] to-gray-950 border border-gray-800 rounded-2xl p-4 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Venue: {activeVenue.name}</span>
                    <span className="text-gray-500 font-normal">({activeVenue.type})</span>
                  </div>
                  <p className="text-gray-400 text-[11px] leading-relaxed italic">
                    &ldquo;{activeVenue.reason}&rdquo;
                  </p>
                </div>
              )}

              {/* Live Chat Stream */}
              <div className="bg-gray-950/80 rounded-2xl p-4 border border-gray-800/80 max-h-[320px] overflow-y-auto space-y-3">
                {activeTurns.length === 0 ? (
                  <p className="text-xs text-gray-600 text-center py-8">
                    {isDatingRunning ? "Selecting customized date venue..." : "Chat transcript will stream here live."}
                  </p>
                ) : (
                  activeTurns.map((turn, idx) => {
                    const isA = turn.speakerName === activePersonA?.name;
                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-2.5 ${isA ? "justify-start" : "justify-end"}`}
                      >
                        {isA && <Avatar name={turn.speakerName} size="sm" />}
                        <div
                          className={`max-w-[80%] rounded-2xl p-3 text-xs space-y-1 ${
                            isA
                              ? "bg-gray-900 border border-gray-800 text-gray-200 rounded-tl-sm"
                              : "bg-gradient-to-tr from-rose-950/60 to-pink-950/60 border border-rose-500/30 text-rose-100 rounded-tr-sm"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-[10px] text-gray-400 font-medium">
                            <span>{turn.speakerName}</span>
                            <span>Turn {turn.turnNumber}/6</span>
                          </div>
                          <p className="leading-relaxed">{turn.message}</p>
                        </div>
                        {!isA && <Avatar name={turn.speakerName} size="sm" />}
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>
            </div>

            {/* Scorecard Reveal at End of Live Date */}
            {activeScores && activeScores.scoreAToB && activeScores.scoreBToA && (
              <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Score A to B */}
                <div className="bg-gray-950 p-3.5 rounded-xl border border-rose-500/30 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-rose-300">
                      {activePersonA?.name} &rarr; {activePersonB?.name}
                    </span>
                    <span className="font-bold text-base text-rose-400">
                      {activeScores.scoreAToB.overall_score}/100
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 line-clamp-2">
                    {activeScores.scoreAToB.reason}
                  </p>
                </div>

                {/* Score B to A */}
                <div className="bg-gray-950 p-3.5 rounded-xl border border-pink-500/30 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-pink-300">
                      {activePersonB?.name} &rarr; {activePersonA?.name}
                    </span>
                    <span className="font-bold text-base text-pink-400">
                      {activeScores.scoreBToA.overall_score}/100
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 line-clamp-2">
                    {activeScores.scoreBToA.reason}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Dates Feed (Right Column) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#10131d] border border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between min-h-[560px]">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-rose-400" />
                  <h3 className="font-bold text-sm text-white">
                    Completed Dates ({completedDates.length})
                  </h3>
                </div>
                <button
                  onClick={fetchInitialData}
                  className="text-gray-400 hover:text-white text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>

              {completedDates.length === 0 ? (
                <div className="py-20 text-center text-gray-500 text-xs">
                  No date sessions recorded yet. Start a run on the left to see completed dates.
                </div>
              ) : (
                <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
                  {completedDates.map((date) => {
                    let venueObj: any = {};
                    try {
                      venueObj = JSON.parse(date.venue || "{}");
                    } catch {}

                    const mutualScore =
                      date.score_a_to_b !== undefined && date.score_b_to_a !== undefined
                        ? Math.round((date.score_a_to_b + date.score_b_to_a) / 2)
                        : null;

                    return (
                      <Link
                        key={date.id}
                        href={`/dates/${date.id}`}
                        className="block bg-gray-950/70 border border-gray-800 hover:border-gray-700 p-3.5 rounded-2xl transition-all group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Avatar name={date.person_a.name} size="sm" />
                            <span className="text-[10px] text-gray-400 font-bold">&amp;</span>
                            <Avatar name={date.person_b.name} size="sm" />
                          </div>

                          {mutualScore !== null && (
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                                mutualScore >= 75
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : mutualScore >= 50
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              }`}
                            >
                              {mutualScore}% Fit
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="font-semibold text-white truncate max-w-[170px] group-hover:text-rose-300 transition-colors">
                            {date.person_a.name} + {date.person_b.name}
                          </div>
                          <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            Replay <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>

                        {venueObj.name && (
                          <p className="text-[10px] text-gray-400 mt-1 truncate">
                            📍 {venueObj.name}
                          </p>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-800 flex items-center justify-between text-[11px] text-gray-500">
              <span>Ready for Phase 6: Mutual Rankings</span>
              <Link href="/rankings" className="text-rose-400 hover:underline flex items-center gap-1 font-semibold">
                <span>View Rankings</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Test Run Candidate Selector Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#10131d] border border-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-base text-white">Select Candidates for Test Run</h3>
              </div>
              <button
                onClick={() => setShowTestModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Choose 2 to 5 analyzed candidates. The engine will pair them up and execute dates
              sequentially through the rate-limited queue.
            </p>

            {analyzedCandidates.length < 2 ? (
              <div className="py-6 text-center space-y-3 bg-gray-950 p-6 rounded-2xl border border-gray-800">
                <Users className="w-10 h-10 text-rose-400 mx-auto" />
                <h4 className="font-bold text-white text-sm">Need at least 2 Analyzed Candidates</h4>
                <p className="text-xs text-gray-400">
                  Speed dating pairs candidates up (A + B). You currently have {analyzedCandidates.length} candidate ready.
                  Click below to populate 4 real demo candidates and start dates immediately!
                </p>
                <button
                  onClick={async () => {
                    await handleSeedDemoPool();
                    setShowTestModal(false);
                  }}
                  disabled={seeding}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-semibold shadow-md shadow-purple-500/20"
                >
                  {seeding ? "Populating..." : "Populate 4 Demo Candidates (1-Click)"}
                </button>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {analyzedCandidates.map((c) => {
                  const isSelected = selectedTestIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleCandidateSelection(c.id)}
                      className={`w-full p-3 rounded-xl border text-xs text-left flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-rose-500/20 border-rose-500 text-white font-semibold"
                          : "bg-gray-950 border-gray-800 text-gray-300 hover:bg-gray-900"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} size="sm" />
                        <span>{c.name}</span>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-rose-400" />}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-800">
              <span className="text-xs text-gray-400">
                {selectedTestIds.length} candidates selected (
                {selectedTestIds.length >= 2
                  ? (selectedTestIds.length * (selectedTestIds.length - 1)) / 2
                  : 0}{" "}
                pairs)
              </span>
              <button
                onClick={handleStartTestRun}
                disabled={selectedTestIds.length < 2}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 disabled:opacity-50 transition-all"
              >
                Launch Test Run
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
