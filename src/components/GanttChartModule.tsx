import React, { useState, useMemo } from 'react';
import { 
  BarChart, Calendar, Filter, Users, Building, Search, 
  ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertCircle, 
  ArrowUpRight, Eye, RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Task } from '../constants';

interface GanttChartModuleProps {
  tasks: Task[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  navigateTo?: (tab: string) => void;
}

export const GanttChartModule: React.FC<GanttChartModuleProps> = ({
  tasks,
  showToast
}) => {
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('all');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Days list for timeline (14 days window around current date)
  const timelineDays = useMemo(() => {
    const days = [];
    const today = new Date('2026-03-15'); // Standard strategic anchor date
    for (let i = -3; i < 11; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const isToday = i === 0;
      days.push({
        dateStr: d.toISOString().split('T')[0],
        dayNum: d.getDate(),
        dayName: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()],
        isToday,
        isWeekend: d.getDay() === 0 || d.getDay() === 6
      });
    }
    return days;
  }, []);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (t.assignee && t.assignee.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchProject = selectedProjectFilter === 'all' || t.projectId === selectedProjectFilter;
      const matchStatus = selectedStatusFilter === 'all' || t.status === selectedStatusFilter;
      const matchAssignee = selectedAssigneeFilter === 'all' || t.assignee === selectedAssigneeFilter;
      return matchSearch && matchProject && matchStatus && matchAssignee;
    });
  }, [tasks, searchQuery, selectedProjectFilter, selectedStatusFilter, selectedAssigneeFilter]);

  // Unique assignees for filter
  const assignees = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => { if (t.assignee) set.add(t.assignee); });
    return Array.from(set);
  }, [tasks]);

  return (
    <div className="p-4 md:p-8 bg-slate-50/60 min-h-screen space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-xs font-extrabold rounded-md uppercase tracking-wider border border-rose-200">
              Tiến độ Điều hành
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Sơ đồ Gantt Trực quan</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Sơ đồ Gantt Lộ trình Công tác
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi trực quan thời gian bắt đầu, mốc hoàn thành và tỷ lệ tiến độ thực hiện nhiệm vụ theo dòng thời gian.
          </p>
        </div>

        <button
          onClick={() => showToast('Đã làm mới dữ liệu Gantt', 'success')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0"
        >
          <RefreshCw size={15} />
          <span>Làm mới Timeline</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Tìm theo tên việc..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </div>

        {/* Assignee Filter */}
        <div>
          <select
            value={selectedAssigneeFilter}
            onChange={(e) => setSelectedAssigneeFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          >
            <option value="all">Tất cả Cán bộ phụ trách</option>
            {assignees.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          >
            <option value="all">Tất cả Trạng thái</option>
            <option value="Pending">Cần làm / Chờ xử lý</option>
            <option value="In Progress">Đang thực hiện</option>
            <option value="Completed">Hoàn thành</option>
          </select>
        </div>

        {/* Project Filter */}
        <div>
          <select
            value={selectedProjectFilter}
            onChange={(e) => setSelectedProjectFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          >
            <option value="all">Tất cả Chương trình / Dự án</option>
            <option value="CDS-2026">CDS-2026: Chuyển đổi số</option>
            <option value="KTGS-Q1">KTGS-Q1: Kiểm tra Giám sát</option>
            <option value="NQ-XIV">NQ-XIV: Tuyên truyền Nghị quyết</option>
          </select>
        </div>
      </div>

      {/* Gantt Matrix Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Timeline Header Row */}
          <div className="grid grid-cols-12 bg-slate-900 text-white text-xs font-bold divide-x divide-slate-800 border-b border-slate-800">
            <div className="col-span-4 p-4 flex items-center gap-2">
              <Calendar size={16} className="text-rose-400" />
              <span>Nhiệm vụ & Người phụ trách</span>
            </div>
            <div className="col-span-8 grid grid-cols-14 divide-x divide-slate-800 text-center">
              {timelineDays.map((d) => (
                <div
                  key={d.dateStr}
                  className={cn(
                    "py-2 flex flex-col items-center justify-center transition-colors",
                    d.isToday && "bg-rose-600 text-white font-extrabold",
                    d.isWeekend && !d.isToday && "bg-slate-800/60 text-slate-400"
                  )}
                >
                  <span className="text-[10px] font-mono">{d.dayName}</span>
                  <span className="text-xs font-bold mt-0.5">{d.dayNum}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks Gantt Rows */}
          <div className="divide-y divide-slate-100">
            {filteredTasks.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs italic">
                Không tìm thấy nhiệm vụ phù hợp với bộ lọc.
              </div>
            ) : (
              filteredTasks.map((task, idx) => {
                const progress = task.progress || (task.status === 'Completed' ? 100 : task.status === 'In Progress' ? 50 : 15);
                // Calculate random start col and span for realistic Gantt representation
                const startCol = (idx * 2) % 6 + 2;
                const colSpan = Math.min(14 - startCol, Math.max(3, (idx % 4) + 4));

                return (
                  <div key={task.id} className="grid grid-cols-12 hover:bg-slate-50/80 transition-colors py-3 px-0 items-center">
                    {/* Task Title & Assignee Column */}
                    <div className="col-span-4 px-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          task.priority === 'high' ? "bg-rose-500" : task.priority === 'medium' ? "bg-amber-500" : "bg-blue-500"
                        )} />
                        <h4 className="font-bold text-slate-800 text-xs truncate" title={task.title}>
                          {task.title}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pl-4">
                        <span>Phụ trách: <strong className="text-slate-700">{task.assignee || 'Chưa phân công'}</strong></span>
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Hạn: {task.deadline}</span>
                      </div>
                    </div>

                    {/* Timeline Bar Cell */}
                    <div className="col-span-8 grid grid-cols-14 gap-0 px-2 relative items-center h-10">
                      {/* Grid background guide lines */}
                      <div className="absolute inset-0 grid grid-cols-14 pointer-events-none divide-x divide-slate-100">
                        {timelineDays.map(d => (
                          <div key={d.dateStr} className={cn("h-full", d.isWeekend && "bg-slate-50/50")} />
                        ))}
                      </div>

                      {/* Gantt Bar */}
                      <div
                        className="relative h-7 rounded-lg shadow-sm overflow-hidden flex items-center px-2 z-10 transition-all group cursor-pointer"
                        style={{
                          gridColumnStart: startCol,
                          gridColumnEnd: `span ${colSpan}`
                        }}
                      >
                        {/* Bar background */}
                        <div className={cn(
                          "absolute inset-0 transition-opacity",
                          task.status === 'Completed' ? "bg-emerald-600" :
                          task.status === 'In Progress' ? "bg-rose-600" : "bg-slate-700"
                        )} />

                        {/* Progress fill highlight */}
                        <div
                          className="absolute inset-y-0 left-0 bg-white/20 border-r border-white/40 transition-all"
                          style={{ width: `${progress}%` }}
                        />

                        {/* Title inside bar */}
                        <div className="relative z-10 flex items-center justify-between w-full text-white text-[10px] font-bold truncate">
                          <span className="truncate pr-2">{task.title}</span>
                          <span className="px-1.5 py-0.5 bg-black/20 rounded font-mono shrink-0">
                            {progress}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
