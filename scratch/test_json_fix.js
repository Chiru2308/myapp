
function cleanAIJSON(text) {
  let clean = text.trim();
  
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  
  if (start === -1 || end === -1) {
    throw new Error("AI response did not contain a valid JSON object");
  }
  
  clean = clean.substring(start, end + 1);
  clean = clean.replace(/,\s*([\]}])/g, '$1');
  
  return clean;
}

const testCases = [
  {
    name: "Valid JSON with Markdown",
    input: "Here is the JSON: ```json\n{\"test\": 1}\n```",
    expected: "{\"test\": 1}"
  },
  {
    name: "JSON with trailing comma in object",
    input: "{\"test\": 1, }",
    expected: "{\"test\": 1}"
  },
  {
    name: "JSON with trailing comma in array",
    input: "{\"days\": [1, 2, ], }",
    expected: "{\"days\": [1, 2]}"
  },
  {
    name: "JSON with extra text before/after",
    input: "Random text { \"a\": 1 } more text",
    expected: "{ \"a\": 1 }"
  }
];

testCases.forEach(tc => {
  try {
    const cleaned = cleanAIJSON(tc.input);
    JSON.parse(cleaned);
    console.log(`✅ Passed: ${tc.name}`);
  } catch (err) {
    console.log(`❌ Failed: ${tc.name} - ${err.message}`);
  }
});
