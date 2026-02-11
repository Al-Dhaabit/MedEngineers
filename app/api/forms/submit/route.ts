import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getPublicEntryIds } from "@/lib/google-forms";
import { auth } from "@/lib/Firebase";
import admin from "firebase-admin";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
    try {
        // 1. Verify Authentication
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { responses, type = "competitor", idToken } = body; // Added idToken to be fetched by, Ahmad for Firebase Storage

        // === CODE ADDED BY AHMAD FOR FIREBASE === //
        console.log("=== RECIEVED DATA ===")
        console.log("Received responses:", responses);
        console.log("Received type:", type);
        console.log("Received idToken:", idToken);

        // Storing form submission to Firebase
        if (type === "attendee" && idToken) {
            try {
                // Verify idtToken and get the UserID
                const decodedToken = await adminAuth.verifyIdToken(idToken);
                const uid = decodedToken.uid;

                // check if user already exists in attendees collection
                const userDoc = await adminDb.collection("attendees").doc(uid).get();
                if (userDoc.exists) {
                    return NextResponse.json(
                        { error: "User already exists" },
                        { status: 409 }
                    );
                }

                // Store the form submission to Firebase collection attendees (if user doesn't exist)
                await adminDb.collection("attendees").doc(uid).set({
                    fullName: responses["1706880442"] || "",
                    email: responses["464604082"] || session.user.email,
                    contactNo: responses["1329997643"] || "",
                    nationality: responses["492691881"] || "",
                    emiratesID: responses["1368274746"] || "",
                    major: responses["1740303904"] || "",
                    paid: false,
                    submitted: true,
                    submittedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });

                console.log("=== FORM SUBMITTED ===")
                console.log("Form submitted successfully for user:", uid);
            } catch (fbError) {
                console.log("=== FORM SUBMISSION FAILED ===")
                console.log(fbError);
            }
        } else if (type === "competitor" && idToken) {
            try {
                // Verify idtToken and get the UserID
                const decodedToken = await adminAuth.verifyIdToken(idToken);
                const uid = decodedToken.uid;

                // check if user already exists in attendees collection
                const userDoc = await adminDb.collection("competitors").doc(uid).get();
                if (userDoc.exists) {
                    return NextResponse.json(
                        { error: "User already exists" },
                        { status: 409 }
                    );
                }

                if (responses["563534208"] === "Engineering") {
                    // Store the form submission to Firebase collection competitor (Engineering)
                    await adminDb.collection("competitors").doc(uid).set({
                        fullName: responses["1706880442"] || "",
                        email: responses["464604082"] || "",
                        contactNo: responses["1329997643"] || "",
                        nationality: responses["492691881"] || "",
                        emiratesID: responses["1368274746"] || "",
                        major: responses["563534208"] || "",
                        majorType: responses["1921732712"] || "",
                        year: responses["2106989264"] || "",
                        linkedIn: responses["1706787055"] || "",
                        googleDrive: responses["979885116"] || "",
                        group1: responses["2005954606"] || [],
                        group2: responses["909777607"] || [],
                        group3: responses["1618805851"] || [],
                        group4: responses["342956899"] || [],
                        workStyle: responses["1475281755"] || "",
                        projects: responses["1889236055"] || "",
                        experience: responses["913830966"] || "",
                        challengeAnswer: responses["1822551769"] || "",
                        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        isPayed: false,
                        submitted: true,
                        domain: "",
                        attended: false,
                    }, { merge: true });
                }

                if (responses["563534208"] === "Medicine") {
                    // Store the form submission to Firebase collection competitor (Medicine)
                    await adminDb.collection("competitors").doc(uid).set({
                        fullName: responses["1706880442"] || "",
                        email: responses["464604082"] || "",
                        contactNo: responses["1329997643"] || "",
                        nationality: responses["492691881"] || "",
                        emiratesID: responses["1368274746"] || "",
                        major: responses["563534208"] || "",
                        majorType: responses["1945900292"] || "",
                        year: responses["257116715"] || "",
                        skillSet: responses["697380523"] || "",
                        linkedIn: responses["1745529891"] || "",
                        resume: responses["2111396898"] || "",
                        googleDrive: responses["934276771"] || "",
                        challenge1: responses["1644031809"] || "",
                        challenge2: responses["1176839290"] || "",
                        enthusiasmCheck: responses["1213229623"] || "",
                        collaborativeSpirit: responses["1628051962"] || "",
                        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        isPayed: false,
                        submitted: true,
                        status: "pending",
                        domain: "",
                        attended: false,
                    }, { merge: true });
                }

                console.log("=== FORM SUBMITTED (COMPETITOR - " + responses["563534208"] + ") ===")
                console.log("Form submitted successfully for user:", uid);

            } catch (fbError) {
                console.log("=== FORM SUBMISSION FAILED (COMPETITOR) ===")
                console.log(fbError);
            }
        }

        // 2. Identify Configuration
        const formId = type === "attendee"
            ? process.env.ATTENDEE_FORM_ID
            : process.env.GOOGLE_FORM_ID;

        const publishedFormId = type === "attendee"
            ? process.env.ATTENDEE_FORM_PUBLISHED_ID
            : process.env.GOOGLE_FORM_PUBLISHED_ID;

        const sheetId = type === "attendee"
            ? process.env.ATTENDEE_SHEET_ID
            : process.env.GOOGLE_SHEET_ID;

        if (!formId || !publishedFormId) {
            return NextResponse.json(
                { error: `Configuration Error: Missing Form ID for '${type}'` },
                { status: 500 }
            );
        }

        // Build form submission data (shared between Forms submission)
        const submitData = new URLSearchParams();
        submitData.append('pageHistory', '0');
        submitData.append('fvv', '1');

        // Process responses for Google Forms format
        Object.entries(responses).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                value.forEach(item => submitData.append(`entry.${key}`, String(item)));
            }
            else if (typeof value === 'object' && value !== null) {
                const valObj = value as Record<string, any>;
                const isDate = 'date' in valObj || 'year' in valObj;
                const isTime = 'time' in valObj || ('hours' in valObj && 'minutes' in valObj);

                if (isDate || isTime) {
                    if (valObj.date) {
                        const [y, m, d] = valObj.date.split('-');
                        submitData.append(`entry.${key}_year`, y);
                        submitData.append(`entry.${key}_month`, m);
                        submitData.append(`entry.${key}_day`, d);
                    }
                    if (valObj.time) {
                        const [h, min] = valObj.time.split(':');
                        submitData.append(`entry.${key}_hour`, h);
                        submitData.append(`entry.${key}_minute`, min);
                    }
                    if ('hours' in valObj) {
                        submitData.append(`entry.${key}_hour`, String(valObj.hours));
                        submitData.append(`entry.${key}_minute`, String(valObj.minutes));
                        submitData.append(`entry.${key}_second`, String(valObj.seconds || 0));
                    }
                } else {
                    Object.entries(valObj).forEach(([rowEntryId, colVal]) => {
                        if (Array.isArray(colVal)) {
                            colVal.forEach(c => submitData.append(`entry.${rowEntryId}`, String(c)));
                        } else {
                            submitData.append(`entry.${rowEntryId}`, String(colVal));
                        }
                    });
                }
            }
            else {
                const strValue = String(value);
                const dateMatch = strValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                if (dateMatch) {
                    submitData.append(`entry.${key}_year`, dateMatch[1]);
                    submitData.append(`entry.${key}_month`, dateMatch[2]);
                    submitData.append(`entry.${key}_day`, dateMatch[3]);
                    return;
                }
                const timeMatch = strValue.match(/^(\d{2}):(\d{2})$/);
                if (timeMatch) {
                    submitData.append(`entry.${key}_hour`, timeMatch[1]);
                    submitData.append(`entry.${key}_minute`, timeMatch[2]);
                    return;
                }
                submitData.append(`entry.${key}`, strValue);
            }
        });

        // DEBUG: Log exactly what we're sending to Google Forms
        console.log("=== GOOGLE FORMS SUBMISSION DEBUG ===");
        console.log("Submit URL:", `https://docs.google.com/forms/d/e/${publishedFormId}/formResponse`);
        console.log("URLSearchParams entries:");
        for (const [key, value] of submitData.entries()) {
            console.log(`  ${key} = ${value}`);
        }
        console.log("Full query string length:", submitData.toString().length);

        // ============================================
        // SUBMIT TO FORMS (Primary - must succeed)
        // ============================================
        const submitUrl = `https://docs.google.com/forms/d/e/${publishedFormId}/formResponse`;

        const formSubmitResponse = await fetch(submitUrl, {
            method: "POST",
            body: submitData,
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        const formsSuccess = formSubmitResponse.ok || formSubmitResponse.status === 302 || formSubmitResponse.status === 303;

        if (!formsSuccess) {
            const errorText = await formSubmitResponse.text();
            console.error("Google Forms submission failed:", formSubmitResponse.status);
            console.error("Response body:", errorText);
            return NextResponse.json(
                { error: "Form submission failed", details: errorText },
                { status: 500 }
            );
        }

        console.log("Google Forms submission successful!");

        // Note: Google Forms automatically writes to its linked Sheet,
        // so we don't need a separate Sheets API call here.

        return NextResponse.json({
            success: true,
            message: "Form submitted successfully!"
        });

    } catch (error) {
        console.error("Submission Error:", error);
        return NextResponse.json(
            { error: "Failed to submit form", details: String(error) },
            { status: 500 }
        );
    }
}

