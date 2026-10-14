"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Trash2,
  ExternalLink,
  Linkedin,
  Instagram,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight,
  RefreshCw,
  FileText,
  UserPlus,
  Info,
  Lock,
  Eye,
  X,
  Play,
  Check,
  Bot,
  LayoutGrid,
  List,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { validateLinkedInUrl, validateInstagramUrl, parseBulkInput } from "@/lib/validation";

function getPersonPhoto(person: PersonItem): string | undefined {
  if (!person.rawData) return undefined;
  for (const raw of person.rawData) {
    try {
      const parsed = JSON.parse(raw.json_data);
      if (parsed.profilePhotoUrl) return parsed.profilePhotoUrl;
    } catch {}
  }
  return undefined;
}

interface RawDataEntry {
  id: string;
  source: string;
  json_data: string;
  scraped_at: string;
}

interface PersonItem {
  id: string;
  name: string;
  linkedin_url: string;
  instagram_url: string;
  status: string;
  created_at: string;
  _count?: {
    rawData: number;
  };
  rawData?: RawDataEntry[];
  profile?: {
    id: string;
    summary: string;
    personality_traits?: string;
    hobbies?: string;
  } | null;
}

const MINIMUM_PEOPLE = 25;

const SAMPLE_PEOPLE = [
  {
    name: "Maya Lin",
    linkedin: "https://www.linkedin.com/in/mayalin-design",
    instagram: "https://www.instagram.com/maya_creates",
  },
  {
    name: "Alex Thorne",
    linkedin: "https://www.linkedin.com/in/alex-thorne-ai",
    instagram: "https://www.instagram.com/alex_thorne_outdoors",
  },
  {
    name: "Chloe Dupont",
    linkedin: "https://www.linkedin.com/in/chloedupont-product",
    instagram: "https://www.instagram.com/chloe_in_motion",
  },
  {
    name: "David Kim",
    linkedin: "https://www.linkedin.com/in/davidkim-founder",
    instagram: "https://www.instagram.com/davidkim_eats",
  },
  {
    name: "Elena Rostova",
    linkedin: "https://www.linkedin.com/in/elena-rostova-fintech",
    instagram: "https://www.instagram.com/elena_vibes",
  },
];

