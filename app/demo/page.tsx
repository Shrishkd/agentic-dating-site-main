"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Bot,
  Heart,
  Flame,
  Trophy,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Linkedin,
  Instagram,
  ExternalLink,
  MapPin,
  Sliders,
  Download,
  Eye,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import demoData from "@/data/demo-snapshot.json";

export default function DemoPage() {
  const [selectedCandidate, setSelectedCandidate] = useState<any>(demoData.candidates[0] || null);
  const [selectedDate, setSelectedDate] = useState<any>(demoData.dates[0] || null);
  const [activeTab, setActiveTab] = useState<"personas" | "dates" | "rankings">("personas");
  const [exporting, setExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  async function handleExportCurrentRun() {
    try {
      setExporting(true);
      const res = await fetch("/api/demo/export", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setExportNotice("Database run state exported to /data/demo-snapshot.json!");
      } else {
        alert(json.error || "Export failed.");
      }
    } catch (err: any) {
      alert(err.message || "Export error.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-[#131722] to-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" /> Read-Only Interactive Demo Mode
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              AgentMatch Demo Showcase
            </h1>
            <p className="text-sm text-gray-400 max-w-xl">
              Explore pre-computed AI agent personas, multi-turn date transcripts, and mutual
              rankings with zero API calls required.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCurrentRun}
              disabled={exporting}
              className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors"
              title="Save current database run into demo snapshot"
            >
              <Download className="w-3.5 h-3.5 text-rose-400" />
              <span>{exporting ? "Exporting..." : "Export Current Run"}</span>
            </button>

            <Link
              href="/people"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-bold shadow-lg shadow-rose-500/25 flex items-center gap-2 transition-all"
            >
              <span>Try With Your Own Links</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {exportNotice && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
            <span>{exportNotice}</span>
            <button onClick={() => setExportNotice(null)} className="text-emerald-400 hover:text-white text-xs">
              Dismiss
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-4 mt-6 pt-6 border-t border-gray-800/80">
          <button
            onClick={() => setActiveTab("personas")}
            className={`pb-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "personas"
                ? "border-rose-500 text-rose-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Bot className="w-4 h-4" /> 1. Analyzed Personas ({demoData.candidates.length})
          </button>
          <button
            onClick={() => setActiveTab("dates")}
            className={`pb-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "dates"
                ? "border-rose-500 text-rose-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Flame className="w-4 h-4" /> 2. Date Transcripts ({demoData.dates.length})
          </button>
          <button
            onClick={() => setActiveTab("rankings")}
            className={`pb-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "rankings"
                ? "border-rose-500 text-rose-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Trophy className="w-4 h-4" /> 3. Mutual Rankings &amp; Matches
          </button>
        </div>
      </div>

      {/* Tab 1: Candidate Personas */}
      {activeTab === "personas" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Candidate List (Left) */}
          <div className="lg:col-span-4 space-y-2">
            <div className="bg-[#10131d] border border-gray-800 rounded-3xl p-6 shadow-xl space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400">
                Demo Candidates
              </h3>
              <div className="space-y-2">
                {demoData.candidates.map((c: any) => {
                  const isSelected = c.id === selectedCandidate?.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCandidate(c)}
                      className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? "bg-rose-500/20 border-rose-500 text-white font-bold shadow-md shadow-rose-500/10"
                          : "bg-gray-950/70 border-gray-800 text-gray-300 hover:bg-gray-900"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} photoUrl={c.photoUrl} size="sm" />
                        <div>
                          <p className="text-xs font-semibold">{c.name}</p>
                          <p className="text-[10px] text-gray-400">{c.communication_style}</p>
                        </div>
                      </div>
                      <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? "text-rose-400" : "text-gray-600"}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Persona Detail (Right) */}
          <div className="lg:col-span-8 space-y-6">
            {selectedCandidate && (
              <div className="bg-[#10131d] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4 pb-4 border-b border-gray-800">
                  <Avatar name={selectedCandidate.name} photoUrl={selectedCandidate.photoUrl} size="lg" />
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedCandidate.name}</h2>
                    <p className="text-xs text-rose-300 font-medium">{selectedCandidate.communication_style}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <a
                        href={selectedCandidate.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <Linkedin className="w-3 h-3" /> LinkedIn
                      </a>
                      <a
                        href={selectedCandidate.instagram_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-pink-400 hover:underline flex items-center gap-1"
                      >
                        <Instagram className="w-3 h-3" /> Instagram
                      </a>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="space-y-1 text-xs">
                  <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                    Persona Summary:
                  </span>
                  <p className="text-gray-200 leading-relaxed font-normal bg-gray-950 p-4 rounded-xl border border-gray-800">
                    {selectedCandidate.summary}
                  </p>
                </div>

                {/* Traits */}
                {selectedCandidate.personality_traits && (
                  <div className="space-y-2">
                    <span className="text-[11px] text-purple-400 uppercase tracking-wider font-bold">
                      Personality Trait Scores:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedCandidate.personality_traits.map((t: any, i: number) => (
                        <div key={i} className="bg-gray-950 p-3 rounded-xl border border-gray-800 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white font-medium">{t.trait}</span>
                            <span className="font-mono font-bold text-rose-400">{t.score}/100</span>
                          </div>
                          <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-rose-500 to-pink-500 h-full" style={{ width: `${t.score}%` }} />
                          </div>
                          <p className="text-[10px] text-gray-400">{t.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deal-Breakers */}
                {selectedCandidate.deal_breakers && (
                  <div className="space-y-2">
                    <span className="text-[11px] text-rose-400 uppercase tracking-wider font-bold">
                      Strict Deal-Breakers:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedCandidate.deal_breakers.map((db: string, i: number) => (
                        <span key={i} className="px-3 py-1 rounded-xl bg-rose-950/40 text-rose-300 border border-rose-500/30 text-xs font-medium">
                          &bull; {db}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Date Transcripts */}
      {activeTab === "dates" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Date Selector */}
          <div className="lg:col-span-4 space-y-2">
            <div className="bg-[#10131d] border border-gray-800 rounded-3xl p-6 shadow-xl space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400">
                Demo Date Sessions
              </h3>
              <div className="space-y-2">
                {demoData.dates.map((d: any) => {
                  const isSelected = d.id === selectedDate?.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDate(d)}
                      className={`w-full p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? "bg-rose-500/20 border-rose-500 text-white font-bold"
                          : "bg-gray-950/70 border-gray-800 text-gray-300 hover:bg-gray-900"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span>{d.personAName} &amp; {d.personBName}</span>
                        <span className="text-emerald-400 font-bold">{d.scoreAToB?.overall_score}%</span>
                      </div>
                      <p className="text-[10px] text-gray-400 truncate">📍 {d.venue?.name}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Transcript View */}
          <div className="lg:col-span-8 space-y-6">
            {selectedDate && (
              <div className="bg-[#10131d] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    <Avatar name={selectedDate.personAName} size="md" />
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500/30" />
                    <Avatar name={selectedDate.personBName} size="md" />
                    <h3 className="font-bold text-sm text-white">
                      {selectedDate.personAName} &amp; {selectedDate.personBName}
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    Mutual Fit: {Math.round((selectedDate.scoreAToB.overall_score + selectedDate.scoreBToA.overall_score) / 2)}%
                  </span>
                </div>

                {/* Venue */}
                <div className="bg-gray-950 p-4 rounded-2xl border border-gray-800 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Venue: {selectedDate.venue.name}</span>
                  </div>
                  <p className="text-gray-400 italic text-[11px]">&ldquo;{selectedDate.venue.reason}&rdquo;</p>
                </div>

                {/* 6-Turn Dialogue */}
                <div className="space-y-3">
                  {selectedDate.turns.map((t: any, i: number) => {
                    const isA = t.speakerName === selectedDate.personAName;
                    return (
                      <div key={i} className={`flex items-start gap-2.5 ${isA ? "justify-start" : "justify-end"}`}>
                        {isA && <Avatar name={t.speakerName} size="sm" />}
                        <div
                          className={`max-w-[80%] p-3.5 rounded-2xl text-xs space-y-1 ${
                            isA
                              ? "bg-gray-900 border border-gray-800 text-gray-200 rounded-tl-sm"
                              : "bg-gradient-to-tr from-rose-950/60 to-pink-950/60 border border-rose-500/30 text-rose-100 rounded-tr-sm"
                          }`}
                        >
                          <span className="text-[10px] text-gray-400 block font-semibold">{t.speakerName} (Turn {t.turnNumber}/6)</span>
                          <p className="leading-relaxed">{t.message}</p>
                        </div>
                        {!isA && <Avatar name={t.speakerName} size="sm" />}
                      </div>
                    );
                  })}
                </div>

                {/* Scorecards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-800">
                  <div className="bg-gray-950 p-4 rounded-xl border border-rose-500/20 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-rose-300">{selectedDate.personAName} &rarr; {selectedDate.personBName}</span>
                      <span className="text-rose-400 font-mono">{selectedDate.scoreAToB.overall_score}/100</span>
                    </div>
                    <p className="text-[11px] text-gray-400">{selectedDate.scoreAToB.reason}</p>
                  </div>

                  <div className="bg-gray-950 p-4 rounded-xl border border-pink-500/20 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-pink-300">{selectedDate.personBName} &rarr; {selectedDate.personAName}</span>
                      <span className="text-pink-400 font-mono">{selectedDate.scoreBToA.overall_score}/100</span>
                    </div>
                    <p className="text-[11px] text-gray-400">{selectedDate.scoreBToA.reason}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Rankings */}
      {activeTab === "rankings" && (
        <div className="space-y-6">
          <div className="bg-[#10131d] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Top Mutual Matches</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {demoData.topMutualPairs.map((pair: any, i: number) => (
                <div key={i} className="bg-gray-950 p-5 rounded-2xl border border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={pair.personAName} size="md" />
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500/30" />
                    <Avatar name={pair.personBName} size="md" />
                    <div>
                      <h4 className="font-bold text-sm text-white">{pair.personAName} &amp; {pair.personBName}</h4>
                      <p className="text-xs text-gray-400">Score A: {pair.scoreAToB}% &bull; Score B: {pair.scoreBToA}%</p>
                    </div>
                  </div>
                  <span className="text-lg font-extrabold text-emerald-400 font-mono">{pair.mutualScore}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
