import { useMemo } from 'react';

export const useKnowledgeSuggestions = (text: string, aiKnowledge: any[]) => {
  return useMemo(() => {
    if (!text.trim() || !aiKnowledge) return [];
    
    // Simple keyword matching or relevance scoring
    const keywords = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    return aiKnowledge.filter(item => {
      const content = (item.content || '').toLowerCase();
      const title = (item.title || '').toLowerCase();
      return keywords.some(k => content.includes(k) || title.includes(k));
    }).slice(0, 5); // Limit to 5 suggestions
  }, [text, aiKnowledge]);
};
