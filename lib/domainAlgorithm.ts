/**
 * Domain Recommendation Algorithm for MedEngineers Hackathon
 * 
 * This algorithm analyzes an engineer's form responses and suggests 
 * the best-fit domain among:
 * 
 * Domain A: Medical Tools & Hardware (physical prototypes, sensors, wearables)
 * Domain B: Clinical Systems & Operations (systems thinking, optimization, logistics)
 * Domain C: Digital Health & AI (software, apps, ML/CV solutions)
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface DomainScore {
    domain: 'A' | 'B' | 'C';
    name: string;
    score: number;
    maxPossible: number;
    percentage: number;
    breakdown: ScoreBreakdown;
}

export interface ScoreBreakdown {
    skillsScore: number;
    skillsMax: number;
    personaScore: number;
    personaMax: number;
    projectScore: number;
    projectMax: number;
    scenarioScore: number;
    scenarioMax: number;
}

export interface DomainRecommendation {
    recommended: DomainScore;
    allScores: DomainScore[];
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
}

export interface EngineerResponses {
    // Skill Groups (checkbox arrays)
    skillsGroupA?: string[];  // Group 1: Physical Systems (Domain A)
    skillsGroupB?: string[];  // Group 2: Systems & Operations (Domain B)
    skillsGroupC?: string[];  // Group 3: Digital & Intelligence (Domain C)
    skillsGlobal?: string[];  // Group 4: Project Management (Global)

    // Work Style Persona (radio selection)
    workStylePersona?: string;

    // Free-text responses
    handsOnProject?: string;    // Most hands-on project description
    professionalExp?: string;   // Work/Internship experience
    scenarioResponse?: string;  // Hospital medication scenario answer
}

// ============================================================================
// CONFIGURATION - SKILL TO DOMAIN MAPPINGS
// ============================================================================

/**
 * Maps specific skills from each group to domain scores.
 * Some skills may contribute to multiple domains with different weights.
 */
const SKILL_DOMAIN_MAP: Record<string, { A: number; B: number; C: number }> = {
    // === Group 1: Physical Systems (Primarily Domain A) ===
    "CAD / 3D Modeling (SolidWorks, Fusion 360, etc.)": { A: 3, B: 0, C: 0 },
    "3D Printing / Rapid Prototyping": { A: 3, B: 0, C: 0 },
    "Electronics / Soldering": { A: 3, B: 0, C: 0 },
    "Arduino / Microcontrollers": { A: 3, B: 1, C: 1 },
    "Sensor Integration": { A: 3, B: 1, C: 1 },
    "Mechanical Assembly / Fabrication": { A: 3, B: 0, C: 0 },
    "Biomedical Device Design": { A: 3, B: 1, C: 0 },
    "Wearable Technology": { A: 3, B: 0, C: 2 },

    // === Group 2: Systems & Operations (Primarily Domain B) ===
    "Process Mapping / Flowcharting (BPMN, Lucidchart)": { A: 0, B: 3, C: 0 },
    "Data Analysis (Excel, Python for Data)": { A: 0, B: 2, C: 2 },
    "Scheduling / Resource Optimization": { A: 0, B: 3, C: 0 },
    "Simulation & Modeling (Arena, AnyLogic)": { A: 0, B: 3, C: 1 },
    "Lean / Six Sigma Principles": { A: 0, B: 3, C: 0 },
    "Supply Chain / Logistics": { A: 0, B: 3, C: 0 },
    "Quality Management Systems": { A: 1, B: 3, C: 0 },
    "RFID / Asset Tracking Systems": { A: 2, B: 3, C: 0 },

    // === Group 3: Digital & Intelligence (Primarily Domain C) ===
    "Programming (Python, C++, Java, JavaScript)": { A: 1, B: 1, C: 3 },
    "Machine Learning / AI Fundamentals": { A: 0, B: 1, C: 3 },
    "Computer Vision / Image Processing": { A: 0, B: 0, C: 3 },
    "Mobile App Development": { A: 0, B: 0, C: 3 },
    "Web Development (Frontend / Backend)": { A: 0, B: 1, C: 3 },
    "Database Design / SQL": { A: 0, B: 2, C: 2 },
    "Cloud Platforms (AWS, GCP, Azure)": { A: 0, B: 1, C: 2 },
    "API Integration": { A: 0, B: 1, C: 3 },
    "NLP / Natural Language Processing": { A: 0, B: 0, C: 3 },
    "Deep Learning Frameworks (TensorFlow, PyTorch)": { A: 0, B: 0, C: 3 },

    // === Group 4: Global Skills (Boost all domains slightly) ===
    "Technical Writing & Documentation": { A: 1, B: 1, C: 1 },
    "Project Management": { A: 1, B: 2, C: 1 },
    "Team Leadership": { A: 1, B: 1, C: 1 },
    "Presentation / Pitching": { A: 1, B: 1, C: 1 },
    "Prototyping Methodologies": { A: 2, B: 1, C: 1 },
    "User Research / UX": { A: 1, B: 1, C: 2 },
};

