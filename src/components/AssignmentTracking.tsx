import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Zap,
  Copy,
  RefreshCw,
  ChevronRight,
  User,
  Plus,
  Trash2,
  Save,
  Flag,
  Settings,
  X,
  Check,
  Search,
  ClipboardList,
  Bell
} from 'lucide-react';
import { generateContentWithRetry } from '../lib/ai-utils';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Task } from '../constants';
import { db } from '../lib/firebase';
import { collection, query, getDocs, addDoc, setDoc, deleteDoc, doc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useNotifications } from '../hooks/useNotifications';

interface ViceChiefTask {
  id?: string;
  title: string;
  description?: string;
  deadline?: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
  progress: number; // 0-100
  viceChiefId: 1 | 2;
  createdAt?: any;
}

interface UserInfo {
  id: string;
  displayName?: string;
  email: string;
  photoURL?: string;
  role?: string;
}

interface ViceChiefAssignment {
  id: string;
  userId: string;
  displayName: string;
  photoURL: string;
}

interface AssignmentTrackingProps {
  tasks: Task[];
  isAdmin?: boolean;
}

export const AssignmentTracking: React.FC<AssignmentTrackingProps> = ({ tasks: systemTasks, isAdmin = false }) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [viceChief1Tasks, setViceChief1Tasks] = useState<ViceChiefTask[]>([]);
  const [viceChief2Tasks, setViceChief2Tasks] = useState<ViceChiefTask[]>([]);
  const [isLoadingViceTasks, setIsLoadingViceTasks] = useState(true);
  
  const [viceChief1Info, setViceChief1Info] = useState<ViceChiefAssignment | null>(null);
  const [viceChief2Info, setViceChief2Info] = useState<ViceChiefAssignment | null>(null);
  
  const [newTaskTitle1, setNewTaskTitle1] = useState('');
  const [newTaskDeadline1, setNewTaskDeadline1] = useState('');
  const [newTaskDescription1, setNewTaskDescription1] = useState('');
  
  const [newTaskTitle2, setNewTaskTitle2] = useState('');
  const [newTaskDeadline2, setNewTaskDeadline2] = useState('');
  const [newTaskDescription2, setNewTaskDescription2] = useState('');

  const [filter1, setFilter1] = useState<'all' | 'completed' | 'overdue' | 'in_progress' | 'pending'>('all');
  const [search1, setSearch1] = useState('');
  
  const [filter2, setFilter2] = useState<'all' | 'completed' | 'overdue' | 'in_progress' | 'pending'>('all');
  const [search2, setSearch2] = useState('');

  const [taskAdvice, setTaskAdvice] = useState<Record<string, string>>({});
  const [isGettingAdvice, setIsGettingAdvice] = useState<Record<string, boolean>>({});

  const [executiveSummary, setExecutiveSummary] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [selectingFor, setSelectingFor] = useState<1 | 2 | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  const { addNotification } = useNotifications();

  const sendReminder = (task: ViceChiefTask, viceChiefName: string) => {
    addNotification({
      title: 'Nhắc nhở Nhiệm vụ Khẩn',
      description: `Đồng chí ${viceChiefName} lưu ý: Nhiệm vụ "${task.title}" đang cần được xử lý gấp.`,
      type: 'warning',
    });
    alert(`Đã gửi thông báo nhắc nhở đến ${viceChiefName}`);
  };

  const getMetrics = () => {
    const total = systemTasks.length + viceChief1Tasks.length + viceChief2Tasks.length;
    let completed = 0;
    let overdue = 0;
    let critical = 0;

    const today = new Date();
    today.setHours(0,0,0,0);

    const checkOverdue = (deadline?: string, isCompleted?: boolean) => {
      if (!deadline || isCompleted) return false;
      return new Date(deadline) < today;
    };

    // System Tasks
    systemTasks.forEach(t => {
      if (t.status === 'Completed') completed++;
      if (checkOverdue(t.deadline, t.status === 'Completed')) overdue++;
      if (t.priority === 'high' && t.status !== 'Completed') critical++;
    });

    // Vice Chief 1 Tasks
    viceChief1Tasks.forEach(t => {
      if (t.progress === 100) completed++;
      if (checkOverdue(t.deadline, t.progress === 100)) overdue++;
      if ((t.importance === 'high' || t.importance === 'critical') && t.progress !== 100) critical++;
    });

    // Vice Chief 2 Tasks
    viceChief2Tasks.forEach(t => {
      if (t.progress === 100) completed++;
      if (checkOverdue(t.deadline, t.progress === 100)) overdue++;
      if ((t.importance === 'high' || t.importance === 'critical') && t.progress !== 100) critical++;
    });

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, overdue, critical, completionRate };
  };

  const loadData = async () => {
    setIsLoadingViceTasks(true);
    try {
      // Load Tasks
      const q = query(collection(db, 'vice_chief_tasks'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ViceChiefTask[];
      
      setViceChief1Tasks(allTasks.filter(t => t.viceChiefId === 1));
      setViceChief2Tasks(allTasks.filter(t => t.viceChiefId === 2));

      // Load Assignments
      const snapshotAssignments = await getDocs(collection(db, 'vice_chief_assignments'));
      const assignments: Record<string, ViceChiefAssignment> = {};
      snapshotAssignments.forEach(doc => {
        assignments[doc.id] = { id: doc.id, ...doc.data() } as ViceChiefAssignment;
      });
      
      setViceChief1Info(assignments['vice_chief_1'] || { id: 'vice_chief_1', userId: 'default_1', displayName: 'Lê Thị Kiều Oanh', photoURL: '' });
      setViceChief2Info(assignments['vice_chief_2'] || { id: 'vice_chief_2', userId: 'default_2', displayName: 'Trần Quốc Bảo', photoURL: '' });

      // Load Users for selection
      const snapshotUsers = await getDocs(collection(db, 'users'));
      const usersList = snapshotUsers.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserInfo[];
      setUsers(usersList);

    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setIsLoadingViceTasks(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveAssignment = async (viceChiefId: 1 | 2, user: UserInfo) => {
    try {
      const assignmentId = `vice_chief_${viceChiefId}`;
      const assignmentData = {
        userId: user.id,
        displayName: user.displayName || user.email,
        photoURL: user.photoURL || ''
      };
      
      await updateDoc(doc(db, 'vice_chief_assignments', assignmentId), assignmentData).catch(async () => {
        // If doc doesn't exist, create it
        await setDoc(doc(db, 'vice_chief_assignments', assignmentId), assignmentData);
      });

      if (viceChiefId === 1) setViceChief1Info({ id: assignmentId, ...assignmentData });
      else setViceChief2Info({ id: assignmentId, ...assignmentData });
      
      setShowSettingsModal(false);
      setSelectingFor(null);
    } catch (err) {
      console.error("Error saving assignment:", err);
    }
  };

  const addViceTask = async (viceChiefId: 1 | 2) => {
    const title = viceChiefId === 1 ? newTaskTitle1 : newTaskTitle2;
    const deadline = viceChiefId === 1 ? newTaskDeadline1 : newTaskDeadline2;
    const description = viceChiefId === 1 ? newTaskDescription1 : newTaskDescription2;
    
    if (!title.trim()) return;

    try {
      const newTask: Omit<ViceChiefTask, 'id'> = {
        title: title.trim(),
        description: description.trim(),
        deadline: deadline,
        importance: 'medium',
        progress: 0,
        viceChiefId,
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'vice_chief_tasks'), newTask);
      if (viceChiefId === 1) {
        setNewTaskTitle1('');
        setNewTaskDeadline1('');
        setNewTaskDescription1('');
      } else {
        setNewTaskTitle2('');
        setNewTaskDeadline2('');
        setNewTaskDescription2('');
      }
      loadData();
    } catch (err) {
      console.error("Error adding task:", err);
    }
  };

  const deleteViceTask = async (id: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'vice_chief_tasks', id));
      loadData();
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  const updateViceTask = async (id: string, updates: Partial<ViceChiefTask>) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'vice_chief_tasks', id), updates);
      loadData();
    } catch (err) {
      console.error("Error updating task:", err);
    }
  };

  const getTaskStatus = (task: ViceChiefTask) => {
    if (task.progress === 100) return { label: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={14} /> };
    if (task.deadline && new Date(task.deadline) < new Date(new Date().setHours(0,0,0,0))) {
      return { label: 'Quá hạn', color: 'bg-red-100 text-red-700 border-red-200', icon: <AlertCircle size={14} /> };
    }
    if (task.progress > 0) return { label: 'Đang làm', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <RefreshCw size={14} className="animate-spin" /> };
    return { label: 'Chờ xử lý', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: <Clock size={14} /> };
  };

  const getAdviceForTask = async (task: ViceChiefTask) => {
    if (!task.id) return;
    
    setIsGettingAdvice(prev => ({ ...prev, [task.id!]: true }));
    try {
      const prompt = `Bạn là Trợ lý AI chuyên môn cấp cao. Hãy phân tích nhiệm vụ sau và đưa ra tư vấn chỉ đạo thực tế, sắc bén:
      Tên nhiệm vụ: ${task.title}
      Mô tả: ${task.description || 'Không có'}
      Thời hạn: ${task.deadline || 'Không có'}
      Tiến độ hiện tại: ${task.progress}%
      Mức độ ưu tiên: ${task.importance}
      
      Yêu cầu định dạng Markdown gồm 3 phần:
      1. **Đánh giá rủi ro**: (Nhanh chóng nhận diện nguy cơ chậm trễ hoặc sai sót)
      2. **Chỉ đạo cụ thể**: (Ai cần làm gì, mốc thời gian nào, yêu cầu chất lượng ra sao)
      3. **Nguồn lực & Phối hợp**: (Cần phối hợp với ai, sử dụng tài nguyên nào)
      
      Văn phong: Ngắn gọn, đanh thép, rõ ràng, mang tính thực thi cao.`;
      
      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
      });
      
      setTaskAdvice(prev => ({ ...prev, [task.id!]: response.text }));
    } catch (error) {
      console.error("Error getting advice:", error);
    } finally {
      setIsGettingAdvice(prev => ({ ...prev, [task.id!]: false }));
    }
  };

  const filterTasks = (tasks: ViceChiefTask[], filter: string, search: string) => {
    return tasks.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                           (t.description || '').toLowerCase().includes(search.toLowerCase());
      
      if (!matchesSearch) return false;
      
      if (filter === 'all') return true;
      if (filter === 'completed') return t.progress === 100;
      if (filter === 'overdue') return t.deadline && new Date(t.deadline) < new Date(new Date().setHours(0,0,0,0)) && t.progress < 100;
      if (filter === 'in_progress') return t.progress > 0 && t.progress < 100;
      if (filter === 'pending') return t.progress === 0;
      
      return true;
    });
  };

  const runAnalysis = async () => {
    const allTasksForAnalysis = [
      ...systemTasks.map(t => ({
        "Công việc": t.title,
        "Người thực hiện": t.assignee,
        "Thời hạn": t.deadline,
        "Trạng thái": t.status,
        "Mức độ ưu tiên": t.priority,
        "Nguồn": "Hệ thống"
      })),
      ...viceChief1Tasks.map(t => ({
        "Công việc": t.title,
        "Mô tả": t.description || "Không có",
        "Người thực hiện": viceChief1Info?.displayName || "Phó Văn phòng 1",
        "Thời hạn": t.deadline || "Chưa xác định",
        "Trạng thái": t.progress === 100 ? "Completed" : (t.progress > 0 ? "In Progress" : "Pending"),
        "Tiến độ": `${t.progress}%`,
        "Mức độ ưu tiên": t.importance,
        "Nguồn": "Phó VP 1"
      })),
      ...viceChief2Tasks.map(t => ({
        "Công việc": t.title,
        "Mô tả": t.description || "Không có",
        "Người thực hiện": viceChief2Info?.displayName || "Phó Văn phòng 2",
        "Thời hạn": t.deadline || "Chưa xác định",
        "Trạng thái": t.progress === 100 ? "Completed" : (t.progress > 0 ? "In Progress" : "Pending"),
        "Tiến độ": `${t.progress}%`,
        "Mức độ ưu tiên": t.importance,
        "Nguồn": "Phó VP 2"
      }))
    ];

    if (allTasksForAnalysis.length === 0) {
      setError("Không có dữ liệu công việc để phân tích.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    
    try {
      const taskDataString = JSON.stringify(allTasksForAnalysis, null, 2);

      const prompt = `Bạn là Chuyên gia Tham mưu Điều hành cấp cao cho Lãnh đạo (Chánh Văn phòng/Thường trực).
Nhiệm vụ của bạn là phân tích toàn bộ dữ liệu công việc hiện tại và đưa ra các KẾT LUẬN CHỈ ĐẠO CỤ THỂ, CHẮC CHẮN VÀ THỰC TẾ.

Dữ liệu đầu vào (JSON):
${taskDataString}

YÊU CẦU BÁO CÁO (Trình bày bằng Markdown chuyên nghiệp):

# BÁO CÁO ĐÁNH GIÁ VÀ CHỈ ĐẠO ĐIỀU HÀNH TỔNG THỂ

## 1. NHẬN ĐỊNH TÌNH HÌNH CHUNG
- Đánh giá ngắn gọn, đi thẳng vào vấn đề về tổng quan tiến độ và hiệu suất.
- Chỉ ra ngay mảng việc/cá nhân đang quá tải hoặc chậm trễ.

## 2. CẢNH BÁO RỦI RO & ĐIỂM NGHẼN (CỤ THỂ)
- Liệt kê các nhiệm vụ (kèm tên) có nguy cơ vỡ tiến độ cao nhất.
- Phân tích nguyên nhân cốt lõi (thiếu nguồn lực, phối hợp kém, hay do tính chất phức tạp).

## 3. KẾT LUẬN CHỈ ĐẠO THỰC THI (QUAN TRỌNG NHẤT)
Đưa ra các mệnh lệnh điều hành rõ ràng, dứt khoát. Cấu trúc mỗi chỉ đạo:
- **Nhiệm vụ/Vấn đề**: [Tên vấn đề]
- **Giao việc**: [Ai chịu trách nhiệm chính]
- **Hành động cụ thể**: [Phải làm chính xác việc gì]
- **Thời hạn chót (Deadline cứng)**: [Thời gian]
- **Yêu cầu kết quả**: [Sản phẩm đầu ra phải đạt tiêu chuẩn gì]

## 4. ĐỀ XUẤT CẢI TIẾN CẤU TRÚC VẬN HÀNH
- Đề xuất 1-2 thay đổi về quy trình, cách thức phối hợp hoặc phân bổ lại nguồn lực để giải quyết triệt để các điểm nghẽn.

Văn phong: Khách quan, sắc sảo, mang tính quyết định, không dùng từ ngữ chung chung (như "cần cố gắng", "nên chú ý"). Phải chỉ rõ "Làm gì", "Ai làm", "Bao giờ xong".`;

      const result = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }]
      });

      setAnalysis(result.text || "Không thể tạo phân tích.");
    } catch (err: any) {
      console.error("Analysis error:", err);
      setError("Đã xảy ra lỗi khi phân tích dữ liệu bằng AI. Vui lòng thử lại.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateExecutiveSummary = async () => {
    const metrics = getMetrics();
    if (metrics.total === 0) return;

    setIsGeneratingSummary(true);
    try {
      const prompt = `Bạn là Trợ lý AI Điều hành cấp cao. Dựa trên các số liệu sau, hãy viết MỘT ĐOẠN VĂN NGẮN (tối đa 3 câu) tóm tắt tình hình và đưa ra 1 cảnh báo/khuyến nghị quan trọng nhất.
      Tổng số nhiệm vụ: ${metrics.total}
      Đã hoàn thành: ${metrics.completed} (${metrics.completionRate}%)
      Quá hạn: ${metrics.overdue}
      Khẩn cấp/Quan trọng đang chờ: ${metrics.critical}
      
      Văn phong: Lãnh đạo, dứt khoát, đi thẳng vào trọng tâm. Không dùng gạch đầu dòng.`;

      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
      });
      
      setExecutiveSummary(response.text || '');
    } catch (error) {
      console.error("Error generating summary:", error);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  useEffect(() => {
    if (systemTasks.length > 0 && !analysis) {
      runAnalysis();
    }
    if ((systemTasks.length > 0 || viceChief1Tasks.length > 0 || viceChief2Tasks.length > 0) && !executiveSummary) {
      generateExecutiveSummary();
    }
  }, [systemTasks, viceChief1Tasks, viceChief2Tasks]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(analysis);
    alert("Đã sao chép báo cáo vào bộ nhớ tạm.");
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Chọn Phó Văn phòng</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Cột {selectingFor}</p>
              </div>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="p-2 hover:bg-white rounded-2xl transition-all text-slate-400 hover:text-slate-600 shadow-sm"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Tìm kiếm cán bộ..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                />
              </div>
              
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {users
                  .filter(u => 
                    u.displayName?.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
                    u.email?.toLowerCase().includes(userSearchTerm.toLowerCase())
                  )
                  .map(user => (
                    <button
                      key={user.id}
                      onClick={() => saveAssignment(selectingFor!, user)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all group border border-transparent hover:border-slate-100"
                    >
                      <div className="relative">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="" className="w-10 h-10 rounded-xl object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-sm">
                            {user.displayName?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                          <Check size={10} className="text-blue-600" />
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-slate-900">{user.displayName || 'Chưa cập nhật'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user.role || 'Cán bộ'}</p>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-10 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-200 ring-8 ring-indigo-50 transition-transform hover:rotate-3">
              <ClipboardList size={36} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Theo dõi phân công</h1>
                <div className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-100">
                  Live System
                </div>
              </div>
              <p className="text-slate-500 font-medium flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                Trợ lý Điều hành Thường trực Đảng ủy/UBND • {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={runAnalysis}
              disabled={isAnalyzing || (systemTasks.length === 0 && viceChief1Tasks.length === 0 && viceChief2Tasks.length === 0)}
              className={cn(
                "flex items-center gap-4 px-10 py-4 rounded-2xl font-black text-sm transition-all shadow-2xl active:scale-95 group",
                isAnalyzing 
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                  : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200"
              )}
            >
              {isAnalyzing ? <RefreshCw size={20} className="animate-spin" /> : <Zap size={20} className="text-yellow-300 group-hover:scale-125 transition-transform" />}
              {isAnalyzing ? "Đang xử lý dữ liệu..." : "Phân tích AI ngay"}
            </button>
            <button 
              onClick={copyToClipboard}
              disabled={!analysis}
              className="p-4 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-2xl transition-all border-2 border-slate-100 disabled:opacity-50 shadow-sm active:scale-95 group"
              title="Sao chép báo cáo"
            >
              <Copy size={22} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          )}

          {/* Executive Summary */}
          {(executiveSummary || isGeneratingSummary) && (
            <div className="bg-gradient-to-r from-indigo-900 to-blue-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
              
              <div className="relative z-10 flex items-start gap-6">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 backdrop-blur-md border border-white/10">
                  <Zap size={24} className="text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-black tracking-tight mb-3 flex items-center gap-3">
                    TÓM TẮT ĐIỀU HÀNH
                    {isGeneratingSummary && <RefreshCw size={14} className="animate-spin text-white/50" />}
                  </h2>
                  {isGeneratingSummary ? (
                    <div className="space-y-2">
                      <div className="h-4 bg-white/10 rounded animate-pulse w-3/4" />
                      <div className="h-4 bg-white/10 rounded animate-pulse w-1/2" />
                    </div>
                  ) : (
                    <p className="text-base font-medium leading-relaxed text-indigo-50">
                      {executiveSummary}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Strategic Command Center v5.0 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-2 bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-200 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-blue-500/20 transition-colors" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <BarChart3 size={20} className="text-blue-400" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Nhịp đập Chiến lược</span>
                </div>
                <h3 className="text-2xl font-black mb-2 tracking-tight">Chỉ số Hiệu năng Văn phòng</h3>
                <p className="text-slate-400 text-sm mb-8 font-medium">Đánh giá mức độ hoàn thành nhiệm vụ trọng tâm</p>
                
                <div className="flex items-end gap-12">
                  <div>
                    <p className="text-5xl font-black text-white tracking-tighter mb-1">
                      {Math.round(((systemTasks.filter(t => t.status === 'Completed').length + 
                        viceChief1Tasks.filter(t => t.progress === 100).length + 
                        viceChief2Tasks.filter(t => t.progress === 100).length) / 
                        (systemTasks.length + viceChief1Tasks.length + viceChief2Tasks.length || 1)) * 100)}%
                    </p>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tỷ lệ hoàn tất</p>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <span>Hệ thống</span>
                        <span>{Math.round((systemTasks.filter(t => t.status === 'Completed').length / (systemTasks.length || 1)) * 100)}%</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${(systemTasks.filter(t => t.status === 'Completed').length / (systemTasks.length || 1)) * 100}%` }} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <span>Phó VP 1</span>
                        <span>{Math.round((viceChief1Tasks.filter(t => t.progress === 100).length / (viceChief1Tasks.length || 1)) * 100)}%</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${(viceChief1Tasks.filter(t => t.progress === 100).length / (viceChief1Tasks.length || 1)) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between group hover:border-orange-200 transition-all">
              <div>
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 mb-6 group-hover:scale-110 transition-transform">
                  <AlertTriangle size={24} />
                </div>
                <h4 className="text-lg font-black text-slate-900 tracking-tight">Rủi ro Chiến lược</h4>
                <p className="text-slate-500 text-xs font-medium mt-1">Nhiệm vụ khẩn cấp chưa hoàn thành</p>
              </div>
              <p className="text-4xl font-black text-orange-600 tracking-tighter mt-4">
                {systemTasks.filter(t => t.priority === 'high' && t.status !== 'Completed').length + 
                 viceChief1Tasks.filter(t => t.importance === 'critical' && t.progress < 100).length + 
                 viceChief2Tasks.filter(t => t.importance === 'critical' && t.progress < 100).length}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between group hover:border-emerald-200 transition-all">
              <div>
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
                  <CheckCircle2 size={24} />
                </div>
                <h4 className="text-lg font-black text-slate-900 tracking-tight">Năng lực Thực thi</h4>
                <p className="text-slate-500 text-xs font-medium mt-1">Nhiệm vụ hoàn tất tổng thể</p>
              </div>
              <p className="text-4xl font-black text-emerald-600 tracking-tighter mt-4">
                {systemTasks.filter(t => t.status === 'Completed').length + 
                 viceChief1Tasks.filter(t => t.progress === 100).length + 
                 viceChief2Tasks.filter(t => t.progress === 100).length}
              </p>
            </div>
          </div>

          {/* Vice Chief Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Column 1: Phó Văn phòng 1 */}
            <div className="bg-white border border-slate-200 rounded-[3rem] shadow-2xl shadow-slate-200/50 overflow-hidden flex flex-col min-h-[600px]">
              <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    {viceChief1Info?.photoURL ? (
                      <img src={viceChief1Info.photoURL} alt="" className="w-14 h-14 rounded-2xl object-cover ring-4 ring-white shadow-lg" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg ring-4 ring-white">
                        <User size={28} />
                      </div>
                    )}
                    {isAdmin && (
                      <button 
                        onClick={() => { setSelectingFor(1); setShowSettingsModal(true); }}
                        className="absolute -bottom-2 -right-2 p-1.5 bg-white rounded-xl shadow-md text-slate-400 hover:text-indigo-600 transition-all border border-slate-100"
                      >
                        <Settings size={14} />
                      </button>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{viceChief1Info?.displayName || 'Lê Thị Kiều Oanh'}</h3>
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-0.5">Phó Văn phòng 1</p>
                  </div>
                </div>
                {isAdmin && (
                  <button 
                    onClick={() => { setSelectingFor(1); setShowSettingsModal(true); }}
                    className="p-3 text-slate-400 hover:bg-white hover:text-indigo-600 rounded-2xl transition-all shadow-sm"
                  >
                    <ChevronRight size={20} />
                  </button>
                )}
              </div>
              
              <div className="p-8 space-y-8 flex-1">
                {/* Column Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-indigo-50/50 rounded-2xl p-4 text-center border border-indigo-100/50">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Tổng</p>
                    <p className="text-xl font-black text-indigo-700">{viceChief1Tasks.length}</p>
                  </div>
                  <div className="bg-emerald-50/50 rounded-2xl p-4 text-center border border-emerald-100/50">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Xong</p>
                    <p className="text-xl font-black text-emerald-700">{viceChief1Tasks.filter(t => t.progress === 100).length}</p>
                  </div>
                  <div className="bg-orange-50/50 rounded-2xl p-4 text-center border border-orange-100/50">
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Đang làm</p>
                    <p className="text-xl font-black text-orange-700">{viceChief1Tasks.filter(t => t.progress > 0 && t.progress < 100).length}</p>
                  </div>
                </div>

                {/* Filter and Search */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text"
                      placeholder="Tìm nhiệm vụ..."
                      value={search1}
                      onChange={(e) => setSearch1(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                    />
                  </div>
                  <select 
                    value={filter1}
                    onChange={(e) => setFilter1(e.target.value as any)}
                    className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/10"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="pending">Chờ xử lý</option>
                    <option value="in_progress">Đang thực hiện</option>
                    <option value="completed">Đã hoàn thành</option>
                    <option value="overdue">Quá hạn</option>
                  </select>
                </div>

                {/* Add Task Form */}
                {isAdmin && (
                  <div className="space-y-3 bg-slate-50/50 p-6 rounded-[2rem] border-2 border-slate-100">
                    <div className="relative group/input">
                      <input 
                        type="text"
                        value={newTaskTitle1}
                        onChange={(e) => setNewTaskTitle1(e.target.value)}
                        placeholder="Tên nhiệm vụ..."
                        className="w-full bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all font-bold placeholder:text-slate-400"
                      />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1 relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                          type="date"
                          value={newTaskDeadline1}
                          onChange={(e) => setNewTaskDeadline1(e.target.value)}
                          className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all font-medium"
                        />
                      </div>
                      <button 
                        onClick={() => addViceTask(1)}
                        disabled={!newTaskTitle1.trim()}
                        className="px-6 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center disabled:opacity-50 disabled:shadow-none active:scale-95"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                    <textarea 
                      value={newTaskDescription1}
                      onChange={(e) => setNewTaskDescription1(e.target.value)}
                      placeholder="Mô tả chi tiết (không bắt buộc)..."
                      rows={2}
                      className="w-full bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all font-medium placeholder:text-slate-400 resize-none"
                    />
                  </div>
                )}

                {/* Task List */}
                <div className="space-y-4">
                  {isLoadingViceTasks ? (
                    <div className="py-12 text-center">
                      <RefreshCw size={24} className="animate-spin text-slate-200 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Đang đồng bộ...</p>
                    </div>
                  ) : filterTasks(viceChief1Tasks, filter1, search1).length === 0 ? (
                    <div className="py-12 text-center bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Không tìm thấy nhiệm vụ</p>
                    </div>
                  ) : (
                    filterTasks(viceChief1Tasks, filter1, search1).map(task => {
                      const status = getTaskStatus(task);
                      return (
                        <div key={task.id} className="group p-6 bg-white border-2 border-slate-50 rounded-[2rem] hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                <div className={cn(
                                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border",
                                  status.color
                                )}>
                                  {status.icon}
                                  {status.label}
                                </div>
                                {task.deadline && (
                                  <div className={cn(
                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 bg-slate-50 text-slate-500 border border-slate-100"
                                  )}>
                                    <Clock size={12} />
                                    Hạn: {new Date(task.deadline).toLocaleDateString('vi-VN')}
                                  </div>
                                )}
                              </div>

                              <p className="text-base font-black text-slate-800 mb-2 leading-relaxed">{task.title}</p>
                              
                              {task.description && (
                                <p className="text-sm text-slate-500 font-medium mb-4 line-clamp-2">{task.description}</p>
                              )}

                              <div className="flex items-center gap-5">
                                <div className="relative">
                                  <select 
                                    value={task.importance}
                                    disabled={!isAdmin}
                                    onChange={(e) => updateViceTask(task.id!, { importance: e.target.value as any })}
                                    className={cn(
                                      "text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg border-2 border-transparent bg-slate-50 cursor-pointer outline-none transition-all appearance-none pr-8",
                                      task.importance === 'critical' ? 'text-red-600 bg-red-50' :
                                      task.importance === 'high' ? 'text-orange-600 bg-orange-50' :
                                      task.importance === 'medium' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 bg-slate-50'
                                    )}
                                  >
                                    <option value="low">Thấp</option>
                                    <option value="medium">Trung bình</option>
                                    <option value="high">Cao</option>
                                    <option value="critical">Khẩn cấp</option>
                                  </select>
                                  <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" size={12} />
                                </div>
                                <div className="flex-1 flex items-center gap-4">
                                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${task.progress}%` }}
                                      className={cn(
                                        "h-full transition-all duration-1000",
                                        task.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                                      )}
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <input 
                                      type="number"
                                      min="0"
                                      max="100"
                                      disabled={!isAdmin}
                                      value={task.progress}
                                      onChange={(e) => updateViceTask(task.id!, { progress: parseInt(e.target.value) || 0 })}
                                      className="w-12 text-right text-xs font-black text-slate-700 bg-transparent outline-none disabled:opacity-50"
                                    />
                                    <span className="text-xs font-black text-slate-400">%</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* AI Advice Section & Actions */}
                              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3">
                                {taskAdvice[task.id!] ? (
                                  <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
                                    <div className="flex items-center gap-2 mb-2 text-indigo-600">
                                      <Zap size={14} className="fill-indigo-600" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">Gợi ý tham mưu</span>
                                    </div>
                                    <div className="prose prose-sm prose-slate max-w-none prose-p:text-xs prose-p:leading-relaxed prose-li:text-xs prose-strong:text-indigo-900">
                                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {taskAdvice[task.id!]}
                                      </ReactMarkdown>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => getAdviceForTask(task)}
                                      disabled={isGettingAdvice[task.id!]}
                                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 transition-colors disabled:opacity-50"
                                    >
                                      {isGettingAdvice[task.id!] ? (
                                        <RefreshCw size={12} className="animate-spin" />
                                      ) : (
                                        <Zap size={12} />
                                      )}
                                      Lấy gợi ý tham mưu
                                    </button>
                                    
                                    {isAdmin && (task.importance === 'critical' || task.importance === 'high' || status.label === 'Quá hạn') && task.progress < 100 && (
                                      <button
                                        onClick={() => sendReminder(task, viceChief1Info?.displayName || 'Phó VP 1')}
                                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-500 hover:text-orange-600 transition-colors"
                                      >
                                        <Bell size={12} />
                                        Gửi nhắc nhở
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            {isAdmin && (
                              <button 
                                onClick={() => deleteViceTask(task.id!)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Column 2: Phó Văn phòng 2 */}
            <div className="bg-white border border-slate-200 rounded-[3rem] shadow-2xl shadow-slate-200/50 overflow-hidden flex flex-col min-h-[600px]">
              <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    {viceChief2Info?.photoURL ? (
                      <img src={viceChief2Info.photoURL} alt="" className="w-14 h-14 rounded-2xl object-cover ring-4 ring-white shadow-lg" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg ring-4 ring-white">
                        <User size={28} />
                      </div>
                    )}
                    {isAdmin && (
                      <button 
                        onClick={() => { setSelectingFor(2); setShowSettingsModal(true); }}
                        className="absolute -bottom-2 -right-2 p-1.5 bg-white rounded-xl shadow-md text-slate-400 hover:text-emerald-600 transition-all border border-slate-100"
                      >
                        <Settings size={14} />
                      </button>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{viceChief2Info?.displayName || 'Trần Quốc Bảo'}</h3>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-0.5">Phó Văn phòng 2</p>
                  </div>
                </div>
                {isAdmin && (
                  <button 
                    onClick={() => { setSelectingFor(2); setShowSettingsModal(true); }}
                    className="p-3 text-slate-400 hover:bg-white hover:text-emerald-600 rounded-2xl transition-all shadow-sm"
                  >
                    <ChevronRight size={20} />
                  </button>
                )}
              </div>
              
              <div className="p-8 space-y-8 flex-1">
                {/* Column Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-emerald-50/50 rounded-2xl p-4 text-center border border-emerald-100/50">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Tổng</p>
                    <p className="text-xl font-black text-emerald-700">{viceChief2Tasks.length}</p>
                  </div>
                  <div className="bg-blue-50/50 rounded-2xl p-4 text-center border border-blue-100/50">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Xong</p>
                    <p className="text-xl font-black text-blue-700">{viceChief2Tasks.filter(t => t.progress === 100).length}</p>
                  </div>
                  <div className="bg-orange-50/50 rounded-2xl p-4 text-center border border-orange-100/50">
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Đang làm</p>
                    <p className="text-xl font-black text-orange-700">{viceChief2Tasks.filter(t => t.progress > 0 && t.progress < 100).length}</p>
                  </div>
                </div>

                {/* Filter and Search */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text"
                      placeholder="Tìm nhiệm vụ..."
                      value={search2}
                      onChange={(e) => setSearch2(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all"
                    />
                  </div>
                  <select 
                    value={filter2}
                    onChange={(e) => setFilter2(e.target.value as any)}
                    className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/10"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="pending">Chờ xử lý</option>
                    <option value="in_progress">Đang thực hiện</option>
                    <option value="completed">Đã hoàn thành</option>
                    <option value="overdue">Quá hạn</option>
                  </select>
                </div>

                {/* Add Task Form */}
                {isAdmin && (
                  <div className="space-y-3 bg-slate-50/50 p-6 rounded-[2rem] border-2 border-slate-100">
                    <div className="relative group/input">
                      <input 
                        type="text"
                        value={newTaskTitle2}
                        onChange={(e) => setNewTaskTitle2(e.target.value)}
                        placeholder="Tên nhiệm vụ..."
                        className="w-full bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all font-bold placeholder:text-slate-400"
                      />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1 relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                          type="date"
                          value={newTaskDeadline2}
                          onChange={(e) => setNewTaskDeadline2(e.target.value)}
                          className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all font-medium"
                        />
                      </div>
                      <button 
                        onClick={() => addViceTask(2)}
                        disabled={!newTaskTitle2.trim()}
                        className="px-6 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center disabled:opacity-50 disabled:shadow-none active:scale-95"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                    <textarea 
                      value={newTaskDescription2}
                      onChange={(e) => setNewTaskDescription2(e.target.value)}
                      placeholder="Mô tả chi tiết (không bắt buộc)..."
                      rows={2}
                      className="w-full bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all font-medium placeholder:text-slate-400 resize-none"
                    />
                  </div>
                )}

                {/* Task List */}
                <div className="space-y-4">
                  {isLoadingViceTasks ? (
                    <div className="py-12 text-center">
                      <RefreshCw size={24} className="animate-spin text-slate-200 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Đang đồng bộ...</p>
                    </div>
                  ) : filterTasks(viceChief2Tasks, filter2, search2).length === 0 ? (
                    <div className="py-12 text-center bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Không tìm thấy nhiệm vụ</p>
                    </div>
                  ) : (
                    filterTasks(viceChief2Tasks, filter2, search2).map(task => {
                      const status = getTaskStatus(task);
                      return (
                        <div key={task.id} className="group p-6 bg-white border-2 border-slate-50 rounded-[2rem] hover:border-emerald-100 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                <div className={cn(
                                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border",
                                  status.color
                                )}>
                                  {status.icon}
                                  {status.label}
                                </div>
                                {task.deadline && (
                                  <div className={cn(
                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 bg-slate-50 text-slate-500 border border-slate-100"
                                  )}>
                                    <Clock size={12} />
                                    Hạn: {new Date(task.deadline).toLocaleDateString('vi-VN')}
                                  </div>
                                )}
                              </div>

                              <p className="text-base font-black text-slate-800 mb-2 leading-relaxed">{task.title}</p>
                              
                              {task.description && (
                                <p className="text-sm text-slate-500 font-medium mb-4 line-clamp-2">{task.description}</p>
                              )}

                              <div className="flex items-center gap-5">
                                <div className="relative">
                                  <select 
                                    value={task.importance}
                                    disabled={!isAdmin}
                                    onChange={(e) => updateViceTask(task.id!, { importance: e.target.value as any })}
                                    className={cn(
                                      "text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg border-2 border-transparent bg-slate-50 cursor-pointer outline-none transition-all appearance-none pr-8",
                                      task.importance === 'critical' ? 'text-red-600 bg-red-50' :
                                      task.importance === 'high' ? 'text-orange-600 bg-orange-50' :
                                      task.importance === 'medium' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 bg-slate-50'
                                    )}
                                  >
                                    <option value="low">Thấp</option>
                                    <option value="medium">Trung bình</option>
                                    <option value="high">Cao</option>
                                    <option value="critical">Khẩn cấp</option>
                                  </select>
                                  <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" size={12} />
                                </div>
                                <div className="flex-1 flex items-center gap-4">
                                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${task.progress}%` }}
                                      className={cn(
                                        "h-full transition-all duration-1000",
                                        task.progress === 100 ? 'bg-blue-500' : 'bg-emerald-500'
                                      )}
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <input 
                                      type="number"
                                      min="0"
                                      max="100"
                                      disabled={!isAdmin}
                                      value={task.progress}
                                      onChange={(e) => updateViceTask(task.id!, { progress: parseInt(e.target.value) || 0 })}
                                      className="w-12 text-right text-xs font-black text-slate-700 bg-transparent outline-none disabled:opacity-50"
                                    />
                                    <span className="text-xs font-black text-slate-400">%</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* AI Advice Section & Actions */}
                              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3">
                                {taskAdvice[task.id!] ? (
                                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
                                    <div className="flex items-center gap-2 mb-2 text-emerald-600">
                                      <Zap size={14} className="fill-emerald-600" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">Gợi ý tham mưu</span>
                                    </div>
                                    <div className="prose prose-sm prose-slate max-w-none prose-p:text-xs prose-p:leading-relaxed prose-li:text-xs prose-strong:text-emerald-900">
                                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {taskAdvice[task.id!]}
                                      </ReactMarkdown>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => getAdviceForTask(task)}
                                      disabled={isGettingAdvice[task.id!]}
                                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-600 transition-colors disabled:opacity-50"
                                    >
                                      {isGettingAdvice[task.id!] ? (
                                        <RefreshCw size={12} className="animate-spin" />
                                      ) : (
                                        <Zap size={12} />
                                      )}
                                      Lấy gợi ý tham mưu
                                    </button>
                                    
                                    {isAdmin && (task.importance === 'critical' || task.importance === 'high' || status.label === 'Quá hạn') && task.progress < 100 && (
                                      <button
                                        onClick={() => sendReminder(task, viceChief2Info?.displayName || 'Phó VP 2')}
                                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-500 hover:text-orange-600 transition-colors"
                                      >
                                        <Bell size={12} />
                                        Gửi nhắc nhở
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            {isAdmin && (
                              <button 
                                onClick={() => deleteViceTask(task.id!)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* AI Analysis Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Báo cáo Phân tích AI</h2>
            </div>

            {!analysis && !isAnalyzing && systemTasks.length === 0 && viceChief1Tasks.length === 0 && viceChief2Tasks.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-6">
                  <FileText size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Chưa có dữ liệu để phân tích</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  Hãy nhập công việc cho các Phó Văn phòng hoặc thêm nhiệm vụ hệ thống để bắt đầu phân tích.
                </p>
              </div>
            )}

            {isAnalyzing && (
              <div className="bg-white border border-slate-200 rounded-3xl p-8 animate-pulse">
                <div className="h-8 bg-slate-100 rounded-lg w-1/3 mb-6" />
                <div className="space-y-3">
                  <div className="h-4 bg-slate-50 rounded w-full" />
                  <div className="h-4 bg-slate-50 rounded w-5/6" />
                  <div className="h-4 bg-slate-50 rounded w-4/6" />
                </div>
              </div>
            )}

            {analysis && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden"
              >
                <div className="p-10 prose prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tight prose-h1:text-3xl prose-h1:border-b-4 prose-h1:border-blue-600 prose-h1:pb-6 prose-h1:mb-10 prose-h2:text-2xl prose-p:text-slate-600 prose-p:leading-relaxed prose-p:text-lg prose-li:text-slate-600 prose-li:text-lg">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {analysis}
                  </ReactMarkdown>
                </div>
                
                <div className="bg-slate-50 p-8 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-slate-400 text-xs font-black uppercase tracking-widest">
                    <Clock size={16} className="text-blue-500" />
                    Báo cáo được tạo lúc {new Date().toLocaleString('vi-VN')}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Trung tâm Chỉ huy Chiến lược v5.0</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
