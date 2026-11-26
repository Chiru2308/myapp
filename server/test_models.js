
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env' });

const apiKey = process.env.GEMINI_API_KEY;

async function listModels() {
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // The SDK doesn't have a direct listModels, we usually use the REST API or discovery
        // But we can try a few common ones.
        const models = ["gemini-pro", "gemini-1.5-flash", "gemini-1.5-pro"];
        for (const m of models) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                const result = await model.generateContent("test");
                console.log(`Model ${m} works!`);
                break;
            } catch (e) {
                console.log(`Model ${m} failed: ${e.message}`);
            }
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

listModels();
