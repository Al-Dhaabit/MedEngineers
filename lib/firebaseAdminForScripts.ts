// Load environment variables at the TOP of this file
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import admin from "firebase-admin";

// Check if already initialized
if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    // Validate env vars exist
    if (!projectId || !clientEmail || !privateKey) {
        console.error('❌ Missing Firebase environment variables!');
        console.error('Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
        process.exit(1);
    }

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n')
        }),
    });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();