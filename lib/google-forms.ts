export async function getPublicEntryIds(publishedId: string): Promise<Map<string, (string | Record<string, string>)[]>> {
    const mapping = new Map<string, (string | Record<string, string>)[]>();
    try {
        const url = `https://docs.google.com/forms/d/e/${publishedId}/viewform`;
        const res = await fetch(url);
        const html = await res.text();

        // Regex to capture the JSON blob, even if it spans multiple lines
        const regex = /var FB_PUBLIC_LOAD_DATA_ = ([\s\S]*?);<\/script>/;
        const match = html.match(regex);

        if (match && match[1]) {
            const data = JSON.parse(match[1]);
            const questionsArray = data[1][1];

            // console.log("=== SCRAPING DEBUG ===");
            // console.log("Total items found:", questionsArray?.length);

            if (Array.isArray(questionsArray)) {
                questionsArray.forEach((item: any, idx: number) => {
                    const title = item[1];
                    const answerData = item[4];

                    // console.log(`Item ${idx}: "${title}" - answerData type:`,
                    //    Array.isArray(answerData) ? `array[${answerData.length}]` : typeof answerData);

                    // Helper to append to map
                    const appendToMap = (key: string, value: string | Record<string, string>) => {
                        const existing = mapping.get(key) || [];
                        existing.push(value);
                        mapping.set(key, existing);
                    };

                    // Determine if this is a GRID question first
                    let isGrid = false;
                    const rowMap: Record<string, string> = {};

                    if (Array.isArray(answerData) && answerData.length > 1) {
                        answerData.forEach((row: any) => {
                            // CORRECT Structure: [EntryID, [[columns]], 0, ["Row Label"], ...]
                            if (Array.isArray(row) && row.length >= 4 && Array.isArray(row[3])) {
                                const rowEntryId = row[0];
                                const rowLabel = row[3][0];
                                if (rowLabel && rowEntryId) {
                                    rowMap[rowLabel] = String(rowEntryId);
                                    isGrid = true;
                                }
                            }
                        });
                    }

                    if (isGrid) {
                        appendToMap(title, rowMap);
                        console.log(`  -> Detected Grid: "${title}" with ${Object.keys(rowMap).length} rows`);
                    } else {
                        // Standard question ID extraction
                        // item[4][0][0] is usually the ID
                        if (answerData && answerData[0] && answerData[0][0]) {
                            const firstID = answerData[0][0];
                            if (typeof firstID === 'number' || (typeof firstID === 'string' && /^\d+$/.test(firstID))) {
                                console.log(`  -> Simple ID: ${title} = ${firstID}`);
                                appendToMap(title, String(firstID));
                            }
                        }
                    }
                });
            }
            // console.log("=== SCRAPING COMPLETE ===");
            // console.log("Mapping size:", mapping.size);
        } else {
            console.error("FB_PUBLIC_LOAD_DATA_ not found in HTML!");
        }
    } catch (e) {
        console.error("Error scraping public form:", e);
    }
    return mapping;
}
