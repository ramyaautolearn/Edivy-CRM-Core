require('dotenv').config();
const API_KEY = process.env.GEMINI_API_KEY;

// We target the explicit, hardcoded Google URL. No SDK routing allowed.
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

async function directStrike() {
  console.log("Initiating direct raw fetch to Google servers...");
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Respond with exactly these words: 'Gemini is online.'" }] }]
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log("-----------------------------------");
      console.log("SUCCESS! Gemini says:", data.candidates[0].content.parts[0].text);
      console.log("-----------------------------------");
      console.log("The SDK was the problem. The key is perfect.");
    } else {
      console.error("-----------------------------------");
      console.error("FAILED. Google Servers rejected the request with this exact reason:");
      console.error(JSON.stringify(data, null, 2));
      console.error("-----------------------------------");
    }
  } catch (e) {
    console.error("Network connection blocked by environment:", e);
  }
}

directStrike();