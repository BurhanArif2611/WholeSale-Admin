// lib/voice.ts
// Sends speech transcript to Gemini API and returns structured action JSON.
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

export type VoiceAction =
  | { type: 'create_order'; client_id?: string | null; client_name: string; items: { material_id?: string | null; product: string; quantity: number; unit?: string }[] }
  | { type: 'create_client'; name: string; phone?: string; area?: string; margin?: number }
  | { type: 'create_product'; name: string; unit: string; price: number; remark?: string }
  | { type: 'unknown'; transcript: string };

const SYSTEM_PROMPT = `Wholesale app parser. Output ONLY a FLAT JSON object. No nesting under keys like "create_order".
Mandatory Field: "type" (must be "create_order", "create_client", or "create_product").

Actions & Required Fields:
- type: "create_order"
  Fields: client_id (optional), client_name (ALWAYS provide), items: [{ material_id (optional), product (ALWAYS provide), quantity (number), unit }]
- type: "create_client"
  Fields: name (ALWAYS provide), phone, area, margin
- type: "create_product"
  Fields: name (ALWAYS provide), unit, price (number), remark

Context Rules:
- If a user mentions a name that matches an item in the provided Context, return its ID in "client_id" or "material_id".
- CRITICAL: Even if you find an ID, you MUST still provide the "client_name" or "product" name string.
- Hinglish: aur->and, kilo->kg, chawal->rice, tel->oil.
- If unit is missing for an item, use "pcs".`;

// Lazy initializer for Gemini to handle dynamic API key injection in Expo
let genAIInstance: any = null;
function getGenAI() {
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
  if (!genAIInstance && key) {
    genAIInstance = new GoogleGenerativeAI(key);
  }
  return genAIInstance;
}

const ORDER_SCHEMA = {
  description: "Extracted order information",
  type: SchemaType.OBJECT,
  properties: {
    type: { type: SchemaType.STRING, enum: ["create_order"] },
    client_id: { type: SchemaType.STRING, nullable: true },
    client_name: { type: SchemaType.STRING },
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          material_id: { type: SchemaType.STRING, nullable: true },
          product: { type: SchemaType.STRING },
          quantity: { type: SchemaType.NUMBER },
          unit: { type: SchemaType.STRING }
        },
        required: ["product", "quantity"]
      }
    }
  },
  required: ["type", "client_name", "items"]
};

export async function parseTextCommand(transcript: string, schema: any, context?: string): Promise<VoiceAction> {
  const ai = getGenAI();
  if (!ai) return { type: 'unknown', transcript: 'Missing AI configuration' };

  // Prioritize 2.0 Flash for lowest latency and highest intelligence per cost
  const modelsToTry = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-flash-latest", "gemini-pro-latest"];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      const model = ai.getGenerativeModel({
        model: modelName, 
        systemInstruction: SYSTEM_PROMPT + "\n\nIMPORTANT: Output ONLY valid JSON. " + (context ? `\n\nContext:\n${context}` : ''),
        generationConfig: {
          temperature: 0.1, 
          maxOutputTokens: 1000,
          responseMimeType: "application/json" // Use JSON mode where supported
        },
      });

      const result = await model.generateContent(`User: "${transcript}"`);
      const response = await result.response;
      let text = response.text();
      
      // Intensive cleaning to ensure JSON validity
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (jsonErr) {
        // Attempt secondary clean if primary fails by extracting first { } block
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw jsonErr;
        }
      }

      // Defensive unwrapping for common Gemini "helpful" nesting patterns
      const keys = Object.keys(parsed);
      if (keys.length === 1 && ["create_order", "create_client", "create_product"].includes(keys[0])) {
         const type = keys[0];
         parsed = { type, ...parsed[type] };
      }
      
      return parsed as VoiceAction;
    } catch (e: any) {
      lastError = e;
      console.warn(`[Gemini] Model ${modelName} failed:`, e.code || e.message || e);
    }
  }

  console.error('Gemini Text Parsing Error after trying all models:', lastError);
  return { type: 'unknown', transcript: `${transcript} (Error: ${lastError?.message || 'AI busy'})` };
}

// Helper wrappers
export async function parseOrderCommand(input: string, context?: string, preSelectedStoreId?: string) {
  let finalContext = context || '';
  if (preSelectedStoreId) {
    finalContext += `\n\nIMPORTANT: The Client is already selected (ID: ${preSelectedStoreId}). FOCUS ONLY on extracting products and quantities. Use this ID for client_id.`;
  }
  return parseTextCommand(input, ORDER_SCHEMA, finalContext);
}

export async function parseClientCommand(input: string) {
  return parseTextCommand(input, {
    type: SchemaType.OBJECT,
    properties: {
      type: { type: SchemaType.STRING, enum: ["create_client"] },
      name: { type: SchemaType.STRING },
      phone: { type: SchemaType.STRING },
      area: { type: SchemaType.STRING },
      margin: { type: SchemaType.NUMBER }
    },
    required: ["type", "name"]
  });
}

export async function parseProductCommand(input: string) {
  return parseTextCommand(input, {
    type: SchemaType.OBJECT,
    properties: {
      type: { type: SchemaType.STRING, enum: ["create_product"] },
      name: { type: SchemaType.STRING },
      unit: { type: SchemaType.STRING },
      price: { type: SchemaType.NUMBER },
      remark: { type: SchemaType.STRING }
    },
    required: ["type", "name", "unit", "price"]
  });
}
