import mongoose from 'mongoose';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
    try {
        console.log("Testing with gemini-2.0-flash...");
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent("Say hello");
        console.log("Success:", result.response.text());
        process.exit(0);
    } catch (err) {
        console.error("Failed:", err.message);
        process.exit(1);
    }
}

test();
