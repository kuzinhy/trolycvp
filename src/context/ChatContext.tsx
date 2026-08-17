import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, getDocs, where, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';
import { Message, SYSTEM_INSTRUCTION } from '../constants';
import { useAuth } from '../context/AuthContext';
import { generateEmbedding, cosineSimilarity } from '../services/embeddingService';
import { generateContentWithRetry, generateContentStreamWithRetry, getLocalFallbackResponse } from '../lib/ai-utils';
import { cacheData, getCachedData } from '../lib/cache';
import { useToast } from '../hooks/useToast';
import { useKnowledgeContext } from './KnowledgeContext';
import { useDashboardContext } from './DashboardContext';
import { useMainBrain } from './MainBrainContext';

const isNonLocalQuery = (text: string): boolean => {
  const lowercaseText = text.toLowerCase().trim();
  
  // Các từ khóa chỉ định ý định tìm kiếm thời gian thực rõ ràng hoặc tin tức cập nhật liên tục
  const realTimeIntents = [
    'thời tiết', 'nhiệt độ', 'dự báo thời tiết', 'mưa', 'nắng', 'bão', 'thiên tai', 'nóng', 'lạnh',
    'tin tức', 'thời sự', 'tin mới', 'báo chí', 'dạo này', 'tình hình', 'mới nhất', 'hot',
    'giá vàng', 'giá xăng', 'giá dầu', 'tỷ giá', 'chứng khoán', 'lãi suất', 'usd', 'tỷ phú', 'giá cả',
    'tra cứu', 'tìm kiếm', 'tìm trên mạng', 'internet', 'google', 'thời gian thực', 'real-time', 'realtime',
    'luật', 'nghị định', 'thông tư', 'quyết định số', 'pháp luật', 'quy định mới', 'chính phủ', 'quốc hội',
    'địa chỉ', 'bản đồ', 'đường đi', 'sđt', 'số điện thoại', 'website', 'trang web'
  ];

  if (realTimeIntents.some(intent => lowercaseText.includes(intent))) {
    return true;
  }

  // Nếu chứa các từ khóa địa phương hoặc tỉnh thành khác ngoài Bình Dương/Thủ Dầu Một
  const externalPlaces = [
    'hồ chí minh', 'tphcm', 'tp.hcm', 'sài gòn', 'hà nội', 'đà nẵng', 'hải phòng', 'nha trang', 
    'cần thơ', 'lâm đồng', 'đà lạt', 'vũng tàu', 'đồng nai', 'tây ninh', 'bến tre', 'long an'
  ];
  if (externalPlaces.some(place => lowercaseText.includes(place))) {
    return true;
  }

  // Các dạng câu hỏi tra cứu thông tin phổ biến
  const generalQuestions = [
    'ở đâu', 'là gì', 'như thế nào', 'thế nào', 'bao nhiêu', 'ai là', 'ngày mấy', 'mấy giờ',
    'làm sao', 'làm thế nào', 'hướng dẫn', 'định nghĩa'
  ];
  
  const hasGeneralQuestion = generalQuestions.some(q => lowercaseText.includes(q));

  // Các từ khóa liên quan đến thông tin cá nhân hoặc lịch trình nội bộ đặc thù của Văn phòng Đảng ủy
  const internalKeywords = [
    'lịch họp của tôi', 'nhiệm vụ của tôi', 'đơn vị của tôi', 'chi bộ của tôi', 
    'xếp loại', 'đánh giá kpi', 'sổ tay', 'lịch công tác tuần', 'kế hoạch tuần', 'kpi của tôi'
  ];
  const hasInternalContext = internalKeywords.some(keyword => lowercaseText.includes(keyword));

  // Trả về true nếu là câu hỏi chung cần tra cứu thông tin mà không thuộc phạm vi công việc nội bộ hẹp
  return hasGeneralQuestion && !hasInternalContext;
};

