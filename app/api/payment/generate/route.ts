import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { uid } = body;

        // 1. Verify user is "Accepted" in Firebase
        const userDoc = await adminDb.collection("competitors").doc(uid).get();
        if (!userDoc.exists || userDoc.data()?.status !== "Accepted") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const userData = userDoc.data();

        // 2. Return the Ticket Tailor Checkout URL
        // We redirect the user to the public checkout page to purchase their ticket.
        // NOTE: The "Issued Tickets" API (used previously) is for admin issuing only and incurs costs/errors.

        const CHECKOUT_URL = "https://www.tickettailor.com/checkout/view-event/id/7638691/chk/500f/";

        return NextResponse.json({
            url: `${CHECKOUT_URL}?ref=medhack_app`
        });

    } catch (error) {
        console.error("Payment Link Error:", error);
        return NextResponse.json({ error: "Failed to create link" }, { status: 500 });
    }
}