import React, { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import ReactMarkdown from "react-markdown";


// Type definitions for form data
interface FormQuestion {
    id: string;
    entryId?: string; // Actual Google Form Entry ID
    type: string;
    label: string;
    description?: string; // Question description/help text
    required: boolean;
    options?: string[];
    min?: number;
    max?: number;
    minLabel?: string;
    maxLabel?: string;
    rows?: { id: string, entryId?: string, label: string }[];
    columns?: string[];
    placeholder?: string;
}

interface FormData {
    title: string;
    description: string;
    questions: FormQuestion[];
}

type FormResponses = Record<string, unknown>;

interface CustomApplicationFormProps {
    onSubmitSuccess?: () => void;
}

export function CustomApplicationForm({ onSubmitSuccess }: CustomApplicationFormProps) {
    const { data: session, status } = useSession();
    const [formData, setFormData] = useState<FormData | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [autoSubmitting, setAutoSubmitting] = useState(false);
    const [autoSubmitSuccess, setAutoSubmitSuccess] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [responses, setResponses] = useState<FormResponses>({});
    const [formType, setFormType] = useState<"competitor" | "attendee">("competitor");
    const [selectedMajor, setSelectedMajor] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string | null>>({});
    const [isFormValid, setIsFormValid] = useState(false);
    // FRONTEND-ONLY SECTION HEADERS
    // These will be displayed BEFORE the question with the matching title
    // This allows us to remove sections from Google Forms (which break Entry ID scraping)
    // while keeping the visual structure in our frontend
    // showFor: optional - if specified, only show for this major. If omitted, show for all.
    const FRONTEND_SECTIONS: Record<string, { title: string; description: string; showFor?: string }> = {
        // ============ ENGINEERING SECTIONS ============
        "Group 1: Physical Systems (Domain A)": {
            title: "Your Technical Toolkit",
            description: "Select the skills you actually have experience with. This will determine your Hackathon Domain.",
            showFor: "Engineering"
        },
        "Which of these best describes your contribution to a high-speed team?": {
            title: "The \"Work Style\" Persona",
            description: "",
            showFor: "Engineering"
        },
        "Briefly describe your most \"hands-on\" project: (This could be a lab assignment, a student club project, or a personal hobby like fixing a car or building a website).": {
            title: "Experience & Proof of Work",
            description: "",
            showFor: "Engineering"
        },
        "Scenario: A hospital's medication delivery system is failing. Nurses are walking 2km a day just to fetch pills from the pharmacy.": {
            title: "The Engineering Logic Test",
            description: "Briefly answer the following to show us how you solve problems.",
            showFor: "Engineering"
        },

        // ============ MEDICINE SECTIONS ============
        // Use a Medicine-specific question as key (the second "What is your major?" has same label, so we use the next unique question)
        "If you were in a Hackathon team right now, which of these is your strongest asset?": {
            title: "Skillset",
            description: "",
            showFor: "Medicine"
        },
        "LinkedIn Profile URL (Optional)": {
            title: "Experience & Portfolio",
            description: "",
            showFor: "Medicine"
        },
        "The Clinical Efficiency Challenge": {
            title: "The \"Smartness\" Test (Critical Thinking)",
            description: "Choose one of these scenarios to test their ability to apply medical knowledge to innovation.",
            showFor: "Medicine"
        },
        // "The Why" is Medicine-only (has healthcare-specific description), no common ending section
    };

    // Skip logic configuration: question ranges for each major (1-indexed)
    // Each major shows questions from 'start' up to but not including 'end'
    // Questions before the major question (e.g., 1-6) are always shown
    // NOTE: These indices assume SECTIONS HAVE BEEN REMOVED from Google Forms
    const SKIP_LOGIC: Record<string, { start: number; end: number | null }> = {
        "Engineering": { start: 7, end: 19 },   // Items 7-18 (Engineering-only questions)
        "Medicine": { start: 19, end: null },   // Items 19+ (Medicine-only questions)
    };

    // No common ending - both tracks have their own final questions
    const COMMON_ENDING_START = 9999; // Disabled - no common ending section

    // The question index (0-indexed) that triggers the skip logic
    // This is typically "What major are you in?" - we'll detect it by label
    const MAJOR_QUESTION_KEYWORDS = ["what major are you in", "what is your major and year of study"];

    // ===== TEST DATA GENERATOR =====
    const fillTestData = (targetMajor: "Engineering" | "Medicine") => {
        if (!formData) return;

        // Force major update so visibility logic is correct for the loop
        setSelectedMajor(targetMajor);

        const newResponses: FormResponses = { ...responses };

        // Specific answers for Engineering Track
        const engineeringAnswers: Record<string, any> = {
            "Full Name": "Test Engineer",
            "University Email": "test.engineer@university.edu",
            "Phone Number": "+971501234567",
            "Nationality": "United Arab Emirates",
            "Emirates ID/Passport ID": "784-1234-1234567-1",
            "What major are you in?": "Engineering",
            "What is your major?": "Mechanical Engineering",
            "What is your year of study?": "3rd Year",
            "Link to your LinkedIn Profile": "https://linkedin.com/in/testengineer",
            "Link to Your Portfolio or Previous Projects": "https://github.com/testengineer",
            "Group 1: Physical Systems (Domain A)": ["CAD / 3D Modeling (SolidWorks, Fusion 360, etc.)"],
            "Group 2: Systems & Operations (Domain B - Ideal for INE)": ["Process Mapping / Flowcharting (BPMN, Lucidchart)"],
            "Group 3: Digital & Intelligence (Domain C)": ["Programming (Python, C++, Java, JavaScript)"],
            "Group 4: Project Management (Global Skills)": ["Technical Writing & Documentation"],
            "Which of these best describes your contribution to a high-speed team?": "The Builder: I am happiest when I am physically assembling something or making a motor spin.",
            "Briefly describe your most \"hands-on\" project": "Built a 3D-printed drone frame optimized for weight.",
            "Have you worked in a professional or internship setting before?": "Interned at STRATA in quality control for aerospace.",
            "Scenario: A hospital’s medication delivery system is failing": "I would build a smart dispenser ward-side to save nurse travel time."
        };

        // Determine visibility based on SKIP_LOGIC
        const checkVisibility = (index: number, major: string): boolean => {
            const majorQuestionIndex = formData.questions.findIndex(q =>
                MAJOR_QUESTION_KEYWORDS.some(kw => q.label.toLowerCase().includes(kw))
            );
            if (index <= majorQuestionIndex) return true;
            const range = SKIP_LOGIC[major];
            if (!range) return true;
            const questionNumber = index + 1;
            const afterStart = questionNumber >= range.start;
            const beforeEnd = range.end === null || questionNumber < range.end;
            const isCommonEnding = questionNumber >= COMMON_ENDING_START;
            return (afterStart && beforeEnd) || isCommonEnding;
        };

        formData.questions.forEach((q, index) => {
            if (!checkVisibility(index, targetMajor)) return;

            // Handle major question itself first
            if (MAJOR_QUESTION_KEYWORDS.some(kw => q.label.toLowerCase().includes(kw))) {
                newResponses[q.id] = targetMajor;
                return;
            }

            // Skip section headers
            if (q.type === "section_header") return;

            // 1. Check for hardcoded Engineering answers
            if (targetMajor === "Engineering") {
                const normalize = (str: string) => str.toLowerCase()
                    .replace(/[^a-z0-9]/g, '') // Strip EVERYTHING but letters and numbers
                    .trim();

                const qLabelNormalized = normalize(q.label);

                // Find matching key
                const matchKey = Object.keys(engineeringAnswers).find(k => {
                    const keyNorm = normalize(k);
                    return qLabelNormalized.includes(keyNorm) || keyNorm.includes(qLabelNormalized);
                });

                if (matchKey) {
                    newResponses[q.id] = engineeringAnswers[matchKey];
                } else {
                    // IF NOT IN THE LIST, DO NOT FILL FOR ENGINEERING
                    newResponses[q.id] = q.type === "checkbox" ? [] : "";
                }
                return;
            }

            // 2. Fallback to generic filler for other tracks or unmapped questions
            const labelLower = q.label.toLowerCase();
            switch (q.type) {
                case "short_answer":
                    if (labelLower.includes("email")) newResponses[q.id] = "test.user@example.com";
                    else if (labelLower.includes("phone") || labelLower.includes("whatsapp") || labelLower.includes("contact")) newResponses[q.id] = "+971501234567";
                    else if (labelLower.includes("emirates id")) newResponses[q.id] = "784-1234-1234567-1";
                    else if (labelLower.includes("gpa")) newResponses[q.id] = "3.8";
                    else if (labelLower.includes("year")) newResponses[q.id] = "2025";
                    else if (labelLower.includes("url") || labelLower.includes("portfolio") || labelLower.includes("linkedin") || labelLower.includes("github")) newResponses[q.id] = "https://example.com/testprofile";
                    else if (labelLower.includes("name")) newResponses[q.id] = "Test Applicant";
                    else if (labelLower.includes("university")) newResponses[q.id] = "Khalifa University";
                    else newResponses[q.id] = "Test Answer";
                    break;
                case "paragraph":
                    newResponses[q.id] = "This is a detailed test response populated by the automated test tool. It ensures that the form can handle paragraph inputs and meets any length requirements for this specific question.";
                    break;
                case "radio":
                case "dropdown":
                    if (q.options && q.options.length > 0) {
                        const firstOption = q.options[0];
                        newResponses[q.id] = firstOption === "__OTHER__" ? (q.options[1] || "Other Test Value") : firstOption;
                    }
                    break;
                case "checkbox":
                    if (q.options && q.options.length > 0) {
                        newResponses[q.id] = [q.options[0]];
                    }
                    break;
                case "linear_scale":
                case "star_rating":
                    newResponses[q.id] = Math.ceil(((q.max || 5) + (q.min || 1)) / 2);
                    break;
                case "grid_radio":
                    if (q.rows && q.columns && q.columns.length > 0) {
                        const gridResp: Record<string, string> = {};
                        q.rows.forEach(row => { gridResp[row.id] = q.columns![0]; });
                        newResponses[q.id] = gridResp;
                    }
                    break;
                case "grid_checkbox":
                    if (q.rows && q.columns && q.columns.length > 0) {
                        const gridResp: Record<string, string[]> = {};
                        q.rows.forEach(row => { gridResp[row.id] = [q.columns![0]]; });
                        newResponses[q.id] = gridResp;
                    }
                    break;
                case "date":
                    newResponses[q.id] = new Date().toISOString().split('T')[0];
                    break;
                case "time":
                    newResponses[q.id] = "12:00";
                    break;
                case "datetime":
                    newResponses[q.id] = { date: new Date().toISOString().split('T')[0], time: "12:00" };
                    break;
                case "duration":
                    newResponses[q.id] = { hours: 1, minutes: 30, seconds: 0 };
                    break;
            }
        });

        setResponses(newResponses);
        setValidationErrors({}); // Clear errors as we filled valid data
    };

    const isValidEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const isValidNumber = (value: string | number) => {
        if (value === "") return false;
        const num = Number(value);
        return !isNaN(num);
    };

    const validateQuestion = (question: FormQuestion, value: unknown, currentFormType: string): string | null => {
        // For competitor form: ALL visible questions are generally required, BUT we respect explicit false.
        // For attendee form: respect the Google Form's required settings

        let isRequired = question.required;

        if (currentFormType === "competitor") {
            // Default to true for competitors, UNLESS explicitly set to false (e.g. Toolkit questions)
            if (question.required !== false) {
                isRequired = true;
            }
        }

        // 1. Required check
        if (isRequired) {
            if (value === undefined || value === "" || value === null) return "This field is required";
            if (Array.isArray(value) && value.length === 0) return "This field is required";
            if (typeof value === 'object' && Object.keys(value as object).length === 0) return "This field is required";
        }

        // Return early if empty and not required (optional fields)
        if (value === undefined || value === "" || value === null) return null;

        // Only apply partial text validation (Email/Number heuristics) to text inputs
        // This prevents false positives on Select, Radio, Checkbox where values might contain text like "Year 1"
        if (question.type !== "short_answer" && question.type !== "paragraph") return null;

        const valString = String(value).trim();
        const labelLower = question.label.toLowerCase();

        // 2. Emirates ID Validation (numbers and dashes only)
        if (labelLower.includes("emirates id")) {
            // Enforcement removed as per request
            return null;
        }

        // 3. Phone Number Validation (allows +, -, spaces, and numbers)
        if (
            labelLower.includes("phone") ||
            labelLower.includes("whatsapp") ||
            labelLower.includes("contact number")
        ) {
            // Phone format: allows +971-XX-XXX-XXXX or similar
            const phonePattern = /^[0-9+\-\s()]+$/;
            if (!phonePattern.test(valString)) {
                return "Phone number should only contain numbers, +, -, and spaces";
            }
        }

        // 4. Email Validation
        if (labelLower.includes("email")) {
            if (!isValidEmail(valString)) return "Please enter a valid email address";
        }

        // 5. Generic Number Validation (for other numeric fields)
        if (
            (question.type === "short_answer" && labelLower.includes("number") && !labelLower.includes("contact number") && !labelLower.includes("phone")) ||
            labelLower.includes("gpa") ||
            (labelLower.includes("year") && !labelLower.includes("major and year"))
        ) {
            if (!isValidNumber(valString)) return "Please enter a valid number";
        }

        // 6. Min/Max Logic (for number inputs)
        if (isValidNumber(valString) && (question.min !== undefined || question.max !== undefined)) {
            const num = Number(valString);
            if (question.min !== undefined && num < question.min) return `Minimum value is ${question.min}`;
            if (question.max !== undefined && num > question.max) return `Maximum value is ${question.max}`;
        }

        return null;
    };

    // 1. Initial Fetch
    useEffect(() => {
        async function fetchForm() {
            setLoading(true);
            try {
                const res = await fetch(`/api/forms?type=${formType}`);
                if (!res.ok) throw new Error("Failed to fetch form");
                const data = await res.json();

                // DATA TRANSFORMATION:
                // Make "Your Technical Toolkit" questions optional
                let inToolkitSection = false;
                data.questions = data.questions.map((q: FormQuestion) => {
                    if (q.type === 'section_header' && q.label?.includes("Your Technical Toolkit")) {
                        inToolkitSection = true;
                    } else if (inToolkitSection && q.type === 'section_header') {
                        // End of toolkit section (next header found)
                        inToolkitSection = false;
                    }

                    if (inToolkitSection && q.type !== 'section_header') {
                        // This is a toolkit question -> Make OPTIONAL
                        return { ...q, required: false };
                    }

                    return q;
                });

                setFormData(data);
                setError(null);
            } catch (err) {
                console.error("Error fetching form:", err);
                setError("Failed to load form. Please check your connection and refresh.");
            } finally {
                setLoading(false);
            }
        }
        fetchForm();
    }, [formType]);

    // 2. Prefetch the "other" form for instant switching
    useEffect(() => {
        const otherType = formType === "competitor" ? "attendee" : "competitor";
        // Simple silent fetch to warm up server cache and browser cache
        fetch(`/api/forms?type=${otherType}`).catch(() => { });
    }, [formType]);

    const updateResponse = (questionId: string, value: unknown) => {
        setResponses((prev) => ({ ...prev, [questionId]: value }));

        // Real-time validation
        if (formData) {
            const question = formData.questions.find(q => q.id === questionId);
            if (question) {
                const error = validateQuestion(question, value, formType);
                setValidationErrors(prev => ({ ...prev, [questionId]: error }));
            }
        }

        // Check if this is the major question and update selectedMajor
        if (formData) {
            const question = formData.questions.find(q => q.id === questionId);
            if (question && MAJOR_QUESTION_KEYWORDS.some(kw => question.label.toLowerCase().includes(kw))) {
                const newMajor = value as string;

                // If major is changing, clear responses for questions that will become hidden
                if (newMajor !== selectedMajor) {
                    setSelectedMajor(newMajor);

                    // Clear responses for all questions after the major question
                    // (these are the section-specific questions that may have stale data)
                    const majorQuestionIndex = formData.questions.findIndex(q =>
                        MAJOR_QUESTION_KEYWORDS.some(kw => q.label.toLowerCase().includes(kw))
                    );

                    if (majorQuestionIndex !== -1) {
                        setResponses(prev => {
                            const cleaned: FormResponses = {};
                            // Only keep responses for questions up to and including the major question
                            formData.questions.forEach((q, idx) => {
                                if (idx <= majorQuestionIndex && prev[q.id] !== undefined) {
                                    cleaned[q.id] = prev[q.id];
                                }
                            });
                            // Add the new major selection
                            cleaned[questionId] = value;
                            return cleaned;
                        });
                    }
                }
            }
        }
    };

    const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
        const current = (responses[questionId] as string[]) || [];
        if (checked) {
            updateResponse(questionId, [...current, option]);
        } else {
            updateResponse(questionId, current.filter((o) => o !== option));
        }
    };

    const handleGridChange = (
        questionId: string,
        row: string,
        column: string,
        isCheckbox: boolean
    ) => {
        const current = (responses[questionId] as Record<string, string | string[]>) || {};
        if (isCheckbox) {
            const rowValues = (current[row] as string[]) || [];
            if (rowValues.includes(column)) {
                updateResponse(questionId, {
                    ...current,
                    [row]: rowValues.filter((c) => c !== column),
                });
            } else {
                updateResponse(questionId, {
                    ...current,
                    [row]: [...rowValues, column],
                });
            }
        } else {
            updateResponse(questionId, { ...current, [row]: column });
        }
    };

    const handleSubmit = async () => {
        // Transform responses to use Entry IDs instead of React Keys
        const submissionPayload: Record<string, unknown> = {};

        // Debug: Log the skip logic state
        console.log("=== SUBMISSION DEBUG ===");
        console.log("Selected Major:", selectedMajor);
        console.log("Form Type:", formType);

        if (formData) {
            console.log("Total questions in form:", formData.questions.length);

            formData.questions.forEach((q, index) => {
                const visible = isQuestionVisible(index);
                const answer = responses[q.id];

                console.log(`Q${index + 1}: "${q.label.substring(0, 50)}..." | Visible: ${visible} | Has Answer: ${answer !== undefined && answer !== ""} | EntryID: ${q.entryId}`);

                // Only include responses for VISIBLE questions
                if (!visible) return;

                if (answer === undefined || answer === "") return;

                // Handle standard questions
                if (q.entryId) {
                    let finalAnswer = answer;

                    // Support for "Other" option in Radio/Checkbox/Dropdown
                    if ((q.type === 'radio' || q.type === 'checkbox' || q.type === 'dropdown') && q.options && q.options.length > 0) {
                        const optionsSet = new Set(q.options);

                        if (Array.isArray(answer)) {
                            // Checkbox: Separate standard options from "Other" values
                            const standardValues: string[] = [];
                            let otherValue: string | null = null;

                            answer.forEach((val: string) => {
                                if (optionsSet.has(val)) {
                                    standardValues.push(val);
                                } else {
                                    // Found a value not in options -> must be "Other"
                                    // Note: If multiple "Other" values exists (rare), last one wins
                                    otherValue = val;
                                }
                            });

                            // If we have an "Other" value, we need to send __other_option__ + the text
                            // BUT since submissionPayload[key] overwrites, we need to handle arrays carefully
                            // The backend handles arrays by appending multiple entries.

                            if (otherValue) {
                                // Add standard values
                                standardValues.push("__other_option__");

                                // Send the actual text response in a separate field
                                // Google Forms typically uses entry.ID.other_option_response
                                submissionPayload[`${q.entryId}.other_option_response`] = otherValue;
                            }

                            finalAnswer = standardValues.length > 0 ? standardValues : answer;
                            if (otherValue && standardValues.length === 0) {
                                // Only "Other" was selected
                                finalAnswer = ["__other_option__"];
                            }
                        } else {
                            // Radio/Dropdown: Check if single value is in options
                            const strVal = String(answer);
                            if (!optionsSet.has(strVal)) {
                                // Value is NOT in options -> Treat as "Other"
                                finalAnswer = "__other_option__";
                                submissionPayload[`${q.entryId}.other_option_response`] = strVal;
                            }
                        }
                    }

                    submissionPayload[q.entryId] = finalAnswer;
                    console.log(`  -> Submitting: entry.${q.entryId} = "${JSON.stringify(finalAnswer).substring(0, 30)}..."` +
                        (submissionPayload[`${q.entryId}.other_option_response`] ? ` [Other: "${submissionPayload[`${q.entryId}.other_option_response`]}"]` : ""));
                }

                // Handle Grid Questions
                if (q.rows && typeof answer === 'object' && answer !== null) {
                    const gridAnswer = answer as Record<string, any>;
                    q.rows.forEach((row) => {
                        const rowVal = gridAnswer[row.id];
                        if (rowVal !== undefined && row.entryId) {
                            submissionPayload[row.entryId] = rowVal;
                            console.log(`  -> Grid Row SUBMIT: entry.${row.entryId} = "${rowVal}"`);
                        } else {
                            console.warn(`  -> Grid Row WARNING: Missing EntryID for row "${row.label}" (id: ${row.id}), val: ${rowVal}`);
                        }
                    });
                }
            });

            // STEP1: Log the data before submission
            console.log("=== PRE-AUTH SUBMISSION DATA ===");
            console.log("Form Type:", formType);
            console.log("Form Data:", formData);
            console.log("Responses:", responses);
            console.log("Submission Payload:", submissionPayload);


            console.log("=== FINAL PAYLOAD KEYS ===");
            console.log(Object.keys(submissionPayload));
            console.log("=== FINAL PAYLOAD ===");
            console.log(JSON.stringify(submissionPayload, null, 2));
        }

        // If not signed in, trigger OAuth (store the TRANSFORMED payload)
        if (!session) {
            sessionStorage.setItem("pendingFormPayload", JSON.stringify(submissionPayload));
            sessionStorage.setItem("pendingFormType", formType);
            signIn("google");
            return;
        }

        setSubmitting(true);
        setError(null);

        // Debug
        console.log("Submitting Payload Maps:", submissionPayload);

        try {
            const res = await fetch("/api/forms/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ responses: submissionPayload, type: formType }),
            });

            if (!res.ok) {
                const data = await res.json();
                console.error("Submission failed details:", data);
                // If we have details, log them clearly. 
                // We keep the UI simple but ensure the console has the validation error.
                throw new Error(data.error || "Failed to submit");
            }

            setSuccess(true);
            onSubmitSuccess?.();
        } catch (err) {
            console.error("Submit error:", err);
            setError(err instanceof Error ? err.message : "Failed to submit form");
        } finally {
            setSubmitting(false);
        }
    };



    // Restore responses after OAuth redirect and AUTO-SUBMIT
    useEffect(() => {
        if (session && status === "authenticated") {
            const pendingPayload = sessionStorage.getItem("pendingFormPayload");
            const pendingType = sessionStorage.getItem("pendingFormType");

            if (pendingPayload) {
                const payload = JSON.parse(pendingPayload);

                // POST AUTH SUBMISSION DATA CHECK
                console.log("=== POST-AUTH SUBMISSION DATA ===");
                console.log("User email:", session.user?.email);
                console.log("Recovered Payload:", payload);

                // Clear storage immediately to prevent re-triggering
                sessionStorage.removeItem("pendingFormPayload");
                sessionStorage.removeItem("pendingFormType");

                // Set form type for display
                if (pendingType === "competitor" || pendingType === "attendee") {
                    setFormType(pendingType);
                }

                // Auto-submit immediately
                setAutoSubmitting(true);

                (async () => {
                    try {
                        setSubmitting(true);
                        setError(null);

                        // Retrieve firebase ID token
                        let firebaseIdToken = null;
                        try {
                            const { auth } = await import("@/lib/Firebase");
                            const { GoogleAuthProvider, signInWithCredential } = await import("firebase/auth")

                            const nextAuthIdToken = (session as any).idToken;

                            // If Firebase isn't signed in, use the NextAuth access token to sign in
                            if (!auth.currentUser && nextAuthIdToken) {
                                const credential = GoogleAuthProvider.credential(nextAuthIdToken);
                                await signInWithCredential(auth, credential);
                            }

                            // Get the token from Firebase
                            firebaseIdToken = await auth.currentUser?.getIdToken(true);
                        } catch (tokenError) {
                            console.error("Failed to get Firebase ID token", tokenError);
                        }

                        // Payload will be used in storing data to Firebase
                        // Payload is already transformed with Entry IDs
                        const res = await fetch("/api/forms/submit", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                responses: payload,
                                type: pendingType || "competitor",
                                idToken: firebaseIdToken
                            }),
                        });

                        if (!res.ok) {
                            const data = await res.json();
                            throw new Error(data.error || "Failed to submit");
                        }

                        setAutoSubmitSuccess(true);

                        // Wait for checkmark animation (2000ms), then fade out
                        setTimeout(() => {
                            setIsExiting(true);

                            // Wait for fade out (300ms) then switch UI
                            setTimeout(() => {
                                setSuccess(true);
                                onSubmitSuccess?.();
                                setAutoSubmitting(false);
                                setAutoSubmitSuccess(false);
                                setIsExiting(false);
                            }, 300);
                        }, 2000);
                    } catch (err) {
                        console.error("Auto-submit error:", err);
                        setError(err instanceof Error ? err.message : "Failed to submit form");
                        setAutoSubmitting(false);
                    } finally {
                        setSubmitting(false);
                    }
                })();
            }
        }
    }, [session, status]);

    // Helper to determine if a question should be visible based on skip logic
    const isQuestionVisible = (index: number): boolean => {
        if (!formData) return true;

        // Find the major question index
        const majorQuestionIndex = formData.questions.findIndex(q =>
            MAJOR_QUESTION_KEYWORDS.some(kw => q.label.toLowerCase().includes(kw))
        );

        // If no major question found, show all questions
        if (majorQuestionIndex === -1) return true;

        // If we haven't selected a major yet, only show questions up to and including the major question
        if (!selectedMajor) {
            return index <= majorQuestionIndex;
        }

        // Get the range for the selected major
        const range = SKIP_LOGIC[selectedMajor];

        // If no skip logic defined for this major, show all questions
        if (!range) return true;

        // Questions up to and including the major question are always visible
        if (index <= majorQuestionIndex) return true;

        // Convert to 1-indexed for comparison with skip logic config
        const questionNumber = index + 1;

        // Check if question falls within the range for this major
        const afterStart = questionNumber >= range.start;
        const beforeEnd = range.end === null || questionNumber < range.end;

        // Also show questions in the common ending section (shown to everyone)
        const isCommonEnding = questionNumber >= COMMON_ENDING_START;

        return (afterStart && beforeEnd) || isCommonEnding;
    };

    // Check overall form validity
    useEffect(() => {
        if (!formData) return;

        let valid = true;

        // Debug: Track why form is invalid
        let firstInvalidReason = "";

        formData.questions.forEach((q, index) => {
            const visible = isQuestionVisible(index);

            // CRITICAL: We only validate VISIBLE questions. 
            // This ensures that if a user selects "Medicine", the hidden "Engineering" questions 
            // (which are required but not visible) do NOT block submission.
            if (visible) {
                const val = responses[q.id];
                const error = validateQuestion(q, val, formType);
                if (error) {
                    valid = false;
                    if (!firstInvalidReason) firstInvalidReason = `Q${index + 1} (${q.label.substring(0, 15)}...): ${error}`;
                }
            }
        });

        // Debug log: uncomment this to see why the form is invalid
        console.log(`[Validation] FormType: ${formType}, Major: ${selectedMajor}, Valid: ${valid}, Reason: ${firstInvalidReason || "None"}`);

        setIsFormValid(valid);
    }, [responses, selectedMajor, formData, formType]);

    // Reset validation state when switching form types to prevent stale validation
    useEffect(() => {
        setIsFormValid(false);
        setValidationErrors({});
    }, [formType]);

    const renderQuestion = (question: FormQuestion) => {
        switch (question.type) {
            case "short_answer":
                return (
                    <input
                        type="text"
                        placeholder={question.placeholder || "Enter your answer..."}
                        value={(responses[question.id] as string) || ""}
                        onChange={(e) => updateResponse(question.id, e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:ring-2 focus:ring-[#007b8a] focus:border-transparent transition-all outline-none"
                    />
                );

            case "paragraph":
                const text = (responses[question.id] as string) || "";
                const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

                // Try to extract limit from description (e.g., "limited to 100 words")
                const limitMatch = question.description?.match(/limit(?:ed)? to (\d+) words/i);
                const limit = limitMatch ? parseInt(limitMatch[1]) : null;
                const isOverLimit = limit ? wordCount > limit : false;

                return (
                    <div className="space-y-2">
                        <textarea
                            placeholder={question.placeholder || "Enter your answer..."}
                            rows={4}
                            value={text}
                            onChange={(e) => updateResponse(question.id, e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl border ${isOverLimit
                                ? "border-red-500 ring-1 ring-red-500"
                                : "border-zinc-200 dark:border-zinc-700"
                                } bg-white dark:bg-zinc-800/50 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:ring-2 focus:ring-[#007b8a] focus:border-transparent transition-all outline-none resize-none`}
                        />
                        <div className="flex justify-between items-center px-1">
                            <span className={`text-xs font-medium ${isOverLimit ? "text-red-500" : "text-zinc-400"}`}>
                                {wordCount} {wordCount === 1 ? "word" : "words"}
                                {limit && ` / ${limit} limit`}
                            </span>
                            {isOverLimit && (
                                <span className="text-[10px] uppercase tracking-wider font-bold text-red-500 animate-pulse">
                                    Limit exceeded
                                </span>
                            )}
                        </div>
                    </div>
                );

            case "radio":
                return (
                    <div className="space-y-3">
                        {question.options?.map((option) => {
                            const isOtherOption = option === "__OTHER__";
                            const displayLabel = isOtherOption ? "Other" : option;

                            // For "Other", check if response is NOT one of the predefined options
                            const isOtherSelected = isOtherOption &&
                                responses[question.id] !== undefined &&
                                responses[question.id] !== "" &&
                                !question.options?.filter(o => o !== "__OTHER__").includes(responses[question.id] as string);

                            const isSelected = isOtherOption ? isOtherSelected : responses[question.id] === option;

                            return (
                                <label
                                    key={option}
                                    className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/30 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-all group"
                                >
                                    <div className="relative flex items-center justify-center w-5 h-5 rounded-full border-2 border-zinc-300 dark:border-zinc-600 group-hover:border-[#007b8a] transition-colors">
                                        <input
                                            type="radio"
                                            name={question.id}
                                            value={option}
                                            checked={isSelected}
                                            onChange={() => {
                                                if (isOtherOption) {
                                                    // When clicking Other, set to empty string (user will type)
                                                    updateResponse(question.id, "");
                                                } else {
                                                    updateResponse(question.id, option);
                                                }
                                            }}
                                            className="sr-only"
                                        />
                                        {isSelected && (
                                            <div className="w-2.5 h-2.5 rounded-full bg-[#007b8a]" />
                                        )}
                                    </div>
                                    <span className="text-zinc-700 dark:text-zinc-300">{displayLabel}</span>
                                    {isOtherOption && (
                                        <input
                                            type="text"
                                            placeholder="Please specify..."
                                            value={isOtherSelected ? (responses[question.id] as string) : ""}
                                            onChange={(e) => updateResponse(question.id, e.target.value)}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Also select "Other" when clicking the text field
                                                if (!isOtherSelected && responses[question.id] !== "") {
                                                    updateResponse(question.id, "");
                                                }
                                            }}
                                            className="flex-1 bg-transparent border-b border-zinc-300 dark:border-zinc-600 focus:border-[#007b8a] outline-none px-2 text-zinc-700 dark:text-zinc-300"
                                        />
                                    )}
                                </label>
                            );
                        })}
                    </div>
                );

            case "checkbox":
                return (
                    <div className="space-y-3">
                        {question.options?.map((option) => {
                            const isChecked = ((responses[question.id] as string[]) || []).includes(option);
                            return (
                                <label
                                    key={option}
                                    className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/30 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-all group"
                                >
                                    <div
                                        className={`relative flex items-center justify-center w-5 h-5 rounded-md border-2 transition-colors ${isChecked
                                            ? "bg-[#007b8a] border-[#007b8a] dark:bg-[#007b8a] dark:border-[#007b8a]"
                                            : "border-zinc-300 dark:border-zinc-600 group-hover:border-[#007b8a]"
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => handleCheckboxChange(question.id, option, e.target.checked)}
                                            className="sr-only"
                                        />
                                        {isChecked && (
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className="text-zinc-700 dark:text-zinc-300">{option}</span>
                                </label>
                            );
                        })}
                    </div>
                );

            case "dropdown":
                return (
                    <div className="relative">
                        <select
                            value={(responses[question.id] as string) || ""}
                            onChange={(e) => updateResponse(question.id, e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 text-zinc-900 dark:text-white focus:ring-2 focus:ring-[#007b8a] focus:border-transparent transition-all outline-none appearance-none cursor-pointer"
                        >
                            <option value="" disabled>Select an option...</option>
                            {question.options?.map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                );

            case "linear_scale":
                return (
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm text-zinc-500 dark:text-zinc-400">
                            <span>{question.minLabel}</span>
                            <span>{question.maxLabel}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                            {Array.from({ length: (question.max || 5) - (question.min || 1) + 1 }, (_, i) => i + (question.min || 1)).map(
                                (num) => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => updateResponse(question.id, num)}
                                        className={`flex-1 py-3 rounded-xl border-2 font-medium transition-all ${responses[question.id] === num
                                            ? "bg-[#007b8a] border-[#007b8a] text-white"
                                            : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-[#007b8a] hover:text-[#007b8a] dark:hover:text-[#007b8a]"
                                            }`}
                                    >
                                        {num}
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                );

            case "star_rating":
                return (
                    <div className="flex gap-2">
                        {Array.from({ length: question.max || 5 }, (_, i) => i + 1).map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => updateResponse(question.id, star)}
                                className="p-1 transition-transform hover:scale-110"
                            >
                                <svg
                                    className={`w-10 h-10 transition-colors ${(responses[question.id] as number) >= star
                                        ? "text-yellow-400 fill-yellow-400"
                                        : "text-zinc-300 dark:text-zinc-600"
                                        }`}
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                                    />
                                </svg>
                            </button>
                        ))}
                    </div>
                );

            case "grid_radio":
            case "grid_checkbox":
                const isCheckboxGrid = question.type === "grid_checkbox";
                return (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[500px]">
                            <thead>
                                <tr>
                                    <th className="p-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400"></th>
                                    {question.columns?.map((col) => (
                                        <th key={col} className="p-3 text-center text-sm font-medium text-zinc-600 dark:text-zinc-300">
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {question.rows?.map((rowItem, rowIndex) => {
                                    // Handle row as Object (new) or String (legacy fallback)
                                    const rowLabel = typeof rowItem === 'string' ? rowItem : rowItem.label;
                                    const rowId = typeof rowItem === 'string' ? rowItem : rowItem.id;

                                    return (
                                        <tr
                                            key={`${rowId}-${rowIndex}`} // Use composite key to prevent duplicates

                                            className={rowIndex % 2 === 0 ? "bg-zinc-50 dark:bg-zinc-800/30" : ""}
                                        >
                                            <td className="p-3 text-sm text-zinc-700 dark:text-zinc-300 font-medium">{rowLabel}</td>
                                            {question.columns?.map((col) => {
                                                const gridData = (responses[question.id] as Record<string, string | string[]>) || {};
                                                const isSelected = isCheckboxGrid
                                                    ? ((gridData[rowId] as string[]) || []).includes(col)
                                                    : gridData[rowId] === col;
                                                return (
                                                    <td key={col} className="p-3 text-center">
                                                        <button
                                                            type="button"
                                                            // Pass rowId instead of rowLabel to handler
                                                            onClick={() => handleGridChange(question.id, rowId, col, isCheckboxGrid)}
                                                            className={`w-6 h-6 rounded-${isCheckboxGrid ? "md" : "full"} border-2 transition-all inline-flex items-center justify-center ${isSelected
                                                                ? "bg-indigo-600 border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500"
                                                                : "border-zinc-300 dark:border-zinc-600 hover:border-indigo-400"
                                                                }`}
                                                        >
                                                            {isSelected && (
                                                                isCheckboxGrid ? (
                                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                ) : (
                                                                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                                                                )
                                                            )}
                                                        </button>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                );

            case "date":
                return (
                    <input
                        type="date"
                        value={(responses[question.id] as string) || ""}
                        onChange={(e) => updateResponse(question.id, e.target.value)}
                        className="w-full max-w-xs px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 text-zinc-900 dark:text-white focus:ring-2 focus:ring-[#007b8a] focus:border-transparent transition-all outline-none"
                    />
                );

            case "time":
                return (
                    <input
                        type="time"
                        value={(responses[question.id] as string) || ""}
                        onChange={(e) => updateResponse(question.id, e.target.value)}
                        className="w-full max-w-xs px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 text-zinc-900 dark:text-white focus:ring-2 focus:ring-[#007b8a] focus:border-transparent transition-all outline-none"
                    />
                );

            case "datetime":
                return (
                    <div className="flex flex-wrap gap-3">
                        <input
                            type="date"
                            value={((responses[question.id] as { date?: string })?.date) || ""}
                            onChange={(e) =>
                                updateResponse(question.id, {
                                    ...(responses[question.id] as object),
                                    date: e.target.value,
                                })
                            }
                            className="px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 text-zinc-900 dark:text-white focus:ring-2 focus:ring-[#007b8a] focus:border-transparent transition-all outline-none"
                        />
                        <input
                            type="time"
                            value={((responses[question.id] as { time?: string })?.time) || ""}
                            onChange={(e) =>
                                updateResponse(question.id, {
                                    ...(responses[question.id] as object),
                                    time: e.target.value,
                                })
                            }
                            className="px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 text-zinc-900 dark:text-white focus:ring-2 focus:ring-[#007b8a] focus:border-transparent transition-all outline-none"
                        />
                    </div>
                );

            case "duration":
                return (
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={((responses[question.id] as { hours?: number })?.hours) || ""}
                                onChange={(e) =>
                                    updateResponse(question.id, {
                                        ...(responses[question.id] as object),
                                        hours: parseInt(e.target.value) || 0,
                                    })
                                }
                                className="w-20 px-3 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 text-zinc-900 dark:text-white focus:ring-2 focus:ring-[#007b8a] focus:border-transparent transition-all outline-none text-center"
                            />
                            <span className="text-zinc-500 dark:text-zinc-400 text-sm">hrs</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="0"
                                max="59"
                                placeholder="0"
                                value={((responses[question.id] as { minutes?: number })?.minutes) || ""}
                                onChange={(e) =>
                                    updateResponse(question.id, {
                                        ...(responses[question.id] as object),
                                        minutes: parseInt(e.target.value) || 0,
                                    })
                                }
                                className="w-20 px-3 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 text-zinc-900 dark:text-white focus:ring-2 focus:ring-[#007b8a] focus:border-transparent transition-all outline-none text-center"
                            />
                            <span className="text-zinc-500 dark:text-zinc-400 text-sm">mins</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="0"
                                max="59"
                                placeholder="0"
                                value={((responses[question.id] as { seconds?: number })?.seconds) || ""}
                                onChange={(e) =>
                                    updateResponse(question.id, {
                                        ...(responses[question.id] as object),
                                        seconds: parseInt(e.target.value) || 0,
                                    })
                                }
                                className="w-20 px-3 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 text-zinc-900 dark:text-white focus:ring-2 focus:ring-[#007b8a] focus:border-transparent transition-all outline-none text-center"
                            />
                            <span className="text-zinc-500 dark:text-zinc-400 text-sm">secs</span>
                        </div>
                    </div>
                );

            default:
                return <p className="text-zinc-500">Unsupported question type: {question.type}</p>;
        }
    };

    // Auto-submitting modal overlay
    if (autoSubmitting) {
        return (
            <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity duration-300 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
                <style jsx>{`
                    @keyframes checkmark-draw {
                        0% {
                            stroke-dashoffset: 24;
                        }
                        100% {
                            stroke-dashoffset: 0;
                        }
                    }
                    @keyframes scale-in {
                        0% {
                            transform: scale(0.5);
                            opacity: 0;
                        }
                        50% {
                            transform: scale(1.1);
                        }
                        100% {
                            transform: scale(1);
                            opacity: 1;
                        }
                    }
                    @keyframes fade-out-spinner {
                        0% {
                            opacity: 1;
                            transform: scale(1);
                        }
                        100% {
                            opacity: 0;
                            transform: scale(0.8);
                        }
                    }
                    @keyframes text-fade-in {
                        0% {
                            opacity: 0;
                            transform: translateY(10px);
                        }
                        100% {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    .checkmark-icon {
                        animation: scale-in 0.4s ease-out forwards;
                    }
                    .checkmark-path {
                        stroke-dasharray: 24;
                        stroke-dashoffset: 24;
                        animation: checkmark-draw 0.4s ease-out 0.2s forwards;
                    }
                    .success-text {
                        animation: text-fade-in 0.3s ease-out 0.3s forwards;
                        opacity: 0;
                    }
                    .spinner-exit {
                        animation: fade-out-spinner 0.2s ease-out forwards;
                    }
                `}</style>
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl">
                    {autoSubmitSuccess ? (
                        <>
                            <div className="checkmark-icon mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path className="checkmark-path" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="success-text text-xl font-bold text-zinc-900 dark:text-white">
                                Application Submitted!
                            </h3>
                            <p className="success-text mt-2 text-zinc-600 dark:text-zinc-400" style={{ animationDelay: '0.4s' }}>
                                Thank you for registering!
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="mx-auto w-16 h-16 bg-[#007b8a]/10 rounded-full flex items-center justify-center mb-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007b8a]"></div>
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                                Submitting Your Application
                            </h3>
                            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                                Welcome back! We're automatically submitting your form...
                            </p>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#007b8a]"></div>
            </div>
        );
    }

    if (!formData) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500">Failed to load form. Please refresh the page.</p>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-10 text-center">
                    <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-white">Application Submitted!</h3>
                    <p className="mt-2 text-green-100">Thank you for applying. We'll review your submission and get back to you soon.</p>
                </div>
                <div className="p-8 text-center">
                    <p className="text-zinc-600 dark:text-zinc-400">
                        A confirmation has been sent to your email.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
            {/* Error banner */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 p-3 text-center">
                    <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                </div>
            )}

            {/* Form Header */}
            <div className="bg-white dark:bg-zinc-900 px-8 py-10 border-b border-zinc-100 dark:border-zinc-800 relative">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    <div className="flex-1">
                        <h3 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">{formData.title}</h3>
                        <div className="mt-2 text-zinc-600 dark:text-zinc-400 text-lg leading-relaxed">
                            <ReactMarkdown
                                components={{
                                    p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                    a: ({ node, ...props }) => <a className="text-[#007b8a] hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                                    strong: ({ node, ...props }) => <strong className="font-bold text-zinc-800 dark:text-zinc-200" {...props} />,
                                }}
                            >
                                {formData.description}
                            </ReactMarkdown>
                        </div>

                        {session && (
                            <div className="mt-4 flex items-center gap-3">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                    {session.user?.email}
                                </span>
                                <button
                                    onClick={() => signOut()}
                                    className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors underline decoration-dotted"
                                >
                                    Sign out
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Quick Test Actions - Only in Dev */}
                    {process.env.NODE_ENV === 'development' && (
                        <div className="shrink-0 flex gap-2 self-start">
                            <div className="flex flex-col gap-2">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">Quick Fill</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => fillTestData("Engineering")}
                                        title="Fill with Engineering data"
                                        className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 transition-all flex items-center justify-center"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a2 2 0 00-1.96 1.414l-.503 1.508c-.206.62-.777 1.055-1.43 1.055H9c-.653 0-1.224-.435-1.43-1.055l-.503-1.508a2 2 0 00-1.96-1.414l-2.387.477a2 2 0 00-1.022.547l-.95 1.9a1 1 0 001.218 1.348l1.792-.448a2 2 0 001.022.547l2.387.477a2 2 0 001.96-1.414l.503-1.508c.206-.62.777-1.055 1.43-1.055H15c.653 0 1.224.435 1.43 1.055l.503 1.508a2 2 0 001.96 1.414l2.387-.477a2 2 0 001.022-.547l.95-1.9a1 1 0 00-1.218-1.348l-1.792.448z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 3L4.5 15.5h11L10 3z" />
                                        </svg>
                                        <span className="ml-1.5 text-xs font-bold uppercase">ENG</span>
                                    </button>
                                    <button
                                        onClick={() => fillTestData("Medicine")}
                                        title="Fill with Medicine data"
                                        className="p-2 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 transition-all flex items-center justify-center"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                        </svg>
                                        <span className="ml-1.5 text-xs font-bold uppercase">MED</span>
                                    </button>
                                    <button
                                        onClick={() => { setResponses({}); setSelectedMajor(null); setValidationErrors({}); }}
                                        title="Clear all responses"
                                        className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-all flex items-center justify-center"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick Test Actions - Only in Dev */}


                    {/* Type Toggle - Segmented Control */}
                    <div className="shrink-0">
                        <div className="inline-flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                            <button
                                onClick={() => setFormType("competitor")}
                                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${formType === "competitor"
                                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                                    }`}
                            >
                                Competitor
                            </button>
                            <button
                                onClick={() => setFormType("attendee")}
                                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${formType === "attendee"
                                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                                    }`}
                            >
                                Attendee
                            </button>
                        </div>
                    </div>
                </div>
            </div>



            {/* Questions */}
            <div className="p-6 sm:p-8">
                {(() => {
                    let visibleCount = 0;
                    return formData.questions.map((question, index) => {
                        const visible = isQuestionVisible(index);

                        // Skip hidden questions entirely to avoid spacing issues
                        if (!visible) return null;

                        // Handle section headers differently - Clean, bold typography
                        if (question.type === "section_header") {
                            return (
                                <div
                                    key={`${question.id}-${index}`}
                                    className="pt-8 pb-4 mt-4 first:mt-0"
                                >
                                    <div>
                                        <h3 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
                                            {question.label}
                                        </h3>
                                        {question.description && (
                                            <div className="mt-3 text-base text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
                                                <ReactMarkdown
                                                    components={{
                                                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                                        a: ({ node, ...props }) => <a className="text-[#007b8a] hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                                                        ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                                                        ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                                                        strong: ({ node, ...props }) => <strong className="font-bold text-zinc-800 dark:text-zinc-200" {...props} />,
                                                    }}
                                                >
                                                    {question.description}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        }

                        // Increment the visible question counter (only for actual questions)
                        visibleCount++;
                        const questionNumber = visibleCount;

                        // Check if we need to inject a frontend section header BEFORE this question
                        const frontendSection = FRONTEND_SECTIONS[question.label];
                        // Only show section if showFor matches current major (or showFor is not specified)
                        const shouldShowSection = frontendSection &&
                            (!frontendSection.showFor || frontendSection.showFor === selectedMajor);
                        const sectionHeader = shouldShowSection ? (
                            <div
                                key={`frontend-section-${index}`}
                                className="pt-8 pb-4 mt-4 first:mt-0"
                            >
                                <div>
                                    <h3 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
                                        {frontendSection.title}
                                    </h3>
                                    {frontendSection.description && (
                                        <div className="mt-3 text-base text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
                                            {frontendSection.description}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : null;

                        return (
                            <React.Fragment key={`${question.id}-${index}`}>
                                {sectionHeader}
                                <div className="py-6">
                                    <label className="block mb-5">
                                        <div className="flex items-baseline gap-3 mb-2">
                                            <span className="text-sm font-bold text-[#007b8a] dark:text-[#007b8a] uppercase tracking-wider shrink-0">
                                                Q{questionNumber}
                                            </span>
                                            <h4 className="text-xl font-medium text-zinc-900 dark:text-white leading-snug">
                                                {question.label}
                                                {question.required && <span className="text-red-500 ml-1" title="Required">*</span>}
                                            </h4>
                                        </div>
                                        {question.description && (
                                            <div className="ml-0 sm:ml-9 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                                <ReactMarkdown
                                                    components={{
                                                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                                        a: ({ node, ...props }) => <a className="text-[#007b8a] hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                                                        ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                                                        ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                                                        strong: ({ node, ...props }) => <strong className="font-bold text-zinc-700 dark:text-zinc-300" {...props} />,
                                                    }}
                                                >
                                                    {question.description}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                    </label>
                                    <div className="ml-0 sm:ml-9">
                                        {renderQuestion(question)}
                                        {validationErrors[question.id] && (
                                            <p className="mt-2 text-sm text-red-500 font-medium animate-pulse flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {validationErrors[question.id]}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    });
                })()}
            </div>

            {/* Submit Button */}
            <div className="p-6 sm:p-8 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800">
                <button
                    onClick={handleSubmit}
                    disabled={submitting || !isFormValid}
                    className={`group relative w-full py-4 px-8 font-bold text-lg rounded-full overflow-hidden transition-all flex items-center justify-center gap-3 uppercase tracking-wider
                        ${submitting || !isFormValid
                            ? "bg-zinc-300 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
                            : "bg-[#007b8a] text-white hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_25px_rgba(0,123,138,0.3)]"
                        }`}
                >
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <span className="relative z-10 flex items-center gap-3">
                        {submitting ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Submitting...
                            </>
                        ) : session ? (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                Submit Application
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Sign in with Google
                            </>
                        )}
                    </span>
                </button>
                {(!isFormValid && !submitting) && (
                    <p className="mt-3 text-center text-sm font-medium text-red-500 dark:text-red-400 animate-pulse">
                        Please complete all visible required fields to submit.
                    </p>
                )}
                <p className="mt-3 text-center text-xs text-zinc-500 dark:text-zinc-400">
                    {session
                        ? "Your application will be submitted to Google Forms"
                        : "You'll be asked to sign in with Google to submit your application"
                    }
                </p>
            </div>
        </div>
    );
}
