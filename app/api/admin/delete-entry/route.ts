import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { logger } from "@/lib/logger";
import { verifyAdminSession } from "@/lib/adminAuth";
import admin from "firebase-admin";

export async function POST(req: NextRequest) {
    const requestId = logger.getRequestId();

    try {
        // ============================================
        // LAYER 1: Admin Authentication
        // ============================================
        let adminUser;
        try {
            adminUser = await verifyAdminSession();
        } catch (error: any) {
            const errorMessage = error.message || String(error);
            logger.warn('Unauthorized delete attempt', { requestId, error: errorMessage });

            if (errorMessage.includes("FORBIDDEN")) {
                return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
            }
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        console.log(`[Admin Action] User ${adminUser.email} authenticated for deletion`);

        const body = await req.json();
        const { uid } = body;

        if (!uid) {
            return NextResponse.json({ error: "UID is required" }, { status: 400 });
        }

        // ============================================
        // LAYER 2: Delete from both collections
        // ============================================
        const attendeeRef = adminDb.collection("attendees").doc(uid);
        const competitorRef = adminDb.collection("competitors").doc(uid);

        const [attendeeDoc, competitorDoc] = await Promise.all([
            attendeeRef.get(),
            competitorRef.get()
        ]);

        let deletedFrom = "";

        if (attendeeDoc.exists) {
            await attendeeRef.delete();
            deletedFrom = "attendees";
            logger.info('Deleted attendee entry', { requestId, uid });
        }

        if (competitorDoc.exists) {
            await competitorRef.delete();
            deletedFrom += deletedFrom ? " & competitors" : "competitors";
            logger.info('Deleted competitor entry', { requestId, uid });
        }

        if (!deletedFrom) {
            return NextResponse.json({
                error: "No entry found to delete"
            }, { status: 404 });
        }

        // ============================================
        // LAYER 3: Audit Logging
        // ============================================
        try {
            await adminDb.collection('admin_audit_logs').add({
                action: 'delete_entry',
                adminUid: adminUser.uid,
                adminEmail: adminUser.email,
                targetUid: uid,
                deletedFrom: deletedFrom,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                timestampISO: new Date().toISOString(),
                metadata: {
                    userAgent: req.headers.get('user-agent') || 'unknown',
                    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
                }
            });
            console.log(`[Audit Log] Deletion logged for ${uid}`);
        } catch (auditError) {
            console.error('[Audit Log] Failed to write audit log for deletion:', auditError);
        }

        logger.info('Entry deletion successful', {
            requestId,
            uid,
            deletedFrom,
            deletedBy: adminUser.email
        });

        return NextResponse.json({
            success: true,
            message: `Entry deleted from ${deletedFrom}`,
            deletedFrom,
            deletedBy: adminUser.email
        });

    } catch (error) {
        logger.error('Delete entry failed', { requestId, error });
        return NextResponse.json(
            {
                error: "Failed to delete entry"
            },
            { status: 500 }
        );
    }
}
