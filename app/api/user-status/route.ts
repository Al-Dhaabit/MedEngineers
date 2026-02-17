import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

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
                return NextResponse.json({
                    status: true,
                    type: "attendee",
                    actualStatus: userData.status || "pending",
                    isPaid: userData.isPaid || userData.isPayed || false,
                    major: userData.major || ""
                }, { status: 200 });
            }
        }

        // 2. Check Competitors collection
        const competitorDoc = await adminDb.collection("competitors").doc(uid).get();
        if (competitorDoc.exists && competitorDoc.data()?.submitted === true) {
            const competitorData = competitorDoc.data();
            if (competitorData) {
                return NextResponse.json({
                    status: true,
                    type: "competitor",
                    actualStatus: competitorData.status || "pending",
                    isPaid: competitorData.isPaid || competitorData.isPayed || false,
                    major: competitorData.major || ""
                }, { status: 200 });
            }
        }

        return NextResponse.json({ status: false }, { status: 200 });
    } catch (error) {
        console.error("Error checking user submission status:", error);
        return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
    }
}
