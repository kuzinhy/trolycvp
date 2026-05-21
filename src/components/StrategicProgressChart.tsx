import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Task } from '../constants';
import { cn } from '../lib/utils';
import { 
  CheckCircle2, 
  Clock, 
  PlayCircle,
  AlertCircle,
  Calendar,
  BarChart,
  Target,
  Flame
} from 'lucide-react';

interface StrategicProgressChartProps {
  tasks: Task[];
}

export const StrategicProgressChart: React.FC<StrategicProgressChartProps> = ({ tasks }) => {
  const ongoingTasks = useMemo(() => {
    return tasks
      .filter(t => t.status !== 'Completed')
      .sort((a, b) => {
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (b.priority === 'high' && a.priority !== 'high') return 1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      })
      .slice(0, 8); // Show top 8 strategic tasks
  }, [tasks]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const delayed = tasks.filter(t => {
      if (t.status === 'Completed') return false;
      return new Date(t.deadline).getTime() < new Date().getTime();
    }).length;

    return { total, completed, inProgress, delayed };
  }, [tasks]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Tổng nhiệm vụ', value: stats.total, icon: Target, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Đang thực hiện', value: stats.inProgress, icon: PlayCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Hoàn thành', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Chậm tiến độ', value: stats.delayed, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((stat, i) => (
          <div key={i} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={cn("p-3 rounded-xl", stat.bg, stat.color)}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900 leading-none mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
              <BarChart className="text-emerald-500" size={20} />
              Tiến độ Mục tiêu Chiến lược
            </h3>
            <p className="text-sm font-medium text-slate-500 mt-1">Trạng thái và giai đoạn của các nhiệm vụ trọng điểm</p>
          </div>
          <div className="flex gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-slate-100 border border-slate-300"></span>
              Khởi tạo
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Tiến độ
            </span>
          </div>
        </div>

        <div className="space-y-6">
          {ongoingTasks.map((task, index) => {
            const progress = task.progress || (task.status === 'In Progress' ? 50 : 0);
            return (
              <motion.div 
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                  <div className="flex items-center gap-3">
                    {task.priority === 'high' && (
                      <Flame size={14} className="text-rose-500" />
                    )}
                    <span className="font-bold text-sm text-slate-800 line-clamp-1">{task.title}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(task.deadline).toLocaleDateString('vi-VN')}
                    </span>
                    <span className={cn(
                      "px-2 py-1 rounded-md text-[9px] uppercase tracking-widest border",
                      task.status === 'In Progress' ? "bg-blue-50 text-blue-700 border-blue-200" :
                      task.status === 'In Review' ? "bg-amber-50 text-amber-700 border-amber-200" :
                      "bg-slate-50 text-slate-600 border-slate-200"
                    )}>
                      {task.status === 'In Progress' ? 'Đang chạy' : task.status}
                    </span>
                  </div>
                </div>
                
                {/* Visual Gantt-like bar */}
                <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200 shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={cn(
                      "h-full relative overflow-hidden",
                      progress > 75 ? "bg-emerald-500" : progress > 30 ? "bg-blue-500" : "bg-amber-500"
                    )}
                  >
                    <div className="absolute inset-0 bg-white/20 w-full h-full" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)' , backgroundSize: '1rem 1rem'}} />
                  </motion.div>
                </div>
                
                {/* Stage markers */}
                <div className="flex justify-between mt-1 px-1">
                  <span className="text-[9px] font-bold text-slate-400">Khởi động</span>
                  <span className="text-[9px] font-bold text-slate-400">Đang triển khai</span>
                  <span className="text-[9px] font-bold text-slate-400">Hoàn thiện</span>
                </div>
              </motion.div>
            );
          })}

          {ongoingTasks.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle2 size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold text-sm">Không có nhiệm vụ nào đang diễn ra</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
