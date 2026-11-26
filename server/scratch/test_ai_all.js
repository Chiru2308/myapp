import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];

async function testAll() {
    for (const modelName of MODELS) {
        try {
            console.log(`Testing with ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Say hello");
            console.log(`✅ ${modelName} Success:`, result.response.text());
            process.exit(0);
        } catch (err) {
            console.error(`❌ ${modelName} Failed:`, err.message.slice(0, 200));
        }
    }
    console.error("All models failed.");
    process.exit(1);
}

testAll();