export default function PeoplePage() {
  const [people, setPeople] = useState<PersonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");
  const [viewMode, setViewMode] = useState<"table" | "gallery">("table");

  // Scraping & Analysis States
  const [scrapingAll, setScrapingAll] = useState(false);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [scrapingPersonId, setScrapingPersonId] = useState<string | null>(null);
  const [analyzingPersonId, setAnalyzingPersonId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [selectedPersonForPreview, setSelectedPersonForPreview] = useState<PersonItem | null>(null);

  // Single Person Form State
  const [name, setName] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Bulk Form State
  const [bulkText, setBulkText] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<{
    success?: string;
    error?: string;
    invalidLines?: Array<{ lineNumber: number; errors: string[] }>;
  } | null>(null);

  // Fetch people on mount
  useEffect(() => {
    fetchPeople();
  }, []);

  async function fetchPeople() {
    try {
      setLoading(true);
      const res = await fetch("/api/people");
      const json = await res.json();
      if (json.success) {
        setPeople(json.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch people:", err);
    } finally {
      setLoading(false);
    }
  }

  // Live client-side URL validation
  const linkedinValidation = linkedinUrl ? validateLinkedInUrl(linkedinUrl) : null;
  const instagramValidation = instagramUrl ? validateInstagramUrl(instagramUrl) : null;

  async function handleSingleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!name.trim()) {
      setFormError("Please enter the candidate's full name.");
      return;
    }

    if (!linkedinValidation?.valid) {
      setFormError(linkedinValidation?.error || "Invalid LinkedIn profile URL.");
      return;
    }

    if (!instagramValidation?.valid) {
      setFormError(instagramValidation?.error || "Invalid Instagram profile URL.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          linkedin_url: linkedinUrl.trim(),
          instagram_url: instagramUrl.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.error || "Failed to add person.");
      } else {
        setFormSuccess(`Added "${name.trim()}" successfully!`);
        setName("");
        setLinkedinUrl("");
        setInstagramUrl("");
        await fetchPeople();
      }
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBulkFeedback(null);

    if (!bulkText.trim()) {
      setBulkFeedback({ error: "Please enter at least one line of profile data." });
      return;
    }

    try {
      setBulkSubmitting(true);
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: bulkText }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setBulkFeedback({
          error: json.error || "Bulk intake failed.",
          invalidLines: json.details,
        });
      } else {
        setBulkFeedback({
          success: json.message,
          invalidLines: json.invalidLines,
        });
        setBulkText("");
        await fetchPeople();
      }
    } catch (err: any) {
      setBulkFeedback({ error: err.message || "Failed to process bulk data." });
    } finally {
      setBulkSubmitting(false);
    }
  }

  async function handleDeletePerson(id: string, personName: string) {
    if (!confirm(`Are you sure you want to delete ${personName}?`)) return;

    try {
      const res = await fetch(`/api/people/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setPeople((prev) => prev.filter((p) => p.id !== id));
      } else {
        alert(json.error || "Failed to delete person.");
      }
    } catch (err: any) {
      alert(err.message || "Delete error.");
    }
  }

  // Single Scrape Trigger
  async function handleScrapePerson(id: string, force = false) {
    try {
      setScrapingPersonId(id);
      setNotice(null);

      const res = await fetch(`/api/scrape/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });

      const json = await res.json();
      if (!json.success && json.error) {
        setNotice({ type: "error", text: json.error });
      }
      await fetchPeople();
    } catch (err: any) {
      setNotice({ type: "error", text: err.message || "Scraping failed." });
      await fetchPeople();
    } finally {
      setScrapingPersonId(null);
    }
  }

  // Batch Scrape Trigger
  async function handleScrapeAll() {
    try {
      setScrapingAll(true);
      setNotice(null);

      const res = await fetch("/api/scrape/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concurrency: 3, force: false }),
      });

      const json = await res.json();
      if (!json.success) {
        setNotice({ type: "error", text: json.error || "Batch scraping failed." });
      } else {
        setNotice({ type: "success", text: json.message });
      }
      await fetchPeople();
    } catch (err: any) {
      setNotice({ type: "error", text: err.message || "Batch scraping error." });
      await fetchPeople();
    } finally {
      setScrapingAll(false);
    }
  }

  // Single Analyze Trigger
  async function handleAnalyzePerson(id: string, force = true) {
    try {
      setAnalyzingPersonId(id);
      setNotice(null);

      const res = await fetch(`/api/analyze/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });

      const json = await res.json();
      if (!json.success && json.error) {
        setNotice({ type: "error", text: json.error });
      }
      await fetchPeople();
    } catch (err: any) {
      setNotice({ type: "error", text: err.message || "Analysis failed." });
      await fetchPeople();
    } finally {
      setAnalyzingPersonId(null);
    }
  }

  // Batch Analyze Trigger
  async function handleAnalyzeAll() {
    try {
      setAnalyzingAll(true);
      setNotice(null);

      const res = await fetch("/api/analyze/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: false }),
      });

      const json = await res.json();
      if (!json.success) {
        setNotice({ type: "error", text: json.error || "Batch analysis failed." });
      } else {
        setNotice({ type: "success", text: json.message });
      }
      await fetchPeople();
    } catch (err: any) {
      setNotice({ type: "error", text: err.message || "Batch analysis error." });
      await fetchPeople();
    } finally {
      setAnalyzingAll(false);
    }
  }

  // Open Scraped Data Preview Modal
  async function openPreview(personId: string) {
    try {
      const res = await fetch(`/api/people/${personId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSelectedPersonForPreview(json.data);
      }
    } catch (err) {
      console.error("Preview load error:", err);
    }
  }

  function loadSampleBulkData() {
    const sampleText = SAMPLE_PEOPLE.map(
      (p) => `${p.name}, ${p.linkedin}, ${p.instagram}`
    ).join("\n");
    setBulkText(sampleText);
  }

  const progressPercentage = Math.min(
    100,
    Math.round((people.length / MINIMUM_PEOPLE) * 100)
  );

  const pendingCount = people.filter((p) => p.status === "pending").length;
  const scrapedCount = people.filter((p) => p.status === "scraped").length;
  const analyzedCount = people.filter((p) => p.status === "analyzed").length;

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Top Banner & 25-Person Milestone Counter */}
      <div className="bg-gradient-to-r from-gray-900 via-[#131722] to-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-xs font-medium border border-rose-500/20">
              <Bot className="w-3.5 h-3.5" /> Phase 2, 3 &amp; 4: Intake, Scrape &amp; Agent Personas
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Candidate Pool &amp; AI Personas
            </h1>
            <p className="text-sm text-gray-400 max-w-xl">
              Public data extracted from LinkedIn and Instagram is synthesized by Gemini into
              high-fidelity dating personas with evidence citations.
            </p>
          </div>

          {/* 25-Person Counter Badge */}
          <div className="bg-gray-950/80 border border-gray-800 rounded-xl p-4 min-w-[280px] flex flex-col justify-center">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-gray-400 font-medium">Pool Capacity Target</span>
              <span className="font-bold text-rose-400">
                {people.length} of {MINIMUM_PEOPLE} minimum
              </span>
            </div>
            <div className="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-rose-500 to-pink-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="text-[11px] text-gray-500 mt-2 flex items-center justify-between">
              <span>{analyzedCount} analyzed &bull; {scrapedCount} scraped</span>
              {people.length >= MINIMUM_PEOPLE ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready for Dating
                </span>
              ) : (
                <span className="text-amber-400">
                  {MINIMUM_PEOPLE - people.length} more needed
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Global Notice Banner */}
      {notice && (
        <div
          className={`p-4 border rounded-xl text-xs flex items-start justify-between gap-3 ${
            notice.type === "error"
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          }`}
        >
          <div className="flex items-start gap-2">
            {notice.type === "error" ? (
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
            )}
            <div>
              <p className="font-semibold">{notice.type === "error" ? "Notice" : "Success"}</p>
              <p className="mt-0.5">{notice.text}</p>
            </div>
          </div>
          <button onClick={() => setNotice(null)} className="hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Intake Forms & Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#10131d] border border-gray-800 rounded-2xl p-6 shadow-lg">
            {/* Tab Selection */}
            <div className="flex border-b border-gray-800 mb-6">
              <button
                type="button"
                onClick={() => setActiveTab("single")}
                className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === "single"
                    ? "border-rose-500 text-rose-400"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <Plus className="w-4 h-4" /> Single Person
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("bulk")}
                className={`ml-6 pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === "bulk"
                    ? "border-rose-500 text-rose-400"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <Layers className="w-4 h-4" /> Bulk Paste (CSV)
              </button>
            </div>

            {/* Single Form */}
            {activeTab === "single" && (
              <form onSubmit={handleSingleSubmit} className="space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                    <span>{formError}</span>
                  </div>
                )}
                {formSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Candidate Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maya Lin"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                      <Linkedin className="w-3.5 h-3.5 text-blue-400" /> LinkedIn Profile
                    </label>
                    {linkedinValidation && (
                      <span
                        className={`text-[10px] font-medium ${
                          linkedinValidation.valid
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {linkedinValidation.valid ? "Valid Profile" : "Invalid"}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="https://www.linkedin.com/in/username"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-gray-900 border text-sm text-white placeholder-gray-500 focus:outline-none transition-colors ${
                      linkedinValidation?.valid === false
                        ? "border-rose-500/80 focus:border-rose-500"
                        : "border-gray-800 focus:border-rose-500"
                    }`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                      <Instagram className="w-3.5 h-3.5 text-pink-400" /> Instagram Profile
                    </label>
                    {instagramValidation && (
                      <span
                        className={`text-[10px] font-medium ${
                          instagramValidation.valid
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {instagramValidation.valid ? "Valid Profile" : "Invalid"}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="https://www.instagram.com/username"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-gray-900 border text-sm text-white placeholder-gray-500 focus:outline-none transition-colors ${
                      instagramValidation?.valid === false
                        ? "border-rose-500/80 focus:border-rose-500"
                        : "border-gray-800 focus:border-rose-500"
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold text-sm shadow-md shadow-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>{submitting ? "Adding..." : "Add Person to Pool"}</span>
                </button>
              </form>
            )}

            {/* Bulk Form */}
            {activeTab === "bulk" && (
              <form onSubmit={handleBulkSubmit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    Format: <code className="text-rose-300">Name, LinkedInURL, InstagramURL</code>
                  </span>
                  <button
                    type="button"
                    onClick={loadSampleBulkData}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium"
                  >
                    <Sparkles className="w-3 h-3" /> Load 5 Sample Rows
                  </button>
                </div>

                {bulkFeedback?.error && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                      <span>{bulkFeedback.error}</span>
                    </div>
                  </div>
                )}

                {bulkFeedback?.success && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
                    <span>{bulkFeedback.success}</span>
                  </div>
                )}

                <textarea
                  rows={8}
                  placeholder={`Maya Lin, https://www.linkedin.com/in/mayalin-design, https://www.instagram.com/maya_creates\nAlex Thorne, https://www.linkedin.com/in/alex-thorne-ai, https://www.instagram.com/alex_thorne_outdoors`}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
                />

                <button
                  type="submit"
                  disabled={bulkSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold text-sm shadow-md shadow-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                >
                  {bulkSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Layers className="w-4 h-4" />
                  )}
                  <span>{bulkSubmitting ? "Importing..." : "Process Bulk Import"}</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Directory Column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#10131d] border border-gray-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between min-h-[460px]">
            <div>
              {/* Header with View Toggle and Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-rose-400" />
                  <h2 className="text-lg font-bold text-white">Candidates ({people.length})</h2>
                </div>

                <div className="flex items-center gap-2">
                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-gray-950 p-1 rounded-xl border border-gray-800">
                    <button
                      onClick={() => setViewMode("table")}
                      className={`p-1.5 rounded-lg text-xs transition-colors ${
                        viewMode === "table"
                          ? "bg-rose-500 text-white"
                          : "text-gray-400 hover:text-white"
                      }`}
                      title="Table View"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode("gallery")}
                      className={`p-1.5 rounded-lg text-xs transition-colors ${
                        viewMode === "gallery"
                          ? "bg-rose-500 text-white"
                          : "text-gray-400 hover:text-white"
                      }`}
                      title="Gallery Cards View"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Scrape All Button */}
                  {people.length > 0 && (
                    <button
                      onClick={handleScrapeAll}
                      disabled={scrapingAll || analyzingAll}
                      className="px-3 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 transition-all"
                    >
                      {scrapingAll ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-pink-400" />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-pink-400" />
                      )}
                      <span>{scrapingAll ? "Scraping..." : "Scrape All"}</span>
                    </button>
                  )}

                  {/* Analyze All Button */}
                  {people.length > 0 && (
                    <button
                      onClick={handleAnalyzeAll}
                      disabled={analyzingAll || scrapingAll}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-semibold shadow-md shadow-rose-500/20 disabled:opacity-50 flex items-center gap-1.5 transition-all"
                    >
                      {analyzingAll ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>{analyzingAll ? "Analyzing All..." : "Analyze All"}</span>
                    </button>
                  )}

                  <button
                    onClick={fetchPeople}
                    disabled={loading}
                    className="p-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors border border-gray-800"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="py-20 text-center text-gray-500 text-sm flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
                  <span>Loading candidate list...</span>
                </div>
              ) : people.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-gray-800 rounded-xl px-4">
                  <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-300 text-sm">No candidates added yet</h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                    Add candidates to build AI dating personas.
                  </p>
                </div>
              ) : viewMode === "table" ? (
                /* Table View */
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead className="text-[11px] text-gray-400 uppercase bg-gray-950/60 border-b border-gray-800">
                      <tr>
                        <th className="px-3 py-3 rounded-l-lg">Candidate</th>
                        <th className="px-3 py-3">Profiles</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="px-3 py-3 text-right rounded-r-lg">AI Pipeline &amp; Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60">
                      {people.map((person) => {
                        const isScraping = scrapingPersonId === person.id;
                        const isAnalyzing = analyzingPersonId === person.id;

                        return (
                          <tr key={person.id} className="hover:bg-gray-900/40 transition-colors group">
                            {/* Candidate Name */}
                            <td className="px-3 py-3.5 font-medium text-white flex items-center gap-2.5">
                              <Link
                                href={`/people/${person.id}`}
                                className="flex items-center gap-2.5 hover:text-rose-300 transition-colors"
                              >
                                <Avatar name={person.name} photoUrl={getPersonPhoto(person)} size="sm" />
                                <div className="truncate max-w-[120px] sm:max-w-[150px]">
                                  {person.name}
                                </div>
                              </Link>
                            </td>

                            {/* Social Profiles */}
                            <td className="px-3 py-3.5">
                              <div className="flex items-center gap-2">
                                <a
                                  href={person.linkedin_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                                  title={person.linkedin_url}
                                >
                                  <Linkedin className="w-3.5 h-3.5" />
                                </a>
                                <a
                                  href={person.instagram_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 rounded bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 transition-colors"
                                  title={person.instagram_url}
                                >
                                  <Instagram className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-3 py-3.5">
                              {person.status === "pending" && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  pending
                                </span>
                              )}
                              {person.status === "scraping" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  <RefreshCw className="w-2.5 h-2.5 animate-spin" /> scraping
                                </span>
                              )}
                              {person.status === "scraped" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  <Check className="w-2.5 h-2.5" /> scraped
                                </span>
                              )}
                              {person.status === "analyzing" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                  <RefreshCw className="w-2.5 h-2.5 animate-spin" /> analyzing
                                </span>
                              )}
                              {person.status === "analyzed" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  <Sparkles className="w-2.5 h-2.5" /> persona ready
                                </span>
                              )}
                              {person.status === "instagram_private" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                  <Lock className="w-2.5 h-2.5" /> private IG
                                </span>
                              )}
                              {person.status === "failed" && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                  failed
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-3 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Scrape / Re-scrape */}
                                <button
                                  onClick={() => handleScrapePerson(person.id, person.status !== "pending")}
                                  disabled={isScraping || isAnalyzing || scrapingAll}
                                  className="px-2 py-1 rounded-lg text-[11px] font-medium bg-gray-900 border border-gray-800 hover:bg-gray-800 text-gray-300 transition-colors"
                                  title="Scrape data"
                                >
                                  {isScraping ? (
                                    <RefreshCw className="w-3 h-3 animate-spin text-pink-400" />
                                  ) : (
                                    <span>{person.status === "pending" ? "Scrape" : "Re-scrape"}</span>
                                  )}
                                </button>

                                {/* Analyze / Re-analyze */}
                                <button
                                  onClick={() => handleAnalyzePerson(person.id, true)}
                                  disabled={isAnalyzing || isScraping || person.status === "pending"}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors flex items-center gap-1 ${
                                    person.status === "analyzed"
                                      ? "bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                                      : "bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20 disabled:opacity-40"
                                  }`}
                                  title="Run Gemini Persona Analysis"
                                >
                                  {isAnalyzing ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-3 h-3" />
                                  )}
                                  <span>{person.status === "analyzed" ? "Re-analyze" : "Analyze"}</span>
                                </button>

                                {/* View Profile */}
                                <Link
                                  href={`/people/${person.id}`}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                                  title="View Full AI Persona Profile"
                                >
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </Link>

                                {/* Delete */}
                                <button
                                  onClick={() => handleDeletePerson(person.id, person.name)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                  title="Delete candidate"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Gallery / Cards View */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {people.map((person) => {
                    return (
                      <div
                        key={person.id}
                        className="bg-gray-950 p-5 rounded-2xl border border-gray-800 hover:border-gray-700 transition-all flex flex-col justify-between space-y-4 group"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar name={person.name} photoUrl={getPersonPhoto(person)} size="md" />
                              <div>
                                <h3 className="font-bold text-white text-sm group-hover:text-rose-300 transition-colors">
                                  {person.name}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <a
                                    href={person.linkedin_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-400 hover:text-blue-300"
                                  >
                                    <Linkedin className="w-3 h-3" />
                                  </a>
                                  <a
                                    href={person.instagram_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-pink-400 hover:text-pink-300"
                                  >
                                    <Instagram className="w-3 h-3" />
                                  </a>
                                </div>
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                person.status === "analyzed"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : person.status === "scraped"
                                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              }`}
                            >
                              {person.status}
                            </span>
                          </div>

                          {person.profile?.summary ? (
                            <p className="text-xs text-gray-300 line-clamp-3 leading-relaxed">
                              {person.profile.summary}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500 italic">
                              AI persona not yet generated.
                            </p>
                          )}
                        </div>

                        <div className="pt-3 border-t border-gray-900 flex items-center justify-between">
                          <button
                            onClick={() => handleAnalyzePerson(person.id, true)}
                            className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>{person.status === "analyzed" ? "Re-Analyze" : "Analyze"}</span>
                          </button>
                          <Link
                            href={`/people/${person.id}`}
                            className="text-xs text-gray-400 hover:text-white flex items-center gap-1 font-medium"
                          >
                            <span>View Persona</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Info Banner */}
            {people.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-rose-400" />
                  Profiles analyzed with Gemini Flash and saved in <code className="text-rose-300">profiles</code>.
                </span>
                <span className="text-[11px] text-gray-500">
                  Ready for Phase 5 (Speed Dating Engine)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scraped Data Preview Modal */}
      {selectedPersonForPreview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#10131d] border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-rose-400" />
                <h3 className="font-bold text-sm text-white">
                  Scraped Raw Data: {selectedPersonForPreview.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPersonForPreview(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {selectedPersonForPreview.rawData && selectedPersonForPreview.rawData.length > 0 ? (
                selectedPersonForPreview.rawData.map((entry) => {
                  let parsed: any = {};
                  try {
                    parsed = JSON.parse(entry.json_data);
                  } catch {
                    parsed = entry.json_data;
                  }

                  return (
                    <div
                      key={entry.id}
                      className="bg-gray-950 p-4 rounded-xl border border-gray-800/80 space-y-2"
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="capitalize text-rose-300 flex items-center gap-1.5">
                          {entry.source === "linkedin" ? (
                            <Linkedin className="w-3.5 h-3.5 text-blue-400" />
                          ) : (
                            <Instagram className="w-3.5 h-3.5 text-pink-400" />
                          )}
                          {entry.source} Payload
                        </span>
                        <span className="text-[10px] text-gray-500 font-normal">
                          Scraped {new Date(entry.scraped_at).toLocaleTimeString()}
                        </span>
                      </div>

                      {entry.source === "linkedin" && (
                        <div className="space-y-1.5 text-gray-300">
                          <p><strong className="text-white">Headline:</strong> {parsed.headline || "N/A"}</p>
                          <p><strong className="text-white">Location:</strong> {parsed.location || "N/A"}</p>
                          <p><strong className="text-white">Current Role:</strong> {parsed.currentRole || "N/A"}</p>
                        </div>
                      )}

                      {entry.source === "instagram" && (
                        <div className="space-y-1.5 text-gray-300">
                          <p><strong className="text-white">Bio:</strong> {parsed.bio || "N/A"}</p>
                          <p><strong className="text-white">Followers:</strong> {parsed.followerCount}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500">No raw data entries found.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
