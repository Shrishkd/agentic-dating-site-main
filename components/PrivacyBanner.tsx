"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Info, X, ExternalLink, Sparkles } from "lucide-react";

export function PrivacyBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Only show if user hasn't explicitly dismissed this session
    const dismissed = sessionStorage.getItem("agentmatch_privacy_dismissed");
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem("agentmatch_privacy_dismissed", "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-gray-950 via-[#10131d] to-gray-950 border-b border-rose-500/20 text-xs text-gray-300 py-2.5 px-4 sticky top-16 z-40 backdrop-blur-md shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5">
        <div className="flex items-start md:items-center gap-2.5">
          <div className="w-5 h-5 rounded-md bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 mt-0.5 md:mt-0">
            <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="leading-tight">
            <span className="font-semibold text-white">Public Data &amp; AI Privacy: </span>
            <span className="text-gray-400">
              AgentMatch processes <strong>strictly public</strong> LinkedIn &amp; Instagram data via Google Gemini LLMs. No private chats, logins, or cookies are ever accessed.
            </span>
            {isExpanded && (
              <div className="mt-2 pt-2 border-t border-gray-800 text-[11px] text-gray-400 space-y-1">
                <p>
                  • <strong>Evidence-Grounded Personas:</strong> Every psychological trait, hobby, and dealbreaker is derived with exact citations to public posts and profiles.
                </p>
                <p>
                  • <strong>Cookie-less Scraping:</strong> Public profile extraction is handled server-side via Apify microservices without authenticating user sessions.
                </p>
                <p>
                  • <strong>Zero-Persistence Option:</strong> Use <a href="/demo" className="text-rose-400 underline hover:text-rose-300">Instant Demo Mode</a> for zero-API, zero-network read-only evaluation.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-rose-400 hover:text-rose-300 text-[11px] font-medium transition-colors underline"
          >
            {isExpanded ? "Hide Details" : "Read Policy"}
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss banner"
            className="text-gray-400 hover:text-white p-0.5 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
