import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query, where, onSnapshot, writeBatch, getDocs, or } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';
import { generateEmbedding } from '../services/embeddingService';
import { logActivity } from '../lib/logService';
import { cacheData, getCachedData } from '../lib/cache';
import { generateContentWithRetry } from '../lib/ai-utils';
import { ToastType } from '../components/ui/Toast';
import { useToast } from '../hooks/useToast';

const MOCK_KNOWLEDGE: any[] = [
  {
    id: 'mock-k-1',
    title: 'Hướng dẫn nghiệp vụ Đảng viên',
    content: 'Hướng dẫn chi tiết về quy trình kết nạp Đảng viên mới, chuyển Đảng chính thức và quản lý hồ sơ Đảng viên.',
    summary: 'Hướng dẫn quy trình kết nạp và quản lý Đảng viên.',
    category: 'Quy định - Hướng dẫn',
    tags: ['dang vien', 'nghiep vu', 'huong dan'],
    isImportant: true,
    isPublic: true,
    createdAt: { toMillis: () => Date.now() },
    order: 0
  },
  {
    id: 'mock-k-2',
    title: 'Nghị quyết Đại hội Đảng bộ nhiệm kỳ 2020-2025',
    content: 'Nghị quyết xác định các mục tiêu phát triển kinh tế - xã hội, xây dựng Đảng và hệ thống chính trị trong nhiệm kỳ.',
    summary: 'Mục tiêu phát triển nhiệm kỳ 2020-2025.',
    category: 'Nghị quyết - Chỉ thị',
    tags: ['nghi quyet', 'dai hoi', 'nhiem ky'],
    isImportant: true,
    isPublic: true,
    createdAt: { toMillis: () => Date.now() },
    order: 1
  }
];

interface KnowledgeContextType {
  aiKnowledge: any[];
  pendingKnowledge: any[];
  isMemoryLoading: boolean;
  isPendingLoading: boolean;
  isUpdating: boolean;
  updateProgress: string;
  isDeleting: string | null;
  editingIndex: number | null;
  isAddingManual: boolean;
  isLearning: boolean;
  isSummarizing: boolean;
  summarizedContent: string | null;
  searchQuery: string;
  filterCategory: string;
  setSearchQuery: (val: string) => void;
  setFilterCategory: (val: string) => void;
  setEditingIndex: (idx: number | null) => void;
  setIsAddingManual: (val: boolean) => void;
  setSummarizedContent: (val: string | null) => void;
  loadKnowledge: () => void;
  addManualKnowledge: (category: string, title: string, content: string, tags: string[], pendingId?: string) => Promise<void>;
  updateKnowledge: (id: string, data: any) => Promise<void>;
  deleteKnowledge: (id: string) => Promise<void>;
  handleReorderKnowledge: (newOrder: any[]) => Promise<void>;
  smartLearnFromText: (text: string, tagsHint?: string[]) => Promise<void>;
  learnFromFile: (file: File) => Promise<void>;
  smartSummarizeKnowledge: (category?: string) => Promise<void>;
  deleteAllKnowledge: () => Promise<void>;
  syncUnifiedStrategicKnowledge: () => Promise<void>;
  auditAndOptimizeKnowledge: () => Promise<{ optimizedCount: number; issuesFound: number }>;
  
  // AI Review
  pendingAIItems: any[];
  isReviewingAI: boolean;
  setIsReviewingAI: (val: boolean) => void;
  confirmAIItems: (items: any[]) => Promise<void>;
  discardAIItems: () => void;
  
  // Form states moved to context for convenience but could be kept local if preferred
  formState: any; 
  setFormState: React.Dispatch<React.SetStateAction<any>>;
}

const KnowledgeContext = createContext<KnowledgeContextType | undefined>(undefined);

