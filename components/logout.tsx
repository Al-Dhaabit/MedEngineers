"use client"

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'

export default function LogoutButton() {
    const router = useRouter()
    const { signOut } = useAuth()

    const handleLogout = async () => {
        try {
            // Sign out from Firebase
            await signOut()

            // Clear admin session cookie
            await fetch('/api/logout-admin', { method: 'POST' })

            // Redirect to admin login
            router.push('/admin')
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