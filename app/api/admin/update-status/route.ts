import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminSession } from "@/lib/adminAuth";
import admin from "firebase-admin";

export async function POST(request: NextRequest) {
    try {
        // ============================================
        // LAYER 1: Admin Authentication
        // ============================================
        let adminUser;
        try {
            adminUser = await verifyAdminSession();
        } catch (error: any) {
            const errorMessage = error.message || String(error);

            if (errorMessage.includes("FORBIDDEN")) {
                console.log(`[Admin Auth] Forbidden: ${errorMessage}`);
                return NextResponse.json(
                    { error: 'Forbidden - Admin access required' },
                    { status: 403 }
                );
            }

            console.log(`[Admin Auth] Unauthorized: ${errorMessage}`);
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in as admin' },
                { status: 401 }
            );
        }

        console.log(`[Admin Action] User ${adminUser.email} authenticated`);

        // ============================================
        // LAYER 2: Input Validation
        // ============================================
        const { competitorId, status } = await request.json();

        if (!competitorId || !status) {
            return NextResponse.json(
                { error: 'Missing competitorId or status' },
                { status: 400 }
            );
        }

        // Validate status values
        const validStatuses = ['Accepted', 'Rejected', 'pending'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { error: `Invalid status value. Must be one of: ${validStatuses.join(', ')}` },
                { status: 400 }
            );
        }

        // ============================================
        // LAYER 3: Fetch Current Status (for audit log)
        // ============================================
        const competitorRef = adminDb.collection('competitors').doc(competitorId);
        const competitorDoc = await competitorRef.get();

        if (!competitorDoc.exists) {
            return NextResponse.json(
                { error: 'Competitor not found' },
                { status: 404 }
            );
        }

        const oldStatus = competitorDoc.data()?.status || 'pending';

        // Skip update if status is already the same
        if (oldStatus === status) {
            console.log(`[Admin Action] Status already ${status} for ${competitorId}`);
            return NextResponse.json({
                success: true,
                status,
                message: 'Status unchanged (already set to this value)'
            });
        }

        // ============================================
        // LAYER 4: Update Status
        // ============================================
        const now = new Date().toISOString();

        await competitorRef.update({
            status: status,
            updatedAt: now,
            lastStatusChangeBy: adminUser.email,
            lastStatusChangeAt: now
        });

        console.log(`[Admin Action] Status updated: ${competitorId} from ${oldStatus} to ${status}`);

        // ============================================
        // LAYER 5: Audit Logging
        // ============================================
        try {
            await adminDb.collection('admin_audit_logs').add({
                action: 'update_status',
                adminUid: adminUser.uid,
                adminEmail: adminUser.email,
                targetCollection: 'competitors',
                targetUid: competitorId,
                oldStatus: oldStatus,
                newStatus: status,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                timestampISO: now,
                metadata: {
                    userAgent: request.headers.get('user-agent') || 'unknown',
                    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
                }
            });
            console.log(`[Audit Log] Status change logged for ${competitorId}`);
        } catch (auditError) {
            // Don't fail the request if audit logging fails, but log the error
            console.error('[Audit Log] Failed to write audit log:', auditError);
        }

        return NextResponse.json({
            success: true,
            status,
            oldStatus,
            changedBy: adminUser.email
        });

    } catch (error) {
        console.error('[Admin Action] Error updating status:', error);
        return NextResponse.json(
            { error: 'Failed to update status' },
            { status: 500 }
        );
    }
}
