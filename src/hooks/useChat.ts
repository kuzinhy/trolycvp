import { useState, useCallback, useRef, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, getDocs, where, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';
import { Message, SYSTEM_INSTRUCTION, Meeting, Task, Event, Birthday } from '../constants';
import { ToastType } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { generateContentWithRetry, generateContentStreamWithRetry } from '../lib/ai-utils';
import { cacheData, getCachedData } from '../lib/cache';

function generateUserTitle(text: string): string | undefined {
  const trimmed = text.trim();
  const isQuestion = trimmed.endsWith('?');
  const isRequest = /^(hãy|làm ơn|giúp tôi|tạo|viết|soạn|tóm tắt|phân tích|tìm)/i.test(trimmed);
  
  if (isQuestion || isRequest) {
    const lines = trimmed.split('\n');
    const firstLine = lines[0];
    if (firstLine.length <= 60) {
      return firstLine;
    } else {
      return firstLine.substring(0, 57) + '...';
    }
  }
  return undefined;
}

function generateAITitle(text: string): string | undefined {
  const trimmed = text.trim();
  const isReportOrSummary = /^(báo cáo|tóm tắt|kết luận|thông báo|kế hoạch|đề xuất)/i.test(trimmed) || trimmed.includes('**Báo cáo') || trimmed.includes('**Tóm tắt');
  
  if (isReportOrSummary || trimmed.startsWith('#') || trimmed.startsWith('**')) {
    const lines = trimmed.split('\n').filter(l => l.trim().length > 0);
    if (lines.length > 0) {
      let firstLine = lines[0].replace(/^[#*\s]+|[#*\s]+$/g, '');
      if (firstLine.length > 60) {
        firstLine = firstLine.substring(0, 57) + '...';
      }
      return firstLine;
    }
  }
  return undefined;
}

export function useChat(
  aiKnowledge: any[], 
  showToast: (message: string, type?: ToastType) => void,
  loadKnowledge: () => void,
  meetings: Meeting[] = [],
  tasks: Task[] = [],
  events: Event[] = [],
  birthdays: Birthday[] = []
) {
  const { user, isAdmin, isSuperAdmin, unitId, userInfo } = useAuth();
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
    
    // Load from cache first for instant UI
    const cacheKey = `chat_history_${user.uid}_${unitId || 'default'}`;
    const cached = await getCachedData('chat_history', cacheKey);
    if (cached) {
      setChatHistory(cached);
    }

    try {
      let q;
      if (isSuperAdmin) {
        q = query(collection(db, 'chat_history'), limit(500));
      } else if (isAdmin) {
        q = query(collection(db, 'chat_history'), where('unitId', '==', unitId || ''), limit(500));
      } else {
        q = query(collection(db, 'chat_history'), where('userId', '==', user.uid), limit(500));
      }

      const snapshot = await getDocs(q);
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      }));
      
      history.sort((a, b) => b.timestamp - a.timestamp);
      
      setChatHistory(history);
      // Update cache
      await cacheData('chat_history', cacheKey, history);
    } catch (e: any) {
      handleFirestoreError(e, OperationType.GET, 'chat_history');
      showToast("Lỗi khi tải lịch sử chat.", "error");
    } finally {
      setIsHistoryLoading(false);
    }
  }, [user, isAdmin, isSuperAdmin, unitId, showToast]);

  useEffect(() => {
    if (user) {
      loadChatHistory();
    }
  }, [user, loadChatHistory]);

  const triggerAutoLearning = useCallback(async (history: Message[], isManual: boolean = false) => {
    if (isLearning || !user) return;
    setIsLearning(true);
    try {
      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: 'user',
            parts: [{
              text: `Dựa trên cuộc hội thoại sau đây, hãy trích xuất những kiến thức, quy định, sở thích hoặc thông tin quan trọng nào cần lưu vào bộ nhớ dài hạn (Knowledge Core) để phục vụ công việc của Bí thư. 
              
              Yêu cầu:
              1. Chỉ trích xuất thông tin thực tế, quy định hoặc dữ liệu quan trọng.
              2. Tóm tắt cực kỳ ngắn gọn (dưới 30 từ mỗi ý).
              3. Nếu không có gì mới hoặc quan trọng, hãy trả về chuỗi "NONE".
              4. Trả về tối đa 2 ý quan trọng nhất.
              
              Cuộc hội thoại:
              ${history.map(m => `${m.role === 'user' ? 'Người dùng' : 'AI'}: ${m.content}`).join('\n')}`
            }]
          }
        ],
      });

      const text = response?.text?.trim();

      if (text && text !== "NONE" && !text.includes("NONE")) {
        const points = text.split('\n').filter(p => p.trim().length > 5);
        const batch = writeBatch(db);
        
        for (const point of points) {
          const content = `[Auto-Learned] ${point.replace(/^[0-9.-]+\s*/, '')}`;
          const docRef = doc(collection(db, "party_documents"));
          batch.set(docRef, {
            content,
            title: content.substring(0, 200),
            summary: content.substring(0, 200),
            category: "Auto-Learned",
            tags: ["auto-learned", "chat-history"],
            isImportant: false,
            isPublic: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            authorUid: user.uid,
            unitId: unitId || 'default_unit',
            type: 'document'
          });
        }
        
        await batch.commit();
        loadKnowledge();
        if (isManual) showToast("AI đã phân tích hội thoại và cập nhật kiến thức thành công!", "success");
      } else if (isManual) {
        showToast("Không tìm thấy thông tin mới nào đáng kể để lưu trữ.", "info");
      }
    } catch (e) {
      console.error("Auto-learning error:", e);
      if (isManual) showToast("Lỗi khi AI phân tích hội thoại.", "error");
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
      content: fileContent ? `${trimmedText}\n\n[Nội dung tệp đính kèm]:\n${fileContent}` : trimmedText,
      timestamp: Date.now(),
      title: generateUserTitle(trimmedText) || (fileContent ? "Phân tích tệp đính kèm" : undefined),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Background logging to Firestore
      if (user) {
        addDoc(collection(db, 'chat_history'), {
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName || user.email?.split('@')[0] || 'Người dùng',
          unitId: unitId || '',
          role: 'user',
          content: userMessage.content,
          timestamp: Date.now()
        }).catch(err => handleFirestoreError(err, OperationType.CREATE, 'chat_history'));
      }

      // Optimize knowledge context: prioritize important items and limit total characters
      const knowledgeArray = Array.isArray(aiKnowledge) ? aiKnowledge : [];
      const sortedKnowledge = [...knowledgeArray].sort((a, b) => (b.isImportant ? 1 : 0) - (a.isImportant ? 1 : 0));
      let currentLength = 0;
      const MAX_KNOWLEDGE_CHARS = 8000;
      const prioritizedKnowledge = [];
      
      for (const k of sortedKnowledge) {
        if (currentLength + (k.content?.length || 0) > MAX_KNOWLEDGE_CHARS) break;
        prioritizedKnowledge.push(k.content);
        currentLength += (k.content?.length || 0);
      }

      const knowledgeContext = prioritizedKnowledge.length > 0 
        ? prioritizedKnowledge.map((content, i) => `${i+1}. ${content}`).join('\n')
        : "Chưa có dữ liệu tri thức đặc thù.";

      const userName = user?.displayName || user?.email?.split('@')[0] || 'Đồng chí';
      const userRole = isAdmin ? (isSuperAdmin ? 'Super Admin' : 'Admin') : 'Người dùng';
      const now = new Date();
      const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

      // Format schedule context
      const scheduleContext = `
THỜI GIAN HIỆN TẠI: ${timeStr}, ${dateStr}

LỊCH CÔNG TÁC & NHIỆM VỤ (DỮ LIỆU THỰC TẾ):
- Cuộc họp/Lịch công tác: ${meetings.length > 0 ? meetings.map(m => `${m.date} ${m.time}: ${m.name} (${m.location})`).join('; ') : 'Không có lịch họp.'}
- Nhiệm vụ: ${tasks.length > 0 ? tasks.map(t => `${t.title} (Hạn: ${t.deadline}, Trạng thái: ${t.status})`).join('; ') : 'Không có nhiệm vụ.'}
- Sự kiện: ${events.length > 0 ? events.map(e => `${e.date}: ${e.name}`).join('; ') : 'Không có sự kiện.'}
- Sinh nhật: ${birthdays.length > 0 ? birthdays.map(b => `${b.date}: ${b.name}`).join('; ') : 'Không có thông tin sinh nhật.'}

LƯU Ý QUAN TRỌNG: 
1. Tuyệt đối chỉ trả lời dựa trên dữ liệu lịch công tác thực tế được cung cấp ở trên. 
2. BỎ QUA mọi thông tin về lịch trình, ngày giờ, sự kiện đã xuất hiện trong các tin nhắn trước đó nếu chúng không có trong dữ liệu thực tế ở trên.
3. Nếu người dùng hỏi về lịch trình mà không có trong dữ liệu này, hãy báo là "Hiện tại không có thông tin chính thức về nội dung này trong hệ thống".
4. Luôn ưu tiên độ chính xác tuyệt đối về thời gian và nội dung.
`;
      
      // Dynamic system instruction based on user context
      let dynamicInstruction = SYSTEM_INSTRUCTION
        .replace('Nguyễn Minh Huy - Chánh Văn Phòng Đảng uỷ', `${userName} - ${userRole}`)
        .replace('Anh Huy', userName);

      if (isSimpleMode) {
        dynamicInstruction += "\n\nCHẾ ĐỘ ĐƠN THUẦN ĐANG BẬT: Hãy trả lời cực kỳ ngắn gọn, đi thẳng vào trọng tâm, không rườm rà, không chào hỏi xã giao không cần thiết. Ưu tiên câu trả lời dưới 3 câu nếu có thể.";
      }

      const responseStream = await generateContentStreamWithRetry({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: 'user',
            parts: [{
              text: `${dynamicInstruction}
              
              ${scheduleContext}
              
              DỮ LIỆU TRI THỨC BỔ TRỢ (KNOWLEDGE BASE):
              ${knowledgeContext}
              
              LỊCH SỬ HỘI THOẠI GẦN ĐÂY:
              ${messages.slice(-15).map(m => `${m.role === 'user' ? 'Người dùng' : 'AI'}: ${m.content}`).join('\n')}
              
              YÊU CẦU HIỆN TẠI TỪ ${userName.toUpperCase()}: ${userMessage.content}`
            }]
          }
        ],
        config: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          tools: isSearchEnabled ? [{ googleSearch: {} }] : undefined,
        }
      });

      let aiText = "";
      const aiMessageId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      setMessages(prev => [...prev, {
        id: aiMessageId,
        role: 'model',
        content: '',
        timestamp: Date.now(),
        title: undefined
      }]);

      for await (const chunk of responseStream) {
        const chunkText = chunk.text || "";
        aiText += chunkText;
        setMessages(prev => prev.map(m => m.id === aiMessageId ? { ...m, content: aiText } : m));
      }
      
      const finalTitle = generateAITitle(aiText);
      setMessages(prev => prev.map(m => m.id === aiMessageId ? { ...m, title: finalTitle } : m));
      
      // Background logging to Firestore
      if (user) {
        addDoc(collection(db, 'chat_history'), {
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName || user.email?.split('@')[0] || 'Người dùng',
          unitId: unitId || '',
          role: 'model',
          content: aiText,
          timestamp: Date.now()
        }).catch(err => handleFirestoreError(err, OperationType.CREATE, 'chat_history'));
      }

      // Tự động lưu thông tin vào bộ nhớ
      triggerAutoLearning([...messages, { id: aiMessageId, role: 'model', content: aiText, timestamp: Date.now() }]);

    } catch (e) {
      console.error("Chat error:", e);
      showToast("Lỗi kết nối với AI", "error");
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, aiKnowledge, messages, user, isAdmin, isSuperAdmin, unitId, isSearchEnabled, isSimpleMode, showToast, meetings, tasks, events, birthdays]);

  const saveToKnowledge = useCallback(async (text: string, tags: string[], index: number) => {
    if (!user) {
      showToast("Bạn cần đăng nhập để lưu tri thức", "error");
      return;
    }
    setIsSaving(index);
    try {
      await addDoc(collection(db, "party_documents"), {
        content: text,
        title: text.substring(0, 200) + (text.length > 200 ? "..." : ""),
        summary: text.substring(0, 200) + (text.length > 200 ? "..." : ""),
        category: "Chat",
        tags: [...tags, "chat-saved"],
        isImportant: false,
        isPublic: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        authorUid: user.uid,
        unitId: unitId || 'default_unit',
        type: 'document'
      });
      
      showToast("Đã lưu vào bộ nhớ tri thức", "success");
      loadKnowledge();
    } catch (e) {
      console.error("Save error:", e);
      showToast("Lỗi khi lưu tri thức", "error");
    } finally {
      setIsSaving(null);
    }
  }, [loadKnowledge, showToast, user, unitId]);

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast("Đã sao chép vào bộ nhớ tạm", "success");
    setTimeout(() => setCopiedId(null), 2000);
  }, [showToast]);

  const deleteChatHistory = useCallback(async (index: number) => {
    try {
      const itemToDelete = chatHistory[index];
      if (!itemToDelete || !itemToDelete.id) {
        showToast("Không tìm thấy ID để xóa", "error");
        return;
      }
      
      await deleteDoc(doc(db, 'chat_history', itemToDelete.id));
      
      setChatHistory(prev => {
        const newHistory = [...prev];
        newHistory.splice(index, 1);
        return newHistory;
      });
      showToast("Đã xóa mục lịch sử hội thoại", "success");
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `chat_history/${chatHistory[index]?.id}`);
      showToast("Lỗi khi xóa lịch sử", "error");
    }
  }, [chatHistory, showToast]);

  const clearAllChatHistory = useCallback(async () => {
    if (!user || chatHistory.length === 0) return;
    try {
      // Only delete the user's own chat history
      const userChats = chatHistory.filter(chat => chat.userId === user.uid);
      if (userChats.length === 0) {
        showToast("Không có lịch sử hội thoại nào của bạn để xóa", "info");
        return;
      }

      const batches = [];
      let currentBatch = writeBatch(db);
      let operationCount = 0;

      for (const chat of userChats) {
        if (!chat.id) continue;
        
        currentBatch.delete(doc(db, 'chat_history', chat.id));
        operationCount++;

        if (operationCount === 500) {
          batches.push(currentBatch.commit());
          currentBatch = writeBatch(db);
          operationCount = 0;
        }
      }

      if (operationCount > 0) {
        batches.push(currentBatch.commit());
      }

      await Promise.all(batches);
      
      // Update state to remove deleted chats
      setChatHistory(prev => prev.filter(chat => chat.userId !== user.uid));
      showToast("Đã xóa toàn bộ lịch sử hội thoại của bạn", "success");
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'chat_history');
      showToast("Lỗi khi xóa toàn bộ lịch sử", "error");
    }
  }, [user, chatHistory, showToast]);

  return {
    messages,
    setMessages,
    input,
    setInput,
    isLoading,
    chatHistory,
    isHistoryLoading,
    isLearning,
    isSaving,
    copiedId,
    isSearchEnabled,
    setIsSearchEnabled,
    isSimpleMode,
    setIsSimpleMode,
    messagesEndRef,
    inputRef,
    loadChatHistory,
    deleteChatHistory,
    clearAllChatHistory,
    handleSend,
    saveToKnowledge,
    copyToClipboard,
    triggerAutoLearning
  };
}
