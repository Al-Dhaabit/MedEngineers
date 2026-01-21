import { google } from "googleapis";
import { NextResponse } from "next/server";

// Form structure types
interface FormQuestion {
    id: string;
    entryId?: string; // Actual Google Form Entry ID
    type: string;
    label: string;
    required: boolean;
    options?: string[];
    min?: number;
    max?: number;
    minLabel?: string;
    maxLabel?: string;
    rows?: { id: string, entryId: string, label: string }[];
    columns?: string[];
    placeholder?: string;
}

interface FormData {
    title: string;
    description: string;
    questions: FormQuestion[];
}

import { getPublicEntryIds } from "@/lib/google-forms";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type") || "competitor";

        const formId = type === "attendee"
            ? process.env.ATTENDEE_FORM_ID
            : process.env.GOOGLE_FORM_ID;

        const publishedId = type === "attendee"
            ? process.env.ATTENDEE_FORM_PUBLISHED_ID
            : process.env.GOOGLE_FORM_PUBLISHED_ID;

        if (!formId || !publishedId) {
            return NextResponse.json(
                { error: `Form configuration for '${type}' not found` },
                { status: 500 }
            );
        }

        // 1. & 2. Fetch Entry IDs and Form Structure in Parallel
        const [entryIdMap, formResponse] = await Promise.all([
            getPublicEntryIds(publishedId),
            (async () => {
                const auth = new google.auth.GoogleAuth({
                    credentials: {
                        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, "\n"),
                    },
                    scopes: ["https://www.googleapis.com/auth/forms.body.readonly"],
                });
                const forms = google.forms({ version: "v1", auth });
                return forms.forms.get({ formId });
            })()
        ]);

        const form = formResponse.data;

        // 3. Transform & Merge
        const formData: FormData = {
            title: form.info?.title || "Application Form",
            description: form.info?.description || "",
            questions: [],
        };

        if (form.items) {
            for (const item of form.items) {
                // Skip non-question items (like page breaks, headers)
                if (!item.questionItem && !item.questionGroupItem) continue;

                const title = item.title || "";

                // Try to find the Entry ID Queue
                // We use a reference so we can shift items off it!
                let entryQueueIndex = -1;
                let entryQueueKey = "";

                // 1. Exact match
                if (entryIdMap.has(title)) {
                    entryQueueKey = title;
                }
                // 2. Retry with " *"
                else if (entryIdMap.has(title + " *")) {
                    entryQueueKey = title + " *";
                }
                // 3. Fuzzy search
                else {
                    const trimmedTitle = title.trim();
                    for (const [key] of entryIdMap.entries()) {
                        if (key.trim() === trimmedTitle || key.trim() === trimmedTitle + " *") {
                            entryQueueKey = key;
                            break;
                        }
                    }
                }

                let entryQueue = entryIdMap.get(entryQueueKey);

                // Debug: Log what we found
                if (!entryQueue || entryQueue.length === 0) {
                    console.warn(`[ID MAPPING] No Entry ID found for: "${title}"`);
                }

                // EXTRACT THE ID:
                // We shift the FIRST compatible item from the queue to ensure we don't reuse it for the next identical question.

                let scrapedEntryId = "";
                // Helper to consume a string ID
                if (entryQueue && !item.questionGroupItem) {
                    const idx = entryQueue.findIndex(q => typeof q === 'string');
                    if (idx !== -1) {
                        scrapedEntryId = entryQueue[idx] as string;
                        entryQueue.splice(idx, 1); // CONSUME IT
                    }
                }

                // Use a unique fallback for React keys (but NOT for submission)
                // item.itemId is a Google API internal ID (hex like "47e1afe4") and DOES NOT WORK for submission
                const uniqueKey = scrapedEntryId || `fallback_${item.itemId || Math.random().toString(36).slice(2)}`;

                if (item.questionItem) {
                    const question = item.questionItem.question;
                    if (!question) continue;

                    const baseQuestion: FormQuestion = {
                        id: uniqueKey, // Use unique key for React rendering
                        entryId: scrapedEntryId, // Only use real Entry IDs for submission
                        type: "short_answer",
                        label: title,
                        required: question.required || false,
                    };

                    // Determine question type from API data
                    if (question.textQuestion) {
                        baseQuestion.type = question.textQuestion.paragraph ? "paragraph" : "short_answer";
                        baseQuestion.placeholder = "Enter your answer...";
                    } else if (question.choiceQuestion) {
                        const choiceQ = question.choiceQuestion;
                        if (choiceQ.type === "RADIO") {
                            baseQuestion.type = "radio";
                        } else if (choiceQ.type === "CHECKBOX") {
                            baseQuestion.type = "checkbox";
                        } else if (choiceQ.type === "DROP_DOWN") {
                            baseQuestion.type = "dropdown";
                        }
                        baseQuestion.options = choiceQ.options?.map((o) => o.value || "") || [];
                    } else if (question.scaleQuestion) {
                        baseQuestion.type = "linear_scale";
                        baseQuestion.min = question.scaleQuestion.low || 1;
                        baseQuestion.max = question.scaleQuestion.high || 5;
                        baseQuestion.minLabel = question.scaleQuestion.lowLabel || "";
                        baseQuestion.maxLabel = question.scaleQuestion.highLabel || "";
                    } else if (question.ratingQuestion) {
                        // Handle STAR rating
                        baseQuestion.type = "star_rating";
                        baseQuestion.max = question.ratingQuestion.ratingScaleLevel || 5;
                    } else if (question.dateQuestion) {
                        baseQuestion.type = question.dateQuestion.includeTime ? "datetime" : "date";
                    } else if (question.timeQuestion) {
                        baseQuestion.type = question.timeQuestion.duration ? "duration" : "time";
                    }

                    formData.questions.push(baseQuestion);
                }

                // Handle Grid Questions
                else if (item.questionGroupItem) {
                    const grid = item.questionGroupItem;
                    const isCheckbox = grid.grid?.columns?.type === "CHECKBOX";

                    // Specific consumption for grids: Find the first object that contains at least one of our row labels
                    let gridMap: Record<string, string> = {};

                    if (entryQueue) {
                        // Heuristic: Check if the first available object map has the first row label
                        // Ideally we check more, but this is a good start.
                        const firstRowLabel = grid.questions?.[0]?.rowQuestion?.title;
                        if (firstRowLabel) {
                            const idx = entryQueue.findIndex(q => typeof q === 'object' && q !== null && q[firstRowLabel]);
                            if (idx !== -1) {
                                gridMap = entryQueue[idx] as Record<string, string>;
                                entryQueue.splice(idx, 1); // CONSUME IT
                            }
                        }
                    }

                    const gridRows = grid.questions?.map((q) => {
                        const rowLabel = q.rowQuestion?.title || "";
                        let rowId = "";

                        // Look up exact ID from the CONSUMED gridMap
                        if (gridMap && gridMap[rowLabel]) {
                            rowId = gridMap[rowLabel];
                        }

                        // Use rowId (Google Entry ID) as the ID if available, otherwise generate one
                        // But also explicitly provide entryId as required by the interface
                        return {
                            id: rowId || `row_${Math.random().toString(36).substr(2, 9)}`,
                            entryId: rowId,
                            label: rowLabel
                        };
                    }) || [];

                    // If we got a grid object back (not string), use it
                    // The entryData logic above handles FIFO for grids too if titles matched
                    
                    const gridQuestion: FormQuestion = {
                        id: uniqueKey,
                        // Grids are special, they don't have a single entry ID submitted at the top level
                        // We rely on the rows. But we can pass the scraped ID anyway if needed.
                        entryId: "grid_container",
                        type: isCheckbox ? "grid_checkbox" : "grid_radio",
                        label: title,
                        required: false,
                        rows: gridRows,
                        columns: grid.grid?.columns?.options?.map((o) => o.value || "") || [],
                    };

                    formData.questions.push(gridQuestion);
                }
            }
        }

        return NextResponse.json(formData, {
            headers: {
                "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
            },
        });
    } catch (error) {
        console.error("Error fetching form:", error);
        return NextResponse.json(
            { error: "Failed to fetch form", details: String(error) },
            { status: 500 }
        );
    }
}
