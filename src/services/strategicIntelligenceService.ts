import { generateEmbedding, cosineSimilarity } from './embeddingService';
import { GoogleGenAI } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface IntelligenceReport {
  directive: string;
  reports: string[];
}

export async function analyzeAlignment(directive: string, reports: string[]): Promise<{ alignmentScore: number, gaps: string[] }> {
  const directiveEmbedding = await generateEmbedding(directive);
  
  let totalSimilarity = 0;
  for (const report of reports) {
    const reportEmbedding = await generateEmbedding(report);
    totalSimilarity += cosineSimilarity(directiveEmbedding, reportEmbedding);
  }
  
  const alignmentScore = totalSimilarity / reports.length;
  
  // Logic đơn giản để phát hiện "khoảng trống" (gaps)
  const gaps = alignmentScore < 0.7 ? ["Tiến độ thực hiện chưa bám sát chỉ đạo", "Cần bổ sung nguồn lực"] : [];
  
  return { alignmentScore, gaps };
}

export async function generateDirectiveDraft(analysis: { alignmentScore: number, gaps: string[] }, context: string): Promise<string> {
  const ai = getAI();
  const prompt = `Dựa trên kết quả phân tích: ${JSON.stringify(analysis)} và bối cảnh: ${context}, hãy soạn thảo một văn bản chỉ đạo ngắn gọn, quyết liệt để khắc phục các khoảng trống và thúc đẩy tiến độ.`;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });
  
  return response.text || "Không thể tạo dự thảo chỉ đạo.";
}
