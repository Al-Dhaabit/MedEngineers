import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { adminAuth } from '@/lib/firebaseAdmin'

export async function proxy(request: NextRequest) {
    // Only protect admin dashboard routes
    if (request.nextUrl.pathname.startsWith('/admin/dashboard')) {
        const session = request.cookies.get('session')?.value

        // If no session cookie, redirect to admin login
        if (!session) {
            console.log('No admin session found, redirecting to /admin')
            return NextResponse.redirect(new URL('/admin', request.url))
        }

        try {
            // Verify the session with Firebase Admin
            const decodedClaims = await adminAuth.verifySessionCookie(session)
            
            // Check if user has admin privileges
            if (!decodedClaims.admin) {
                console.log('User lacks admin privileges, redirecting to /admin')
                return NextResponse.redirect(new URL('/admin', request.url))
            }

            // Session is valid and user has admin claim
            return NextResponse.next()
        } catch (error) {
            console.error('Admin proxy error:', error)
            return NextResponse.redirect(new URL('/admin', request.url))
        }
    }

    // For all other routes, continue normally
    return NextResponse.next()
}

// Protect admin dashboard routes
export const config = {
    matcher: '/admin/dashboard/:path*',
}