interface ChatContextType {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  chatHistory: any[];
  isHistoryLoading: boolean;
  isLearning: boolean;
  isSaving: number | null;
  copiedId: string | null;
  isSearchEnabled: boolean;
  setIsSearchEnabled: (val: boolean) => void;
  isSimpleMode: boolean;
  setIsSimpleMode: (val: boolean) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  loadChatHistory: () => Promise<void>;
  deleteChatHistory: (index: number) => Promise<void>;
  clearAllChatHistory: () => Promise<void>;
  handleSend: (textInput?: string | React.MouseEvent | React.KeyboardEvent, fileContent?: string) => Promise<void>;
  saveToKnowledge: (text: string, tags: string[], index: number) => Promise<void>;
  copyToClipboard: (text: string, id: string) => void;
  triggerAutoLearning: (history: Message[], isManual?: boolean) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, isSuperAdmin, unitId } = useAuth();
  const { showToast } = useToast();
  const { aiKnowledge, loadKnowledge } = useKnowledgeContext();
  const { tasks = [], meetings = [], events = [], birthdays = [] } = useDashboardContext();
  const { getCachedAIResponse, setCachedAIResponse, cacheStats, getRelevantWisdom, recordWisdomApplication } = useMainBrain();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isLearning, setIsLearning] = useState(false);
  const [isSaving, setIsSaving] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [isSimpleMode, setIsSimpleMode] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const loadChatHistory = useCallback(async () => {
    if (!user) return;
    setIsHistoryLoading(true);
    const cacheKey = `chat_history_${user.uid}_${unitId || 'default'}`;
    const cached = await getCachedData('chat_history', cacheKey);
    if (cached) setChatHistory(cached);

    try {
      let q;
      if (isSuperAdmin) q = query(collection(db, 'chat_history'), limit(500));
      else if (isAdmin) q = query(collection(db, 'chat_history'), where('unitId', '==', unitId || ''), limit(500));
      else q = query(collection(db, 'chat_history'), where('userId', '==', user.uid), limit(500));

      const snapshot = await getDocs(q);
      const history = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      history.sort((a, b) => b.timestamp - a.timestamp);
      setChatHistory(history);
      await cacheData('chat_history', cacheKey, history);
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'chat_history');
    } finally {
      setIsHistoryLoading(false);
    }
  }, [user, isAdmin, isSuperAdmin, unitId]);

  useEffect(() => {
    if (user) loadChatHistory();
  }, [user, loadChatHistory]);

  const triggerAutoLearning = useCallback(async (history: Message[], isManual = false) => {
    if (isLearning || !user) return;
    
    // Check if user specifically requested to learn/save
    const lastUserMessage = [...history].reverse().find(m => m.role === 'user')?.content || "";
    const isExplicitRequest = /lưu vào bộ não|ghi nhớ cái này|cập nhật kiến thức|học thuộc cái này|save to brain/i.test(lastUserMessage);
    
    setIsLearning(true);
    try {
      const response = await generateContentWithRetry({
        model: "gemini-3.7-flash",
        contents: [{
          role: 'user',
          parts: [{ text: `Bạn là Hệ thống Quản trị Tri thức Elite. ${isExplicitRequest ? 'Người dùng yêu cầu bạn ghi nhớ thông tin quan trọng.' : 'Phân tích hội thoại sau để trích xuất kiến thức quan trọng.'} 
          
Nhiệm vụ:
1. Xác định các sự kiện, quy định, chỉ đạo hoặc kiến thức mới xuất hiện.
2. Trình bày dưới dạng danh sách các đoạn văn bản độc lập.
3. Nếu không có thông tin gì thực sự giá trị hoặc mới, chỉ trả về duy nhất từ "NONE".
4. Nếu có, hãy trích xuất súc tích, đầy đủ ý nghĩa (max 3 ý).

Hội thoại:
${history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}` }]
        }],
      });
      const text = response?.text?.trim();
      if (text && !text.includes("NONE")) {
        const batch = writeBatch(db);
        const points = text.split('\n').filter(p => p.trim().length > 5);
        
        for (const point of points) {
          const content = point.replace(/^[0-9.-]+\s*/, '').trim();
          if (!content) continue;
          
          const embedding = await generateEmbedding(content).catch(() => null);
          const title = content.substring(0, 100);
          
          batch.set(doc(collection(db, "party_documents")), {
            content, 
            title, 
            summary: content.substring(0, 200),
            category: isExplicitRequest ? "Chỉ đạo trực tiếp" : "Auto-Learned", 
            tags: [isExplicitRequest ? "direct-instruction" : "auto-learned", "chat-extraction"], 
            isPublic: true,
            createdAt: serverTimestamp(), 
            updatedAt: serverTimestamp(), 
            authorUid: user.uid,
            unitId: unitId || 'all', 
            type: 'document',
            embedding: embedding
          });
        }
        
        await batch.commit();
        loadKnowledge();
        if (isManual || isExplicitRequest) showToast("Bộ não Elite đã ghi nhớ thông tin này.", "success");
      } else if (isManual) showToast("Không tìm thấy thông tin mới để cập nhật.", "info");
    } catch (err) {
      console.warn("Auto-learning background warning (quota/rate-limit/network):", err);
    } finally {
      setIsLearning(false);
    }
  }, [isLearning, loadKnowledge, showToast, user, unitId]);

  const handleSend = useCallback(async (textInput?: string | React.MouseEvent | React.KeyboardEvent, fileContent?: string) => {
    const text = typeof textInput === 'string' ? textInput : input;
    if ((!text || !text.trim()) && !fileContent && isLoading) return;

    const trimmedText = text.trim();
    const userMessage: Message = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: fileContent ? `${trimmedText}\n\n[FILE]:\n${fileContent}` : trimmedText,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    let aiMessageId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let aiText = "";
    let instruction = "";
    let scheduleContext = "";
    let knowledgeContext = "";
    let finalGroundingMetadata: any = null;

    try {
      if (user) {
        addDoc(collection(db, 'chat_history'), {
          userId: user.uid, email: user.email, unitId: unitId || 'all',
          role: 'user', content: userMessage.content, timestamp: Date.now()
        }).catch(() => null);
      }

      const isSearchNeeded = isSearchEnabled || isNonLocalQuery(trimmedText);
      const cacheContextKey = isSearchNeeded ? 'realtime' : 'general';

      // 0. MainBrain Cache Check for immediate response (0ms latency for duplicate/equivalent queries)
      if (!fileContent) {
        const cached = await getCachedAIResponse(trimmedText, {
          contextKey: cacheContextKey,
          similarityThreshold: 0.93,
          maxAgeMs: isSearchNeeded ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
        });

        if (cached && cached.response && cached.response.trim().length > 0) {
          aiText = cached.response;
          finalGroundingMetadata = cached.groundingMetadata;

          setMessages(prev => [
            ...prev,
            {
              id: aiMessageId,
              role: 'model',
              content: aiText,
              timestamp: Date.now(),
              groundingMetadata: finalGroundingMetadata || undefined,
            }
          ]);

          if (user) {
            addDoc(collection(db, 'chat_history'), {
              userId: user.uid,
              email: user.email,
              unitId: unitId || 'all',
              role: 'model',
              content: aiText,
              timestamp: Date.now(),
              groundingMetadata: finalGroundingMetadata || null,
            }).catch(() => null);
          }

          setIsLoading(false);
          return;
        }
      }

      // Fast Lexical + Semantic retrieval of knowledge
      let relevantKnowledge: any[] = [];
      const lowerQuery = trimmedText.toLowerCase();
      const keywords = lowerQuery.split(/\s+/).filter(w => w.length > 2);

      // Fast in-memory keyword scoring
      if (aiKnowledge.length > 0) {
        const keywordMatched = aiKnowledge.filter(k => {
          const content = (k.content || '').toLowerCase();
          const title = (k.title || '').toLowerCase();
          const tags = Array.isArray(k.tags) ? k.tags.join(' ').toLowerCase() : '';
          return keywords.some(kw => content.includes(kw) || title.includes(kw) || tags.includes(kw));
        }).slice(0, 5);

        relevantKnowledge = keywordMatched;
      }

      // Try quick semantic scoring with a timeout race (max 300ms) to never block user latency
      if (aiKnowledge.length > 0) {
        try {
          const embeddingPromise = generateEmbedding(trimmedText);
          const timeoutPromise = new Promise<null>(resolve => setTimeout(() => resolve(null), 300));
          const inputEmbedding = await Promise.race([embeddingPromise, timeoutPromise]);

          if (inputEmbedding && Array.isArray(inputEmbedding)) {
            const scoredKnowledge = aiKnowledge
              .filter(k => k.embedding && Array.isArray(k.embedding))
              .map(k => ({
                ...k,
                similarity: cosineSimilarity(inputEmbedding, k.embedding)
              }))
              .sort((a, b) => b.similarity - a.similarity);
            
            if (scoredKnowledge.length > 0) {
              relevantKnowledge = scoredKnowledge.slice(0, 6);
            }
          }
        } catch (embErr) {
          // Fallback to keyword matched or slice
        }
      }

      if (relevantKnowledge.length === 0 && aiKnowledge.length > 0) {
        relevantKnowledge = aiKnowledge.slice(0, 5);
      }

      knowledgeContext = relevantKnowledge.map((k, i) => `${i+1}. [${k.category || 'Chung'}]: ${k.content}`).join('\n');
      
      // Lấy các bài học và nguyên tắc điều hành tiến hóa liên quan từ Bộ não trung tâm
      let relevantWisdom: any[] = [];
      try {
        relevantWisdom = await getRelevantWisdom(trimmedText, 3);
      } catch (wErr) {
        // Non-blocking wisdom retrieval
      }

      const wisdomContext = relevantWisdom.length > 0 
        ? `\n\n[BỘ NHỚ TIẾN HÓA & NGUYÊN TẮC THAM MƯU ĐÃ TÍCH LŨY]:\n` +
          relevantWisdom.map((w, idx) => `${idx + 1}. [${w.title} - ${w.category}]: ${w.actionableGuideline} (Nguyên lý đúc kết: ${w.insight})`).join('\n')
        : '';

      const userName = user?.displayName || 'Đồng chí';
      const userRole = isAdmin ? (isSuperAdmin ? 'Super Admin' : 'Admin') : 'Người dùng';
      instruction = SYSTEM_INSTRUCTION
        .replace(/\{\{USER_NAME\}\}/g, userName)
        .replace(/\{\{USER_ROLE\}\}/g, userRole)
        .replace(/Anh Huy/g, userName) + wisdomContext;

      if (isSearchNeeded) {
        instruction += `
\n\n[DETECTIVE & REALTIME INFORMATION CORE ACTIVATED]:
- Bạn đang hoạt động như một THÁM TỬ TIN NHUỆ và TRUNG TÂM CUNG CẤP THÔNG TIN THỜI GIAN THỰC.
- Đối với các câu hỏi về địa phương khác (không phải địa bàn hoạt động chính như Bình Dương/Thủ Dầu Một) hoặc các sự kiện, tin tức cần cập nhật thời gian thực, hãy sử dụng tính năng tra cứu thời gian thực (Google Search).
- Rà soát kỹ lưỡng từ các nguồn tin chính thống, uy tín của cơ quan Nhà nước hoặc cơ quan báo chí chính thức (như báo Nhân Dân, Chính phủ, các cổng thông tin điện tử, v.v.).
- Hãy phân tích các thông tin tìm được, bóc tách dữ liệu và chọn lọc thông tin chính xác nhất để trả lời sắc bén, chuyên nghiệp và chính xác như một thám tử.
- Bắt buộc phải trích dẫn rõ nguồn gốc, thời gian, cơ quan ban hành của thông tin một cách khách quan.
- Hãy mở đầu câu trả lời bằng một lời giới thiệu mang đậm phong cách của Thám tử Chỉ huy Elite (ví dụ: "🕵️‍♂️ **[Elite Real-time Core]** Đã kích hoạt rà soát thời gian thực...", hoặc "🕵️‍♂️ Thưa đồng chí, qua rà soát và xác minh dữ liệu thời gian thực...").
- Trình bày câu trả lời khoa học, có cấu trúc phân tích mạch lạc và rõ ràng.
        `;
      }

      if (isSimpleMode) {
        instruction += "\n\nCHẾ ĐỘ ĐƠN THUẦN ĐANG BẬT: Hãy trả lời cực kỳ ngắn gọn, đi thẳng vào trọng tâm. TRẢ LỜI TRỰC TIẾP VÀO CÂU HỎI. KHÔNG GIẢI THÍCH DÀI DÒNG. KHÔNG GỢI Ý THÊM HÀNH ĐỘNG HAY ĐƯA RA LỜI KHUYÊN NẾU KHÔNG ĐƯỢC YÊU CẦU. KHÔNG CHÀO HỎI. Chỉ tập trung cung cấp đúng thông tin người dùng cần.";
      }

      const now = new Date();
      const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

      // Format schedule context
      scheduleContext = `
THỜI GIAN HIỆN TẠI: ${timeStr}, ${dateStr}

LỊCH CÔNG TÁC & NHIỆM VỤ (DỮ LIỆU THỰC TẾ):
- Cuộc họp/Lịch công tác: ${meetings.length > 0 ? meetings.map(m => `${m.date} ${m.time}: ${m.name} (${m.location})`).join('; ') : 'Không có lịch họp.'}
- Nhiệm vụ: ${tasks.length > 0 ? tasks.map(t => `${t.title} (Hạn: ${t.deadline}, Trạng thái: ${t.status})`).join('; ') : 'Không có nhiệm vụ.'}
- Sự kiện: ${events.length > 0 ? events.map(e => `${e.date}: ${e.name}`).join('; ') : 'Không có sự kiện.'}
- Sinh nhật: ${birthdays.length > 0 ? birthdays.map(b => `${b.date}: ${b.name}`).join('; ') : 'Không có thông tin sinh nhật.'}

LƯU Ý QUAN TRỌNG VỀ DỮ LIỆU:
1. Tuyệt đối chỉ trả lời lịch công tác/nhiệm vụ dựa trên dữ liệu thực tế được cung cấp ở trên.
2. Nếu người dùng hỏi thông tin không có trong Kho dữ liệu (KNOWLEDGE) hoặc LỊCH CÔNG TÁC và KHÔNG liên quan đến tìm kiếm thời gian thực (Google Search), hãy trả lời trung thực là "Tôi chưa có thông tin về vấn đề này trong hệ thống" và không tự bịa thông tin.
3. Khi người dùng yêu cầu kết quả thời gian thực (ví dụ như thời tiết hôm nay, giá xăng/vàng hiện tại, tin tức mới nhất, văn bản luật mới ban hành), bạn PHẢI ưu tiên tuyệt đối kết quả tra cứu được từ công cụ Google Search thời gian thực vừa thực hiện, KHÔNG trả lời bằng kiến thức cũ tĩnh của mô hình hoặc thông tin cũ trong lịch sử trò chuyện.
      `.trim();

      const responseStream = await generateContentStreamWithRetry({
        model: "gemini-3.7-flash",
        contents: [{
          role: 'user',
          parts: [{ text: `${instruction}\n\n${scheduleContext}\n\nKNOWLEDGE:\n${knowledgeContext || 'Chưa có thông tin.'}\n\nHISTORY:\n${messages.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}\n\nUSER: ${userMessage.content}` }]
        }],
        config: { temperature: 0.4, tools: isSearchNeeded ? [{ googleSearch: {} }] : undefined }
      });

      setMessages(prev => [...prev, { id: aiMessageId, role: 'model', content: '', timestamp: Date.now() }]);

      for await (const chunk of responseStream) {
        aiText += chunk.text || "";
        
        // Extract and aggregate grounding metadata from stream chunk
        const metadata = (chunk as any).candidates?.[0]?.groundingMetadata;
        if (metadata) {
          if (!finalGroundingMetadata) {
            finalGroundingMetadata = { groundingChunks: [] };
          }
          if (metadata.groundingChunks) {
            metadata.groundingChunks.forEach((item: any) => {
              if (item.web?.uri && !finalGroundingMetadata.groundingChunks.some((existing: any) => existing.web?.uri === item.web?.uri)) {
                finalGroundingMetadata.groundingChunks.push(item);
              }
            });
          }
        }

        setMessages(prev => prev.map(m => 
          m.id === aiMessageId 
            ? { ...m, content: aiText, groundingMetadata: finalGroundingMetadata || undefined } 
            : m
        ));
      }

      // Cache successful response in MainBrain & Record Wisdom Applications
      if (!fileContent && aiText && aiText.trim().length > 10) {
        setCachedAIResponse(trimmedText, aiText, {
          groundingMetadata: finalGroundingMetadata,
          contextKey: cacheContextKey,
          ttlMs: isSearchNeeded ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
        }).catch(err => console.warn('[ChatContext] Cache set error:', err));

        if (relevantWisdom.length > 0) {
          relevantWisdom.forEach(w => recordWisdomApplication(w.id).catch(() => null));
        }
      }

      if (user) {
        addDoc(collection(db, 'chat_history'), {
          userId: user.uid, email: user.email, unitId: unitId || 'all',
          role: 'model', content: aiText, timestamp: Date.now(),
          groundingMetadata: finalGroundingMetadata || null
        }).catch(() => null);
      }
      triggerAutoLearning([...messages, userMessage, { id: aiMessageId, role: 'model', content: aiText, timestamp: Date.now(), groundingMetadata: finalGroundingMetadata || null }]);
    } catch (e: any) {
      console.error("AI Error:", e);
      
      // Nếu chưa có câu trả lời hoàn chỉnh từ luồng streaming, thử khôi phục bằng phương thức generateContent trực tiếp
      if (aiText.trim().length < 5) {
        try {
          console.log("[ChatContext] Stream failed, attempting non-stream fallback with gemini-3.7-flash...");
          const nonStreamRes = await generateContentWithRetry({
            model: "gemini-3.7-flash",
            contents: [{
              role: 'user',
              parts: [{ text: `${instruction}\n\n${scheduleContext}\n\nKNOWLEDGE:\n${knowledgeContext || 'Chưa có thông tin.'}\n\nHISTORY:\n${messages.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}\n\nUSER: ${userMessage.content}` }]
            }],
            config: { temperature: 0.4 }
          });

          if (nonStreamRes?.text && nonStreamRes.text.trim().length > 0) {
            aiText = nonStreamRes.text;
            
            // Cache fallback response
            if (!fileContent && aiText && aiText.trim().length > 10) {
              setCachedAIResponse(trimmedText, aiText, {
                groundingMetadata: null,
                contextKey: isSearchEnabled || isNonLocalQuery(trimmedText) ? 'realtime' : 'general',
                ttlMs: 24 * 60 * 60 * 1000,
              }).catch(() => null);
            }

            setMessages(prev => {
              const exists = prev.some(m => m.id === aiMessageId);
              if (exists) {
                return prev.map(m => m.id === aiMessageId ? { ...m, content: aiText } : m);
              } else {
                return [...prev, { id: aiMessageId, role: 'model', content: aiText, timestamp: Date.now() }];
              }
            });
            if (user) {
              addDoc(collection(db, 'chat_history'), {
                userId: user.uid, email: user.email, unitId: unitId || 'all',
                role: 'model', content: aiText, timestamp: Date.now(),
                groundingMetadata: null
              }).catch(() => null);
            }
            triggerAutoLearning([...messages, userMessage, { id: aiMessageId, role: 'model', content: aiText, timestamp: Date.now(), groundingMetadata: null }]);
            return;
          }
        } catch (retryErr) {
          console.warn("[ChatContext] Non-stream fallback also failed:", retryErr);
        }

        const fallbackText = getLocalFallbackResponse(trimmedText, meetings, tasks, events, birthdays, aiKnowledge);
        aiText = fallbackText;
        
        // Cập nhật lại tin nhắn hiển thị thành nội dung ngoại tuyến thông minh
        setMessages(prev => {
          const exists = prev.some(m => m.id === aiMessageId);
          if (exists) {
            return prev.map(m => m.id === aiMessageId ? { ...m, content: fallbackText } : m);
          } else {
            return [...prev, { id: aiMessageId, role: 'model', content: fallbackText, timestamp: Date.now() }];
          }
        });

        if (user) {
          addDoc(collection(db, 'chat_history'), {
            userId: user.uid, email: user.email, unitId: unitId || 'all',
            role: 'model', content: fallbackText, timestamp: Date.now(),
            groundingMetadata: null
          }).catch(() => null);
        }
      } else {
        const errMsg = e?.message || "Lỗi kết nối AI";
        showToast(errMsg, "error");
      }
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, aiKnowledge, messages, user, unitId, isSearchEnabled, isSimpleMode, showToast, triggerAutoLearning, meetings, tasks, events, birthdays]);

  const saveToKnowledge = useCallback(async (text: string, tags: string[], index: number) => {
    if (!user) return;
    setIsSaving(index);
    try {
      await addDoc(collection(db, "party_documents"), {
        content: text, title: text.substring(0, 100), summary: text.substring(0, 100),
        category: "Chat", tags: [...tags, "chat-saved"], isPublic: true,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(), authorUid: user.uid,
        unitId: unitId || 'all', type: 'document'
      });
      showToast("Đã lưu tri thức", "success");
      loadKnowledge();
    } finally {
      setIsSaving(null);
    }
  }, [loadKnowledge, showToast, user, unitId]);

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast("Đã sao chép", "success");
    setTimeout(() => setCopiedId(null), 2000);
  }, [showToast]);

  const deleteChatHistory = useCallback(async (index: number) => {
    const item = chatHistory[index];
    if (!item?.id) return;
    try {
      await deleteDoc(doc(db, 'chat_history', item.id));
      setChatHistory(prev => prev.filter((_, i) => i !== index));
      showToast("Đã xóa lịch sử", "success");
    } catch (e) {
      showToast("Lỗi khi xóa", "error");
    }
  }, [chatHistory, showToast]);

  const clearAllChatHistory = useCallback(async () => {
    if (!user || chatHistory.length === 0) return;
    try {
      const userChats = chatHistory.filter(c => c.userId === user.uid);
      const batchSize = 500;
      for (let i = 0; i < userChats.length; i += batchSize) {
        const batch = writeBatch(db);
        userChats.slice(i, i + batchSize).forEach(c => batch.delete(doc(db, 'chat_history', c.id)));
        await batch.commit();
      }
      setChatHistory(prev => prev.filter(c => c.userId !== user.uid));
      showToast("Đã dọn sạch lịch sử của bạn", "success");
    } catch (e) {
      showToast("Lỗi khi dọn dẹp", "error");
    }
  }, [user, chatHistory, showToast]);

  const value = useMemo(() => ({
    messages, setMessages, input, setInput, isLoading, chatHistory, isHistoryLoading,
    isLearning, isSaving, copiedId, isSearchEnabled, setIsSearchEnabled,
    isSimpleMode, setIsSimpleMode, messagesEndRef, inputRef,
    loadChatHistory, deleteChatHistory, clearAllChatHistory, handleSend,
    saveToKnowledge, copyToClipboard, triggerAutoLearning
  }), [
    messages, input, isLoading, chatHistory, isHistoryLoading, isLearning,
    isSaving, copiedId, isSearchEnabled, isSimpleMode
  ]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChatContext must be used within a ChatProvider');
  return context;
};
