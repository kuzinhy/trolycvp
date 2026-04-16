import { useState, useCallback, useEffect, useMemo } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ToastType } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc, setDoc, doc, updateDoc, deleteDoc, Timestamp, serverTimestamp, query, where, onSnapshot, or, and, orderBy, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';
import { SECOND_BRAIN_URL } from '../constants';
import { generateEmbedding, cosineSimilarity } from '../services/embeddingService';
import { generateContentWithRetry } from '../lib/ai-utils';
import { logActivity } from '../lib/logService';

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

export function useKnowledge(showToast: (message: string, type?: ToastType) => void, setHasUnsavedChanges?: (val: boolean) => void) {
  const { user, unitId, isSuperAdmin, isAdmin } = useAuth();
  
  // Consolidated state for knowledge data
  const [knowledgeState, setKnowledgeState] = useState({
    aiKnowledge: [] as any[],
    pendingKnowledge: [] as any[],
    isMemoryLoading: false,
    isPendingLoading: false,
    searchQuery: '',
    filterCategory: 'Tất cả',
  });

  // UI state
  const [uiState, setUiState] = useState({
    isUpdating: false,
    updateProgress: '',
    isDeleting: null as string | null,
    editingIndex: null as number | null,
    isAddingManual: false,
    isLearning: false,
    isSuggestingTags: false,
    isRemovingDuplicates: false,
    isAuditing: false,
    isDeletingAll: false,
    isSyncingRemote: false,
    isSyncingOneNote: false,
    isSyncingUnified: false,
    isSummarizing: false,
  });

  const [summarizedContent, setSummarizedContent] = useState<string | null>(null);

  const [formState, setFormState] = useState({
    manualValue: '',
    manualTags: '',
    manualTitle: '',
    manualDocNumber: '',
    manualIssueDate: '',
    manualSigner: '',
    manualStaffMember: '',
    manualPermissionLevel: 'public' as 'public' | 'private',
    manualVersion: '1.0',
    manualReviewStatus: 'draft' as 'draft' | 'in_review' | 'approved' | 'published',
    manualReviewNotes: '',
    manualPriority: 'medium' as 'low' | 'medium' | 'high',
    manualDeadline: '',
    manualStatus: 'Pending' as 'Pending' | 'In Progress' | 'Completed',
    isManualPublic: true,
    isManualImportant: false,
    editValue: '',
    editTags: '',
    editCategory: undefined as string | undefined,
    editIsImportant: undefined as boolean | undefined,
    editIsPublic: undefined as boolean | undefined,
    editTitle: '',
    editSummary: '',
    editDocNumber: '',
    editIssueDate: '',
    editSigner: '',
    editStaffMember: '',
    editPermissionLevel: 'public' as 'public' | 'private',
    editVersion: '',
    editReviewStatus: 'draft' as 'draft' | 'in_review' | 'approved' | 'published',
    editReviewNotes: '',
    editPriority: 'medium' as 'low' | 'medium' | 'high',
    editDeadline: '',
    editStatus: 'Pending' as 'Pending' | 'In Progress' | 'Completed',
  });

  const [pendingAIItems, setPendingAIItems] = useState<any[]>([]);
  const [isReviewingAI, setIsReviewingAI] = useState(false);

  // Define functions before useEffects to avoid TDZ
  
  const processAndSaveKnowledge = useCallback(async (content: string, tags: string[] = [], category: string = 'Khác') => {
    const currentUnitId = unitId || (isSuperAdmin ? 'default_unit' : null);
    if (!user || !currentUnitId) return false;

    try {
      const embedding = await generateEmbedding(content);
      
      const docData = {
        title: content.split('\n')[0].substring(0, 100) || 'Tài liệu mới',
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
        order: knowledgeState.aiKnowledge.length,
        version: "1.0",
        reviewStatus: "published",
        type: 'document'
      };

      await addDoc(collection(db, 'party_documents'), docData);
      logActivity({
        userId: user.uid,
        userEmail: user.email || '',
        action: 'knowledge_add',
        details: `Đã thêm tri thức mới từ nguồn tự động: ${docData.title}`,
        type: 'success',
        module: 'knowledge'
      });
      return true;
    } catch (error) {
      console.error("Error processing knowledge:", error);
      return false;
    }
  }, [user, unitId, isSuperAdmin, knowledgeState.aiKnowledge.length]);

  const syncUnifiedStrategicKnowledge = useCallback(async () => {
    const currentUnitId = unitId || (isSuperAdmin ? 'default_unit' : null);
    if (!user || !currentUnitId || uiState.isSyncingUnified) return;
    
    setUiState(prev => ({ ...prev, isSyncingUnified: true }));
    showToast("Đang kết nối với Bộ não chiến lược (Apps Script)...", "info");

    try {
      const response = await fetch('/api/second-brain/sync');
      if (!response.ok) throw new Error("Không thể kết nối với máy chủ Apps Script");
      
      const result = await response.json();
      
      const dataArray = Array.isArray(result) ? result : (result.success && Array.isArray(result.data) ? result.data : null);
      
      if (dataArray) {
        let addedCount = 0;
        const totalItems = dataArray.length;
        
        for (let i = 0; i < totalItems; i++) {
          const item = dataArray[i];
          const content = item.content || item.text || "";
          
          if (!content || content.length < 20) continue;

          const isDuplicate = knowledgeState.aiKnowledge.some(k => 
            (k.title && (k.title === (item.title || item.name))) || 
            (k.content && k.content.substring(0, 100) === content.substring(0, 100))
          );

          if (!isDuplicate) {
            setUiState(prev => ({ ...prev, updateProgress: `Đang phân tích tài liệu ${i + 1}/${totalItems}: ${item.title || item.name || 'Không tên'}` }));
            const success = await processAndSaveKnowledge(
              content, 
              ["unified-sync", item.type || "remote"], 
              "Remote Knowledge"
            );
            if (success) addedCount++;
          }
        }

        if (addedCount > 0) {
          showToast(`Đã thu hoạch thành công ${addedCount} mục tri thức mới.`, "success");
        } else {
          showToast("Không tìm thấy tri thức mới nào để cập nhật.", "info");
        }
      } else {
        throw new Error(result.error || "Dữ liệu trả về không đúng định dạng");
      }

    } catch (error: any) {
      console.error("Unified sync error:", error);
      showToast(`Lỗi đồng bộ Apps Script: ${error.message}`, "error");
    } finally {
      setUiState(prev => ({ ...prev, isSyncingUnified: false, updateProgress: '' }));
    }
  }, [user, unitId, isSuperAdmin, uiState.isSyncingUnified, knowledgeState.aiKnowledge, processAndSaveKnowledge, showToast]);

  const loadKnowledge = useCallback(() => {
    const currentUnitId = unitId || (isSuperAdmin ? 'default_unit' : null);
    if (!user || !currentUnitId) return;

    setKnowledgeState(prev => ({ ...prev, isMemoryLoading: true }));
    
    const q = query(
      collection(db, 'party_documents'),
      where('unitId', '==', currentUnitId)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      items.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      setKnowledgeState(prev => ({ 
        ...prev, 
        aiKnowledge: items.length > 0 ? items : MOCK_KNOWLEDGE,
        isMemoryLoading: false 
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'knowledge');
      setKnowledgeState(prev => ({ ...prev, isMemoryLoading: false }));
    });

    return unsub;
  }, [user, unitId, isSuperAdmin]);

  const smartSummarizeKnowledge = useCallback(async (category?: string) => {
    if (uiState.isSummarizing || !user) return;
    setUiState(prev => ({ ...prev, isSummarizing: true }));
    try {
      const itemsToSummarize = category && category !== 'Tất cả' 
        ? knowledgeState.aiKnowledge.filter(k => k.category === category)
        : knowledgeState.aiKnowledge.slice(0, 20);

      if (itemsToSummarize.length === 0) {
        showToast("Không có kiến thức nào để tóm tắt.", "info");
        return;
      }

      const content = itemsToSummarize.map(k => `Tiêu đề: ${k.title}\nNội dung: ${k.content}`).join('\n\n');
      const prompt = `Hãy tóm tắt các kiến thức sau đây một cách súc tích, chuyên nghiệp:\n\n${content}`;
      
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      setSummarizedContent(response.text || '');
      showToast("Đã tóm tắt kiến thức thành công.", "success");
    } catch (error) {
      console.error("Error summarizing knowledge:", error);
      showToast("Lỗi khi tóm tắt kiến thức.", "error");
    } finally {
      setUiState(prev => ({ ...prev, isSummarizing: false }));
    }
  }, [uiState.isSummarizing, user, knowledgeState.aiKnowledge, showToast]);

  const smartLearnFromText = useCallback(async (text: string, tagsHint: string[] = [], isManual: boolean = false) => {
    if (!text || text.length < 10) return;
    setUiState(prev => ({ ...prev, isLearning: true }));
    try {
      const success = await processAndSaveKnowledge(text, tagsHint);
      if (success) {
        showToast("Đã học tri thức mới thành công", "success");
      } else {
        showToast("Lỗi khi học tri thức mới", "error");
      }
    } finally {
      setUiState(prev => ({ ...prev, isLearning: false }));
    }
  }, [processAndSaveKnowledge, showToast]);

  // Effects
  useEffect(() => {
    const unsub = loadKnowledge();
    return () => { if (unsub) unsub(); };
  }, [loadKnowledge]);

  // Other functions (placeholders or simplified for brevity)
  const addManualKnowledge = useCallback(async (category: string, title: string, content: string, tags: string[], pendingId?: string) => {
    const currentUnitId = unitId || (isSuperAdmin ? 'default_unit' : null);
    if (!user || !currentUnitId) return;

    setUiState(prev => ({ ...prev, isUpdating: true }));
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
        order: knowledgeState.aiKnowledge.length,
        version: formState.manualVersion || "1.0",
        reviewStatus: formState.manualReviewStatus || "published",
        priority: formState.manualPriority || 'medium',
        deadline: formState.manualDeadline || '',
        status: formState.manualStatus || 'Pending',
        type: 'document'
      };

      await addDoc(collection(db, 'party_documents'), docData);
      
      if (pendingId) {
        await deleteDoc(doc(db, 'pending_knowledge', pendingId));
      }

      showToast("Đã thêm tri thức mới thành công", "success");
      setUiState(prev => ({ ...prev, isAddingManual: false }));
      
      // Reset form
      setFormState(prev => ({
        ...prev,
        manualValue: '',
        manualTags: '',
        manualTitle: '',
        manualDocNumber: '',
        manualIssueDate: '',
        manualSigner: '',
        manualStaffMember: '',
      }));
    } catch (error) {
      console.error("Error adding manual knowledge:", error);
      showToast("Lỗi khi thêm tri thức", "error");
    } finally {
      setUiState(prev => ({ ...prev, isUpdating: false }));
    }
  }, [user, unitId, isSuperAdmin, knowledgeState.aiKnowledge.length, formState, showToast]);

  const updateKnowledge = useCallback(async (id: string, data: any) => {
    if (!user) return;
    setUiState(prev => ({ ...prev, isUpdating: true }));
    try {
      let updateData = { ...data, updatedAt: serverTimestamp() };
      
      // Re-generate embedding if content changed
      const currentItem = knowledgeState.aiKnowledge.find(k => k.id === id);
      if (currentItem && currentItem.content !== data.content) {
        const embedding = await generateEmbedding(data.content);
        updateData.embedding = embedding;
      }

      await updateDoc(doc(db, 'party_documents', id), updateData);
      showToast("Đã cập nhật tri thức thành công", "success");
      setUiState(prev => ({ ...prev, editingIndex: null }));
    } catch (error) {
      console.error("Error updating knowledge:", error);
      showToast("Lỗi khi cập nhật tri thức", "error");
    } finally {
      setUiState(prev => ({ ...prev, isUpdating: false }));
    }
  }, [user, knowledgeState.aiKnowledge, showToast]);

  const deleteKnowledge = useCallback(async (id: string) => {
    if (!user) return;
    setUiState(prev => ({ ...prev, isDeleting: id }));
    try {
      await deleteDoc(doc(db, 'party_documents', id));
      showToast("Đã xóa tri thức thành công", "success");
    } catch (error) {
      console.error("Error deleting knowledge:", error);
      showToast("Lỗi khi xóa tri thức", "error");
    } finally {
      setUiState(prev => ({ ...prev, isDeleting: null }));
    }
  }, [user, showToast]);

  const handleReorderKnowledge = useCallback(async (newOrder: any[]) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      newOrder.forEach((item, index) => {
        if (item.id) {
          batch.update(doc(db, 'party_documents', item.id), { order: index });
        }
      });
      await batch.commit();
      setKnowledgeState(prev => ({ ...prev, aiKnowledge: newOrder }));
    } catch (error) {
      console.error("Error reordering knowledge:", error);
      showToast("Lỗi khi sắp xếp tri thức", "error");
    }
  }, [user, showToast]);

  const learnFromFile = useCallback(async (file: File) => {
    if (!user) return;
    setUiState(prev => ({ ...prev, isLearning: true }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/parse-document', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error("Lỗi khi phân tích tài liệu");
      
      const data = await response.json();
      if (data.text) {
        await processAndSaveKnowledge(data.text, ['file-upload'], 'Tài liệu tải lên');
        showToast("Đã học tri thức từ tệp thành công", "success");
      } else {
        throw new Error("Không tìm thấy văn bản trong tệp");
      }
    } catch (error) {
      console.error("Error learning from file:", error);
      showToast("Lỗi khi học từ tệp", "error");
    } finally {
      setUiState(prev => ({ ...prev, isLearning: false }));
    }
  }, [user, processAndSaveKnowledge, showToast]);

  const suggestTagsForContent = useCallback(async () => {}, []);
  const removeDuplicates = useCallback(async () => {}, []);

  const deleteAllKnowledge = useCallback(async () => {
    const currentUnitId = unitId || (isSuperAdmin ? 'default_unit' : null);
    if (!user || !currentUnitId) return;
    
    if (!window.confirm("Bạn có chắc chắn muốn xóa TOÀN BỘ tri thức? Hành động này không thể hoàn tác.")) return;

    setUiState(prev => ({ ...prev, isDeletingAll: true }));
    try {
      const q = query(collection(db, 'party_documents'), where('unitId', '==', currentUnitId));
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach((document) => {
        batch.delete(document.ref);
      });
      
      await batch.commit();
      showToast("Đã xóa toàn bộ tri thức thành công", "success");
    } catch (error) {
      console.error("Error deleting all knowledge:", error);
      showToast("Lỗi khi xóa toàn bộ tri thức", "error");
    } finally {
      setUiState(prev => ({ ...prev, isDeletingAll: false }));
    }
  }, [user, unitId, isSuperAdmin, showToast]);
  const syncRemoteKnowledge = useCallback(async () => {}, []);
  const syncOneNote = useCallback(async () => {}, []);
  
  const auditAndOptimizeKnowledge = useCallback(async () => {
    if (!user) return { optimizedCount: 0, issuesFound: 0 };
    setUiState(prev => ({ ...prev, isAuditing: true }));
    try {
      const itemsToAudit = knowledgeState.aiKnowledge.filter(k => !k.embedding || k.content.length < 50);
      
      if (itemsToAudit.length === 0) {
        showToast("Kho tri thức đã được tối ưu.", "success");
        return { optimizedCount: 0, issuesFound: 0 };
      }

      showToast(`Đang tối ưu hóa ${itemsToAudit.length} mục...`, "info");
      
      let optimizedCount = 0;
      for (const item of itemsToAudit) {
        if (!item.embedding && item.content) {
           const embedding = await generateEmbedding(item.content);
           await updateDoc(doc(db, 'knowledge', item.id), { embedding });
           optimizedCount++;
        }
      }
      
      showToast(`Đã tối ưu hóa ${optimizedCount} mục.`, "success");
      return { optimizedCount, issuesFound: itemsToAudit.length };
    } catch (error) {
      console.error("Error auditing knowledge:", error);
      showToast("Lỗi khi tối ưu hóa tri thức", "error");
      return { optimizedCount: 0, issuesFound: 0 };
    } finally {
      setUiState(prev => ({ ...prev, isAuditing: false }));
    }
  }, [user, knowledgeState.aiKnowledge, showToast]);

  const addPendingKnowledge = useCallback(async () => {}, []);
  
  const deletePendingKnowledge = useCallback(async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'pending_knowledge', id));
    } catch (error) {
      console.error("Error deleting pending knowledge:", error);
      throw error;
    }
  }, [user]);
  const updatePendingKnowledge = useCallback(async () => {}, []);
  const searchKnowledge = useCallback(async () => {}, []);
  const addGenZTermToKnowledge = useCallback(async (term: any) => {
    if (!term) return;
    return processAndSaveKnowledge(`${term.term}: ${term.definition}`, ['gen-z', ...(term.tags || [])], 'Gen Z Decoder');
  }, [processAndSaveKnowledge]);
  const confirmAIItems = useCallback(async () => {}, []);
  const discardAIItems = useCallback(async () => {}, []);

  return useMemo(() => ({
    ...knowledgeState,
    ...uiState,
    ...formState,
    pendingAIItems,
    isReviewingAI,
    setIsReviewingAI,
    confirmAIItems,
    discardAIItems,
    setSearchQuery: (val: string) => setKnowledgeState(prev => ({ ...prev, searchQuery: val })),
    setFilterCategory: (val: string) => setKnowledgeState(prev => ({ ...prev, filterCategory: val })),
    setEditingIndex: (idx: number | null) => setUiState(prev => ({ ...prev, editingIndex: idx })),
    setEditValue: (val: string) => setFormState(prev => ({ ...prev, editValue: val })),
    setEditTags: (val: string) => setFormState(prev => ({ ...prev, editTags: val })),
    setEditCategory: (val: string) => setFormState(prev => ({ ...prev, editCategory: val })),
    setEditIsImportant: (val: boolean) => setFormState(prev => ({ ...prev, editIsImportant: val })),
    setEditIsPublic: (val: boolean) => setFormState(prev => ({ ...prev, editIsPublic: val })),
    setEditTitle: (val: string) => setFormState(prev => ({ ...prev, editTitle: val })),
    setEditSummary: (val: string) => setFormState(prev => ({ ...prev, editSummary: val })),
    setEditDocNumber: (val: string) => setFormState(prev => ({ ...prev, editDocNumber: val })),
    setEditIssueDate: (val: string) => setFormState(prev => ({ ...prev, editIssueDate: val })),
    setEditSigner: (val: string) => setFormState(prev => ({ ...prev, editSigner: val })),
    setEditStaffMember: (val: string) => setFormState(prev => ({ ...prev, editStaffMember: val })),
    setEditPermissionLevel: (val: 'public' | 'private') => setFormState(prev => ({ ...prev, editPermissionLevel: val })),
    setEditVersion: (val: string) => setFormState(prev => ({ ...prev, editVersion: val })),
    setEditReviewStatus: (val: 'draft' | 'in_review' | 'approved' | 'published') => setFormState(prev => ({ ...prev, editReviewStatus: val })),
    setEditReviewNotes: (val: string) => setFormState(prev => ({ ...prev, editReviewNotes: val })),
    setIsAddingManual: (val: boolean) => setUiState(prev => ({ ...prev, isAddingManual: val })),
    setManualValue: (val: string) => setFormState(prev => ({ ...prev, manualValue: val })),
    setManualTags: (val: string) => setFormState(prev => ({ ...prev, manualTags: val })),
    setManualTitle: (val: string) => setFormState(prev => ({ ...prev, manualTitle: val })),
    setManualDocNumber: (val: string) => setFormState(prev => ({ ...prev, manualDocNumber: val })),
    setManualIssueDate: (val: string) => setFormState(prev => ({ ...prev, manualIssueDate: val })),
    setManualSigner: (val: string) => setFormState(prev => ({ ...prev, manualSigner: val })),
    setManualStaffMember: (val: string) => setFormState(prev => ({ ...prev, manualStaffMember: val })),
    setManualPermissionLevel: (val: 'public' | 'private') => setFormState(prev => ({ ...prev, manualPermissionLevel: val })),
    setManualVersion: (val: string) => setFormState(prev => ({ ...prev, manualVersion: val })),
    setManualReviewStatus: (val: 'draft' | 'in_review' | 'approved' | 'published') => setFormState(prev => ({ ...prev, manualReviewStatus: val })),
    setManualReviewNotes: (val: string) => setFormState(prev => ({ ...prev, manualReviewNotes: val })),
    setManualPriority: (val: 'low' | 'medium' | 'high') => setFormState(prev => ({ ...prev, manualPriority: val })),
    setManualDeadline: (val: string) => setFormState(prev => ({ ...prev, manualDeadline: val })),
    setManualStatus: (val: 'Pending' | 'In Progress' | 'Completed') => setFormState(prev => ({ ...prev, manualStatus: val })),
    setIsManualPublic: (val: boolean) => setFormState(prev => ({ ...prev, isManualPublic: val })),
    setIsManualImportant: (val: boolean) => setFormState(prev => ({ ...prev, isManualImportant: val })),
    setEditPriority: (val: 'low' | 'medium' | 'high') => setFormState(prev => ({ ...prev, editPriority: val })),
    setEditDeadline: (val: string) => setFormState(prev => ({ ...prev, editDeadline: val })),
    setEditStatus: (val: 'Pending' | 'In Progress' | 'Completed') => setFormState(prev => ({ ...prev, editStatus: val })),
    loadKnowledge,
    addManualKnowledge,
    updateKnowledge,
    deleteKnowledge,
    handleReorderKnowledge,
    smartLearnFromText,
    learnFromFile,
    suggestTagsForContent,
    removeDuplicates,
    deleteAllKnowledge,
    syncRemoteKnowledge,
    syncOneNote,
    auditAndOptimizeKnowledge,
    addPendingKnowledge,
    deletePendingKnowledge,
    updatePendingKnowledge,
    searchKnowledge,
    addGenZTermToKnowledge,
    smartSummarizeKnowledge,
    summarizedContent,
    setSummarizedContent,
    syncUnifiedStrategicKnowledge
  }), [
    knowledgeState, uiState, formState, pendingAIItems, isReviewingAI, confirmAIItems, discardAIItems,
    loadKnowledge, addManualKnowledge, updateKnowledge, deleteKnowledge, 
    handleReorderKnowledge, smartLearnFromText, learnFromFile, 
    suggestTagsForContent, removeDuplicates, deleteAllKnowledge, 
    syncRemoteKnowledge, auditAndOptimizeKnowledge, syncOneNote, syncUnifiedStrategicKnowledge, addPendingKnowledge, deletePendingKnowledge, updatePendingKnowledge,
    searchKnowledge,
    addGenZTermToKnowledge,
    smartSummarizeKnowledge,
    summarizedContent,
    syncUnifiedStrategicKnowledge
  ]);
}
