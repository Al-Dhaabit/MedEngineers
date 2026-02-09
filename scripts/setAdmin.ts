import { adminAuth } from '../lib/firebaseAdminForScripts';

async function setAdminClaim(email: string) {
    try {
        const user = await adminAuth.getUserByEmail(email);
        await adminAuth.setCustomUserClaims(user.uid, { admin: true });

        console.log(`✅ Admin claim set for ${email}`);
        console.log(`⚠️  User must sign out and sign in again`);
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

const email = process.argv[2];

if (!email) {
    console.error('❌ Provide an email!');
    console.log('Usage: npm run set-admin <email>');
    process.exit(1);
}

setAdminClaim(email);