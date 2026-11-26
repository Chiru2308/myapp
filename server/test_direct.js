
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const apiKey = process.env.GEMINI_API_KEY?.trim();

async function check() {
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello" }] }]
            })
        });
        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Response Body:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

check();
