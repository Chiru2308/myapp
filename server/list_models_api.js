
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const apiKey = process.env.GEMINI_API_KEY?.trim();

async function list() {
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Models:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
}
list();
