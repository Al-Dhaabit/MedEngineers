import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebaseAdmin'

export async function GET() {
    try {
        const cookieStore = await cookies()
        const session = cookieStore.get('session')?.value

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify the session cookie
        const decodedClaims = await adminAuth.verifySessionCookie(session, true)

        // ⚠️ CRITICAL: Check if user has admin claim
        if (!decodedClaims.admin) {
            console.log(`Forbidden access attempt by: ${decodedClaims.email}`)
            return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
        }

        return NextResponse.json({
            uid: decodedClaims.uid,
            email: decodedClaims.email,
            admin: decodedClaims.admin
        }, { status: 200 })
    } catch (error) {
        console.error('Session verification error:', error)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
}