"use client";

import { useEffect, useCallback, useReducer, type FormEvent, useState } from "react";
import { CustomApplicationForm } from "./CustomApplicationForm";
import { auth } from "@/lib/Firebase";
import { Button } from "@/components/ui/button";
import { TicketTailorWidget } from "./TicketTailorWidget";
import { retrieveFormData, hasValidStoredData, clearStoredData } from "@/lib/secureStorage";
import { useAuth } from "@/lib/AuthContext";
import { useRegistrationStore, type workFlowStatus } from "@/lib/registrationStore";
import { User, Mail, GraduationCap, Calendar, Briefcase, Globe, Ticket, ChevronDown } from "lucide-react";

export function RegistrationSection() {

  const { user, signInWithGoogle, signOut } = useAuth();

  // interface for registrationStore
  // status: defines what the user sees in UI
  // user: defines the user data
  const {
    status,
    userZustand,
    setUser,
    setStatus,
    transition,
    hydrateFromServer
  } = useRegistrationStore();

  // interface for UI state
  // Purpose: to manage the UI state of the registration section
  type UiState = {
    hasSubmitted: boolean;
    isCheckingStatus: boolean;
    statusCheckMessage: string;
    hasCheckedStatus: boolean;
    transactionID: string;
    paymentProofFile: File | null;
    paymentProofError: string | null;
    isSubmittingPaymentProof: boolean;
    isDismissingPayment: boolean;
    isCheckingTicket: boolean;
    ticketCheckError: string | null;
    ticketCheckSuccess: string | null;
    isFetchingTicketInfo: boolean;
    ticketInfoError: string | null;
    ticketInfo: { orderId?: string; ticketCode?: string } | null;
    selectedDomain: string | null;
    expandedDomain: string | null;
    isUpdatingDomain: boolean;
    isDomainConfirmed: boolean;
    isDomainSubmitted: boolean;
    isTicketPanelOpen: boolean;
    isAmbassador: boolean | null;
    isDevPreview: boolean;
  };

  // UI State: using this instead of 15 different useState hooks
  const [ui, updateUi] = useReducer(
    (state: UiState, patch: Partial<UiState>) => ({ ...state, ...patch }),
    {
      hasSubmitted: false,
      isCheckingStatus: false,
      statusCheckMessage: "",
      hasCheckedStatus: false,
      transactionID: "",
      paymentProofFile: null,
      paymentProofError: null,
      isSubmittingPaymentProof: false,
      isDismissingPayment: false,
      isCheckingTicket: false,
      ticketCheckError: null,
      ticketCheckSuccess: null,
      isFetchingTicketInfo: false,
      ticketInfoError: null,
      ticketInfo: null,
      selectedDomain: null,
      expandedDomain: null,
      isUpdatingDomain: false,
      isDomainConfirmed: false,
      isDomainSubmitted: false,
      isTicketPanelOpen: false,
      isAmbassador: null,
      isDevPreview: false,
    }
  );

  // Get data from auth and registrationStore
  const uiDisplayName = user?.displayName || userZustand?.displayName || userZustand?.email || "";
  const uiEmail = user?.email || userZustand?.email || "";
  const hasUser = Boolean(user || userZustand);

  // Purpose: to define the UI state based on the status
  const isAwaitingPayment =
    status === "approved_awaiting_payment_submission" ||
    status === "rejected_awaiting_payment_submission" ||
    status === "payment_rejected";
  const isPaymentUnderReview = status === "payment_submitted_under_review";
  const isTicketPhase = status === "payment_confirmed" || status === "ticket_confirmed";
  const isTicketConfirmed = status === "ticket_confirmed";

  useEffect(() => {
    if (status === "domain_selection") {
      updateUi({
        selectedDomain: null,
        expandedDomain: null,
        isDomainConfirmed: false,
        isDomainSubmitted: false,
      });
    }
  }, [status, updateUi]);

  // Global function to check user status from the server
  const checkUserStatus = useCallback(async (authUser: any, retryCount = 0, options?: { silent?: boolean }) => {

    // If no auth user, set status to guest and clear user
    if (!authUser) {
      setStatus("guest");
      setUser(null);
      updateUi({ hasSubmitted: false });
      return;
    }

    // If not silent, set status to loading
    // options: { silent: true } is used when checking status from the server
    if (!options?.silent) {
      setStatus("loading");
    }

    // Purpose: to check the user status from the server
    try {
      if (!options?.silent) {
        updateUi({ isCheckingStatus: true });
      }
      // console.log(`Checking status for UID: ${authUser.uid} (Attempt ${retryCount + 1})`);

      // Get fresh ID token for authentication
      const idToken = await authUser.getIdToken();

      const res = await fetch("/api/user-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: authUser.uid, idToken }),
      });

      const data = await res.json();
      console.log("Status API Response:", data);

      // Purpose: to get the workFlowStatus from the API response
      const workflowStatus = data.workflowStatus as workFlowStatus | undefined;
      const hasApplication = !!workflowStatus && workflowStatus !== "guest";

      // If the API confirms user has submitted an application 
      if (hasApplication) {

        // Clear stored data and update UI
        clearStoredData();
        updateUi({ hasSubmitted: true });

        // Merge user data from auth and API response
        const mergedUser = {
          uid: authUser.uid,
          displayName: authUser.displayName ?? null,
          email: authUser.email ?? null,
          major: data.major ?? data.user?.major,
          year: data.user?.year ?? data.year ?? null,
          majorType: data.user?.majorType ?? data.majorType ?? null,
          domain: data.user?.domain ?? data.domain ?? null,
          status: workflowStatus ?? "pending",
          submissionType: data.type,
        };

        // Hydrate registrationStore
        hydrateFromServer({
          status: workflowStatus ?? "pending",
          user: mergedUser,
        });

        // Update UI based on workFlowStatus
        setStatus(workflowStatus ?? "pending");

      } else {
        // No application in DB yet
        if (retryCount < 3) {
          console.log(`No application found yet, retrying in 1.5s... (${retryCount + 1}/3)`);
          setTimeout(() => checkUserStatus(authUser, retryCount + 1, options), 1500);
          return;
        }

        console.warn("No application found in DB after retries.");
        clearStoredData();
        setStatus("guest");
        setUser(null);
        updateUi({ hasSubmitted: false });

        // If we just manually checked and no app found
        if (ui.hasCheckedStatus) {
          updateUi({ statusCheckMessage: "No application found for this account." });
        }
      }
    } catch (error) {
      console.error("Status check failed", error);
      setStatus("guest");
      setUser(null);
      updateUi({ hasSubmitted: false });
    } finally {
      if (!options?.silent) {
        updateUi({ isCheckingStatus: false });
      }
    }
  }, [ui.hasCheckedStatus, setStatus, setUser, updateUi]);

  useEffect(() => {
    if (!auth.currentUser) return;
    if (!isTicketPhase || isTicketConfirmed) return;
    if (ui.isDevPreview) return;

    let cancelled = false;
    const poll = async () => {
      if (cancelled || !auth.currentUser) return;
      await checkUserStatus(auth.currentUser, 0, { silent: true });
    };

    poll();
    const intervalId = window.setInterval(poll, 8000);

    const handleVisibility = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [checkUserStatus, isTicketPhase, isTicketConfirmed]);

  // Auth Listener (synchronizes with AuthContext)
  useEffect(() => {
    const checkLocalCache = () => {
      if (typeof window !== 'undefined') {
        if (hasValidStoredData()) {
          setStatus("pending");
        }
        // no-op: payment success is now user-driven only
      }
    };
    checkLocalCache();

    if (!user) {
      setStatus("guest");
      setUser(null);
      updateUi({ hasSubmitted: false });
      return;
    }

    if (hasValidStoredData()) {
      console.log("Pending form data detected - skipping status check, letting form submit first");
      hydrateFromServer({
        status: "pending",
        user: {
          uid: user.uid,
          displayName: user.displayName ?? null,
          email: user.email ?? null,
        },
      });
      updateUi({ hasSubmitted: true });
      return;
    }

    checkUserStatus(user);
  }, [user, checkUserStatus]); // Only depend on current user from AuthContext

  // Handle manual status check, takes place when user clicks on "Check Status" button
  const handleCheckStatus = async () => {
    updateUi({ isCheckingStatus: true, statusCheckMessage: "", hasCheckedStatus: true });

    try {
      await signInWithGoogle();
      // The useEffect on `user` will handle the rest once signed in
    } catch (error: any) {
      console.error("Status check login failed", error);
      updateUi({ statusCheckMessage: error.message || "Failed to sign in" });
    } finally {
      updateUi({ isCheckingStatus: false });
    }
  };

  // Add periodic status checking for active workflow states, takes place every 10 seconds
  useEffect(() => {
    if (
      (status === "pending" ||
        status === "approved_awaiting_payment_submission" ||
        status === "payment_submitted_under_review" ||
        status === "payment_rejected") &&
      user?.uid &&
      !ui.isDevPreview
    ) {
      const interval = setInterval(async () => {
        try {
          await checkUserStatus(user, 0, { silent: true });
        } catch (error) {
          console.error("Periodic status check failed", error);
        }
      }, 10000); // Check every 10 seconds

      return () => clearInterval(interval); // Cleanup on unmount or status change
    }
  }, [status, user, checkUserStatus]);

  // Handle payment proof submission (for all users)
  const handlePaymentProofSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!ui.transactionID.trim()) {
      updateUi({ paymentProofError: "Please enter your transaction ID." });
      return;
    }

    if (!ui.paymentProofFile) {
      updateUi({ paymentProofError: "Please upload your payment proof file." });
      return;
    }

    try {
      updateUi({ isSubmittingPaymentProof: true, paymentProofError: null });

      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error("Authentication required. Please sign in again.");
      }

      const payload = new FormData();
      payload.append("idToken", idToken);
      payload.append("transactionID", ui.transactionID.trim());
      payload.append("paymentProof", ui.paymentProofFile);

      const res = await fetch("/api/payment/submit-proof", {
        method: "POST",
        body: payload,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit payment proof.");
      }

      if (status === "payment_rejected") {
        transition("PAYMENT_PROOF_RESUBMITTED");
      } else {
        transition("PAYMENT_PROOF_SUBMITTED");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to submit payment proof.";
      updateUi({ paymentProofError: message });
    } finally {
      updateUi({ isSubmittingPaymentProof: false });
    }
  };

  // Handle Domain Confirmation (Medicine and Healthcare students only)
  const handleConfirmDomain = async () => {
    if (!ui.selectedDomain || !userZustand) return;

    updateUi({ isUpdatingDomain: true, isDomainConfirmed: true }); // Hide grid immediately

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Authentication token missing");

      const res = await fetch("/api/user/update-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          competitorId: userZustand.uid,
          domain: ui.selectedDomain
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update domain");
      }

      // Success! Allow user to proceed to final phase
      setUser({
        ...userZustand,
        domain: ui.selectedDomain,
      });
      updateUi({ isDomainSubmitted: true });

    } catch (error: any) {
      console.error("Domain update failed:", error);
      updateUi({ isDomainConfirmed: false, isDomainSubmitted: false }); // Show grid again if failed
    } finally {
      updateUi({ isUpdatingDomain: false });
    }
  };

  // Update status for users who have paid and selected domain
  const handleGoToFinalPhase = async () => {
    try {
      updateUi({ isUpdatingDomain: true });
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Authentication token missing");

      const res = await fetch("/api/user/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, status: "final_phase" }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update status");
      }

      transition("DOMAIN_CONFIRMED");
    } catch (error: any) {
      console.error("Final phase update failed:", error);
    } finally {
      updateUi({ isUpdatingDomain: false });
    }
  };

  // Update status for users 
  const handleDismissPaymentSuccess = useCallback(async () => {
    const needsDomain = userZustand?.major === "Medicine" || userZustand?.major === "Healthcare";
    const nextStatus: workFlowStatus = needsDomain ? "domain_selection" : "final_phase";

    // Update status in backend
    try {
      updateUi({ isDismissingPayment: true });
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Authentication token missing");

      const res = await fetch("/api/user/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, status: nextStatus }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update status");
      }

      transition("DISMISS_PAYMENT_SUCCESS");
    } catch (error: any) {
      console.error("Dismiss payment success failed:", error);
      alert("Failed to continue: " + error.message);
    } finally {
      updateUi({ isDismissingPayment: false });
    }
  }, [userZustand?.major, transition, updateUi]);

  // Check ticket status (Check my ticket)
  const handleCheckTicket = useCallback(async () => {
    try {
      updateUi({ isCheckingTicket: true, ticketCheckError: null, ticketCheckSuccess: null });
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Authentication token missing");

      const res = await fetch("/api/ticket-tailor/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Ticket verification failed");
      }

      updateUi({ ticketCheckSuccess: "Ticket confirmed. You can continue now." });
      if (auth.currentUser) {
        await checkUserStatus(auth.currentUser, 0, { silent: true });
      }
    } catch (error: any) {
      console.error("Ticket verification failed:", error);
      updateUi({ ticketCheckError: error.message || "Ticket verification failed" });
    } finally {
      updateUi({ isCheckingTicket: false });
    }
  }, [checkUserStatus, updateUi]);

  // Get ticket info using button in final phase in summary section
  const handleGetTicketInfo = useCallback(async () => {
    try {
      updateUi({ isFetchingTicketInfo: true, ticketInfoError: null, ticketInfo: null });
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Authentication token missing");

      const res = await fetch("/api/ticket-tailor/get-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch ticket info");
      }

      const data = await res.json();
      updateUi({ ticketInfo: { orderId: data.orderId, ticketCode: data.ticketCode } });
    } catch (error: any) {
      updateUi({ ticketInfoError: error.message || "Failed to fetch ticket info" });
    } finally {
      updateUi({ isFetchingTicketInfo: false });
    }
  }, [updateUi]);

  // Handle logout
  const handleLogout = async () => {
    try {
      // Step A: Clear UI and Local Cache first
      setStatus("guest");
      setUser(null);
      clearStoredData();

      // Step B: Tell AuthContext to sign out
      await signOut();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <section id="registration" className="py-24 bg-white dark:bg-zinc-950 [will-change:transform]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">

        {/* Global User Header & Logout */}
        {hasUser && (
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
                  {uiDisplayName}
                </span>
                <span className="text-xs font-medium text-zinc-900 dark:text-white truncate max-w-[150px] sm:max-w-none">
                  {uiEmail}
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

        {/* DEV ONLY: State Toggles to visualize the flow - Only visible in development */}
        {process.env.NODE_ENV === "development" && (
          <div className="mb-12 flex flex-wrap justify-center gap-4 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-fit mx-auto">
            <span className="text-xs font-mono uppercase text-zinc-500 self-center">Dev Preview:</span>
            {([
              "guest",
              "pending",
              "approved_awaiting_payment_submission",
              "rejected_awaiting_payment_submission",
              "payment_submitted_under_review",
              "payment_rejected",
              "payment_confirmed",
              "ticket_confirmed",
              "domain_selection",
              "final_phase",
            ] as workFlowStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatus(s);
                  updateUi({ isDevPreview: true });
                }}
                className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors ${status === s
                  ? "bg-[#007b8a] text-white"
                  : "bg-white dark:bg-black text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                  }`}
              >
                {s.replace("_", " ")}
              </button>
            ))}
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
                Apply for MedEngineers 2026
              </p>
              <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
                Fill out the form below and submit your application to join the next generation of medical engineers.
              </p>
            </div>

            {/* Status Check Result Message - Only show if logged in but no application */}
            {user && !ui.hasSubmitted && ui.hasCheckedStatus && ui.statusCheckMessage && (
              <div className="mx-auto max-w-4xl mb-8">
                <div className={`rounded-xl p-6 border ${ui.statusCheckMessage.includes("No application")
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                  : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                  }`}>
                  <div className="text-center">
                    {ui.statusCheckMessage.includes("No application") ? (
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
                          {ui.statusCheckMessage}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Status Check Section for Existing Applicants - Only show if not logged in */}
            {!user && (
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
                      disabled={ui.isCheckingStatus}
                      className="bg-white dark:bg-zinc-800 border-[#007b8a] text-[#007b8a] hover:bg-[#007b8a] hover:text-white"
                    >
                      {ui.isCheckingStatus ? (
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


            <div className="mx-auto max-w-4xl">
              {/* Custom Styled Form with built-in submit */}
              <CustomApplicationForm onSubmitSuccess={() => {
                console.log("Form submitted successfully, triggering status check...");

                // Set loading status immediately
                setStatus("loading");

                // Then check status after Firebase write completes
                setTimeout(() => {
                  checkUserStatus(auth.currentUser || user);
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
            {userZustand && (
              <div className="mt-8 space-y-4">
                <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 inline-block text-left text-sm text-zinc-500">
                  <p><strong>Applicant:</strong> {uiDisplayName || uiEmail}</p>
                  <p><strong>Application Type:</strong> {userZustand.submissionType === 'attendee' ? 'Attendee' : 'Competitor'}</p>
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

        {/* 3. AWAITING PAYMENT VIEW: Bank Transfer & Google Form (Premium Dark) */}
        {isAwaitingPayment && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 py-12">
            <div className="mx-auto max-w-3xl text-center mb-16">
              <div className="mb-6 flex justify-center">

                {/* Status Icon at the top */}
                {status === "approved_awaiting_payment_submission" && (
                  <div>
                    <div className="h-20 w-20 rounded-full bg-[#002f35]/50 border border-[#007b8a]/30 flex items-center justify-center shadow-[0_0_30px_rgba(0,123,138,0.2)]">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10 text-[#00a8bd]">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    </div>
                  </div>
                )}
                {status === "rejected_awaiting_payment_submission" && (
                  <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-900/30 border-2 border-orange-500/40 flex items-center justify-center backdrop-blur-sm shadow-lg shadow-orange-500/10">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-11 h-11 text-orange-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                    </svg>
                  </div>
                )}
                {status === "payment_rejected" && (
                  <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-900/30 border-2 border-orange-500/40 flex items-center justify-center backdrop-blur-sm shadow-lg shadow-orange-500/10">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-11 h-11 text-orange-500"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Title at the top Approved, Invitation, Payment Rejected Please try again.*/}
              {status === 'approved_awaiting_payment_submission' && (
                <h2 className="text-4xl sm:text-6xl font-black tracking-[-0.05em] uppercase text-[#00a8bd] mb-6 drop-shadow-[0_0_15px_rgba(0,168,189,0.3)]">
                  YOU'RE APPROVED!
                </h2>
              )}
              {status === 'rejected_awaiting_payment_submission' && (
                <h2 className="text-4xl sm:text-6xl font-black tracking-[-0.05em] uppercase text-orange-500 mb-3">
                  YOUR INVITATION
                </h2>
              )}
              {status === 'payment_rejected' && (
                <h2 className="text-4xl sm:text-6xl font-black tracking-[-0.05em] uppercase text-orange-500 mb-3">
                  PAYMENT REJECTED
                </h2>
              )}

              {/* Subtitle at the top Approved, Invitation, Payment Rejected Please try again.*/}
              {status === 'approved_awaiting_payment_submission' && (
                <p className="text-xl font-bold tracking-tight text-white sm:text-2xl mb-4">
                  Congratulations, {uiDisplayName || 'Applicant'}!
                </p>
              )}
              {status === 'rejected_awaiting_payment_submission' && (
                <p className="text-xl font-bold tracking-tight text-white sm:text-2xl mb-4">
                  Thank you for your interest, {uiDisplayName || 'Applicant'}!
                </p>
              )}
              {status === 'payment_rejected' && (
                <p className="text-xl font-bold tracking-tight text-white sm:text-2xl mb-4">
                  Thank you for your interest, {uiDisplayName || 'Applicant'}!
                </p>
              )}

              {/* Congratulations message for approved users */}
              {status === "approved_awaiting_payment_submission" && (
                <p className="text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                  Congratulations on being accepted to MedEngineers 2026! This is the final step to secure your spot. Please use this form to submit your bank transfer transaction ID and upload your payment receipt. Once verified, your registration will be complete.
                </p>
              )}

              {/* Ambassador question for approved users */}
              {status === "approved_awaiting_payment_submission" && ui.isAmbassador === null && (
                <div className="mt-12 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="relative bg-[#18181b] border border-zinc-800/80 rounded-2xl p-8 sm:p-10 max-w-lg mx-auto shadow-2xl overflow-hidden">
                    {/* Top accent line */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#007b8a] to-transparent" />

                    <div className="flex justify-center mb-6">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#007b8a]/30 to-[#00a8bd]/10 border border-[#007b8a]/40 flex items-center justify-center shadow-[0_0_25px_rgba(0,123,138,0.15)]">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-[#00a8bd]">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white mb-1 tracking-tight uppercase">
                      Are you a MedHack Ambassador?
                    </h3>

                    <div className="flex gap-8 justify-center mt-8">
                      <button
                        onClick={() => updateUi({ isAmbassador: true })}
                        className="flex items-center justify-center gap-4 min-w-[140px] px-7 py-3.5 bg-[#007b8a] hover:bg-[#00a8bd] text-white font-bold rounded-xl shadow-lg shadow-[#007b8a]/25 transition-all duration-200 hover:scale-105 hover:shadow-[#007b8a]/40 text-sm uppercase tracking-widest"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        Yes
                      </button>
                      <button
                        onClick={() => updateUi({ isAmbassador: false })}
                        className="flex items-center justify-center gap-2 min-w-[140px] px-7 py-3.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl border border-zinc-700/80 shadow-lg transition-all duration-200 hover:scale-105 text-sm uppercase tracking-widest"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                        No
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {status === "rejected_awaiting_payment_submission" && (
                <div>
                  <p className="text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
                    Unfortunately, your application was not selected for the competitive track this cycle. However, you are welcome to attend the event as an audience member rather than a competitor. You can secure your General Attendance ticket below.
                  </p>

                  {/* Status Timeline */}
                  <div className="mt-10 flex items-center justify-center gap-0 max-w-md mx-auto">
                    {/* Step 1: Application */}
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center shadow-md shadow-orange-500/20">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <span className="text-[11px] font-semibold text-orange-500 mt-2 uppercase tracking-wider">Applied</span>
                    </div>
                    {/* Connector */}
                    <div className="flex-1 h-[2px] bg-orange-500 mx-1 mt-[-18px]" />
                    {/* Step 2: Reviewed */}
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center shadow-md shadow-orange-500/20">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <span className="text-[11px] font-semibold text-orange-500 mt-2 uppercase tracking-wider">Reviewed</span>
                    </div>
                    {/* Connector */}
                    <div className="flex-1 h-[2px] bg-gradient-to-r from-orange-500 to-amber-400 mx-1 mt-[-18px]" />
                    {/* Step 3: Invited */}
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-md shadow-amber-400/20 ring-2 ring-amber-400/30 ring-offset-2 ring-offset-zinc-950">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                      </div>
                      <span className="text-[11px] font-bold text-amber-400 mt-2 uppercase tracking-wider">Invited</span>
                    </div>
                  </div>
                </div>
              )}
              {status === "payment_rejected" && (
                <div>
                  <p className="text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
                    Unfortunately, your payment was rejected. Please try again.
                  </p>
                </div>
              )}
            </div>

            {/* Only show payment details after ambassador question is answered (for approved), or always for rejected/payment_rejected */}
            {(status !== "approved_awaiting_payment_submission" || ui.isAmbassador !== null) && (
            <div className="mx-auto max-w-3xl px-4 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="bg-[#18181b] rounded-2xl shadow-2xl border border-zinc-800/80 overflow-hidden">

                {/* Unified Header */}
                <div className="bg-gradient-to-r from-[#005a65] via-[#007b8a] to-[#005a65] px-6 py-5 flex items-center justify-center">
                  <h3 className="text-white font-bold text-lg tracking-wide uppercase">Complete Your Payment</h3>
                </div>

                <div className="p-6 sm:p-10 space-y-10">

                  {/* Pricing Info Banner — integrated inside the card */}
                  {status === "approved_awaiting_payment_submission" && ui.isAmbassador !== null && (
                    <div className={`rounded-xl p-5 border ${ui.isAmbassador ? 'bg-amber-500/5 border-amber-500/20' : 'bg-[#002f35]/40 border-[#007b8a]/20'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${ui.isAmbassador ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-[#007b8a]/20 border border-[#007b8a]/30'}`}>
                          {ui.isAmbassador ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4.5 h-4.5 text-amber-400">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4.5 h-4.5 text-[#00a8bd]">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          {ui.isAmbassador ? (
                            <p className="text-sm text-zinc-300 leading-relaxed">
                              As a MedHack Ambassador, you are eligible for the special registration price of <span className="font-bold text-amber-400">70 AED</span>. Please provide your transaction details below to confirm your payment at this discounted rate.
                            </p>
                          ) : (
                            <p className="text-sm text-zinc-300 leading-relaxed">
                              {userZustand?.major === "Engineering" ? (
                                <>Your registration fee as an Engineering student is <span className="font-bold text-[#00a8bd]">70 AED</span>. Please transfer this amount and submit your proof below.</>
                              ) : (
                                <>Your registration fee as a {userZustand?.major || 'Healthcare'} student is <span className="font-bold text-[#00a8bd]">110 AED</span>. Please transfer this amount and submit your proof below.</>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Amount pill */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800/50">
                        <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Amount to transfer</span>
                        <span className={`text-2xl font-black ${ui.isAmbassador ? 'text-amber-400' : 'text-[#00a8bd]'}`}>
                          {ui.isAmbassador ? '70' : userZustand?.major === 'Engineering' ? '70' : '110'} AED
                        </span>
                      </div>
                      {/* Change ambassador answer */}
                      <button
                        onClick={() => updateUi({ isAmbassador: null })}
                        className="mt-3 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-2 block"
                      >
                        Change ambassador status
                      </button>
                    </div>
                  )}

                  {/* Step 1: Bank Transfer */}
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-full bg-[#007b8a] flex items-center justify-center text-white text-sm font-black flex-shrink-0">
                        1
                      </div>
                      <h4 className="text-base font-bold text-zinc-200 uppercase tracking-wider">Transfer to this account</h4>
                    </div>

                    <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-[#1f1f22] shadow-inner">
                      <div className="divide-y divide-zinc-800/60 text-[14px] sm:text-[15px]">
                        {[
                          { label: "Account Name", value: "RIT Dubai FZE", isMedium: true },
                          { label: "Bank Name", value: "Emirates NBD PJSC" },
                          { label: "Branch", value: "Dubai Silicon Oasis" },
                          { label: "Account Number", value: "1102425560201", isMono: true, copyable: true },
                          { label: "SWIFT Code", value: "EBILAEAD", isMono: true, copyable: true },
                          { label: "IBAN Code", value: "AE390260001102425560201", isMono: true, breakAll: true, copyable: true },
                        ].map((item, i) => (
                          <div key={i} className="group grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-center hover:bg-zinc-800/30 transition-colors px-4 py-3.5 sm:px-6 sm:py-4">
                            <div className="font-bold text-zinc-400 uppercase tracking-tight text-[11px] sm:text-xs">
                              {item.label}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-zinc-200 ${item.isMedium ? 'font-medium' : ''} ${item.isMono ? 'font-mono tracking-wider' : ''} ${item.breakAll ? 'break-all' : ''} text-sm sm:text-base`}>
                                {item.value}
                              </span>
                              {item.copyable && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(item.value);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-zinc-700/50 text-zinc-500 hover:text-[#00a8bd] flex-shrink-0"
                                  title={`Copy ${item.label}`}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-zinc-800" />
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-zinc-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                    <div className="flex-1 h-px bg-zinc-800" />
                  </div>

                  {/* Step 2: Submit Proof */}
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-full bg-[#007b8a] flex items-center justify-center text-white text-sm font-black flex-shrink-0">
                        2
                      </div>
                      <h4 className="text-base font-bold text-zinc-200 uppercase tracking-wider">Submit your proof</h4>
                    </div>

                    <form onSubmit={handlePaymentProofSubmit} className="space-y-6">
                      <div className="text-left">
                        <label htmlFor="transaction-id" className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wider">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-[#00a8bd]">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                          </svg>
                          Transaction ID
                        </label>
                        <input
                          id="transaction-id"
                          type="text"
                          value={ui.transactionID}
                          onChange={(e) => updateUi({ transactionID: e.target.value })}
                          placeholder="e.g. TXN-2026-XXXXXX"
                          className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900/80 px-4 py-3.5 text-sm sm:text-base text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#007b8a] focus:border-transparent transition-all"
                          required
                        />
                      </div>

                      <div className="text-left">
                        <label htmlFor="payment-proof-file" className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wider">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-[#00a8bd]">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                          </svg>
                          Payment Receipt
                        </label>
                        <div className="relative">
                          <input
                            id="payment-proof-file"
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.webp"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              updateUi({ paymentProofFile: file });
                            }}
                            className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900/80 px-4 py-3 text-xs sm:text-sm text-zinc-300 file:mr-3 file:sm:mr-4 file:rounded-lg file:border-0 file:bg-[#007b8a] file:px-4 file:py-2 file:text-[10px] file:sm:text-sm file:font-bold file:uppercase file:tracking-wider file:text-white hover:file:bg-[#00a8bd] file:transition-colors file:cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-[#007b8a]"
                            required
                          />
                        </div>
                        <p className="mt-2 text-[10px] sm:text-xs text-zinc-600 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                          </svg>
                          Accepted: PDF, PNG, JPG, WEBP — Max: 700KB
                        </p>
                      </div>

                      {ui.paymentProofError && (
                        <div className="rounded-xl border border-red-800/60 bg-red-900/20 px-4 py-3 text-xs text-red-300 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 flex-shrink-0">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                          </svg>
                          {ui.paymentProofError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={ui.isSubmittingPaymentProof}
                        className="w-full px-8 py-4 bg-gradient-to-r from-[#007b8a] to-[#00a8bd] hover:from-[#00a8bd] hover:to-[#007b8a] disabled:opacity-60 disabled:cursor-not-allowed text-white font-black rounded-xl shadow-lg shadow-[#007b8a]/25 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        {ui.isSubmittingPaymentProof ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                            Submit Payment Proof
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                </div>
              </div>
            </div>
            )}
          </div>
        )}

        {/* 3.2 PAYMENT REVIEW VIEW: Payment Review Status (Premium Dark) */}
        {isPaymentUnderReview && (
          <div className="mx-auto max-w-2xl text-center py-12 animate-in zoom-in-95 duration-500 px-4">
            <div className="mb-8 flex justify-center relative">
              <div className="absolute inset-0 bg-[#007b8a]/20 blur-2xl rounded-full w-32 h-32 mx-auto animate-pulse" />
              <div className="h-24 w-24 rounded-full bg-[#002f35]/80 border border-[#007b8a]/40 shadow-[0_0_40px_rgba(0,123,138,0.25)] flex items-center justify-center relative z-10 backdrop-blur-md">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-[#00a8bd]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5h7.5m-7.5 3h7.5m-7.5 3h3" />
                </svg>
              </div>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.05em] uppercase text-[#00a8bd] mb-6 drop-shadow-[0_0_15px_rgba(0,168,189,0.3)]">
              PAYMENT UNDER REVIEW
            </h2>
            <p className="text-xl font-bold tracking-tight text-white mb-4">
              Hang tight, {uiDisplayName || 'Applicant'}!
            </p>
            <p className="text-base text-zinc-400 max-w-lg mx-auto leading-relaxed">
              We have received your payment submission. Our organizers are currently verifying the transaction. You will receive an update once it is confirmed.
            </p>

            {/* Application summary */}
            {userZustand && (
              <div className="mt-12 space-y-4 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#007b8a]/5 to-transparent pointer-events-none" />
                <div className="p-6 rounded-2xl bg-[#18181b] border border-zinc-800/80 shadow-2xl inline-block text-left text-sm text-zinc-400 min-w-[300px] relative z-10">
                  <div className="flex border-b border-zinc-800/80 pb-3 mb-3">
                    <span className="font-bold text-zinc-300 w-24">Applicant:</span>
                    <span className="text-zinc-500">{uiDisplayName || uiEmail}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-bold text-zinc-300 w-24">Status:</span>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#002f35]/50 border border-[#007b8a]/30 text-[#00a8bd] font-semibold text-xs tracking-wider uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00a8bd] animate-pulse" />
                      Pending Approval
                    </span>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

        {/* Rejected view removed: rejected applicants can proceed with payment proof via the payment form above */}

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

        {/* 5. PAYMENT SUCCESS & TICKET TAILOR VIEW */}
        {isTicketPhase && (
          <div className="animate-in fade-in zoom-in-95 duration-700">
            <div className="mx-auto max-w-3xl text-center py-12">
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
              <p className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-2xl mb-6">
                Your spot is secured!
              </p>

              <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-md mx-auto mb-8">
                Buy your ticket below. Once confirmed, you can proceed to the next phase.
              </p>

              <div className="mt-6 mb-8">
                {isTicketConfirmed ? (
                  <div className="bg-emerald-500/10 border border-emerald-400/40 rounded-2xl p-6 text-emerald-200 shadow-lg">
                    <div className="text-lg font-black uppercase tracking-wider opacity-90">Ticket bought successfully</div>
                  </div>
                ) : (
                  <>
                    <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-md mx-auto mb-8">
                      <span className="font-bold text-red-500">IMPORTANT:</span> MAKE SURE TO USE THE SAME GOOGLE EMAIL YOU REGISTERED WITH
                    </p>

                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-6 text-center">
                      Get your ticket
                    </h3>
                    <TicketTailorWidget email={uiEmail} />
                  </>
                )}
              </div>

              <div className={`${isTicketConfirmed ? "mt-6" : "-mt-16 sm:-mt-20"} flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10`}>
                <Button
                  onClick={handleCheckTicket}
                  disabled={ui.isCheckingTicket || isTicketConfirmed}
                  className="bg-[#007b8a] hover:bg-[#00606d] disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold py-3 px-10 rounded-full shadow-lg transition-all hover:scale-105"
                >
                  {ui.isCheckingTicket ? "Checking..." : "Check My Ticket"}
                </Button>
                <Button
                  onClick={handleDismissPaymentSuccess}
                  disabled={ui.isDismissingPayment || !isTicketConfirmed}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold py-3 px-10 rounded-full shadow-lg transition-all hover:scale-105"
                >
                  {ui.isDismissingPayment
                    ? "Continuing..."
                    : (userZustand?.major === "Medicine" || userZustand?.major === "Healthcare")
                      ? "Select Your Domain"
                      : "Go to Final Phase"}
                </Button>
              </div>
              {ui.ticketCheckError && (
                <p className="mt-4 text-sm text-red-400">{ui.ticketCheckError}</p>
              )}
              {ui.ticketCheckSuccess && (
                <p className="mt-4 text-sm text-emerald-400">{ui.ticketCheckSuccess}</p>
              )}
              {!isTicketConfirmed && (
                <p className="mt-4 text-xs text-zinc-500">
                  The continue button unlocks after your ticket is confirmed.
                </p>
              )}
            </div>
          </div>
        )}

        {/* 6. DOMAIN SELECTION VIEW (Medicine/Healthcare Only) */}
        {status === "domain_selection" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mx-auto max-w-5xl text-center mb-16">
              <h2 className="text-4xl sm:text-6xl font-black tracking-[-0.05em] uppercase text-[#007b8a] mb-4">
                Select a Domain
              </h2>
              <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-10 max-w-2xl mx-auto">
                Choose the domain that best fits your project. You can always refine this choice later with your team.
              </p>


              {/* Domain Grid: Premium Mission Briefing Style */}
              {!ui.isDomainConfirmed ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
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
                      onClick={() => updateUi({ selectedDomain: domain.id })}
                      className={`group relative p-6 sm:p-8 rounded-[2rem] border transition-all duration-500 cursor-pointer flex flex-col h-full ${ui.selectedDomain === domain.id
                        ? "bg-[#007b8a]/5 border-[#007b8a] shadow-[0_0_50px_rgba(0,123,138,0.15)] ring-1 ring-[#007b8a]/30"
                        : "bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800/80 hover:border-[#007b8a]/40"
                        }`}
                    >
                      {/* Selection Affordance Indicator */}
                      <div className="absolute top-6 right-6">
                        {ui.selectedDomain === domain.id ? (
                          <div className="w-6 h-6 rounded-full bg-[#007b8a] flex items-center justify-center shadow-[0_0_15px_rgba(0,123,138,0.5)] animate-in zoom-in duration-300">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-zinc-200 dark:border-zinc-800 group-hover:border-[#007b8a]/50 transition-colors flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-[#007b8a] opacity-0 group-hover:opacity-40 transition-opacity" />
                          </div>
                        )}
                      </div>

                      {/* Header Section */}
                      <div className="flex items-start gap-4 mb-8">
                        <div className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-500 group-hover:scale-110 ${ui.selectedDomain === domain.id ? "bg-[#007b8a] text-white shadow-lg shadow-[#007b8a]/30" : "bg-zinc-100 dark:bg-zinc-800 text-[#007b8a]"}`}>
                          {domain.icon}
                        </div>
                        <div className="text-left pr-8">
                          <span className="block text-[10px] font-black uppercase tracking-widest text-[#007b8a] mb-0.5">Domain {domain.id}</span>
                          <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white leading-tight group-hover:text-[#007b8a] transition-colors">
                            {domain.title}
                          </h3>
                        </div>
                      </div>

                      {/* Mission Brief Content */}
                      <div className="space-y-6 text-left flex-1">
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#007b8a] block mb-2 opacity-70">01. Tactical Scope</label>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed tabular-nums">
                            {domain.definition}
                          </p>
                        </div>

                        <div>
                          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#007b8a] block mb-2 opacity-70">02. Mission Objective</label>
                          <p className="text-[14px] font-bold text-zinc-800 dark:text-zinc-200 leading-snug">
                            {domain.goal}
                          </p>
                        </div>

                        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#007b8a] block mb-3 opacity-70">03. Project Precedents</label>
                          <div className="grid grid-cols-1 gap-2">
                            {domain.examples.map((ex, i) => (
                              <div key={i} className="bg-zinc-100/50 dark:bg-zinc-800/30 p-3 rounded-xl border border-transparent hover:border-[#007b8a]/10 transition-all">
                                <span className="text-[12px] font-bold text-zinc-900 dark:text-zinc-100 block">{ex.name}</span>
                                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight block">{ex.desc}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Technical Decorative ID */}
                      <div className="mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between">
                        <span className="font-mono text-[9px] font-black tracking-[0.2em] text-zinc-300 dark:text-zinc-700">
                          REF_CODE: MED_{domain.id}26
                        </span>
                        {ui.selectedDomain === domain.id && (
                          <span className="text-[10px] font-black uppercase text-[#007b8a] animate-pulse">Ready to Deploy</span>
                        )}
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
                      {ui.selectedDomain === "A" && (
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                      )}
                      {ui.selectedDomain === "B" && (
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      )}
                      {ui.selectedDomain === "C" && (
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>

                    <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2 leading-tight uppercase tracking-tight">
                      {ui.selectedDomain === "A" ? "Medical Tools & Hardware" :
                        ui.selectedDomain === "B" ? "Clinical Systems & Operations" :
                          "Digital Health & AI"}
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium">Domain {ui.selectedDomain} Selected</p>

                    {ui.isUpdatingDomain && (
                      <div className="mt-6 flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-[#007b8a]/30 border-t-[#007b8a] rounded-full animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#007b8a]">Updating mission files...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-10 flex flex-col items-center gap-6">
                {!ui.isDomainConfirmed ? (
                  <button
                    disabled={!ui.selectedDomain || ui.isUpdatingDomain}
                    onClick={handleConfirmDomain}
                    className={`px-12 py-3 rounded-full font-bold transition-all text-xs sm:text-sm uppercase tracking-widest shadow-lg ${ui.selectedDomain && !ui.isUpdatingDomain
                      ? "bg-[#007b8a] text-white hover:bg-[#00606b] hover:scale-105 active:scale-95 shadow-[#007b8a]/20"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                      }`}
                  >
                    {ui.isUpdatingDomain ? "Verifying..." : "Confirm"}
                  </button>
                ) : (
                  <button
                    disabled={!ui.isDomainSubmitted || ui.isUpdatingDomain}
                    onClick={handleGoToFinalPhase}
                    className={`px-12 py-2.5 rounded-full font-bold transition-all text-xs sm:text-sm uppercase tracking-widest shadow-lg ${ui.isDomainSubmitted && !ui.isUpdatingDomain
                      ? "bg-[#007b8a] text-white hover:bg-[#00606b] hover:scale-105 active:scale-95 shadow-[#007b8a]/20"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                      }`}
                  >
                    {ui.isUpdatingDomain ? "Verifying..." : "Go to Final Phase"}
                  </button>
                )}
                <p className="text-xs text-zinc-400 flex items-center gap-2">
                  {/* <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg> */}
                  {/* Selection is preliminary. You can finalize your domain choice during the team formation phase. */}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 6. FINAL PHASE VIEW: Reworked Mission Control Aesthetic */}
        {status === "final_phase" && (
          <div className="animate-in fade-in zoom-in-95 duration-1000">
            <div className="mx-auto max-w-4xl text-center py-12 relative">

              {/* Application Summary */}
              {userZustand && (
                <div className="mb-16 relative overflow-hidden rounded-2xl sm:rounded-[2.5rem] border border-white/10 bg-zinc-950 p-5 sm:p-10 shadow-2xl backdrop-blur-xl text-left group">
                  {/* Subtle Gradient Backdrops */}
                  <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#007b8a]/8 rounded-full blur-[120px] pointer-events-none group-hover:bg-[#007b8a]/12 transition-all duration-700" />
                  <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-teal-500/5 rounded-full blur-[120px] pointer-events-none" />

                  <div className="relative flex flex-col gap-3 mb-6 sm:mb-10 border-b border-white/5 pb-5 sm:pb-8 z-10">
                    <h3 className="text-lg sm:text-2xl font-black uppercase tracking-widest text-white flex items-center gap-2 sm:gap-3">
                      <User className="w-5 h-5 sm:w-6 sm:h-6 text-teal-500 shrink-0" />
                      Application Summary
                    </h3>
                    <p className="text-zinc-500 text-xs sm:text-sm font-medium hidden sm:block">Verify your registered details and ticket statuses below.</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-2 gap-3 sm:gap-6 relative z-10">
                    <div className="flex items-center gap-3 sm:gap-4 bg-white/[0.02] border border-white/5 p-3 sm:p-5 rounded-xl sm:rounded-2xl hover:bg-white/[0.04] transition-colors">
                      <div className="p-2.5 sm:p-4 bg-white/5 rounded-lg sm:rounded-xl text-zinc-400">
                        <User className="w-4 h-4 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] sm:text-xs uppercase tracking-wider text-zinc-500 font-bold mb-0.5 sm:mb-1">Name</p>
                        <p className="text-xs sm:text-base text-zinc-200 font-semibold truncate">{uiDisplayName || "N/A"}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 sm:gap-4 bg-white/[0.02] border border-white/5 p-3 sm:p-5 rounded-xl sm:rounded-2xl hover:bg-white/[0.04] transition-colors">
                      <div className="p-2.5 sm:p-4 bg-white/5 rounded-lg sm:rounded-xl text-zinc-400">
                        <Mail className="w-4 h-4 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <p className="text-[9px] sm:text-xs uppercase tracking-wider text-zinc-500 font-bold mb-0.5 sm:mb-1">Email</p>
                        <p className="text-xs sm:text-base text-zinc-200 font-semibold truncate">{uiEmail || "N/A"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 bg-white/[0.02] border border-white/5 p-3 sm:p-5 rounded-xl sm:rounded-2xl hover:bg-white/[0.04] transition-colors">
                      <div className="p-2.5 sm:p-4 bg-white/5 rounded-lg sm:rounded-xl text-zinc-400">
                        <GraduationCap className="w-4 h-4 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] sm:text-xs uppercase tracking-wider text-zinc-500 font-bold mb-0.5 sm:mb-1">Major</p>
                        <p className="text-xs sm:text-base text-zinc-200 font-semibold truncate">{userZustand.major || "N/A"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 bg-white/[0.02] border border-white/5 p-3 sm:p-5 rounded-xl sm:rounded-2xl hover:bg-white/[0.04] transition-colors">
                      <div className="p-2.5 sm:p-4 bg-white/5 rounded-lg sm:rounded-xl text-zinc-400">
                        <Calendar className="w-4 h-4 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] sm:text-xs uppercase tracking-wider text-zinc-500 font-bold mb-0.5 sm:mb-1">Year</p>
                        <p className="text-xs sm:text-base text-zinc-200 font-semibold truncate">{userZustand.year || "N/A"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 bg-white/[0.02] border border-white/5 p-3 sm:p-5 rounded-xl sm:rounded-2xl hover:bg-white/[0.04] transition-colors">
                      <div className="p-2.5 sm:p-4 bg-white/5 rounded-lg sm:rounded-xl text-zinc-400">
                        <Briefcase className="w-4 h-4 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] sm:text-xs uppercase tracking-wider text-zinc-500 font-bold mb-0.5 sm:mb-1">Specialization</p>
                        <p className="text-xs sm:text-base text-zinc-200 font-semibold truncate">{userZustand.majorType || "N/A"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 bg-[#007b8a]/10 border border-[#007b8a]/20 p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-[inset_0_0_20px_rgba(0,123,138,0.1)]">
                      <div className="p-2.5 sm:p-4 bg-[#007b8a]/20 rounded-lg sm:rounded-xl text-teal-400 shadow-[0_0_15px_rgba(0,123,138,0.3)]">
                        <Globe className="w-4 h-4 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] sm:text-xs uppercase tracking-wider text-teal-500/80 font-bold mb-0.5 sm:mb-1">Domain</p>
                        <p className="text-xs sm:text-base text-teal-300 font-bold truncate">{userZustand.domain || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Ticket Info - native details/summary */}
                  <details 
                    className="mt-6 sm:mt-8 relative z-10 group/details"
                    onToggle={(e) => {
                      const open = (e.target as HTMLDetailsElement).open;
                      updateUi({ isTicketPanelOpen: open });
                      if (open && !ui.ticketInfo && !ui.ticketInfoError) {
                        handleGetTicketInfo();
                      }
                    }}
                  >
                    <summary className="flex items-center gap-1.5 text-zinc-500 hover:text-teal-400 transition-colors text-[11px] sm:text-xs font-semibold tracking-wider uppercase cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none">
                      <Ticket className="w-3.5 h-3.5" />
                      More Details
                      <ChevronDown className="w-3.5 h-3.5 transition-transform duration-300" style={{ transform: ui.isTicketPanelOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                    </summary>
                    <div className="mt-4 animate-in fade-in duration-300">
                      {ui.isFetchingTicketInfo && (
                        <div className="flex items-center justify-center gap-3 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                          <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-zinc-400 text-sm font-medium">Fetching ticket details...</span>
                        </div>
                      )}

                      {ui.ticketInfo && (
                        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 p-4 sm:p-6 rounded-xl sm:rounded-[1.5rem] bg-teal-500/10 border border-teal-500/20">
                          <div className="p-3 sm:p-4 bg-teal-500/20 rounded-xl text-teal-400">
                            <Ticket className="w-6 h-6 sm:w-8 sm:h-8" />
                          </div>
                          <div className="flex flex-col text-center sm:text-left">
                            <p className="text-[10px] sm:text-[11px] uppercase tracking-widest text-teal-500/90 font-bold mb-1.5">Confirmed Ticket</p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                              <span className="text-teal-300 font-medium text-xs sm:text-sm">Order: <strong className="text-teal-100 tracking-widest ml-1">{ui.ticketInfo.orderId || "N/A"}</strong></span>
                              <span className="hidden sm:block text-teal-500/50">|</span>
                              <span className="text-teal-300 font-medium text-xs sm:text-sm">Code: <strong className="text-teal-100 tracking-widest ml-1">{ui.ticketInfo.ticketCode || "N/A"}</strong></span>
                            </div>
                          </div>
                        </div>
                      )}

                      {ui.ticketInfoError && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-medium text-sm flex items-center justify-center">
                          {ui.ticketInfoError}
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}

              {/* New Prominent Header */}
              <div className="mb-12">
                <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-zinc-900 dark:text-white uppercase">
                  The <span className="text-[#007b8a]">Countdown</span> Begins
                </h2>
                <div className="mt-4 h-1 w-24 bg-[#007b8a] mx-auto rounded-full" />
              </div>

              {/* Reworked Timer */}
              <div className="mb-12">
                <CountdownTimer targetDate="2026-05-23T09:00:00" />
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
