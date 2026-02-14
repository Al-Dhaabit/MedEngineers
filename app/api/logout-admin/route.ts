import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * Admin logout endpoint
 * Only clears the session cookie - does NOT revoke Firebase tokens
 * This prevents interfering with regular user authentication
 */
export async function POST() {
    try {
        const cookieStore = await cookies()
        
        // Simply clear the session cookie
        // We don't revoke refresh tokens because:
        // 1. Admin auth is isolated in a popup with separate app instance
        // 2. Revoking tokens could affect user auth if they share the same account
        cookieStore.delete('session')

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (error) {
        console.error('Admin logout error:', error)
        return NextResponse.json({ error: 'Error logging out' }, { status: 500 })
    }
}