/**
 * Work Style Persona mappings
 * Higher values indicate stronger domain fit
 */
const PERSONA_DOMAIN_MAP: Record<string, { A: number; B: number; C: number }> = {
    // Builder archetype -> Domain A
    "The Builder": { A: 5, B: 1, C: 1 },
    "Builder": { A: 5, B: 1, C: 1 },
    "I am happiest when I am physically assembling something": { A: 5, B: 1, C: 1 },

    // Analyst/Optimizer archetype -> Domain B  
    "The Analyst": { A: 1, B: 5, C: 2 },
    "Analyst": { A: 1, B: 5, C: 2 },
    "The Optimizer": { A: 1, B: 5, C: 1 },
    "Optimizer": { A: 1, B: 5, C: 1 },
    "I find joy in mapping out processes and finding inefficiencies": { A: 1, B: 5, C: 1 },

    // Coder/Developer archetype -> Domain C
    "The Coder": { A: 1, B: 1, C: 5 },
    "Coder": { A: 1, B: 1, C: 5 },
    "The Developer": { A: 1, B: 1, C: 5 },
    "Developer": { A: 1, B: 1, C: 5 },
    "I love writing code and building digital solutions": { A: 1, B: 1, C: 5 },

    // Hybrid archetypes
    "The Integrator": { A: 2, B: 2, C: 2 },
    "Generalist": { A: 2, B: 2, C: 2 },
};

/**
 * Keywords for analyzing free-text responses
 * Weighted by relevance to each domain
 */
