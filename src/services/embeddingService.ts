import { GoogleGenAI } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const embeddingCache = new Map<string, number[]>();

export async function generateEmbedding(text: string): Promise<number[]> {
  if (embeddingCache.has(text)) {
    return embeddingCache.get(text)!;
  }
  
  const ai = getAI();
  const result = await ai.models.embedContent({
    model: 'gemini-embedding-2-preview',
    contents: text,
  });
  
  if (!result.embeddings || result.embeddings.length === 0) {
    throw new Error("Failed to generate embedding");
  }
  
  const embedding = result.embeddings[0].values as number[];
  embeddingCache.set(text, embedding);
  return embedding;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
