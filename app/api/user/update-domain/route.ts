import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { logger } from "@/lib/logger";

// --------------------------------------------------
// Purpose: User (Healthcare) choose their own domain
// --------------------------------------------------

const DOMAIN_NAMES: Record<"A" | "B" | "C", string> = {
    A: "Medical Tools & Hardware",
    B: "Clinical Systems & Operations",
    C: "Digital Health & AI",
};

export async function POST(request: NextRequest) {
    const requestId = logger.getRequestId();

    const body = await request.json();
    const { idToken, domain, competitorId } = body as { idToken: string; domain: string; competitorId: string };

    if (!idToken) {
        return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    if (!domain) {
        return NextResponse.json({ error: "Missing domain" }, { status: 400 });
    }

    try {
        // 1. Verify Admin Session
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(idToken);
        } catch (error: any) {
            const errorMessage = error.message || String(error);

            if (errorMessage.includes("FORBIDDEN")) {
                logger.warn("Forbidden domain update attempt", { requestId, error: errorMessage });
                return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
            }

            logger.warn("Unauthorized domain update attempt", { requestId, error: errorMessage });
            return NextResponse.json({ error: "Unauthorized - Please sign in as admin" }, { status: 401 });
        }

        if (!["A", "B", "C"].includes(domain)) {
            return NextResponse.json({ error: "Invalid domain value. Must be A, B, or C." }, { status: 400 });
        }

        const uid = decodedToken.uid;
        if (!uid) {
            return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
        }

        // 4. Find and Update User in Firestore
        const competitorRef = adminDb.collection("competitors").doc(String(uid));
        const competitorDoc = await competitorRef.get();

        // 5. Validate Competitor Exists
        if (!competitorDoc.exists) {
            logger.error("Competitor not found", { requestId, competitorId });
            return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
        }

        const data = competitorDoc.data() || {};
        const major = data.major;
        if (major !== "Medicine" && major !== "Healthcare") {
            return NextResponse.json({ error: "Domain selection is only available for Medicine/Healthcare" }, { status: 400 });
        }

        const currentStatus = String(data.status || data.workflowStatus || "").toLowerCase();
        if (currentStatus !== "domain_selection") {
            return NextResponse.json({ error: "Error in flow" }, { status: 403 });
        }

        // 6. Update Domain in Firestore
        const oldDomain = competitorDoc.data()?.domain || "";
        const now = new Date().toISOString();
        const fullDomain = `${domain}: ${DOMAIN_NAMES[domain as "A" | "B" | "C"]}`;


        await competitorRef.update({
            domain: fullDomain,
            updatedAt: now,
            status: "domain_selected",
            lastDomainChangeBy: decodedToken.email,
            lastDomainChangeAt: now,
        });

        // 7. Return Success Response
        return NextResponse.json({
            success: true,
            domain: fullDomain,
            oldDomain,
            changedBy: decodedToken.email,
        });
    } catch (error) {
        // 8. Handle Unexpected Errors
        logger.error("Critical failure in domain update route", { requestId, error });
        return NextResponse.json({ error: "Internal server error during domain update" }, { status: 500 });
    }
}
