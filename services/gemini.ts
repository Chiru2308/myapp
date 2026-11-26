console.log("✅ GEMINI PROXY SERVICE LOADED");

import { UserRole, Syllabus } from "../types";

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('smart_syllabus_token');
}

/**
 * Robustly cleans AI-generated string to find and parse the JSON object.
 * Handles markdown blocks, whitespace, and trailing commas.
 */
function cleanAIJSON(text: string) {
  let clean = text.trim();
  
  // Find the bounds of the JSON object
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  
  if (start === -1 || end === -1) {
    throw new Error("AI response did not contain a valid JSON object");
  }
  
  clean = clean.substring(start, end + 1);
  
  // Remove trailing commas in arrays and objects
  // This looks for a comma followed by closing ] or }
  clean = clean.replace(/,\s*([\]}])/g, '$1');
  
  return clean;
}

async function callProxyAI(path: string, body: any) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Proxy AI Request Failed: ${res.status}`);
  }

  return res.json();
}

/* ------------------------------------------------------------------ */
/*  SYLLABUS ANALYSIS                                                  */
/* ------------------------------------------------------------------ */

export async function analyzeSyllabus(
  content: string,
  role: UserRole,
  imageBase64?: string,
  examDate?: string,
  dailyStudyHours?: number
) {
  try {
    // Truncate extremely long input to save tokens
    const safeContent = content.slice(0, 10000);

    const prompt = `
You are an expert syllabus analyst.
USER ROLE: ${role}
${examDate ? `EXAM DATE: ${examDate}` : ""}
${dailyStudyHours ? `DAILY STUDY HOURS: ${dailyStudyHours}` : ""}

TASK: Create a clear syllabus title, description, and split into modules with importance levels.
SYLLABUS CONTENT:
${safeContent}

Return JSON only in this format:
{
  "title": "",
  "description": "",
  "modules": [
    {
      "title": "",
      "topics": [
        {"title": "", "description": "", "estimatedHours": 2, "importance": "High"}
      ]
    }
  ]
}

IMPORTANT: JSON ONLY. No markdown, no trailing commas.
`;

    const parts: any[] = [{ text: prompt }];
    if (imageBase64) {
      parts.push({
        inlineData: {
          data: imageBase64,
          mimeType: "image/jpeg"
        }
      });
    }

    const { text } = await callProxyAI('/ai/generate', { parts });
    const cleanText = cleanAIJSON(text);
    const parsed = JSON.parse(cleanText);

    return {
      ...parsed,
      id: crypto.randomUUID(),
      role,
      examDate,
      dailyStudyHours,
      createdAt: new Date().toISOString(),
      isFallback: false,
      modules: parsed.modules.map((m: any) => ({
        ...m,
        id: crypto.randomUUID(),
        topics: m.topics.map((t: any) => ({
          ...t,
          id: crypto.randomUUID(),
          status: "todo",
        })),
      }))
    };
  } catch (err: any) {
    console.error("❌ Proxy Analysis error:", err);
    return {
      ...mockSyllabus(content, role, examDate, dailyStudyHours),
      isFallback: true,
      error: "API_ERROR"
    };
  }
}

/* ------------------------------------------------------------------ */
/*  TIMETABLE GENERATION                                               */
/* ------------------------------------------------------------------ */

export async function generateTimetable(syllabus: Syllabus) {
  if (!syllabus.modules || syllabus.modules.length === 0) {
    throw new Error("Syllabus modules are missing. Please re-upload or re-analyze.");
  }
  try {
    // Only send module and topic titles, not full descriptions to save tokens
    const slimSyllabus = syllabus.modules.map(m => ({
        title: m.title,
        topics: m.topics.map(t => ({ 
            title: t.title, 
            description: t.description,
            estimatedHours: t.estimatedHours,
            importance: t.importance 
        }))
    }));

    const prompt = `
Output a study plan in JSON format based on the target exam date.

CONTEXT:
- TODAY: ${new Date().toLocaleDateString()}
- EXAM DATE: ${syllabus.examDate || 'Next month'}
- DAILY LIMIT: ${syllabus.dailyStudyHours || 3} hours.
- SYLLABUS: ${JSON.stringify(slimSyllabus)}