export const KnowledgeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, unitId, isSuperAdmin, isAdmin } = useAuth();
  const { showToast } = useToast();
  
  const [aiKnowledge, setAiKnowledge] = useState<any[]>([]);
  const [pendingKnowledge, setPendingKnowledge] = useState<any[]>([]);
  const [isMemoryLoading, setIsMemoryLoading] = useState(false);
  const [isPendingLoading, setIsPendingLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('Tất cả');
  const [updateProgress, setUpdateProgress] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [isLearning, setIsLearning] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summarizedContent, setSummarizedContent] = useState<string | null>(null);
  const [isSyncingUnified, setIsSyncingUnified] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [pendingAIItems, setPendingAIItems] = useState<any[]>([]);
  const [isReviewingAI, setIsReviewingAI] = useState(false);

  const [formState, setFormState] = useState({
    manualValue: '',
    manualTags: '',
    manualTitle: '',
    manualDocNumber: '',
    manualIssueDate: '',
    manualSigner: '',
    manualStaffMember: '',
    manualPermissionLevel: 'public',
    manualVersion: '1.0',
    manualReviewStatus: 'published',
    manualPriority: 'medium',
    manualDeadline: '',
    manualStatus: 'Pending',
    isManualPublic: true,
    isManualImportant: false,
    editValue: '',
    editTags: '',
    editCategory: undefined,
    editIsImportant: undefined,
    editIsPublic: undefined,
    editTitle: '',
    editSummary: '',
    editDocNumber: '',
    editIssueDate: '',
    editSigner: '',
    editStaffMember: '',
    editPermissionLevel: 'public',
    editVersion: '',
    editReviewStatus: 'published',
    editReviewNotes: '',
    editPriority: 'medium',
    editDeadline: '',
    editStatus: 'Pending',
  });

  const loadKnowledge = useCallback(() => {
    const currentUnitId = unitId || (isSuperAdmin ? 'default_unit' : null);
    if (!user || !currentUnitId) return;

    setIsMemoryLoading(true);
    const cacheKey = `knowledge_${currentUnitId}`;

    const q = query(
      collection(db, 'party_documents'),
      where('unitId', 'in', [currentUnitId, 'all'])
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      items.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      const finalItems = items.length > 0 ? items : MOCK_KNOWLEDGE;
      
      setAiKnowledge(finalItems);
      setIsMemoryLoading(false);
      cacheData('knowledge', cacheKey, finalItems);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'knowledge');
      setIsMemoryLoading(false);
    });

    return unsub;
  }, [user, unitId, isSuperAdmin]);

  useEffect(() => {
    const unsub = loadKnowledge();
    return () => { if (unsub) unsub(); };
  }, [loadKnowledge]);

  const processAndSaveKnowledge = useCallback(async (content: string, tags: string[] = [], category: string = 'Khác') => {
    const currentUnitId = unitId || (isSuperAdmin ? 'default_unit' : null);
    if (!user || !currentUnitId) return false;

    try {
      const embedding = await generateEmbedding(content);
      const title = content.split('\n')[0].substring(0, 100) || 'Tài liệu mới';
      
      const docData = {
        title,
        content,
        summary: content.substring(0, 200) + '...',
        category,
        tags,
        embedding,
        unitId: currentUnitId,
        authorUid: user.uid,
        authorName: user.displayName || user.email,
        isImportant: false,
        isPublic: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        order: aiKnowledge.length,
        version: "1.0",
        reviewStatus: "published",
        type: 'document'
      };

      await addDoc(collection(db, 'party_documents'), docData);
      logActivity({
        userId: user.uid,
        userEmail: user.email || '',
        action: 'knowledge_add',
        details: `Đã tự động học tri thức: ${title}`,
        type: 'success',
        module: 'knowledge'
      });
      return true;
    } catch (error) {
      console.error("Error processing knowledge:", error);
      return false;
    }
  }, [user, unitId, isSuperAdmin, aiKnowledge.length]);

  const addManualKnowledge = useCallback(async (category: string, title: string, content: string, tags: string[], pendingId?: string) => {
    const currentUnitId = unitId || (isSuperAdmin ? 'default_unit' : null);
    if (!user || !currentUnitId) return;

    setIsUpdating(true);
    try {
      const embedding = await generateEmbedding(content);
      const docData = {
        title: title || content.split('\n')[0].substring(0, 100) || 'Tài liệu mới',
        content,
        summary: content.substring(0, 200) + '...',
        category,
        tags,
        embedding,
        unitId: currentUnitId,
        authorUid: user.uid,
        authorName: user.displayName || user.email,
        isImportant: formState.isManualImportant,
        isPublic: formState.isManualPublic,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        order: aiKnowledge.length,
        version: formState.manualVersion || "1.0",
        reviewStatus: formState.manualReviewStatus || "published",
        priority: formState.manualPriority || 'medium',
        deadline: formState.manualDeadline || '',
        status: formState.manualStatus || 'Pending',
        type: 'document'
      };

      await addDoc(collection(db, 'party_documents'), docData);
      if (pendingId) await deleteDoc(doc(db, 'pending_knowledge', pendingId));

      showToast("Đã thêm tri thức mới thành công", "success");
      setIsAddingManual(false);
      setFormState(prev => ({
        ...prev,
        manualValue: '', manualTags: '', manualTitle: '',
        manualDocNumber: '', manualIssueDate: '', manualSigner: '', manualStaffMember: '',
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'party_documents');
      showToast("Lỗi khi thêm tri thức", "error");
    } finally {
      setIsUpdating(false);
    }
  }, [user, unitId, isSuperAdmin, aiKnowledge.length, formState, showToast]);

  const updateKnowledge = useCallback(async (id: string, data: any) => {
    if (!user) return;
    setIsUpdating(true);
    try {
      let updateData = { ...data, updatedAt: serverTimestamp() };
      const currentItem = aiKnowledge.find(k => k.id === id);
      if (currentItem && currentItem.content !== data.content) {
        updateData.embedding = await generateEmbedding(data.content);
      }

      await updateDoc(doc(db, 'party_documents', id), updateData);
      showToast("Đã cập nhật tri thức thành công", "success");
      setEditingIndex(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `party_documents/${id}`);
      showToast("Lỗi khi cập nhật tri thức", "error");
    } finally {
      setIsUpdating(false);
    }
  }, [user, aiKnowledge, showToast]);

  const deleteKnowledge = useCallback(async (id: string) => {
    if (!user) return;
    setIsDeleting(id);
    try {
      await deleteDoc(doc(db, 'party_documents', id));
      showToast("Đã xóa tri thức thành công", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `party_documents/${id}`);
      showToast("Lỗi khi xóa tri thức", "error");
    } finally {
      setIsDeleting(null);
    }
  }, [user, showToast]);

  const handleReorderKnowledge = useCallback(async (newOrder: any[]) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      newOrder.forEach((item, index) => {
        if (item.id) batch.update(doc(db, 'party_documents', item.id), { order: index });
      });
      await batch.commit();
      setAiKnowledge(newOrder);
    } catch (error) {
      showToast("Lỗi khi sắp xếp tri thức", "error");
    }
  }, [user, showToast]);

  const smartLearnFromText = useCallback(async (text: string, tagsHint: string[] = []) => {
    if (!text || text.length < 10) return;
    setIsLearning(true);
    try {
      const success = await processAndSaveKnowledge(text, tagsHint);
      if (success) showToast("Đã học tri thức mới thành công", "success");
      else showToast("Lỗi khi học tri thức mới", "error");
    } finally {
      setIsLearning(false);
    }
  }, [processAndSaveKnowledge, showToast]);

  const learnFromFile = useCallback(async (file: File) => {
    if (!user) return;
    setIsLearning(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/parse-document', { method: 'POST', body: formData });
      if (!response.ok) throw new Error("Lỗi khi phân tích tài liệu");
      const data = await response.json();
      if (data.text) {
        await processAndSaveKnowledge(data.text, ['file-upload'], 'Tài liệu tải lên');
        showToast("Đã học tri thức từ tệp thành công", "success");
      } else throw new Error("Không tìm thấy văn bản trong tệp");
    } catch (error) {
      showToast("Lỗi khi học từ tệp", "error");
    } finally {
      setIsLearning(false);
    }
  }, [user, processAndSaveKnowledge, showToast]);

  const smartSummarizeKnowledge = useCallback(async (category?: string) => {
    if (isSummarizing || !user) return;
    setIsSummarizing(true);
    try {
      const itemsToSummarize = category && category !== 'Tất cả' 
        ? aiKnowledge.filter(k => k.category === category)
        : aiKnowledge.slice(0, 20);

      if (itemsToSummarize.length === 0) {
        showToast("Không có kiến thức nào để tóm tắt.", "info");
        return;
      }

      const content = itemsToSummarize.map(k => `Tiêu đề: ${k.title}\nNội dung: ${k.content}`).join('\n\n');
      const prompt = `Hãy tóm tắt các kiến thức sau đây một cách súc tích, chuyên nghiệp bằng tiếng Việt:\n\n${content}`;
      const response = await generateContentWithRetry({
        model: "gemini-1.5-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || response?.text || "";
      setSummarizedContent(text || '');
      showToast("Đã tóm tắt kiến thức thành công.", "success");
    } catch (error) {
      showToast("Lỗi khi tóm tắt kiến thức.", "error");
    } finally {
      setIsSummarizing(false);
    }
  }, [isSummarizing, user, aiKnowledge, showToast]);

  const deleteAllKnowledge = useCallback(async () => {
    const currentUnitId = unitId || (isSuperAdmin ? 'default_unit' : null);
    if (!user || !currentUnitId) return;
    if (!window.confirm("Bạn có chắc chắn muốn xóa TOÀN BỘ tri thức?")) return;

    setAiKnowledge([]);
    try {
      const q = query(collection(db, 'party_documents'), where('unitId', '==', currentUnitId));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      showToast("Đã xóa toàn bộ tri thức thành công", "success");
    } catch (error) {
      showToast("Lỗi khi xóa toàn bộ tri thức", "error");
    }
  }, [user, unitId, isSuperAdmin, showToast]);

  const syncUnifiedStrategicKnowledge = useCallback(async () => {
    const currentUnitId = unitId || (isSuperAdmin ? 'default_unit' : null);
    if (!user || !currentUnitId || isSyncingUnified) return;
    
    setIsSyncingUnified(true);
    showToast("Đang kết nối với Bộ não chiến lược...", "info");

    try {
      const response = await fetch('/api/second-brain/sync');
      const result = await response.json();
      const dataArray = Array.isArray(result) ? result : (result.success ? result.data : null);
      
      if (dataArray) {
        let addedCount = 0;
        for (const item of dataArray) {
          const content = item.content || item.text || "";
          if (content.length < 20) continue;
          const isDuplicate = aiKnowledge.some(k => k.title === (item.title || item.name));
          if (!isDuplicate) {
            const success = await processAndSaveKnowledge(content, ["unified-sync"], "Remote Knowledge");
            if (success) addedCount++;
          }
        }
        showToast(addedCount > 0 ? `Đã thu hoạch ${addedCount} mục mới.` : "Không có tri thức mới.", "success");
      }
    } catch (error) {
      showToast("Lỗi đồng bộ Brain.", "error");
    } finally {
      setIsSyncingUnified(false);
    }
  }, [user, unitId, isSuperAdmin, isSyncingUnified, aiKnowledge, processAndSaveKnowledge, showToast]);

  const discardAIItems = useCallback(() => {
    setPendingAIItems([]);
    setIsReviewingAI(false);
  }, []);

  const confirmAIItems = useCallback(async (items: any[]) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      for (const item of items) {
        const docRef = doc(collection(db, 'party_documents'));
        batch.set(docRef, {
          ...item,
          unitId: unitId || 'all',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          authorUid: user.uid
        });
      }
      await batch.commit();
      showToast(`Đã lưu ${items.length} mục kiến thức mới.`, "success");
      discardAIItems();
      loadKnowledge();
    } catch (e) {
      showToast("Lỗi khi lưu kiến thức từ AI.", "error");
    }
  }, [user, unitId, discardAIItems, loadKnowledge, showToast]);
  const auditAndOptimizeKnowledge = useCallback(async () => {
    setIsAuditing(true);
    try {
      const itemsToAudit = aiKnowledge.filter(k => !k.embedding);
      if (itemsToAudit.length === 0) return { optimizedCount: 0, issuesFound: 0 };
      
      let optimizedCount = 0;
      for (const item of itemsToAudit) {
        const embedding = await generateEmbedding(item.content);
        await updateDoc(doc(db, 'party_documents', item.id), { embedding });
        optimizedCount++;
      }
      return { optimizedCount, issuesFound: itemsToAudit.length };
    } finally {
      setIsAuditing(false);
    }
  }, [aiKnowledge]);

  const value = useMemo(() => ({
    aiKnowledge, pendingKnowledge, isMemoryLoading, isPendingLoading,
    isUpdating, updateProgress, isDeleting, editingIndex,
    isAddingManual, isLearning, isSummarizing, summarizedContent,
    searchQuery, filterCategory,
    setSearchQuery, setFilterCategory, setEditingIndex,
    setIsAddingManual, setSummarizedContent,
    loadKnowledge, addManualKnowledge, updateKnowledge, deleteKnowledge,
    handleReorderKnowledge, smartLearnFromText, learnFromFile,
    smartSummarizeKnowledge, deleteAllKnowledge, syncUnifiedStrategicKnowledge,
    auditAndOptimizeKnowledge,
    pendingAIItems, isReviewingAI, setIsReviewingAI, confirmAIItems, discardAIItems,
    formState, setFormState
  }), [
    aiKnowledge, pendingKnowledge, isMemoryLoading, isPendingLoading,
    isUpdating, updateProgress, isDeleting, editingIndex,
    isAddingManual, isLearning, isSummarizing, summarizedContent,
    searchQuery, filterCategory,
    loadKnowledge, addManualKnowledge, updateKnowledge, deleteKnowledge,
    handleReorderKnowledge, smartLearnFromText, learnFromFile,
    smartSummarizeKnowledge, deleteAllKnowledge, syncUnifiedStrategicKnowledge,
    auditAndOptimizeKnowledge,
    pendingAIItems, isReviewingAI, confirmAIItems, discardAIItems,
    formState
  ]);

  return <KnowledgeContext.Provider value={value}>{children}</KnowledgeContext.Provider>;
};

export const useKnowledgeContext = () => {
  const context = useContext(KnowledgeContext);
  if (!context) throw new Error('useKnowledgeContext must be used within a KnowledgeProvider');
  return context;
};
