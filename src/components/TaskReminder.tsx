import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task } from '../constants';
import { CheckSquare, Plus, AlertCircle, Trash2 } from 'lucide-react';
import { ToastType } from './ui/Toast';

interface TaskReminderProps {
  tasks: Task[];
  setTasks: (updater: Task[] | ((prev: Task[]) => Task[])) => void;
  showToast: (message: string, type?: ToastType) => void;
  onViewTasks?: () => void;
}

export const TaskReminder: React.FC<TaskReminderProps> = ({ tasks, setTasks, showToast, onViewTasks }) => {
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [time, setTime] = useState('09:00');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isAdding, setIsAdding] = useState(false);
  const [reminderType, setReminderType] = useState<'minutes' | 'hours' | 'days' | 'none'>('minutes');
  const [reminderValue, setReminderValue] = useState(30);

  const handleAdd = () => {
    if (title && deadline) {
      setTasks([...tasks, { 
        id: Date.now().toString() + Math.random(), 
        title, 
        deadline, 
        time,
        priority, 
        status: 'Pending',
        createdAt: Date.now(),
        reminderType,
        reminderValue
      }]);
      setTitle('');
      setDeadline('');
      setTime('09:00');
      setIsAdding(false);
      showToast("Đã thêm công việc mới!", "success");
    }
  };

  const handleStatusChange = (id: string, status: 'Pending' | 'In Progress' | 'Completed') => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status } : t));
    showToast(`Đã cập nhật trạng thái: ${status}`, "info");
  };

  const handleDelete = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    showToast("Đã xóa công việc!", "info");
  };

  const sortedTasks = [...tasks].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()).slice(0, 5); // Show top 5

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-300 group h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <CheckSquare size={16} className="text-indigo-500" /> Nhiệm vụ trọng tâm
        </h3>
        <div className="flex items-center gap-2">
          {onViewTasks && (
            <button 
              onClick={onViewTasks}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline uppercase tracking-wider"
            >
              Chi tiết
            </button>
          )}
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="p-1.5 rounded-lg hover:bg-indigo-50 transition-colors text-slate-400 hover:text-indigo-600"
          >
            <Plus size={16} className={isAdding ? "rotate-45 transition-transform" : "transition-transform"} />
          </button>
        </div>
      </div>
      
      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100 overflow-hidden"
          >
            <input 
              type="text" 
              placeholder="Tên công việc" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="w-full text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            <div className="flex gap-2">
              <input 
                type="date" 
                value={deadline} 
                onChange={e => setDeadline(e.target.value)} 
                className="flex-1 text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-600"
              />
              <input 
                type="time" 
                value={time} 
                onChange={e => setTime(e.target.value)} 
                className="w-24 text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-600"
              />
            </div>
            <div className="flex gap-2">
              <input 
                type="number"
                min="1"
                value={reminderValue}
                onChange={e => setReminderValue(parseInt(e.target.value))}
                className="w-20 text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              <select
                value={reminderType}
                onChange={e => setReminderType(e.target.value as any)}
                className="flex-1 text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-600"
              >
                <option value="minutes">Phút trước</option>
                <option value="hours">Giờ trước</option>
                <option value="days">Ngày trước</option>
                <option value="none">Không nhắc</option>
              </select>
              <select 
                value={priority} 
                onChange={e => setPriority(e.target.value as any)} 
                className="text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-600"
              >
                <option value="low">Thấp</option>
                <option value="medium">TB</option>
                <option value="high">Cao</option>
              </select>
            </div>
            <button 
              onClick={handleAdd} 
              disabled={!title || !deadline}
              className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20"
            >
              Thêm công việc
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
        <AnimatePresence mode="popLayout">
          {sortedTasks.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-8 text-slate-400"
            >
              <CheckSquare size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Không có công việc nào</p>
            </motion.div>
          ) : (
            sortedTasks.map((task, index) => {
              const isOverdue = new Date(task.deadline) < new Date(new Date().setHours(0,0,0,0));
              return (
                <motion.div 
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className={`group/item flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isOverdue ? 'bg-rose-50/50 border-rose-100 hover:border-rose-200' : 
                    task.priority === 'high' ? 'bg-rose-50 border-rose-100' :
                    task.priority === 'medium' ? 'bg-amber-50 border-amber-100' :
                    'bg-emerald-50 border-emerald-100'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      task.priority === 'high' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 
                      task.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isOverdue ? 'text-rose-700 font-bold' : 'text-slate-700'}`}>
                        {task.title}
                      </p>
                      <p className={`text-[10px] font-black uppercase tracking-wider mt-0.5 flex items-center gap-1 ${isOverdue ? 'text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-md w-fit' : 'text-slate-400'}`}>
                        {isOverdue && <AlertCircle size={10} />}
                        {isOverdue ? 'QUÁ HẠN: ' : 'HẠN: '}
                        {new Date(task.deadline).toLocaleDateString('vi-VN')}
                        {task.reminderType && task.reminderType !== 'none' && (
                          <span className="ml-1 text-[9px] font-medium text-indigo-500 bg-indigo-50 px-1 rounded truncate">
                            • Nhắc: {task.reminderValue} {task.reminderType === 'minutes' ? 'p' : task.reminderType === 'hours' ? 'g' : 'n'}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select 
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value as any)}
                      className="text-[10px] font-bold uppercase tracking-wider bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                    <button 
                      onClick={() => handleDelete(task.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      title="Xóa"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

