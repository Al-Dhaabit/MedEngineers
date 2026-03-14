import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminAuth";
import { adminDb } from "@/lib/firebaseAdmin";

// ============================================
// GET PAYMENT PROOF
// ============================================

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {

    // ============================================
    // 1. AUTHENTICATION & AUTHORIZATION
    // ============================================
    try {
      await verifyAdminSession();
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      if (errorMessage.includes("FORBIDDEN")) {
        return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
      }
      return NextResponse.json({ error: "Unauthorized - Please sign in as admin" }, { status: 401 });
    }

    const params = await context.params;
    const uid = params.id?.trim();

    if (!uid) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    // ============================================
    // 2. FETCH PAYMENT PROOF
    // ============================================
    const [competitorDoc, attendeeDoc] = await Promise.all([
      adminDb.collection("competitors").doc(uid).get(),
      adminDb.collection("attendees").doc(uid).get(),
    ]);

    const targetDoc = competitorDoc.exists ? competitorDoc : attendeeDoc.exists ? attendeeDoc : null;
    if (!targetDoc) {
      return NextResponse.json({ error: "Payment proof not found" }, { status: 404 });
    }

    const data = targetDoc.data() || {};

    // check this later
    const paymentProof = data.payment?.proof || data.paymentProof;

    if (!paymentProof || typeof paymentProof.data !== "string") {
      return NextResponse.json({ error: "Payment proof file not found" }, { status: 404 });
    }

    // ============================================
    // 3. PREPARE RESPONSE
    // ============================================
    const contentType =
      typeof paymentProof.fileType === "string" && paymentProof.fileType
        ? paymentProof.fileType
        : "application/octet-stream";
    const fileName =
      typeof paymentProof.fileName === "string" && paymentProof.fileName
        ? paymentProof.fileName
        : `payment-proof-${uid}`;

    const fileBuffer = Buffer.from(paymentProof.data, "base64");

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[Admin Payment Proof] Failed to serve file:", error);
    return NextResponse.json({ error: "Failed to fetch payment proof file" }, { status: 500 });
  }
}
