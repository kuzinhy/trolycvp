import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { Task } from '../constants';
import { motion } from 'motion/react';
import { TrendingUp, Target, Activity, AlertCircle } from 'lucide-react';

interface PerformanceAnalyticsProps {
  tasks: Task[];
}

export const PerformanceAnalytics: React.FC<PerformanceAnalyticsProps> = ({ tasks }) => {
  const statusData = useMemo(() => {
    const counts = {
      'Pending': 0,
      'In Progress': 0,
      'Completed': 0
    };
    tasks.forEach(task => {
      if (counts[task.status] !== undefined) {
        counts[task.status]++;
      }
    });
    return [
      { name: 'Chờ xử lý', value: counts['Pending'], color: '#94a3b8' },
      { name: 'Đang thực hiện', value: counts['In Progress'], color: '#3b82f6' },
      { name: 'Đã hoàn thành', value: counts['Completed'], color: '#10b981' }
    ];
  }, [tasks]);

  const priorityData = useMemo(() => {
    const counts = {
      'high': 0,
      'medium': 0,
      'low': 0
    };
    tasks.forEach(task => {
      if (counts[task.priority] !== undefined) {
        counts[task.priority]++;
      }
    });
    return [
      { name: 'Cao', value: counts['high'], color: '#ef4444' },
      { name: 'Trung bình', value: counts['medium'], color: '#f59e0b' },
      { name: 'Thấp', value: counts['low'], color: '#3b82f6' }
    ];
  }, [tasks]);

  const completionRate = useMemo(() => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    return Math.round((completed / tasks.length) * 100);
  }, [tasks]);

  const workloadByDay = useMemo(() => {
    const days: Record<string, number> = {};
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    last7Days.forEach(day => days[day] = 0);

    tasks.forEach(task => {
      if (!task.createdAt) return;
      try {
        const date = new Date(task.createdAt);
        if (isNaN(date.getTime())) return;
        const day = date.toISOString().split('T')[0];
        if (days[day] !== undefined) {
          days[day]++;
        }
      } catch (e) {
        // Skip invalid dates
      }
    });

    return Object.entries(days).map(([name, value]) => ({ 
      name: name.split('-').slice(1).reverse().join('/'), 
      value 
    }));
  }, [tasks]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Target size={20} />
            </div>
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Tỷ lệ hoàn thành</h4>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900 italic">{completionRate}%</span>
            <span className="text-[10px] font-bold text-emerald-600 uppercase">Tối ưu</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Activity size={20} />
            </div>
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Tổng nhiệm vụ</h4>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900 italic">{tasks.length}</span>
            <span className="text-[10px] font-bold text-blue-600 uppercase">Công việc</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <AlertCircle size={20} />
            </div>
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Ưu tiên cao</h4>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900 italic">{tasks.filter(t => t.priority === 'high').length}</span>
            <span className="text-[10px] font-bold text-rose-600 uppercase">Khẩn cấp</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <TrendingUp size={20} />
            </div>
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Đang xử lý</h4>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900 italic">{tasks.filter(t => t.status === 'In Progress').length}</span>
            <span className="text-[10px] font-bold text-amber-600 uppercase">Tiến độ</span>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight italic mb-8">Trạng thái nhiệm vụ</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight italic mb-8">Mật độ công việc (7 ngày qua)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={workloadByDay}>
                <defs>
                  <linearGradient id="colorWorkload" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorWorkload)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
