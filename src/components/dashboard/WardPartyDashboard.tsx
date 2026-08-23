import React, { useState, useEffect } from 'react';
import { 
  BarChart3, RefreshCw, Database, Search, Filter, Calendar, Users, Building, 
  CheckCircle2, AlertTriangle, Clock, ArrowUpRight, ChevronRight, Download, 
  ShieldCheck, FileText, PieChart as PieChartIcon, TrendingUp, AlertCircle, CheckCircle, 
  XCircle, HelpCircle, Layers, Award, DollarSign, ListTodo, Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, 
  LineChart, Line, Legend
} from 'recharts';
import { cn } from '../../lib/utils';
import { DrillDownModal } from './DrillDownModal';
import { DriveInspectorModal } from './DriveInspectorModal';

interface WardPartyDashboardProps {
  navigateTo: (tab: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

// Chart sample data matching Coogo Flow references
const BAR_7DAYS_DATA = [
  { day: 'T2', canLam: 4, dangLam: 3, hoanThanh: 5, quaHan: 0 },
  { day: 'T3', canLam: 3, dangLam: 4, hoanThanh: 6, quaHan: 0 },
  { day: 'T4', canLam: 5, dangLam: 2, hoanThanh: 4, quaHan: 0 },
  { day: 'T5', canLam: 2, dangLam: 5, hoanThanh: 7, quaHan: 0 },
  { day: 'T6', canLam: 6, dangLam: 3, hoanThanh: 8, quaHan: 0 },
  { day: 'T7', canLam: 1, dangLam: 2, hoanThanh: 3, quaHan: 0 },
  { day: 'CN', canLam: 0, dangLam: 1, hoanThanh: 2, quaHan: 0 }
];

const DONUT_STATUS_DATA = [
  { name: 'Cần làm', value: 9, color: '#3B82F6' },
  { name: 'Đang làm', value: 9, color: '#F59E0B' },
  { name: 'Hoàn thành', value: 7, color: '#10B981' },
  { name: 'Quá hạn', value: 0, color: '#EF4444' }
];

const TREND_30DAYS_DATA = [
  { week: 'Tuần 1', taoMoi: 12, hoanThanh: 8 },
  { week: 'Tuần 2', taoMoi: 15, hoanThanh: 11 },
  { week: 'Tuần 3', taoMoi: 18, hoanThanh: 16 },
  { week: 'Tuần 4', taoMoi: 22, hoanThanh: 20 }
];

const DEPT_TASK_DATA = [
  { name: 'Văn phòng Đảng ủy', total: 10, done: 8 },
  { name: 'Ban Kiểm tra', total: 6, done: 4 },
  { name: 'Ban Tuyên giáo', total: 5, done: 4 },
  { name: 'Ban Tổ chức', total: 4, done: 3 }
];

const ATTENTION_TASKS = [
  {
    id: 'att-1',
    code: 'CDS-01',
    title: 'Hoàn thiện Tờ trình Chuyển đổi số & Số hóa Hồ sơ T3/2026',
    assignee: 'Lê Thị Kiều Oanh',
    deadline: 'Hôm nay (17:00)',
    priority: 'CAO',
    status: 'Đang làm',
    urgency: 'today'
  },
  {
    id: 'att-2',
    code: 'KTGS-02',
    title: 'Báo cáo Kết quả Giám sát Chi bộ 3 - Đảng bộ Phường',
    assignee: 'Trần Quốc Bảo',
    deadline: 'Ngày mai (11:30)',
    priority: 'CAO',
    status: 'Đang làm',
    urgency: 'tomorrow'
  },
  {
    id: 'att-3',
    code: 'NQ-03',
    title: 'Chuẩn bị Ma trận Câu hỏi Tìm hiểu Nghị quyết Đại hội XIV',
    assignee: 'Nguyễn Thị Thu Phương',
    deadline: '2 ngày nữa',
    priority: 'TB',
    status: 'Cần làm',
    urgency: 'upcoming'
  }
];

export const WardPartyDashboard: React.FC<WardPartyDashboardProps> = ({
  navigateTo,
  showToast
}) => {
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleString('vi-VN'));
  
  // Modals
  const [drillDownModalOpen, setDrillDownModalOpen] = useState(false);
  const [drillDownTitle, setDrillDownTitle] = useState('');
  const [drillDownCategory, setDrillDownCategory] = useState('');
  const [inspectorModalOpen, setInspectorModalOpen] = useState(false);

  // Dynamic Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Chào buổi sáng';
    if (hour >= 12 && hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLastUpdated(new Date().toLocaleString('vi-VN'));
      setLoading(false);
      showToast('Đã đồng bộ dữ liệu tổng hợp mới nhất', 'success');
    }, 800);
  };

  const openDrillDown = (title: string, category: string) => {
    setDrillDownTitle(title);
    setDrillDownCategory(category);
    setDrillDownModalOpen(true);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 bg-slate-50/60 min-h-screen">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950 text-white p-6 md:p-8 rounded-3xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold rounded-full uppercase tracking-wider">
              Chỉ huy Chiến lược 8.0
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-300">Văn phòng Đảng ủy Phường</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-2">
            {getGreeting()}, Đồng chí Nguyễn Minh Huy 👋
          </h1>
          <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Hệ thống đang ghi nhận <strong className="text-amber-400">9 nhiệm vụ đang thực hiện</strong> và <strong className="text-emerald-400">7 nhiệm vụ đã hoàn tất</strong> trong tuần này. Không có nhiệm vụ quá hạn.
          </p>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">
            Dữ liệu cập nhật lúc: {lastUpdated}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setInspectorModalOpen(true)}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl backdrop-blur-sm border border-white/10 transition-all cursor-pointer flex items-center gap-2"
          >
            <Database size={15} />
            <span>Nguồn Google Drive</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95"
          >
            <RefreshCw size={15} className={cn(loading && "animate-spin")} />
            <span>Đồng bộ ngay</span>
          </button>
        </div>
      </div>

      {/* 4 Soft Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Tổng nhiệm vụ */}
        <div 
          onClick={() => navigateTo('tasks')}
          className="bg-indigo-50/70 hover:bg-indigo-50 border border-indigo-200/80 rounded-2xl p-5 shadow-sm transition-all duration-200 cursor-pointer group flex flex-col justify-between space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Tổng Nhiệm vụ</span>
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
              <ListTodo size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-indigo-950">25</div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-indigo-700 font-semibold">28% đã hoàn thành</span>
              <span className="text-indigo-800 font-bold group-hover:underline flex items-center gap-0.5">
                Xem <ChevronRight size={14} />
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Đang thực hiện */}
        <div 
          onClick={() => navigateTo('kanban')}
          className="bg-amber-50/70 hover:bg-amber-50 border border-amber-200/80 rounded-2xl p-5 shadow-sm transition-all duration-200 cursor-pointer group flex flex-col justify-between space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Đang thực hiện</span>
            <div className="p-2.5 bg-amber-600 text-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
              <Clock size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-amber-950">9</div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-amber-700 font-semibold">Cần đôn đốc tiến độ</span>
              <span className="text-amber-800 font-bold group-hover:underline flex items-center gap-0.5">
                Xem Kanban <ChevronRight size={14} />
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Hoàn thành */}
        <div 
          onClick={() => navigateTo('tasks')}
          className="bg-emerald-50/70 hover:bg-emerald-50 border border-emerald-200/80 rounded-2xl p-5 shadow-sm transition-all duration-200 cursor-pointer group flex flex-col justify-between space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Hoàn thành</span>
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-emerald-950">7</div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-emerald-700 font-semibold">Đã kiểm tra chất lượng</span>
              <span className="text-emerald-800 font-bold group-hover:underline flex items-center gap-0.5">
                Xem <ChevronRight size={14} />
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Quá hạn */}
        <div 
          onClick={() => navigateTo('tasks')}
          className="bg-rose-50/70 hover:bg-rose-50 border border-rose-200/80 rounded-2xl p-5 shadow-sm transition-all duration-200 cursor-pointer group flex flex-col justify-between space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-900 uppercase tracking-wider">Quá hạn</span>
            <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-rose-950">0</div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-rose-700 font-semibold">Đảm bảo 100% đúng hạn</span>
              <span className="text-rose-800 font-bold group-hover:underline flex items-center gap-0.5">
                Xem <ChevronRight size={14} />
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 4 Interactive Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Nhiệm vụ 7 ngày qua (Bar chart) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Nhiệm vụ 7 ngày qua</h3>
              <p className="text-xs text-slate-500">Phân tích khối lượng công việc phát sinh theo ngày trong tuần.</p>
            </div>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md uppercase">
              Tuần này
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={BAR_7DAYS_DATA}>
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="canLam" name="Cần làm" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="dangLam" name="Đang làm" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="hoanThanh" name="Hoàn thành" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Phân bố trạng thái (Donut Chart) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Phân bố Trạng thái Công việc</h3>
              <p className="text-xs text-slate-500">Tỷ lệ cơ cấu các trạng thái nhiệm vụ toàn cơ quan.</p>
            </div>
            <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-2.5 py-1 rounded-md uppercase">
              Tổng thể
            </span>
          </div>

          <div className="h-64 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={DONUT_STATUS_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {DONUT_STATUS_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center pointer-events-none">
              <div className="text-2xl font-black text-slate-900">25</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Công việc</div>
            </div>
          </div>
        </div>

        {/* Chart 3: Xu hướng 30 ngày (Line Chart) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Xu hướng 30 ngày qua</h3>
              <p className="text-xs text-slate-500">So sánh giữa nhiệm vụ khởi tạo mới và nhiệm vụ hoàn thành.</p>
            </div>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md uppercase">
              Tháng 3/2026
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={TREND_30DAYS_DATA}>
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="taoMoi" name="Khởi tạo mới" stroke="#2563EB" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="hoanThanh" name="Hoàn thành" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Phân bổ theo Phòng ban */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Nhiệm vụ theo Ban / Phòng</h3>
              <p className="text-xs text-slate-500">Phân bổ chỉ tiêu công tác giữa các Ban Đảng ủy.</p>
            </div>
            <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md uppercase">
              Cơ cấu Ban
            </span>
          </div>

          <div className="h-64 w-full pt-2 space-y-3 overflow-y-auto">
            {DEPT_TASK_DATA.map(d => {
              const pct = Math.round((d.done / d.total) * 100);
              return (
                <div key={d.name} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>{d.name}</span>
                    <span className="text-rose-600">{d.done}/{d.total} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-600 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Section: Nhiệm vụ Cần chú ý (Attention Needed Tasks) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
              <h3 className="font-extrabold text-slate-900 text-base">Nhiệm vụ cần chú ý đôn đốc</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Các công việc có mức độ ưu tiên cao hoặc có mốc hạn hoàn thành trong 48 giờ tới.
            </p>
          </div>

          <button
            onClick={() => navigateTo('tasks')}
            className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:underline cursor-pointer"
          >
            <span>Xem tất cả ({ATTENTION_TASKS.length})</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {ATTENTION_TASKS.map(task => (
            <div key={task.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/80 px-3 rounded-xl transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-slate-100 font-mono text-[10px] font-bold text-slate-700 rounded border border-slate-200">
                    {task.code}
                  </span>
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-700 font-bold text-[10px] rounded uppercase">
                    ƯU TIÊN {task.priority}
                  </span>
                  <span className="text-xs text-slate-400">• Cán bộ: <strong className="text-slate-800">{task.assignee}</strong></span>
                </div>

                <h4 className="font-bold text-slate-900 text-sm">
                  {task.title}
                </h4>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1">
                  <Clock size={13} />
                  <span>{task.deadline}</span>
                </span>

                <button
                  onClick={() => navigateTo('tasks')}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Xử lý ngay
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Drive Inspector Modal */}
      {inspectorModalOpen && (
        <DriveInspectorModal onClose={() => setInspectorModalOpen(false)} />
      )}

      {/* DrillDown Modal */}
      {drillDownModalOpen && (
        <DrillDownModal 
          title={drillDownTitle}
          category={drillDownCategory}
          onClose={() => setDrillDownModalOpen(false)}
        />
      )}

    </div>
  );
};