const TEXT_KEYWORDS: Record<string, { A: number; B: number; C: number }> = {
    // Domain A keywords (hardware, physical, sensors)
    "3d print": { A: 3, B: 0, C: 0 },
    "prototype": { A: 3, B: 1, C: 1 },
    "sensor": { A: 3, B: 1, C: 1 },
    "arduino": { A: 3, B: 0, C: 1 },
    "raspberry": { A: 3, B: 0, C: 1 },
    "circuit": { A: 3, B: 0, C: 0 },
    "solder": { A: 3, B: 0, C: 0 },
    "wearable": { A: 3, B: 0, C: 1 },
    "hardware": { A: 3, B: 0, C: 0 },
    "physical": { A: 2, B: 0, C: 0 },
    "device": { A: 2, B: 0, C: 1 },
    "haptic": { A: 3, B: 0, C: 0 },
    "motor": { A: 3, B: 0, C: 0 },
    "mechanical": { A: 3, B: 0, C: 0 },
    "cad": { A: 3, B: 0, C: 0 },
    "design": { A: 2, B: 1, C: 1 },
    "build": { A: 2, B: 0, C: 1 },
    "fabricat": { A: 3, B: 0, C: 0 },
    "assemble": { A: 3, B: 0, C: 0 },
    "drone": { A: 3, B: 0, C: 0 },
    "robot": { A: 3, B: 1, C: 1 },
    "peltier": { A: 3, B: 0, C: 0 },
    "temperature": { A: 2, B: 1, C: 0 },
    "infrared": { A: 3, B: 0, C: 0 },
    "clamp": { A: 3, B: 0, C: 0 },

    // Domain B keywords (operations, systems, optimization)
    "process": { A: 0, B: 3, C: 0 },
    "optimize": { A: 0, B: 3, C: 0 },
    "efficien": { A: 0, B: 3, C: 0 },
    "workflow": { A: 0, B: 3, C: 0 },
    "schedule": { A: 0, B: 3, C: 0 },
    "logistics": { A: 0, B: 3, C: 0 },
    "supply chain": { A: 0, B: 3, C: 0 },
    "inventory": { A: 0, B: 3, C: 0 },
    "tracking": { A: 1, B: 3, C: 0 },
    "rfid": { A: 2, B: 3, C: 0 },
    "queue": { A: 0, B: 3, C: 1 },
    "triage": { A: 0, B: 3, C: 1 },
    "allocat": { A: 0, B: 3, C: 0 },
    "resource": { A: 0, B: 3, C: 0 },
    "bottleneck": { A: 0, B: 3, C: 0 },
    "lean": { A: 0, B: 3, C: 0 },
    "six sigma": { A: 0, B: 3, C: 0 },
    "simulation": { A: 0, B: 3, C: 1 },
    "model": { A: 1, B: 2, C: 2 },
    "predict": { A: 0, B: 2, C: 2 },
    "forecast": { A: 0, B: 3, C: 1 },
    "staff": { A: 0, B: 3, C: 0 },
    "roster": { A: 0, B: 3, C: 0 },
    "asset": { A: 0, B: 3, C: 0 },
    "hospital": { A: 1, B: 2, C: 1 },
    "clinical": { A: 1, B: 2, C: 1 },
    "wait time": { A: 0, B: 3, C: 0 },
    "bed": { A: 0, B: 3, C: 0 },

    // Domain C keywords (software, AI, digital)
    "app": { A: 0, B: 0, C: 3 },
    "software": { A: 0, B: 1, C: 3 },
    "algorithm": { A: 0, B: 1, C: 3 },
    "machine learning": { A: 0, B: 1, C: 3 },
    "ai": { A: 0, B: 1, C: 3 },
    "artificial intelligence": { A: 0, B: 1, C: 3 },
    "deep learning": { A: 0, B: 0, C: 3 },
    "neural": { A: 0, B: 0, C: 3 },
    "computer vision": { A: 0, B: 0, C: 3 },
    "nlp": { A: 0, B: 0, C: 3 },
    "website": { A: 0, B: 0, C: 3 },
    "web": { A: 0, B: 0, C: 3 },
    "mobile": { A: 0, B: 0, C: 3 },
    "ios": { A: 0, B: 0, C: 3 },
    "android": { A: 0, B: 0, C: 3 },
    "python": { A: 0, B: 1, C: 3 },
    "javascript": { A: 0, B: 0, C: 3 },
    "react": { A: 0, B: 0, C: 3 },
    "tensorflow": { A: 0, B: 0, C: 3 },
    "pytorch": { A: 0, B: 0, C: 3 },
    "database": { A: 0, B: 1, C: 2 },
    "api": { A: 0, B: 1, C: 3 },
    "cloud": { A: 0, B: 1, C: 2 },
    "diagnos": { A: 0, B: 1, C: 3 },
    "detect": { A: 0, B: 0, C: 3 },
    "classif": { A: 0, B: 0, C: 3 },
    "image": { A: 0, B: 0, C: 3 },
    "audio": { A: 0, B: 0, C: 3 },
    "voice": { A: 0, B: 0, C: 3 },
    "speech": { A: 0, B: 0, C: 3 },
    "camera": { A: 1, B: 0, C: 3 },
    "webcam": { A: 0, B: 0, C: 3 },
    "screen": { A: 0, B: 0, C: 3 },
    "platform": { A: 0, B: 1, C: 2 },
    "dashboard": { A: 0, B: 2, C: 2 },
};

// ============================================================================
// DOMAIN NAMES & DESCRIPTIONS
// ============================================================================

const DOMAIN_INFO: Record<'A' | 'B' | 'C', { name: string; description: string }> = {
    A: {
        name: "Medical Tools & Hardware",
        description: "Physical devices, tactile instruments, and wearable hardware that interact with the human body or surgical environments."
    },
    B: {
        name: "Clinical Systems & Operations",
        description: "Systems thinking, bottleneck reduction, and optimizing hospital resources through logic and flow optimization."
    },
    C: {
        name: "Digital Health & AI",
        description: "Software-first solutions that leverage data, computer vision, and machine learning to diagnose or monitor."
    }
};

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Calculate skill-based scores from the checkbox responses
 */
