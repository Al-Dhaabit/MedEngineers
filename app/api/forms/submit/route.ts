import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getPublicEntryIds } from "@/lib/google-forms";
import { auth } from "@/lib/Firebase";
import admin from "firebase-admin";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { validateFormSubmission } from "@/lib/validators";
import { rateLimitMiddleware, recordSubmission } from "@/lib/rateLimiter";
import { logger, logSubmission, logValidationError, logRateLimit } from "@/lib/logger";

// Global token store for replay protection (use Redis in production)
declare global {
    var recentTokens: Map<string, number> | undefined;
}

export async function POST(req: NextRequest) {
    const requestId = logger.getRequestId();
    let session: any = null;
    let formType: string = "competitor";
    let decodedToken: any = null;

    try {
        logger.info('Form submission attempt', { requestId });

        const body = await req.json();
        const { responses, type = "competitor", idToken } = body;
        formType = type;

        // 1. Verify Firebase Authentication
        if (!idToken) {
            logger.warn('Missing ID token in request', { requestId });
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        try {
            // Verify token and check for revocation
            decodedToken = await adminAuth.verifyIdToken(idToken, true);

            // Additional security checks
            if (!decodedToken.email_verified) {
                logger.warn('Unverified email attempted submission', {
                    requestId,
                    email: decodedToken.email
                });
                return NextResponse.json({
                    error: "Email must be verified to submit applications"
                }, { status: 401 });
            }

        } catch (error) {
            logger.error('Token verification failed', {
                requestId,
                error: error instanceof Error ? error.message : String(error)
            });
            return NextResponse.json({
                error: "Invalid authentication token"
            }, { status: 401 });
        }

        if (!decodedToken.email) {
            logger.warn('Token missing email claim', { requestId });
            return NextResponse.json({
                error: "Invalid authentication token"
            }, { status: 401 });
        }

        // === INPUT VALIDATION === //
        logger.debug('Validating form input', { requestId });
        logger.debug('Request body:', { requestId, body });
        logger.debug('Form type:', { requestId, type });

        const validation = validateFormSubmission(body, type);

        if (!validation.success) {
            logValidationError(validation.details || [], decodedToken.email);
            return NextResponse.json(
                {
                    error: validation.details?.join(', ') || "Invalid form data. Please check your input and try again.",
                    code: validation.code,
                    details: validation.details
                },
                { status: 400 }
            );
        }

        // Additional security: Check if token was recently used (prevent replay attacks)
        const tokenHash = Buffer.from(idToken).toString('base64').substring(0, 32);
        const recentTokenKey = `recent_token_${decodedToken.uid}_${tokenHash}`;

        // In production, use Redis for this. For now, using memory with cleanup
        if (global.recentTokens?.has(recentTokenKey)) {
            logger.warn('Token reuse detected', {
                requestId,
                uid: decodedToken.uid
            });
            return NextResponse.json({
                error: "Invalid request - token already used"
            }, { status: 401 });
        }

        // Store token hash to prevent reuse (expires in 5 minutes)
        if (!global.recentTokens) {
            global.recentTokens = new Map();
        }
        global.recentTokens.set(recentTokenKey, Date.now());

        // Cleanup old tokens
        setTimeout(() => {
            global.recentTokens?.delete(recentTokenKey);
        }, 5 * 60 * 1000);

        logger.info('Authentication successful', {
            requestId,
            uid: decodedToken.uid,
            email: decodedToken.email,
            emailVerified: decodedToken.email_verified
        });

        // === CODE ADDED BY AHMAD FOR FIREBASE === //

        // Storing form submission to Firebase
        if (type === "attendee" && idToken) {
            try {
                // Use the already decoded token
                const uid = decodedToken.uid;

                // check if user already exists in attendees collection
                const userDoc = await adminDb.collection("attendees").doc(uid).get();
                if (userDoc.exists) {
                    return NextResponse.json(
                        { error: "User already exists" },
                        { status: 409 }
                    );
                }

                // Store the form submission to Firebase// Store in attendees collection (if user doesn't exist)
                await adminDb.collection("attendees").doc(uid).set({
                    fullName: responses["1706880442"] || "",
                    email: responses["464604082"] || decodedToken.email,
                    contactNo: responses["1329997643"] || "",
                    nationality: responses["492691881"] || "",
                    emiratesID: responses["1368274746"] || "",
                    major: responses["1740303904"] || "",
                    paid: false,
                    submitted: true,
                    submittedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });

                logger.info("Form submitted successfully for user (attendee)", { uid });

            } catch (fbError) {
                logger.error('Firebase submission failed', {
                    requestId,
                    type: 'attendee',
                    error: fbError
                });

                // Return proper error response to client
                return NextResponse.json(
                    {
                        error: "Failed to save application to database",
                        code: "FIREBASE_SAVE_ERROR"
                    },
                    { status: 500 }
                );
            }
        } else if (type === "competitor" && idToken) {
            try {
                // Use the already decoded token
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
                        majorType: responses["1921732712"] || responses["1945900292"] || "",
                        year: responses["2106989264"] || responses["257116715"] || "",
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
                        submitted: true,
                        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        isPayed: false,
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
                        majorType: responses["1945900292"] || responses["1921732712"] || "",
                        year: responses["257116715"] || responses["2106989264"] || "",
                        skillSet: responses["697380523"] || "",
                        linkedIn: responses["1745529891"] || "",
                        resume: responses["2111396898"] || "",
                        googleDrive: responses["934276771"] || "",
                        challenge1: responses["1644031809"] || "",
                        challenge2: responses["1176839290"] || "",
                        enthusiasmCheck: responses["1213229623"] || "",
                        collaborativeSpirit: responses["1628051962"] || "",
                        submitted: true,
                        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        isPayed: false,
                        status: "pending",
                        domain: "",
                        attended: false,
                    }, { merge: true });
                }

                logger.info("Form submitted successfully for user (competitor)", { uid, major: responses["563534208"] });

            } catch (fbError) {
                logger.error('Firebase submission failed', {
                    requestId,
                    type: 'competitor',
                    error: fbError
                });

                return NextResponse.json(
                    {
                        error: "Failed to save application to database",
                        code: "FIREBASE_SAVE_ERROR"
                    },
                    { status: 500 }
                );
            }
        }

        // 2. Identify Configuration
        const formId = type === "attendee"
            ? process.env.ATTENDEE_FORM_ID
            : process.env.GOOGLE_FORM_ID;

        const publishedFormId = type === "attendee"
            ? process.env.ATTENDEE_FORM_PUBLISHED_ID
            : process.env.GOOGLE_FORM_PUBLISHED_ID;

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
            logger.error("Google Forms submission failed", { status: formSubmitResponse.status, error: errorText, requestId });
            return NextResponse.json(
                { error: "Form submission failed", details: errorText },
                { status: 500 }
            );
        }

        // Record successful submission for rate limiting
        logSubmission(decodedToken.email, type, true);

        logger.info('Form submission completed successfully', {
            requestId,
            type,
            email: decodedToken.email
        });

        return NextResponse.json({
            success: true,
            message: "Form submitted successfully!"
        });

    } catch (error) {
        logger.error('Form submission failed', {
            requestId,
            error
        });

        logSubmission(decodedToken?.email || 'unknown', formType, false, error);

        return NextResponse.json(
            {
                error: "Failed to submit form. Please try again.",
                code: "SUBMISSION_ERROR"
            },
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
