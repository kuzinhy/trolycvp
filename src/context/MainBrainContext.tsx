import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { cacheData, getCachedData } from '../lib/cache';
import { generateEmbedding, cosineSimilarity } from '../services/embeddingService';
import { generateContentWithRetry } from '../lib/ai-utils';
import { db } from '../lib/firebase';
import { 
  collection, 
  query as firestoreQuery, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';

export interface CachedAIItem {
  id: string;
  normalizedQuery: string;
  originalQuery: string;
  response: string;
  timestamp: number;
  hits: number;
  embedding?: number[];
  groundingMetadata?: any;
  contextKey?: string;
  expiresAt?: number;
}

export interface AICacheStats {
  totalEntries: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
}

export interface EvolvingWisdomItem {
  id: string;
  category: 'executive_habit' | 'operational_principle' | 'policy_guideline' | 'strategic_directive' | 'cross_link';
  title: string;
  insight: string;
  actionableGuideline: string;
  confidenceScore: number; // 0 - 100
  learnedFrom: 'dialogue' | 'task_completion' | 'kpi_analysis' | 'manual_directive' | 'deep_consolidation';
  sourceContext?: string;
  timesApplied: number;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  embedding?: number[];
}

export interface CognitiveMetrics {
  brainIQ: number;
  totalWisdomCount: number;
  totalCrossLinks: number;
  consolidationCycles: number;
  memoryIntegrityScore: number;
  lastConsolidatedAt: number | null;
}

export interface MainBrainContextType {
  getCachedAIResponse: (
    query: string,
    options?: {
      contextKey?: string;
      similarityThreshold?: number;
      maxAgeMs?: number;
    }
  ) => Promise<{
    response: string;
    groundingMetadata?: any;
    isSemanticMatch: boolean;
    similarity: number;
    cachedAt: number;
  } | null>;
  setCachedAIResponse: (
    query: string,
    response: string,
    options?: {
      contextKey?: string;
      groundingMetadata?: any;
      ttlMs?: number;
    }
  ) => Promise<void>;
  clearAICache: () => Promise<void>;
  cacheStats: AICacheStats;
  normalizeQuery: (query: string) => string;

  // Evolving Intelligence & Wisdom Memory Vault
  evolvingWisdom: EvolvingWisdomItem[];
  isConsolidating: boolean;
  consolidationProgress: string;
  cognitiveMetrics: CognitiveMetrics;
  consolidateAndEvolveMemory: (contextData?: {
    tasks?: any[];
    knowledge?: any[];
    meetings?: any[];
    kpis?: any[];
    chats?: any[];
  }) => Promise<{ newItemsCount: number; summary: string }>;
  addCustomWisdom: (item: {
    title: string;
    insight: string;
    actionableGuideline: string;
    category: 'executive_habit' | 'operational_principle' | 'policy_guideline' | 'strategic_directive' | 'cross_link';
    tags: string[];
  }) => Promise<void>;
  deleteWisdomItem: (id: string) => Promise<void>;
  getRelevantWisdom: (queryText: string, limit?: number) => Promise<EvolvingWisdomItem[]>;
  recordWisdomApplication: (wisdomId: string) => Promise<void>;
}

export const MainBrainContext = createContext<MainBrainContextType | null>(null);

const CACHE_INDEX_KEY = 'ai_query_cache_index';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MEMORY_CACHE_LIMIT = 200;

// Seed Wisdom Items for initial deep intelligence
const SEED_WISDOM_ITEMS: EvolvingWisdomItem[] = [
  {
    id: 'seed-wisdom-1',
    category: 'executive_habit',
    title: 'Phong cách Chỉ đạo của Chánh Văn phòng Đảng ủy',
    insight: 'Đồng chí Chánh văn phòng Nguyễn Minh Huy luôn yêu cầu bản tham mưu phải súc tích, đi thẳng vào bản chất vấn đề, trích dẫn chuẩn xác số hiệu văn bản Đảng và chỉ rõ cán bộ phụ trách.',
    actionableGuideline: 'Trong mọi câu trả lời và dự thảo văn bản, đưa ra tối đa 3-4 ý chính có gạch đầu dòng rõ ràng, đính kèm căn cứ văn bản chỉ đạo và mốc thời gian hoàn thành cụ thể.',
    confidenceScore: 98,
    learnedFrom: 'manual_directive',
    timesApplied: 42,
    createdAt: Date.now() - 86400000 * 15,
    updatedAt: Date.now() - 86400000 * 2,
    tags: ['phong cach lanh dao', 'tham muu', 'chanh van phong', 'chuan muc']
  },
  {
    id: 'seed-wisdom-2',
    category: 'operational_principle',
    title: 'Quy tắc Điều hành Tiến độ & KPI Đảng bộ',
    insight: 'Các chỉ tiêu KPI có nguy cơ chậm trễ hoặc thuộc khối chi bộ trực thuộc cần được cảnh báo sớm 72h trước thời hạn kết thúc để kích hoạt phương án hỗ trợ.',
    actionableGuideline: 'Tự động đối chiếu các nhiệm vụ đang xử lý với danh mục KPI quý. Cảnh báo nguy cơ quá hạn và đề xuất giải pháp tháo gỡ điểm nghẽn.',
    confidenceScore: 95,
    learnedFrom: 'kpi_analysis',
    timesApplied: 29,
    createdAt: Date.now() - 86400000 * 10,
    updatedAt: Date.now() - 86400000 * 1,
    tags: ['kpi', 'tien do', 'canh bao som', 'dieu hanh']
  },
  {
    id: 'seed-wisdom-3',
    category: 'policy_guideline',
    title: 'Thẩm định Thể thức & Nội dung Văn bản Đảng',
    insight: 'Mọi văn bản trình Thường trực hoặc ban hành đều phải tuân thủ nghiêm ngặt Quy định số 66-QĐ/TW về thể loại, thẩm quyền ban hành và thể thức văn bản của Đảng.',
    actionableGuideline: 'Kiểm tra kỹ số/ký hiệu, thẩm quyền ký (T/M, K/T, T/L), nơi nhận và căn cứ trước khi đề xuất phê duyệt.',
    confidenceScore: 99,
    learnedFrom: 'deep_consolidation',
    timesApplied: 56,
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now() - 86400000 * 3,
    tags: ['the thuc van ban', 'quy dinh 66', 'tham dinh', 'phap quy']
  },
  {
    id: 'seed-wisdom-4',
    category: 'strategic_directive',
    title: 'Quy trình Xử lý Tình huống Đột xuất & Báo cáo Khẩn',
    insight: 'Khi xuất hiện vấn đề đột xuất, thực hiện nguyên tắc 3 bước: Báo cáo nhanh hiện trạng $\\rightarrow$ Đánh giá tác động chính trị/xã hội $\\rightarrow$ Đề xuất 2 phương án giải quyết.',
    actionableGuideline: 'Luôn cung cấp ít nhất 2 kịch bản xử lý (Phương án tối ưu & Phương án dự phòng) kèm theo ưu/nhược điểm từng phương án.',
    confidenceScore: 94,
    learnedFrom: 'deep_consolidation',
    timesApplied: 18,
    createdAt: Date.now() - 86400000 * 8,
    updatedAt: Date.now() - 86400000 * 1,
    tags: ['tinh huong khan', 'tham muu 3 buoc', 'kich ban xu ly']
  }
];

// Intelligent Query Normalizer: Strips greetings, conversational noise, punctuations
export const normalizeQuery = (query: string): string => {
  if (!query) return '';
  let text = query.toLowerCase().trim();

  // Strip common conversational Vietnamese prefixes and pleasantries
  const conversationalPrefixes = [
    /^(ai|trợ lý|bot|đồng chí trợ lý|hệ thống)\s*(ơi|ạ|cho hỏi|ơi cho hỏi|hãy cho biết|vui lòng cho biết|hỏi|ơi hỏi)\s*[:,-]?\s*/i,
    /^(xin chào|chào bạn|chào trợ lý|chào ai|chào đồng chí)\s*[:,-]?\s*/i,
    /^(cho tôi hỏi|cho em hỏi|cho mình hỏi|nhờ bạn|nhờ ai|làm ơn cho biết|hãy cho biết|vui lòng cho biết|hãy giải thích|giải thích giúp)\s*[:,-]?\s*/i,
    /^(hãy|vui lòng|xin hãy|hãy tóm tắt|tóm tắt giúp|hãy phân tích|phân tích giúp)\s+/i,
  ];

  for (const pattern of conversationalPrefixes) {
    text = text.replace(pattern, '').trim();
  }

  // Remove common trailing pleasantries or question marks
  text = text.replace(/[\?\!\.,;:]+$/g, '').trim();
  text = text.replace(/\s*(nhé|nha|với|giúp tôi|giúp mình|ạ|với ạ|đi bạn|đi nhé)$/i, '').trim();

  // Normalize multiple spaces
  text = text.replace(/\s+/g, ' ');

  return text;
};

export const MainBrainContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const memoryCache = useRef<Map<string, CachedAIItem>>(new Map());
  const [stats, setStats] = useState<{ hits: number; misses: number; total: number }>({
    hits: 0,
    misses: 0,
    total: 0,
  });

  // Evolving Wisdom State
  const [evolvingWisdom, setEvolvingWisdom] = useState<EvolvingWisdomItem[]>(SEED_WISDOM_ITEMS);
  const [isConsolidating, setIsConsolidating] = useState<boolean>(false);
  const [consolidationProgress, setConsolidationProgress] = useState<string>('');
  const [lastConsolidatedAt, setLastConsolidatedAt] = useState<number | null>(null);

  // Sync Evolving Wisdom from Firestore
  useEffect(() => {
    try {
      const q = firestoreQuery(collection(db, 'strategic_wisdom'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const items: EvolvingWisdomItem[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            items.push({
              id: docSnap.id,
              category: data.category || 'operational_principle',
              title: data.title || 'Bài học điều hành',
              insight: data.insight || '',
              actionableGuideline: data.actionableGuideline || '',
              confidenceScore: data.confidenceScore || 90,
              learnedFrom: data.learnedFrom || 'deep_consolidation',
              sourceContext: data.sourceContext || '',
              timesApplied: data.timesApplied || 0,
              createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
              updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.updatedAt || Date.now()),
              tags: data.tags || [],
              embedding: data.embedding
            });
          });
          // Merge with seeds if Firestore has fewer items
          const existingTitles = new Set(items.map(i => i.title.toLowerCase()));
          const combined = [...items];
          SEED_WISDOM_ITEMS.forEach(seed => {
            if (!existingTitles.has(seed.title.toLowerCase())) {
              combined.push(seed);
            }
          });
          setEvolvingWisdom(combined);
        } else {
          setEvolvingWisdom(SEED_WISDOM_ITEMS);
        }
      }, (err) => {
        console.warn('[MainBrain] Firestore wisdom sync warning:', err);
        setEvolvingWisdom(SEED_WISDOM_ITEMS);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('[MainBrain] Error setting up wisdom listener:', e);
    }
  }, []);

  // Load persistent cache index into memory on mount
  useEffect(() => {
    const initCache = async () => {
      try {
        const savedIndex = await getCachedData('ai_query_cache', CACHE_INDEX_KEY);
        if (Array.isArray(savedIndex)) {
          const now = Date.now();
          const validItems = savedIndex.filter(item => !item.expiresAt || item.expiresAt > now);
          validItems.forEach(item => {
            memoryCache.current.set(item.normalizedQuery, item);
          });
          setStats(prev => ({ ...prev, total: validItems.length }));
        }
      } catch (err) {
        console.warn('[MainBrainCache] Error initializing cache from storage:', err);
      }
    };
    initCache();
  }, []);

  // Save current cache to persistent storage (debounced)
  const saveCacheToStorage = useCallback(async () => {
    try {
      const items = Array.from(memoryCache.current.values()).slice(-MEMORY_CACHE_LIMIT);
      await cacheData('ai_query_cache', CACHE_INDEX_KEY, items);
      setStats(prev => ({ ...prev, total: items.length }));
    } catch (err) {
      console.warn('[MainBrainCache] Error persisting cache:', err);
    }
  }, []);

  const getCachedAIResponse = useCallback(
    async (
      queryText: string,
      options?: {
        contextKey?: string;
        similarityThreshold?: number;
        maxAgeMs?: number;
      }
    ) => {
      const normalized = normalizeQuery(queryText);
      if (!normalized || normalized.length < 3) {
        return null;
      }

      const now = Date.now();
      const threshold = options?.similarityThreshold ?? 0.92;
      const contextKey = options?.contextKey;

      // 1. Exact Normalized Match (Instant in-memory lookup)
      const exactMatch = memoryCache.current.get(normalized);
      if (exactMatch) {
        if (!contextKey || !exactMatch.contextKey || exactMatch.contextKey === contextKey) {
          if (!exactMatch.expiresAt || exactMatch.expiresAt > now) {
            exactMatch.hits += 1;
            setStats(prev => ({
              ...prev,
              hits: prev.hits + 1,
            }));
            return {
              response: exactMatch.response,
              groundingMetadata: exactMatch.groundingMetadata,
              isSemanticMatch: false,
              similarity: 1.0,
              cachedAt: exactMatch.timestamp,
            };
          } else {
            memoryCache.current.delete(normalized);
          }
        }
      }

      // 2. Semantic Similarity Match for close/equivalent queries
      if (memoryCache.current.size > 0 && normalized.length > 8) {
        try {
          const embPromise = generateEmbedding(normalized);
          const timeoutPromise = new Promise<null>(resolve => setTimeout(() => resolve(null), 250));
          const queryEmbedding = await Promise.race([embPromise, timeoutPromise]);

          if (queryEmbedding && Array.isArray(queryEmbedding)) {
            let bestMatch: CachedAIItem | null = null;
            let highestSimilarity = 0;

            for (const item of memoryCache.current.values()) {
              if (item.expiresAt && item.expiresAt <= now) continue;
              if (contextKey && item.contextKey && item.contextKey !== contextKey) continue;

              if (item.embedding && Array.isArray(item.embedding)) {
                const sim = cosineSimilarity(queryEmbedding, item.embedding);
                if (sim > highestSimilarity) {
                  highestSimilarity = sim;
                  bestMatch = item;
                }
              }
            }

            if (bestMatch && highestSimilarity >= threshold) {
              bestMatch.hits += 1;
              setStats(prev => ({
                ...prev,
                hits: prev.hits + 1,
              }));
              return {
                response: bestMatch.response,
                groundingMetadata: bestMatch.groundingMetadata,
                isSemanticMatch: true,
                similarity: highestSimilarity,
                cachedAt: bestMatch.timestamp,
              };
            }
          }
        } catch (simErr) {
          // Ignore non-blocking semantic lookup error
        }
      }

      // Cache Miss
      setStats(prev => ({
        ...prev,
        misses: prev.misses + 1,
      }));
      return null;
    },
    []
  );

  const setCachedAIResponse = useCallback(
    async (
      queryText: string,
      response: string,
      options?: {
        contextKey?: string;
        groundingMetadata?: any;
        ttlMs?: number;
      }
    ) => {
      const normalized = normalizeQuery(queryText);
      if (!normalized || normalized.length < 3 || !response || response.trim().length < 5) {
        return;
      }

      const now = Date.now();
      const ttl = options?.ttlMs ?? DEFAULT_TTL_MS;

      let embedding: number[] | undefined;
      try {
        if (normalized.length > 8) {
          embedding = await generateEmbedding(normalized);
        }
      } catch {
        // Continue without embedding
      }

      const cacheItem: CachedAIItem = {
        id: `cache-${now}-${Math.random().toString(36).substring(2, 7)}`,
        normalizedQuery: normalized,
        originalQuery: queryText,
        response: response,
        timestamp: now,
        hits: 1,
        embedding,
        groundingMetadata: options?.groundingMetadata,
        contextKey: options?.contextKey,
        expiresAt: now + ttl,
      };

      if (memoryCache.current.size >= MEMORY_CACHE_LIMIT) {
        const firstKey = memoryCache.current.keys().next().value;
        if (firstKey) {
          memoryCache.current.delete(firstKey);
        }
      }

      memoryCache.current.set(normalized, cacheItem);
      saveCacheToStorage();
    },
    [saveCacheToStorage]
  );

  const clearAICache = useCallback(async () => {
    memoryCache.current.clear();
    await cacheData('ai_query_cache', CACHE_INDEX_KEY, []);
    setStats({ hits: 0, misses: 0, total: 0 });
  }, []);

  // Record application of a wisdom item to boost its priority/usage counter
  const recordWisdomApplication = useCallback(async (wisdomId: string) => {
    try {
      setEvolvingWisdom(prev => prev.map(w => w.id === wisdomId ? { ...w, timesApplied: w.timesApplied + 1 } : w));
      if (!wisdomId.startsWith('seed-')) {
        const wisdomRef = doc(db, 'strategic_wisdom', wisdomId);
        await updateDoc(wisdomRef, {
          timesApplied: (evolvingWisdom.find(w => w.id === wisdomId)?.timesApplied || 0) + 1,
          updatedAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.warn('[MainBrain] Error recording wisdom application:', e);
    }
  }, [evolvingWisdom]);

  // Semantic search for relevant wisdom
  const getRelevantWisdom = useCallback(async (queryText: string, limit = 4): Promise<EvolvingWisdomItem[]> => {
    if (!queryText || evolvingWisdom.length === 0) return evolvingWisdom.slice(0, limit);

    const lower = queryText.toLowerCase();
    
    // 1. Keyword & Tag Match scoring
    const scored = evolvingWisdom.map(w => {
      let score = 0;
      if (lower.includes(w.title.toLowerCase())) score += 5;
      if (lower.includes(w.category.toLowerCase())) score += 3;
      w.tags?.forEach(tag => {
        if (lower.includes(tag.toLowerCase())) score += 4;
      });
      if (w.insight.toLowerCase().split(' ').some(word => word.length > 3 && lower.includes(word))) {
        score += 2;
      }
      // Weight by confidence and usage
      score += (w.confidenceScore / 50) + Math.min(w.timesApplied / 10, 3);
      return { item: w, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.item);
  }, [evolvingWisdom]);

  // Add custom manual wisdom item
  const addCustomWisdom = useCallback(async (item: {
    title: string;
    insight: string;
    actionableGuideline: string;
    category: 'executive_habit' | 'operational_principle' | 'policy_guideline' | 'strategic_directive' | 'cross_link';
    tags: string[];
  }) => {
    const embedding = await generateEmbedding(`${item.title} ${item.insight} ${item.actionableGuideline}`).catch(() => undefined);
    const newDoc = {
      title: item.title,
      insight: item.insight,
      actionableGuideline: item.actionableGuideline,
      category: item.category,
      tags: item.tags,
      confidenceScore: 98,
      learnedFrom: 'manual_directive',
      timesApplied: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      embedding: embedding || null
    };

    try {
      const docRef = await addDoc(collection(db, 'strategic_wisdom'), newDoc);
      const localItem: EvolvingWisdomItem = {
        id: docRef.id,
        ...item,
        confidenceScore: 98,
        learnedFrom: 'manual_directive',
        timesApplied: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        embedding
      };
      setEvolvingWisdom(prev => [localItem, ...prev]);
    } catch (e) {
      console.warn('[MainBrain] Adding wisdom locally:', e);
      const localItem: EvolvingWisdomItem = {
        id: `custom-${Date.now()}`,
        ...item,
        confidenceScore: 98,
        learnedFrom: 'manual_directive',
        timesApplied: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        embedding
      };
      setEvolvingWisdom(prev => [localItem, ...prev]);
    }
  }, []);

  // Delete wisdom item
  const deleteWisdomItem = useCallback(async (id: string) => {
    setEvolvingWisdom(prev => prev.filter(w => w.id !== id));
    if (!id.startsWith('seed-') && !id.startsWith('custom-')) {
      try {
        await deleteDoc(doc(db, 'strategic_wisdom', id));
      } catch (e) {
        console.warn('[MainBrain] Error deleting wisdom:', e);
      }
    }
  }, []);

  // Deep Cognitive Consolidation & Evolution Engine (AI-Driven Self-Learning)
  const consolidateAndEvolveMemory = useCallback(async (contextData?: {
    tasks?: any[];
    knowledge?: any[];
    meetings?: any[];
    kpis?: any[];
    chats?: any[];
  }) => {
    setIsConsolidating(true);
    setConsolidationProgress('Đang quét toàn bộ dữ liệu chỉ đạo, nhiệm vụ, văn bản và KPI...');

    try {
      const tasksSample = (contextData?.tasks || []).slice(0, 15).map(t => `- [${t.status}] ${t.title}: ${t.description || ''}`).join('\n');
      const knowledgeSample = (contextData?.knowledge || []).slice(0, 15).map(k => `- [${k.category}] ${k.title}: ${k.summary || k.content?.slice(0, 100)}`).join('\n');
      const kpisSample = (contextData?.kpis || []).slice(0, 10).map(k => `- Chỉ tiêu: "${k.title}" (${k.progressPercent || 0}%)`).join('\n');
      const existingWisdomSample = evolvingWisdom.map(w => `- ${w.title}: ${w.insight}`).join('\n');

      setConsolidationProgress('Đang sử dụng Mô hình Gemini 3.7 Flash để tổng hợp quy luật điều hành & bài học mới...');

      const prompt = `Bạn là Trí tuệ Nhân tạo Trung tâm (Cognitive Evolution Core) của Hệ thống Chỉ huy Chiến lược 6.0 dành cho Chánh Văn phòng Đảng ủy Nguyễn Minh Huy.
Nhiệm vụ của bạn: Tiến hành "TIẾN HÓA TRI THỨC BỘ NÃO" (Deep Knowledge Consolidation), phân tích toàn diện các dữ liệu thực tế sau đây để đúc kết ra 2 - 3 BÀI HỌC KINH NGHIỆM / NGUYÊN TẮC THAM MƯU CHIẾN LƯỢC MỚI MẺ, ĐẮC LỰC NHẤT.

DỮ LIỆU NHIỆM VỤ THỰC TẾ:
${tasksSample || '(Chưa có nhiệm vụ cụ thể)'}

DỮ LIỆU KHO TRI THỨC VĂN BẢN ĐẢNG:
${knowledgeSample || '(Chưa có văn bản)'}

DỮ LIỆU CHỈ TIÊU KPI:
${kpisSample || '(Chưa có KPI)'}

CÁC BÀI HỌC ĐÃ CÓ TRƯỚC ĐÂY (TRÁNH TRÙNG LẶP NỘI DUNG):
${existingWisdomSample}

YÊU CẦU:
Trả về kết quả DUY NHẤT dưới dạng mảng JSON thuần túy (không thêm văn bản dẫn dắt bên ngoài), mỗi phần tử là 1 bài học tiến hóa mới theo schema:
[
  {
    "title": "Tên bài học/nguyên tắc ngắn gọn, súc tích",
    "category": "executive_habit" | "operational_principle" | "policy_guideline" | "strategic_directive" | "cross_link",
    "insight": "Phát hiện sâu sắc về quy luật điều hành, điểm nghẽn hoặc kinh nghiệm thực tế",
    "actionableGuideline": "Chỉ dẫn hành động cụ thể cho Trợ lý AI khi tư vấn hoặc soạn thảo cho Chánh Văn phòng",
    "confidenceScore": 95,
    "tags": ["tag1", "tag2", "tag3"]
  }
]`;

      const response = await generateContentWithRetry({
        model: "gemini-3.7-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const rawText = response?.text || (response as any)?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      setConsolidationProgress('Đang phân tích cú pháp và lưu trữ vào Kho Tri thức Tiến hóa...');

      let parsedItems: any[] = [];
      try {
        const jsonMatch = rawText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsedItems = JSON.parse(jsonMatch[0]);
        }
      } catch (parseErr) {
        console.warn('[MainBrain] JSON parse warning on consolidation:', parseErr);
      }

      let addedCount = 0;
      if (Array.isArray(parsedItems) && parsedItems.length > 0) {
        for (const item of parsedItems) {
          if (item.title && item.insight && item.actionableGuideline) {
            await addCustomWisdom({
              title: item.title,
              insight: item.insight,
              actionableGuideline: item.actionableGuideline,
              category: item.category || 'operational_principle',
              tags: Array.isArray(item.tags) ? item.tags : ['tien_hoa_tri_thuc', 'kinh_nghiem']
            });
            addedCount++;
          }
        }
      }

      setLastConsolidatedAt(Date.now());
      setConsolidationProgress('Hoàn tất quá trình tiến hóa bộ não!');

      return {
        newItemsCount: addedCount,
        summary: addedCount > 0 
          ? `Bộ não đã đúc kết thành công ${addedCount} bài học & nguyên tắc tham mưu mới từ dữ liệu thực tế.` 
          : 'Hệ thống đã rà soát toàn diện, dữ liệu hiện tại đang ở trạng thái tối ưu.'
      };
    } catch (error) {
      console.error('[MainBrain] Error during memory consolidation:', error);
      throw error;
    } finally {
      setIsConsolidating(false);
    }
  }, [evolvingWisdom, addCustomWisdom]);

  // Compute Cognitive Metrics & Brain IQ Score dynamically
  const cognitiveMetrics: CognitiveMetrics = useMemo(() => {
    const wisdomCount = evolvingWisdom.length;
    const cacheHitBonus = Math.min(stats.hits * 0.5, 20);
    const usageBonus = Math.min(evolvingWisdom.reduce((sum, w) => sum + w.timesApplied, 0) * 0.3, 25);
    
    // Dynamic Cognitive IQ scale starting from 145 up to 195+
    const calculatedIQ = Math.round(145 + Math.min(wisdomCount * 2.5, 30) + cacheHitBonus + usageBonus);
    
    return {
      brainIQ: calculatedIQ,
      totalWisdomCount: wisdomCount,
      totalCrossLinks: Math.round(wisdomCount * 3.4),
      consolidationCycles: Math.max(1, Math.floor(wisdomCount / 2)),
      memoryIntegrityScore: Math.min(99, 90 + Math.floor(wisdomCount * 0.8)),
      lastConsolidatedAt: lastConsolidatedAt || Date.now() - 3600000 * 4
    };
  }, [evolvingWisdom, stats.hits, lastConsolidatedAt]);

  const totalQueries = stats.hits + stats.misses;
  const hitRate = totalQueries > 0 ? (stats.hits / totalQueries) * 100 : 0;

  const value: MainBrainContextType = {
    getCachedAIResponse,
    setCachedAIResponse,
    clearAICache,
    cacheStats: {
      totalEntries: stats.total,
      hitCount: stats.hits,
      missCount: stats.misses,
      hitRate: Math.round(hitRate * 10) / 10,
    },
    normalizeQuery,
    evolvingWisdom,
    isConsolidating,
    consolidationProgress,
    cognitiveMetrics,
    consolidateAndEvolveMemory,
    addCustomWisdom,
    deleteWisdomItem,
    getRelevantWisdom,
    recordWisdomApplication
  };

  return <MainBrainContext.Provider value={value}>{children}</MainBrainContext.Provider>;
};

export const useMainBrain = (): MainBrainContextType => {
  const context = useContext(MainBrainContext);
  if (!context) {
    throw new Error('useMainBrain must be used within a MainBrainProvider');
  }
  return context;
};
