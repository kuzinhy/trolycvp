import React, { useState, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileText,
  Calendar,
  TrendingUp,
  CheckSquare
} from 'lucide-react';
import { TrackingItem, Task } from '../constants';
import { cn } from '../lib/utils';
import { TaskManagement } from './TaskManagement';
import { ToastType } from './ui/Toast';

interface ProgressTrackingProps {
  items: TrackingItem[];
  tasks: Task[];
  setTasks: (updater: Task[] | ((prev: Task[]) => Task[])) => Promise<void>;
  showToast: (message: string, type?: ToastType) => void;
}

export const ProgressTracking: React.FC<ProgressTrackingProps> = memo(({ items, tasks, setTasks, showToast }) => {
  const [activeTab, setActiveTab] = useState<'progress' | 'tasks'>('progress');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'in_progress' | 'pending'>('all');

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return { backgroundColor: '#dbeafe', color: '#1e40af' }; // Light blue
      case 'in_progress':
        return { backgroundColor: '#ffedd5', color: '#9a3412' }; // Light orange
      case 'completed':
        return { backgroundColor: '#d1fae5', color: '#065f46' }; // Light green
      default:
        return {};
    }
  };

  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return items.filter(item => {
      const matchesSearch = !term || 
                            item.content.toLowerCase().includes(term) || 
                            item.authority.toLowerCase().includes(term) ||
                            item.source.toLowerCase().includes(term);
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [items, searchTerm, filterStatus]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto p-8 space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-600/20">
              <TrendingUp size={24} />
            </div>
            Theo dõi & Quản lý
          </h2>
          <p className="text-slate-500 mt-2 text-sm font-medium">Hệ thống theo dõi tiến độ và quản lý nhiệm vụ tập trung</p>
        </div>
        <div className="flex p-1 bg-slate-100/80 rounded-2xl border border-slate-200 shadow-inner w-fit">
          <button
            onClick={() => setActiveTab('progress')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
              activeTab === 'progress' 
                ? "bg-white text-emerald-700 shadow-md ring-1 ring-emerald-100" 
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
            )}
          >
            <TrendingUp size={16} />
            Tiến độ
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
              activeTab === 'tasks' 
                ? "bg-white text-indigo-700 shadow-md ring-1 ring-indigo-100" 
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
            )}
          >
            <CheckSquare size={16} />
            Nhiệm vụ
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'progress' ? (
          <motion.div
            key="progress-tab"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-250px)]">
              {/* Toolbar */}
              <div className="p-6 border-b border-slate-200/60 flex flex-col sm:flex-row gap-6 justify-between items-center bg-slate-50/30">
                <div className="relative w-full sm:w-96 group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
                  <input 
                    type="text" 
                    placeholder="Tìm kiếm nội dung, nguồn văn bản..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm placeholder:text-slate-400"
                  />
                </div>
                <div className="flex gap-1.5 w-full sm:w-auto p-1 bg-slate-100 rounded-xl border border-slate-200/60">
                  {(['all', 'completed', 'in_progress', 'pending'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                        filterStatus === status 
                          ? "bg-white text-slate-900 shadow-sm" 
                          : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                      )}
                    >
                      {status === 'all' ? 'Tất cả' : status === 'completed' ? 'Đã xong' : status === 'in_progress' ? 'Đang làm' : 'Chờ xử lý'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-auto flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur-sm shadow-sm">
                    <tr className="text-[10px] uppercase tracking-widest text-slate-400 font-bold border-b border-slate-200/60">
                      <th className="p-5 w-16 text-center">#</th>
                      <th className="p-5 w-[40%]">Nội dung chỉ đạo / Kết luận</th>
                      <th className="p-5 w-[15%]">Nguồn văn bản</th>
                      <th className="p-5 w-[15%]">Thẩm quyền</th>
                      <th className="p-5 w-[15%]">Trạng thái</th>
                      <th className="p-5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((item, index) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-5 text-center font-mono text-xs text-slate-400 font-bold" style={getStatusStyle(item.status)}>{index + 1}</td>
                        <td className="p-5" style={getStatusStyle(item.status)}>
                          <p className="text-sm text-slate-700 font-medium leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all duration-500">
                            {item.content}
                          </p>
                        </td>
                        <td className="p-5" style={getStatusStyle(item.status)}>
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-100/50 border border-slate-200 px-3 py-1.5 rounded-xl w-fit group-hover:bg-white transition-colors">
                            <FileText size={12} className="text-slate-400" />
                            {item.source}
                          </div>
                        </td>
                        <td className="p-5" style={getStatusStyle(item.status)}>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {item.authority}
                          </div>
                        </td>
                        <td className="p-5" style={getStatusStyle(item.status)}>
                          <span className={cn(
                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold border uppercase tracking-widest shadow-sm",
                            item.status === 'completed' && "bg-emerald-50 text-emerald-700 border-emerald-100",
                            item.status === 'in_progress' && "bg-blue-50 text-blue-700 border-blue-100",
                            item.status === 'pending' && "bg-amber-50 text-amber-700 border-amber-100"
                          )}>
                            {item.status === 'completed' && <CheckCircle2 size={12} />}
                            {item.status === 'in_progress' && <Clock size={12} />}
                            {item.status === 'pending' && <AlertCircle size={12} />}
                            {item.status === 'completed' ? 'Hoàn thành' : item.status === 'in_progress' ? 'Đang thực hiện' : 'Chờ xử lý'}
                          </span>
                        </td>
                        <td className="p-5 text-right" style={getStatusStyle(item.status)}>
                          <button className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-sm border border-transparent hover:border-slate-200">
                            <MoreHorizontal size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredItems.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                    <div className="p-8 bg-slate-50 rounded-full mb-6">
                      <Search size={48} className="opacity-10" />
                    </div>
                    <p className="text-sm font-bold text-slate-500">Không tìm thấy dữ liệu phù hợp</p>
                    <p className="text-xs mt-2 font-medium">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="tasks-tab"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <TaskManagement 
                tasks={tasks} 
                setTasks={setTasks} 
                showToast={showToast} 
                isEmbedded={true}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

ProgressTracking.displayName = 'ProgressTracking';
