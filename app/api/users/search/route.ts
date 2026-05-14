import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

// In-memory cache to prevent spamming Firestore
let usersCache: any[] = [];
let lastFetchTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get("q")?.toLowerCase() || "";

        if (!query) {
            return NextResponse.json({ users: [] }, { status: 200 });
        }

        // Verify admin token
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        const token = authHeader.split("Bearer ")[1];
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (e) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        const adminEmails = [
            "khaled.a.m2006@gmail.com",
            "mohammad01ahmad@gmail.com",
            "medhackglobal@gmail.com"
        ];
        
        const isAdmin = decodedToken.admin === true || (decodedToken.email && adminEmails.includes(decodedToken.email));
        if (!isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const now = Date.now();
        
        // Refresh cache if expired
        if (now - lastFetchTime > CACHE_TTL || usersCache.length === 0) {
            console.log("[UserSearch] Fetching users from Firestore to update cache...");
            const competitorsSnap = await adminDb.collection("competitors").get();
            const attendeesSnap = await adminDb.collection("attendees").get();

            const competitors = competitorsSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    email: data.email || data.universityEmail || data.university_email || "",
                    name: data.fullName || data.name || "",
                    major: data.major || "Competitor",
                    mobile: data.mobile || data.phoneNumber || data.contactNo || "",
                };
            });

            const attendees = attendeesSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    email: data.email || data.universityEmail || data.university_email || "",
                    name: data.fullName || data.name || "",
                    major: data.major || "Attendee",
                    mobile: data.mobile || data.phoneNumber || data.contactNo || "",
                };
            });

            // Combine and deduplicate by email
            const allUsers = [...competitors, ...attendees];
            const uniqueUsersMap = new Map();
            for (const user of allUsers) {
                if (user.email && !uniqueUsersMap.has(user.email)) {
                    uniqueUsersMap.set(user.email, user);
                }
            }
            
            usersCache = Array.from(uniqueUsersMap.values());
            lastFetchTime = now;
        }

        // Filter from cache
        const filtered = usersCache.filter(u => 
            u.email.toLowerCase().includes(query) || 
            (u.name && u.name.toLowerCase().includes(query))
        ).slice(0, 10); // Limit to 10 results

        return NextResponse.json({ users: filtered }, { status: 200 });

    } catch (error: any) {
        console.error("[UserSearch] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
