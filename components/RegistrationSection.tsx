"use client";

import { useEffect, useCallback, useReducer, type FormEvent, useState } from "react";
import { CustomApplicationForm } from "./CustomApplicationForm";
import { auth } from "@/lib/Firebase";
import { Button } from "@/components/ui/button";
import { retrieveFormData, hasValidStoredData, clearStoredData } from "@/lib/secureStorage";
import { useAuth } from "@/lib/AuthContext";
import { useRegistrationStore, type workFlowStatus } from "@/lib/registrationStore";

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
    selectedDomain: string | null;
    expandedDomain: string | null;
    isUpdatingDomain: boolean;
    isDomainConfirmed: boolean;
    isDomainSubmitted: boolean;
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
      selectedDomain: null,
      expandedDomain: null,
      isUpdatingDomain: false,
      isDomainConfirmed: false,
      isDomainSubmitted: false,
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
      console.log(`Checking status for UID: ${authUser.uid} (Attempt ${retryCount + 1})`);

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
      user?.uid
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
      alert("Failed to confirm domain: " + error.message);
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
      alert("Failed to continue: " + error.message);
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
              "domain_selection",
              "final_phase",
            ] as workFlowStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatus(s);
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


              {status === "approved_awaiting_payment_submission" && (
                <p className="text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
                  Next step: Please complete the payment to secure your spot. Make a bank transfer using the details below and submit your transaction ID.
                </p>
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

            <div className="mx-auto max-w-4xl space-y-10 px-4 pb-24">
              {/* Bank Account Details */}
              <div className="bg-[#18181b] rounded-2xl shadow-2xl border border-zinc-800/80 overflow-hidden">
                <div className="bg-[#007b8a] px-6 py-5 flex items-center justify-center border-b border-[#005a65]">
                  <h3 className="text-white font-bold text-lg tracking-wide">BANK ACCOUNT DETAILS</h3>
                </div>
                <div className="p-8 sm:p-12 relative">
                  {/* Subtle inner glow */}
                  <div className="absolute inset-0 bg-gradient-to-b from-[#007b8a]/5 to-transparent pointer-events-none" />

                  <div className="max-w-2xl mx-auto border border-zinc-800/80 rounded-xl overflow-hidden bg-[#1f1f22] relative z-10 shadow-inner">
                    <div className="divide-y divide-zinc-800/80 text-[14px] sm:text-[15px]">
                      {[
                        { label: "Account Name", value: "RIT Dubai FZE", isMedium: true },
                        { label: "Bank Name", value: "Emirates NBD PJSC" },
                        { label: "Branch", value: "Dubai Silicon Oasis" },
                        { label: "Account Number", value: "1102425560201", isMono: true },
                        { label: "SWIFT Code", value: "EBILAEAD", isMono: true },
                        { label: "IBAN Code", value: "AE390260001102425560201", isMono: true, breakAll: true },
                      ].map((item, i) => (
                        <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between hover:bg-zinc-800/30 transition-colors px-4 py-4 sm:px-8 sm:py-5">
                          <div className="font-bold text-zinc-200 w-full sm:w-1/3 mb-1 sm:mb-0 uppercase tracking-tight text-[11px] sm:text-xs">
                            {item.label}
                          </div>
                          <div className={`text-zinc-400 ${item.isMedium ? 'font-medium' : ''} ${item.isMono ? 'font-mono tracking-wider' : ''} ${item.breakAll ? 'break-all' : ''} flex-1 sm:text-right text-sm sm:text-base`}>
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Google Form Submission Placeholder */}
              <div className="bg-[#18181b] rounded-2xl shadow-2xl border border-zinc-800/80 overflow-hidden">
                <div className="bg-black px-6 py-5 flex items-center justify-center border-b border-zinc-900">
                  <h3 className="text-white font-bold text-lg tracking-wide uppercase">SUBMIT PAYMENT PROOF</h3>
                </div>
                <div className="p-4 sm:p-10">
                  <form onSubmit={handlePaymentProofSubmit} className="bg-[#1f1f22] rounded-xl border border-zinc-700/60 p-5 sm:p-8 space-y-5 sm:space-y-6">
                    <div className="text-left">
                      <label htmlFor="transaction-id" className="block text-xs sm:text-sm font-semibold text-zinc-200 mb-2 uppercase tracking-wider">
                        Transaction ID
                      </label>
                      <input
                        id="transaction-id"
                        type="text"
                        value={ui.transactionID}
                        onChange={(e) => updateUi({ transactionID: e.target.value })}
                        placeholder="Enter bank transaction ID"
                        className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#007b8a]"
                        required
                      />
                    </div>

                    <div className="text-left">
                      <label htmlFor="payment-proof-file" className="block text-xs sm:text-sm font-semibold text-zinc-200 mb-2 uppercase tracking-wider">
                        Payment Proof File
                      </label>
                      <input
                        id="payment-proof-file"
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          updateUi({ paymentProofFile: file });
                        }}
                        className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-zinc-300 file:mr-3 file:sm:mr-4 file:rounded-md file:border-0 file:bg-[#007b8a] file:px-3 file:py-2 file:text-[10px] file:sm:text-sm file:font-bold file:uppercase file:tracking-wider file:text-white hover:file:bg-[#00a8bd]"
                        required
                      />
                      <p className="mt-2 text-[10px] sm:text-xs text-zinc-500">Accepted: PDF, PNG, JPG, WEBP. Max: 700KB.</p>
                    </div>

                    {ui.paymentProofError && (
                      <div className="rounded-lg border border-red-800/60 bg-red-900/20 px-4 py-3 text-xs text-red-300">
                        {ui.paymentProofError}
                      </div>
                    )}

                    <div className="flex justify-center">
                      <button
                        type="submit"
                        disabled={ui.isSubmittingPaymentProof}
                        className="w-full sm:w-fit sm:min-w-[180px] px-8 py-2.5 bg-[#007b8a] hover:bg-[#00a8bd] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-lg shadow-[#007b8a]/20 transition-all text-xs sm:text-sm uppercase tracking-widest"
                      >
                        {ui.isSubmittingPaymentProof ? "Submitting..." : "Submit"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
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

        {/* 5. PAYMENT SUCCESS VIEW */}
        {status === "payment_confirmed" && (
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
                onClick={handleDismissPaymentSuccess}
                disabled={ui.isDismissingPayment}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold py-3 px-12 rounded-full shadow-lg transition-all hover:scale-105"
              >
                {ui.isDismissingPayment
                  ? "Continuing..."
                  : (userZustand?.major === "Medicine" || userZustand?.major === "Healthcare")
                    ? "Select Your Domain"
                    : "Go to Final Phase"}
              </Button>
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
                <div className="mb-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-6 text-left">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#007b8a] mb-4">
                    Application Summary
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-zinc-700 dark:text-zinc-300">
                    <div><span className="font-semibold">Name:</span> {uiDisplayName || "N/A"}</div>
                    <div><span className="font-semibold">Email:</span> {uiEmail || "N/A"}</div>
                    <div><span className="font-semibold">Year:</span> {userZustand.year || "N/A"}</div>
                    <div><span className="font-semibold">Major:</span> {userZustand.major || "N/A"}</div>
                    <div><span className="font-semibold">Major Type:</span> {userZustand.majorType || "N/A"}</div>
                    <div><span className="font-semibold">Domain:</span> {userZustand.domain || "N/A"}</div>
                  </div>
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
