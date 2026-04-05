import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Brain, 
  Clock, 
  AlertCircle,
  CheckSquare,
  Sparkles,
  Filter,
  Tag,
  Timer,
  Mic,
  MicOff,
  ArrowUpDown,
  Zap,
  Search,
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Loader2
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { cn } from '../lib/utils';
import { useTasks } from '../context/TaskContext';
import { Task } from '../constants';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { generateContentWithRetry } from '../lib/ai-utils';
import { updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'react-hot-toast';

export const SmartTaskManager: React.FC = () => {
  const { tasks, updateTasks, smartAnalyzeTasks, calculateSmartScore, isAnalyzing, indexError } = useTasks();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [isSmartSorted, setIsSmartSorted] = useState(true);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [groupingMode, setGroupingMode] = useState<'none' | 'category' | 'priority' | 'status'>('none');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [batchDeleteModalOpen, setBatchDeleteModalOpen] = useState(false);
  const [isDecomposing, setIsDecomposing] = useState<string | null>(null);

  const handleDecomposeTask = async (task: Task) => {
    setIsDecomposing(task.id);
    try {
      const prompt = `Bạn là chuyên gia quản lý dự án. Hãy chia nhỏ nhiệm vụ sau thành các bước thực hiện cụ thể (sub-tasks):
      Nhiệm vụ: ${task.title}
      Mô tả: ${task.description || 'Không có mô tả'}
      Độ ưu tiên: ${task.priority}
      Hạn chót: ${task.deadline}
      
      Yêu cầu:
      1. Chia thành 3-5 bước thực hiện cụ thể.
      2. Mỗi bước có tiêu đề ngắn gọn và mô tả nhanh.
      3. Trả về định dạng JSON array các object: { "title": "...", "description": "..." }.
      4. Chỉ trả về JSON, không có markdown.`;

      const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });
      
      const subTasks = JSON.parse(response.text.trim());
      
      // Update task with sub-tasks
      updateTasks(tasks.map(t => 
        t.id === task.id 
          ? { ...t, subTasks: subTasks.map((st: any) => ({ ...st, status: 'Pending' })) } 
          : t
      ));
      
    } catch (error: any) {
      console.error('Task Decomposition Error:', error);
      alert('Lỗi khi chia nhỏ nhiệm vụ: ' + (error.message || 'Lỗi không xác định'));
    } finally {
      setIsDecomposing(null);
    }
  };

  const toggleSubTask = (taskId: string, subTaskIndex: number) => {
    updateTasks(tasks.map(t => {
      if (t.id === taskId && t.subTasks) {
        const newSubTasks = [...t.subTasks];
        newSubTasks[subTaskIndex] = {
          ...newSubTasks[subTaskIndex],
          status: newSubTasks[subTaskIndex].status === 'Completed' ? 'Pending' : 'Completed'
        };
        return { ...t, subTasks: newSubTasks };
      }
      return t;
    }));
  };

  const { isListening: isListeningTitle, toggleListening: toggleListeningTitle } = useSpeechToText(
    (transcript) => setNewTaskTitle(prev => prev ? `${prev} ${transcript}` : transcript)
  );

  const { isListening: isListeningDesc, toggleListening: toggleListeningDesc } = useSpeechToText(
    (transcript) => setNewTaskDesc(prev => prev ? `${prev} ${transcript}` : transcript)
  );

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask: Task = {
      id: `t-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      title: newTaskTitle,
      description: newTaskDesc,
      deadline: newTaskDeadline || new Date().toISOString().split('T')[0],
      priority: 'medium',
      status: 'Pending',
      createdAt: Date.now(),
    };
    updateTasks([newTask, ...tasks]);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskDeadline('');
  };

  const toggleTask = (id: string) => {
    updateTasks(tasks.map(t => 
      t.id === id 
        ? { ...t, status: t.status === 'Completed' ? 'Pending' : 'Completed' } 
        : t
    ));
  };

  const deleteTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    setTaskToDelete(task);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!taskToDelete) return;
    updateTasks(tasks.filter(t => t.id !== taskToDelete.id));
    if (selectedTaskIds.has(taskToDelete.id)) {
      const newSelected = new Set(selectedTaskIds);
      newSelected.delete(taskToDelete.id);
      setSelectedTaskIds(newSelected);
    }
    setTaskToDelete(null);
  };

  const toggleSelectTask = (id: string) => {
    const newSelected = new Set(selectedTaskIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTaskIds(newSelected);
  };

  const selectAllTasks = () => {
    if (selectedTaskIds.size === processedTasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(processedTasks.map(t => t.id)));
    }
  };

  const batchDelete = () => {
    if (selectedTaskIds.size === 0) return;
    setBatchDeleteModalOpen(true);
  };

  const confirmBatchDelete = () => {
    updateTasks(tasks.filter(t => !selectedTaskIds.has(t.id)));
    setSelectedTaskIds(new Set());
  };

  const batchToggleStatus = () => {
    if (selectedTaskIds.size === 0) return;
    updateTasks(tasks.map(t => 
      selectedTaskIds.has(t.id) 
        ? { ...t, status: t.status === 'Completed' ? 'Pending' : 'Completed' } 
        : t
    ));
    setSelectedTaskIds(new Set());
  };

  const groupedTasks = useMemo(() => {
    let result = [...tasks];

    // Filter
    if (filter === 'pending') result = result.filter(t => t.status !== 'Completed');
    if (filter === 'completed') result = result.filter(t => t.status === 'Completed');

    // Search
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(lowerSearch) || 
        t.description?.toLowerCase().includes(lowerSearch) ||
        t.category?.toLowerCase().includes(lowerSearch)
      );
    }

    // Sort
    if (isSmartSorted) {
      result.sort((a, b) => calculateSmartScore(b) - calculateSmartScore(a));
    } else {
      result.sort((a, b) => b.createdAt - a.createdAt);
    }

    if (groupingMode === 'none') return { 'Tất cả': result };

    const groups: Record<string, Task[]> = {};
    result.forEach(task => {
      let key = 'Khác';
      if (groupingMode === 'category') key = task.category || 'Chưa phân loại';
      if (groupingMode === 'priority') {
        key = task.priority === 'high' ? 'Ưu tiên Cao' : task.priority === 'medium' ? 'Ưu tiên Trung bình' : 'Ưu tiên Thấp';
      }
      if (groupingMode === 'status') key = task.status === 'Completed' ? 'Đã hoàn thành' : 'Đang thực hiện';
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });

    return groups;
  }, [tasks, filter, isSmartSorted, calculateSmartScore, groupingMode]);

  const processedTasks = useMemo(() => {
    return Object.values(groupedTasks).flat();
  }, [groupedTasks]);

  const analyticsData = useMemo(() => {
    // 1. Completion Trend (Last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const trend = last7Days.map(date => {
      const completedOnDate = tasks.filter(t => 
        t.status === 'Completed' && 
        t.completedAt && 
        new Date(t.completedAt).toISOString().split('T')[0] === date
      ).length;
      return { date: new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }), count: completedOnDate };
    });

    // 2. Priority Distribution
    const priorities = [
      { name: 'Cao', value: tasks.filter(t => t.priority === 'high').length, color: '#ef4444' },
      { name: 'Trung bình', value: tasks.filter(t => t.priority === 'medium').length, color: '#f59e0b' },
      { name: 'Thấp', value: tasks.filter(t => t.priority === 'low').length, color: '#64748b' },
    ];

    return { trend, priorities };
  }, [tasks]);

  const topTask = useMemo(() => {
    const pending = tasks.filter(t => t.status !== 'Completed');
    if (pending.length === 0) return null;
    return [...pending].sort((a, b) => calculateSmartScore(b) - calculateSmartScore(a))[0];
  }, [tasks, calculateSmartScore]);

  return (
    <div className="space-y-6">
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

      {topTask && filter !== 'completed' && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 p-1 rounded-2xl shadow-xl shadow-emerald-600/20"
        >
          <div className="bg-white/95 backdrop-blur-sm p-4 rounded-[14px] flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0 animate-pulse">
              <Zap size={24} fill="currentColor" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest mb-1">Nhiệm vụ quan trọng nhất hiện tại</p>
              <h3 className="font-extrabold text-slate-900 truncate">{topTask.title}</h3>
              <p className="text-xs text-slate-500 truncate">{topTask.aiSuggestion || 'Hãy tập trung hoàn thành nhiệm vụ này ngay!'}</p>
            </div>
            <button 
              onClick={() => toggleTask(topTask.id)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
            >
              Hoàn thành ngay
            </button>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {showAnalytics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-panel p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <TrendingUp size={18} className="text-emerald-500" />
                  Xu hướng hoàn thành (7 ngày qua)
                </h3>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analyticsData.trend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#10b981" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <PieChartIcon size={18} className="text-indigo-500" />
                  Phân bổ theo mức độ ưu tiên
                </h3>
                <div className="h-[200px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.priorities}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {analyticsData.priorities.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Sparkles className="text-emerald-500" size={24} />
              Quản lý Nhiệm vụ Thông minh
            </h2>
            <p className="text-sm text-slate-500">Tối ưu hóa hiệu suất bằng thuật toán ưu tiên thông minh</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all border",
                showAnalytics 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              <BarChart3 size={18} />
              {showAnalytics ? 'Ẩn Phân tích' : 'Xem Phân tích'}
            </button>
            <button 
              onClick={() => setIsSmartSorted(!isSmartSorted)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all border",
                isSmartSorted 
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              <ArrowUpDown size={18} />
              {isSmartSorted ? 'Sắp xếp Thông minh' : 'Sắp xếp Mới nhất'}
            </button>
            <button 
              onClick={smartAnalyzeTasks}
              disabled={isAnalyzing || tasks.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/20 hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
            >
              {isAnalyzing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Brain size={18} />
              )}
              {isAnalyzing ? 'Đang phân tích...' : 'AI Phân tích'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tìm kiếm nhiệm vụ</label>
            <div className="relative">
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tiêu đề, mô tả hoặc danh mục..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tên nhiệm vụ</label>
            <div className="relative">
              <input 
                type="text" 
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Nhập nhiệm vụ mới..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              <button
                onClick={toggleListeningTitle}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all",
                  isListeningTitle ? "text-rose-500 bg-rose-50 animate-pulse" : "text-slate-400 hover:text-emerald-600 hover:bg-slate-100"
                )}
                title={isListeningTitle ? "Dừng nghe" : "Nhập bằng giọng nói"}
              >
                {isListeningTitle ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hạn chót</label>
            <input 
              type="date" 
              value={newTaskDeadline}
              onChange={(e) => setNewTaskDeadline(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-600"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mô tả chi tiết</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Thêm chi tiết (không bắt buộc)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
                <button
                  onClick={toggleListeningDesc}
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all",
                    isListeningDesc ? "text-rose-500 bg-rose-50 animate-pulse" : "text-slate-400 hover:text-emerald-600 hover:bg-slate-100"
                  )}
                  title={isListeningDesc ? "Dừng nghe" : "Nhập bằng giọng nói"}
                >
                  {isListeningDesc ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              </div>
              <button 
                onClick={addTask}
                className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all"
              >
                <Plus size={24} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Filter size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase">Lọc:</span>
            </div>
            <div className="flex gap-1">
              {(['all', 'pending', 'completed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "text-xs font-bold px-3 py-1 rounded-full transition-all",
                    filter === f ? "bg-emerald-100 text-emerald-700" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {f === 'all' ? 'Tất cả' : f === 'pending' ? 'Chưa xong' : 'Đã xong'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <ArrowUpDown size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase">Gom nhóm:</span>
            </div>
            <div className="flex gap-1">
              {(['none', 'category', 'priority', 'status'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setGroupingMode(m)}
                  className={cn(
                    "text-xs font-bold px-3 py-1 rounded-full transition-all",
                    groupingMode === m ? "bg-indigo-100 text-indigo-700" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {m === 'none' ? 'Không' : m === 'category' ? 'Danh mục' : m === 'priority' ? 'Ưu tiên' : 'Trạng thái'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {selectedTaskIds.size > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between bg-slate-900 text-white p-3 rounded-xl mb-4 shadow-lg"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold px-2 py-1 bg-white/20 rounded-lg">
                Đã chọn {selectedTaskIds.size}
              </span>
              <button 
                onClick={selectAllTasks}
                className="text-xs font-bold hover:text-emerald-400 transition-colors"
              >
                {selectedTaskIds.size === processedTasks.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={batchToggleStatus}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold transition-colors"
              >
                <CheckCircle2 size={14} />
                Đổi trạng thái
              </button>
              <button 
                onClick={batchDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 rounded-lg text-xs font-bold transition-colors"
              >
                <Trash2 size={14} />
                Xóa đã chọn
              </button>
            </div>
          </motion.div>
        )}

        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {Object.entries(groupedTasks).map(([groupName, groupTasks]) => (
              <div key={groupName} className="space-y-3">
                {groupingMode !== 'none' && (
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {groupName} ({groupTasks.length})
                  </h4>
                )}
                {groupTasks.map((task) => {
                  const isOverdue = task.deadline && task.status !== 'Completed' && new Date(task.deadline) < new Date(new Date().setHours(0,0,0,0));
                  const score = calculateSmartScore(task);
                  const isSelected = selectedTaskIds.has(task.id);
                  
                  return (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={cn(
                        "group flex items-start gap-4 p-4 rounded-2xl border transition-all duration-300",
                        task.status === 'Completed' 
                          ? "bg-slate-50/50 border-slate-100 opacity-75" 
                          : isOverdue
                            ? "bg-rose-50 border-rose-200 hover:border-rose-300"
                            : "bg-white border-slate-200 hover:border-emerald-200 hover:shadow-md",
                        topTask?.id === task.id && task.status !== 'Completed' && "ring-2 ring-emerald-500 ring-offset-2",
                        isSelected && "border-emerald-500 bg-emerald-50/30"
                      )}
                      style={{
                        borderLeft: task.priority === 'high' ? '4px solid #ef4444' : 
                                    task.priority === 'medium' ? '4px solid #f59e0b' : 
                                    '4px solid #10b981'
                      }}
                    >
                      <div className="flex flex-col gap-2 mt-1">
                        <button 
                          onClick={() => toggleTask(task.id)}
                          className={cn(
                            "transition-colors",
                            task.status === 'Completed' ? "text-emerald-500" : isOverdue ? "text-rose-500" : "text-slate-300 hover:text-emerald-400"
                          )}
                        >
                          {task.status === 'Completed' ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                        </button>
                        <button 
                          onClick={() => toggleSelectTask(task.id)}
                          className={cn(
                            "p-1 rounded-md transition-all",
                            isSelected ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                          )}
                        >
                          <div className={cn("w-3 h-3 rounded-sm border-2", isSelected ? "border-white" : "border-slate-300")} />
                        </button>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className={cn(
                            "font-bold text-sm truncate max-w-[200px]",
                            task.status === 'Completed' ? "text-slate-400 line-through" : isOverdue ? "text-rose-700" : "text-slate-900"
                          )}>
                            {task.title}
                          </h3>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={cn(
                              "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1",
                              task.priority === 'high' ? "bg-rose-100 text-rose-600" :
                              task.priority === 'medium' ? "bg-amber-100 text-amber-600" :
                              "bg-slate-100 text-slate-600"
                            )}>
                              {task.priority === 'high' ? <AlertCircle size={10} /> : 
                               task.priority === 'medium' ? <Clock size={10} /> : 
                               <CheckSquare size={10} />}
                              {task.priority === 'high' ? 'Cao' : task.priority === 'medium' ? 'Trung bình' : 'Thấp'}
                            </span>
                            {isSmartSorted && task.status !== 'Completed' && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-600">
                                Điểm: {score}
                              </span>
                            )}
                            {task.category && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-indigo-100 text-indigo-600 flex items-center gap-1">
                                <Tag size={8} />
                                {task.category}
                              </span>
                            )}
                            {task.estimatedTime && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-slate-100 text-slate-600 flex items-center gap-1">
                                <Timer size={8} />
                                {task.estimatedTime}
                              </span>
                            )}
                            {task.deadline && (
                              <span className={cn(
                                "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1",
                                isOverdue ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-500"
                              )}>
                                <Clock size={8} />
                                {isOverdue ? `Quá hạn: ${new Date(task.deadline).toLocaleDateString('vi-VN')}` : new Date(task.deadline).toLocaleDateString('vi-VN')}
                              </span>
                            )}
                          </div>
                        </div>
                        {task.description && (
                          <p className={cn(
                            "text-xs mb-2",
                            task.status === 'Completed' ? "text-slate-400" : isOverdue ? "text-rose-600/70" : "text-slate-500"
                          )}>{task.description}</p>
                        )}

                        {task.subTasks && task.subTasks.length > 0 && (
                          <div className="mt-3 space-y-2 pl-2 border-l-2 border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Các bước thực hiện:</p>
                            {task.subTasks.map((st, idx) => (
                              <div key={idx} className="flex items-start gap-2 group/sub">
                                <button 
                                  onClick={() => toggleSubTask(task.id, idx)}
                                  className={cn(
                                    "mt-0.5 transition-colors",
                                    st.status === 'Completed' ? "text-emerald-500" : "text-slate-300 hover:text-emerald-400"
                                  )}
                                >
                                  {st.status === 'Completed' ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={cn(
                                    "text-[11px] font-bold",
                                    st.status === 'Completed' ? "text-slate-400 line-through" : "text-slate-700"
                                  )}>{st.title}</p>
                                  {st.description && (
                                    <p className={cn(
                                      "text-[10px]",
                                      st.status === 'Completed' ? "text-slate-300" : "text-slate-500"
                                    )}>{st.description}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 pl-2">
                          <button
                            onClick={() => {
                              const title = prompt("Nhập tiêu đề bước con:");
                              if (!title) return;
                              updateTasks(tasks.map(t => 
                                t.id === task.id 
                                  ? { ...t, subTasks: [...(t.subTasks || []), { title, description: '', status: 'Pending' }] } 
                                  : t
                              ));
                            }}
                            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                          >
                            <Plus size={12} /> Thêm bước con
                          </button>
                        </div>
                        {task.aiSuggestion && (
                          <div className={cn(
                            "flex items-start gap-2 p-2 rounded-lg border",
                            isOverdue 
                              ? "bg-rose-100/50 border-rose-200/50" 
                              : "bg-emerald-50/50 border-emerald-100/50"
                          )}>
                            <Sparkles size={12} className={cn("mt-0.5 shrink-0", isOverdue ? "text-rose-500" : "text-emerald-500")} />
                            <p className={cn(
                              "text-[11px] italic leading-relaxed",
                              isOverdue ? "text-rose-700" : "text-emerald-700"
                            )}>{task.aiSuggestion}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => handleDecomposeTask(task)}
                          disabled={isDecomposing === task.id || task.status === 'Completed'}
                          className="p-2 text-slate-400 hover:text-indigo-500 transition-all disabled:opacity-50"
                          title="Chia nhỏ nhiệm vụ bằng AI"
                        >
                          {isDecomposing === task.id ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                        </button>
                        <button 
                          onClick={() => deleteTask(task.id)}
                          className="p-2 text-slate-400 hover:text-rose-500 transition-all"
                          title="Xóa nhiệm vụ"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </AnimatePresence>

          {processedTasks.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-slate-200" />
              </div>
              <p className="text-slate-400 font-medium">Không có nhiệm vụ nào trong danh sách</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hoàn thành</p>
            <p className="text-xl font-extrabold text-slate-900">{tasks.filter(t => t.status === 'Completed').length}</p>
          </div>
        </div>
        <div className="glass-panel p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đang chờ</p>
            <p className="text-xl font-extrabold text-slate-900">{tasks.filter(t => t.status !== 'Completed').length}</p>
          </div>
        </div>
        <div className="glass-panel p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ưu tiên cao</p>
            <p className="text-xl font-extrabold text-slate-900">{tasks.filter(t => t.priority === 'high' && t.status !== 'Completed').length}</p>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setTaskToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Xác nhận xóa"
        message={`Bạn có chắc chắn muốn xóa nhiệm vụ "${taskToDelete?.title}"?`}
        confirmText="Xóa nhiệm vụ"
        cancelText="Hủy"
        type="danger"
      />

      <ConfirmationModal
        isOpen={batchDeleteModalOpen}
        onClose={() => setBatchDeleteModalOpen(false)}
        onConfirm={confirmBatchDelete}
        title="Xác nhận xóa hàng loạt"
        message={`Bạn có chắc chắn muốn xóa ${selectedTaskIds.size} nhiệm vụ đã chọn?`}
        confirmText="Xóa tất cả"
        cancelText="Hủy"
        type="danger"
      />
    </div>
  );
};
