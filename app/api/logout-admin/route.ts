import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebaseAdmin'

export async function POST() {
    try {
        const cookieStore = await cookies()
        const session = cookieStore.get('session')?.value

        if (session) {
            // Revoke the session
            const decodedClaims = await adminAuth.verifySessionCookie(session)
            await adminAuth.revokeRefreshTokens(decodedClaims.sub)
        }

        // Clear the cookie
        cookieStore.delete('session')

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (error) {
        return NextResponse.json({ error: 'Error logging out' }, { status: 500 })
    }
}