
import { GoogleGenAI, Type } from "@google/genai";
import { DreamAnalysisResponse, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Un titolo poetico ed evocativo per il sogno" },
    summary: { type: Type.STRING, description: "Sintesi psicologica del messaggio centrale dell'inconscio" },
    category: { 
      type: Type.STRING, 
      enum: ['Ombra', 'Intuizione', 'Emozione'],
      description: "La categoria predominante del sogno" 
    },
    emotionalClimate: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          percentage: { type: Type.INTEGER }
        },
        required: ["label", "percentage"]
      }
    },
    symbols: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          meaning: { type: Type.STRING },
          jungianContext: { type: Type.STRING }
        },
        required: ["name", "meaning", "jungianContext"]
      }
    },
    archetypes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          manifestationInDream: { type: Type.STRING }
        },
        required: ["name", "description", "manifestationInDream"]
      }
    },
    deepReflection: { type: Type.STRING },
    guidingQuestion: { type: Type.STRING },
    practicalSynthesis: { type: Type.STRING }
  },
  required: ["title", "summary", "category", "emotionalClimate", "symbols", "archetypes", "deepReflection", "guidingQuestion", "practicalSynthesis"]
};

const SYSTEM_INSTRUCTION = `
  Sei "Psyche Lens", un Mentore Junghiano Moderno. Il tuo tono è calmo, saggio ma estremamente accessibile e chiaro.
  
  REGOLE DI CONVERSAZIONE:
  - Spiega i termini complessi (Archetipo, Ombra, Anima) con esempi semplici presi dalla vita quotidiana.
  - Non essere eccessivamente accademico. Sii come un amico saggio che sa leggere l'anima.
  - Usa un italiano fluente e moderno.
  - Mantieni sempre il focus sul sogno dell'utente e sul suo processo di crescita (individuazione).
`;

export async function analyzeDream(narrative: string): Promise<DreamAnalysisResponse> {
  const model = 'gemini-3-pro-preview';
  
  const response = await ai.models.generateContent({
    model: model,
    contents: `Analizza questo sogno: "${narrative}"`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: ANALYSIS_SCHEMA,
    },
  });

  if (!response.text) throw new Error("Nessuna risposta ricevuta.");
  return JSON.parse(response.text) as DreamAnalysisResponse;
}

export async function sendChatMessage(
  narrative: string, 
  analysis: DreamAnalysisResponse, 
  history: ChatMessage[], 
  newMessage: string
): Promise<string> {
  const model = 'gemini-3-flash-preview';
  
  const chat = ai.chats.create({
    model: model,
    config: {
      systemInstruction: `${SYSTEM_INSTRUCTION} 
      Il contesto è questo sogno: "${narrative}". 
      La tua analisi precedente era: ${JSON.stringify(analysis)}. 
      Rispondi in modo conciso ma profondo, mantenendo il dialogo aperto.`,
    },
    history: history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }))
  });

  const result = await chat.sendMessage({ message: newMessage });
  return result.text || "La connessione con l'inconscio si è affievolita. Prova a ripetere il tuo pensiero.";
}
