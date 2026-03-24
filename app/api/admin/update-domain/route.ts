import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminSession } from "@/lib/adminAuth";
import admin from "firebase-admin";
import { logger } from "@/lib/logger";

// -----------------------------------------------------------
// Purpose: Admin sets the domain for the Engineering students 
// -----------------------------------------------------------

const DOMAIN_NAMES: Record<"A" | "B" | "C", string> = {
    A: "Medical Tools & Hardware",
    B: "Clinical Systems & Operations",
    C: "Digital Health & AI",
};

export async function POST(request: NextRequest) {
    const requestId = logger.getRequestId();

    try {
        let adminUser;
        try {
            adminUser = await verifyAdminSession();
        } catch (error: any) {
            const errorMessage = error.message || String(error);

            if (errorMessage.includes("FORBIDDEN")) {
                logger.warn("Forbidden domain update attempt", { requestId, error: errorMessage });
                return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
            }

            logger.warn("Unauthorized domain update attempt", { requestId, error: errorMessage });
            return NextResponse.json({ error: "Unauthorized - Please sign in as admin" }, { status: 401 });
        }

        const body = await request.json();
        const { competitorId, domain } = body ?? {};

        if (!competitorId || !domain) {
            return NextResponse.json({ error: "Missing competitorId or domain" }, { status: 400 });
        }

        if (!["A", "B", "C"].includes(domain)) {
            return NextResponse.json({ error: "Invalid domain value. Must be A, B, or C." }, { status: 400 });
        }

        const competitorRef = adminDb.collection("competitors").doc(String(competitorId));
        const competitorDoc = await competitorRef.get();

        if (!competitorDoc.exists) {
            logger.error("Competitor not found", { requestId, competitorId });
            return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
        }

        const oldDomain = competitorDoc.data()?.domain || "";
        const now = new Date().toISOString();
        const fullDomain = `${domain}: ${DOMAIN_NAMES[domain as "A" | "B" | "C"]}`;

        await competitorRef.update({
            domain: fullDomain,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastDomainChangeBy: adminUser.email,
            lastDomainChangeAt: now,
        });

        return NextResponse.json({
            success: true,
            domain: fullDomain,
            oldDomain,
            changedBy: adminUser.email,
        });
    } catch (error) {
        logger.error("Critical failure in domain update route", { requestId, error });
        return NextResponse.json({ error: "Internal server error during domain update" }, { status: 500 });
    }
}
