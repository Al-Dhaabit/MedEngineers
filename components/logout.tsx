"use client"

import { useRouter } from 'next/navigation'
import { auth } from '@/lib/Firebase'
import { signOut } from 'firebase/auth'

export default function LogoutButton() {
    const router = useRouter()

    const handleLogout = async () => {
        try {
            // Sign out from Firebase
            await signOut(auth)

            // Clear session cookie
            await fetch('/api/logout', { method: 'POST' })

            router.push('/login')
        } catch (error) {
            console.error('Logout error:', error)
        }
    }

    return (
        <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
        >
            Logout
        </button>
    )
}