// Background function for Sheets submission
async function submitToSheets(
    sheetId: string,
    formId: string,
    publishedFormId: string,
    responses: Record<string, unknown>,
    userEmail: string
) {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, "\n"),
        },
        scopes: [
            "https://www.googleapis.com/auth/forms.body.readonly",
            "https://www.googleapis.com/auth/spreadsheets",
        ],
    });

    const forms = google.forms({ version: "v1", auth });
    const sheets = google.sheets({ version: "v4", auth });

    // Fetch Form Structure
    const formResponse = await forms.forms.get({ formId });
    const form = formResponse.data;

    // Get Entry ID map
    const entryIdMap = await getPublicEntryIds(publishedFormId);

    const validHeaders = ["Submitted At", "User Email"];
    const rowValues: string[] = [new Date().toISOString(), userEmail];

    // Iterate through form items and build row
    if (form.items) {
        for (const item of form.items) {
            const title = item.title || "";

            if (item.questionItem) {
                validHeaders.push(title);
                const potentialIds = entryIdMap.get(title) || [];
                let answer = "";
                for (const pid of potentialIds) {
                    if (typeof pid === "string" && responses[pid] !== undefined) {
                        answer = responses[pid] as string;
                        break;
                    }
                }
                rowValues.push(Array.isArray(answer) ? answer.join(", ") : String(answer || ""));
            }
            else if (item.questionGroupItem && item.questionGroupItem.questions) {
                const gridTitle = item.title || "";
                for (const q of item.questionGroupItem.questions) {
                    const rowLabel = q.rowQuestion?.title || "";
                    const fullHeader = `${gridTitle} [${rowLabel}]`;
                    validHeaders.push(fullHeader);

                    const potentialGrids = entryIdMap.get(gridTitle) || [];
                    let rowEntryId = "";
                    for (const pg of potentialGrids) {
                        if (typeof pg === "object" && pg !== null && (pg as any)[rowLabel]) {
                            rowEntryId = (pg as any)[rowLabel];
                            break;
                        }
                    }
                    const answer = rowEntryId ? responses[rowEntryId] : "";
                    rowValues.push(String(answer || ""));
                }
            }
        }
    }

    // Check if headers exist
    const sheetMetadata = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "A1:Z1",
    });

    const currentHeaders = sheetMetadata.data.values?.[0];
    if (!currentHeaders || currentHeaders.length === 0) {
        await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: "A1",
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [validHeaders] },
        });
    }

    // Append data
    await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: "A1",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [rowValues] },
    });

    console.log("Google Sheets submission successful!");
}
