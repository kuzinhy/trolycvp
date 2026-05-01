import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, getDocs, where, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';
import { Message, SYSTEM_INSTRUCTION } from '../constants';
import { useAuth } from '../context/AuthContext';
import { generateEmbedding, cosineSimilarity } from '../services/embeddingService';
import { generateContentWithRetry, generateContentStreamWithRetry } from '../lib/ai-utils';
import { cacheData, getCachedData } from '../lib/cache';
import { useToast } from '../hooks/useToast';
import { useKnowledgeContext } from './KnowledgeContext';

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
        model: "gemini-3-flash-preview",
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
      console.error("Auto-learning error:", err);
    } finally {
      setIsLearning(false);
    }
  }, [isLearning, loadKnowledge, showToast, user, unitId]);

  const handleSend = useCallback(async (textInput?: string | React.MouseEvent | React.KeyboardEvent, fileContent?: string) => {
    const text = typeof textInput === 'string' ? textInput : input;
    if ((!text || !text.trim()) && !fileContent && isLoading) return;

    const trimmedText = text.trim();
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: fileContent ? `${trimmedText}\n\n[FILE]:\n${fileContent}` : trimmedText,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      if (user) {
        addDoc(collection(db, 'chat_history'), {
          userId: user.uid, email: user.email, unitId: unitId || 'all',
          role: 'user', content: userMessage.content, timestamp: Date.now()
        });
      }

      // Semantic retrieval of knowledge
      let relevantKnowledge = aiKnowledge.slice(0, 5); // Fallback
      try {
        if (aiKnowledge.length > 0) {
          const inputEmbedding = await generateEmbedding(trimmedText);
          const scoredKnowledge = aiKnowledge
            .filter(k => k.embedding && Array.isArray(k.embedding))
            .map(k => ({
              ...k,
              similarity: cosineSimilarity(inputEmbedding, k.embedding)
            }))
            .sort((a, b) => b.similarity - a.similarity);
          
          if (scoredKnowledge.length > 0) {
            // Pick items with similarity > 0.6 or just top 5
            relevantKnowledge = scoredKnowledge.slice(0, 7);
          }
        }
      } catch (embErr) {
        console.warn("Retreival error:", embErr);
      }

      const knowledgeContext = relevantKnowledge.map((k, i) => `${i+1}. [${k.category || 'Chung'}]: ${k.content}`).join('\n');
      const userName = user?.displayName || 'Đồng chí';
      const instruction = SYSTEM_INSTRUCTION.replace(/Anh Huy/g, userName);

      const responseStream = await generateContentStreamWithRetry({
        model: "gemini-3-flash-preview",
        contents: [{
          role: 'user',
          parts: [{ text: `${instruction}\n\nKNOWLEDGE:\n${knowledgeContext}\n\nHISTORY:\n${messages.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}\n\nUSER: ${userMessage.content}` }]
        }],
        config: { temperature: 0.7, tools: isSearchEnabled ? [{ googleSearch: {} }] : undefined }
      });

      let aiText = "";
      const aiMessageId = `ai-${Date.now()}`;
      setMessages(prev => [...prev, { id: aiMessageId, role: 'model', content: '', timestamp: Date.now() }]);

      for await (const chunk of responseStream) {
        aiText += chunk.text || "";
        setMessages(prev => prev.map(m => m.id === aiMessageId ? { ...m, content: aiText } : m));
      }

      if (user) {
        addDoc(collection(db, 'chat_history'), {
          userId: user.uid, email: user.email, unitId: unitId || 'all',
          role: 'model', content: aiText, timestamp: Date.now()
        });
      }
      triggerAutoLearning([...messages, userMessage, { id: aiMessageId, role: 'model', content: aiText, timestamp: Date.now() }]);
    } catch (e) {
      showToast("Lỗi kết nối AI", "error");
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, aiKnowledge, messages, user, unitId, isSearchEnabled, showToast, triggerAutoLearning]);

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
