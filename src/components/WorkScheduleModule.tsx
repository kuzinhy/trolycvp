import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Sparkles, 
  Printer, 
  Copy, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Search, 
  LayoutGrid, 
  List as ListIcon, 
  CalendarDays, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  User, 
  MapPin, 
  FileText,
  FileUp,
  RotateCcw,
  Check,
  Zap,
  Briefcase
} from 'lucide-react';
import { format, startOfWeek, addDays, subDays, addWeeks, subWeeks, isSameWeek, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { STAFF_LIST } from '../constants';
import { 
  ScheduleItem, 
  SCHEDULE_CATEGORIES, 
  determineSession, 
  detectScheduleConflicts, 
  formatWeeklyScheduleText 
} from './schedule/scheduleUtils';
import { WeeklyMatrixView } from './schedule/WeeklyMatrixView';
import { ScheduleTimelineView } from './schedule/ScheduleTimelineView';
import { MonthlyCalendarView } from './schedule/MonthlyCalendarView';
import { PrintScheduleView } from './schedule/PrintScheduleView';
import { ScheduleItemModal } from './schedule/ScheduleItemModal';
import { AIScheduleModal } from './schedule/AIScheduleModal';

interface WorkScheduleModuleProps {
  meetings: any[];
  tasks: any[];
  events: any[];
  updateMeetings: (updater: any[] | ((prev: any[]) => any[])) => Promise<void>;
  updateTasks: (updater: any[] | ((prev: any[]) => any[])) => Promise<void>;
  updateEvents: (updater: any[] | ((prev: any[]) => any[])) => Promise<void>;
  isUploading: boolean;
  onUploadCalendar?: (file: File) => void;
  onUploadCalendarFile?: (file: File) => void;
  setHasUnsavedChanges?: (val: boolean) => void;
  aiKnowledge?: any[];
  onNavigate: (tab: string) => void;
  smartLearnFromText?: (text: string, tagsHint?: string[], isManual?: boolean) => Promise<void>;
  isLearning?: boolean;
  showToast: (message: string, type?: any) => void;
}

export const WorkScheduleModule: React.FC<WorkScheduleModuleProps> = ({
  meetings = [],
  tasks = [],
  events = [],
  updateMeetings,
  updateTasks,
  updateEvents,
  onNavigate,
  smartLearnFromText,
  showToast
}) => {
  // Navigation & Date State
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'matrix' | 'timeline' | 'month' | 'print'>('matrix');

  // Filter States
  const [selectedChairperson, setSelectedChairperson] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal States
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [modalDefaultSession, setModalDefaultSession] = useState<'morning' | 'afternoon'>('morning');
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  // Quick Copy Feedback State
  const [isCopied, setIsCopied] = useState(false);

  // Current week start (Monday)
  const currentWeekStart = useMemo(() => {
    return startOfWeek(currentDate, { weekStartsOn: 1 });
  }, [currentDate]);

  // Convert raw meetings and events into normalized ScheduleItem format
  const allScheduleItems: ScheduleItem[] = useMemo(() => {
    const meetingItems: ScheduleItem[] = meetings.map((m: any) => ({
      id: m.id || `m_${Math.random()}`,
      name: m.name || m.title || m.content || 'Lịch họp',
      date: m.date || format(new Date(), 'yyyy-MM-dd'),
      time: m.time || '08:00',
      endTime: m.endTime || '',
      session: m.session || determineSession(m.time || '08:00'),
      location: m.location || 'Phòng họp 1',
      chairperson: m.chairperson || 'Nguyễn Minh Huy',
      participants: m.participants || '',
      preparingUnit: m.preparingUnit || m.department || 'Văn phòng Đảng ủy',
      category: m.category || (m.priority === 'high' ? 'standing' : 'general'),
      priority: m.priority || 'medium',
      description: m.description || m.notes || '',
      status: m.status || 'scheduled',
      type: 'meeting'
    }));

    const eventItems: ScheduleItem[] = events.map((e: any) => ({
      id: e.id || `e_${Math.random()}`,
      name: e.name || e.title || 'Sự kiện',
      date: e.date || format(new Date(), 'yyyy-MM-dd'),
      time: e.time || '08:00',
      endTime: e.endTime || '',
      session: e.session || determineSession(e.time || '08:00'),
      location: e.location || 'Hội trường',
      chairperson: e.chairperson || '',
      participants: e.participants || '',
      preparingUnit: e.preparingUnit || 'Văn phòng Đảng ủy',
      category: 'general',
      priority: 'low',
      description: e.description || '',
      status: 'scheduled',
      type: 'event'
    }));

    return [...meetingItems, ...eventItems];
  }, [meetings, events]);

  // Filtered items based on search and selected filters
  const filteredItems = useMemo(() => {
    return allScheduleItems.filter(item => {
      // Chairperson Filter
      if (selectedChairperson !== 'all') {
        const itemChair = (item.chairperson || '').toLowerCase();
        if (!itemChair.includes(selectedChairperson.toLowerCase())) return false;
      }

      // Category Filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (item.name || '').toLowerCase().includes(q);
        const matchLocation = (item.location || '').toLowerCase().includes(q);
        const matchChair = (item.chairperson || '').toLowerCase().includes(q);
        const matchParts = (item.participants || '').toLowerCase().includes(q);
        const matchUnit = (item.preparingUnit || '').toLowerCase().includes(q);
        if (!matchName && !matchLocation && !matchChair && !matchParts && !matchUnit) return false;
      }

      return true;
    });
  }, [allScheduleItems, selectedChairperson, selectedCategory, searchQuery]);

  // Detect conflicts in schedule
  const conflictMap = useMemo(() => {
    return detectScheduleConflicts(filteredItems);
  }, [filteredItems]);

  // Week items count stats
  const weekStats = useMemo(() => {
    const weekDays = Array.from({ length: 7 }, (_, i) => format(addDays(currentWeekStart, i), 'yyyy-MM-dd'));
    const weekItems = filteredItems.filter(it => weekDays.includes(it.date) && it.status !== 'cancelled');
    const urgentCount = weekItems.filter(it => it.priority === 'high').length;
    const completedCount = weekItems.filter(it => it.status === 'completed').length;
    const conflictCount = conflictMap.size;

    return {
      total: weekItems.length,
      urgent: urgentCount,
      completed: completedCount,
      conflicts: conflictCount
    };
  }, [filteredItems, currentWeekStart, conflictMap]);

  // Handlers for Items
  const handleOpenAddModal = (dateStr?: string, session?: 'morning' | 'afternoon') => {
    setEditingItem(null);
    setModalDefaultDate(dateStr || format(new Date(), 'yyyy-MM-dd'));
    setModalDefaultSession(session || 'morning');
    setIsItemModalOpen(true);
  };

  const handleOpenEditModal = (item: ScheduleItem) => {
    setEditingItem(item);
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (itemData: Partial<ScheduleItem>) => {
    try {
      if (editingItem?.id) {
        // Update existing item
        await updateMeetings((prev: any[]) => 
          prev.map((m: any) => m.id === editingItem.id ? { ...m, ...itemData } : m)
        );
        showToast("Đã cập nhật thông tin lịch công tác", "success");
      } else {
        // Add new item
        const newItem = {
          id: `m_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          ...itemData,
          createdAt: Date.now()
        };
        await updateMeetings((prev: any[]) => [newItem, ...prev]);
        showToast("Đã thêm mới lịch làm việc thành công", "success");
      }
    } catch (err) {
      console.error(err);
      showToast("Không thể lưu lịch làm việc", "error");
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm("Đồng chí có chắc chắn muốn xóa cuộc họp này khỏi lịch công tác?")) return;
    try {
      await updateMeetings((prev: any[]) => prev.filter((m: any) => m.id !== id));
      await updateEvents((prev: any[]) => prev.filter((e: any) => e.id !== id));
      showToast("Đã xóa cuộc họp khỏi lịch công tác", "info");
    } catch (err) {
      showToast("Lỗi khi xóa cuộc họp", "error");
    }
  };

  const handleToggleComplete = async (item: ScheduleItem) => {
    const newStatus = item.status === 'completed' ? 'scheduled' : 'completed';
    try {
      await updateMeetings((prev: any[]) => 
        prev.map((m: any) => m.id === item.id ? { ...m, status: newStatus } : m)
      );
      showToast(newStatus === 'completed' ? "Đã đánh dấu hoàn thành cuộc họp" : "Đã chuyển về trạng thái chuẩn bị họp", "success");
    } catch (err) {
      showToast("Lỗi khi cập nhật trạng thái", "error");
    }
  };

  const handleSaveAIBatch = async (newItems: ScheduleItem[]) => {
    try {
      await updateMeetings((prev: any[]) => [...newItems, ...prev]);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleConvertToTask = (item: ScheduleItem) => {
    const newTask = {
      id: `task_${Date.now()}`,
      title: `Chuẩn bị & Theo dõi: ${item.name}`,
      description: `Cuộc họp ngày ${item.date} lúc ${item.time}. Chủ trì: ${item.chairperson || 'Lãnh đạo'}. Địa điểm: ${item.location || 'Trụ sở'}. Yêu cầu chuẩn bị: ${item.preparingUnit || 'Văn phòng'}.`,
      deadline: item.date,
      time: item.time,
      priority: item.priority || 'medium',
      status: 'Pending',
      progress: 0,
      category: 'Lịch công tác',
      assignee: item.chairperson || 'Nguyễn Minh Huy',
      departmentId: item.preparingUnit || 'Văn phòng Đảng ủy',
      createdAt: Date.now()
    };

    updateTasks((prev: any[]) => [newTask, ...prev]).then(() => {
      showToast("Đã chuyển cuộc họp thành Nhiệm vụ theo dõi tại phân hệ Nhiệm vụ", "success");
    });
  };

  const handleCopyWeeklySchedule = () => {
    const text = formatWeeklyScheduleText(filteredItems, currentWeekStart);
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      showToast("Đã sao chép nội dung Lịch Tuần Thường trực Đảng ủy", "success");
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Module Title & Hero Controls */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 md:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-600/20">
              <CalendarDays size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <span>Lịch Làm Việc & Công Tác Đảng Ủy</span>
                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-black rounded-full uppercase tracking-wider">
                  Chỉ huy 8.0
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Điều hành lịch Thường trực Đảng ủy, Ban Thường vụ và các Ban Xây dựng Đảng
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* AI Quick Add Button */}
          <button
            type="button"
            onClick={() => setIsAIModalOpen(true)}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer group"
          >
            <Sparkles size={15} className="group-hover:scale-110 transition-transform" />
            <span>Trợ lý AI Soạn Lịch</span>
          </button>

          {/* New Item Button */}
          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Thêm Lịch Mới</span>
          </button>
        </div>
      </div>

      {/* Week Navigator, Stats & View Mode Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Week Date Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentDate(new Date())}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Tuần hiện tại
            </button>

            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
                className="p-1.5 hover:bg-white hover:shadow-xs rounded-lg text-slate-600 transition-all"
                title="Tuần trước"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="px-3 text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <CalendarIcon size={14} className="text-rose-600" />
                <span>
                  Tuần {format(currentWeekStart, 'w')} ({format(currentWeekStart, 'dd/MM')} - {format(addDays(currentWeekStart, 6), 'dd/MM/yyyy')})
                </span>
              </div>

              <button
                type="button"
                onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
                className="p-1.5 hover:bg-white hover:shadow-xs rounded-lg text-slate-600 transition-all"
                title="Tuần sau"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Quick Copy Notification Button */}
            <button
              type="button"
              onClick={handleCopyWeeklySchedule}
              className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Sao chép tin nhắn lịch tuần để gửi Zalo / SMS"
            >
              {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span className="hidden sm:inline">{isCopied ? "Đã sao chép" : "Sao chép Lịch Tuần"}</span>
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl gap-1 shrink-0 self-start lg:self-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all select-none cursor-pointer",
                viewMode === 'matrix' 
                  ? "bg-white text-rose-800 shadow-xs font-extrabold" 
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <LayoutGrid size={14} />
              <span>Ma trận Tuần</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all select-none cursor-pointer",
                viewMode === 'timeline' 
                  ? "bg-white text-slate-900 shadow-xs font-extrabold" 
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <ListIcon size={14} />
              <span>Dòng thời gian</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all select-none cursor-pointer",
                viewMode === 'month' 
                  ? "bg-white text-slate-900 shadow-xs font-extrabold" 
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <CalendarIcon size={14} />
              <span>Lịch tháng</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('print')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all select-none cursor-pointer",
                viewMode === 'print' 
                  ? "bg-rose-700 text-white shadow-xs font-extrabold" 
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Printer size={14} />
              <span>Bản in A4</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 flex items-center justify-between">
            <span className="text-slate-500 font-medium">Tổng lịch tuần:</span>
            <span className="font-black text-slate-900">{weekStats.total} cuộc họp</span>
          </div>

          <div className="bg-rose-50/70 p-2.5 rounded-xl border border-rose-200/60 flex items-center justify-between">
            <span className="text-rose-700 font-medium">Khẩn / Trọng tâm:</span>
            <span className="font-black text-rose-900">{weekStats.urgent}</span>
          </div>

          <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/60 flex items-center justify-between">
            <span className="text-emerald-700 font-medium">Đã hoàn thành:</span>
            <span className="font-black text-emerald-900">{weekStats.completed}</span>
          </div>

          <div className={cn(
            "p-2.5 rounded-xl border flex items-center justify-between",
            weekStats.conflicts > 0 ? "bg-amber-50 border-amber-300 text-amber-900 animate-pulse" : "bg-slate-50 border-slate-200/60 text-slate-500"
          )}>
            <span className="font-medium">Cảnh báo trùng:</span>
            <span className="font-black">{weekStats.conflicts > 0 ? `${weekStats.conflicts} điểm trùng` : 'Không có'}</span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo nội dung, địa điểm, chủ trì, thành phần..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          {/* Filter Chairperson */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[11px] font-bold text-slate-500">Chủ trì:</span>
            <select
              value={selectedChairperson}
              onChange={(e) => setSelectedChairperson(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
            >
              <option value="all">Tất cả lãnh đạo</option>
              {STAFF_LIST.map(staff => (
                <option key={staff} value={staff}>{staff}</option>
              ))}
            </select>
          </div>

          {/* Filter Category */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[11px] font-bold text-slate-500">Phân loại:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
            >
              <option value="all">Tất cả phân loại</option>
              {SCHEDULE_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters button */}
          {(selectedChairperson !== 'all' || selectedCategory !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedChairperson('all');
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg text-xs transition-colors flex items-center gap-1"
              title="Đặt lại bộ lọc"
            >
              <RotateCcw size={12} />
              <span className="text-[11px]">Xóa lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area Based on View Mode */}
      <AnimatePresence mode="wait">
        {viewMode === 'matrix' ? (
          <motion.div
            key="matrix"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <WeeklyMatrixView
              weekStart={currentWeekStart}
              items={filteredItems}
              conflictMap={conflictMap}
              onAddItem={handleOpenAddModal}
              onEditItem={handleOpenEditModal}
              onDeleteItem={handleDeleteItem}
              onQuickToggleStatus={handleToggleComplete}
            />
          </motion.div>
        ) : viewMode === 'timeline' ? (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <ScheduleTimelineView
              weekStart={currentWeekStart}
              items={filteredItems}
              conflictMap={conflictMap}
              onAddItem={handleOpenAddModal}
              onEditItem={handleOpenEditModal}
              onDeleteItem={handleDeleteItem}
              onConvertToTask={handleConvertToTask}
              onToggleComplete={handleToggleComplete}
            />
          </motion.div>
        ) : viewMode === 'month' ? (
          <motion.div
            key="month"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <MonthlyCalendarView
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              items={filteredItems}
              conflictMap={conflictMap}
              onSelectDay={(dateStr) => {
                setCurrentDate(parseISO(dateStr));
                setViewMode('timeline');
              }}
              onAddItem={handleOpenAddModal}
              onEditItem={handleOpenEditModal}
            />
          </motion.div>
        ) : (
          <motion.div
            key="print"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <PrintScheduleView
              weekStart={currentWeekStart}
              items={filteredItems}
              onBack={() => setViewMode('matrix')}
              showToast={showToast}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Schedule Item Modal (Thêm / Sửa) */}
      <ScheduleItemModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        initialItem={editingItem}
        defaultDate={modalDefaultDate}
        defaultSession={modalDefaultSession}
        onConvertToTask={handleConvertToTask}
      />

      {/* AI Schedule Assistant Modal */}
      <AIScheduleModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onSaveBatch={handleSaveAIBatch}
        showToast={showToast}
        smartLearnFromText={smartLearnFromText}
      />
    </div>
  );
};
