
// Configure colors for console output
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m",
};

// SKIP LOGIC DEFINITION (From CustomApplicationForm.tsx)
const SKIP_LOGIC = {
    "Engineering": { start: 7, end: 19 },
    "Medicine": { start: 19, end: null },
};
const MAJOR_QUESTION_KEYWORDS = ["what major are you in", "what is your major and year of study"];

async function run() {
    try {
        console.log(`${colors.bright}${colors.cyan}Fetching form configuration...${colors.reset}`);

        // Fetch from API
        const res = await fetch('http://localhost:3000/api/forms?type=competitor');
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

        const data = await res.json();
        const questions = data.questions;

        console.log(`${colors.green}Successfully fetched ${questions.length} total questions from API.${colors.reset}\n`);

        console.log(`${colors.bright}=== MEDICINE TRACK QUESTIONS ===${colors.reset}`);
        console.log(`${colors.dim}(Simulating what the user sees and what autofill targets)${colors.reset}\n`);

        // Find the "major" question index to handle visibility logic correctly
        const majorQuestionIndex = questions.findIndex(q =>
            MAJOR_QUESTION_KEYWORDS.some(kw => q.label.toLowerCase().includes(kw))
        );

        let visibleCount = 0;

        questions.forEach((q, index) => {
            // Determine visibility
            let isVisible = false;
            const questionNumber = index + 1; // 1-based index from source array

            // Logic from CustomApplicationForm.tsx:
            // 1. Questions up to major question are always visible
            if (index <= majorQuestionIndex) {
                isVisible = true;
            }
            // 2. Check Medicine range
            else {
                const range = SKIP_LOGIC["Medicine"];
                if (range) {
                    const afterStart = questionNumber >= range.start; // 1-based
                    const beforeEnd = range.end === null || questionNumber < range.end;
                    if (afterStart && beforeEnd) {
                        isVisible = true;
                    }
                }
            }

            if (!isVisible) return;

            visibleCount++;

            // Format output based on type
            const typeLabel = q.type.toUpperCase().padEnd(12);
            let reqLabel = q.required ? `${colors.red}*REQ*${colors.reset}` : `${colors.dim} OPT ${colors.reset}`;

            console.log(`${colors.yellow}Q${visibleCount}${colors.reset} [Index:${index}] ${typeLabel} ${reqLabel} ${colors.bright}${q.label}${colors.reset}`);

            if (q.description) {
                console.log(`    ${colors.dim}Desc: ${q.description.substring(0, 100).replace(/\n/g, ' ')}${q.description.length > 100 ? '...' : ''}${colors.reset}`);
            }

            if (q.type === 'section_header') {
                console.log(`    ${colors.blue}--- SECTION HEADER ---${colors.reset}`);
            } else {
                console.log(`    ID: ${colors.cyan}${q.id}${colors.reset} | EntryID: ${colors.green}${q.entryId || 'N/A'}${colors.reset}`);
                if (q.options) {
                    console.log(`    Options: [${q.options.map(o => `"${o}"`).join(', ')}]`);
                }
                if (q.rows) {
                    console.log(`    Rows: ${q.rows.length} rows (First: ${q.rows[0].label})`);
                }
            }
            console.log('');
        });

        console.log(`${colors.bright}Total Visible Questions for Medicine: ${visibleCount}${colors.reset}`);

    } catch (error) {
        console.error(`${colors.red}Error:${colors.reset}`, error.message);
        console.log(`${colors.yellow}Make sure your Next.js server is running on http://localhost:3000${colors.reset}`);
    }
}

run();
