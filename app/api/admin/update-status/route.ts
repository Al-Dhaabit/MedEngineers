import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminSession } from "@/lib/adminAuth";
import admin from "firebase-admin";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
    const requestId = logger.getRequestId();

    try {
        // ============================================
        // 1. AUTHENTICATION & AUTHORIZATION
        // ============================================
        let adminUser;
        try {
            adminUser = await verifyAdminSession();
        } catch (error: any) {
            const errorMessage = error.message || String(error);

            if (errorMessage.includes("FORBIDDEN")) {
                logger.warn('Forbidden status update attempt', { requestId, error: errorMessage });
                return NextResponse.json(
                    { error: 'Forbidden - Admin access required' },
                    { status: 403 }
                );
            }

            logger.warn('Unauthorized status update attempt', { requestId, error: errorMessage });
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in as admin' },
                { status: 401 }
            );
        }

        logger.info(`Admin ${adminUser.email} authenticated for status update`, { requestId });

        // ============================================
        // 2. INPUT VALIDATION
        // ============================================
        const body = await request.json();
        const { competitorId, status } = body;

        if (!competitorId || !status) {
            return NextResponse.json(
                { error: 'Missing competitorId or status' },
                { status: 400 }
            );
        }

        // Validate status values (standardized to lowercase/PascalCase as needed)
        // Note: The UI seems to send 'Accepted', 'Rejected', or 'pending'
        const validStatuses = ['Accepted', 'Rejected', 'pending'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { error: `Invalid status value. Must be one of: ${validStatuses.join(', ')}` },
                { status: 400 }
            );
        }

        // ============================================
        // 3. FETCH CURRENT STATUS & UPDATE
        // ============================================
        const competitorRef = adminDb.collection('competitors').doc(competitorId);
        const competitorDoc = await competitorRef.get();

        if (!competitorDoc.exists) {
            logger.error('Competitor not found', { requestId, competitorId });
            return NextResponse.json(
                { error: 'Competitor not found' },
                { status: 404 }
            );
        }

        const oldStatus = competitorDoc.data()?.status || 'pending';
        const now = new Date().toISOString();

        // Update the document
        await competitorRef.update({
            status: status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastStatusChangeBy: adminUser.email,
            lastStatusChangeAt: now
        });

        // ============================================
        // 4. AUDIT LOGGING
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
                    requestId,
                    userAgent: request.headers.get('user-agent') || 'unknown',
                    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
                }
            });
            logger.info('Status change successfully audited', { requestId, competitorId });
        } catch (auditError) {
            // Log audit failure but don't fail the primary request
            logger.error('Failed to write audit log', { requestId, auditError });
        }

        logger.info('Competitor status updated successfully', {
            requestId,
            competitorId,
            oldStatus,
            newStatus: status,
            admin: adminUser.email
        });

        return NextResponse.json({
            success: true,
            status,
            oldStatus,
            changedBy: adminUser.email
        });

    } catch (error) {
        logger.error('Critical failure in status update route', { requestId, error });
        return NextResponse.json(
            { error: 'Internal server error during status update' },
            { status: 500 }
        );
    }
}
