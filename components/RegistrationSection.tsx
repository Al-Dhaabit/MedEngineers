"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { CustomApplicationForm } from "./CustomApplicationForm";
import { db } from "@/lib/Firebase";
import { doc, onSnapshot } from "firebase/firestore";

type UserStatus = "guest" | "pending" | "approved" | "rejected" | "domain_ai";

// Domain recommendation types
interface DomainScore {
  domain: "A" | "B" | "C";
  name: string;
  score: number;
  percentage: number;
}

interface DomainRecommendation {
  recommended: DomainScore;
  allScores: DomainScore[];
  confidence: "high" | "medium" | "low";
  reasoning: string;
}

interface SubmissionResult {
  name: string;
  email: string;
  major: string;
  recommendation: DomainRecommendation | null;
  rawResponses?: Record<string, any>;
}

export function RegistrationSection() {
  const { data: session } = useSession();
  const [status, setStatus] = useState<UserStatus>("guest");

  // Domain AI state
  const [domainLoading, setDomainLoading] = useState(false);
  const [domainResults, setDomainResults] = useState<SubmissionResult[]>([]);
  const [domainError, setDomainError] = useState<string | null>(null);

  // Real-time status sync from Firestore
  useEffect(() => {
    if (!session?.user?.email) {
      setStatus("guest");
      return;
    }

    // Since we don't know if the user is a competitor or attendee here, 
    // we listen to both potential locations. The submission logic uses UID as doc ID.
    const uid = (session as any).user?.id || (session as any).uid;

    if (!uid) return;

    // Listen to Competitors
    const unsubCompetitor = onSnapshot(doc(db, "competitors", uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.status) setStatus(data.status as UserStatus);
      }
    });

    // Listen to Attendees
    const unsubAttendee = onSnapshot(doc(db, "attendees", uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.status) setStatus(data.status as UserStatus);
      }
    });

    return () => {
      unsubCompetitor();
      unsubAttendee();
    };
  }, [session]);

  // Fetch data when switching to domain_ai view
  useEffect(() => {
    if (status === "domain_ai") {
      fetchDomainRecommendations();
    }
  }, [status]);

  // Fetch data with LocalStorage caching
  const fetchDomainRecommendations = async (background = false) => {
    if (!background) setDomainLoading(true);
    setDomainError(null);

    // 1. Try to load from LocalStorage first (instant result)
    if (!background) {
      try {
        const cached = localStorage.getItem("medhack_domain_data");
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          // If valid data exists, show it immediately
          if (data && Array.isArray(data.submissions)) {
            setDomainResults(data.submissions);
            setDomainLoading(false); // Stop loading spinner if we have data
            console.log("Loaded from LocalStorage cache");
          }
        }
      } catch (e) {
        console.warn("Failed to load from cache", e);
      }
    }

    // 2. Fetch fresh data from API (always runs to get updates)
    try {
      const res = await fetch("/api/domain-suggest");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch");
      }
      const data = await res.json();

      // Update UI with fresh data
      setDomainResults(data.submissions || []);

      // Update LocalStorage
      localStorage.setItem("medhack_domain_data", JSON.stringify({
        data,
        timestamp: Date.now()
      }));

    } catch (err) {
      // Only show error if we have NO data at all
      if (domainResults.length === 0) {
        setDomainError(err instanceof Error ? err.message : "Failed to load");
      } else {
        console.error("Background refresh failed:", err);
      }
    } finally {
      setDomainLoading(false);
    }
  };

  const getDomainColor = (domain: string) => {
    switch (domain) {
      case "A": return { bg: "#e9456015", border: "#e94560", text: "#e94560", gradient: "from-red-500 to-pink-600" };
      case "B": return { bg: "#00d9ff15", border: "#00d9ff", text: "#00d9ff", gradient: "from-cyan-500 to-blue-600" };
      case "C": return { bg: "#a855f715", border: "#a855f7", text: "#a855f7", gradient: "from-purple-500 to-violet-600" };
      default: return { bg: "#88888815", border: "#888", text: "#888", gradient: "from-gray-500 to-gray-600" };
    }
  };

  const getDomainIcon = (domain: string) => {
    switch (domain) {
      case "A": return "🔧";
      case "B": return "📊";
      case "C": return "🤖";
      default: return "❓";
    }
  };

  const getDomainName = (domain: string) => {
    switch (domain) {
      case "A": return "Medical Tools & Hardware";
      case "B": return "Clinical Systems & Operations";
      case "C": return "Digital Health & AI";
      default: return "Unknown";
    }
  };

  return (
    <section id="registration" className="py-24 bg-white dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">

        {/* DEV ONLY: State Toggles to visualize the flow */}
        <div className="mb-12 flex flex-wrap justify-center gap-4 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-fit mx-auto">
          <span className="text-xs font-mono uppercase text-zinc-500 self-center">Dev Preview:</span>
          {(["guest", "pending", "approved", "rejected"] as UserStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors ${status === s
                ? "bg-[#007b8a] text-white"
                : "bg-white dark:bg-black text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                }`}
            >
              {s}
            </button>
          ))}

          {/* Divider */}
          <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700 self-center mx-2" />

          {/* Domain AI Button */}
          <button
            onClick={() => setStatus("domain_ai")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${status === "domain_ai"
              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
              : "bg-gradient-to-r from-purple-600 to-pink-600 text-white opacity-70 hover:opacity-100"
              }`}
          >
            <span>🧠</span> Domain AI
          </button>
        </div>

        {/* 4. DOMAIN AI VIEW: Mock Admin Dashboard */}
        {status === "domain_ai" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 mb-4">
                <span className="text-xl">🧠</span>
                <span className="text-sm font-medium text-purple-400">Admin Preview</span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-4">
                Domain AI Recommendations
              </h2>
              <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                AI-powered analysis of engineering applicants to suggest their best-fit hackathon domain
              </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
                <div className="text-3xl font-bold text-white">{domainResults.length}</div>
                <div className="text-sm text-zinc-500">Total Submissions</div>
              </div>
              <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
                <div className="text-3xl font-bold text-white">
                  {domainResults.filter(r => r.recommendation).length}
                </div>
                <div className="text-sm text-zinc-500">Engineers Analyzed</div>
              </div>
              <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
                <div className="text-3xl font-bold text-[#e94560]">
                  {domainResults.filter(r => r.recommendation?.recommended.domain === "A").length}
                </div>
                <div className="text-sm text-zinc-500">🔧 Domain A</div>
              </div>
              <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
                <div className="text-3xl font-bold text-[#00d9ff]">
                  {domainResults.filter(r => r.recommendation?.recommended.domain === "B").length}
                </div>
                <div className="text-sm text-zinc-500">📊 Domain B</div>
              </div>
              <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
                <div className="text-3xl font-bold text-[#a855f7]">
                  {domainResults.filter(r => r.recommendation?.recommended.domain === "C").length}
                </div>
                <div className="text-sm text-zinc-500">🤖 Domain C</div>
              </div>
            </div>

            {/* Legend */}
            <div className="mb-8 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 flex flex-wrap justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#e94560]" />
                <span className="text-sm text-zinc-300">A: Medical Tools & Hardware</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#00d9ff]" />
                <span className="text-sm text-zinc-300">B: Clinical Systems & Operations</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#a855f7]" />
                <span className="text-sm text-zinc-300">C: Digital Health & AI</span>
              </div>
            </div>

            {/* Loading State */}
            {domainLoading && (
              <div className="text-center py-20">
                <div className="animate-spin w-12 h-12 border-3 border-purple-500 border-t-transparent rounded-full mx-auto mb-6" />
                <p className="text-zinc-400 text-lg">Analyzing submissions with AI...</p>
              </div>
            )}

            {/* Error State */}
            {domainError && (
              <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-6 text-center">
                <span className="text-4xl mb-4 block">⚠️</span>
                <p className="text-red-400 text-lg">{domainError}</p>
                <button
                  onClick={() => fetchDomainRecommendations(false)}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty State */}
            {!domainLoading && !domainError && domainResults.filter(r => r.recommendation).length === 0 && (
              <div className="text-center py-20 bg-zinc-900/50 rounded-xl border border-zinc-800">
                <span className="text-6xl mb-4 block">📭</span>
                <p className="text-zinc-400 text-lg">No engineering submissions found</p>
                <p className="text-zinc-500 text-sm mt-2">Submit an application as an Engineer to see recommendations</p>
              </div>
            )}

            {/* Results Grid */}
            {!domainLoading && !domainError && domainResults.filter(r => r.recommendation).length > 0 && (
              <div className="space-y-4">
                {domainResults.filter(r => r.recommendation).map((result, idx) => {
                  const rec = result.recommendation!;
                  const colors = getDomainColor(rec.recommended.domain);

                  return (
                    <div
                      key={idx}
                      className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-colors"
                    >
                      {/* Card Header with gradient */}
                      <div
                        className="p-6"
                        style={{ background: `linear-gradient(135deg, ${colors.bg}, transparent)` }}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          {/* Applicant Info */}
                          <div className="flex items-center gap-4">
                            <div
                              className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                              style={{ backgroundColor: colors.bg, border: `2px solid ${colors.border}` }}
                            >
                              {getDomainIcon(rec.recommended.domain)}
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-white">
                                {result.name || "Unknown Applicant"}
                              </h3>
                              <p className="text-zinc-400 text-sm">{result.email}</p>
                            </div>
                          </div>

                          {/* Recommendation Badge */}
                          <div
                            className={`px-5 py-3 rounded-xl bg-gradient-to-r ${colors.gradient} text-white font-bold text-center`}
                          >
                            <div className="text-2xl">Domain {rec.recommended.domain}</div>
                            <div className="text-sm opacity-80">{rec.recommended.percentage}% Match</div>
                          </div>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-6 border-t border-zinc-800">
                        {/* Domain Name */}
                        <div className="mb-4">
                          <span className="text-xs uppercase tracking-wider text-zinc-500">Recommended Track</span>
                          <p className="text-lg text-white font-medium" style={{ color: colors.text }}>
                            {getDomainName(rec.recommended.domain)}
                          </p>
                        </div>

                        {/* Confidence */}
                        <div className="mb-6 flex items-center gap-2">
                          <span className="text-xs uppercase tracking-wider text-zinc-500">Confidence:</span>
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${rec.confidence === "high" ? "bg-green-500/20 text-green-400" :
                            rec.confidence === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                              "bg-red-500/20 text-red-400"
                            }`}>
                            {rec.confidence}
                          </span>
                        </div>

                        {/* Score Breakdown */}
                        <div className="grid grid-cols-3 gap-4">
                          {rec.allScores.map((score) => {
                            const scoreColors = getDomainColor(score.domain);
                            const isRecommended = score.domain === rec.recommended.domain;

                            return (
                              <div
                                key={score.domain}
                                className={`p-4 rounded-xl border-2 transition-all ${isRecommended ? "border-opacity-100" : "border-opacity-30"
                                  }`}
                                style={{
                                  borderColor: scoreColors.border,
                                  backgroundColor: isRecommended ? scoreColors.bg : "transparent"
                                }}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-lg">{getDomainIcon(score.domain)}</span>
                                  <span className="text-sm font-medium text-zinc-300">Domain {score.domain}</span>
                                </div>
                                {/* Progress bar */}
                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${score.percentage}%`,
                                      backgroundColor: scoreColors.text
                                    }}
                                  />
                                </div>
                                <div className="text-right">
                                  <span
                                    className="text-xl font-bold"
                                    style={{ color: scoreColors.text }}
                                  >
                                    {score.percentage}%
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Reasoning */}
                        {rec.reasoning && (
                          <div className="mt-6 p-4 bg-zinc-800/50 rounded-lg">
                            <span className="text-xs uppercase tracking-wider text-zinc-500 block mb-2">AI Analysis</span>
                            <p className="text-zinc-300 text-sm leading-relaxed">
                              {rec.reasoning.replace(/\*\*/g, "")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Refresh Button */}
            <div className="mt-8 text-center">
              <button
                onClick={() => fetchDomainRecommendations(false)}
                disabled={domainLoading}
                className="px-6 py-3 bg-zinc-800 text-white rounded-lg font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
              >
                {domainLoading ? "Refreshing..." : "🔄 Refresh Data"}
              </button>
            </div>
          </div>
        )}

        {/* 1. GUEST VIEW: Google Form & Application */}
        {status === "guest" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-4xl sm:text-6xl font-black tracking-[-0.05em] uppercase text-[#007b8a] mb-4">
                Registration
              </h2>
              <p className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
                Apply for MedHack 2026
              </p>
              <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
                Fill out the form below and submit your application to join the next generation of medical engineers.
              </p>
            </div>

            <div className="mx-auto max-w-4xl">
              {/* Custom Styled Form with built-in submit */}
              <CustomApplicationForm onSubmitSuccess={() => setStatus("pending")} />
            </div>
          </div>
        )}

        {/* 2. PENDING VIEW: Status Dashboard */}
        {status === "pending" && (
          <div className="mx-auto max-w-2xl text-center py-16 animate-in zoom-in-95 duration-500">
            <div className="mb-6 flex justify-center">
              <div className="h-20 w-20 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-yellow-600 dark:text-yellow-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.05em] uppercase text-yellow-600 mb-4">
              Reviewing
            </h2>
            <p className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Application Under Review
            </p>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-300">
              Thanks for applying! Our team is reviewing your eligibility. We will notify you via email once a decision has been made.
            </p>
            <div className="mt-8 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 inline-block text-left text-sm text-zinc-500">
              <p><strong>Status:</strong> <span className="text-yellow-600 dark:text-yellow-500 font-semibold">Pending Review</span></p>
              <p suppressHydrationWarning><strong>Applied:</strong> {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        )}

        {/* 3. REJECTED VIEW: Status Dashboard */}
        {status === "rejected" && (
          <div className="mx-auto max-w-2xl text-center py-16 animate-in zoom-in-95 duration-500">
            <div className="mb-6 flex justify-center">
              <div className="h-20 w-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-red-600 dark:text-red-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.05em] uppercase text-red-600 mb-4">
              Update
            </h2>
            <p className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Application Not Approved
            </p>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-300">
              We appreciate your interest in MedHack 2026. Unfortunately, we are unable to approve your application at this time due to high demand and limited capacity.
            </p>
          </div>
        )}

        {/* 4. APPROVED VIEW: Ticket Tailor Widget */}
        {status === "approved" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <div className="mb-6 flex justify-center">
                <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-green-600 dark:text-green-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-4xl sm:text-6xl font-black tracking-[-0.05em] uppercase text-[#007b8a] mb-4">
                You're In!
              </h2>
              <p className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
                Congratulations!
              </p>
              <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
                Your application has been approved. Secure your ticket below to confirm your spot.
              </p>
            </div>

            <div className="mx-auto max-w-4xl bg-white dark:bg-zinc-900 rounded-3xl shadow-xl ring-1 ring-zinc-200 dark:ring-zinc-800 overflow-hidden">
              <div className="bg-[#007b8a] px-6 py-4">
                <h3 className="text-white font-semibold">Official Ticket Counter</h3>
              </div>
              <div className="p-4 sm:p-10 text-center">
                {/* Ticket Tailor Widget Container */}
                <div className="tt-widget">
                  <div className="tt-widget-fallback">
                    <p className="text-zinc-500 dark:text-zinc-400 italic mb-4">Loading tickets...</p>
                    <a
                      href="https://www.tickettailor.com/all-tickets/medengineers/?ref=website_widget"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#007b8a] text-white rounded-md font-semibold hover:opacity-90"
                      target="_blank"
                    >
                      View Tickets on Ticket Tailor
                    </a>
                  </div>
                  <script
                    src="https://cdn.tickettailor.com/js/widgets/min/widget.js"
                    data-url="https://www.tickettailor.com/all-tickets/medengineers/?ref=website_widget"
                    data-type="inline"
                    data-inline-id="tt-widget"
                    data-checkout-modal="true"
                    data-bg-fill="true"
                    data-inherit-ref-from-url-param=""
                    data-ref="website_widget"
                  ></script>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
