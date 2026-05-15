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

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey
        })
    });
}

const db = admin.firestore();

async function exportCompetitors() {
    console.log("Starting competitor export from Firestore...");
    
    try {
        const snapshot = await db.collection("competitors").get();
        const competitors = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            
            // Format date
            let dateStr = "N/A";
            if (data.submittedAt) {
                const date = data.submittedAt.toDate ? data.submittedAt.toDate() : new Date(data.submittedAt);
                dateStr = date.toLocaleString();
            }

            competitors.push({
                name: data.fullName || "N/A",
                email: data.email || data.universityEmail || "N/A",
                field: data.major || "N/A",
                date: dateStr
            });
        });

        // Convert to CSV
        const headers = ["Name", "Email", "Field", "Date"];
        const csvContent = [
            headers.join(","),
            ...competitors.map(c => [
                `"${c.name}"`,
                `"${c.email}"`,
                `"${c.field}"`,
                `"${c.date}"`
            ].join(","))
        ].join("\n");
        
        // Save to file
        const outputPath = path.join(__dirname, "..", "competitor_applications_export.csv");
        fs.writeFileSync(outputPath, csvContent);

        console.log(`Successfully exported ${competitors.length} competitors to competitor_applications_export.csv`);
    } catch (error) {
        console.error("Error during export:", error);
    } finally {
        process.exit();
    }
}

exportCompetitors();
