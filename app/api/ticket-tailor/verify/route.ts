import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import admin from "firebase-admin";

type TargetCollection = "attendees" | "competitors";

async function findUserCollection(uid: string): Promise<TargetCollection | null> {
    const attendeeDoc = await adminDb.collection("attendees").doc(uid).get();
    if (attendeeDoc.exists && attendeeDoc.data()?.submitted === true) {
        return "attendees";
    }

    const competitorDoc = await adminDb.collection("competitors").doc(uid).get();
    if (competitorDoc.exists && competitorDoc.data()?.submitted === true) {
        return "competitors";
    }

    return null;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { idToken } = body as { idToken?: string };

        if (!idToken) {
            return NextResponse.json({ error: "idToken is required" }, { status: 400 });
        }

        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(idToken);
        } catch (error) {
            console.error("[TicketTailor Verify] Token verification failed:", error);
            return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
        }

        const uid = decodedToken.uid;
        const collection = await findUserCollection(uid);
        if (!collection) {
            return NextResponse.json({ error: "User application not found" }, { status: 404 });
        }

        const docRef = adminDb.collection(collection).doc(uid);
        const docSnap = await docRef.get();
        const data = docSnap.data() || {};
        const userEmail = decodedToken.email?.toLowerCase();

        if (!userEmail) {
            return NextResponse.json({ error: "User email not found" }, { status: 400 });
        }

        const apiKey = process.env.NEXT_PUBLIC_TICKET_TAILOR_API_KEY;
        const eventId = process.env.TICKET_TAILOR_EVENT_ID;
        if (!apiKey || !eventId) {
            return NextResponse.json({ error: "Ticket Tailor API credentials are missing" }, { status: 500 });
        }

        const authHeader = Buffer.from(`${apiKey}:`).toString("base64");
        const apiUrl = `https://api.tickettailor.com/v1/issued_tickets?event_id=${encodeURIComponent(eventId)}&email=${encodeURIComponent(userEmail.toLowerCase())}&status=valid`;

        const apiRes = await fetch(apiUrl.toString(), {
            headers: {
                Authorization: `Basic ${authHeader}`,
                "Accept": "application/json",
            },
        });

        if (!apiRes.ok) {
            const errText = await apiRes.text();
            console.error("[TicketTailor Verify] API error:", apiRes.status, errText);
            return NextResponse.json({ error: "Ticket Tailor API request failed" }, { status: 502 });
        }

        const apiData = await apiRes.json();
        const tickets: any[] = Array.isArray(apiData?.data) ? apiData.data : [];

        if (tickets.length === 0) {
            return NextResponse.json({ error: "No valid ticket found for this email" }, { status: 404 });
        }

        // Now you have the ticket directly without finding it in a list
        const ticket = tickets[0];
        let ticketCode = ticket.barcode || ticket.id; // Issued tickets use 'barcode'
        let orderId = ticket.order_id;

        if (ticket.status !== "valid") {
            return NextResponse.json({ error: "Ticket is not valid" }, { status: 400 });
        }
        ticketCode =
            ticket?.issued_tickets?.[0]?.barcode ||
            ticket?.issued_tickets?.[0]?.code ||
            ticket?.issued_tickets?.[0]?.ticket_code ||
            ticket?.tickets?.[0]?.ticket_code ||
            ticket?.tickets?.[0]?.code ||
            null;

        const now = new Date().toISOString();
        await docRef.update({
            status: "ticket_confirmed",
            ticketBought: true,
            ticketTailor: {
                reviewStatus: "approved",
                reviewedAt: now,
                reviewedBy: "tickettailor_api_check",
                ticketDate: now,
                orderId: ticket.id,
                ticketCode: ticketCode,
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true, ticketId: ticket.id });
    } catch (error) {
        console.error("[TicketTailor Verify] Internal Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
