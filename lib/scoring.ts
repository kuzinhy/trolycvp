export interface ScanResult {
  title: string;
  content: string;
  url: string;
  source_name: string;
  source_type: 'official' | 'news_mainstream' | 'social_public' | 'forum_blog' | 'unknown';
  published_at: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  topic: string;
  verification_status: 'verified' | 'partially_verified' | 'unverified';
}

export function calculateRelevanceScore(item: ScanResult, ward: string): number {
  let score = 0;
  const wardLower = ward.toLowerCase();
  const titleLower = item.title.toLowerCase();
  const contentLower = item.content.toLowerCase();

  if (titleLower.includes(wardLower)) score += 35;
  if (contentLower.includes(wardLower)) score += 20;
  
  // Simplified checks for institutions/landmarks for demo
  if (contentLower.includes("ubnd") || contentLower.includes("công an")) score += 10;
  if (contentLower.includes("chợ") || contentLower.includes("trường") || contentLower.includes("bệnh viện")) score += 10;

  // Penalty for being too broad
  if (!titleLower.includes(wardLower) && (titleLower.includes("thành phố") || titleLower.includes("tỉnh"))) {
    score -= 20;
  }

  return Math.max(0, Math.min(100, score));
}

export function calculatePriorityScore(
  relevanceScore: number, 
  severity: string, 
  sourceType: string, 
  publishedAt: string,
  multiSource: boolean = false
): number {
  const severityMap: Record<string, number> = { low: 25, medium: 50, high: 75, critical: 100 };
  const sourceMap: Record<string, number> = { 
    official: 100, 
    news_mainstream: 80, 
    social_public: 45, 
    forum_blog: 35, 
    unknown: 20 
  };

  const sevScore = severityMap[severity] || 25;
  const srcScore = sourceMap[sourceType] || 20;

  // Recency
  const ageInDays = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24);
  let recencyScore = 20;
  if (ageInDays <= 1) recencyScore = 100;
  else if (ageInDays <= 3) recencyScore = 80;
  else if (ageInDays <= 7) recencyScore = 60;
  else if (ageInDays <= 30) recencyScore = 40;

  const multiSourceScore = multiSource ? 100 : 30;

  return (
    relevanceScore * 0.35 +
    sevScore * 0.25 +
    srcScore * 0.15 +
    recencyScore * 0.15 +
    multiSourceScore * 0.10
  );
}