function calculateSkillScores(responses: EngineerResponses): { A: number; B: number; C: number; max: number } {
    const scores = { A: 0, B: 0, C: 0 };
    let maxPossible = 0;

    const allSkills = [
        ...(responses.skillsGroupA || []),
        ...(responses.skillsGroupB || []),
        ...(responses.skillsGroupC || []),
        ...(responses.skillsGlobal || []),
    ];

    for (const skill of allSkills) {
        // Find matching skill (flexible matching)
        const matchedKey = Object.keys(SKILL_DOMAIN_MAP).find(key =>
            skill.toLowerCase().includes(key.toLowerCase()) ||
            key.toLowerCase().includes(skill.toLowerCase())
        );

        if (matchedKey) {
            const weights = SKILL_DOMAIN_MAP[matchedKey];
            scores.A += weights.A;
            scores.B += weights.B;
            scores.C += weights.C;
            maxPossible += Math.max(weights.A, weights.B, weights.C);
        }
    }

    return { ...scores, max: maxPossible || 1 };
}

/**
 * Calculate persona-based scores from work style question
 */
function calculatePersonaScores(responses: EngineerResponses): { A: number; B: number; C: number; max: number } {
    const scores = { A: 0, B: 0, C: 0 };
    const maxPossible = 5; // Max persona score

    if (responses.workStylePersona) {
        const persona = responses.workStylePersona.toLowerCase();

        for (const [key, weights] of Object.entries(PERSONA_DOMAIN_MAP)) {
            if (persona.includes(key.toLowerCase())) {
                scores.A += weights.A;
                scores.B += weights.B;
                scores.C += weights.C;
                break; // Only match one persona
            }
        }
    }

    return { ...scores, max: maxPossible };
}

/**
 * Analyze free-text responses for domain keywords
 */
function analyzeTextForKeywords(text: string): { A: number; B: number; C: number; count: number } {
    const scores = { A: 0, B: 0, C: 0 };
    let matchCount = 0;

    if (!text) return { ...scores, count: 0 };

    const lowerText = text.toLowerCase();

    for (const [keyword, weights] of Object.entries(TEXT_KEYWORDS)) {
        if (lowerText.includes(keyword.toLowerCase())) {
            scores.A += weights.A;
            scores.B += weights.B;
            scores.C += weights.C;
            matchCount++;
        }
    }

    return { ...scores, count: matchCount };
}

/**
 * Calculate project description scores
 */
function calculateProjectScores(responses: EngineerResponses): { A: number; B: number; C: number; max: number } {
    const projectAnalysis = analyzeTextForKeywords(responses.handsOnProject || "");
    const expAnalysis = analyzeTextForKeywords(responses.professionalExp || "");

    // Combine with weights (project description matters more)
    const scores = {
        A: projectAnalysis.A * 1.5 + expAnalysis.A,
        B: projectAnalysis.B * 1.5 + expAnalysis.B,
        C: projectAnalysis.C * 1.5 + expAnalysis.C,
    };

    // Normalize based on keyword matches
    const matchCount = projectAnalysis.count + expAnalysis.count;
    const maxPossible = matchCount > 0 ? matchCount * 3 * 1.5 : 1;

    return { ...scores, max: maxPossible };
}

/**
 * Calculate scenario response scores
 */
function calculateScenarioScores(responses: EngineerResponses): { A: number; B: number; C: number; max: number } {
    const analysis = analyzeTextForKeywords(responses.scenarioResponse || "");

    // Additional scenario-specific analysis
    const scenarioText = (responses.scenarioResponse || "").toLowerCase();

    // Look for solution approach indicators
    if (scenarioText.includes("dispenser") || scenarioText.includes("cart") || scenarioText.includes("device")) {
        analysis.A += 3;
    }
    if (scenarioText.includes("system") || scenarioText.includes("reorganize") || scenarioText.includes("layout")) {
        analysis.B += 3;
    }
    if (scenarioText.includes("app") || scenarioText.includes("notification") || scenarioText.includes("automat")) {
        analysis.C += 3;
    }

    const matchCount = analysis.count || 1;
    const maxPossible = matchCount * 3 + 3; // +3 for the solution approach bonus

    return { A: analysis.A, B: analysis.B, C: analysis.C, max: maxPossible };
}

