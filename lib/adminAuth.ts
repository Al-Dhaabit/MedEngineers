import "server-only";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebaseAdmin";

/**
 * Admin user information extracted from session
 */
export interface AdminUser {
    uid: string;
    email: string;
    admin: boolean;
}

/**
 * Verifies admin session cookie and returns admin user info
 * 
 * @throws Error if session is invalid or user is not an admin
 * @returns Admin user information
 */
export async function verifyAdminSession(): Promise<AdminUser> {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;

    if (!session) {
        throw new Error("UNAUTHORIZED: No session cookie found");
    }

    try {
        // Verify session cookie and check for revocation
        const decodedClaims = await adminAuth.verifySessionCookie(session, true);

        // Verify admin claim
        if (!decodedClaims.admin) {
            throw new Error(`FORBIDDEN: User ${decodedClaims.email} does not have admin privileges`);
        }

        return {
            uid: decodedClaims.uid,
            email: decodedClaims.email || "",
            admin: decodedClaims.admin,
        };
    } catch (error: any) {
        // Re-throw with context
        if (error.message?.startsWith("FORBIDDEN")) {
            throw error;
        }
        throw new Error(`UNAUTHORIZED: Invalid session - ${error.message}`);
    }
}

/**
 * Middleware-style wrapper for admin-only API routes
 * 
 * Usage:
 * ```typescript
 * export async function POST(req: NextRequest) {
 *   const admin = await requireAdmin();
 *   // ... rest of your handler
 * }
 * ```
 */
export async function requireAdmin(): Promise<AdminUser> {
    return await verifyAdminSession();
}
