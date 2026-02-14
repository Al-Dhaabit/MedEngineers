"use client";

import { useState, useEffect, useRef } from "react";
import { CustomApplicationForm } from "./CustomApplicationForm";
import { onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { TicketTailorWidget } from "@/components/TicketTailorWidget";
import { auth } from "@/lib/Firebase";
import { Button } from "@/components/ui/button";

type UserStatus = "guest" | "pending" | "approved" | "domain_ai";

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
  // Mock state to demonstrate the flow. In a real app, this comes from the backend.
  const [status, setStatus] = useState<UserStatus>("guest");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [statusCheckMessage, setStatusCheckMessage] = useState<string>("");
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);


  // Check if user has submitted form or not using onAuthStateChange
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Send the UID to check against your collections
          const res = await fetch("/api/user-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid: user.uid }),
          });

          const data = await res.json();
          // If the API confirms submission, update the status based on actualStatus
          if (data.status === true) {
            // Use the actual status from the backend (pending, accepted, rejected)
            const actualStatus = data.actualStatus?.toLowerCase();
            if (actualStatus === "accepted") {
              setStatus("approved");
            } else if (actualStatus === "rejected") {
              setStatus("guest"); // Or you could add a "rejected" state
            } else {
              setStatus("pending");
            }

            // Store user and submission info in state
            setCurrentUser({
              ...user,
              hasSubmitted: true,
              submissionType: data.type,
              actualStatus: actualStatus
            });

          } else {
            setStatus("guest");
            setCurrentUser({
              ...user,
              hasSubmitted: false
            });

            // If we just checked status and no application was found, show helpful message
            if (hasCheckedStatus) {
              setStatusCheckMessage("No application found for this account. You may need to submit an application first, or check if you used a different Google account.");
            }
          }
        } catch (error) {
          console.error("Auth check failed", error);
          setCurrentUser(null);
        }
      } else {
        setStatus("guest");
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, [hasCheckedStatus]); // Added dependency

  // Handle manual status check
  const handleCheckStatus = async () => {
    setIsCheckingStatus(true);
    setStatusCheckMessage("");
    setHasCheckedStatus(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      // The onAuthStateChanged hook will handle the rest
    } catch (error: any) {
      console.error("Status check login failed", error);
      setStatusCheckMessage(error.message || "Failed to sign in");
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Add periodic status checking for pending users
  useEffect(() => {
    if (status === "pending" && currentUser?.hasSubmitted) {
      const interval = setInterval(async () => {
        try {
          const res = await fetch("/api/user-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid: currentUser.uid }),
          });

          const data = await res.json();
          if (data.status === true) {
            const actualStatus = data.actualStatus?.toLowerCase();
            if (actualStatus === "accepted") {
              setStatus("approved");
              setCurrentUser((prev: any) => prev ? { ...prev, actualStatus: "accepted" } : null);
              clearInterval(interval); // Stop checking once approved
            } else if (actualStatus === "rejected") {
              setStatus("guest");
              setCurrentUser((prev: any) => prev ? { ...prev, hasSubmitted: false, actualStatus: "rejected" } : null);
              clearInterval(interval); // Stop checking once rejected
            }
          }
        } catch (error) {
          console.error("Periodic status check failed", error);
        }
      }, 10000); // Check every 10 seconds

      return () => clearInterval(interval); // Cleanup on unmount or status change
    }
  }, [status, currentUser]);

  // Handle payment - now using Ticket Tailor widget
  const handlePayment = () => {
    // The actual payment handling is now done by the Ticket Tailor widget
    console.log('Payment handled by Ticket Tailor widget');
  };

  // Handle logout
  const handleLogout = () => {
    signOut(auth);
    setStatus("guest");
    setCurrentUser(null);
    setHasCheckedStatus(false);
    setStatusCheckMessage("");
  };

  // Domain AI state
  const [domainLoading, setDomainLoading] = useState(false);
  const [domainResults, setDomainResults] = useState<SubmissionResult[]>([]);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

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

  const handleCheckStatus = async () => {
    setIsCheckingStatus(true);
    setStatusCheckMessage(""); // Clear any previous messages
    setHasCheckedStatus(false); // Reset check status
    try {
      await signInWithGoogle();
      setHasCheckedStatus(true); // Mark that we performed a status check
      // The useEffect will handle the status check after sign-in
    } catch (error) {
      console.error("Error checking status:", error);
      setStatusCheckMessage("Failed to sign in. Please try again.");
    } finally {
      setIsCheckingStatus(false);
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

        {/* Global User Header & Logout */}
        {currentUser && (
          <div className="mb-8 flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#007b8a]/10 flex items-center justify-center text-[#007b8a]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#007b8a] uppercase tracking-wider">Signed in as</span>
                <span className="text-sm font-medium text-zinc-900 dark:text-white truncate max-w-[150px] sm:max-w-none">
                  {currentUser.displayName || currentUser.email}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="h-9 px-4 rounded-full border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-xs font-bold uppercase tracking-wider"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </Button>
          </div>
        )}

        {/* DEV ONLY: State Toggles to visualize the flow */}
        <div className="mb-12 flex flex-wrap justify-center gap-4 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-fit mx-auto">
          <span className="text-xs font-mono uppercase text-zinc-500 self-center">Dev Preview:</span>
          {(["guest", "pending", "approved"] as UserStatus[]).map((s) => (
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

            {/* Status Check Result Message */}
            {hasCheckedStatus && statusCheckMessage && (
              <div className="mx-auto max-w-4xl mb-8">
                <div className={`rounded-xl p-6 border ${statusCheckMessage.includes("No application")
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                  : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                  }`}>
                  <div className="text-center">
                    {statusCheckMessage.includes("No application") ? (
                      <>
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                          No Application Found
                        </h3>
                        <p className="text-blue-700 dark:text-blue-300 mb-4">
                          We couldn't find an application associated with your account. This could mean:
                        </p>
                        <ul className="text-left text-blue-700 dark:text-blue-300 space-y-2 mb-4">
                          <li>• You haven't submitted an application yet</li>
                          <li>• You used a different Google account to apply</li>
                          <li>• Your application is still being processed</li>
                        </ul>
                        <p className="text-blue-700 dark:text-blue-300 font-medium">
                          Please fill out the application form below to get started!
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                          Error
                        </h3>
                        <p className="text-red-700 dark:text-red-300">
                          {statusCheckMessage}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Status Check Section for Existing Applicants - Only show if not logged in */}
            {!currentUser && (
              <div className="mx-auto max-w-4xl mb-8">
                <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                      Already submitted your application?
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                      Sign in to check your application status and updates
                    </p>
                    <Button
                      variant="outline"
                      onClick={handleCheckStatus}
                      disabled={isCheckingStatus}
                      className="bg-white dark:bg-zinc-800 border-[#007b8a] text-[#007b8a] hover:bg-[#007b8a] hover:text-white"
                    >
                      {isCheckingStatus ? (
                        <>
                          <div className="w-4 h-4 border-2 border-[#007b8a] border-t-transparent rounded-full animate-spin mr-2" />
                          Checking Status...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                            <path
                              fill="#007b8a"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                          </svg>
                          Check Application Status
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Sign Out Section - Only show if logged in but no application */}
            {currentUser && !currentUser?.hasSubmitted && (
              <div className="mx-auto max-w-4xl mb-8">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      Ready to Apply?
                    </h3>
                    <p className="text-blue-700 dark:text-blue-300">
                      We couldn't find an application for this account. Please fill out the form below to get started.
                    </p>
                  </div>
                </div>
              </div>
            )}

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
            <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.05em] uppercase text-[#007b8a] mb-4">
              Reviewing
            </h2>
            <p className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Application Under Review
            </p>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-300">
              Thanks for applying! Our team is reviewing your eligibility. We will notify you via email once a decision has been made.
            </p>

            {/* User info and submission details */}
            {currentUser && (
              <div className="mt-8 space-y-4">
                <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 inline-block text-left text-sm text-zinc-500">
                  <p><strong>Applicant:</strong> {currentUser.displayName || currentUser.email}</p>
                  <p><strong>Application Type:</strong> {currentUser.submissionType === 'attendee' ? 'Attendee' : 'Competitor'}</p>
                  <p><strong>Status:</strong> <span className="text-yellow-600 dark:text-yellow-500 font-semibold">Pending Review</span></p>
                  <p suppressHydrationWarning><strong>Applied:</strong> {new Date().toLocaleDateString()}</p>
                </div>

                <div className="text-xs text-zinc-400 dark:text-zinc-500">
                  <p>This page automatically refreshes every 10 seconds to check for status updates.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. APPROVED VIEW: Ticket Tailor Widget */}
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
                Congratulations, {currentUser?.displayName || 'Applicant'}!
              </p>
              <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
                Your application has been approved. Secure your ticket below to confirm your spot.
              </p>

              {/* Application summary */}
              {currentUser && (
                <div className="mt-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 inline-block text-left text-sm">
                  <p className="text-green-800 dark:text-green-200">
                    <strong>Application Type:</strong> {currentUser.submissionType === 'attendee' ? 'Attendee' : 'Competitor'}
                  </p>
                </div>
              )}
            </div>

            <div className="mx-auto max-w-4xl bg-white rounded-3xl shadow-xl ring-1 ring-zinc-200 overflow-hidden">
              <div className="bg-[#007b8a] px-6 py-4 flex items-center justify-center">
                <h3 className="text-white font-semibold text-center m-0">Official Ticket Counter</h3>
              </div>
              <div className="p-6">
                <TicketTailorWidget />
              </div >
            </div >
          </div >
        )
        }

      </div >
    </section >
  );
}
