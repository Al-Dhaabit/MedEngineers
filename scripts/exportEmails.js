const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Load .env.local
const envPath = path.join(__dirname, "..", ".env.local");
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

if (!projectId || !clientEmail || !privateKey) {
    console.error("Missing Firebase Admin environment variables in .env.local");
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
    })
});

const db = admin.firestore();

async function exportEmails() {
    console.log("Starting full user export from Firebase Auth...");
    const emails = new Set();

    try {
        let nextPageToken;
        do {
            const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
            listUsersResult.users.forEach((userRecord) => {
                if (userRecord.email) {
                    emails.add(userRecord.email.toLowerCase().trim());
                }
            });
            nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);

        // Convert to sorted array
        const sortedEmails = Array.from(emails).sort();
        
        // Save to file
        const outputPath = path.join(__dirname, "..", "exported_all_users.csv");
        fs.writeFileSync(outputPath, "Email\n" + sortedEmails.join("\n"));

        console.log(`Successfully exported ${sortedEmails.length} unique authenticated users to exported_all_users.csv`);
    } catch (error) {
        console.error("Error during export:", error);
    } finally {
        process.exit();
    }
}

exportEmails();
