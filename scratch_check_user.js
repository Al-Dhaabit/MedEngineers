const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Load .env.local
const envPath = path.join(__dirname, ".env.local");
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach(line => {
        const [key, ...valueParts] = line.split("=");
        if (key && valueParts.length > 0) {
            process.env[key.trim()] = valueParts.join("=").trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
        }
    });
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : null;

admin.initializeApp({
    credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
    })
});

const db = admin.firestore();

async function checkUser() {
    const email = "km2495@g.rit.edu";
    console.log(`Checking DB for ${email}...`);
    
    // Check competitors
    const compSnapshot = await db.collection("competitors").where("email", "==", email).get();
    if (!compSnapshot.empty) {
        compSnapshot.forEach(doc => {
            console.log("Found in competitors:", doc.data());
        });
    } else {
        console.log("Not found in competitors");
    }

    // Check attendees
    const attSnapshot = await db.collection("attendees").where("email", "==", email).get();
    if (!attSnapshot.empty) {
        attSnapshot.forEach(doc => {
            console.log("Found in attendees:", doc.data());
        });
    } else {
        console.log("Not found in attendees");
    }
    
    // Also check Auth for uid to search by doc id
    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        console.log("Auth UID:", userRecord.uid);
        
        const compDoc = await db.collection("competitors").doc(userRecord.uid).get();
        if (compDoc.exists) console.log("Found in competitors by UID:", compDoc.data());
        
        const attDoc = await db.collection("attendees").doc(userRecord.uid).get();
        if (attDoc.exists) console.log("Found in attendees by UID:", attDoc.data());
        
        // check custom claims
        console.log("Custom claims:", userRecord.customClaims);
        
    } catch (e) {
        console.log("Not found in Firebase Auth");
    }
    
    process.exit(0);
}

checkUser();
