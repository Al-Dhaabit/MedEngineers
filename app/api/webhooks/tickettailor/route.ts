import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import crypto from "crypto";

export async function POST(req: NextRequest) {
    try {
        const bodyText = await req.text();

        // --- 1. Signature Verification ---
        const signatureHeader = req.headers.get("Tickettailor-Webhook-Signature");
        const webhookSecret = process.env.TICKET_TAILOR_WEBHOOK_SECRET;

        if (webhookSecret) {
            if (!signatureHeader) {
                console.error("[Webhook] Error: Missing signature header");
                return NextResponse.json({ error: "Missing signature header" }, { status: 401 });
            }

            // Header format: t=timestamp,s=signature (or v1=signature)
            const parts = signatureHeader.split(",");
            let timestamp = "";
            let signature = "";

            parts.forEach(part => {
                const [key, value] = part.split("=");
                if (key === "t") timestamp = value;
                if (key === "s" || key === "v1") signature = value;
            });

            if (!timestamp || !signature) {
                console.error("[Webhook] Error: Invalid signature header format", signatureHeader);
                return NextResponse.json({ error: "Invalid signature header format" }, { status: 401 });
            }

            const requestTime = parseInt(timestamp, 10);
            const now = Math.floor(Date.now() / 1000);

            // Log for debugging
            console.log(`[Webhook] Verifying signature. Timestamp: ${requestTime}, Now: ${now}`);

            if (isNaN(requestTime) || now - requestTime > 300) {
                // Relaxed check for dev/testing replay if needed, but keeping standard 5m here
                console.error("[Webhook] Error: Request timestamp too old");
                return NextResponse.json({ error: "Request timestamp too old" }, { status: 401 });
            }

            const payloadToSign = timestamp + bodyText;
            const expectedSignature = crypto
                .createHmac("sha256", webhookSecret)
                .update(payloadToSign)
                .digest("hex");

            // Timing safe comparison
            const isValid = crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            );

            if (!isValid) {
                console.error(`[Webhook] Error: Invalid signature.`);
                console.error(`Received: ${signature}`);
                console.error(`Expected: ${expectedSignature}`);
                console.error(`Secret (first 4): ${webhookSecret.substring(0, 4)}...`);
                return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
            }
        } else {
            console.warn("[Webhook] Warning: TICKET_TAILOR_WEBHOOK_SECRET not set. Skipping verification.");
        }

        // --- 2. Parse Body ---
        let body;
        try {
            body = JSON.parse(bodyText);
        } catch (e) {
            return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const eventType = (body.event || "").toLowerCase();
        console.log(`[Webhook] Normalized event: ${eventType} (from: ${body.event})`);

        if (eventType !== "order.created" && eventType !== "order.completed") {
            console.log(`[Webhook] Ignoring event: ${eventType}`);
            return NextResponse.json({ message: "Ignored event" }, { status: 200 });
        }

        const order = body.payload || {};
        // Ticket Tailor stores the email in buyer_details.email for orders
        const customerEmail = (order.buyer_details?.email || order.email)?.toLowerCase();

        if (!customerEmail) {
            console.error(`[Webhook] Error: No email found in payload. Payload keys: ${Object.keys(order).join(", ")}`);
            console.log(`[Webhook] Full Payload:`, JSON.stringify(order, null, 2));
            return NextResponse.json({ error: "No email in payload" }, { status: 400 });
        }

        console.log(`[Webhook] Processing order ${order.id} for: ${customerEmail}`);

        // --- 3. Find User ---
        const results = new Map(); // Map<docId, DocumentSnapshot>

        // A. Try Auth Lookup (Reliable)
        try {
            const userRecord = await adminAuth.getUserByEmail(customerEmail);
            console.log(`[Webhook] Found Auth User UID: ${userRecord.uid}`);

            // Check existence in both collections
            const attendeeDoc = await adminDb.collection("attendees").doc(userRecord.uid).get();
            if (attendeeDoc.exists) results.set(attendeeDoc.id, attendeeDoc);

            const competitorDoc = await adminDb.collection("competitors").doc(userRecord.uid).get();
            if (competitorDoc.exists) results.set(competitorDoc.id, competitorDoc);

        } catch (e) {
            console.log(`[Webhook] User not found in Auth by email ${customerEmail}.`);
        }

        // B. Fallback: Search Collections directly (Reliable for mismatches)
        // We do this if no results from Auth, OR just to be safe and find any doc with this email.
        if (results.size === 0) {
            console.log(`[Webhook] Searching collections for ${customerEmail}...`);
            const collections = ["attendees", "competitors"];

            for (const col of collections) {
                // Search primary email
                const q1 = await adminDb.collection(col).where("email", "==", customerEmail).get();
                q1.forEach(doc => results.set(doc.id, doc));

                // Search university email
                const q2 = await adminDb.collection(col).where("university_email", "==", customerEmail).get();
                q2.forEach(doc => results.set(doc.id, doc));
            }
        }

        if (results.size === 0) {
            console.warn(`[Webhook] User NOT found for email: ${customerEmail}`);
            return NextResponse.json({ message: "User not found" }, { status: 200 });
        }

        // --- 4. Update Docs ---
        console.log(`[Webhook] Found ${results.size} document(s) to update.`);

        const batch = adminDb.batch();
        const now = new Date().toISOString();

        results.forEach((doc) => {
            const colName = doc.ref.parent.id;

            const updateData: any = {
                isPaid: true,
                paymentDate: now,
                updatedAt: now,
                ticketId: order.id
            };

            if (colName === "attendees") {
                updateData.isPaid = true;
            }

            console.log(`[Webhook] Updating ${colName}/${doc.id}`, updateData);
            batch.update(doc.ref, updateData);
        });

        await batch.commit();
        console.log("[Webhook] Update passed to Firestore.");

        return NextResponse.json({ success: true, updated: results.size });

    } catch (error: any) {
        console.error("[Webhook] Internal Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}