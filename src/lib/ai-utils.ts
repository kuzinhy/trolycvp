import { GoogleGenAI } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const generateContentWithRetry = async (params: any, retries = 3, delay = 2000) => {
  const ai = getAI();
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const errorStr = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
      const isQuota = errorStr.toLowerCase().includes('quota') || errorStr.toLowerCase().includes('resource_exhausted');
      const isRateLimit = errorStr.includes('429') || error?.status === 429;
      
      if (isQuota) {
        throw new Error("Đã hết hạn mức sử dụng AI trong ngày. Vui lòng thử lại vào ngày mai.");
      }

      if (isRateLimit && i < retries - 1) {
        console.warn(`Rate limit hit, retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
};

export const generateContentStreamWithRetry = async (params: any, retries = 3, delay = 2000) => {
  const ai = getAI();
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContentStream(params);
    } catch (error: any) {
      const errorStr = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
      const isQuota = errorStr.toLowerCase().includes('quota') || errorStr.toLowerCase().includes('resource_exhausted');
      const isRateLimit = errorStr.includes('429') || error?.status === 429;
      
      if (isQuota) {
        throw new Error("Đã hết hạn mức sử dụng AI trong ngày. Vui lòng thử lại vào ngày mai.");
      }

      if (isRateLimit && i < retries - 1) {
        console.warn(`Rate limit hit on stream, retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
  throw new Error("Failed to generate content stream after multiple retries");
};

export const parseAIResponse = (text: string) => {
  if (!text) return null;
  
  // Clean markdown code blocks if present
  let cleanText = text.trim();
  if (cleanText.startsWith('```')) {
    const lines = cleanText.split('\n');
    if (lines[0].startsWith('```')) {
      lines.shift(); // Remove starting ```json or ```
    }
    if (lines[lines.length - 1].startsWith('```')) {
      lines.pop(); // Remove ending ```
    }
    cleanText = lines.join('\n').trim();
  }
  
  // Robustly extract JSON array or object using regex
  // This looks for the first [ or { and the last matching ] or }
  let jsonCandidate = cleanText;
  const match = cleanText.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (match) {
    jsonCandidate = match[0];
  }

  try {
    return JSON.parse(jsonCandidate);
  } catch (e) {
    // If exact parsing fails, try to repair truncated JSON arrays
    if (jsonCandidate.startsWith('[') && !jsonCandidate.endsWith(']')) {
      try {
        // Attempt to close the last object and array
        const repaired = jsonCandidate.replace(/,\s*[a-zA-Z0-9_"']+[\s:]*$/, '') + '}]';
        return JSON.parse(repaired);
      } catch (e2) {}
    }
    console.error("Failed to parse AI JSON response:", e, "Original text:", text);
    throw new Error("Dữ liệu phản hồi từ AI không đúng định dạng JSON.");
  }
};
