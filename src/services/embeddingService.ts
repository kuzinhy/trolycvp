const embeddingCache = new Map<string, number[]>();

export async function generateEmbedding(text: string): Promise<number[]> {
  if (embeddingCache.has(text)) {
    return embeddingCache.get(text)!;
  }
  
  const response = await fetch("/api/gemini/embed", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: text,
      model: 'gemini-embedding-2-preview'
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to generate embedding: ${errText}`);
  }

  const result = await response.json();
  
  let embedding: number[] | undefined;
  if (result.embedding && Array.isArray(result.embedding.values)) {
    embedding = result.embedding.values;
  } else if (result.embeddings && result.embeddings.length > 0 && Array.isArray(result.embeddings[0].values)) {
    embedding = result.embeddings[0].values;
  }
  
  if (!embedding) {
    throw new Error("Failed to generate embedding from server response: Invalid embedding structure.");
  }
  
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
