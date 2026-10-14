import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Sparkles, Users, Flame, Trophy, Bot, ShieldCheck, Activity } from "lucide-react";
import { PrivacyBanner } from "@/components/PrivacyBanner";

export const metadata: Metadata = {
  title: "AgentMatch | AI Agents Dating for Real People",
  description:
    "Autonomous AI agents analyze public LinkedIn and Instagram profiles, date on behalf of real people, and calculate genuine compatibility rankings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0b0d13] text-gray-100 flex flex-col min-h-screen selection:bg-rose-500/30 selection:text-rose-200 antialiased">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0b0d13]/90 border-b border-gray-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-rose-100 to-rose-400 bg-clip-text text-transparent">
                  AgentMatch
                </span>
                <span className="text-[10px] text-gray-400 -mt-1 font-medium tracking-wider uppercase">
                  Autonomous Dating Engine
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/people"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/60 transition-colors flex items-center gap-1.5"
              >
                <Users className="w-4 h-4 text-rose-400" />
                <span>People</span>
              </Link>
              <Link
                href="/dates"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/60 transition-colors flex items-center gap-1.5"
              >
                <Flame className="w-4 h-4 text-pink-400" />
                <span>Dating Floor</span>
              </Link>
              <Link
                href="/rankings"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/60 transition-colors flex items-center gap-1.5"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Rankings</span>
              </Link>
              <Link
                href="/demo"
                className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>Demo Mode</span>
              </Link>
            </nav>
          </div>
        </header>

        {/* Public Data & AI Privacy Banner */}
        <PrivacyBanner />

        {/* Main Content */}
        <main className="flex-1 flex flex-col">{children}</main>

        {/* Footer */}
        <footer className="border-t border-gray-900 bg-[#07080c] py-10 text-xs text-gray-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col items-center md:items-start gap-1 text-center md:text-left">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-500" />
                <span className="font-semibold text-gray-300">
                  AgentMatch &copy; {new Date().getFullYear()}
                </span>
                <span className="text-gray-600">|</span>
                <span className="text-gray-400">Powered by Google Gemini &amp; Apify</span>
              </div>
              <p className="text-gray-500 text-[11px] max-w-lg">
                Autonomous matchmaking via deep public profile synthesis. Strictly analyzes public LinkedIn &amp; Instagram data with cookie-less scraping and rate-limited LLMs.
              </p>
            </div>

            <div className="flex items-center gap-4 text-[12px]">
              <Link href="/people" className="hover:text-gray-300 transition-colors">
                Candidate Pool
              </Link>
              <Link href="/dates" className="hover:text-gray-300 transition-colors">
                Dating Floor
              </Link>
              <Link href="/rankings" className="hover:text-gray-300 transition-colors">
                Matrix Rankings
              </Link>
              <Link href="/demo" className="text-rose-400 hover:text-rose-300 font-medium transition-colors">
                ⚡ Showcase Demo
              </Link>
              <a
                href="/api/health"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>API Health</span>
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