// ============================================================================
// MAIN ALGORITHM
// ============================================================================

/**
 * Calculate domain recommendation from engineer responses
 */
export function calculateDomainRecommendation(responses: EngineerResponses): DomainRecommendation {
    // === Calculate all component scores ===
    const skillScores = calculateSkillScores(responses);
    const personaScores = calculatePersonaScores(responses);
    const projectScores = calculateProjectScores(responses);
    const scenarioScores = calculateScenarioScores(responses);

    // === Weight multipliers for each component ===
    const WEIGHTS = {
        skills: 2.0,    // Skills are the most important indicator
        persona: 1.5,   // Work style gives strong signal
        project: 1.0,   // Past projects provide evidence
        scenario: 1.0,  // Scenario shows problem-solving approach
    };

    // === Calculate weighted totals for each domain ===
    const domainTotals = {
        A: (skillScores.A * WEIGHTS.skills) +
            (personaScores.A * WEIGHTS.persona) +
            (projectScores.A * WEIGHTS.project) +
            (scenarioScores.A * WEIGHTS.scenario),

        B: (skillScores.B * WEIGHTS.skills) +
            (personaScores.B * WEIGHTS.persona) +
            (projectScores.B * WEIGHTS.project) +
            (scenarioScores.B * WEIGHTS.scenario),

        C: (skillScores.C * WEIGHTS.skills) +
            (personaScores.C * WEIGHTS.persona) +
            (projectScores.C * WEIGHTS.project) +
            (scenarioScores.C * WEIGHTS.scenario),
    };

    const maxPossible = {
        A: (skillScores.max * WEIGHTS.skills) +
            (personaScores.max * WEIGHTS.persona) +
            (projectScores.max * WEIGHTS.project) +
            (scenarioScores.max * WEIGHTS.scenario),
        B: (skillScores.max * WEIGHTS.skills) +
            (personaScores.max * WEIGHTS.persona) +
            (projectScores.max * WEIGHTS.project) +
            (scenarioScores.max * WEIGHTS.scenario),
        C: (skillScores.max * WEIGHTS.skills) +
            (personaScores.max * WEIGHTS.persona) +
            (projectScores.max * WEIGHTS.project) +
            (scenarioScores.max * WEIGHTS.scenario),
    };

    // === Build score objects for each domain ===
    const buildDomainScore = (domain: 'A' | 'B' | 'C'): DomainScore => ({
        domain,
        name: DOMAIN_INFO[domain].name,
        score: domainTotals[domain],
        maxPossible: maxPossible[domain],
        percentage: maxPossible[domain] > 0
            ? Math.round((domainTotals[domain] / maxPossible[domain]) * 100)
            : 0,
        breakdown: {
            skillsScore: domain === 'A' ? skillScores.A : domain === 'B' ? skillScores.B : skillScores.C,
            skillsMax: skillScores.max,
            personaScore: domain === 'A' ? personaScores.A : domain === 'B' ? personaScores.B : personaScores.C,
            personaMax: personaScores.max,
            projectScore: Math.round(domain === 'A' ? projectScores.A : domain === 'B' ? projectScores.B : projectScores.C),
            projectMax: Math.round(projectScores.max),
            scenarioScore: Math.round(domain === 'A' ? scenarioScores.A : domain === 'B' ? scenarioScores.B : scenarioScores.C),
            scenarioMax: Math.round(scenarioScores.max),
        },
    });

    const allScores = [
        buildDomainScore('A'),
        buildDomainScore('B'),
        buildDomainScore('C'),
    ].sort((a, b) => b.score - a.score);

    // === Determine recommendation ===
    const recommended = allScores[0];
    const secondPlace = allScores[1];

    // Calculate confidence based on score gap
    const scoreGap = recommended.score - secondPlace.score;
    const totalScore = recommended.score + secondPlace.score + allScores[2].score;
    const gapPercentage = totalScore > 0 ? (scoreGap / totalScore) * 100 : 0;

    let confidence: 'high' | 'medium' | 'low';
    if (gapPercentage > 20 || recommended.percentage > 60) {
        confidence = 'high';
    } else if (gapPercentage > 10 || recommended.percentage > 40) {
        confidence = 'medium';
    } else {
        confidence = 'low';
    }

    // Generate reasoning
    const reasoning = generateReasoning(recommended, allScores, responses, confidence);

    return {
        recommended,
        allScores,
        confidence,
        reasoning,
    };
}

