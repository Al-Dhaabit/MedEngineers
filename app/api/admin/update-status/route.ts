import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(request: NextRequest) {
    try {
        const { competitorId, status } = await request.json();

        if (!competitorId || !status) {
            return NextResponse.json(
                { error: 'Missing competitorId or status' },
                { status: 400 }
            );
        }

        // Validate status values
        if (!['Accepted', 'Rejected', 'pending'].includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status value' },
                { status: 400 }
            );
        }

        // Update the competitor's status in Firebase
        await adminDb.collection('competitors').doc(competitorId).update({
            status: status,
            updatedAt: new Date().toISOString()
        });

        return NextResponse.json({ success: true, status });

    } catch (error) {
        console.error('Error updating status:', error);
        return NextResponse.json(
            { error: 'Failed to update status' },
            { status: 500 }
        );
    }
}
