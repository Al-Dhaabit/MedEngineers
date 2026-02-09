import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebaseAdmin'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
    try {
        const { idToken } = await request.json()

        // Verify the ID token
        const decodedToken = await adminAuth.verifyIdToken(idToken)

        // ⚠️ CRITICAL: Check if user has admin claim
        if (!decodedToken.admin) {
            console.log(`Access denied for user: ${decodedToken.email} - No admin claim`)
            return NextResponse.json(
                { error: 'Access denied. Admin privileges required.' },
                { status: 403 }
            )
        }

        // Create session cookie (expires in 5 days)
        const expiresIn = 60 * 60 * 24 * 5 * 1000 // 5 days
        const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn })

        const cookieStore = await cookies()
        cookieStore.set('session', sessionCookie, {
            maxAge: expiresIn,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            sameSite: 'lax',
        })

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
}