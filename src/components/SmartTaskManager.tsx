import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Trash2, CheckCircle2, Circle, Brain, Clock, AlertCircle,
  CheckSquare, Sparkles, Filter, Tag, Timer, Mic, MicOff,
  ArrowUpDown, Zap, Search, BarChart3, TrendingUp,
  PieChart as PieChartIcon, Loader2, FileSpreadsheet
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import * as XLSX from 'xlsx';
import { cn } from '../lib/utils';
import { useDashboardContext } from '../context/DashboardContext';
import { Task } from '../constants';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { generateContentWithRetry, parseAIResponse } from '../lib/ai-utils';
import { toast } from 'react-hot-toast';

export const SmartTaskManager: React.FC = () => {
  const { tasks, updateTasks } = useDashboardContext();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);

  const handleAIAnalyze = async (task: Task) => {
    setIsAnalyzing(task.id);
    try {
      const prompt = `Phân tích nhiệm vụ sau và đề xuất:
      1. Mức độ ưu tiên ('high', 'medium', 'low').
      2. Các bước thực hiện (mảng các tiêu đề).
      Nhiệm vụ: ${task.title}
      Mô tả: ${task.description || 'Không có mô tả'}
      Hạn chót: ${task.deadline}
      
      Trả về JSON: { "priority": "...", "steps": ["...", "..."] }
      (Chỉ trả về JSON, không có định dạng khác)`;

      const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });
      
      const analysis = parseAIResponse(response.text);
      
      if (analysis && analysis.priority && analysis.steps) {
        updateTasks(tasks.map(t => 
          t.id === task.id 
            ? { 
                ...t, 
                priority: analysis.priority, 
                subTasks: analysis.steps.map((st: string) => ({ title: st, description: '', status: 'Pending' })) 
              } 
            : t
        ));
        toast.success('Đã cập nhật phân tích từ AI!');
      }
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi phân tích!');
    } finally {
      setIsAnalyzing(null);
    }
  };

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    const isDuplicate = tasks.some(t => t.title.trim().toLowerCase() === newTaskTitle.trim().toLowerCase());
    if (isDuplicate) {
      toast.error('Nhiệm vụ này đã tồn tại!');
      return;
    }
    const newTask: Task = {
      id: `t-${Date.now()}`,
      title: newTaskTitle,
      description: newTaskDesc,
      deadline: newTaskDeadline || new Date().toISOString().split('T')[0],
      time: newTaskTime,
      priority: 'medium',
      status: 'Pending',
      createdAt: Date.now(),
    };
    updateTasks([newTask, ...tasks]);
    setNewTaskTitle('');
    setNewTaskDesc('');
  };

  const openDeleteModal = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    setTaskToDelete(task);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!taskToDelete) return;
    updateTasks(tasks.filter(t => t.id !== taskToDelete.id));
    toast.success('Đã xóa nhiệm vụ');
    setTaskToDelete(null);
    setDeleteModalOpen(false);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(tasks.map(t => ({
      'Tiêu đề': t.title,
      'Mô tả': t.description,
      'Hạn chót': t.deadline,
      'Trạng thái': t.status,
      'Ưu tiên': t.priority
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Nhiệm vụ');
    XLSX.writeFile(workbook, 'Danh_sach_nhiem_vu.xlsx');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Sổ tay Thống kê Nhiệm vụ</h2>
        <div className="flex gap-2">
            <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700">
                <FileSpreadsheet size={16} /> Xuất Excel
            </button>
        </div>
      </div>
      
      <div className="flex gap-2 mb-4">
        <input 
          value={newTaskTitle} 
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Tên nhiệm vụ mới..."
          className="flex-1 p-2 rounded-lg border border-slate-200"
        />
        <button onClick={addTask} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">Thêm</button>
      </div>

      <div className="space-y-2">
        {tasks.map(task => (
          <div key={task.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
            <span>{task.title}</span>
            <div className="flex gap-2">
              <button 
                onClick={() => handleAIAnalyze(task)} 
                className="text-blue-500 hover:text-blue-700 p-1.5 rounded-lg hover:bg-blue-50"
                title="AI Phân tích"
                disabled={isAnalyzing === task.id}
              >
                {isAnalyzing === task.id ? <Loader2 size={18} className="animate-spin" /> : <Brain size={18} />}
              </button>
              <button onClick={() => openDeleteModal(task.id)} className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Xóa nhiệm vụ"
        message="Bạn chắc chắn muốn xóa nhiệm vụ này?"
      />
    </div>
  );
};
