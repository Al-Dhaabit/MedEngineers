import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { calculateDomainRecommendation, EngineerResponses, DomainRecommendation } from "@/lib/domainAlgorithm";
import { verifyAdminSession } from "@/lib/adminAuth";

interface SubmissionData {
    responses: Record<string, any>;
    timestamp: string;
    email?: string;
}

// ============ IN-MEMORY CACHE ============
// TODO: Replace with Firebase in future
interface CacheEntry {
    data: any;
    timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let domainCache: CacheEntry | null = null;

function getCachedData(): any | null {
    if (!domainCache) return null;
    const now = Date.now();
    if (now - domainCache.timestamp > CACHE_TTL_MS) {
        domainCache = null; // Cache expired
        return null;
    }
    return domainCache.data;
}

function setCacheData(data: any): void {
    domainCache = {
        data,
        timestamp: Date.now(),
    };
}

function getCacheAge(): number {
    if (!domainCache) return -1;
    return Math.floor((Date.now() - domainCache.timestamp) / 1000);
}
// ==========================================

/**
 * GET: Fetch all engineering submissions and calculate domain recommendations
 * Returns a list of all engineers with their recommended domains
 * OPTIMIZED: Single Google Sheets API call + Real-time analysis
 *
 * Query params:
 * - email: (optional) Filter by specific email
 */
export async function GET(req: NextRequest) {
    try {
        // ============================================
        // LAYER 1: Admin Authentication
        // ============================================
        try {
            await verifyAdminSession();
        } catch (error: any) {
            const errorMessage = error.message || String(error);
            console.warn('[DomainSuggest] Unauthorized access attempt', { error: errorMessage });

            if (errorMessage.includes("FORBIDDEN")) {
                return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
            }
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const filterEmail = searchParams.get("email");

        // 1. Set up authentication for Google Sheets ONLY
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, "\n"),
            },
            scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
        });

        const sheets = google.sheets({ version: "v4", auth });
        const sheetId = process.env.GOOGLE_SHEET_ID;

        if (!sheetId) {
            return NextResponse.json(
                { error: "Configuration missing: Sheet ID not set" },
                { status: 500 }
            );
        }

        // 2. Fetch ONLY the sheet data (fast - single API call)
        const sheetResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: "A:Z",
        });

        const rows = sheetResponse.data.values || [];

        if (rows.length < 2) {
            return NextResponse.json({
                message: "No submissions found",
                submissions: [],
            });
        }

        // 3. Get headers and data directly from sheet (much simpler!)
        const headers = rows[0] as string[];
        const dataRows = rows.slice(1);

        // 6. Process each submission
        const results: Array<{
            rowIndex: number;
            timestamp: string;
            email: string;
            name: string;
            major: string;
            recommendation: DomainRecommendation | null;
            rawResponses?: Record<string, any>;
        }> = [];

        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            const rowData: Record<string, any> = {};

            // Map row to headers
            headers.forEach((header, idx) => {
                if (row[idx] !== undefined) {
                    rowData[header] = row[idx];
                }
            });

            // Extract key fields
            const timestamp = rowData["Timestamp"] || rowData["Submitted At"] || "";
            const email = rowData["Email Address"] || rowData["User Email"] || rowData["University Email"] || "";
            const name = rowData["Full Name"] || rowData["Name"] || "";

            // Find major field - search for any header containing "major"
            let major = "";
            for (const header of headers) {
                if (header.toLowerCase().includes("major") && !header.toLowerCase().includes("year")) {
                    major = rowData[header] || "";
                    if (major) break; // Use first non-empty match
                }
            }

            // Filter by email if specified
            if (filterEmail && !email.toLowerCase().includes(filterEmail.toLowerCase())) {
                continue;
            }

            // FLEXIBLE ENGINEER DETECTION - Multiple strategies
            let isEngineer = false;

            // Strategy 1: Direct major field check
            const majorLower = major.toLowerCase();
            if (majorLower.includes("engineering") ||
                majorLower.includes("engineer") ||
                majorLower === "engineering" ||
                majorLower.includes("mechanical") ||
                majorLower.includes("electrical") ||
                majorLower.includes("computer") ||
                majorLower.includes("biomedical") ||
                majorLower.includes("industrial") ||
                majorLower.includes("chemical") ||
                majorLower.includes("civil") ||
                majorLower.includes("software")) {
                isEngineer = true;
            }

            // Strategy 2: Check if they have engineering-specific skill groups (Domain A, B, C)
            if (!isEngineer) {
                for (const header of headers) {
                    const headerLower = header.toLowerCase();
                    if (headerLower.includes("group 1") ||
                        headerLower.includes("group 2") ||
                        headerLower.includes("group 3") ||
                        headerLower.includes("physical systems") ||
                        headerLower.includes("domain a") ||
                        headerLower.includes("domain b") ||
                        headerLower.includes("domain c")) {
                        // If the row has a value for any engineering skill group, they're an engineer
                        if (rowData[header] && rowData[header].trim()) {
                            isEngineer = true;
                            major = major || "Engineering (inferred from skills)";
                            break;
                        }
                    }
                }
            }

            // Strategy 3: Check for engineering-specific questions answered
            if (!isEngineer) {
                for (const header of headers) {
                    const headerLower = header.toLowerCase();
                    if ((headerLower.includes("hands-on") && headerLower.includes("project")) ||
                        (headerLower.includes("high-speed team")) ||
                        (headerLower.includes("medication") && headerLower.includes("scenario"))) {
                        if (rowData[header] && rowData[header].trim()) {
                            isEngineer = true;
                            major = major || "Engineering (inferred from responses)";
                            break;
                        }
                    }
                }
            }

            // Strategy 4: Check ALL fields for "engineering" keyword
            if (!isEngineer) {
                for (const header of headers) {
                    const val = (rowData[header] || "").toString().toLowerCase();
                    if (val.includes("engineering") || val === "engineer") {
                        isEngineer = true;
                        major = major || "Engineering";
                        break;
                    }
                }
            }

            if (!isEngineer) {
                results.push({
                    rowIndex: i + 2, // 1-indexed + header row
                    timestamp,
                    email,
                    name,
                    major: major || "(no major found)",
                    recommendation: null, // Not an engineer
                });
                continue;
            }

            // 4. Build engineer responses directly from sheet headers (simplified!)
            const engineerResponses: EngineerResponses = {};

            // Also do direct header matching for better coverage
            for (const header of headers) {
                const value = rowData[header];
                if (!value) continue;

                const lowerHeader = header.toLowerCase();

                // Direct mapping for common question patterns
                if (lowerHeader.includes("group 1") || lowerHeader.includes("physical systems")) {
                    engineerResponses.skillsGroupA = value.includes(",")
                        ? value.split(",").map((s: string) => s.trim())
                        : [value];
                }
                if (lowerHeader.includes("group 2") || lowerHeader.includes("systems & operations")) {
                    engineerResponses.skillsGroupB = value.includes(",")
                        ? value.split(",").map((s: string) => s.trim())
                        : [value];
                }
                if (lowerHeader.includes("group 3") || lowerHeader.includes("digital")) {
                    engineerResponses.skillsGroupC = value.includes(",")
                        ? value.split(",").map((s: string) => s.trim())
                        : [value];
                }
                if (lowerHeader.includes("group 4") || lowerHeader.includes("project management")) {
                    engineerResponses.skillsGlobal = value.includes(",")
                        ? value.split(",").map((s: string) => s.trim())
                        : [value];
                }
                if (lowerHeader.includes("describes your contribution") || lowerHeader.includes("high-speed team")) {
                    engineerResponses.workStylePersona = value;
                }
                if (lowerHeader.includes("hands-on")) {
                    engineerResponses.handsOnProject = value;
                }
                if (lowerHeader.includes("professional") || lowerHeader.includes("internship")) {
                    engineerResponses.professionalExp = value;
                }
                if (lowerHeader.includes("scenario") || lowerHeader.includes("medication")) {
                    engineerResponses.scenarioResponse = value;
                }
            }

            // 8. Calculate recommendation
            const recommendation = calculateDomainRecommendation(engineerResponses);

            results.push({
                rowIndex: i + 2,
                timestamp,
                email,
                name,
                major,
                recommendation,
                rawResponses: engineerResponses,
            });
        }

        // Build response data
        const responseData = {
            message: "Domain recommendations calculated",
            totalSubmissions: dataRows.length,
            engineerCount: results.filter(r => r.recommendation !== null).length,
            submissions: results,
            // Debug info (can remove in production)
            debug: {
                headers: headers,
                sampleRow: dataRows[0] ? Object.fromEntries(headers.map((h, i) => [h, dataRows[0][i] || ""])) : null,
            },
        };

        if (!filterEmail) {
            // No server-side cache - rely on client-side
        }

        return NextResponse.json({
            ...responseData,
        });

    } catch (error) {
        console.error("Domain suggestion error:", error);
        return NextResponse.json(
            { error: "Failed to calculate domain recommendations", details: String(error) },
            { status: 500 }
        );
    }
}

/**
 * POST: Calculate domain recommendation for provided responses
 * Useful for real-time preview during form filling
 */
export async function POST(req: NextRequest) {
    try {
        // ============================================
        // LAYER 1: Admin Authentication
        // ============================================
        try {
            await verifyAdminSession();
        } catch (error: any) {
            const errorMessage = error.message || String(error);
            console.warn('[DomainSuggest POST] Unauthorized access attempt', { error: errorMessage });

            if (errorMessage.includes("FORBIDDEN")) {
                return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
            }
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { responses } = body;

        if (!responses) {
            return NextResponse.json(
                { error: "No responses provided" },
                { status: 400 }
            );
        }

        // Calculate recommendation directly (responses should be EngineerResponses format)
        const engineerResponses: EngineerResponses = responses;

        const recommendation = calculateDomainRecommendation(engineerResponses);

        return NextResponse.json({
            success: true,
            recommendation,
        });

    } catch (error) {
        console.error("Domain suggestion POST error:", error);
        return NextResponse.json(
            { error: "Failed to calculate recommendation", details: String(error) },
            { status: 500 }
        );
    }
}
