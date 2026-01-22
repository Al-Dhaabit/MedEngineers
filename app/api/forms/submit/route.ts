import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getPublicEntryIds } from "@/lib/google-forms";

export async function POST(req: NextRequest) {
    try {
        // 1. Verify Authentication
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { responses, type = "competitor" } = body;

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

        // ============================================
        // PART A: Submit to Google Forms (Public POST)
        // ============================================

        // Fetch the form HTML to get fbzx token
        const formUrl = `https://docs.google.com/forms/d/e/${publishedFormId}/viewform`;
        const formHtmlRes = await fetch(formUrl);
        const htmlText = await formHtmlRes.text();

        // Extract fbzx token
        const getFbzx = (html: string): string => {
            const match = html.match(/name="fbzx"\s+value="([^"]+)"/);
            return match ? match[1] : "";
        };
        const fbzx = getFbzx(htmlText);

        // Prepare the form submission
        const submitUrl = `https://docs.google.com/forms/d/e/${publishedFormId}/formResponse`;
        const submitData = new URLSearchParams();

        // Add required tokens
        submitData.append('pageHistory', '0');
        submitData.append('fvv', '1');
        if (fbzx) {
            submitData.append('fbzx', fbzx);
        }

        // Loop through incoming answers and format for Google Forms
        Object.entries(responses).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                // Checkboxes: append each value
                value.forEach(item => submitData.append(`entry.${key}`, String(item)));
            }
            else if (typeof value === 'object' && value !== null) {
                const valObj = value as Record<string, any>;
                const isDate = 'date' in valObj || 'year' in valObj;
                const isTime = 'time' in valObj || ('hours' in valObj && 'minutes' in valObj);

                if (isDate || isTime) {
                    // Handle Date/Time
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
                    // Grid: Keys are Row Entry IDs, Values are Column Values
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
                // Simple string value - check for date/time patterns
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
                // Regular string
                submitData.append(`entry.${key}`, strValue);
            }
        });

        console.log("--- GOOGLE FORMS SUBMISSION ---");
        console.log("Target URL:", submitUrl);

        // Submit to Google Forms
        const formSubmitResponse = await fetch(submitUrl, {
            method: "POST",
            body: submitData,
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        const formsSuccess = formSubmitResponse.ok || formSubmitResponse.status === 302 || formSubmitResponse.status === 303;
        if (!formsSuccess) {
            console.error("Google Forms submission failed:", formSubmitResponse.status);
        } else {
            console.log("Google Forms submission successful!");
        }

        // ============================================
        // PART B: Submit to Google Sheets (Service Account)
        // ============================================

        if (sheetId) {
            try {
                // Initialize Google Clients (Service Account)
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
                const rowValues: string[] = [new Date().toISOString(), session.user.email || ""];

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
                                    answer = responses[pid];
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
            } catch (sheetsError) {
                console.error("Google Sheets submission failed:", sheetsError);
                // Don't fail the whole request if sheets fails - forms might have succeeded
            }
        }

        // Return success if Forms worked
        if (formsSuccess) {
            return NextResponse.json({
                success: true,
                message: "Form submitted successfully!"
            });
        } else {
            return NextResponse.json(
                { error: "Form submission failed" },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error("Submission Error:", error);
        return NextResponse.json(
            { error: "Failed to submit form", details: String(error) },
            { status: 500 }
        );
    }
}
