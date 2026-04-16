import { useState, useCallback, useEffect, useRef } from 'react';
import { Task, APP_VERSION } from '../constants';
import { ToastType } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, setDoc, Timestamp, query, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';
import { generateContentWithRetry, parseAIResponse } from '../lib/ai-utils';

const MOCK_TASKS: Task[] = [];

export function useTasks(showToast: (message: string, type?: ToastType) => void) {
  const { user, unitId } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const tasksRef = useRef<Task[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [indexError, setIndexError] = useState<string | null>(null);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const ensureSystemTasks = useCallback(async (currentTasks: Task[]) => {
    if (!user) return;
    
    const systemTasks = [
      {
        id: 'sys-task-1',
        title: "Nhắc làm lịch trực khi Nhà nước thông báo nghỉ lễ tết",
        description: "Căn cứ vào chủ trương từ trung ương, địa phương để lập lịch trực phù hợp.",
        priority: "high" as const,
        status: "Pending" as const,
        category: "Hệ thống",
        deadline: "2026-12-31", // Placeholder
        createdAt: Date.now(),
        isSystem: true
      },
      {
        id: 'sys-task-2',
        title: "Gửi lịch làm việc, dặn hoa, xem sinh nhật tuần sau",
        description: "Hằng tuần, nhắc trước 18h ngày chủ nhật phải gửi lịch làm việc, dặn hoa, xem sinh nhật tuần sau, chuẩn bị tài liệu,...",
        priority: "medium" as const,
        status: "Pending" as const,
        category: "Hệ thống",
        deadline: "2026-12-31", // Placeholder
        createdAt: Date.now(),
        isSystem: true
      }
    ];

    const missingTasks = systemTasks.filter(st => !currentTasks.some(ct => ct.title === st.title));
    
    if (missingTasks.length > 0) {
      console.log("Adding missing system tasks:", missingTasks.length);
      for (const st of missingTasks) {
        try {
          const docRef = doc(db, "users", user.uid, "tasks", st.id);
          await setDoc(docRef, st);
        } catch (e) {
          console.error("Error adding system task:", e);
        }
      }
      // Reload tasks after adding
      const q = query(collection(db, "users", user.uid, "tasks"));
      const querySnapshot = await getDocs(q);
      const loadedTasks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      setTasks(loadedTasks.sort((a, b) => b.createdAt - a.createdAt));
    }
  }, [user]);

  const loadTasks = useCallback(async () => {
    if (!user) return;
    setIndexError(null);
    try {
      const q = query(collection(db, "users", user.uid, "tasks"));
      const querySnapshot = await getDocs(q);
      const loadedTasks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      const sortedTasks = loadedTasks.sort((a, b) => b.createdAt - a.createdAt);
      setTasks(sortedTasks);
      
      // Ensure system tasks are present
      await ensureSystemTasks(sortedTasks);
    } catch (e: any) {
      if (e.message.includes('index')) {
        setIndexError("Yêu cầu tạo Index cho 'tasks'.");
      }
      showToast("Lỗi tải nhiệm vụ từ Firebase", "error");
      handleFirestoreError(e, OperationType.LIST, `users/${user.uid}/tasks`);
    }
  }, [user, showToast, ensureSystemTasks]);

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user, loadTasks]);

  const saveTaskToFirebase = useCallback(async (task: Task) => {
    if (!user) return;
    try {
      const docRef = doc(db, "users", user.uid, "tasks", task.id);
      await setDoc(docRef, { ...task }, { merge: true });
    } catch (e) {
      console.error("Failed to save task to Firebase:", e);
      showToast("Lỗi lưu nhiệm vụ", "error");
    }
  }, [user, showToast]);

  const saveTaskToKnowledge = useCallback(async (task: Task) => {
    if (!user) return;
    try {
      await addDoc(collection(db, "party_documents"), {
        content: `Nhiệm vụ: ${task.title}\nMô tả: ${task.description || 'Không có mô tả'}\nDanh mục: ${task.category || 'Chung'}\nKết quả/Trạng thái: ${task.status}`,
        title: `Tri thức từ nhiệm vụ: ${task.title}`,
        category: "Nhiệm vụ",
        tags: ["task-saved", task.category || "Chung", task.priority],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        authorUid: user.uid,
        unitId: unitId || 'default_unit',
        type: 'document'
      });
      showToast(`Đã lưu nội dung nhiệm vụ "${task.title}" vào Kho tri thức AI`, "success");
    } catch (e) {
      console.error("Error saving task to knowledge:", e);
      showToast("Lỗi khi lưu nhiệm vụ vào tri thức", "error");
    }
  }, [user, unitId, showToast]);

  const updateTasks = useCallback(async (updater: Task[] | ((prev: Task[]) => Task[])) => {
    const prevTasks = tasksRef.current;
    const newTasks = typeof updater === 'function' ? updater(prevTasks) : updater;
    
    setTasks(newTasks);

    // Handle side effects outside of setState
    if (!user) return;

    // Find deleted tasks
    const deletedTasks = prevTasks.filter(p => !newTasks.some(n => n.id === p.id));
    for (const t of deletedTasks) {
      if (t.id && !t.id.startsWith('t-sync-')) {
        try {
          await deleteDoc(doc(db, "users", user.uid, "tasks", t.id));
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/tasks/${t.id}`);
          showToast("Lỗi xóa nhiệm vụ", "error");
        }
      }
    }

    // Sync new/updated tasks
    for (const t of newTasks) {
      const prevTask = prevTasks.find(p => p.id === t.id);
      
      // Check if task actually changed or is new
      if (!prevTask || JSON.stringify(prevTask) !== JSON.stringify(t)) {
        const updatedTask = { ...t };
        
        // Set completedAt if status changed to Completed
        if (t.status === 'Completed' && (!prevTask || prevTask.status !== 'Completed')) {
          updatedTask.completedAt = Date.now();
          // Save to knowledge when completed
          saveTaskToKnowledge(updatedTask);
          // Update local state again with completedAt
          setTasks(current => current.map(ct => ct.id === t.id ? updatedTask : ct));
        } else if (t.status !== 'Completed' && prevTask?.status === 'Completed') {
          delete updatedTask.completedAt;
          // Update local state again
          setTasks(current => current.map(ct => ct.id === t.id ? updatedTask : ct));
        }

        await saveTaskToFirebase(updatedTask);
      }
    }
  }, [saveTaskToFirebase, user, showToast]);

  const calculateSmartScore = useCallback((task: Task) => {
    if (task.status === 'Completed') return -1000;
    
    let score = 0;
    
    // 1. Priority Weight (40%)
    const priorityWeights = { high: 100, medium: 50, low: 10 };
    score += priorityWeights[task.priority || 'medium'];

    // 2. Deadline Proximity (40%)
    if (task.deadline) {
      const deadline = new Date(task.deadline);
      const now = new Date();
      const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) score += 200; // Overdue is critical
      else if (diffDays === 0) score += 150; // Due today
      else if (diffDays <= 3) score += 100; // Due soon
      else if (diffDays <= 7) score += 50;
    }

    // 3. System Task Weight (10%)
    if (task.isSystem) score += 30;

    // 4. AI Suggestion Bonus (10%)
    if (task.aiSuggestion) score += 20;

    return score;
  }, []);

  const smartAnalyzeTasks = useCallback(async () => {
    if (!user || tasks.length === 0 || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const prompt = `Dưới đây là danh sách các nhiệm vụ của tôi. Hãy phân tích và đưa ra:
      1. Ưu tiên (priority: "low", "medium", "high") dựa trên hạn chót và tính chất công việc.
      2. Thời gian dự kiến hoàn thành (estimatedTime, ví dụ: "2 giờ", "30 phút").
      3. Danh mục (category, ví dụ: "Công tác Đảng", "Hành chính", "Cá nhân").
      4. Một lời khuyên thông minh (aiSuggestion) để thực hiện nhiệm vụ hiệu quả nhất.
      
      Trả về kết quả dưới dạng JSON array các đối tượng {id, priority, estimatedTime, category, aiSuggestion}.
      Sử dụng tiếng Việt cho các nội dung văn bản.
      
      Danh sách nhiệm vụ: ${JSON.stringify(tasks.filter(t => t.status !== 'Completed').map(t => ({ id: t.id, title: t.title, description: t.description, deadline: t.deadline })))}`;

      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const analysisResults = parseAIResponse(response.text);
      
      if (analysisResults && Array.isArray(analysisResults)) {
        const updatedTasks = tasks.map(t => {
        const result = analysisResults.find((r: any) => r.id === t.id);
        if (result) {
          const updated = { 
            ...t, 
            priority: result.priority, 
            estimatedTime: result.estimatedTime, 
            category: result.category, 
            aiSuggestion: result.aiSuggestion 
          };
          
          // Update in background
          if (user && t.id && !t.id.startsWith('t-sync-')) {
            const docRef = doc(db, "users", user.uid, "tasks", t.id);
            updateDoc(docRef, { 
              priority: result.priority, 
              estimatedTime: result.estimatedTime, 
              category: result.category, 
              aiSuggestion: result.aiSuggestion 
            }).catch(console.error);
          }
          return updated;
        }
        return t;
      });

      setTasks(updatedTasks);
      showToast("Đã hoàn tất phân tích nhiệm vụ thông minh", "success");
    }
  } catch (e: any) {
      console.error("Smart analysis error:", e);
      showToast(`Lỗi phân tích thông minh: ${e.message}`, "error");
    } finally {
      setIsAnalyzing(false);
    }
  }, [user, tasks, isAnalyzing, showToast]);

  return {
    tasks,
    setTasks,
    updateTasks,
    loadTasks,
    smartAnalyzeTasks,
    calculateSmartScore,
    isAnalyzing,
    indexError
  };
}
