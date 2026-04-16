import React, { useState, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  CheckSquare, 
  Calendar, 
  AlertCircle,
  Clock,
  Trash2,
  Edit,
  X,
  Save,
  Filter,
  GripVertical,
  Sparkles,
  LayoutGrid,
  List as ListIcon,
  CheckCircle2,
  Timer
} from 'lucide-react';
import { Task } from '../constants';
import { cn } from '../lib/utils';
import { generateContentWithRetry } from '../lib/ai-utils';
import { ToastType } from './ui/Toast';
import { ConfirmationModal } from './ui/ConfirmationModal';

interface TaskManagementProps {
  tasks: Task[];
  setTasks: (updater: Task[] | ((prev: Task[]) => Task[])) => void;
  showToast: (message: string, type?: ToastType) => void;
  onSaveTasks?: (tasks: Task[]) => void;
  saveToKnowledge?: (task: Task) => void;
  isEmbedded?: boolean;
}

type TaskStatus = 'Pending' | 'In Progress' | 'Completed';
type ViewMode = 'kanban' | 'list';

export const TaskManagement: React.FC<TaskManagementProps> = memo(({ tasks, setTasks, showToast, onSaveTasks, saveToKnowledge, isEmbedded }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  const toggleSelectTask = (id: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTasks(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredTasks.map(t => t.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedTasks.size === 0) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedTasks.size} nhiệm vụ đã chọn?`)) {
      const updatedTasks = tasks.filter(t => !selectedTasks.has(t.id));
      setTasks(updatedTasks);
      if (onSaveTasks) onSaveTasks(updatedTasks);
      setSelectedTasks(new Set());
      showToast(`Đã xóa ${selectedTasks.size} nhiệm vụ!`, "success");
    }
  };

  const handleBulkStatus = (status: TaskStatus) => {
    if (selectedTasks.size === 0) return;
    const updatedTasks = tasks.map(t => selectedTasks.has(t.id) ? { ...t, status } : t);
    setTasks(updatedTasks);
    if (onSaveTasks) onSaveTasks(updatedTasks);
    setSelectedTasks(new Set());
    showToast(`Đã cập nhật trạng thái cho ${selectedTasks.size} nhiệm vụ!`, "success");
  };

  // Form state
  const [formData, setFormData] = useState<{ 
    title: string; 
    description: string;
    deadline: string; 
    time: string;
    priority: 'high' | 'medium' | 'low'; 
    status: TaskStatus; 
    aiSuggestion?: string; 
    assignee?: string; 
    isImportant?: boolean;
    category?: string;
    estimatedTime?: string;
  }>({
    title: '',
    description: '',
    deadline: '',
    time: '',
    priority: 'medium',
    status: 'Pending',
    aiSuggestion: '',
    assignee: '',
    isImportant: false,
    category: '',
    estimatedTime: ''
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeTask = async () => {
    if (!formData.title) {
      showToast("Vui lòng nhập tên nhiệm vụ để phân tích", "error");
      return;
    }
    setIsAnalyzing(true);
    try {
      const prompt = `Phân tích nhiệm vụ sau và đề xuất mức độ ưu tiên (high, medium, low) cùng với một lời khuyên/gợi ý ngắn gọn (dưới 50 từ) để thực hiện nhiệm vụ này hiệu quả.
Nhiệm vụ: "${formData.title}"

Trả về kết quả dưới dạng JSON với định dạng:
{
  "priority": "high" | "medium" | "low",
  "suggestion": "lời khuyên ngắn gọn"
}`;
      const response = await generateContentWithRetry({
        model: 'gemini-3.1-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
        }
      });
      
      if (response.text) {
        const result = JSON.parse(response.text);
        setFormData(prev => ({
          ...prev,
          priority: result.priority || prev.priority,
          aiSuggestion: result.suggestion || ''
        }));
        showToast("Đã phân tích và cập nhật đề xuất", "success");
      }
    } catch (error) {
      console.error("Error analyzing task:", error);
      showToast("Lỗi khi phân tích nhiệm vụ", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredTasks = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return tasks.filter(task => {
      const matchesSearch = !term || task.title.toLowerCase().includes(term);
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      return matchesSearch && matchesPriority;
    });
  }, [tasks, searchTerm, filterPriority]);

  const sortTasks = (tasksToSort: Task[]) => {
    return [...tasksToSort].sort((a, b) => {
      const now = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
      const aDeadline = new Date(a.deadline).getTime();
      const bDeadline = new Date(b.deadline).getTime();
      
      const aIsOverdue = aDeadline < now && a.status !== 'Completed';
      const bIsOverdue = bDeadline < now && b.status !== 'Completed';

      if (aIsOverdue && !bIsOverdue) return -1;
      if (!aIsOverdue && bIsOverdue) return 1;

      const priorityWeight = { high: 3, medium: 2, low: 1 };
      if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }

      return aDeadline - bDeadline;
    });
  };

  const tasksByStatus = useMemo(() => {
    return {
      'Pending': sortTasks(filteredTasks.filter(t => t.status === 'Pending')),
      'In Progress': sortTasks(filteredTasks.filter(t => t.status === 'In Progress')),
      'Completed': sortTasks(filteredTasks.filter(t => t.status === 'Completed'))
    };
  }, [filteredTasks]);

  const handleAdd = () => {
    if (!formData.title || !formData.deadline) {
      showToast("Vui lòng nhập đầy đủ thông tin!", "error");
      return;
    }
    
    const newTask: Task = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: formData.title,
      description: formData.description,
      deadline: formData.deadline,
      time: formData.time,
      priority: formData.priority,
      status: formData.status,
      aiSuggestion: formData.aiSuggestion,
      assignee: formData.assignee,
      isImportant: formData.isImportant,
      category: formData.category,
      estimatedTime: formData.estimatedTime,
      createdAt: Date.now()
    };
    
    if (saveToKnowledge && (newTask.status === 'Completed' || newTask.isImportant)) {
      saveToKnowledge(newTask);
    }
    
    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    if (onSaveTasks) onSaveTasks(updatedTasks);
    
    setFormData({ title: '', description: '', deadline: '', time: '', priority: 'medium', status: 'Pending', aiSuggestion: '', assignee: '', isImportant: false, category: '', estimatedTime: '' });
    setIsAdding(false);
    showToast("Đã thêm nhiệm vụ mới!", "success");
  };

  const handleUpdate = () => {
    if (!formData.title || !formData.deadline || !editingId) return;
    
    const updatedTask = { ...tasks.find(t => t.id === editingId), ...formData };
    if (saveToKnowledge && (updatedTask.status === 'Completed' || updatedTask.isImportant)) {
      saveToKnowledge(updatedTask as Task);
    }
    
    const updatedTasks = tasks.map(t => t.id === editingId ? { ...t, ...formData } : t);
    setTasks(updatedTasks);
    if (onSaveTasks) onSaveTasks(updatedTasks);
    
    setEditingId(null);
    setFormData({ title: '', description: '', deadline: '', time: '', priority: 'medium', status: 'Pending', aiSuggestion: '', assignee: '', isImportant: false, category: '', estimatedTime: '' });
    showToast("Đã cập nhật nhiệm vụ!", "success");
  };

  const handleDelete = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    setTaskToDelete(task);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!taskToDelete) return;
    const updatedTasks = tasks.filter(t => t.id !== taskToDelete.id);
    setTasks(updatedTasks);
    if (onSaveTasks) onSaveTasks(updatedTasks);
    showToast("Đã xóa nhiệm vụ!", "success");
    setTaskToDelete(null);
  };

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setFormData({
      title: task.title,
      description: task.description || '',
      deadline: task.deadline,
      time: task.time || '',
      priority: task.priority,
      status: task.status,
      aiSuggestion: task.aiSuggestion || '',
      assignee: task.assignee || '',
      isImportant: task.isImportant || false,
      category: task.category || '',
      estimatedTime: task.estimatedTime || ''
    });
    setIsAdding(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ title: '', description: '', deadline: '', time: '', priority: 'medium', status: 'Pending', aiSuggestion: '', assignee: '', isImportant: false, category: '', estimatedTime: '' });
    setIsAdding(false);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Small delay to allow the drag image to be captured before adding opacity
    setTimeout(() => {
      const el = document.getElementById(`task-${id}`);
      if (el) el.classList.add('opacity-50');
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(null);
    const el = document.getElementById(`task-${id}`);
    if (el) el.classList.remove('opacity-50');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (!draggedTaskId) return;

    const taskToMove = tasks.find(t => t.id === draggedTaskId);
    if (taskToMove && taskToMove.status !== status) {
      const updatedTasks = tasks.map(t => 
        t.id === draggedTaskId ? { ...t, status } : t
      );
      setTasks(updatedTasks);
      if (onSaveTasks) onSaveTasks(updatedTasks);
      showToast(`Đã chuyển sang: ${status}`, "success");
    }
    setDraggedTaskId(null);
  };

  const ColumnHeader = ({ title, count, colorClass }: { title: string, count: number, colorClass: string }) => (
    <div className="flex items-center justify-between mb-4 px-2">
      <div className="flex items-center gap-2">
        <div className={cn("w-3 h-3 rounded-full", colorClass)} />
        <h3 className="font-bold text-slate-700 uppercase tracking-wider text-sm">{title}</h3>
      </div>
      <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
        {count}
      </span>
    </div>
  );

  const TaskCard = ({ task }: { task: Task }) => {
    const isOverdue = new Date(task.deadline) < new Date(new Date().setHours(0, 0, 0, 0)) && task.status !== 'Completed';
    
    return (
    <div 
      id={`task-${task.id}`}
      draggable
      onDragStart={(e) => handleDragStart(e, task.id)}
      onDragEnd={(e) => handleDragEnd(e, task.id)}
      className={cn(
        "bg-white p-4 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative",
        isOverdue ? "border-rose-300 bg-rose-50/30" : "border-slate-200"
      )}
      style={{
        ...(task.status === 'Pending' && !isOverdue ? { backgroundColor: '#eff6ff' } :
           task.status === 'In Progress' && !isOverdue ? { backgroundColor: '#fff7ed' } :
           task.status === 'Completed' ? { backgroundColor: '#f0fdf4' } :
           {}),
        borderLeft: task.priority === 'high' ? '4px solid #ef4444' : 
                    task.priority === 'medium' ? '4px solid #f59e0b' : 
                    '4px solid #10b981'
      }}
    >
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <button onClick={() => startEdit(task)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md">
          <Edit size={14} />
        </button>
        <button onClick={() => handleDelete(task.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md">
          <Trash2 size={14} />
        </button>
      </div>
      
      <div className="flex items-start gap-2 mb-2 pr-12">
        <GripVertical size={16} className="text-slate-300 mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-1 mb-1">
            {task.isSystem && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[8px] font-black uppercase tracking-tighter border border-blue-100">
                Hệ thống
              </span>
            )}
            {isOverdue && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[8px] font-black uppercase tracking-tighter border border-rose-200 animate-pulse">
                Quá hạn
              </span>
            )}
          </div>
          <h4 className={cn(
            "text-sm font-bold leading-snug",
            task.status === 'Completed' ? "text-slate-400 line-through" : "text-slate-800"
          )}>
            {task.title}
          </h4>
          
          {task.description && (
            <p className="mt-1 text-xs text-slate-500 line-clamp-2">{task.description}</p>
          )}

          <div className="mt-2 flex flex-wrap gap-1.5">
            {task.category && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200">
                {task.category}
              </span>
            )}
            {task.estimatedTime && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-medium border border-blue-100">
                <Timer size={10} />
                {task.estimatedTime}
              </span>
            )}
          </div>

          {task.assignee && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
              <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                {task.assignee.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium">{task.assignee}</span>
            </div>
          )}
          {task.aiSuggestion && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-600 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/50">
              <Sparkles size={12} className="text-indigo-500 shrink-0 mt-0.5" />
              <p className="leading-relaxed line-clamp-2" title={task.aiSuggestion}>{task.aiSuggestion}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pl-6">
        <div className={cn(
          "flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md font-mono font-medium border",
          isOverdue
            ? "text-rose-600 bg-rose-50 border-rose-100" 
            : "text-slate-500 bg-slate-50 border-slate-200"
        )}>
          <Calendar size={12} />
          {task.deadline} {task.time && `| ${task.time}`}
        </div>

        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
          task.priority === 'high' && "bg-rose-50 text-rose-700",
          task.priority === 'medium' && "bg-amber-50 text-amber-700",
          task.priority === 'low' && "bg-emerald-50 text-emerald-700"
        )}>
          {task.priority === 'high' && <AlertCircle size={10} />}
          {task.priority === 'medium' && <Clock size={10} />}
          {task.priority === 'low' && <CheckSquare size={10} />}
          {task.priority === 'high' ? 'Cao' : task.priority === 'medium' ? 'TB' : 'Thấp'}
        </span>
      </div>
    </div>
  )};

  const stats = useMemo(() => {
    const now = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
    let overdue = 0;
    
    tasks.forEach(t => {
      if (t.status !== 'Completed' && new Date(t.deadline).getTime() < now) {
        overdue++;
      }
    });

    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'Pending').length,
      inProgress: tasks.filter(t => t.status === 'In Progress').length,
      completed: tasks.filter(t => t.status === 'Completed').length,
      overdue
    };
  }, [tasks]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("max-w-7xl mx-auto space-y-6 flex flex-col h-full", !isEmbedded && "p-8")}
    >
      {!isEmbedded && (
        <div className="flex items-end justify-between shrink-0">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Quản lý Nhiệm vụ</h2>
            <p className="text-slate-500 mt-2 text-sm font-medium">Theo dõi và quản lý công việc hiệu quả</p>
          </div>
          <button 
            onClick={() => {
              setEditingId(null);
              setFormData({ title: '', description: '', deadline: '', time: '', priority: 'medium', status: 'Pending', aiSuggestion: '', assignee: '', isImportant: false, category: '', estimatedTime: '' });
              setIsAdding(true);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 hover:-translate-y-0.5 transition-all flex items-center gap-2"
          >
            <Plus size={16} />
            Thêm nhiệm vụ
          </button>
        </div>
      )}

      {/* Dashboard Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 shrink-0">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Tổng số</span>
          <span className="text-2xl font-black text-slate-800">{stats.total}</span>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Cần làm</span>
          <span className="text-2xl font-black text-slate-700">{stats.pending}</span>
        </div>
        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-center">
          <span className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">Đang làm</span>
          <span className="text-2xl font-black text-indigo-700">{stats.inProgress}</span>
        </div>
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-center">
          <span className="text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">Hoàn thành</span>
          <span className="text-2xl font-black text-emerald-700">{stats.completed}</span>
        </div>
        <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 shadow-sm flex flex-col justify-center">
          <span className="text-rose-600 text-xs font-bold uppercase tracking-wider mb-1">Quá hạn</span>
          <span className="text-2xl font-black text-rose-700">{stats.overdue}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-96 group flex items-center gap-2">
          {isEmbedded && (
            <button 
              onClick={() => {
                setEditingId(null);
                setFormData({ title: '', description: '', deadline: '', time: '', priority: 'medium', status: 'Pending', aiSuggestion: '', assignee: '', isImportant: false, category: '', estimatedTime: '' });
                setIsAdding(true);
              }}
              className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all shadow-sm shrink-0"
              title="Thêm nhiệm vụ"
            >
              <Plus size={18} />
            </button>
          )}
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Tìm kiếm nhiệm vụ..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
            {(['all', 'high', 'medium', 'low'] as const).map((priority) => (
              <button
                key={priority}
                onClick={() => setFilterPriority(priority)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all capitalize",
                  filterPriority === priority 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                )}
              >
                {priority === 'all' ? 'Tất cả' : priority === 'high' ? 'Cao' : priority === 'medium' ? 'TB' : 'Thấp'}
              </button>
            ))}
          </div>
          
          <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
          
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'kanban' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
              title="Giao diện Kanban"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'list' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
              title="Giao diện Danh sách"
            >
              <ListIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
        {viewMode === 'kanban' ? (
          /* Kanban Board */
          <div className={cn("flex gap-6 min-w-max flex-1 transition-all duration-300", isAdding ? "w-[calc(100%-350px)]" : "w-full")}>
            {/* Pending Column */}
            <div 
              className="w-80 flex flex-col bg-slate-50/50 rounded-2xl border border-slate-200 p-4"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'Pending')}
            >
              <ColumnHeader title="Cần làm (Pending)" count={tasksByStatus['Pending'].length} colorClass="bg-slate-400" />
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                {tasksByStatus['Pending'].map(task => <TaskCard key={task.id} task={task} />)}
                {tasksByStatus['Pending'].length === 0 && (
                  <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-sm font-medium">
                    Kéo thả vào đây
                  </div>
                )}
              </div>
            </div>

            {/* In Progress Column */}
            <div 
              className="w-80 flex flex-col bg-indigo-50/30 rounded-2xl border border-indigo-100 p-4"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'In Progress')}
            >
              <ColumnHeader title="Đang làm (In Progress)" count={tasksByStatus['In Progress'].length} colorClass="bg-indigo-500" />
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                {tasksByStatus['In Progress'].map(task => <TaskCard key={task.id} task={task} />)}
                {tasksByStatus['In Progress'].length === 0 && (
                  <div className="h-24 border-2 border-dashed border-indigo-200 rounded-xl flex items-center justify-center text-indigo-400 text-sm font-medium">
                    Kéo thả vào đây
                  </div>
                )}
              </div>
            </div>

            {/* Completed Column */}
            <div 
              className="w-80 flex flex-col bg-emerald-50/30 rounded-2xl border border-emerald-100 p-4"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'Completed')}
            >
              <ColumnHeader title="Hoàn thành (Completed)" count={tasksByStatus['Completed'].length} colorClass="bg-emerald-500" />
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                {tasksByStatus['Completed'].map(task => <TaskCard key={task.id} task={task} />)}
                {tasksByStatus['Completed'].length === 0 && (
                  <div className="h-24 border-2 border-dashed border-emerald-200 rounded-xl flex items-center justify-center text-emerald-400 text-sm font-medium">
                    Kéo thả vào đây
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* List View */
          <div className={cn("flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col", isAdding ? "w-[calc(100%-350px)]" : "w-full")}>
            {selectedTasks.size > 0 && (
              <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                <span className="text-sm font-bold text-indigo-700">
                  Đã chọn {selectedTasks.size} nhiệm vụ
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleBulkStatus('Pending')} className="px-3 py-1.5 bg-white text-slate-600 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                    Chuyển Cần làm
                  </button>
                  <button onClick={() => handleBulkStatus('In Progress')} className="px-3 py-1.5 bg-white text-indigo-600 text-xs font-bold rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors">
                    Chuyển Đang làm
                  </button>
                  <button onClick={() => handleBulkStatus('Completed')} className="px-3 py-1.5 bg-white text-emerald-600 text-xs font-bold rounded-lg border border-emerald-200 hover:bg-emerald-50 transition-colors">
                    Đánh dấu Hoàn thành
                  </button>
                  <div className="w-px h-4 bg-indigo-200 mx-1"></div>
                  <button onClick={handleBulkDelete} className="px-3 py-1.5 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg border border-rose-200 hover:bg-rose-100 transition-colors">
                    Xóa đã chọn
                  </button>
                </div>
              </div>
            )}
            <div className="overflow-x-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                    <th className="p-4 w-10">
                      <input 
                        type="checkbox" 
                        checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                      />
                    </th>
                    <th className="p-4 font-bold">Tên nhiệm vụ</th>
                    <th className="p-4 font-bold">Trạng thái</th>
                    <th className="p-4 font-bold">Mức độ</th>
                    <th className="p-4 font-bold">Hạn chót</th>
                    <th className="p-4 font-bold">Phụ trách</th>
                    <th className="p-4 font-bold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        Không tìm thấy nhiệm vụ nào.
                      </td>
                    </tr>
                  ) : (
                    sortTasks(filteredTasks).map(task => {
                      const isOverdue = new Date(task.deadline) < new Date(new Date().setHours(0, 0, 0, 0)) && task.status !== 'Completed';
                      return (
                        <tr key={task.id} className={cn("hover:bg-slate-50 transition-colors group", selectedTasks.has(task.id) && "bg-indigo-50/30")}>
                          <td className="p-4">
                            <input 
                              type="checkbox" 
                              checked={selectedTasks.has(task.id)}
                              onChange={() => toggleSelectTask(task.id)}
                              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => {
                                  const newStatus: Task['status'] = task.status === 'Completed' ? 'Pending' : 'Completed';
                                  const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t);
                                  setTasks(updatedTasks);
                                  if (onSaveTasks) onSaveTasks(updatedTasks);
                                }}
                                className={cn(
                                  "shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                  task.status === 'Completed' 
                                    ? "bg-emerald-500 border-emerald-500 text-white" 
                                    : "border-slate-300 text-transparent hover:border-indigo-500"
                                )}
                              >
                                <CheckSquare size={14} />
                              </button>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "font-bold text-sm",
                                    task.status === 'Completed' ? "text-slate-400 line-through" : "text-slate-800"
                                  )}>
                                    {task.title}
                                  </span>
                                  {isOverdue && (
                                    <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-bold uppercase tracking-wider">Quá hạn</span>
                                  )}
                                </div>
                                {task.description && (
                                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{task.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  {task.category && (
                                    <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{task.category}</span>
                                  )}
                                  {task.estimatedTime && (
                                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                                      <Timer size={10} />
                                      {task.estimatedTime}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={cn(
                              "inline-flex items-center px-2 py-1 rounded-md text-xs font-bold",
                              task.status === 'Pending' ? "bg-slate-100 text-slate-700" :
                              task.status === 'In Progress' ? "bg-indigo-50 text-indigo-700" :
                              "bg-emerald-50 text-emerald-700"
                            )}>
                              {task.status === 'Pending' ? 'Cần làm' : task.status === 'In Progress' ? 'Đang làm' : 'Hoàn thành'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                              task.priority === 'high' && "bg-rose-50 text-rose-700",
                              task.priority === 'medium' && "bg-amber-50 text-amber-700",
                              task.priority === 'low' && "bg-emerald-50 text-emerald-700"
                            )}>
                              {task.priority === 'high' && <AlertCircle size={10} />}
                              {task.priority === 'medium' && <Clock size={10} />}
                              {task.priority === 'low' && <CheckSquare size={10} />}
                              {task.priority === 'high' ? 'Cao' : task.priority === 'medium' ? 'TB' : 'Thấp'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className={cn(
                              "flex items-center gap-1.5 text-xs font-mono font-medium",
                              isOverdue ? "text-rose-600" : "text-slate-600"
                            )}>
                              <Calendar size={14} />
                              {task.deadline} {task.time && <span className="text-indigo-600 ml-1">({task.time})</span>}
                            </div>
                          </td>
                          <td className="p-4">
                            {task.assignee ? (
                              <div className="flex items-center gap-2 text-sm text-slate-700">
                                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                                  {task.assignee.charAt(0).toUpperCase()}
                                </div>
                                {task.assignee}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-sm">-</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEdit(task)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md">
                                <Edit size={16} />
                              </button>
                              <button onClick={() => handleDelete(task.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add/Edit Form Sidebar */}
        <AnimatePresence>
          {isAdding && (
            <motion.div 
              initial={{ opacity: 0, x: 20, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 350 }}
              exit={{ opacity: 0, x: 20, width: 0 }}
              className="shrink-0"
            >
              <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-6 sticky top-0 w-[350px]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingId ? 'Cập nhật nhiệm vụ' : 'Thêm nhiệm vụ mới'}
                  </h3>
                  <button 
                    onClick={cancelEdit}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Tên nhiệm vụ
                      </label>
                      <button
                        onClick={analyzeTask}
                        disabled={isAnalyzing || !formData.title}
                        className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md flex items-center gap-1 transition-colors disabled:opacity-50"
                        title="AI phân tích và đề xuất"
                      >
                        {isAnalyzing ? <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={12} />}
                        AI Phân tích
                      </button>
                    </div>
                    <input 
                      type="text" 
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="Nhập tên nhiệm vụ..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Mô tả chi tiết
                    </label>
                    <textarea 
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Nhập mô tả chi tiết..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none min-h-[80px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Danh mục
                      </label>
                      <input 
                        type="text" 
                        value={formData.category || ''}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        placeholder="VD: Công việc, Cá nhân..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Thời gian dự kiến
                      </label>
                      <input 
                        type="text" 
                        value={formData.estimatedTime || ''}
                        onChange={(e) => setFormData({...formData, estimatedTime: e.target.value})}
                        placeholder="VD: 2 giờ, 1 ngày..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  {formData.aiSuggestion && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3"
                    >
                      <label className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1.5">
                        <Sparkles size={12} /> Gợi ý từ AI
                      </label>
                      <textarea
                        value={formData.aiSuggestion}
                        onChange={(e) => setFormData({...formData, aiSuggestion: e.target.value})}
                        className="w-full bg-white border border-indigo-100 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none min-h-[60px]"
                        placeholder="Gợi ý của AI..."
                      />
                    </motion.div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Hạn chót
                      </label>
                      <input 
                        type="date" 
                        value={formData.deadline}
                        onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-slate-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Giờ cụ thể
                      </label>
                      <input 
                        type="time" 
                        value={formData.time}
                        onChange={(e) => setFormData({...formData, time: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-slate-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer mb-4">
                      <input
                        type="checkbox"
                        checked={formData.isImportant || false}
                        onChange={(e) => setFormData({...formData, isImportant: e.target.checked})}
                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm font-bold text-slate-700">Đánh dấu quan trọng</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Người phụ trách
                    </label>
                    <input 
                      type="text" 
                      value={formData.assignee || ''}
                      onChange={(e) => setFormData({...formData, assignee: e.target.value})}
                      placeholder="Tên người phụ trách..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Trạng thái
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Mức độ ưu tiên
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['low', 'medium', 'high'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setFormData({...formData, priority: p})}
                          className={cn(
                            "py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all",
                            formData.priority === p
                              ? p === 'high' ? "bg-rose-50 text-rose-700 border-rose-200 shadow-sm" :
                                p === 'medium' ? "bg-amber-50 text-amber-700 border-amber-200 shadow-sm" :
                                "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm"
                              : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
                          )}
                        >
                          {p === 'high' ? 'Cao' : p === 'medium' ? 'TB' : 'Thấp'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button 
                      onClick={cancelEdit}
                      className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
                    >
                      Hủy bỏ
                    </button>
                    <button 
                      onClick={editingId ? handleUpdate : handleAdd}
                      className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                    >
                      {editingId ? <Save size={16} /> : <Plus size={16} />}
                      {editingId ? 'Cập nhật' : 'Thêm mới'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setTaskToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Xác nhận xóa"
        message={taskToDelete?.isSystem 
          ? "Đây là nhiệm vụ hệ thống quan trọng. Bạn có chắc chắn muốn xóa?" 
          : `Bạn có chắc chắn muốn xóa nhiệm vụ "${taskToDelete?.title}"?`}
        confirmText="Xóa nhiệm vụ"
        cancelText="Hủy"
        type="danger"
      />
    </motion.div>
  );
});

TaskManagement.displayName = 'TaskManagement';
