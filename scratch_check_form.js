const https = require('https');

const formId = '1FAIpQLSfsK3t56mU0WOnxORkCObKr89dRMExdDd57ss4C6G43hiyNzQ'; // Attendee Form Published ID
const url = `https://docs.google.com/forms/d/e/${formId}/viewform`;

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        const scriptRegex = /var FB_PUBLIC_LOAD_DATA_ = (\[.*?\]);\s*<\/script>/;
        const match = data.match(scriptRegex);

        if (match && match[1]) {
            try {
                const fbData = JSON.parse(match[1]);
                const items = fbData[1][1];

                console.log("=== ATTENDEE FORM QUESTIONS ===");
                
                items.forEach((item) => {
                    const title = item[1];
                    const type = item[3];
                    const questionItem = item[4];

                    if (questionItem && questionItem[0]) {
                        const entryIds = questionItem.map(q => q[0]); // Can be multiple for grids
                        console.log(`Title: "${title}", EntryIDs: ${entryIds.join(", ")}`);
                    } else {
                        console.log(`Title: "${title}", (No Question Item / Maybe Section Header)`);
                    }
                });
            } catch (e) {
                console.error("Error parsing FB_PUBLIC_LOAD_DATA_", e);
            }
        } else {
            console.log("Could not find FB_PUBLIC_LOAD_DATA_ in the page.");
        }
    });

}).on("error", (err) => {
    console.log("Error: " + err.message);
});
