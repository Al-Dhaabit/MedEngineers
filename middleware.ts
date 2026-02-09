import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    const session = request.cookies.get('session')?.value

    // If no session cookie, redirect to login
    if (!session) {
        console.log('No session found, redirecting to login')
        return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
        // Verify the session with your backend
        const baseUrl = request.nextUrl.origin
        const response = await fetch(`${baseUrl}/api/verify-session`, {
            headers: {
                Cookie: `session=${session}`,
            },
        })

        if (!response.ok) {
            console.log('Session verification failed, redirecting to login')
            // Clear the invalid session cookie
            const res = NextResponse.redirect(new URL('/login', request.url))
            res.cookies.delete('session')
            return res
        }

        // Session is valid and user has admin claim
        return NextResponse.next()
    } catch (error) {
        console.error('Middleware error:', error)
        return NextResponse.redirect(new URL('/login', request.url))
    }
}

// Protect all admin-dashboard routes
export const config = {
    matcher: '/admin-dashboard/:path*',
}