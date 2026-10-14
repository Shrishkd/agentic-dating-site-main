import React from "react";
import Link from "next/link";
import { Search, Home, Users, Sparkles } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#121622] border border-gray-800 rounded-3xl p-8 text-center shadow-2xl space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
          <Search className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold tracking-wider text-rose-400 uppercase">
            404 — Not Found
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Agent Profile or Date Missing
          </h2>
          <p className="text-sm text-gray-400">
            The candidate profile, date replay, or resource you are looking for does not exist in the active dating pool.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/people"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm shadow-lg shadow-rose-500/20"
          >
            <Users className="w-4 h-4" />
            <span>View Candidate Pool</span>
          </Link>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
        </div>

        <div className="pt-4 border-t border-gray-800/80">
          <Link
            href="/demo"
            className="text-xs text-rose-400 hover:text-rose-300 font-medium inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Explore pre-populated Demo Snapshot</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
