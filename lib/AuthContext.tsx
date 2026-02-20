"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User,
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged,
} from 'firebase/auth';
import { auth, GoogleAuthProvider } from './Firebase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signInWithGoogle: async () => { },
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const [isSigningIn, setIsSigningIn] = useState(false);

    const signInWithGoogle = async () => {
        if (isSigningIn) {
            console.warn("Sign-in already in progress. Ignoring duplicate request.");
            return;
        }

        try {
            setIsSigningIn(true);
            const provider = new GoogleAuthProvider();
            console.log("Initiating Google Sign-In with Popup");
            await signInWithPopup(auth, provider);
        } catch (error: any) {
            // Suppress the red error overlay in Next.js for benign auth cancellations
            if (error?.code === 'auth/cancelled-popup-request' || error?.code === 'auth/popup-closed-by-user') {
                console.warn('Google Sign-In popup closed or cancelled by user.');
            } else {
                console.error('Error signing in with Google:', error);
            }
            throw error;
        } finally {
            setIsSigningIn(false);
        }
    };

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
            // We'll let components handle their own reload/redirect logic if needed
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    };

    const value = {
        user,
        loading,
        signInWithGoogle,
        signOut,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
