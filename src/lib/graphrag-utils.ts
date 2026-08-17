export function buildGraphRagContext(
  queryText: string,
  knowledgeArray: any[],
  maxChars = 12000
): string {
  if (!knowledgeArray || knowledgeArray.length === 0) {
    return "Chưa có dữ liệu tri thức.";
  }

  // Define keywords from the query
  const keywords = queryText.toLowerCase().split(/\s+/).filter(k => k.length > 3);
  
  // Calculate node relevance scores
  const scoredNodes = knowledgeArray.map(node => {
    let score = 0;
    const contentStr = (node.content || '').toLowerCase();
    const titleStr = (node.title || '').toLowerCase();
    const tagsStr = (node.tags || []).join(' ').toLowerCase();
    
    keywords.forEach(k => {
      if (titleStr.includes(k)) score += 3;
      else if (tagsStr.includes(k)) score += 2;
      else if (contentStr.includes(k)) score += 1;
    });
    
    // Boost score for important/pinned items
    if (node.isImportant) score += 0.5;
    
    return { node, score };
  });

  // 1. Initial Retrieval (Top Nodes)
  scoredNodes.sort((a, b) => b.score - a.score);
  const topNodes = scoredNodes.filter(n => n.score > 0).slice(0, 5).map(n => n.node);
  
  let finalKnowledge: any[] = [];

  // Fallback if no relevant keywords match
  if (topNodes.length === 0) {
     finalKnowledge = [...knowledgeArray]
       .sort((a, b) => (b.isImportant ? 1 : 0) - (a.isImportant ? 1 : 0))
       .slice(0, 10);
  } else {
     // 2. Graph Traversal (Living Knowledge Graph semantic links)
     const graphRagNodes = new Set<any>(topNodes);
     
     for (const node of topNodes) {
       // Find neighbors based on shared category or intersecting tags
       const relatedNodes = knowledgeArray.filter(k => 
         k.id !== node.id && 
         (k.category === node.category || (k.tags && node.tags && k.tags.some((t: string) => node.tags.includes(t))))
       );
       // Add top 2 related neighbors per node
       relatedNodes.slice(0, 2).forEach(r => graphRagNodes.add(r));
     }
     finalKnowledge = Array.from(graphRagNodes);
  }

  let currentLength = 0;
  const optimizedKnowledge = [];
  for (const k of finalKnowledge) {
    if (currentLength + (k.content?.length || 0) > maxChars) break;
    optimizedKnowledge.push(k);
    currentLength += (k.content?.length || 0);
  }

  // 3. Format as Graph Structure for prompt
  if (optimizedKnowledge.length > 0) {
    const nodesText = optimizedKnowledge.map(k => {
       const related = optimizedKnowledge
          .filter(o => o.id !== k.id && (o.category === k.category || (o.tags && k.tags && o.tags.some((t: string) => k.tags.includes(t)))))
          .map(o => o.id);
          
       return `[Node ${k.id} | Phân loại: ${k.category || 'Chung'} | Tags: ${(k.tags || []).join(', ')}]\n- Nội dung: ${k.content}\n- Liên kết với: ${related.length > 0 ? related.join(', ') : 'Không có'}`;
    }).join('\n\n');
    return `CƠ SỞ TRI THỨC SỐNG (LIVING KNOWLEDGE GRAPH - GRAPHRAG):\n${nodesText}\n--- Hết thông tin từ Knowledge Graph ---`;
  }
  
  return "Chưa có dữ liệu tri thức đặc thù.";
}
