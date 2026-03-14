"use client";

import { create } from "zustand";

// Database status values
export type workFlowStatus =
  | "guest"
  | "loading"
  | "pending"
  | "approved_awaiting_payment_submission"
  | "rejected_awaiting_payment_submission"
  | "payment_submitted_under_review"
  | "payment_rejected"
  | "payment_confirmed"
  | "domain_selection"
  | "final_phase";

// Events that trigger state transitions
export type RegistrationEvent =
  | "FORM_SUBMITTED"
  | "APPLICATION_ACCEPTED"
  | "APPLICATION_REJECTED"
  | "PAYMENT_PROOF_SUBMITTED"
  | "PAYMENT_PROOF_RESUBMITTED"
  | "PAYMENT_APPROVED"
  | "PAYMENT_REJECTED"
  | "DISMISS_PAYMENT_SUCCESS"
  | "DOMAIN_CONFIRMED";

export interface RegistrationUser {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  major?: "Engineering" | "Medicine" | "Healthcare";
  year?: string | null;
  majorType?: string | null;
  domain?: string | null;
  submissionType?: "attendee" | "competitor";
}

interface RegistrationStore {
  status: workFlowStatus;
  userZustand: RegistrationUser | null;

  // Actions
  setUser: (user: RegistrationUser | null) => void;
  setStatus: (status: workFlowStatus) => void;
  transition: (event: RegistrationEvent) => void;
  hydrateFromServer: (payload: {
    status?: workFlowStatus;
    user?: RegistrationUser | null;
  }) => void;
}

const transitionTable: Record<workFlowStatus, Partial<Record<RegistrationEvent, workFlowStatus | ((user: RegistrationUser | null) => workFlowStatus)>>> = {
  guest: {
    FORM_SUBMITTED: "pending"
  },

  // Loading resolves to actual state via hydrateFromServer
  loading: {},

  pending: {
    APPLICATION_ACCEPTED: "approved_awaiting_payment_submission",
    APPLICATION_REJECTED: "rejected_awaiting_payment_submission",
  },

  approved_awaiting_payment_submission: {
    PAYMENT_PROOF_SUBMITTED: "payment_submitted_under_review",
  },

  rejected_awaiting_payment_submission: {
    PAYMENT_PROOF_SUBMITTED: "payment_submitted_under_review",
  },

  payment_submitted_under_review: {
    PAYMENT_APPROVED: "payment_confirmed",
    PAYMENT_REJECTED: "payment_rejected",
  },

  payment_rejected: {
    PAYMENT_PROOF_RESUBMITTED: "payment_submitted_under_review",
  },

  // After payment is confirmed, route based on user's major
  payment_confirmed: {
    DISMISS_PAYMENT_SUCCESS: (user) => {
      if (user?.major === "Engineering") return "final_phase";
      else if (user?.major === "Medicine" || user?.major === "Healthcare") return "domain_selection";
      return "final_phase"; // fallback
    }
  },

  domain_selection: {
    DOMAIN_CONFIRMED: "final_phase",
  },

  // Terminal state
  final_phase: {},
};

export const useRegistrationStore = create<RegistrationStore>((set, get) => ({
  status: "loading",
  userZustand: null,

  setUser: (user) => set({ userZustand: user }),

  setStatus: (status) => set({ status }),

  hydrateFromServer: (payload) =>
    set((state) => ({
      status: payload.status ?? state.status,
      userZustand: payload.user ?? state.userZustand,
    })),

  transition: (event) => {
    const current = get().status;
    const user = get().userZustand;
    const nextTransition = transitionTable[current]?.[event];

    if (!nextTransition) {
      console.warn(`⚠️ No transition for event "${event}" in state "${current}"`);
      return;
    }

    // Handle function transitions (conditional logic)
    const next = typeof nextTransition === "function"
      ? nextTransition(user)
      : nextTransition;

    console.log(`FSM Transition: ${current} --[${event}]--> ${next}`);
    set({ status: next });
  },
}));
