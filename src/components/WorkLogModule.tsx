import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { generateContentWithRetry } from '../lib/ai-utils';
import { 
  ClipboardList, 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  Clock, 
  CheckSquare,
  Save, 
  Calendar as CalendarIcon,
  ChevronRight,
  Plus,
  Trash2,
  FileText,
  Send,
  Check,
  Sparkles,
  PenTool,
  Download,
  RefreshCw,
  Zap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp, 
  orderBy, 
  limit,
  updateDoc,
  doc,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';
import { useDashboard } from '../hooks/useDashboard';
import { useTasks } from '../hooks/useTasks';
import { useToast } from '../hooks/useToast';

interface Task {
  id?: string;
  task_name: string;
  priority: 'high' | 'medium' | 'low';
  description: string;
  status: 'completed' | 'not completed';
  source?: 'fixed' | 'additional' | 'calendar';
}

const FIXED_TASKS: Task[] = [
  {
    task_name: "Kiểm tra văn bản hệ thống",
    priority: "high",
    description: "Kiểm tra các văn bản, tài liệu từ các phòng ban hoặc các bộ phận khác, đánh giá tính đầy đủ, chính xác của văn bản.",
    status: "not completed",
    source: "fixed"
  },
  {
    task_name: "Phân công xử lý văn bản",
    priority: "medium",
    description: "Dựa trên các văn bản đã nhận, phân công công việc cho các phòng ban hoặc nhân sự liên quan.",
    status: "not completed",
    source: "fixed"
  },
  {
    task_name: "Trình ký",
    priority: "medium",
    description: "Tổng hợp văn bản cần trình ký lãnh đạo, chuẩn bị tài liệu và đảm bảo các văn bản được ký đúng hạn.",
    status: "not completed",
    source: "fixed"
  },
  {
    task_name: "Viết nhật ký công việc",
    priority: "high",
    description: "Ghi lại các công việc đã thực hiện trong ngày, trạng thái hoàn thành, vấn đề phát sinh và phương hướng ngày mai.",
    status: "not completed",
    source: "fixed"
  }
];

export const WorkLogModule: React.FC = () => {
  const { user, unitId } = useAuth();
  const { showToast: toastFn } = useToast();
  const { meetings, events } = useDashboard();
  const { tasks: calendarTasksList } = useTasks(() => {});
  
  const [tasks, setTasks] = useState<Task[]>(FIXED_TASKS);
  const [additionalTasks, setAdditionalTasks] = useState<Task[]>([]);
  const [calendarTasks, setCalendarTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastLog, setLastLog] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [indexError, setIndexError] = useState<string | null>(null);
  
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoad = useRef(true);

  // Load log for selected date
  const loadLogByDate = useCallback(async (dateStr: string) => {
    if (!user) return;
    setIndexError(null);
    try {
      const targetDate = new Date(dateStr);
      targetDate.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const q = query(
        collection(db, 'work_logs'),
        where('userId', '==', user.uid),
        where('date', '>=', Timestamp.fromDate(targetDate)),
        where('date', '<', Timestamp.fromDate(nextDay)),
        limit(1)
      );
      
      let querySnapshot;
      try {
        querySnapshot = await getDocs(q);
      } catch (err: any) {
        if (err.message.includes('index')) {
          setIndexError("Yêu cầu tạo Index cho 'work_logs'.");
        }
        handleFirestoreError(err, OperationType.LIST, 'work_logs', user);
        return;
      }

      if (querySnapshot && !querySnapshot.empty) {
        const targetLog = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as any;
        setLastLog(targetLog);
        if (targetLog.tasks) setTasks(targetLog.tasks);
        if (targetLog.additionalTasks) setAdditionalTasks(targetLog.additionalTasks);
        if (targetLog.calendarTasks) setCalendarTasks(targetLog.calendarTasks);
        if (targetLog.notes) setNotes(targetLog.notes);
      } else {
        // Reset to defaults if no log found for this date
        setLastLog(null);
        setTasks(FIXED_TASKS);
        setAdditionalTasks([]);
        setNotes('');
      }
    } catch (error) {
      console.error("Error loading log for date:", error);
    }
  }, [user]);

  useEffect(() => {
    loadLogByDate(selectedDate);
  }, [selectedDate, loadLogByDate]);

  // Extract tasks from calendar for selected date
  useEffect(() => {
    const targetDateStr = selectedDate;
    
    const todayMeetings = meetings.filter(m => m.date === targetDateStr).map(m => ({
      task_name: `Họp: ${m.name}`,
      priority: 'high' as const,
      description: `Thời gian: ${m.time} | Địa điểm: ${m.location}`,
      status: 'not completed' as const,
      source: 'calendar' as const
    }));

    const todayEvents = events.filter(e => e.date === targetDateStr).map(e => ({
      task_name: `Sự kiện: ${e.name}`,
      priority: 'medium' as const,
      description: `Loại: ${e.type}`,
      status: 'not completed' as const,
      source: 'calendar' as const
    }));

    const todayCalendarTasks = calendarTasksList.filter(t => t.deadline === targetDateStr).map(t => ({
      task_name: `Nhiệm vụ: ${t.title}`,
      priority: t.priority as 'high' | 'medium' | 'low',
      description: `Trạng thái: ${t.status}`,
      status: t.status === 'Completed' ? 'completed' as const : 'not completed' as const,
      source: 'calendar' as const
    }));

    const allCalendarTasks = [...todayMeetings, ...todayEvents, ...todayCalendarTasks];
    
    // Only update if no existing log OR if we are merging (simple version: just set if no lastLog)
    if (!lastLog) {
      setCalendarTasks(allCalendarTasks);
    }
  }, [meetings, events, calendarTasksList, selectedDate, lastLog]);

  // Auto-save logic
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      handleAutoSave();
    }, 5000); // Auto-save after 5 seconds of inactivity

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [tasks, additionalTasks, calendarTasks, notes]);

  const handleAutoSave = async () => {
    if (!user || isSaving) return;
    // Only auto-save if it's today's log
    const todayStr = new Date().toISOString().split('T')[0];
    if (selectedDate !== todayStr) return;
    
    setIsAutoSaving(true);
    try {
      await handleSaveLog(true);
    } finally {
      setIsAutoSaving(false);
    }
  };

  const refreshCalendarTasks = () => {
    const targetDateStr = selectedDate;
    
    const todayMeetings = meetings.filter(m => m.date === targetDateStr).map(m => ({
      task_name: `Họp: ${m.name}`,
      priority: 'high' as const,
      description: `Thời gian: ${m.time} | Địa điểm: ${m.location}`,
      status: 'not completed' as const,
      source: 'calendar' as const
    }));

    const todayEvents = events.filter(e => e.date === targetDateStr).map(e => ({
      task_name: `Sự kiện: ${e.name}`,
      priority: 'medium' as const,
      description: `Loại: ${e.type}`,
      status: 'not completed' as const,
      source: 'calendar' as const
    }));

    const todayCalendarTasks = calendarTasksList.filter(t => t.deadline === targetDateStr).map(t => ({
      task_name: `Nhiệm vụ: ${t.title}`,
      priority: t.priority as 'high' | 'medium' | 'low',
      description: `Trạng thái: ${t.status}`,
      status: t.status === 'Completed' ? 'completed' as const : 'not completed' as const,
      source: 'calendar' as const
    }));

    setCalendarTasks([...todayMeetings, ...todayEvents, ...todayCalendarTasks]);
    toastFn?.("Đã cập nhật nhiệm vụ từ lịch", "success");
  };

  const deleteLog = async () => {
    if (!lastLog?.id || !user) return;
    
    if (!window.confirm("Bạn có chắc chắn muốn xóa nhật ký ngày này?")) return;
    
    setIsSaving(true);
    try {
      await deleteDoc(doc(db, 'work_logs', lastLog.id));
      setLastLog(null);
      setTasks(FIXED_TASKS);
      setAdditionalTasks([]);
      setCalendarTasks([]);
      setNotes('');
      toastFn?.("Đã xóa nhật ký thành công", "success");
    } catch (error) {
      console.error("Error deleting log:", error);
      toastFn?.("Lỗi khi xóa nhật ký", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTaskStatus = (index: number, type: 'fixed' | 'additional' | 'calendar' = 'fixed') => {
    if (type === 'additional') {
      const newTasks = [...additionalTasks];
      newTasks[index].status = newTasks[index].status === 'completed' ? 'not completed' : 'completed';
      setAdditionalTasks(newTasks);
    } else if (type === 'calendar') {
      const newTasks = [...calendarTasks];
      newTasks[index].status = newTasks[index].status === 'completed' ? 'not completed' : 'completed';
      setCalendarTasks(newTasks);
    } else {
      const newTasks = [...tasks];
      newTasks[index].status = newTasks[index].status === 'completed' ? 'not completed' : 'completed';
      setTasks(newTasks);
    }
  };

  const handleSaveLog = async (isSilent = false) => {
    if (!user) return;
    
    if (!isSilent) setIsSaving(true);
    try {
      const logData = {
        userId: user.uid,
        unitId: unitId || '',
        date: lastLog?.date || Timestamp.fromDate(new Date(selectedDate)),
        tasks,
        additionalTasks,
        calendarTasks,
        notes,
        updatedAt: serverTimestamp()
      };

      if (lastLog?.id) {
        try {
          await updateDoc(doc(db, 'work_logs', lastLog.id), logData);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `work_logs/${lastLog.id}`, user);
        }
      } else {
        try {
          const docRef = await addDoc(collection(db, 'work_logs'), logData);
          setLastLog({ id: docRef.id, ...logData });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'work_logs', user);
        }
      }
      
      if (!isSilent) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Error saving work log:", error);
      if (!isSilent) toastFn?.("Lỗi lưu nhật ký", "error");
    } finally {
      if (!isSilent) setIsSaving(false);
    }
  };

  const exportLogs = async (range: 'day' | 'month' | 'custom', startDate?: Date, endDate?: Date) => {
    if (!user) {
      return;
    }
    
    setIndexError(null);
    try {
      const logsRef = collection(db, 'work_logs');
      const q = query(logsRef, where('userId', '==', user.uid));
      
      const querySnapshot = await getDocs(q);
      let logs = querySnapshot.docs.map(doc => doc.data()) as any[];

      if (range === 'day') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        logs = logs.filter(log => {
          if (!log.date) return false;
          const logDate = log.date.toDate ? log.date.toDate() : new Date(log.date);
          return logDate >= today;
        });
      } else if (range === 'month') {
        const firstDay = new Date();
        firstDay.setDate(1);
        firstDay.setHours(0, 0, 0, 0);
        logs = logs.filter(log => {
          if (!log.date) return false;
          const logDate = log.date.toDate ? log.date.toDate() : new Date(log.date);
          return logDate >= firstDay;
        });
      } else if (startDate && endDate) {
        logs = logs.filter(log => {
          if (!log.date) return false;
          const logDate = log.date.toDate ? log.date.toDate() : new Date(log.date);
          return logDate >= startDate && logDate <= endDate;
        });
      }

      // Sort logs in memory to avoid requiring a descending index
      logs.sort((a, b) => {
        const dateA = a.date?.toMillis ? a.date.toMillis() : new Date(a.date).getTime();
        const dateB = b.date?.toMillis ? b.date.toMillis() : new Date(b.date).getTime();
        return dateB - dateA;
      });

      if (logs.length === 0) {
        toastFn?.("Không có dữ liệu nhật ký trong khoảng thời gian này", "info");
        return;
      }

      // Generate CSV
      let csvContent = "\uFEFF"; // BOM for UTF-8
      csvContent += "Ngày,Nhiệm vụ cố định,Nhiệm vụ phát sinh,Nhiệm vụ lịch,Ghi chú\n";

      logs.forEach(log => {
        const date = log.date instanceof Timestamp ? log.date.toDate().toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN');
        const fixed = (log.tasks || []).map((t: any) => `[${t.status === 'completed' ? 'x' : ' '}] ${t.task_name}`).join('; ');
        const additional = (log.additionalTasks || []).map((t: any) => `[${t.status === 'completed' ? 'x' : ' '}] ${t.task_name}`).join('; ');
        const calendar = (log.calendarTasks || []).map((t: any) => `[${t.status === 'completed' ? 'x' : ' '}] ${t.task_name}`).join('; ');
        const notesEscaped = `"${(log.notes || '').replace(/"/g, '""')}"`;
        
        csvContent += `${date},"${fixed}","${additional}","${calendar}",${notesEscaped}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `nhat_ky_cong_viec_${range}_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toastFn?.("Đã xuất file thành công", "success");
    } catch (error: any) {
      if (error.message.includes('index')) {
        setIndexError("Yêu cầu tạo Index cho 'work_logs' để xuất file.");
      }
      console.error("Export error:", error);
      toastFn?.("Lỗi khi xuất file", "error");
    }
  };

  const addNewTask = () => {
    setAdditionalTasks([
      ...additionalTasks,
      {
        task_name: "",
        priority: "low",
        description: "",
        status: "not completed",
        source: "additional"
      }
    ]);
  };

  const removeAdditionalTask = (index: number) => {
    setAdditionalTasks(additionalTasks.filter((_, i) => i !== index));
  };

  const updateAdditionalTask = (index: number, field: keyof Task, value: any) => {
    const newTasks = [...additionalTasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setAdditionalTasks(newTasks);
  };

  const generateSmartLog = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    
    try {
      const allTasks = [
        ...tasks.map(t => `- [${t.status === 'completed' ? 'X' : ' '}] ${t.task_name}: ${t.description}`),
        ...additionalTasks.map(t => `- [${t.status === 'completed' ? 'X' : ' '}] ${t.task_name}: ${t.description}`),
        ...calendarTasks.map(t => `- [${t.status === 'completed' ? 'X' : ' '}] ${t.task_name}: ${t.description}`)
      ].join('\n');

      const prompt = `Bạn là một trợ lý hành chính chuyên nghiệp. Hãy giúp tôi viết một bản nhật ký công việc chi tiết, chuyên nghiệp và súc tích dựa trên các dữ liệu sau:
      
      DANH SÁCH NHIỆM VỤ:
      ${allTasks}
      
      GHI CHÚ HIỆN TẠI:
      ${notes || "Chưa có ghi chú cụ thể."}
      
      YÊU CẦU:
      1. Tổng hợp các công việc đã hoàn thành một cách chuyên nghiệp.
      2. Chỉ ra các vấn đề còn tồn đọng hoặc phát sinh.
      3. Đề xuất phương hướng cụ thể cho ngày làm việc tiếp theo.
      4. Sử dụng văn phong hành chính, chuẩn mực.
      5. Trình bày rõ ràng, có tiêu đề.
      
      Hãy trả về nội dung nhật ký hoàn chỉnh.`;

      const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }]
      });

      const generatedText = response.text || '';
      if (generatedText) {
        setNotes(generatedText);
        toastFn?.("Đã tự động sinh nhật ký từ dữ liệu công việc", "success");
      }
    } catch (error) {
      console.error("Error generating smart log:", error);
      toastFn?.("Lỗi khi tự động sinh nhật ký", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length + 
                    additionalTasks.filter(t => t.status === 'completed').length +
                    calendarTasks.filter(t => t.status === 'completed').length;
  const totalCount = tasks.length + additionalTasks.length + calendarTasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {indexError && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 shadow-sm"
        >
          <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-amber-900 mb-1">Yêu cầu cấu hình Firestore</h3>
            <p className="text-xs text-amber-700 leading-relaxed">
              {indexError} Vui lòng kiểm tra console để lấy link tạo Index.
            </p>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20">
              <ClipboardList size={28} />
            </div>
            NHẬT KÝ CÔNG VIỆC
          </h2>
          <p className="text-slate-500 font-medium mt-1 flex items-center gap-2">
            <CalendarIcon size={14} />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none p-0 font-bold text-slate-600 focus:ring-0 cursor-pointer hover:text-emerald-600 transition-colors"
            />
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {isAutoSaving && (
            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 animate-pulse">
              <RefreshCw size={10} className="animate-spin" />
              Đang tự động lưu...
            </div>
          )}
          
          <div className="flex items-center bg-white rounded-2xl border border-slate-200 p-1 shadow-sm">
            <button 
              onClick={() => exportLogs('day')}
              className="p-2 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors flex items-center gap-2 text-xs font-bold"
              title="Xuất ngày hôm nay"
            >
              <Download size={14} /> Ngày
            </button>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <button 
              onClick={() => exportLogs('month')}
              className="p-2 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors flex items-center gap-2 text-xs font-bold"
              title="Xuất tháng này"
            >
              <Download size={14} /> Tháng
            </button>
          </div>

          <div className="flex items-center gap-3">
            {lastLog && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={deleteLog}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm text-rose-600 bg-rose-50 hover:bg-rose-100 transition-all border border-rose-200"
              >
                <Trash2 size={18} />
                <span className="hidden md:inline uppercase tracking-tight">Xóa</span>
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSaveLog()}
              disabled={isSaving}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg",
                isSaving 
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                  : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20"
              )}
            >
              {isSaving ? <Clock className="animate-spin" size={18} /> : <Save size={18} />}
              {lastLog ? 'CẬP NHẬT NHẬT KÝ' : 'LƯU NHẬT KÝ'}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
              <CheckCircle2 size={16} />
            </div>
            <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">Tiến độ công việc</span>
          </div>
          <span className="text-sm font-black text-emerald-600">{Math.round(progress)}%</span>
        </div>
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
          />
        </div>
        <div className="flex justify-between mt-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {completedCount} / {totalCount} nhiệm vụ hoàn thành
          </p>
          {progress === 100 && (
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
              <Sparkles size={10} /> Tuyệt vời! Bạn đã hoàn thành tất cả
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tasks List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Clock size={20} className="text-emerald-500" />
              Nhiệm vụ cố định hàng ngày
            </h3>
          </div>

          <div className="space-y-3">
            {tasks.map((task, index) => (
              <motion.div
                key={`fixed-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "group p-4 rounded-2xl border transition-all duration-300 cursor-pointer",
                  task.status === 'completed'
                    ? "bg-emerald-50/50 border-emerald-100 shadow-sm"
                    : "bg-white border-slate-200/60 hover:border-emerald-200 hover:shadow-md"
                )}
                style={{
                  borderLeft: task.priority === 'high' ? '4px solid #ef4444' : 
                              task.priority === 'medium' ? '4px solid #f59e0b' : 
                              '4px solid #10b981'
                }}
                onClick={() => toggleTaskStatus(index, 'fixed')}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "mt-1 transition-colors",
                    task.status === 'completed' ? "text-emerald-500" : "text-slate-300 group-hover:text-emerald-400"
                  )}>
                    {task.status === 'completed' ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={cn(
                        "font-bold text-sm transition-all",
                        task.status === 'completed' ? "text-slate-500 line-through" : "text-slate-900"
                      )}>
                        {task.task_name}
                      </h4>
                      <span className={cn(
                        "text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter flex items-center gap-1",
                        task.priority === 'high' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                      )}>
                        {task.priority === 'high' ? <AlertCircle size={10} /> : <Clock size={10} />}
                        {task.priority === 'high' ? 'Ưu tiên cao' : 'Trung bình'}
                      </span>
                    </div>
                    <p className={cn(
                      "text-xs leading-relaxed",
                      task.status === 'completed' ? "text-slate-400" : "text-slate-500"
                    )}>
                      {task.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Calendar Tasks */}
          <div className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CalendarIcon size={20} className="text-purple-500" />
                Nhiệm vụ từ lịch làm việc
              </h3>
              <button 
                onClick={refreshCalendarTasks}
                className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                title="Cập nhật từ lịch"
              >
                <Zap size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {calendarTasks.map((task, index) => (
                <motion.div
                  key={`calendar-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "group p-4 rounded-2xl border transition-all duration-300 cursor-pointer",
                    task.status === 'completed'
                      ? "bg-purple-50/50 border-purple-100 shadow-sm"
                      : "bg-white border-slate-200/60 hover:border-purple-200 hover:shadow-md"
                  )}
                  style={{
                    borderLeft: task.priority === 'high' ? '4px solid #ef4444' : 
                                task.priority === 'medium' ? '4px solid #f59e0b' : 
                                '4px solid #10b981'
                  }}
                  onClick={() => toggleTaskStatus(index, 'calendar')}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "mt-1 transition-colors",
                      task.status === 'completed' ? "text-purple-500" : "text-slate-300 group-hover:text-purple-400"
                    )}>
                      {task.status === 'completed' ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={cn(
                          "font-bold text-sm transition-all",
                          task.status === 'completed' ? "text-slate-500 line-through" : "text-slate-900"
                        )}>
                          {task.task_name}
                        </h4>
                        <span className={cn(
                          "text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter flex items-center gap-1",
                          task.priority === 'high' ? "bg-red-100 text-red-600" : "bg-purple-100 text-purple-600"
                        )}>
                          {task.priority === 'high' ? <AlertCircle size={10} /> : <Clock size={10} />}
                          {task.priority === 'high' ? 'Ưu tiên cao' : 'Lịch công tác'}
                        </span>
                      </div>
                      <p className={cn(
                        "text-xs leading-relaxed",
                        task.status === 'completed' ? "text-slate-400" : "text-slate-500"
                      )}>
                        {task.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {calendarTasks.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-3xl">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Không có nhiệm vụ từ lịch</p>
                </div>
              )}
            </div>
          </div>

          {/* Additional Tasks */}
          <div className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Plus size={20} className="text-blue-500" />
                Nhiệm vụ phát sinh
              </h3>
              <button 
                onClick={addNewTask}
                className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="space-y-3">
              {additionalTasks.map((task, index) => (
                <motion.div
                  key={`additional-${index}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm"
                  style={{
                    borderLeft: task.priority === 'high' ? '4px solid #ef4444' : 
                                task.priority === 'medium' ? '4px solid #f59e0b' : 
                                '4px solid #10b981'
                  }}
                >
                  <div className="flex items-start gap-3">
                    <button 
                      onClick={() => toggleTaskStatus(index, 'additional')}
                      className={cn(
                        "mt-1 transition-colors",
                        task.status === 'completed' ? "text-emerald-500" : "text-slate-300 hover:text-emerald-400"
                      )}
                    >
                      {task.status === 'completed' ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                    </button>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <input 
                          type="text"
                          placeholder="Tên nhiệm vụ..."
                          value={task.task_name}
                          onChange={(e) => updateAdditionalTask(index, 'task_name', e.target.value)}
                          className="flex-1 bg-transparent border-none p-0 font-bold text-sm focus:ring-0 placeholder:text-slate-300"
                        />
                        <div className="flex items-center gap-1">
                          {(['high', 'medium', 'low'] as const).map((p) => (
                            <button
                              key={p}
                              onClick={() => updateAdditionalTask(index, 'priority', p)}
                              className={cn(
                                "p-1 rounded-md transition-all",
                                task.priority === p 
                                  ? p === 'high' ? "bg-red-100 text-red-600" : p === 'medium' ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                                  : "bg-slate-50 text-slate-300 hover:text-slate-400"
                              )}
                              title={p === 'high' ? 'Cao' : p === 'medium' ? 'Trung bình' : 'Thấp'}
                            >
                              {p === 'high' ? <AlertCircle size={12} /> : p === 'medium' ? <Clock size={12} /> : <CheckSquare size={12} />}
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea 
                        placeholder="Mô tả chi tiết..."
                        value={task.description}
                        onChange={(e) => updateAdditionalTask(index, 'description', e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs focus:ring-1 focus:ring-blue-500/20 placeholder:text-slate-400 min-h-[60px] resize-none"
                      />
                    </div>
                    <button 
                      onClick={() => removeAdditionalTask(index)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
              
              {additionalTasks.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-3xl">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Không có nhiệm vụ phát sinh</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes & Summary */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-900/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <FileText size={64} />
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PenTool size={20} className="text-emerald-400" />
                  Ghi chú & Tổng kết
                </div>
                <button
                  onClick={generateSmartLog}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-emerald-500/30 disabled:opacity-50"
                  title="Tự động sinh nhật ký từ dữ liệu công việc"
                >
                  {isGenerating ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  TỰ SINH AI
                </button>
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">
                Vấn đề phát sinh & Phương hướng
              </p>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ghi lại các vấn đề phát sinh trong ngày và phương hướng giải quyết cho ngày mai..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-h-[300px] resize-none leading-relaxed transition-all"
              />
            </div>
          </div>

          <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100">
            <h4 className="text-sm font-bold text-emerald-800 mb-2 flex items-center gap-2">
              <AlertCircle size={16} />
              Mẹo làm việc hiệu quả
            </h4>
            <p className="text-xs text-emerald-700 leading-relaxed">
              Hãy cố gắng hoàn thành các nhiệm vụ có <strong>ưu tiên cao</strong> vào đầu ngày khi năng lượng còn dồi dào nhất. Đừng quên ghi lại các vấn đề phát sinh để có kế hoạch tốt hơn cho ngày mai.
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm"
          >
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <Check size={14} />
            </div>
            Nhật ký đã được lưu thành công!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
