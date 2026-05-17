
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
require('dotenv').config();

async function listModels() {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('API Key not found in .env');
    return;
  }
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    if (data.models) {
      const names = data.models
        .filter(m => m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name);
      fs.writeFileSync('models-list.txt', names.join('\n'));
      console.log('Wrote models to models-list.txt');
    } else {
      console.log('No models found in response:', data);
    }
  } catch (e) {
    console.error('Error listing models:', e);
  }
}

listModels();