/**
 * Generate human-readable reasoning for the recommendation
 */
function generateReasoning(
    recommended: DomainScore,
    allScores: DomainScore[],
    responses: EngineerResponses,
    confidence: 'high' | 'medium' | 'low'
): string {
    const parts: string[] = [];

    // Lead with the recommendation
    parts.push(`Based on the analysis, **Domain ${recommended.domain}: ${recommended.name}** is the best fit.`);

    // Explain primary factors
    const breakdown = recommended.breakdown;

    if (breakdown.skillsScore > 0) {
        if (recommended.domain === 'A') {
            parts.push("Their technical toolkit shows strong **hardware and prototyping skills** like CAD, electronics, or 3D printing.");
        } else if (recommended.domain === 'B') {
            parts.push("Their skills emphasize **systems thinking and optimization tools** like process mapping, simulation, or data analysis.");
        } else {
            parts.push("Their skillset is heavily **software-focused** with programming, ML/AI, or app development experience.");
        }
    }

    if (breakdown.personaScore >= 4) {
        parts.push(`Their work style persona aligns strongly with the ${recommended.domain === 'A' ? 'Builder' : recommended.domain === 'B' ? 'Analyst/Optimizer' : 'Coder/Developer'} archetype.`);
    }

    if (breakdown.projectScore > 3) {
        parts.push("Past project experience reinforces this direction.");
    }

    // Add confidence caveat if needed
    if (confidence === 'low') {
        const gap = allScores[0].score - allScores[1].score;
        if (gap < 5) {
            parts.push(`\n⚠️ Note: Scores are close. Domain ${allScores[1].domain} (${allScores[1].name}) scored ${allScores[1].percentage}% and could also be a good fit.`);
        }
    }

    return parts.join(" ");
}

// ============================================================================
// RESPONSE PARSER - Maps form question labels to EngineerResponses
// ============================================================================

/**
 * Extract EngineerResponses from raw form data using question labels
 * This maps the actual Google Form question labels to our algorithm's input structure
 */
export function parseFormResponses(formData: Record<string, any>, questionLabels: Record<string, string>): EngineerResponses {
    const result: EngineerResponses = {};

    // Find responses by label matching
    for (const [questionId, value] of Object.entries(formData)) {
        const label = questionLabels[questionId] || "";
        const lowerLabel = label.toLowerCase();

        // Group 1: Physical Systems (Domain A)
        if (lowerLabel.includes("group 1") || lowerLabel.includes("physical systems") || lowerLabel.includes("domain a")) {
            result.skillsGroupA = Array.isArray(value) ? value : [value];
        }
        // Group 2: Systems & Operations (Domain B)
        else if (lowerLabel.includes("group 2") || lowerLabel.includes("systems & operations") || lowerLabel.includes("domain b")) {
            result.skillsGroupB = Array.isArray(value) ? value : [value];
        }
        // Group 3: Digital & Intelligence (Domain C)
        else if (lowerLabel.includes("group 3") || lowerLabel.includes("digital") || lowerLabel.includes("domain c")) {
            result.skillsGroupC = Array.isArray(value) ? value : [value];
        }
        // Group 4: Global Skills
        else if (lowerLabel.includes("group 4") || lowerLabel.includes("project management") || lowerLabel.includes("global")) {
            result.skillsGlobal = Array.isArray(value) ? value : [value];
        }
        // Work Style Persona
        else if (lowerLabel.includes("contribution to a high-speed team") || lowerLabel.includes("work style") || lowerLabel.includes("describes your contribution")) {
            result.workStylePersona = String(value);
        }
        // Hands-on Project
        else if (lowerLabel.includes("hands-on") || lowerLabel.includes("most hands-on project")) {
            result.handsOnProject = String(value);
        }
        // Professional Experience
        else if (lowerLabel.includes("professional") || lowerLabel.includes("internship")) {
            result.professionalExp = String(value);
        }
        // Scenario Response
        else if (lowerLabel.includes("scenario") || lowerLabel.includes("medication delivery") || lowerLabel.includes("hospital's medication")) {
            result.scenarioResponse = String(value);
        }
    }

    return result;
}
