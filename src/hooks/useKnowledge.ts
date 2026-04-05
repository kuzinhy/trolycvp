import { useState, useCallback, useEffect, useMemo } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ToastType } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc, doc, updateDoc, deleteDoc, Timestamp, serverTimestamp, query, where, onSnapshot, or, and, orderBy, writeBatch } from 'firebase/firestore';
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
    updateProgress: '', // Thêm state tiến trình
    isDeleting: null as string | null,
    editingIndex: null as number | null,
    isAddingManual: false,
    isLearning: false,
    isSuggestingTags: false,
    isRemovingDuplicates: false,
    isAuditing: false,
    isDeletingAll: false,
    isSyncingSecondBrain: false,
    isSyncingOneNote: false,
    isSummarizing: false,
  });

  const [summarizedContent, setSummarizedContent] = useState<string | null>(null);

  const smartSummarizeKnowledge = useCallback(async (category?: string) => {
    if (uiState.isSummarizing || !user) return;
    setUiState(prev => ({ ...prev, isSummarizing: true }));
    try {
      const itemsToSummarize = category && category !== 'Tất cả' 
        ? knowledgeState.aiKnowledge.filter(k => k.category === category)
        : knowledgeState.aiKnowledge.slice(0, 20); // Limit to 20 items for context

      if (itemsToSummarize.length === 0) {
        showToast("Không có kiến thức nào để tóm tắt.", "info");
        return;
      }

      const context = itemsToSummarize.map(k => `Tiêu đề: ${k.title}\nNội dung: ${k.content}`).join('\n\n---\n\n');
      
      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: [{
          role: 'user',
          parts: [{
            text: `Bạn là một chuyên gia phân tích dữ liệu Đảng vụ. Hãy tóm tắt và tổng hợp các kiến thức sau đây thành một bản báo cáo ngắn gọn, súc tích và có cấu trúc rõ ràng.
            
            Yêu cầu:
            1. Phân loại các nhóm kiến thức chính.
            2. Nêu bật các điểm quan trọng nhất, các mốc thời gian hoặc các chỉ thị cần lưu ý.
            3. Đưa ra nhận xét về xu hướng hoặc các vấn đề cần quan tâm dựa trên các tài liệu này.
            4. Sử dụng văn phong chuyên nghiệp, chuẩn mực của cơ quan Đảng.
            
            Dữ liệu:
            ${context}`
          }]
        }]
      });

      setSummarizedContent(response.text);
      showToast("Đã tổng hợp kiến thức thành công!", "success");
    } catch (e) {
      console.error("Summarization error:", e);
      showToast("Lỗi khi tổng hợp kiến thức.", "error");
    } finally {
      setUiState(prev => ({ ...prev, isSummarizing: false }));
    }
  }, [uiState.isSummarizing, knowledgeState.aiKnowledge, user, showToast]);

  // Form state
  const [formState, setFormState] = useState({
    editValue: '',
    editTags: '',
    editCategory: 'Chung',
    editIsImportant: false,
    editIsPublic: true,
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
    manualValue: '',
    manualTags: '',
    manualTitle: '',
    manualDocNumber: '',
    manualIssueDate: '',
    manualSigner: '',
    manualStaffMember: '',
    manualPermissionLevel: 'public' as 'public' | 'private',
    manualVersion: '',
    manualReviewStatus: 'draft' as 'draft' | 'in_review' | 'approved' | 'published',
    manualReviewNotes: '',
    isManualPublic: true,
    isManualImportant: false,
  });

  // Auto-save draft to localStorage
  useEffect(() => {
    const draft = localStorage.getItem(`knowledge_draft_${user?.uid}`);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setFormState(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Error loading draft:", e);
      }
    }
  }, [user?.uid]);

  useEffect(() => {
    const isDirty = formState.manualValue.trim().length > 0 || 
                    formState.manualTitle.trim().length > 0 ||
                    (uiState.editingIndex !== null && (
                      formState.editValue.trim().length > 0 || 
                      formState.editTitle.trim().length > 0
                    ));
    
    if (setHasUnsavedChanges) {
      setHasUnsavedChanges(isDirty);
    }

    if (isDirty) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem(`knowledge_draft_${user?.uid}`, JSON.stringify({
          manualValue: formState.manualValue,
          manualTitle: formState.manualTitle,
          manualTags: formState.manualTags,
          manualDocNumber: formState.manualDocNumber,
          manualIssueDate: formState.manualIssueDate,
          manualSigner: formState.manualSigner,
          manualStaffMember: formState.manualStaffMember,
          manualPermissionLevel: formState.manualPermissionLevel,
          manualVersion: formState.manualVersion,
          manualReviewStatus: formState.manualReviewStatus,
          manualReviewNotes: formState.manualReviewNotes,
          isManualPublic: formState.isManualPublic,
          isManualImportant: formState.isManualImportant,
        }));
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [formState, user?.uid, setHasUnsavedChanges, uiState.editingIndex]);

  // Real-time listeners
  useEffect(() => {
    if (!user) return;

    setKnowledgeState(prev => ({ ...prev, isMemoryLoading: true, isPendingLoading: true }));

    // Listener for main knowledge
    let knowledgeQuery;
    const currentUnitId = unitId || 'default_unit';
    const unitIdsToQuery = Array.from(new Set([currentUnitId, '', 'default_unit']));
    
    if (isSuperAdmin) {
      knowledgeQuery = query(collection(db, "party_documents"));
    } else {
      knowledgeQuery = query(collection(db, "party_documents"), where("unitId", "in", unitIdsToQuery));
    }

    const unsubscribeKnowledge = onSnapshot(knowledgeQuery, (snapshot) => {
      let loadedKnowledge = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...(doc.data() as any) 
      }));

      // Filter in memory for regular users
      if (!isSuperAdmin && !isAdmin) {
        loadedKnowledge = loadedKnowledge.filter(doc => doc.isPublic || doc.authorId === user.uid);
      }
      
      // Manual sort to handle missing 'order' field and provide consistent ordering
      loadedKnowledge.sort((a, b) => {
        const orderA = a.order !== undefined ? a.order : 999999;
        const orderB = b.order !== undefined ? b.order : 999999;
        if (orderA !== orderB) return orderA - orderB;
        
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA; // Newest first for same order
      });
      
      setKnowledgeState(prev => ({ 
        ...prev, 
        aiKnowledge: loadedKnowledge,
        isMemoryLoading: false 
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "party_documents");
      setKnowledgeState(prev => ({ ...prev, isMemoryLoading: false }));
    });

    // Listener for pending knowledge
    const pendingQuery = query(collection(db, "pending_knowledge"), where("unitId", "in", unitIdsToQuery));
    
    const unsubscribePending = onSnapshot(pendingQuery, (snapshot) => {
      const loadedPending = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...(doc.data() as any) 
      }));
      
      setKnowledgeState(prev => ({ 
        ...prev, 
        pendingKnowledge: loadedPending,
        isPendingLoading: false 
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "pending_knowledge");
      setKnowledgeState(prev => ({ ...prev, isPendingLoading: false }));
    });

    return () => {
      unsubscribeKnowledge();
      unsubscribePending();
    };
  }, [user, unitId, isSuperAdmin, isAdmin, showToast]);

  const [pendingAIItems, setPendingAIItems] = useState<any[]>([]);
  const [isReviewingAI, setIsReviewingAI] = useState(false);

  const loadKnowledge = useCallback(async () => {
    // This is now handled by onSnapshot, but we keep it for backward compatibility
  }, []);

  const syncOneNote = useCallback(async () => {
    if (uiState.isSyncingOneNote) return;
    setUiState(prev => ({ ...prev, isSyncingOneNote: true }));
    try {
      const response = await fetch('/api/onenote/sync', { method: 'POST' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || "Không thể kết nối với Microsoft OneNote");
      }
      
      const data = await response.json();
      
      if (data && data.success && Array.isArray(data.data)) {
        if (data.data.length === 0) {
          showToast("Không tìm thấy ghi chú mới nào từ OneNote", "info");
          return;
        }

        const batches = [];
        let currentBatch = writeBatch(db);
        let count = 0;

        for (const item of data.data) {
          if (!user?.uid) continue;
          
          const embedding = await generateEmbedding(item.content).catch(e => {
            console.error("Embedding error:", e);
            return null;
          });

          const docRef = doc(collection(db, "party_documents"));
          currentBatch.set(docRef, { 
            content: item.content, 
            summary: item.content.substring(0, 200) + (item.content.length > 200 ? "..." : ""),
            category: "OneNote",
            tags: ["onenote", "external-sync"],
            embedding,
            isImportant: false,
            isPublic: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            authorId: user.uid,
            unitId: unitId || 'default_unit',
            type: 'document',
            title: item.title || "Ghi chú từ OneNote",
            source: 'OneNote',
            externalId: item.pageId
          });
          
          count++;
          if (count === 500) {
            batches.push(currentBatch.commit());
            currentBatch = writeBatch(db);
            count = 0;
          }
        }
        
        if (count > 0) batches.push(currentBatch.commit());
        await Promise.all(batches);
        showToast(`Đã đồng bộ thành công ${data.data.length} ghi chú từ OneNote`, "success");
      } else {
        showToast("Dữ liệu từ OneNote không đúng định dạng", "warning");
      }
    } catch (error: any) {
      console.error("Sync OneNote error:", error);
      showToast(error.message || "Lỗi khi đồng bộ OneNote", "error");
    } finally {
      setUiState(prev => ({ ...prev, isSyncingOneNote: false }));
    }
  }, [uiState.isSyncingOneNote, showToast, user, unitId]);

  const syncSecondBrain = useCallback(async () => {
    if (uiState.isSyncingSecondBrain) return;
    setUiState(prev => ({ ...prev, isSyncingSecondBrain: true }));
    try {
      const response = await fetch('/api/second-brain/sync');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || "Không thể kết nối với Kho kiến thức thứ 2");
      }
      
      const data = await response.json();
      
      if (data && data.error) {
        throw new Error(`Lỗi từ Apps Script: ${data.error}`);
      }

      if (data && Array.isArray(data)) {
        if (data.length === 0) {
          showToast("Kho kiến thức thứ 2 hiện đang trống hoặc không tìm thấy file hợp lệ (.txt, Google Docs)", "info");
          return;
        }

        const batches = [];
        let currentBatch = writeBatch(db);
        let count = 0;

        data.forEach((item: any) => {
          if (!user?.uid) return;
          
          const docRef = doc(collection(db, "party_documents"));
          currentBatch.set(docRef, { 
            content: item.content || item.text || "", 
            summary: (item.content || item.text || "").substring(0, 200) + "...",
            category: "Second Brain",
            tags: ["second-brain", "external-sync"],
            isImportant: false,
            isPublic: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            authorId: user.uid,
            unitId: unitId || 'default_unit',
            type: 'document',
            title: item.title || item.name || "Tài liệu từ Second Brain"
          });
          
          count++;
          if (count === 500) {
            batches.push(currentBatch.commit());
            currentBatch = writeBatch(db);
            count = 0;
          }
        });
        
        if (count > 0) batches.push(currentBatch.commit());
        await Promise.all(batches);
        showToast(`Đã đồng bộ thành công ${data.length} tài liệu từ Kho kiến thức thứ 2`, "success");
      } else {
        showToast("Dữ liệu từ Kho kiến thức thứ 2 không đúng định dạng danh sách", "warning");
      }
    } catch (error: any) {
      console.error("Sync second brain error:", error);
      showToast(error.message || "Lỗi khi đồng bộ Kho kiến thức thứ 2", "error");
    } finally {
      setUiState(prev => ({ ...prev, isSyncingSecondBrain: false }));
    }
  }, [uiState.isSyncingSecondBrain, showToast, user, unitId]);

  const addPendingKnowledge = useCallback(async (name: string) => {
    if (!user || !name.trim()) return;
    try {
      await addDoc(collection(db, "pending_knowledge"), {
        name: name.trim(),
        unitId: unitId || 'default_unit',
        authorId: user.uid,
        updatedAt: new Date().toISOString().split('T')[0],
        createdAt: Timestamp.now()
      });
    } catch (e) {
      console.error("Add pending error:", e);
      showToast("Lỗi khi thêm kiến thức cần cập nhật", "error");
    }
  }, [user, unitId, showToast]);

  const deletePendingKnowledge = useCallback(async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "pending_knowledge", id));
    } catch (e) {
      console.error("Delete pending error:", e);
      showToast("Lỗi khi xóa kiến thức cần cập nhật", "error");
    }
  }, [user, showToast]);

  const updatePendingKnowledge = useCallback(async (id: string, name: string) => {
    if (!user || !name.trim()) return;
    try {
      await updateDoc(doc(db, "pending_knowledge", id), {
        name: name.trim(),
        updatedAt: new Date().toISOString().split('T')[0]
      });
    } catch (e) {
      console.error("Update pending error:", e);
      showToast("Lỗi khi cập nhật kiến thức cần cập nhật", "error");
    }
  }, [user, showToast]);

  const updateKnowledge = useCallback(async (id: string, data: any) => {
    if (!user || !id) return;
    setUiState(prev => ({ ...prev, isUpdating: true }));
    try {
      const docRef = doc(db, "party_documents", id);
      const embedding = await generateEmbedding(data.content || "").catch(e => { console.error("Embedding error:", e); return null; });
      await updateDoc(docRef, { 
        ...data,
        embedding,
        updatedAt: Timestamp.now(),
        updatedBy: user.uid
      });
      
      showToast("Đã cập nhật kiến thức", "success");
      setUiState(prev => ({ ...prev, editingIndex: null }));
    } catch (e: any) {
      console.error("Update error:", e);
      showToast("Lỗi cập nhật Firebase", "error");
    } finally {
      setUiState(prev => ({ ...prev, isUpdating: false }));
    }
  }, [showToast, user]);

  const addManualKnowledge = useCallback(async (category: string = "Chung", pendingId?: string) => {
    if (!user) {
      showToast("Bạn cần đăng nhập để lưu tri thức", "error");
      return;
    }
    if (!formState.manualValue.trim()) {
      showToast("Vui lòng nhập nội dung tri thức", "warning");
      return;
    }
    setUiState(prev => ({ ...prev, isUpdating: true, updateProgress: 'Đang phân tích logic và đối chiếu tri thức...' }));
    try {
      // 1. Phân tích đối chiếu với kiến thức cũ
      const context = knowledgeState.aiKnowledge.slice(0, 10).map(k => `ID: ${k.id}, Tiêu đề: ${k.title}, Nội dung: ${k.content}`).join('\n\n');
      
      const analysisResponse = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: [{
          role: 'user',
          parts: [{
            text: `Bạn là chuyên gia quản trị tri thức. Hãy đối chiếu nội dung mới với kiến thức hiện có để quyết định:
            - Nếu nội dung mới là cập nhật, bổ sung hoặc làm rõ cho một kiến thức cũ, hãy trả về ID của kiến thức cũ đó.
            - Nếu nội dung mới là hoàn toàn mới, hãy trả về "NEW".
            
            Kiến thức hiện có:
            ${context}
            
            Nội dung mới:
            Tiêu đề: ${formState.manualTitle}
            Nội dung: ${formState.manualValue}
            
            Trả về CHỈ ID hoặc "NEW".`
          }]
        }]
      });

      const decision = analysisResponse.text?.trim() || "NEW";
      const existingDoc = knowledgeState.aiKnowledge.find(k => k.id === decision);

      const tags = formState.manualTags.split(',').map(t => t.trim()).filter(t => t);
      
      if (existingDoc) {
        setUiState(prev => ({ ...prev, updateProgress: 'Đang cập nhật kiến thức cũ...' }));
        await updateKnowledge(existingDoc.id, {
          content: `${existingDoc.content}\n\n[Cập nhật]: ${formState.manualValue}`,
          summary: formState.manualValue.substring(0, 200) + "...",
          tags: [...new Set([...existingDoc.tags, ...tags])],
          updatedAt: serverTimestamp(),
          updatedBy: user.uid
        });
      } else {
        setUiState(prev => ({ ...prev, updateProgress: 'Đang tạo vector tri thức (Embedding)...' }));
        const embedding = await generateEmbedding(formState.manualValue).catch(e => { console.error("Embedding error:", e); return null; });
        
        setUiState(prev => ({ ...prev, updateProgress: 'Đang lưu vào bộ não số...' }));
        await addDoc(collection(db, "party_documents"), { 
          content: formState.manualValue, 
          tags,
          embedding,
          category,
          summary: formState.manualValue.substring(0, 200) + (formState.manualValue.length > 200 ? "..." : ""),
          isPublic: formState.isManualPublic,
          isImportant: formState.isManualImportant,
          title: formState.manualTitle || 'Manual Entry',
          docNumber: formState.manualDocNumber || '',
          issueDate: formState.manualIssueDate || '',
          signer: formState.manualSigner || '',
          staffMember: formState.manualStaffMember || '',
          permission_level: formState.manualPermissionLevel,
          version: formState.manualVersion || '1.0.0',
          review_status: formState.manualReviewStatus,
          review_notes: formState.manualReviewNotes || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          authorId: user.uid,
          updatedBy: user.uid,
          unitId: unitId || 'default_unit',
          type: 'document',
          order: knowledgeState.aiKnowledge.length
        });
      }
      
      if (pendingId) {
        await deleteDoc(doc(db, "pending_knowledge", pendingId));
      }

      showToast(existingDoc ? "Đã cập nhật kiến thức thành công!" : "Đã nạp kiến thức mới vào bộ não", "success");
      setFormState(prev => ({
        ...prev,
        manualValue: '',
        manualTags: '',
        manualTitle: '',
        manualDocNumber: '',
        manualIssueDate: '',
        manualSigner: '',
        manualStaffMember: '',
        manualPermissionLevel: 'public',
        manualVersion: '',
        manualReviewStatus: 'draft',
        manualReviewNotes: '',
        isManualPublic: true,
        isManualImportant: false,
      }));
      setUiState(prev => ({ ...prev, isAddingManual: false }));
    } catch (e: any) {
      console.error("Save error:", e);
      showToast("Lỗi lưu lên Firebase", "error");
    } finally {
      setUiState(prev => ({ ...prev, isUpdating: false, updateProgress: '' }));
    }
  }, [formState, showToast, user, unitId, knowledgeState.aiKnowledge, updateKnowledge]);

  const deleteKnowledge = useCallback(async (id: string) => {
    if (!user || !id) return;
    setUiState(prev => ({ ...prev, isDeleting: id }));
    try {
      const docRef = doc(db, "party_documents", id);
      await deleteDoc(docRef);
      showToast("Đã xóa kiến thức", "info");
    } catch (e: any) {
      console.error("Delete error:", e);
      showToast("Lỗi xóa Firebase", "error");
    } finally {
      setUiState(prev => ({ ...prev, isDeleting: null }));
    }
  }, [showToast, user]);

  const addGenZTermToKnowledge = useCallback(async (term: any) => {
    if (!user) return;
    setUiState(prev => ({ ...prev, isUpdating: true }));
    try {
      const content = `Thuật ngữ: ${term.term}\nÝ nghĩa: ${term.meaning}\nNguồn gốc: ${term.origin || 'N/A'}\nVí dụ: ${term.example || 'N/A'}`;
      const embedding = await generateEmbedding(content).catch(e => { console.error("Embedding error:", e); return null; });
      
      await addDoc(collection(db, "party_documents"), {
        title: `Thuật ngữ Gen Z: ${term.term}`,
        content,
        summary: `${term.term}: ${term.meaning}`,
        category: "Gen Z Slang",
        tags: ["GenZ", "Slang", "Ngôn ngữ"],
        embedding,
        isPublic: true,
        isImportant: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        authorId: user.uid,
        updatedBy: user.uid,
        unitId: unitId || 'default_unit',
        type: 'document',
        order: knowledgeState.aiKnowledge.length
      });
      
      showToast("Đã lưu thuật ngữ vào Knowledge Core", "success");
    } catch (e: any) {
      console.error("Save error:", e);
      showToast("Lỗi lưu vào Knowledge Core", "error");
    } finally {
      setUiState(prev => ({ ...prev, isUpdating: false }));
    }
  }, [user, unitId, knowledgeState.aiKnowledge.length, showToast]);

  const handleReorderKnowledge = useCallback(async (newOrder: any[]) => {
    setKnowledgeState(prev => ({ ...prev, aiKnowledge: newOrder }));
    
    // Persist reorder to Firestore
    if (!user || !unitId) return;
    
    try {
      const batch = writeBatch(db);
      newOrder.forEach((item, index) => {
        if (item.id) {
          const docRef = doc(db, "party_documents", item.id);
          batch.update(docRef, { 
            order: index,
            updatedAt: Timestamp.now()
          });
        }
      });
      await batch.commit();
    } catch (e) {
      console.error("Reorder persistence error:", e);
    }
  }, [user, unitId]);

  const smartLearnFromText = useCallback(async (text: string, isManual: boolean = false) => {
    if (!text.trim() || uiState.isLearning || !user) return;
    setUiState(prev => ({ ...prev, isLearning: true }));
    try {
      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: [{
          role: 'user',
          parts: [{
            text: `Hãy phân tích văn bản sau và trích xuất các thông tin quan trọng một cách khoa học.
            Trả về một mảng JSON chứa các đối tượng kiến thức. Mỗi đối tượng đại diện cho một phần kiến thức độc lập, quan trọng trong văn bản.
            Định dạng JSON yêu cầu:
            {
              "items": [
                {
                  "title": "Tiêu đề văn bản hoặc chủ đề",
                  "extracted_content": "Nội dung kiến thức chi tiết, đầy đủ.",
                  "summary": "Tóm tắt ngắn gọn 1-2 câu.",
                  "category": "Chọn 1 trong: Chung, Quy định - Hướng dẫn, Nghị quyết - Chỉ thị, Nhân sự - Tổ chức, Kiểm tra - Giám sát, Dân vận - Tuyên giáo, Văn phòng - Hành chính",
                  "tags": ["quy dinh", "nghi quyet", "cong van", "bien ban", "tieu chi", "the loai khac..."],
                  "doc_number": "Số hiệu văn bản (nếu có)",
                  "issue_date": "Ngày ban hành (nếu có, định dạng YYYY-MM-DD)",
                  "signer": "Người ký văn bản (nếu có)",
                  "staff_member": "Tên đầy đủ của cán bộ tham mưu/soạn thảo",
                  "permission_level": "Mức độ quyền hạn: 'public' hoặc 'private'",
                  "version": "Phiên bản văn bản (ví dụ: '1.0.0')",
                  "review_status": "Trạng thái rà soát: 'draft', 'in_review', 'approved', hoặc 'published'",
                  "review_notes": "Ghi chú rà soát (nếu có)",
                  "is_important": true/false
                }
              ]
            }

            Đặc biệt chú ý trích xuất chính xác tên cán bộ tham mưu. Nếu thấy tên viết tắt hoặc tên gọi thân mật, hãy cố gắng suy luận họ tên đầy đủ dựa trên ngữ cảnh hoặc kiến thức chung nếu có thể.
            Nếu văn bản dài và có nhiều chủ đề/điều khoản khác nhau, hãy chia thành nhiều đối tượng trong mảng "items".
            Nếu không có thông tin gì quan trọng, hãy trả về {"items": []}.
            
            Văn bản:
            ${text}`
          }]
        }],
        config: { responseMimeType: "application/json" }
      });

      let result: any = { items: [] };
      try {
        const text = response?.text || "{}";
        const cleanJson = text.replace(/```json\n?|```/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        
        if (parsed.items && Array.isArray(parsed.items)) {
          result = parsed;
        } else if (parsed && !parsed.none && (parsed.extracted_content || parsed.content)) {
          result.items = [parsed];
        }
      } catch (parseError) {
        console.error("JSON parse error in smartLearnFromText:", parseError);
      }
      
      if (result.items && result.items.length > 0) {
        setPendingAIItems(result.items.map((item: any) => ({
          ...item,
          content: item.extracted_content || item.content || "Không có nội dung chi tiết",
          title: item.title || "Kiến thức từ văn bản",
          isPublic: true,
          source: isManual ? "Nhập thủ công" : "Hội thoại"
        })));
        setIsReviewingAI(true);
        if (isManual) showToast(`AI đã trích xuất ${result.items.length} mục kiến thức. Vui lòng kiểm tra và xác nhận.`, "info");
      } else {
        if (isManual) showToast("AI không tìm thấy thông tin mới nào đáng kể trong đoạn văn bản này.", "info");
      }
    } catch (e) {
      console.error("Smart learn error:", e);
      if (isManual) showToast("Lỗi khi AI phân tích văn bản.", "error");
    } finally {
      setUiState(prev => ({ ...prev, isLearning: false }));
    }
  }, [uiState.isLearning, showToast, user, unitId]);

  const learnFromFile = useCallback(async (file: File, isPublic: boolean = true) => {
    if (!user || !unitId) return;
    setUiState(prev => ({ ...prev, isLearning: true }));
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      let mimeType = file.type;
      if (!mimeType) {
        if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
        else if (file.name.endsWith('.txt')) mimeType = 'text/plain';
        else mimeType = 'application/octet-stream';
      }

      const response = await generateContentWithRetry({
        model: "gemini-3.1-pro-preview",
        contents: [{
          role: 'user',
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              }
            },
            {
              text: `Hãy phân tích tài liệu này và trích xuất các thông tin quan trọng một cách khoa học.
              Trả về một mảng JSON chứa các đối tượng kiến thức. Mỗi đối tượng đại diện cho một phần kiến thức độc lập, quan trọng trong văn bản.
              Định dạng JSON yêu cầu:
              {
                "items": [
                  {
                    "title": "Tiêu đề văn bản hoặc chủ đề",
                    "extracted_content": "Nội dung kiến thức chi tiết, đầy đủ.",
                    "summary": "Tóm tắt ngắn gọn 1-2 câu.",
                    "category": "Chọn 1 trong: Chung, Quy định - Hướng dẫn, Nghị quyết - Chỉ thị, Nhân sự - Tổ chức, Kiểm tra - Giám sát, Dân vận - Tuyên giáo, Văn phòng - Hành chính",
                    "tags": ["quy dinh", "nghi quyet", "cong van", "bien ban", "tieu chi", "the loai khac..."],
                    "doc_number": "Số hiệu văn bản (nếu có)",
                    "issue_date": "Ngày ban hành (nếu có, định dạng YYYY-MM-DD)",
                    "signer": "Người ký văn bản (nếu có)",
                    "staff_member": "Tên đầy đủ của cán bộ tham mưu/soạn thảo (thường ở góc trái khu vực 'Nơi nhận', sau từ 'Lưu VPĐU' hoặc tương tự. Ví dụ: 'Lưu VPĐU, Phương' -> 'Nguyễn Thị Thu Phương' nếu bạn biết họ tên đầy đủ, hoặc giữ nguyên tên nếu không chắc chắn)",
                    "is_important": true/false
                  }
                ]
              }

              Đặc biệt chú ý trích xuất chính xác tên cán bộ tham mưu. Nếu thấy tên viết tắt hoặc tên gọi thân mật, hãy cố gắng suy luận họ tên đầy đủ dựa trên ngữ cảnh hoặc kiến thức chung nếu có thể.
              Nếu tài liệu dài và có nhiều chủ đề/điều khoản khác nhau, hãy chia thành nhiều đối tượng trong mảng "items".
              Nếu không có thông tin gì quan trọng, hãy trả về {"items": []}.`
            }
          ]
        }],
        config: { responseMimeType: "application/json" }
      });

      let result: any = { items: [] };
      try {
        const text = response?.text || "{}";
        const cleanJson = text.replace(/```json\n?|```/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        
        if (parsed.items && Array.isArray(parsed.items)) {
          result = parsed;
        } else if (parsed && !parsed.none && (parsed.extracted_content || parsed.content)) {
          result.items = [parsed];
        }
      } catch (parseError) {
        console.error("JSON parse error in learnFromFile:", parseError);
      }
      
      if (result.items && result.items.length > 0) {
        setPendingAIItems(result.items.map((item: any) => ({
          ...item,
          content: item.extracted_content || item.content || "Không có nội dung chi tiết",
          title: item.title || file.name,
          isPublic: isPublic,
          source: file.name
        })));
        setIsReviewingAI(true);
        showToast(`AI đã trích xuất ${result.items.length} mục kiến thức. Vui lòng kiểm tra và xác nhận.`, "info");
      } else {
        showToast(`Không tìm thấy thông tin mới nào đáng kể trong file ${file.name}.`, "info");
      }
    } catch (e: any) {
      console.error("File learn error:", e);
      showToast(`Lỗi khi AI phân tích file ${file.name}. Vui lòng thử lại với định dạng PDF, TXT hoặc Ảnh.`, "error");
    } finally {
      setUiState(prev => ({ ...prev, isLearning: false }));
    }
  }, [uiState.isLearning, showToast, user, unitId]);

  const suggestTagsForContent = useCallback(async (content: string) => {
    if (!content.trim() || uiState.isSuggestingTags) return;
    setUiState(prev => ({ ...prev, isSuggestingTags: true }));
    try {
      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: [{
          role: 'user',
          parts: [{
            text: `Đề xuất 2-4 thẻ (tags) ngắn gọn, chuyên nghiệp bằng tiếng Việt cho nội dung sau. 
            Ưu tiên sử dụng các thẻ chuẩn: quy dinh, nghi quyet, cong van, bien ban, tieu chi nếu phù hợp.
            Chỉ trả về danh sách các thẻ, cách nhau bởi dấu phẩy. Không giải thích gì thêm.
            
            Nội dung: ${content}`
          }]
        }]
      });
      
      const tags = response?.text?.trim();
      if (tags) {
        setFormState(prev => ({ ...prev, manualTags: tags }));
        showToast("Đã tự động đề xuất thẻ", "info");
      }
    } catch (e) {
      console.error("Tag suggestion error:", e);
    } finally {
      setUiState(prev => ({ ...prev, isSuggestingTags: false }));
    }
  }, [uiState.isSuggestingTags, showToast]);

  const confirmAIItems = useCallback(async (selectedItems: any[]) => {
    if (!user || !unitId || selectedItems.length === 0) return;
    setUiState(prev => ({ ...prev, isLearning: true }));
    try {
      const batch = writeBatch(db);
      
      const processItems = selectedItems.map(async (item: any, idx: number) => {
        const embedding = await generateEmbedding(item.content).catch(e => {
          console.error("Embedding error:", e);
          return null;
        });

        const docRef = doc(collection(db, "party_documents"));
        batch.set(docRef, { 
          content: item.content, 
          summary: item.summary || "Không có tóm tắt",
          category: item.category || "Chung",
          tags: item.tags || [],
          embedding,
          isImportant: item.is_important || false,
          isPublic: item.isPublic ?? true,
          title: item.title,
          docNumber: item.doc_number || '',
          issueDate: item.issue_date || '',
          signer: item.signer || '',
          staffMember: item.staff_member || '',
          permission_level: item.permission_level || 'public',
          version: item.version || '1.0.0',
          review_status: item.review_status || 'draft',
          review_notes: item.review_notes || '',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          authorId: user.uid,
          updatedBy: user.uid,
          unitId: unitId || '',
          type: 'document',
          order: knowledgeState.aiKnowledge.length + idx
        });
      });
      
      await Promise.all(processItems);
      await batch.commit();
      
      await logActivity({
        userId: user.uid,
        userEmail: user.email || 'anonymous',
        action: 'CONFIRM_AI_KNOWLEDGE',
        details: `Đã xác nhận và lưu ${selectedItems.length} mục kiến thức từ AI.`,
        type: 'success',
        module: 'knowledge'
      });

      setPendingAIItems([]);
      setIsReviewingAI(false);
      showToast(`Đã lưu ${selectedItems.length} mục kiến thức thành công!`, "success");
    } catch (e: any) {
      console.error("Confirm AI items error:", e);
      showToast("Lỗi khi lưu kiến thức đã chọn.", "error");
    } finally {
      setUiState(prev => ({ ...prev, isLearning: false }));
    }
  }, [user, unitId, knowledgeState.aiKnowledge.length, showToast]);

  const discardAIItems = useCallback(() => {
    if (user) {
      logActivity({
        userId: user.uid,
        userEmail: user.email || 'anonymous',
        action: 'DISCARD_AI_KNOWLEDGE',
        details: `Đã hủy ${pendingAIItems.length} mục kiến thức AI trích xuất.`,
        type: 'info',
        module: 'knowledge'
      });
    }
    setPendingAIItems([]);
    setIsReviewingAI(false);
    showToast("Đã hủy các kiến thức AI trích xuất.", "info");
  }, [user, pendingAIItems.length, showToast]);

  const searchKnowledge = useCallback(async (queryText: string, topK: number = 5) => {
    if (!queryText.trim()) return [];
    
    try {
      const queryEmbedding = await generateEmbedding(queryText);
      const queryLower = queryText.toLowerCase();
      const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
      
      // Calculate similarity for all knowledge, but prioritize keyword matches
      const scoredKnowledge = knowledgeState.aiKnowledge
        .filter(item => item.embedding)
        .map(item => {
          const similarity = cosineSimilarity(queryEmbedding, item.embedding);
          
          // Boost score based on keyword matches in title or content
          let boost = 0;
          if (item.title?.toLowerCase().includes(queryLower)) boost += 0.2;
          if (item.content?.toLowerCase().includes(queryLower)) boost += 0.1;
          
          // Small boost for each matching word
          queryWords.forEach(word => {
            if (item.content?.toLowerCase().includes(word)) boost += 0.02;
          });

          return {
            ...item,
            similarity: Math.min(1, similarity + boost)
          };
        })
        .sort((a, b) => b.similarity - a.similarity);
        
      return scoredKnowledge.slice(0, topK);
    } catch (e) {
      console.error("Search error:", e);
      return [];
    }
  }, [knowledgeState.aiKnowledge]);

  const auditAndOptimizeKnowledge = useCallback(async () => {
    if (!user || !unitId || uiState.isAuditing) return;
    setUiState(prev => ({ ...prev, isAuditing: true, updateProgress: 'Đang quét kho tri thức...' }));
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";

      // 1. Prepare data for audit
      const knowledgeSample = knowledgeState.aiKnowledge.map(k => ({
        id: k.id,
        title: k.title,
        content: k.content.substring(0, 300),
        category: k.category
      }));

      setUiState(prev => ({ ...prev, updateProgress: 'AI đang kiểm toán dữ liệu...' }));

      const prompt = `Bạn là một chuyên gia quản trị tri thức. Hãy kiểm toán danh sách tài liệu sau đây và thực hiện các nhiệm vụ:
      1. Tìm các tài liệu trùng lặp hoặc gần như trùng lặp (về nội dung hoặc thông tin như số điện thoại, tên cán bộ).
      2. Tìm các lỗi không nhất quán (Ví dụ: địa danh "TP. Hồ Chí Minh" trong khi đơn vị là "Phường Thủ Dầu Một").
      3. Xác định các lỗ hổng tri thức dựa trên các mảng: Quy trình nghiệp vụ nội bộ, Dữ liệu đánh giá hiệu quả, Đào tạo & Phát triển, Quản trị rủi ro.
      4. Đề xuất các hành động cụ thể để "tổng vệ sinh" và chuẩn hóa.

      Dữ liệu: ${JSON.stringify(knowledgeSample)}

      Trả về kết quả dưới dạng JSON:
      {
        "duplicates": ["id1", "id2"], // Danh sách ID cần xóa (giữ lại 1 bản tốt nhất)
        "inconsistencies": [
          {"id": "id3", "issue": "Sai địa danh", "suggestion": "Đổi TP. HCM thành Thủ Dầu Một"}
        ],
        "gaps": ["Quy trình bổ nhiệm", "KPI hàng tháng"],
        "healthScore": 85 // Thang điểm 100
      }`;

      const response = await ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const auditResult = JSON.parse(response.text || "{}");

      // 2. Execute cleaning if duplicates found
      if (auditResult.duplicates && auditResult.duplicates.length > 0) {
        setUiState(prev => ({ ...prev, updateProgress: `Đang dọn dẹp ${auditResult.duplicates.length} mục trùng lặp...` }));
        const batch = writeBatch(db);
        const existingIds = new Set(knowledgeState.aiKnowledge.map(k => k.id));
        
        auditResult.duplicates.forEach((id: string) => {
          if (id && existingIds.has(id)) {
            batch.delete(doc(db, "party_documents", id));
          }
        });
        await batch.commit();
      }

      // 3. Store audit report in a special knowledge item or just show toast
      showToast(`Kiểm toán hoàn tất! Điểm sức khỏe: ${auditResult.healthScore}/100. Đã dọn dẹp ${auditResult.duplicates?.length || 0} mục.`, "success");
      
      return auditResult;
    } catch (error) {
      console.error("Audit error:", error);
      showToast("Lỗi khi thực hiện kiểm toán tri thức.", "error");
    } finally {
      setUiState(prev => ({ ...prev, isAuditing: false, updateProgress: '' }));
    }
  }, [knowledgeState.aiKnowledge, user, unitId, uiState.isAuditing, showToast]);

  const removeDuplicates = useCallback(async () => {
    if (!user || !unitId || uiState.isRemovingDuplicates) return;
    setUiState(prev => ({ ...prev, isRemovingDuplicates: true }));
    try {
      const duplicatesToDelete: string[] = [];
      const contentMap = new Map<string, any[]>();

      knowledgeState.aiKnowledge.forEach(item => {
        const key = item.content?.trim() || "";
        if (!key) return;
        if (!contentMap.has(key)) {
          contentMap.set(key, []);
        }
        contentMap.get(key)!.push(item);
      });

      contentMap.forEach((items) => {
        if (items.length > 1) {
          items.sort((a, b) => {
            const timeA = a.createdAt?.toMillis?.() || 0;
            const timeB = b.createdAt?.toMillis?.() || 0;
            return timeB - timeA;
          });

          for (let i = 1; i < items.length; i++) {
            if (items[i].id) {
              duplicatesToDelete.push(items[i].id);
            }
          }
        }
      });

      if (duplicatesToDelete.length === 0) {
        showToast("Không tìm thấy dữ liệu trùng lặp.", "info");
        setUiState(prev => ({ ...prev, isRemovingDuplicates: false }));
        return;
      }

      // Use batches for deletion
      const batches = [];
      let currentBatch = writeBatch(db);
      let count = 0;

      for (const id of duplicatesToDelete) {
        currentBatch.delete(doc(db, "party_documents", id));
        count++;
        if (count === 500) {
          batches.push(currentBatch.commit());
          currentBatch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) batches.push(currentBatch.commit());
      await Promise.all(batches);

      showToast(`Đã dọn dẹp ${duplicatesToDelete.length} mục kiến thức trùng lặp.`, "success");
    } catch (error) {
      console.error("Error removing duplicates:", error);
      showToast("Lỗi khi dọn dẹp dữ liệu trùng lặp.", "error");
    } finally {
      setUiState(prev => ({ ...prev, isRemovingDuplicates: false }));
    }
  }, [knowledgeState.aiKnowledge, user, unitId, uiState.isRemovingDuplicates, showToast]);

  const deleteAllKnowledge = useCallback(async () => {
    if (!user || !unitId || uiState.isDeletingAll) return;
    
    setUiState(prev => ({ ...prev, isDeletingAll: true }));
    try {
      const batches = [];
      let currentBatch = writeBatch(db);
      let count = 0;

      for (const item of knowledgeState.aiKnowledge) {
        if (item.id) {
          currentBatch.delete(doc(db, "party_documents", item.id));
          count++;
          if (count === 500) {
            batches.push(currentBatch.commit());
            currentBatch = writeBatch(db);
            count = 0;
          }
        }
      }
      if (count > 0) batches.push(currentBatch.commit());
      await Promise.all(batches);
      
      showToast("Đã xóa tất cả kiến thức.", "success");
    } catch (error) {
      console.error("Error deleting all knowledge:", error);
      showToast("Lỗi khi xóa tất cả kiến thức.", "error");
    } finally {
      setUiState(prev => ({ ...prev, isDeletingAll: false }));
    }
  }, [knowledgeState.aiKnowledge, user, unitId, uiState.isDeletingAll, showToast]);

  // Memoized filtered knowledge
  const filteredKnowledge = useMemo(() => {
    let result = knowledgeState.aiKnowledge;
    
    if (knowledgeState.filterCategory !== 'Tất cả') {
      result = result.filter(item => item.category === knowledgeState.filterCategory);
    }
    
    if (knowledgeState.searchQuery.trim()) {
      const query = knowledgeState.searchQuery.toLowerCase();
      result = result.filter(item => 
        (item.content?.toLowerCase().includes(query)) ||
        (item.title?.toLowerCase().includes(query)) ||
        (item.summary?.toLowerCase().includes(query)) ||
        (item.tags?.some((tag: string) => tag.toLowerCase().includes(query))) ||
        (item.staffMember?.toLowerCase().includes(query)) ||
        (item.docNumber?.toLowerCase().includes(query))
      );
    }
    
    return result;
  }, [knowledgeState.aiKnowledge, knowledgeState.filterCategory, knowledgeState.searchQuery]);

  // Memoized return value to prevent unnecessary re-renders
  return useMemo(() => ({
    ...knowledgeState,
    ...uiState,
    ...formState,
    pendingAIItems,
    isReviewingAI,
    setIsReviewingAI,
    confirmAIItems,
    discardAIItems,
    filteredKnowledge,
    setSearchQuery: (val: string) => setKnowledgeState(prev => ({ ...prev, searchQuery: val })),
    setFilterCategory: (val: string) => setKnowledgeState(prev => ({ ...prev, filterCategory: val })),
    setEditingIndex: (index: number | null) => {
      if (index !== null) {
        const item = knowledgeState.aiKnowledge[index];
        setFormState(prev => ({
          ...prev,
          editValue: item.content || '',
          editTags: (item.tags || []).join(', '),
          editCategory: item.category || 'Chung',
          editIsImportant: item.isImportant || false,
          editIsPublic: item.isPublic !== undefined ? item.isPublic : true,
          editTitle: item.title || '',
          editSummary: item.summary || '',
          editDocNumber: item.docNumber || '',
          editIssueDate: item.issueDate || '',
          editSigner: item.signer || '',
          editStaffMember: item.staffMember || '',
          editPermissionLevel: item.permission_level || 'public',
          editVersion: item.version || '',
          editReviewStatus: item.review_status || 'draft',
          editReviewNotes: item.review_notes || '',
        }));
      }
      setUiState(prev => ({ ...prev, editingIndex: index }));
    },
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
    setIsManualPublic: (val: boolean) => setFormState(prev => ({ ...prev, isManualPublic: val })),
    setIsManualImportant: (val: boolean) => setFormState(prev => ({ ...prev, isManualImportant: val })),
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
    syncSecondBrain,
    syncOneNote,
    auditAndOptimizeKnowledge,
    addPendingKnowledge,
    deletePendingKnowledge,
    updatePendingKnowledge,
    searchKnowledge,
    addGenZTermToKnowledge,
    smartSummarizeKnowledge,
    summarizedContent,
    setSummarizedContent
  }), [
    knowledgeState, uiState, formState, pendingAIItems, isReviewingAI, confirmAIItems, discardAIItems,
    loadKnowledge, addManualKnowledge, updateKnowledge, deleteKnowledge, 
    handleReorderKnowledge, smartLearnFromText, learnFromFile, 
    suggestTagsForContent, removeDuplicates, deleteAllKnowledge, 
    syncSecondBrain, auditAndOptimizeKnowledge, syncOneNote, addPendingKnowledge, deletePendingKnowledge, updatePendingKnowledge,
    searchKnowledge,
    addGenZTermToKnowledge,
    smartSummarizeKnowledge,
    summarizedContent
  ]);
}
