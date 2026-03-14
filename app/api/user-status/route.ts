import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

type AppDecision = "pending" | "accepted" | "rejected";
type PaymentReviewStatus = "not_submitted" | "under_review" | "approved" | "rejected";
type WorkflowStatus =
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

function normalizeStatus(value: unknown): string {
    if (typeof value !== "string") return "";
    return value.trim().toLowerCase();
}

function deriveAppDecision(statusValue: unknown): AppDecision {
    const status = normalizeStatus(statusValue);
    if (status === "accepted") return "accepted";
    if (status === "rejected") return "rejected";
    return "pending";
}

function derivePaymentReviewStatus(data: Record<string, any>): PaymentReviewStatus {
    if (data.payment?.reviewStatus && typeof data.payment.reviewStatus === "string") {
        const normalized = normalizeStatus(data.payment.reviewStatus);
        if (normalized === "approved") return "approved";
        if (normalized === "rejected") return "rejected";
        if (normalized === "under_review") return "under_review";
        if (normalized === "not_submitted") return "not_submitted";
    }

    if (data.paymentSuccessful === true) return "approved";
    if (data.paymentSuccessful === false) return "rejected";
    if (data.isPaid === true || data.isPayed === true) return "approved";
    if (data.paymentProofSubmitted === true || data.paymentSubmitted === true) return "under_review";
    return "not_submitted";
}

function normalizeWorkflowStatus(data: Record<string, any>): WorkflowStatus {
    const raw = normalizeStatus(data.status || data.workflowStatus);

    switch (raw) {
        case "guest":
            return "guest";
        case "loading":
            return "loading";
        case "pending":
            return "pending";
        case "accepted":
        case "approved_awaiting_payment_submission":
            return "approved_awaiting_payment_submission";
        case "rejected":
        case "rejected_awaiting_payment_submission":
            return "rejected_awaiting_payment_submission";
        case "pending_payment":
        case "payment_under_review":
        case "payment_submitted_under_review":
            return "payment_submitted_under_review";
        case "payment_rejected":
            return "payment_rejected";
        case "payment_success":
        case "payment_confirmed":
            return "payment_confirmed";
        case "domain_selection":
            return "domain_selection";
        case "final_phase":
            return "final_phase";
    }

    // Derive app decision and payment status
    const appDecision = deriveAppDecision(data.status);
    const paymentStatus = derivePaymentReviewStatus(data);

    // If rejected, return rejected_awaiting_payment_submission
    if (appDecision === "rejected") return "rejected_awaiting_payment_submission";
    if (appDecision === "pending") return "pending";

    // If payment is approved, return payment_confirmed
    if (paymentStatus === "approved") return "payment_confirmed";
    if (paymentStatus === "rejected") return "payment_rejected";
    if (paymentStatus === "under_review") return "payment_submitted_under_review";

    return "approved_awaiting_payment_submission";
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { uid, idToken } = body;

        if (!uid) {
            return NextResponse.json({ error: "uid is required" }, { status: 400 });
        }

        if (!idToken) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        // ============================================
        // AUTHENTICATION & AUTHORIZATION
        // ============================================
        let decodedToken;
        try {
            // Verify the Firebase ID token
            decodedToken = await adminAuth.verifyIdToken(idToken, true);
        } catch (error) {
            console.error("[UserStatus] Token verification failed:", error);
            return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
        }

        // Authorization: User can only read their own status, unless they're an admin
        const isAdmin = decodedToken.admin === true;
        const isOwnStatus = decodedToken.uid === uid;

        if (!isOwnStatus && !isAdmin) {
            console.log(`[UserStatus] Forbidden: ${decodedToken.email} tried to access ${uid}'s status`);
            return NextResponse.json(
                { error: "Forbidden - You can only view your own status" },
                { status: 403 }
            );
        }

        console.log(`[UserStatus] ${decodedToken.email} checking status for ${uid} (admin: ${isAdmin})`);

        // ============================================
        // FETCH USER STATUS
        // ============================================
        // 1. Check Attendees collection
        const userDoc = await adminDb.collection("attendees").doc(uid).get();
        if (userDoc.exists && userDoc.data()?.submitted === true) {
            const userData = userDoc.data();
            if (userData) {
                const workflowStatus = normalizeWorkflowStatus(userData);
                return NextResponse.json({
                    status: true,
                    type: "attendee",
                    workflowStatus,
                    user: {
                        uid,
                        email: userData.email || decodedToken.email || "",
                        major: userData.major || "",
                        year: userData.year || "",
                        majorType: userData.majorType || "",
                        domain: userData.domain || "",
                        status: workflowStatus,
                        submissionType: "attendee",
                    },
                    isPaid: userData.isPaid || userData.isPayed || false,
                }, { status: 200 });
            }
        }

        // 2. Check Competitors collection
        const competitorDoc = await adminDb.collection("competitors").doc(uid).get();
        if (competitorDoc.exists && competitorDoc.data()?.submitted === true) {
            const competitorData = competitorDoc.data();
            if (competitorData) {
                const workflowStatus = normalizeWorkflowStatus(competitorData);
                return NextResponse.json({
                    status: true,
                    type: "competitor",
                    workflowStatus,
                    user: {
                        uid,
                        email: competitorData.email || competitorData.universityEmail || decodedToken.email || "",
                        major: competitorData.major || "",
                        year: competitorData.year || "",
                        majorType: competitorData.majorType || "",
                        domain: competitorData.domain || "",
                        submissionType: "competitor",
                    },
                    isPaid: competitorData.isPaid || competitorData.isPayed || false,
                }, { status: 200 });
            }
        }

        return NextResponse.json({ status: false }, { status: 200 });
    } catch (error) {
        console.error("Error checking user submission status:", error);
        return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
    }
}
