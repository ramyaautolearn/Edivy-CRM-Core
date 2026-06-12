require('dotenv').config();
const axios = require('axios');

// API KEYS
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;

async function runIntakeEngine() {
  console.log("Starting Intake Engine (via Axios)...");

  // 1. SCOUT
  const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=schools+in+Bachupally&key=${GOOGLE_PLACES_API_KEY}`;
  const placesRes = await axios.get(placesUrl);
  const schools = placesRes.data.results.slice(0, 1).map(p => ({ name: p.name, area: "Bachupally" }));

  for (const school of schools) {
    // 2. INTERROGATE
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    const geminiRes = await axios.post(geminiUrl, {
      contents: [{ parts: [{ text: `Analyze ${school.name}. Return JSON: {"ai_score": 80, "tier": "Tier 1", "growth_probability": "High", "ai_brief": "Active campaign detected", "student_count": "500", "board": "CBSE", "decision_maker": "Chairman"}` }] }]
    });
    
    let text = geminiRes.data.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim();
    const aiData = JSON.parse(text);

    // 3. DELIVER
    const fields = Object.entries({...school, ...aiData}).reduce((acc, [k, v]) => {
      acc[k] = typeof v === 'number' ? { integerValue: v.toString() } : { stringValue: v.toString() };
      return acc;
    }, {});

    const fireUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/artifacts/edivy-crm-core-vault/leads`;
    await axios.post(fireUrl, { fields });
    
    console.log(`[SUCCESS] Injected ${school.name} to the Prospecting Desk.`);
  }
}

runIntakeEngine().catch(console.error);