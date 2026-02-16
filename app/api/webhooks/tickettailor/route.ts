import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import crypto from "crypto";

export async function POST(req: NextRequest) {
    try {
        const bodyText = await req.text(); // Read raw body for signature verification
        let body;
        try {
            body = JSON.parse(bodyText);
        } catch (e) {
            return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }

        // --- Signature Verification ---
        const signatureHeader = req.headers.get("Tickettailor-Webhook-Signature");
        const webhookSecret = process.env.TICKET_TAILOR_WEBHOOK_SECRET;

        // Skip verification ONLY if specifically allowed in dev/test (optional, but good for local dev without secrets)
        // But per request, we are securing it.
        if (webhookSecret) {
            if (!signatureHeader) {
                return NextResponse.json({ error: "Missing signature header" }, { status: 401 });
            }

            // Header format: t=1234567890,v1=... (Ticket Tailor uses t=... and s=...)
            // Actually Ticket Tailor format is: t=timestamp,s=signature
            const parts = signatureHeader.split(",");
            let timestamp = "";
            let signature = "";

            parts.forEach(part => {
                const [key, value] = part.split("=");
                if (key === "t") timestamp = value;
                if (key === "s") signature = value;
            });

            if (!timestamp || !signature) {
                return NextResponse.json({ error: "Invalid signature header format" }, { status: 401 });
            }

            // Verify timestamp to prevent replay attacks (e.g., 5 minute tolerance)
            const requestTime = parseInt(timestamp, 10);
            const now = Math.floor(Date.now() / 1000);
            if (isNaN(requestTime) || now - requestTime > 300) {
                return NextResponse.json({ error: "Request timestamp too old" }, { status: 401 });
            }

            // Create valid signature
            // The signature is an HMAC-SHA256 of the timestamp + the request body
            const payloadToSign = timestamp + bodyText;
            const expectedSignature = crypto
                .createHmac("sha256", webhookSecret)
                .update(payloadToSign)
                .digest("hex");

            // Constant time comparison to prevent timing attacks
            const isValid = crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            );

            if (!isValid) {
                console.warn("Invalid webhook signature attempt");
                return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
            }
        } else {
            console.warn("TICKET_TAILOR_WEBHOOK_SECRET is not set. Skipping signature verification (INSECURE).");
        }
        // -----------------------------

        // 1. Verify it's a successful order event
        // User requested order.created, standard is often order.completed for payment, but we will accept both or just created as requested.
        if (body.event !== "order.created" && body.event !== "order.completed") {
            return NextResponse.json({ message: "Ignored event" }, { status: 200 });
        }

        const order = body.payload;
        // TicketTailor stores the email of the person who bought the ticket
        const customerEmail = order.email ? order.email.toLowerCase() : null;

        if (!customerEmail) {
            return NextResponse.json({ error: "No email in payload" }, { status: 400 });
        }

        console.log(`Webhook received for ${customerEmail}. Event: ${body.event}`);

        const results = new Map(); // Map<docId, DocumentSnapshot>

        // 2. Strategy A: Find user by Auth Email (Preferred)
        try {
            const userRecord = await adminAuth.getUserByEmail(customerEmail);
            console.log(`Found user in Auth: ${userRecord.uid}`);

            // Check if document exists with this UID in 'attendees'
            const attendeeDoc = await adminDb.collection("attendees").doc(userRecord.uid).get();
            if (attendeeDoc.exists) {
                results.set(attendeeDoc.id, attendeeDoc);
            }

            // Check if document exists with this UID in 'competitors'
            const competitorDoc = await adminDb.collection("competitors").doc(userRecord.uid).get();
            if (competitorDoc.exists) {
                results.set(competitorDoc.id, competitorDoc);
            }

        } catch (authError) {
            console.log(`User not found in Auth by email ${customerEmail}. Proceeding to fallback search.`);
        }

        if (results.size === 0) {
            const queries = [
                adminDb.collection("attendees").where("email", "==", customerEmail).get(),
                adminDb.collection("attendees").where("university_email", "==", customerEmail).get(),
                adminDb.collection("competitors").where("email", "==", customerEmail).get(),
                adminDb.collection("competitors").where("university_email", "==", customerEmail).get()
            ];

            const querySnapshots = await Promise.all(queries);

            // Deduplicate docs found (in case email and university_email are the same or point to same doc)
            querySnapshots.forEach(snap => {
                snap.docs.forEach(doc => {
                    if (!results.has(doc.id)) {
                        results.set(doc.id, doc);
                    }
                });
            });
        }

        // If no user found, return 200 to prevent retries
        if (results.size === 0) {
            console.warn(`No user found for email: ${customerEmail} (checked Auth and Collections)`);
            return NextResponse.json({ message: "User not found" }, { status: 200 });
        }

        // 4. Update payment status
        const batch = adminDb.batch();
        const timestamp = new Date().toISOString();

        results.forEach((doc) => {
            // Determine collection to decide on fields? 
            // Actually, both attendees and competitors use 'isPayed'.
            // We can check doc.ref.parent.id to know which collection it is if needed, 
            // but here the update logic is uniform enough for 'isPayed'.

            const collectionName = doc.ref.parent.id;
            console.log(`Updating ${collectionName} doc ${doc.id} payment status.`);

            const updateData: any = {
                isPayed: true,
                paymentDate: timestamp,
                ticketId: order.id,
                updatedAt: timestamp
            };

            if (collectionName === "attendees") {
                updateData.isPayed = true; // Legacy field for attendees,
                updateData.paymentDate = timestamp,
                    updateData.ticketId = order.id,
                    updateData.updatedAt = timestamp
            }
            // Competitors don't get auto-approved status change, just payment.

            batch.update(doc.ref, updateData);
        });

        await batch.commit();
        console.log(`Successfully updated payment for ${customerEmail}`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Webhook Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}