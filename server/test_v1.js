
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const apiKey = process.env.GEMINI_API_KEY;

async function testV1() {
    try {
        // Try v1 instead of v1beta
        const genAI = new GoogleGenerativeAI(apiKey);
        // We can't easily force v1 in the constructor without editing the SDK source usually, 
        // but we can try to use a different endpoint if we were using fetch.
        // HOWEVER, some models are ONLY in v1 or ONLY in v1beta.
        
        const models = ["gemini-1.5-flash", "gemini-pro"];
        for (const m of models) {
            console.log(`Testing model: ${m}`);
            const model = genAI.getGenerativeModel({ model: m });
            try {
                const result = await model.generateContent("Hello");
                console.log(`Model ${m} SUCCESS:`, result.response.text());
                return;
            } catch (e) {
                console.log(`Model ${m} FAILED: ${e.message}`);
                console.log(JSON.stringify(e, null, 2));
            }
        }
    } catch (err) {
        console.error('CRITICAL ERROR:', err);
    }
}

testV1();
