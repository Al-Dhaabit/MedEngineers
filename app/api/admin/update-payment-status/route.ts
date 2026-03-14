import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";
import { verifyAdminSession } from "@/lib/adminAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { logger } from "@/lib/logger";

// ============================================
// UPDATE USER PAYMENT APPROVAL
// ============================================

export async function POST(request: NextRequest) {
  const requestId = logger.getRequestId();

  try {
    let adminUser;
    try {
      adminUser = await verifyAdminSession();
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      if (errorMessage.includes("FORBIDDEN")) {
        return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
      }
      return NextResponse.json({ error: "Unauthorized - Please sign in as admin" }, { status: 401 });
    }

    const body = await request.json();
    const { uid, paymentSuccessful } = body;

    if (!uid || typeof paymentSuccessful !== "boolean") {
      return NextResponse.json({ error: "uid and paymentSuccessful(boolean) are required" }, { status: 400 });
    }

    const competitorRef = adminDb.collection("competitors").doc(uid);
    const attendeeRef = adminDb.collection("attendees").doc(uid);
    const [competitorDoc, attendeeDoc] = await Promise.all([competitorRef.get(), attendeeRef.get()]);

    const targetRef = competitorDoc.exists ? competitorRef : attendeeDoc.exists ? attendeeRef : null;
    const targetCollection = competitorDoc.exists ? "competitors" : attendeeDoc.exists ? "attendees" : null;

    if (!targetRef || !targetCollection) {
      return NextResponse.json({ error: "Payment submission not found" }, { status: 404 });
    }

    await targetRef.update({
      isPaid: paymentSuccessful,
      status: paymentSuccessful ? "payment_confirmed" : "payment_rejected",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastPaymentReviewBy: adminUser.email,
      lastPaymentReviewAt: new Date().toISOString(),
    });

    try {
      await adminDb.collection("admin_audit_logs").add({
        action: "update_payment_status",
        adminUid: adminUser.uid,
        adminEmail: adminUser.email,
        targetCollection,
        targetUid: uid,
        paymentSuccessful,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        timestampISO: new Date().toISOString(),
        metadata: {
          requestId,
          userAgent: request.headers.get("user-agent") || "unknown",
          ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
        },
      });
    } catch (auditError) {
      logger.error("Failed to write payment audit log", { requestId, auditError });
    }

    return NextResponse.json({ success: true, paymentSuccessful });
  } catch (error) {
    logger.error("Failed to update payment status", { requestId, error });
    return NextResponse.json({ error: "Internal server error during payment status update" }, { status: 500 });
  }
}
