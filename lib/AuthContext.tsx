"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User,
    signInWithPopup,
    signInWithRedirect,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    getRedirectResult,
} from 'firebase/auth';
import { auth, GoogleAuthProvider } from './Firebase';
import { isSafari } from './browserDetection';

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

    // Handle redirect result on mount
    useEffect(() => {
        // This is vital for Safari
        getRedirectResult(auth)
            .then((result) => {
                if (result) {
                    // User successfully logged in via Safari redirect
                    setUser(result.user);
                }
            })
            .catch((error) => {
                console.error("Redirect Result Error:", error);
            });
    }, []);

    const signInWithGoogle = async () => {
        try {
            const provider = new GoogleAuthProvider();
            if (isSafari()) {
                console.log("Safari detected: using Redirect");
                await signInWithRedirect(auth, provider);
            } else {
                console.log("Non-Safari detected: using Popup");
                await signInWithPopup(auth, provider);
            }
        } catch (error) {
            console.error('Error signing in with Google:', error);
            throw error;
        }
    };

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
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
