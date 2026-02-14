import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
    const requestId = logger.getRequestId();
    
    try {
        const body = await req.json();
        const { uid, adminKey } = body;
        
        // Simple admin key protection (in production, use proper auth)
        if (adminKey !== "temp-delete-key-2024") {
            logger.warn('Unauthorized delete attempt', { requestId });
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        if (!uid) {
            return NextResponse.json({ error: "UID is required" }, { status: 400 });
        }
        
        // Delete from both collections
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
        
        logger.info('Entry deletion successful', { 
            requestId, 
            uid, 
            deletedFrom 
        });
        
        return NextResponse.json({
            success: true,
            message: `Entry deleted from ${deletedFrom}`,
            deletedFrom
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
