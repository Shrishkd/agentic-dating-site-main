"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Trophy,
  Heart,
  Sparkles,
  Flame,
  ArrowRight,
  RefreshCw,
  TrendingUp,
  Award,
  Layers,
  Info,
  ExternalLink,
  Crown,
  Grid,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { ComputedRankItem, TopMutualPair, HeatmapCell } from "@/lib/ranking/engine";

interface CandidateItem {
  id: string;
  name: string;
  photoUrl?: string;
}

export default function RankingsPage() {
  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [rankings, setRankings] = useState<ComputedRankItem[]>([]);
  const [topMutualPairs, setTopMutualPairs] = useState<TopMutualPair[]>([]);
  const [heatmap, setHeatmap] = useState<{
    candidates: CandidateItem[];
    matrix: HeatmapCell[][];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    fetchRankingsData();
  }, []);

  async function fetchRankingsData(personId?: string) {
    try {
      setLoading(true);
      const url = personId
        ? `/api/rankings?personId=${encodeURIComponent(personId)}`
        : "/api/rankings";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setCandidates(json.candidates || []);
        setSelectedPersonId(json.selectedPersonId || null);
        setRankings(json.rankings || []);
        setTopMutualPairs(json.topMutualPairs || []);
        setHeatmap(json.heatmap || null);
      }
    } catch (err) {
      console.error("Failed to load rankings:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectPerson(id: string) {
    setSelectedPersonId(id);
    await fetchRankingsData(id);
  }

  async function handleRecalculate() {
    try {
      setRecalculating(true);
      const res = await fetch("/api/rankings", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        await fetchRankingsData(selectedPersonId || undefined);
      }
    } catch (err) {
      console.error("Failed to recalculate rankings:", err);
    } finally {
      setRecalculating(false);
    }
  }

  const selectedCandidate = candidates.find((c) => c.id === selectedPersonId);

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Header & Formula Explanation */}
      <div className="bg-gradient-to-r from-gray-900 via-[#131722] to-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold border border-amber-500/20">
              <Trophy className="w-3.5 h-3.5" /> Phase 6: Mutual Fit Rankings
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Compatibility Rankings &amp; Matrix
            </h1>
            <p className="text-sm text-gray-400 max-w-xl">
              Mutual fit formula balances individual preference with partner attraction:
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRecalculate}
              disabled={recalculating}
              className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-200 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? "animate-spin" : ""}`} />
              <span>{recalculating ? "Recalculating..." : "Recalculate Ranks"}</span>
            </button>
          </div>
        </div>

        {/* Mathematical Formula Pill */}
        <div className="mt-6 pt-6 border-t border-gray-800/80 flex flex-wrap items-center gap-3">
          <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
            Scoring Formula:
          </span>
          <div className="px-3.5 py-1.5 rounded-full bg-gray-950 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold shadow-inner">
            Final Score = (0.6 &times; Score Given) + (0.4 &times; Score Received)
          </div>
          <span className="text-xs text-gray-500">
            (Rewards genuine two-way attraction over one-sided enthusiasm)
          </span>
        </div>
      </div>

      {/* Top Mutual Matches Showcase */}
      {topMutualPairs.length > 0 && (
        <div className="bg-[#10131d] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm uppercase tracking-wider">
              <Sparkles className="w-4 h-4" /> Top Mutual Matches Across the Pool
            </div>
            <span className="text-xs text-gray-500">Highest mutual two-way compatibility</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {topMutualPairs.slice(0, 6).map((pair, idx) => (
              <div
                key={idx}
                className="bg-gray-950/80 border border-gray-800 hover:border-gray-700 p-4 rounded-2xl flex flex-col justify-between space-y-3 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar name={pair.personAName} photoUrl={pair.personAPhoto} size="sm" />
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/30" />
                    <Avatar name={pair.personBName} photoUrl={pair.personBPhoto} size="sm" />
                  </div>
                  <span className="text-sm font-extrabold text-emerald-400 font-mono">
                    {pair.mutualScore}% Fit
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-white text-xs truncate">
                    {pair.personAName} &amp; {pair.personBName}
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Scores: {pair.scoreAToB}% &bull; {pair.scoreBToA}%
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-900 flex items-center justify-between text-[11px]">
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 font-medium">
                    Mutual Spark
                  </span>
                  <Link
                    href={`/dates/${pair.dateSessionId}`}
                    className="text-gray-400 hover:text-white flex items-center gap-1 font-medium group-hover:text-rose-400"
                  >
                    <span>Replay Date</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Candidate Match Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Candidate Selector (Left Column) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#10131d] border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Select Candidate ({candidates.length})</span>
            </h3>

            {loading ? (
              <div className="py-12 text-center text-gray-500 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-rose-500" />
                <span>Loading candidates...</span>
              </div>
            ) : candidates.length === 0 ? (
              <p className="text-xs text-gray-500">
                No analyzed candidates found. Add candidates in Phase 2/4.
              </p>
            ) : (
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {candidates.map((c) => {
                  const isSelected = c.id === selectedPersonId;
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleSelectPerson(c.id)}
                      className={`w-full p-3 rounded-2xl border text-xs text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? "bg-gradient-to-r from-rose-500/20 to-pink-500/10 border-rose-500/60 text-white font-bold shadow-md shadow-rose-500/10"
                          : "bg-gray-950/70 border-gray-800 text-gray-300 hover:bg-gray-900"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} photoUrl={c.photoUrl} size="sm" />
                        <span className="truncate max-w-[140px]">{c.name}</span>
                      </div>
                      <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? "text-rose-400" : "text-gray-600"}`} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Ranked Matches for Selected Candidate (Right Column) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-[#10131d] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl min-h-[500px]">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-6">
              <div className="flex items-center gap-3">
                {selectedCandidate && (
                  <Avatar name={selectedCandidate.name} photoUrl={selectedCandidate.photoUrl} size="md" />
                )}
                <div>
                  <h3 className="font-bold text-base text-white">
                    {selectedCandidate ? `${selectedCandidate.name}'s Ranked Matches` : "Ranked Matches"}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Ordered by weighted mutual compatibility
                  </p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center text-gray-500 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin text-rose-500 mx-auto mb-2" />
                <span>Computing rankings...</span>
              </div>
            ) : rankings.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <Trophy className="w-10 h-10 text-gray-600 mx-auto" />
                <h4 className="font-bold text-gray-300 text-sm">No Dates Completed for this Candidate</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Run dates on the Dating Floor to generate mutual compatibility rankings.
                </p>
                <Link
                  href="/dates"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-semibold mt-2"
                >
                  <Flame className="w-3.5 h-3.5" /> Go to Dating Floor
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {rankings.map((item) => {
                  const isTop1 = item.rank === 1;
                  const isTop2 = item.rank === 2;
                  const isTop3 = item.rank === 3;

                  return (
                    <div
                      key={item.rankedPersonId}
                      className={`p-5 rounded-2xl border transition-all ${
                        isTop1
                          ? "bg-gradient-to-r from-amber-950/20 via-gray-950 to-gray-950 border-amber-500/40 shadow-lg shadow-amber-500/5"
                          : "bg-gray-950/80 border-gray-800/80 hover:border-gray-700"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                        {/* Partner Header */}
                        <div className="flex items-center gap-3">
                          {/* Rank Badge */}
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                              isTop1
                                ? "bg-amber-400 text-gray-950"
                                : isTop2
                                ? "bg-gray-300 text-gray-950"
                                : isTop3
                                ? "bg-amber-700 text-white"
                                : "bg-gray-800 text-gray-400"
                            }`}
                          >
                            {isTop1 ? <Crown className="w-3.5 h-3.5 fill-gray-950" /> : `#${item.rank}`}
                          </div>

                          <Avatar name={item.rankedPersonName} photoUrl={item.rankedPersonPhoto} size="md" />

                          <div>
                            <h4 className="font-bold text-sm text-white">
                              {item.rankedPersonName}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                  item.fitCategory === "mutual_spark"
                                    ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                                    : item.fitCategory === "high_fit"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : item.fitCategory === "one_sided"
                                    ? "bg-purple-500/10 text-purple-300 border-purple-500/20"
                                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                }`}
                              >
                                {item.fitCategory === "mutual_spark"
                                  ? "Mutual Spark"
                                  : item.fitCategory === "high_fit"
                                  ? "High Compatibility"
                                  : item.fitCategory === "one_sided"
                                  ? "One-Sided Interest"
                                  : "Good Potential"}
                              </span>

                              <span className="text-[10px] text-gray-400">
                                Gave: <strong className="text-rose-300">{Math.round(item.scoreGiven)}</strong> &bull; Received: <strong className="text-pink-300">{Math.round(item.scoreReceived)}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Composite Final Score */}
                        <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                          <span className="text-xs text-gray-400 font-medium sm:block hidden">
                            Final Score
                          </span>
                          <span className="text-2xl font-extrabold bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent font-mono">
                            {item.finalScore}%
                          </span>
                        </div>
                      </div>

                      {/* Gemini Match Explanation */}
                      <p className="text-xs text-gray-300 leading-relaxed bg-gray-900/60 p-3 rounded-xl border border-gray-800/60">
                        {item.explanation}
                      </p>

                      {/* Action Links */}
                      <div className="mt-3 pt-3 border-t border-gray-800/60 flex items-center justify-end gap-3 text-xs">
                        <Link
                          href={`/people/${item.rankedPersonId}`}
                          className="text-gray-400 hover:text-white flex items-center gap-1 font-medium transition-colors"
                        >
                          <span>View Profile</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                        {item.dateSessionId && (
                          <Link
                            href={`/dates/${item.dateSessionId}`}
                            className="text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 transition-colors"
                          >
                            <span>Replay Date</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pairwise Compatibility Heatmap Matrix */}
      {heatmap && heatmap.candidates.length > 0 && (
        <div className="bg-[#10131d] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-wider">
              <Grid className="w-4 h-4" /> Pairwise Compatibility Heatmap Matrix
            </div>
            <div className="flex items-center gap-3 text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> 80%+
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-emerald-700" /> 70-79%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-amber-600" /> 60-69%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-rose-800" /> &lt;60%
              </span>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <table className="text-center text-xs border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left text-gray-500 font-mono text-[11px] min-w-[120px]">
                    Candidate
                  </th>
                  {heatmap.candidates.map((col) => (
                    <th key={col.id} className="p-2 text-center text-gray-400 font-semibold text-[11px] min-w-[80px]">
                      <div className="flex flex-col items-center gap-1">
                        <Avatar name={col.name} photoUrl={col.photoUrl} size="sm" />
                        <span className="truncate max-w-[70px]">{col.name.split(" ")[0]}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.matrix.map((row, rowIdx) => {
                  const rowCandidate = heatmap.candidates[rowIdx];
                  return (
                    <tr key={rowIdx} className="border-t border-gray-800/50">
                      {/* Row Label */}
                      <td className="p-2 text-left font-medium text-white flex items-center gap-2">
                        <Avatar name={rowCandidate.name} photoUrl={rowCandidate.photoUrl} size="sm" />
                        <span className="truncate max-w-[100px]">{rowCandidate.name}</span>
                      </td>

                      {/* Cells */}
                      {row.map((cell, colIdx) => {
                        if (rowIdx === colIdx) {
                          return (
                            <td key={colIdx} className="p-2 bg-gray-950/40 text-gray-700 font-mono">
                              &mdash;
                            </td>
                          );
                        }

                        const score = cell.mutualScore;
                        if (score === null) {
                          return (
                            <td key={colIdx} className="p-2 bg-gray-950 text-gray-600 font-mono text-[11px]">
                              N/A
                            </td>
                          );
                        }

                        const bgClass =
                          score >= 80
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                            : score >= 70
                            ? "bg-emerald-800/20 text-emerald-400 border-emerald-700/30 hover:bg-emerald-800/30"
                            : score >= 60
                            ? "bg-amber-600/20 text-amber-300 border-amber-600/30 hover:bg-amber-600/30"
                            : "bg-rose-900/20 text-rose-400 border-rose-800/30 hover:bg-rose-900/30";

                        return (
                          <td key={colIdx} className="p-1">
                            {cell.dateSessionId ? (
                              <Link
                                href={`/dates/${cell.dateSessionId}`}
                                className={`block p-2 rounded-xl border text-xs font-bold font-mono transition-transform hover:scale-105 ${bgClass}`}
                                title={`${cell.personAName} & ${cell.personBName}: ${score}% (Click to Replay)`}
                              >
                                {score}%
                              </Link>
                            ) : (
                              <div className={`p-2 rounded-xl border text-xs font-bold font-mono ${bgClass}`}>
                                {score}%
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
