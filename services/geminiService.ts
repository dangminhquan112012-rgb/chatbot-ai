
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.API_KEY || "";

export const getGeminiResponse = async (prompt: string, history: { role: string; parts: { text: string }[] }[]) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [...history, { role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "You are 'Cyber Chatbot AI', a futuristic, high-performance gaming assistant. Your tone is professional yet cool, tech-savvy, and helpful. Use emojis like ⚡, 🤖, 🎮, 🛡️. You are highly knowledgeable about tech, gaming, coding, and general tasks.",
        temperature: 0.9,
      }
    });
    
    return response.text;
  } catch (error) {
    console.error("Gemini Text Error:", error);
    throw error;
  }
};

export const generateImage = async (prompt: string) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `High quality gaming art, futuristic cyber style, neon colors, cinematic lighting: ${prompt}` }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        }
      }
    });

    let imageUrl = '';
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }
    
    return imageUrl;
  } catch (error) {
    console.error("Gemini Image Error:", error);
    throw error;
  }
};
