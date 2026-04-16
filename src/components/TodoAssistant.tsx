import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, CheckCircle2, Circle, Timer, AlertCircle, Clock, ArrowDown, Edit2, Check, X, Calendar as CalendarIcon, Percent, Search, Filter, LayoutGrid, List, Sparkles, ChevronRight, Zap } from 'lucide-react';
import { Task } from '../constants';
import { ToastType } from './ui/Toast';
import { cn } from '../lib/utils';

interface TodoAssistantProps {
  tasks: Task[];
  updateTasks: (updater: Task[] | ((prev: Task[]) => Task[])) => void;
  showToast: (message: string, type?: ToastType) => void;
  onStartFocus: (task: Task) => void;
}

const getPriorityStyles = (priority: string) => {
  switch (priority) {
    case 'high': return 'bg-rose-50 text-rose-600 border-rose-100';
    case 'medium': return 'bg-amber-50 text-amber-600 border-amber-100';
    case 'low': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    default: return 'bg-slate-50 text-slate-600 border-slate-200';
  }
};

const getStatusStyles = (status: string) => {
  switch (status) {
    case 'In Progress': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
    case 'Completed': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    default: return 'bg-slate-50 text-slate-600 border-slate-200';
  }
};

import { ConfirmationModal } from './ui/ConfirmationModal';

