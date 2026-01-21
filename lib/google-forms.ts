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

                    // Standard questions: item[4][0][0] is ID
                    if (answerData && answerData[0] && answerData[0][0]) {
                        const firstID = answerData[0][0];
                        // If firstID is numeric, it's likely a simple question
                        if (typeof firstID === 'number' || (typeof firstID === 'string' && /^\d+$/.test(firstID))) {
                            const currentList = mapping.get(title) || [];
                            currentList.push(String(firstID));
                            mapping.set(title, currentList);
                            console.log(`  -> Simple ID: ${firstID} (Count: ${currentList.length})`);
                            appendToMap(title, String(firstID));
                            // console.log(`  -> Simple ID: ${firstID}`);
                        }
                    }

                    // Grid detection: Check if answerData looks like rows
                    if (Array.isArray(answerData) && answerData.length > 1) {
                        const rowMap: Record<string, string> = {};
                        let isGrid = false;

                        answerData.forEach((row: any, rowIdx: number) => {
                            // Log first few rows to understand structure
                            /* if (rowIdx < 3) {
                                console.log(`  Row ${rowIdx} structure:`, JSON.stringify(row).substring(0, 200));
                            } */

                            // CORRECT Structure: [EntryID, [[columns]], 0, ["Row Label"], ...]
                            // row[0] = Entry ID (number)
                            // row[3] = Row Label (as array, e.g. ["Section Titles"])
                            if (Array.isArray(row) && row.length >= 4 && Array.isArray(row[3])) {
                                const rowEntryId = row[0];
                                const rowLabel = row[3][0];
                                if (rowLabel && rowEntryId) {
                                    rowMap[rowLabel] = String(rowEntryId);
                                    isGrid = true;
                                    // console.log(`  -> Grid row "${rowLabel}": ${rowEntryId}`);
                                }
                            }
                        });

                        if (isGrid) {
                            const currentList = mapping.get(title) || [];
                            currentList.push(rowMap);
                            mapping.set(title, currentList);
                            appendToMap(title, rowMap);
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
