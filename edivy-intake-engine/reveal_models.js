const API_KEY = "AQ.Ab8RN6IxpqbkP-HJfYyj_R63Oa3xtYU9wQ8OqxqP5RspDwiJ4A";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function interrogateGoogle() {
  console.log("Forcing Google to reveal available models for your key...");
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.models) {
      console.log("\n=== EXACT MODELS YOU ARE ALLOWED TO USE ===");
      data.models.forEach(model => {
        // Only print the relevant Gemini generation models
        if (model.name.includes('gemini') && model.supportedGenerationMethods.includes('generateContent')) {
          console.log(`-> "${model.name.replace('models/', '')}"`);
        }
      });
      console.log("===========================================\n");
    } else {
      console.error("Google refused to list models:", data);
    }
  } catch (e) {
    console.error("Network error:", e);
  }
}

interrogateGoogle();