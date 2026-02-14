import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { uid } = body;

        if (!uid) {
            return NextResponse.json({ error: "uid is required" }, { status: 400 });
        }

        // 1. Check Attendees collection
        const userDoc = await adminDb.collection("attendees").doc(uid).get();
        if (userDoc.exists && userDoc.data()?.submitted === true) {
            const userData = userDoc.data();
            if (userData) {
                return NextResponse.json({
                    status: true,
                    type: "attendee",
                    actualStatus: userData.status || "pending"
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
                    actualStatus: competitorData.status || "pending"
                }, { status: 200 });
            }
        }

        return NextResponse.json({ status: false }, { status: 200 });
    } catch (error) {
        console.error("Error checking user submission status:", error);
        return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
    }
}
