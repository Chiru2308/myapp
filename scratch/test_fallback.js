// Mocking the environment for testing logic
const crypto = { randomUUID: () => Math.random().toString() };

function mockSyllabus(content) {
  const chunks = [];
  const lines = content.split("\n").filter(Boolean);
  
  const noisePatterns = [
    /^\s*syllabus\s*$/i,
    /^\s*unit\s+([0-9]+|[ivx]+)\s*$/i,
    /^\s*module\s+([0-9]+|[ivx]+)\s*$/i,
    /^\s*chapter\s+([0-9]+|[ivx]+)\s*$/i,
    /^\s*contents?\s*$/i,
    /^\s*index\s*$/i,
    /^\s*introduction\s*$/i,
    /^[0-9.\s]+$/
  ];

  for (const line of lines) {
    const tLine = line.trim();
    if (!tLine) continue;
    if (tLine.length < 20 && noisePatterns.some(p => p.test(tLine))) continue;

    if (tLine.length < 100) {
      chunks.push(tLine);
      continue;
    }
    const parts = tLine.split(/(?:;|\.\s)/);
    for (const part of parts) {
      const tPart = part.trim();
      if (!tPart || tPart.length < 3) continue;
      chunks.push(tPart);
    }
  }

  const uniqueChunks = Array.from(new Set(chunks)).filter(c => c.length > 4);
  return uniqueChunks.slice(0, 30);
}

const testContent = `
Syllabus
UNIT I
Linux Utilities - File handling utilities, Security by file permissions
UNIT II
Networking commands, Filters, Text processing utilities
`;

console.log("Input:", testContent);
console.log("Resulting Chunks:", mockSyllabus(testContent));
