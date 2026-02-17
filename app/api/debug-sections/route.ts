// Debug endpoint to list all sections in the form
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { verifyAdminSession } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
    // ============================================
    // LAYER 1: Admin Authentication
    // ============================================
    try {
        await verifyAdminSession();
    } catch (error: any) {
        const errorMessage = error.message || String(error);
        console.warn('[DebugSections] Unauthorized access attempt', { error: errorMessage });

        if (errorMessage.includes("FORBIDDEN")) {
            return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
        }
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const formType = searchParams.get("type") || "competitor";

    // Get the appropriate form ID based on type
    const formId = formType === "attendee"
        ? process.env.GOOGLE_FORM_ID_ATTENDEE || process.env.GOOGLE_FORM_ID
        : process.env.GOOGLE_FORM_ID;

    if (!formId) {
        return NextResponse.json({ error: "Form ID not configured" }, { status: 500 });
    }

    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
            },
            scopes: ["https://www.googleapis.com/auth/forms.body.readonly"],
        });

        const forms = google.forms({ version: "v1", auth });
        const response = await forms.forms.get({ formId });
        const form = response.data;

        const sections: { title: string; description: string; nextQuestion: string }[] = [];

        if (form.items) {
            for (let i = 0; i < form.items.length; i++) {
                const item = form.items[i];

                // Check if this is a section header (no questionItem or questionGroupItem)
                if (!item.questionItem && !item.questionGroupItem && item.title) {
                    // Find the next question after this section
                    let nextQuestion = "(end of form)";
                    for (let j = i + 1; j < form.items.length; j++) {
                        if (form.items[j].questionItem || form.items[j].questionGroupItem) {
                            nextQuestion = form.items[j].title || "(no title)";
                            break;
                        }
                    }

                    sections.push({
                        title: item.title,
                        description: item.description || "",
                        nextQuestion: nextQuestion
                    });
                }
            }
        }

        return NextResponse.json({
            formTitle: form.info?.title,
            formType: formType,
            sections: sections
        });

    } catch (error: any) {
        console.error("Error fetching form:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
