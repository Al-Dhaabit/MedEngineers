import { adminAuth } from '../lib/firebaseAdminForScripts';

async function checkAdminStatus(email: string) {
    try {
        const user = await adminAuth.getUserByEmail(email);
        const customClaims = user.customClaims || {};

        console.log('\n📋 User Information:');
        console.log('━'.repeat(50));
        console.log(`Email:        ${user.email}`);
        console.log(`UID:          ${user.uid}`);
        console.log(`Display Name: ${user.displayName || 'N/A'}`);
        console.log(`Created:      ${new Date(user.metadata.creationTime).toLocaleString()}`);
        console.log(`Last Sign In: ${new Date(user.metadata.lastSignInTime).toLocaleString()}`);
        console.log('━'.repeat(50));

        if (customClaims.admin === true) {
            console.log('✅ Admin Status: YES');
            console.log('🔑 Custom Claims:', JSON.stringify(customClaims, null, 2));
        } else {
            console.log('❌ Admin Status: NO');
            console.log('🔑 Custom Claims:', JSON.stringify(customClaims, null, 2) || 'None');
        }

        console.log('\n');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

const email = process.argv[2];

if (!email) {
    console.error('❌ Provide an email!');
    console.log('Usage: npm run check-admin <email>');
    process.exit(1);
}

checkAdminStatus(email);

// npm run check-admin <email>
