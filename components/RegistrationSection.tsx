"use client";

import { useState, useEffect, useRef } from "react";
import { CustomApplicationForm } from "./CustomApplicationForm";
import { onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { TicketTailorWidget } from "@/components/TicketTailorWidget";
import { auth } from "@/lib/Firebase";
import { Button } from "@/components/ui/button";
import { retrieveFormData, hasValidStoredData, clearStoredData } from "@/lib/secureStorage";

type UserStatus = "guest" | "pending" | "approved" | "rejected" | "loading" | "domain_ai" | "payment_success" | "final_phase" | "domain_selection";

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

  // Initialize with a dedicated 'loading' status to prevent Guest UI flicker
  const [status, setStatus] = useState<UserStatus>("loading");
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [statusCheckMessage, setStatusCheckMessage] = useState<string>("");
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);

  // State to track if user has already seen and dismissed the payment success screen
  const [paymentSuccessDismissed, setPaymentSuccessDismissed] = useState(false);

  // States for Domain Selection (Dev View)
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [isUpdatingDomain, setIsUpdatingDomain] = useState(false);
  const [isDomainConfirmed, setIsDomainConfirmed] = useState(false);

  // Function to check user status and route appropriately
  const checkUserStatus = async (user: any, retryCount = 0) => {
    if (!user) {
      setStatus("guest");
      setCurrentUser(null);
      return;
    }

    // Set loading immediately to prevent "Guest" UI flicker while fetching status
    setStatus("loading");

    try {
      setIsCheckingStatus(true);
      console.log(`Checking status for UID: ${user.uid} (Attempt ${retryCount + 1})`);

      // Get fresh ID token for authentication
      const idToken = await user.getIdToken();

      const res = await fetch("/api/user-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, idToken }),
      });

      const data = await res.json();
      console.log("Status API Response:", data);

      // If the API confirms submission (submitted: true)
      if (data.status === true) {
        const actualStatus = data.actualStatus?.toLowerCase();
        const isEngineer = data.major === "Engineering";
        const isPaid = data.isPaid === true;

        clearStoredData();

        // Determine UI Status based on User Type and Payment Status
        if (isPaid) {
          if (paymentSuccessDismissed || localStorage.getItem("medhack_payment_confirmed") === "true") {
            // If already paid and dismissed, go to next phase
            // Only Medicine/Healthcare gets domain_selection
            const needsDomain = data.major === "Medicine" || data.major === "Healthcare";
            setStatus(needsDomain ? "domain_selection" : "final_phase");
          } else {
            setStatus("payment_success");
          }
        } else {
          // Not paid yet
          if (isEngineer) {
            // Engineers skip pending and go straight to payment widget (approved status)
            setStatus("approved");
          } else {
            // Healthcare (Medicine) follows the normal flow: Pending -> Approved -> Widget
            if (actualStatus === "accepted") {
              setStatus("approved");
            } else if (actualStatus === "rejected") {
              setStatus("rejected");
            } else {
              setStatus("pending");
            }
          }
        }

        // Store user and submission info in state
        setCurrentUser({
          ...user,
          hasSubmitted: true,
          submissionType: data.type,
          actualStatus: actualStatus,
          isPaid: isPaid,
          major: data.major
        });

      } else {
        // No application in DB yet
        if (retryCount < 3) {
          console.log(`No application found yet, retrying in 1.5s... (${retryCount + 1}/3)`);
          setTimeout(() => checkUserStatus(user, retryCount + 1), 1500);
          return;
        }

        console.warn("No application found in DB after retries.");
        clearStoredData();
        setStatus("guest");
        setCurrentUser({
          ...user,
          hasSubmitted: false
        });

        // If we just manually checked and no app found
        if (hasCheckedStatus) {
          setStatusCheckMessage("No application found for this account.");
        }
      }
    } catch (error) {
      console.error("Status check failed", error);
      setStatus("guest");
      setCurrentUser(null);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Auth Listener (runs once when component mounts)
  useEffect(() => {
    const checkLocalCache = () => {
      if (typeof window !== 'undefined') {
        if (hasValidStoredData()) {
          setStatus("pending");
        }
        if (localStorage.getItem("medhack_payment_confirmed") === "true") {
          setPaymentSuccessDismissed(true);
        }
      }
    };
    checkLocalCache();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStatus("guest");
        setCurrentUser(null);
        return;
      }

      if (hasValidStoredData()) {
        console.log("Pending form data detected - skipping status check, letting form submit first");
        setCurrentUser(user);
        return;
      }

      checkUserStatus(user);
    });
    return () => unsubscribe();
  }, [hasCheckedStatus, paymentSuccessDismissed]);

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
    if ((status === "pending" || status === "approved") && currentUser?.hasSubmitted) {
      const interval = setInterval(async () => {
        try {
          // Get fresh ID token for periodic status checks
          const idToken = await auth.currentUser?.getIdToken();
          if (!idToken) {
            console.warn("No ID token available for status check");
            return;
          }

          const res = await fetch("/api/user-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid: currentUser.uid, idToken }),
          });

          const data = await res.json();
          if (data.status === true) {
            const actualStatus = data.actualStatus?.toLowerCase();
            const isPaid = data.isPaid === true;
            const isEngineer = currentUser.major === "Engineering";

            // Handle transition to payment_success from approved or pending
            if (isPaid) {
              setStatus("payment_success");
              setCurrentUser((prev: any) => prev ? { ...prev, isPaid: true } : null);
              clearInterval(interval);
              return;
            }

            // For Healthcare: handle transition from pending to approved/rejected
            if (!isEngineer && status === "pending") {
              if (actualStatus === "accepted") {
                setStatus("approved");
                setCurrentUser((prev: any) => prev ? { ...prev, actualStatus: "accepted" } : null);
              } else if (actualStatus === "rejected") {
                setStatus("rejected");
                setCurrentUser((prev: any) => prev ? { ...prev, actualStatus: "rejected" } : null);
                clearInterval(interval); // Stop checking once rejected
              }
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

  // Handle Domain Confirmation
  const handleConfirmDomain = async () => {
    if (!selectedDomain || !currentUser) return;

    setIsUpdatingDomain(true);
    setIsDomainConfirmed(true); // Hide grid immediately

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Authentication token missing");

      const res = await fetch("/api/user/update-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          domain: selectedDomain
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update domain");
      }

      // Success! Move to final phase after a short delay for visual confirmation
      setTimeout(() => {
        setStatus("final_phase");
      }, 1500);

    } catch (error: any) {
      console.error("Domain update failed:", error);
      alert("Failed to confirm domain: " + error.message);
      setIsDomainConfirmed(false); // Show grid again if failed
    } finally {
      setIsUpdatingDomain(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      // Step A: Clear UI and Local Cache first
      setStatus("guest");
      setCurrentUser(null);
      clearStoredData();


      // Step B: Tell Firebase to kill the session
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
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

    // 2. Fresh data from API
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
                  {currentUser.displayName}
                </span>
                <span className="text-xs font-medium text-zinc-900 dark:text-white truncate max-w-[150px] sm:max-w-none">
                  {currentUser.email}
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
        {/* <div className="mb-12 flex flex-wrap justify-center gap-4 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-fit mx-auto">
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

          <button
            onClick={() => setStatus("payment_success")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${status === "payment_success"
              ? "bg-green-600 text-white"
              : "bg-white dark:bg-black text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              }`}
          >
            Payment Success
          </button>

          <button
            onClick={() => setStatus("final_phase")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${status === "final_phase"
              ? "bg-blue-600 text-white"
              : "bg-white dark:bg-black text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              }`}
          >
            Final Phase
          </button>

          <button
            onClick={() => setStatus("domain_selection")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${status === "domain_selection"
              ? "bg-orange-600 text-white"
              : "bg-white dark:bg-black text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              }`}
          >
            Domain Selection
          </button>

          <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700 self-center mx-2" /> */}

        {/* Domain AI Button */}
        {/* <button
            onClick={() => setStatus("domain_ai")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${status === "domain_ai"
              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
              : "bg-gradient-to-r from-purple-600 to-pink-600 text-white opacity-70 hover:opacity-100"
              }`}
          >
            <span>🧠</span> Domain AI
          </button>
        </div> */}

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
              <CustomApplicationForm onSubmitSuccess={() => {
                console.log("Form submitted successfully, triggering status check...");

                // Set pending status immediately
                setStatus("loading");

                // Then check status after Firebase write completes
                setTimeout(() => {
                  checkUserStatus(auth.currentUser || currentUser);
                }, 2000); // 2 second delay for Firebase write
              }} />
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
                <h3 className="text-white font-bold text-lg">OFFICIAL TICKET</h3>
              </div>
              <div className="p-8">
                <TicketTailorWidget />
              </div>
            </div>

            <div className="mt-8 text-center text-sm text-zinc-500 max-w-md mx-auto">
              <p>Having trouble with the widget? <a href="https://www.tickettailor.com/events/medhack/1154817" target="_blank" rel="noopener noreferrer" className="text-[#007b8a] hover:underline">Click here to open booking page directly</a></p>
            </div>
          </div>
        )}

        {/* 3.5 REJECTED VIEW: Ticket Tailor Widget with Rejection Message */}
        {status === "rejected" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <div className="mb-6 flex justify-center">
                <div className="h-20 w-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-red-600 dark:text-red-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <h2 className="text-4xl sm:text-6xl font-black tracking-[-0.05em] uppercase text-red-600 mb-4">
                Application Update
              </h2>
              <p className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
                We're sorry, {currentUser?.displayName || 'Applicant'}.
              </p>
              <div className="mt-4 p-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl max-w-xl mx-auto">
                <p className="text-lg font-medium text-red-800 dark:text-red-300">
                  Your Application is Rejected
                </p>
                <p className="mt-2 text-sm text-red-700/80 dark:text-red-400/80 leading-relaxed">
                  Application Rejected, but you can still get the ticket
                </p>
              </div>
            </div>

            <div className="mx-auto max-w-4xl bg-white rounded-3xl shadow-xl ring-1 ring-zinc-200 overflow-hidden">
              <div className="bg-zinc-800 px-6 py-4 flex items-center justify-center">
                <h3 className="text-white font-bold text-lg">GENERAL ATTENDANCE TICKET</h3>
              </div>
              <div className="p-8">
                <TicketTailorWidget />
              </div>
            </div>

            <div className="mt-8 text-center text-sm text-zinc-500 max-w-md mx-auto">
              <p>Still want to participate? Grab a general ticket above.</p>
            </div>
          </div>
        )}

        {/* 4. LOADING VIEW: Smooth Transition State */}
        {status === "loading" && (
          <div className="flex flex-col items-center justify-center py-32 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative w-24 h-24 mb-8">
              {/* Pulse effect */}
              <div className="absolute inset-0 bg-[#007b8a]/20 rounded-full animate-ping" />
              <div className="relative z-10 w-24 h-24 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center border-2 border-[#007b8a] shadow-xl">
                <svg className="w-10 h-10 text-[#007b8a] animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
              Loading MedHack...
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400">
              Checking your application status
            </p>
          </div>
        )}

        {/* 2.5 DOMAIN SELECTION VIEW (Dev View Only) */}
        {status === "domain_selection" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mx-auto max-w-5xl text-center mb-16">
              <h2 className="text-4xl sm:text-6xl font-black tracking-[-0.05em] uppercase text-[#007b8a] mb-4">
                Select a Domain
              </h2>
              <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-10 max-w-2xl mx-auto">
                Choose the domain that best fits your project. You can always refine this choice later with your team.
              </p>


              {/* Domain Grid: Reworked for Premium Feel */}
              {!isDomainConfirmed ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  {[
                    {
                      id: "A",
                      title: "Medical Tools & Hardware",
                      tagline: "Tangible Engineering",
                      definition: "Focuses on physical devices, tactile surgical instruments, and wearable bio-hardware that interact directly with human physiology.",
                      goal: "Develop tangible, high-precision physical prototypes.",
                      examples: [
                        { name: "Steady-Suture", desc: "Haptic-feedback needle holders." },
                        { name: "Smart-IV Drip", desc: "Infrared air-bubble detection systems." },
                        { name: "Hemo-Cool", desc: "Peltier-controlled thermal sample carriers." }
                      ],
                      icon: (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                      )
                    },
                    {
                      id: "B",
                      title: "Clinical Systems & Operations",
                      tagline: "Systems Intelligence",
                      definition: "Optimizing the logic and flow of healthcare environments through systems thinking and resource maximization.",
                      goal: "Create functional models or process simulations.",
                      examples: [
                        { name: "ER Triage-Bot", desc: "Predictive patient flow logic." },
                        { name: "Opti-Staff", desc: "Data-driven nurse roster optimization." },
                        { name: "Asset-Track", desc: "RFID-based high-value asset tracking." }
                      ],
                      icon: (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      )
                    },
                    {
                      id: "C",
                      title: "Digital Health & AI",
                      tagline: "Algorithmic Healthcare",
                      definition: "Leveraging computer vision and machine learning to build diagnostic tools and remote monitoring platforms.",
                      goal: "Build functional apps or diagnostic algorithms.",
                      examples: [
                        { name: "Derma-Scan AI", desc: "Vision-based lesion screening." },
                        { name: "Vocal-Marker", desc: "Respiratory audio analysis AI." },
                        { name: "Sync-Rehab", desc: "Motion-tracking physiotherapy apps." }
                      ],
                      icon: (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      )
                    }
                  ].map((domain) => (
                    <div
                      key={domain.id}
                      onClick={() => setSelectedDomain(domain.id)}
                      className={`group relative p-8 rounded-3xl border transition-all duration-500 cursor-pointer ${selectedDomain === domain.id
                        ? "bg-zinc-50 dark:bg-[#007b8a]/5 border-[#007b8a] shadow-[0_0_40px_rgba(0,123,138,0.15)] ring-1 ring-[#007b8a]/20"
                        : "bg-white dark:bg-black border-zinc-200 dark:border-zinc-800 hover:border-[#007b8a]/40"
                        }`}
                    >
                      {/* Technical ID */}
                      <div className="absolute top-6 right-8 font-mono text-[9px] font-black tracking-[0.2em] text-zinc-300 dark:text-zinc-700">
                        SEC_ID: 0{domain.id === 'A' ? 1 : domain.id === 'B' ? 2 : 3}
                      </div>

                      {/* Icon & Category */}
                      <div className="flex items-center gap-4 mb-8">
                        <div className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-500 ${selectedDomain === domain.id ? "bg-[#007b8a] text-white shadow-lg shadow-[#007b8a]/30 rotate-3" : "bg-zinc-100 dark:bg-zinc-900 text-[#007b8a]"}`}>
                          {domain.icon}
                        </div>
                        <div className="text-left">
                          <span className="block text-[10px] font-black uppercase tracking-widest text-[#007b8a] mb-0.5">Domain {domain.id}</span>
                          <span className="block text-xs font-medium text-zinc-400">{domain.tagline}</span>
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 text-left leading-tight group-hover:text-[#007b8a] transition-colors">
                        {domain.title}
                      </h3>

                      {/* Action Area */}
                      <div className="flex items-center justify-between mt-auto">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedDomain(expandedDomain === domain.id ? null : domain.id);
                          }}
                          className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border transition-all ${expandedDomain === domain.id ? "bg-[#007b8a] border-[#007b8a] text-white" : "border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-[#007b8a] hover:text-[#007b8a]"}`}
                        >
                          {expandedDomain === domain.id ? "Close Brief" : "View Brief"}
                        </button>

                        {selectedDomain === domain.id && (
                          <div className="flex items-center gap-2 animate-in fade-in zoom-in slide-in-from-right-2">
                            <span className="text-[10px] font-black uppercase tracking-tighter text-[#007b8a]">Selected</span>
                            <div className="w-2 h-2 rounded-full bg-[#007b8a] animate-pulse" />
                          </div>
                        )}
                      </div>

                      {/* Precision Expansion Detail */}
                      <div className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.2,0,0,1)] ${expandedDomain === domain.id ? "max-h-[800px] opacity-100 mt-8" : "max-h-0 opacity-0"}`}>
                        <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800/50 space-y-8 text-left">

                          <div>
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#007b8a] block mb-3">01. Tactical Scope</label>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed tabular-nums">
                              {domain.definition}
                            </p>
                          </div>

                          <div>
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#007b8a] block mb-3">02. Mission Objective</label>
                            <p className="text-[15px] font-bold text-zinc-900 dark:text-zinc-200 leading-snug">
                              {domain.goal}
                            </p>
                          </div>

                          <div>
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#007b8a] block mb-4">03. Project Precedents</label>
                            <div className="space-y-4">
                              {domain.examples.map((ex, i) => (
                                <div key={i} className="group/item bg-zinc-50 dark:bg-white/5 p-4 rounded-xl border border-transparent hover:border-[#007b8a]/20 transition-all">
                                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 block mb-1">{ex.name}</span>
                                  <span className="text-[11px] text-zinc-400 leading-tight block">{ex.desc}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Confirmed State View */
                <div className="max-w-md mx-auto animate-in fade-in zoom-in duration-500">
                  <div className="p-8 rounded-3xl border border-[#007b8a] bg-zinc-50 dark:bg-[#007b8a]/5 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#007b8a]">Confirmed</span>
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                      </div>
                    </div>

                    <div className="w-16 h-16 bg-[#007b8a] text-white flex items-center justify-center rounded-2xl shadow-lg mb-6 mx-auto">
                      {selectedDomain === "A" && (
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                      )}
                      {selectedDomain === "B" && (
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      )}
                      {selectedDomain === "C" && (
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>

                    <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2 leading-tight uppercase tracking-tight">
                      {selectedDomain === "A" ? "Medical Tools & Hardware" :
                        selectedDomain === "B" ? "Clinical Systems & Operations" :
                          "Digital Health & AI"}
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium">Domain {selectedDomain} Selected</p>

                    {isUpdatingDomain && (
                      <div className="mt-6 flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-[#007b8a]/30 border-t-[#007b8a] rounded-full animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#007b8a]">Updating mission files...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-20 flex flex-col items-center gap-6">
                <button
                  disabled={!selectedDomain || isUpdatingDomain}
                  onClick={handleConfirmDomain}
                  className={`px-12 py-3 rounded-full font-bold transition-all text-sm uppercase tracking-widest shadow-lg ${selectedDomain && !isUpdatingDomain
                    ? "bg-[#007b8a] text-white hover:bg-[#00606b] hover:scale-105 active:scale-95 shadow-[#007b8a]/20"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                    }`}
                >
                  {isUpdatingDomain ? "Verifying..." : "Confirm Domain"}
                </button>
                <p className="text-xs text-zinc-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Selection is preliminary. You can finalize your domain choice during the team formation phase.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 5. PAYMENT SUCCESS VIEW: Mock Confirmation Screen */}
        {status === "payment_success" && (
          <div className="animate-in fade-in zoom-in-95 duration-700">
            <div className="mx-auto max-w-2xl text-center py-12">
              <div className="mb-8 flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500 blur-2xl opacity-20 animate-pulse rounded-full" />
                  <div className="relative h-24 w-24 rounded-full bg-green-500 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="white" className="w-14 h-14">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </div>
                </div>
              </div>

              <h2 className="text-4xl sm:text-6xl font-black tracking-[-0.05em] uppercase text-green-500 mb-4">
                Payment Successful
              </h2>
              <p className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-2xl mb-2">
                Your spot is secured!
              </p>
              <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-md mx-auto mb-8">
                Your payment was processed successfully. We&apos;ve sent a confirmation email with your ticket details.
              </p>

              <Button
                onClick={() => {
                  const isEngineer = currentUser?.major === "Engineering";
                  localStorage.setItem("medhack_payment_confirmed", "true");
                  setPaymentSuccessDismissed(true);
                  setStatus(isEngineer ? "final_phase" : "domain_selection");
                }}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-12 rounded-full shadow-lg transition-all hover:scale-105"
              >
                {currentUser?.major === "Engineering" ? "Go to Final Phase" : "Select Your Domain"}
              </Button>
            </div>
          </div>
        )}

        {/* 6. FINAL PHASE VIEW: Reworked Mission Control Aesthetic */}
        {status === "final_phase" && (
          <div className="animate-in fade-in zoom-in-95 duration-1000">
            <div className="mx-auto max-w-4xl text-center py-12 relative">

              {/* New Prominent Header */}
              <div className="mb-12">
                <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-zinc-900 dark:text-white uppercase">
                  The <span className="text-[#007b8a]">Countdown</span> Begins
                </h2>
                <div className="mt-4 h-1 w-24 bg-[#007b8a] mx-auto rounded-full" />
              </div>

              {/* Reworked Timer */}
              <div className="mb-12">
                <CountdownTimer targetDate="2026-03-28T00:00:00" />
              </div>

              {/* Mission Briefing Section (Reworked from "Words of Encouragement") */}
              <div className="mt-20 max-w-2xl mx-auto">
                <div className="relative p-1 bg-gradient-to-b from-[#007b8a]/20 to-transparent rounded-3xl">
                  <div className="bg-white dark:bg-black/40 backdrop-blur-xl p-8 sm:p-12 rounded-[1.4rem] border border-zinc-200 dark:border-zinc-800/50 text-left relative overflow-hidden">

                    {/* Background Detail */}
                    <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-[#007b8a]/5 rounded-full blur-3xl" />

                    <div className="flex items-start gap-6 relative z-10">
                      <div className="hidden sm:flex flex-col items-center gap-3">
                        <div className="w-px h-12 bg-gradient-to-b from-transparent via-[#007b8a] to-transparent" />
                        <span className="[writing-mode:vertical-lr] text-[10px] uppercase font-black tracking-[0.4em] text-[#007b8a]/50 py-4">Briefing</span>
                        <div className="w-px h-12 bg-gradient-to-b from-transparent via-[#007b8a] to-transparent" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-6">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Mission Objective</span>
                          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                        </div>

                        <h3 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mb-6 leading-tight">
                          Where medicine meets engineering, <br className="hidden sm:block" /> the future is built.
                        </h3>

                        <div className="space-y-6 text-zinc-500 dark:text-zinc-400 text-sm sm:text-base leading-relaxed">
                          <p>
                            We are no longer just building tools; we are re-engineering the human experience. MedEngineers 2026 is the epicenter of a fundamental shift in how we heal, how we build, and how we survive.
                          </p>
                          <p className="font-bold text-zinc-900 dark:text-white sm:text-zinc-200">
                            Architecture meets Anatomy. Precision meets Pulse. You are here to redefine the boundaries of possibility. The code you write today becomes the cure of tomorrow.
                          </p>
                        </div>

                        <div className="mt-10 flex flex-wrap gap-3">
                          {["#BioTech", "#Innovation", "#MedEngineers2026"].map(tag => (
                            <span key={tag} className="text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-500 rounded-full border border-zinc-200 dark:border-zinc-800">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// Separate helper component for the Countdown Timer
function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return null;

  return (
    <div className="grid grid-cols-4 gap-4 sm:gap-8 max-w-2xl mx-auto">
      {[
        { value: timeLeft.days, label: "Days" },
        { value: timeLeft.hours, label: "Hours" },
        { value: timeLeft.minutes, label: "Minutes" },
        { value: timeLeft.seconds, label: "Seconds" },
      ].map((item, idx) => (
        <div key={idx} className="flex flex-col items-center">
          <div className="w-full aspect-square sm:w-32 sm:h-32 bg-zinc-50 dark:bg-zinc-900 rounded-3xl border-2 border-zinc-200 dark:border-zinc-800 flex items-center justify-center shadow-xl mb-3 relative overflow-hidden group">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-[#007b8a] opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-3xl sm:text-5xl font-black text-zinc-900 dark:text-white tracking-tighter">
              {String(item.value).padStart(2, '0')}
            </span>
          </div>
          <span className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-[#007b8a]">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
