import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const getAI = () => {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return null;
    return new GoogleGenerativeAI(apiKey);
};

// Re-ordered: 8B is tiny and usually has more quota, followed by 1.5 Flash.
const MODEL_CANDIDATES = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-3.1-flash-lite-preview",
    "gemini-flash-latest"
];

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function callWithRetry(ai, body, method = 'generateContent', modelIndex = 0, totalAttempts = 0) {
    if (totalAttempts >= 8) {
        const err = new Error("Google AI services are currently unavailable or heavily throttled. Please try again in a few minutes.");
        err.status = 503;
        throw err;
    }

    // Wrap around model candidates
    const currentModelIdx = modelIndex % MODEL_CANDIDATES.length;
    const modelName = MODEL_CANDIDATES[currentModelIdx];
    const generationConfig = {
        maxOutputTokens: 16384,
        temperature: 0.1,
    };

    if (method === 'generateContent') {
        generationConfig.responseMimeType = "application/json";
    }

    const model = ai.getGenerativeModel({
        model: modelName,
        generationConfig
    });

    try {
        console.log(`🤖 [Attempt ${totalAttempts + 1}] Trying: ${modelName}`);
        let result;
        if (method === 'generateContent') {
            const prompt = body.parts ? { contents: [{ role: 'user', parts: body.parts }] } : { contents: [{ role: 'user', parts: [{ text: body.prompt }] }] };
            result = await model.generateContent(prompt);
        } else {
            result = await model.generateContent(body);
        }
        return result;
    } catch (err) {
        const msg = err.message || "";
        const isQuotaError = msg.includes("429") || err.status === 429;
        const isNotFoundError = msg.includes("404") || err.status === 404;
        const isServiceUnavailable = msg.includes("503") || err.status === 503;

        if (isNotFoundError) {
            console.warn(`⚠️ ${modelName} 404. Key may not have access or model name changed. Trying next...`);
            return callWithRetry(ai, body, method, currentModelIdx + 1, totalAttempts + 1);
        }

        if (isServiceUnavailable) {
            console.warn(`⏳ ${modelName} 503 (Unavailable). Rotating model...`);
            await sleep(1000); // Quick rotation
            return callWithRetry(ai, body, method, currentModelIdx + 1, totalAttempts + 1);
        }

        if (isQuotaError) {
            const match = msg.match(/retry in ([\d\.]+)s/);
            let waitSeconds = match ? parseFloat(match[1]) + 1 : 10;

            if (waitSeconds > 15 || totalAttempts > 0) {
                console.warn(`⏳ ${modelName} throttled. Rotating model...`);
                await sleep(2000);
                return callWithRetry(ai, body, method, currentModelIdx + 1, totalAttempts + 1);
            }

            console.warn(`⏳ ${modelName} limited. Waiting ${waitSeconds}s...`);
            await sleep(waitSeconds * 1000);
            return callWithRetry(ai, body, method, currentModelIdx, totalAttempts + 1);
        }

        console.error(`❌ AI Error on ${modelName}:`, msg);
        throw err;
    }
}

router.use(protect);

router.post('/generate', async (req, res) => {
    try {
        const ai = getAI();
        if (!ai) return res.status(500).json({ message: "AI Configuration missing" });
        const result = await callWithRetry(ai, req.body, 'generateContent');

        try {
            const text = result.response.text();
            res.json({ text });
        } catch (textErr) {
            console.error("❌ Response text error:", textErr);
            res.status(500).json({ message: "Failed to extract text from AI response", details: textErr.message });
        }
    } catch (err) {
        console.error("❌ AI Error:", err.message);
        res.status(err.status || 500).json({ message: err.message });
    }
});

router.post('/chat', async (req, res) => {
    try {
        const { contents, context } = req.body;
        const ai = getAI();
        const finalContents = [
            { role: 'user', parts: [{ text: context || "You are a helpful study assistant" }] },
            ...contents
        ];
        const result = await callWithRetry(ai, { contents: finalContents }, 'chat');
        res.json({ text: result.response.text() });
    } catch (err) {
        console.error("❌ Chat Error:", err.message);
        res.status(err.status || 500).json({ message: err.message });
    }
});

export default router;
