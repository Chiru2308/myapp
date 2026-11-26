
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env' });

const apiKey = process.env.GEMINI_API_KEY;
console.log('API Key:', apiKey ? 'FOUND' : 'MISSING');

async function test() {
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Say hello");
        console.log('Response:', result.response.text());
    } catch (err) {
        console.error('Error:', err);
    }
}

test();
