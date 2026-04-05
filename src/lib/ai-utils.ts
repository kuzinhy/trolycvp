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
