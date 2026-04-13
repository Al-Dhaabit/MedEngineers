const https = require('https');

function mapForm() {
    const publishedId = '1FAIpQLSe9BiGep7IEYlxLtdeXKMw6zM0kNjSRpRHdRXSKk8LR1_Jjhw';
    const url = `https://docs.google.com/forms/d/e/${publishedId}/viewform`;
    
    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            const regex = /var FB_PUBLIC_LOAD_DATA_ = ([\s\S]*?);<\/script>/;
            const match = data.match(regex);
            
            if (match && match[1]) {
                const formState = JSON.parse(match[1]);
                const questionsArray = formState[1][1];
                
                if (Array.isArray(questionsArray)) {
                    questionsArray.forEach((item, idx) => {
                        const title = item[1];
                        console.log(`${idx + 1}: ${title}`);
                    });
                }
            }
        });
    });
}

mapForm();
