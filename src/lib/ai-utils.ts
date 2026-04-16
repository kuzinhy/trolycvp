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
  
  // If still contains markdown markers (sometimes AI puts them in the middle or multiple blocks)
  // Try to find the first { and last }
  const firstBrace = cleanText.indexOf('{');
  const lastBrace = cleanText.lastIndexOf('}');
  const firstBracket = cleanText.indexOf('[');
  const lastBracket = cleanText.lastIndexOf(']');

  let jsonCandidate = cleanText;
  
  if (firstBrace !== -1 && lastBrace !== -1) {
    // Check if it's an object or array and pick the outermost one
    if (firstBracket !== -1 && firstBracket < firstBrace) {
      jsonCandidate = cleanText.substring(firstBracket, lastBracket + 1);
    } else {
      jsonCandidate = cleanText.substring(firstBrace, lastBrace + 1);
    }
  } else if (firstBracket !== -1 && lastBracket !== -1) {
    jsonCandidate = cleanText.substring(firstBracket, lastBracket + 1);
  }

  try {
    return JSON.parse(jsonCandidate);
  } catch (e) {
    console.error("Failed to parse AI JSON response:", e, "Original text:", text);
    throw new Error("Dữ liệu phản hồi từ AI không đúng định dạng JSON.");
  }
};