const TaskDetailModal = ({ 
  task, 
  allTasks,
  onClose, 
  onUpdate, 
  onDelete 
}: { 
  task: Task; 
  allTasks: Task[];
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [deadline, setDeadline] = useState(task.deadline ? task.deadline.split('T')[0] : '');
  const [time, setTime] = useState(task.time || '');
  const [progress, setProgress] = useState(task.progress || 0);
  const [priority, setPriority] = useState(task.priority);
  const [status, setStatus] = useState(task.status);
  const [dependencies, setDependencies] = useState<string[]>(task.dependencies || []);

  const handleSave = () => {
    let newStatus = status;
    if (progress === 100) newStatus = 'Completed';
    else if (progress > 0 && status === 'Pending') newStatus = 'In Progress';
    else if (progress === 0 && status === 'In Progress') newStatus = 'Pending';
    
    onUpdate(task.id, { title, description, deadline, time, progress, priority, status: newStatus, dependencies });
    setIsEditing(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Modal Header */}
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className={cn("w-3 h-3 rounded-full", 
                task.priority === 'high' ? "bg-rose-500" : 
                task.priority === 'medium' ? "bg-amber-500" : "bg-emerald-500"
              )} />
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Chi tiết ghi chú</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
              <X size={24} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {isEditing ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Tiêu đề</label>
                  <input 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 font-bold text-slate-800 text-lg outline-none rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Nội dung chi tiết</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 text-slate-600 outline-none resize-none rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all min-h-[200px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Thời hạn</label>
                    <div className="flex gap-2">
                      <input 
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600 outline-none rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                      />
                      <input 
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-32 bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600 outline-none rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Tiến độ ({progress}%)</label>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={progress}
                      onChange={(e) => setProgress(Number(e.target.value))}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-4"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Mức độ ưu tiên</label>
                    <select 
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600 outline-none rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                    >
                      <option value="low">Thấp</option>
                      <option value="medium">Trung bình</option>
                      <option value="high">Cao</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Trạng thái</label>
                    <select 
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600 outline-none rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                    >
                      <option value="Pending">Cần làm</option>
                      <option value="In Progress">Đang làm</option>
                      <option value="Completed">Hoàn thành</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Phụ thuộc vào nhiệm vụ (Dependencies)</label>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-200 custom-scrollbar">
                    {allTasks.filter(t => t.id !== task.id).map(t => (
                      <label key={t.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg transition-colors cursor-pointer group">
                        <input 
                          type="checkbox"
                          checked={dependencies.includes(t.id)}
                          onChange={(e) => {
                            if (e.target.checked) setDependencies([...dependencies, t.id]);
                            else setDependencies(dependencies.filter(id => id !== t.id));
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-xs font-bold truncate", t.status === 'Completed' ? "text-slate-400 line-through" : "text-slate-700")}>
                            {t.title}
                          </p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">
                            {t.status === 'Completed' ? 'Đã xong' : 'Chưa xong'}
                          </p>
                        </div>
                      </label>
                    ))}
                    {allTasks.length <= 1 && (
                      <p className="text-xs text-slate-400 italic text-center py-4">Không có nhiệm vụ khác để liên kết.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 leading-tight">{task.title}</h3>
                  <div className="flex flex-wrap gap-3 mt-4">
                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", getPriorityStyles(task.priority))}>
                      Ưu tiên: {task.priority === 'high' ? 'Cao' : task.priority === 'medium' ? 'TB' : 'Thấp'}
                    </span>
                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", getStatusStyles(task.status))}>
                      Trạng thái: {task.status === 'Pending' ? 'Cần làm' : task.status === 'In Progress' ? 'Đang làm' : 'Xong'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap text-base">
                    {task.description || <span className="italic text-slate-400">Không có nội dung chi tiết.</span>}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <CalendarIcon size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời hạn</p>
                      <p className="text-sm font-bold text-slate-700">
                        {task.deadline ? new Date(task.deadline).toLocaleDateString('vi-VN') : 'Chưa thiết lập'}
                        {task.time && <span className="ml-2 text-indigo-600">({task.time})</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <Percent size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiến độ</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${task.progress || 0}%` }} />
                        </div>
                        <span className="text-sm font-bold text-slate-700">{task.progress || 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <button 
              onClick={() => setIsDeleting(true)}
              className="flex items-center gap-2 px-4 py-2 text-rose-600 font-bold text-sm hover:bg-rose-50 rounded-xl transition-colors"
            >
              <Trash2 size={18} />
              Xóa ghi chú
            </button>
            
            <div className="flex gap-3">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
                    Hủy thay đổi
                  </button>
                  <button onClick={handleSave} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
                    Lưu cập nhật
                  </button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2">
                  <Edit2 size={18} />
                  Chỉnh sửa
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <ConfirmationModal 
        isOpen={isDeleting}
        onClose={() => setIsDeleting(false)}
        onConfirm={() => {
          onDelete(task.id);
          onClose();
        }}
        title="Xóa ghi chú"
        message="Bạn có chắc chắn muốn xóa ghi chú này? Hành động này không thể hoàn tác."
        confirmText="Xóa ngay"
        cancelText="Hủy"
        type="danger"
      />
    </>
  );
};

const StickyNote = ({ 
  task, 
  onUpdate, 
  onDelete,
  onViewDetails,
  onStartFocus,
  allTasks
}: { 
  task: Task; 
  onUpdate: (id: string, updates: Partial<Task>) => void; 
  onDelete: (id: string) => void;
  onViewDetails: (task: Task) => void;
  onStartFocus: (task: Task) => void;
  allTasks: Task[];
}) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const blockedBy = (task.dependencies || []).filter(depId => {
    const depTask = allTasks.find(t => t.id === depId);
    return depTask && depTask.status !== 'Completed';
  });

  const isBlocked = blockedBy.length > 0;

  const cycleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = task.status === 'Pending' ? 'In Progress' : task.status === 'In Progress' ? 'Completed' : 'Pending';
    onUpdate(task.id, { status: nextStatus });
  };

  const cyclePriority = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextPriority = task.priority === 'low' ? 'medium' : task.priority === 'medium' ? 'high' : 'low';
    onUpdate(task.id, { priority: nextPriority });
  };

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(task.id, { status: 'Completed', progress: 100 });
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirmingDelete(true);
  };

  const priorityStyle = getPriorityStyles(task.priority);
  const statusStyle = getStatusStyles(task.status);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      whileHover={{ y: -1 }}
      onClick={() => onViewDetails(task)}
      className={cn(
        "group relative bg-white rounded-xl border transition-all flex flex-col sm:flex-row min-h-[80px] cursor-pointer overflow-hidden",
        task.status === 'Completed' 
          ? "border-slate-100 bg-slate-50/40 opacity-60" 
          : isBlocked 
            ? "border-amber-200 bg-amber-50/20"
            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/30"
      )}
    >
      {isConfirmingDelete && (
        <div className="absolute inset-0 bg-white/98 z-30 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Xóa?</span>
            <div className="flex gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsConfirmingDelete(false); }} 
                className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold hover:bg-slate-200 transition-all"
              >
                Hủy
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} 
                className="px-3 py-1 bg-rose-500 text-white rounded text-[10px] font-bold hover:bg-rose-600 transition-all"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Priority Indicator - Solid Minimal Bar */}
      <div className={cn(
        "w-1 shrink-0",
        task.priority === 'high' ? "bg-rose-400" : 
        task.priority === 'medium' ? "bg-amber-400" : 
        "bg-emerald-400"
      )} />

      <div className="flex-1 p-3 flex flex-col justify-center relative">
        {/* Absolute Action Buttons */}
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
          <button 
            onClick={(e) => { e.stopPropagation(); onStartFocus(task); }}
            className="p-1.5 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
            title="Chế độ tập trung"
          >
            <Zap size={14} />
          </button>
          <button 
            onClick={cyclePriority}
            className="p-1.5 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
            title="Đổi mức độ ưu tiên"
          >
            <AlertCircle size={14} />
          </button>
          <button 
            onClick={cycleStatus}
            className="p-1.5 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
            title="Đổi trạng thái"
          >
            <Timer size={14} />
          </button>
          <button 
            onClick={handleDeleteClick}
            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
            title="Xóa"
          >
            <Trash2 size={14} />
          </button>
        </div>

        <div className="flex items-start gap-4">
          {/* Status Checkbox-style button */}
          <button
            onClick={handleComplete}
            className={cn(
              "mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
              task.status === 'Completed' 
                ? "bg-emerald-500 border-emerald-500 text-white" 
                : "border-slate-200 text-transparent hover:border-indigo-400 hover:text-indigo-400"
            )}
          >
            <Check size={12} strokeWidth={4} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className={cn(
                "font-bold text-sm tracking-tight group-hover:text-indigo-600 transition-colors", 
                task.status === 'Completed' ? "text-slate-400 line-through" : "text-slate-700"
              )}>
                {task.title}
              </h3>
              {isBlocked && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[8px] font-black uppercase tracking-widest">
                  <Clock size={10} />
                  Đang chờ
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  task.priority === 'high' ? "bg-rose-400" : task.priority === 'medium' ? "bg-amber-400" : "bg-emerald-400"
                )} />
                {task.deadline && (
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {new Date(task.deadline).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
            <p className={cn(
              "text-[11px] leading-relaxed line-clamp-2 mb-2",
              task.status === 'Completed' ? "text-slate-300" : "text-slate-400"
            )}>
              {task.description || "Không có mô tả chi tiết"}
            </p>

            {/* Progress Indicator */}
            <div className="flex flex-col gap-1.5 mt-auto">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tiến độ</span>
                <span className={cn(
                  "text-[10px] font-black font-mono",
                  task.status === 'Completed' ? "text-emerald-500" : "text-indigo-600"
                )}>{task.progress || 0}%</span>
              </div>
              <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden group/progress">
                <div 
                  className={cn(
                    "h-full transition-all duration-500 rounded-full",
                    task.status === 'Completed' ? "bg-emerald-500" : "bg-indigo-500"
                  )} 
                  style={{ width: `${task.progress || 0}%` }} 
                />
                {/* Interactive Slider Overlay */}
                <input 
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={task.progress || 0}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    const newProgress = parseInt(e.target.value);
                    onUpdate(task.id, { 
                      progress: newProgress,
                      status: newProgress === 100 ? 'Completed' : (newProgress > 0 ? 'In Progress' : 'Pending')
                    });
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const TodoAssistant: React.FC<TodoAssistantProps> = ({
  tasks,
  updateTasks,
  showToast,
  onStartFocus
}) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [sidebarFilter, setSidebarFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [showSmartSearch, setShowSmartSearch] = useState(false);

  const filteredSidebarTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(sidebarSearch.toLowerCase()) || 
                         (t.description || '').toLowerCase().includes(sidebarSearch.toLowerCase());
    
    if (!matchesSearch) return false;

    if (sidebarFilter === 'pending') return t.status !== 'Completed';
    if (sidebarFilter === 'completed') return t.status === 'Completed';
    if (sidebarFilter === 'overdue') {
      return t.status !== 'Completed' && t.deadline && new Date(t.deadline) < new Date(new Date().setHours(0,0,0,0));
    }
    return true;
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status !== 'Completed').length,
    completed: tasks.filter(t => t.status === 'Completed').length,
    overdue: tasks.filter(t => t.status !== 'Completed' && t.deadline && new Date(t.deadline) < new Date(new Date().setHours(0,0,0,0))).length
  };

  const handleAddNote = () => {
    const newTask: Task = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: 'Ghi chú mới',
      description: '',
      deadline: new Date().toISOString(),
      time: '',
      priority: 'medium',
      status: 'Pending',
      createdAt: Date.now()
    };
    updateTasks(prev => [newTask, ...prev]);
    setSelectedTask(newTask);
  };

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    updateTasks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, ...updates } : t);
      return updated;
    });
    if (selectedTask?.id === id) {
      setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleDeleteTask = (id: string) => {
    updateTasks(prev => prev.filter(t => t.id !== id));
    showToast("Đã xóa ghi chú", "success");
    if (selectedTask?.id === id) setSelectedTask(null);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 overflow-hidden relative">
      {/* Header */}
      <div className="bg-white px-6 py-3 border-b border-slate-200 shadow-sm shrink-0 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSmartSearch(true)}
            className={cn(
              "px-4 py-2 rounded-xl transition-all flex items-center gap-2 font-bold text-xs",
              "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 shadow-sm"
            )}
            title="Tra cứu thông minh"
          >
            <Sparkles size={16} />
            <span>Tra cứu thông minh</span>
          </button>
          <div className="hidden sm:block w-px h-4 bg-slate-300"></div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight">Bảng Ghi Chú</h2>
        </div>
        <button 
          onClick={handleAddNote}
          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-sm shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all flex items-center gap-1.5"
        >
          <Plus size={16} />
          Thêm ghi chú
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Board */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-slate-50/50 relative">
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '40px 40px' }} />
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start max-w-7xl mx-auto">
            <AnimatePresence>
              {tasks.filter(t => t.status !== 'Completed').map(task => (
                <StickyNote 
                  key={task.id} 
                  task={task} 
                  onUpdate={handleUpdateTask} 
                  onDelete={handleDeleteTask} 
                  onViewDetails={setSelectedTask}
                  onStartFocus={onStartFocus}
                  allTasks={tasks}
                />
              ))}
            </AnimatePresence>
          </div>
          
          {tasks.filter(t => t.status !== 'Completed').length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 border border-slate-200">
                <Plus size={40} className="text-slate-300" />
              </div>
              <p className="text-lg font-bold text-slate-600">Bảng ghi chú trống</p>
              <p className="text-sm mt-1">Nhấn "Thêm ghi chú" để bắt đầu</p>
            </div>
          )}
        </div>

        {/* Smart Search Modal */}
        <AnimatePresence>
          {showSmartSearch && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSmartSearch(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
              >
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Tra cứu thông minh</h3>
                      <p className="text-xs text-slate-500 font-medium">Phân tích và tra cứu nhiệm vụ nâng cao</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowSmartSearch(false)}
                    className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                  {/* Left Panel: Stats & Filters */}
                  <div className="w-full md:w-80 border-r border-slate-100 p-6 space-y-6 bg-slate-50/30 overflow-y-auto custom-scrollbar">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng việc</p>
                        <p className="text-xl font-black text-slate-800">{stats.total}</p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Chưa xong</p>
                        <p className="text-xl font-black text-indigo-600">{stats.pending}</p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm">
                        <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Quá hạn</p>
                        <p className="text-xl font-black text-rose-600">{stats.overdue}</p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Đã xong</p>
                        <p className="text-xl font-black text-emerald-600">{stats.completed}</p>
                      </div>
                    </div>

                    {/* Search */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tìm kiếm</label>
                      <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                        <input 
                          type="text"
                          placeholder="Nhập từ khóa..."
                          value={sidebarSearch}
                          onChange={(e) => setSidebarSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                        />
                      </div>
                    </div>

                    {/* Filters */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Trạng thái</label>
                      <div className="flex flex-col gap-2">
                        {(['all', 'pending', 'completed', 'overdue'] as const).map(f => (
                          <button
                            key={f}
                            onClick={() => setSidebarFilter(f)}
                            className={cn(
                              "w-full text-left px-4 py-3 rounded-2xl border transition-all flex items-center justify-between group",
                              sidebarFilter === f 
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200" 
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                            )}
                          >
                            <span className="text-xs font-bold uppercase tracking-wider">
                              {f === 'all' ? 'Tất cả' : f === 'pending' ? 'Chưa xong' : f === 'completed' ? 'Đã xong' : 'Quá hạn'}
                            </span>
                            <ChevronRight size={14} className={cn(
                              "transition-transform",
                              sidebarFilter === f ? "translate-x-1" : "text-slate-300 group-hover:translate-x-1"
                            )} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Panel: Results List */}
                  <div className="flex-1 bg-white flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/20 flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Kết quả tìm thấy: {filteredSidebarTasks.length}
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredSidebarTasks.map(task => (
                          <motion.div
                            key={task.id}
                            layout
                            onClick={() => {
                              setSelectedTask(task);
                              setShowSmartSearch(false);
                            }}
                            className={cn(
                              "p-5 rounded-3xl border transition-all cursor-pointer group/side relative overflow-hidden",
                              task.status === 'Completed' 
                                ? "bg-slate-50/50 border-slate-100 opacity-60" 
                                : "bg-white border-slate-200 hover:border-indigo-400 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1"
                            )}
                          >
                            <div className={cn(
                              "absolute left-0 top-0 bottom-0 w-1.5",
                              task.priority === 'high' ? "bg-rose-500" : task.priority === 'medium' ? "bg-amber-500" : "bg-emerald-500"
                            )} />

                            <div className="flex flex-col gap-3">
                              <div className="flex items-start justify-between gap-3">
                                <h4 className={cn(
                                  "text-sm font-black leading-tight tracking-tight",
                                  task.status === 'Completed' ? "text-slate-400 line-through" : "text-slate-800"
                                )}>{task.title}</h4>
                                <div className={cn(
                                  "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shrink-0",
                                  task.status === 'Completed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-100"
                                )}>
                                  {task.status === 'Pending' ? 'Cần làm' : task.status === 'In Progress' ? 'Đang làm' : 'Xong'}
                                </div>
                              </div>

                              {task.description && (
                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                  {task.description}
                                </p>
                              )}

                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  <span>Tiến độ</span>
                                  <span>{task.progress || 0}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className={cn(
                                      "h-full transition-all duration-500",
                                      task.status === 'Completed' ? "bg-emerald-500" : "bg-indigo-500"
                                    )} 
                                    style={{ width: `${task.progress || 0}%` }} 
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                <div className="flex items-center gap-2">
                                  <CalendarIcon size={12} className="text-slate-400" />
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {task.deadline ? new Date(task.deadline).toLocaleDateString('vi-VN') : 'N/A'}
                                  </span>
                                </div>
                                {task.time && (
                                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[9px] font-black uppercase tracking-widest">
                                    <Clock size={10} />
                                    {task.time}
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      
                      {filteredSidebarTasks.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <Search size={32} className="text-slate-200" />
                          </div>
                          <p className="text-sm font-bold text-slate-400">Không tìm thấy nhiệm vụ nào phù hợp</p>
                          <p className="text-xs text-slate-300 mt-1 uppercase tracking-widest">Vui lòng thử từ khóa khác</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                  <div className="flex flex-col">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Hệ thống AI Assistant</p>
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Elite Strategic Command v6.0</p>
                  </div>
                  <button 
                    onClick={() => setShowSmartSearch(false)}
                    className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                  >
                    Đóng
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedTask && (
          <TaskDetailModal 
            task={selectedTask}
            allTasks={tasks}
            onClose={() => setSelectedTask(null)}
            onUpdate={handleUpdateTask}
            onDelete={handleDeleteTask}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