RULES:
1. JSON ONLY: Your entire response must be a single JSON object.
2. DEADLINE: Finish by the Exam Date. Distribute topics evenly.
3. CAP: Strictly max ${syllabus.dailyStudyHours || 3}h/day.
4. AGGRESSIVE COMPRESSION: If the syllabus is long, group related topics into single tasks. 
5. CONCISE: Keep 'goal' to 1 short sentence. Use short titles.
6. NO REDUNDANCY: Keep JSON depth minimal.

JSON SCHEMA:
{ 
  "days": [ 
    { "dayNumber": 1, "tasks": [ { "moduleTitle": "", "topicTitle": "", "duration": 2, "goal": "", "importance": "High" } ] } 
  ], 
  "summary": "" 
}

IMPORTANT: JSON ONLY. No markdown, no trailing commas.
`;

    const { text } = await callProxyAI('/ai/generate', { prompt });
    const cleanText = cleanAIJSON(text);

    try {
        const parsed = JSON.parse(cleanText);
        // Ensure every task has 'importance' matching our enum
        if (parsed.days) {
            parsed.days.forEach((d: any) => {
                d.tasks?.forEach((t: any) => {
                    if (!['High', 'Medium', 'Low'].includes(t.importance)) {
                        t.importance = 'Medium'; // Fix invalid enum values
                    }
                });
            });
        }
        return { ...parsed, isFallback: false };
    } catch (parseErr) {
        console.error("❌ Failed to parse AI JSON. Raw text:", cleanText);
        throw parseErr;
    }
  } catch (err: any) {
    console.error("❌ Proxy Timetable error:", err);
    return { ...localTimetable(syllabus), isFallback: true };
  }
}

/* ------------------------------------------------------------------ */
/*  CHAT                                                              */
/* ------------------------------------------------------------------ */

export async function chatWithAI(
  query: string,
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  syllabus?: Syllabus
) {
  try {
    // 1. Lightweight context (Don't send full syllabus)
    const context = syllabus
      ? `You are tutoring a student studying "${syllabus.title}". Progress: ${syllabus.modules.length} modules.`
      : "You are a helpful study assistant";

    // 2. Truncate history (Only last 4 messages to save tokens)
    const recentHistory = history.slice(-4).map(h => ({
        role: h.role,
        parts: h.parts
    }));
    
    recentHistory.push({ role: 'user', parts: [{ text: query }] });

    const { text } = await callProxyAI('/ai/chat', { contents: recentHistory, context });
    return text;
  } catch (err: any) {
    console.error("❌ Proxy Chat error:", err);
    throw err; // Let ChatBot handle display
  }
}

/* ------------------------------------------------------------------ */
/*  FALLBACKS                                                          */
/* ------------------------------------------------------------------ */

function mockSyllabus(content: string, role: UserRole, examDate?: string, dailyStudyHours?: number) {
  const chunks: string[] = [];
  const lines = content.split("\n").filter(Boolean);
  
  // Noise patterns to filter out common headers/structural text
  const noisePatterns = [
    /^\s*syllabus\s*$/i,
    /^\s*unit\s+([0-9]+|[ivx]+)\s*$/i, // Numbers or Roman numerals
    /^\s*module\s+([0-9]+|[ivx]+)\s*$/i,
    /^\s*chapter\s+([0-9]+|[ivx]+)\s*$/i,
    /^\s*contents?\s*$/i,
    /^\s*index\s*$/i,
    /^\s*introduction\s*$/i,
    /^[0-9.\s]+$/ // purely numbers and dots
  ];

  for (const line of lines) {
    const tLine = line.trim();
    if (!tLine) continue;
    
    // Skip if matches noise patterns and is very short
    if (tLine.length < 20 && noisePatterns.some(p => p.test(tLine))) {
      continue;
    }

    if (tLine.length < 100) {
      chunks.push(tLine);
      continue;
    }
    
    // Split long lines by semicolon or period
    const parts = tLine.split(/(?:;|\.\s)/);
    for (const part of parts) {
      const tPart = part.trim();
      if (!tPart || tPart.length < 3) continue;
      
      if (tPart.length < 100) {
        chunks.push(tPart);
      } else {
        // Split further by comma
        const subParts = tPart.split(',');
        let currentChunk = "";
        for (const sub of subParts) {
            const tSub = sub.trim();
            if (!tSub) continue;
            if (currentChunk.length + tSub.length > 60 && currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
                currentChunk = tSub;
            } else {
                currentChunk += (currentChunk ? ", " : "") + tSub;
            }
        }
        if (currentChunk) chunks.push(currentChunk.trim());
      }
    }
  }

  // Filter out duplicates and very short "junk" chunks
  const uniqueChunks = Array.from(new Set(chunks)).filter(c => c.length > 4);
  const finalChunks = uniqueChunks.slice(0, 30); // moderate cap
  
  return {
    id: crypto.randomUUID(),
    title: finalChunks[0] && finalChunks[0].length < 50 ? finalChunks[0] : "Generated Syllabus",
    description: "Auto-generated fallback syllabus",
    modules: [{
        id: crypto.randomUUID(),
        title: "Study Topics",
        topics: finalChunks.map((l, i) => ({
          id: crypto.randomUUID(), 
          title: l.length > 70 ? l.substring(0, 67) + '...' : l, 
          description: l, 
          estimatedHours: 1.5, // slightly more realistic weight
          importance: i % 3 === 0 ? "High" : (i % 2 === 0 ? "Medium" : "Low"), 
          status: "todo",
        })),
    }],
    role, examDate, dailyStudyHours, createdAt: new Date().toISOString(),
  };
}

function localTimetable(syllabus: Syllabus) {
  const dailyHours = Number(syllabus.dailyStudyHours) || 3;
  if (!syllabus.modules) return { days: [], summary: "Syllabus data is incomplete." };
  
  const days: any[] = [];
  let currentDay = 1;
  let currentDayHours = 0;
  let currentTasks: any[] = [];

  syllabus.modules.forEach((m) => {
    m.topics.forEach((t) => {
      let remainingHours = t.estimatedHours || 1;
      const totalParts = Math.ceil(remainingHours / dailyHours);
      
      // Smart splitting: Try to find sub-topics in the description
      const fragments = (t.description || "")
        .split(/[,.;\n]|\band\b/i)
        .map(f => f.trim())
        .filter(f => f.length > 5 && !f.toLowerCase().includes('covers') && !f.toLowerCase().includes('includes'));
      
      const fragmentsPerPart = Math.max(1, Math.ceil(fragments.length / totalParts));
      let partCount = 0;

      while (remainingHours > 0) {
        const availableToday = dailyHours - currentDayHours;
        
        if (availableToday <= 0) {
          days.push({ dayNumber: currentDay++, tasks: currentTasks });
          currentTasks = [];
          currentDayHours = 0;
          continue;
        }

        const durationToTake = Math.min(remainingHours, availableToday);
        
        // Pick fragments for this part
        const startIdx = partCount * fragmentsPerPart;
        const endIdx = startIdx + fragmentsPerPart;
        const partFragments = fragments.slice(startIdx, endIdx);
        
        let displayTitle = t.title;
        if (totalParts > 1) {
          if (partFragments.length > 0) {
            displayTitle = `${t.title}: ${partFragments.join(', ')}`;
          } else if (partCount > 0) {
            displayTitle = `${t.title} (Part ${partCount + 1})`;
          }
        }

        currentTasks.push({
          moduleTitle: m.title,
          topicTitle: displayTitle,
          duration: durationToTake,
          goal: t.description,
          importance: t.importance
        });

        currentDayHours += durationToTake;
        remainingHours -= durationToTake;
        partCount++;

        if (currentDayHours >= dailyHours) {
          days.push({ dayNumber: currentDay++, tasks: currentTasks });
          currentTasks = [];
          currentDayHours = 0;
        }
      }
    });
  });
  
  if (currentTasks.length > 0) {
    days.push({ dayNumber: currentDay++, tasks: currentTasks });
  }

  const finalizedDays = days.slice(0, 60);

  return { 
    days: finalizedDays, 
    summary: finalizedDays.length === days.length 
      ? "Local timetable generated. Topics have been intelligently split based on their content to fit your daily schedule." 
      : "Plan capped at 60 days. Consider increasing daily study hours or extending your target date."
  };
}
