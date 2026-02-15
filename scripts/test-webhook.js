import crypto from 'crypto';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to load secret from .env.local
function getSecret() {
    if (process.env.TICKET_TAILOR_WEBHOOK_SECRET) {
        return process.env.TICKET_TAILOR_WEBHOOK_SECRET;
    }
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const envPath = path.resolve(__dirname, '../.env.local');

        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            const match = content.match(/TICKET_TAILOR_WEBHOOK_SECRET=(.*)/);
            if (match && match[1]) {
                const val = match[1].trim();
                // Remove quotes if present
                return val.replace(/^["'](.*)["']$/, '$1');
            }
        }
    } catch (e) {
        console.warn("Could not read .env.local:", e.message);
    }
    return 'local_test_secret'; // Fallback
}

// CONFIGURATION
const SECRET = getSecret();
const URL = 'http://localhost:3000/api/webhooks/tickettailor';
const EMAIL_TO_TEST = process.argv[2] || 'mohammad01ahmad@gmail.com'; // Pass email as arg or use default

const payload = {
    event: 'order.created',
    payload: {
        id: 'or_test_signed_' + Date.now(),
        email: EMAIL_TO_TEST,
        status: 'completed'
    }
};

const body = JSON.stringify(payload);
const timestamp = Math.floor(Date.now() / 1000);

// Create Signature
// Ticket Tailor signature = HMAC-SHA256(timestamp + body)
const signature = crypto
    .createHmac('sha256', SECRET)
    .update(timestamp + body)
    .digest('hex');

const headerValue = `t=${timestamp},s=${signature}`;

console.log(`Sending webhook to ${URL}...`);
console.log(`Email: ${EMAIL_TO_TEST}`);
console.log(`Secret used: ${SECRET}`);
console.log(`Signature Header: ${headerValue}`);

const req = http.request(URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Tickettailor-Webhook-Signature': headerValue
    }
}, (res) => {
    console.log(`\nResponse Status: ${res.statusCode}`);
    res.on('data', d => process.stdout.write(d));
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.write(body);
req.end();
