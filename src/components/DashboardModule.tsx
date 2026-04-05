import React, { memo, useCallback, useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, 
  History, 
  Users, 
  Briefcase, 
  TrendingUp, 
  LayoutDashboard, 
  RefreshCw, 
  ShieldCheck, 
  Zap, 
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowUpRight,
  BrainCircuit,
  FileText,
  Calendar as CalendarIcon
} from 'lucide-react';
import { Birthday, Task, Meeting, Event } from '../constants';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { seedEvaluationData } from '../lib/seed-evaluation';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  PieChart,
  Cell,
  Pie,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  Scatter
} from 'recharts';

// Lazy load dashboard sub-modules
const Dashboard = lazy(() => import('./Dashboard').then(m => ({ default: m.Dashboard })));
const PersonalReminderModule = lazy(() => import('./PersonalReminderModule').then(m => ({ default: m.PersonalReminderModule })));
const StaffBirthdayReminder = lazy(() => import('./StaffBirthdayReminder').then(m => ({ default: m.StaffBirthdayReminder })));
const TaskReminder = lazy(() => import('./TaskReminder').then(m => ({ default: m.TaskReminder })));
const MeetingReminder = lazy(() => import('./MeetingReminder').then(m => ({ default: m.MeetingReminder })));
const EventReminder = lazy(() => import('./EventReminder').then(m => ({ default: m.EventReminder })));
const QuickNotes = lazy(() => import('./QuickNotes').then(m => ({ default: m.QuickNotes })));
const WorkForecastingModal = lazy(() => import('./WorkForecastingModal').then(m => ({ default: m.WorkForecastingModal })));
const DirectiveTracking = lazy(() => import('./DirectiveTracking').then(m => ({ default: m.DirectiveTracking })));
const SmartAssistantBriefing = lazy(() => import('./SmartAssistantBriefing').then(m => ({ default: m.SmartAssistantBriefing })));

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { ToastType } from '../components/ui/Toast';

interface DashboardModuleProps {
  aiKnowledge: any[];
  pendingKnowledge: any[];
  isPendingLoading: boolean;
  isAdmin: boolean;
  loadKnowledge: () => void;
  isMemoryLoading: boolean;
  isAddingManual: boolean;
  setIsAddingManual: (val: boolean) => void;
  manualValue: string;
  setManualValue: (val: string) => void;
  manualTags: string;
  setManualTags: (val: string) => void;
  isManualPublic?: boolean;
  setIsManualPublic?: (val: boolean) => void;
  isManualImportant?: boolean;
  setIsManualImportant?: (val: boolean) => void;
  addManualKnowledge: (category: string, pendingId?: string) => void;
  isUpdating: boolean;
  editingIndex: number | null;
  setEditingIndex: (idx: number | null) => void;
  editValue: string;
  setEditValue: (val: string) => void;
  editTags: string;
  setEditTags: (val: string) => void;
  editCategory?: string;
  setEditCategory?: (val: string) => void;
  editIsImportant?: boolean;
  setEditIsImportant?: (val: boolean) => void;
  updateKnowledge: (id: string, data: any) => void;
  deleteKnowledge: (id: string) => void;
  isDeleting: string | null;
  onReorderKnowledge?: (newOrder: any[]) => void;
  smartLearnFromText: (text: string, isManual: boolean) => void;
  learnFromFile?: (file: File) => void;
  isLearning: boolean;
  isSuggestingTags?: boolean;
  suggestTagsForContent?: (content: string) => void;
  addPendingKnowledge: (name: string) => void;
  deletePendingKnowledge: (id: string) => void;
  updatePendingKnowledge: (id: string, name: string) => void;
  removeDuplicates?: () => void;
  isRemovingDuplicates?: boolean;
  auditAndOptimizeKnowledge?: () => Promise<any>;
  isAuditing?: boolean;
  deleteAllKnowledge?: () => void;
  isDeletingAll?: boolean;
  isSyncingSecondBrain?: boolean;
  syncSecondBrain?: () => void;
  chatHistory: any[];
  tasks: Task[];
  setTasks: (updater: Task[] | ((prev: Task[]) => Task[])) => Promise<void>;
  meetings: Meeting[];
  updateMeetings: (updater: Meeting[] | ((prev: Meeting[]) => Meeting[])) => Promise<void>;
  isSavingMeetings: boolean;
  loadMeetings: () => Promise<void> | void;
  events: Event[];
  updateEvents: (updater: Event[] | ((prev: Event[]) => Event[])) => Promise<void>;
  loadChatHistory: () => Promise<void> | void;
  config: any;
  showToast: (message: string, type?: ToastType) => void;
  onViewTasks: () => void;
  onNavigate: (tab: string) => void;
  initialTab?: 'command' | 'knowledge' | 'history';
  deleteChatHistory: (index: number) => Promise<void>;
  isHistoryLoading: boolean;
  onClearAllChatHistory?: () => void;
  birthdays: Birthday[];
  smartBriefing: string | null;
  isGeneratingBriefing: boolean;
  generateSmartBriefing: (tasks: Task[], meetings: Meeting[], events: Event[], birthdays: Birthday[]) => Promise<void>;
}

export const DashboardModule: React.FC<DashboardModuleProps> = memo((props) => {
  const [activeTab, setActiveTab] = useState<'command' | 'knowledge' | 'history'>(props.initialTab || 'command');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isReseeding, setIsReseeding] = useState(false);
  const [role, setRole] = useState<'leader' | 'staff'>('staff');
  const [isForecastingOpen, setIsForecastingOpen] = useState(false);

  // Mock data cho biểu đồ
  const performanceData = useMemo(() => [
    { name: 'Tháng 1', value: 85, predicted: 86, risk: 10 },
    { name: 'Tháng 2', value: 88, predicted: 89, risk: 12 },
    { name: 'Tháng 3', value: 92, predicted: 91, risk: 8 },
    { name: 'Tháng 4', value: 90, predicted: 93, risk: 15 },
    { name: 'Tháng 5', value: 95, predicted: 96, risk: 5 },
    { name: 'Tháng 6', value: 94, predicted: 97, risk: 7 },
  ], []);

  const unitDistribution = useMemo(() => [
    { name: 'Phòng Tham mưu', value: 45, color: '#3b82f6' },
    { name: 'Phòng Chính trị', value: 30, color: '#10b981' },
    { name: 'Phòng Hậu cần', value: 15, color: '#f59e0b' },
    { name: 'Phòng Kỹ thuật', value: 10, color: '#ef4444' },
  ], []);

  const competencyData = useMemo(() => [
    { subject: 'Kỹ thuật', A: 120, B: 110, fullMark: 150 },
    { subject: 'Chính trị', A: 98, B: 130, fullMark: 150 },
    { subject: 'Tham mưu', A: 86, B: 130, fullMark: 150 },
    { subject: 'Hậu cần', A: 99, B: 100, fullMark: 150 },
    { subject: 'Ngoại ngữ', A: 85, B: 90, fullMark: 150 },
    { subject: 'Thể lực', A: 115, B: 85, fullMark: 150 },
  ], []);

  const strategicGoals = useMemo(() => [
    { title: 'Hiện đại hóa hạ tầng', progress: 75, status: 'On Track', color: 'bg-blue-500' },
    { title: 'Chuyển đổi số toàn diện', progress: 42, status: 'At Risk', color: 'bg-amber-500' },
    { title: 'Đào tạo nhân lực chất lượng cao', progress: 90, status: 'Ahead', color: 'bg-emerald-500' },
  ], []);

  useEffect(() => {
    if (props.initialTab) {
      setActiveTab(props.initialTab);
    }
  }, [props.initialTab]);

  useEffect(() => {
    if (!props.smartBriefing && !props.isGeneratingBriefing && props.tasks.length > 0) {
      props.generateSmartBriefing(props.tasks, props.meetings, props.events, props.birthdays);
    }
  }, [props.smartBriefing, props.isGeneratingBriefing, props.tasks, props.meetings, props.events, props.birthdays, props.generateSmartBriefing]);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    props.showToast("Đang đồng bộ dữ liệu...", "info");
    try {
      await Promise.all([
        props.loadChatHistory(),
        props.loadKnowledge(),
        props.loadMeetings()
      ]);
      props.showToast("Đồng bộ dữ liệu thành công!", "success");
    } catch (error) {
      props.showToast("Lỗi đồng bộ dữ liệu", "error");
    } finally {
      setIsSyncing(false);
    }
  }, [props.loadChatHistory, props.loadKnowledge, props.loadMeetings, props.showToast]);

  const handleReseed = useCallback(async () => {
    if (!window.confirm("Bạn có chắc chắn muốn nạp lại dữ liệu mặc định? Thao tác này sẽ chỉ thêm các dữ liệu còn thiếu.")) return;
    
    setIsReseeding(true);
    props.showToast("Đang nạp lại dữ liệu mặc định...", "info");
    try {
      await seedEvaluationData();
      props.showToast("Nạp dữ liệu thành công!", "success");
      handleSync();
    } catch (error) {
      console.error("Reseed error:", error);
      props.showToast("Lỗi khi nạp lại dữ liệu", "error");
    } finally {
      setIsReseeding(false);
    }
  }, [props.showToast, handleSync]);

  return (
    <motion.div 
      key="dashboard"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8"
    >
      {/* Header Section v5.0 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[2rem] shadow-2xl shadow-blue-500/30 animate-float">
              <LayoutDashboard size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Command Center</h1>
                <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-full shadow-lg shadow-blue-500/20">v5.0 PRO</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Hệ thống quản trị chiến lược tích hợp AI</p>
                </div>
                <span className="text-slate-200">|</span>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-slate-200/50 backdrop-blur-md p-1.5 rounded-[1.5rem] border border-slate-200/60 shadow-inner">
            <button 
              onClick={() => setRole('leader')}
              className={cn(
                "px-6 py-2.5 text-[11px] font-black rounded-2xl flex items-center gap-2 transition-all uppercase tracking-widest", 
                role === 'leader' ? "bg-white text-blue-600 shadow-xl shadow-blue-500/10" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <ShieldCheck size={14} /> Lãnh đạo
            </button>
            <button 
              onClick={() => setRole('staff')}
              className={cn(
                "px-6 py-2.5 text-[11px] font-black rounded-2xl flex items-center gap-2 transition-all uppercase tracking-widest", 
                role === 'staff' ? "bg-white text-emerald-600 shadow-xl shadow-emerald-500/10" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Zap size={14} /> Tham mưu
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className="btn-pro btn-pro-secondary gap-2 group"
            >
              <RefreshCw size={14} className={cn("transition-transform duration-500 group-hover:rotate-180", isSyncing && "animate-spin")} />
              <span>Đồng bộ</span>
            </button>

            {props.isAdmin && (
              <button 
                onClick={handleReseed}
                disabled={isReseeding}
                className="btn-pro bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 gap-2"
              >
                <Database size={14} />
                <span>Nạp dữ liệu</span>
              </button>
            )}

            <button 
              onClick={() => setIsForecastingOpen(true)}
              className="btn-pro btn-pro-primary gap-3"
            >
              <TrendingUp size={16} />
              <span>Dự báo AI</span>
            </button>
          </div>
        </div>
      </div>
      
      <WorkForecastingModal isOpen={isForecastingOpen} onClose={() => setIsForecastingOpen(false)} />
      
      {/* AI Briefing Section - Enhanced v5.0 */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
        <SmartAssistantBriefing 
          tasks={props.tasks} 
          meetings={props.meetings} 
          events={props.events} 
          birthdays={props.birthdays}
          smartBriefing={props.smartBriefing}
          isGenerating={props.isGeneratingBriefing}
          onGenerate={() => props.generateSmartBriefing(props.tasks, props.meetings, props.events, props.birthdays)}
          onNavigate={props.onNavigate}
        />
      </div>

      {/* Bento Grid Layout v5.0 PRO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-12 gap-8">
        
        {/* Key Metrics Row - Glassmorphism style */}
        <div className="xl:col-span-3 bento-card p-8 flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all" />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform duration-500 shadow-sm">
              <Users size={24} />
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full font-black text-[10px] uppercase tracking-wider border border-emerald-100">
              <ArrowUpRight size={14} />
              +12.4%
            </div>
          </div>
          <div className="relative z-10">
            <p className="subheading-pro">Tổng số nhân sự</p>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic">1,284</h3>
            <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '75%' }}
                transition={{ duration: 1, delay: 0.2 }}
                className="h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full" 
              />
            </div>
          </div>
        </div>

        <div className="xl:col-span-3 bento-card p-8 flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all" />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform duration-500 shadow-sm">
              <Activity size={24} />
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full font-black text-[10px] uppercase tracking-wider border border-emerald-100">
              <ArrowUpRight size={14} />
              +5.4%
            </div>
          </div>
          <div className="relative z-10">
            <p className="subheading-pro">Hiệu suất đơn vị</p>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic">92.8%</h3>
            <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '92%' }}
                transition={{ duration: 1, delay: 0.3 }}
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-full" 
              />
            </div>
          </div>
        </div>

        <div className="xl:col-span-3 bento-card p-8 flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all" />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform duration-500 shadow-sm">
              <FileText size={24} />
            </div>
            <div className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full font-black text-[10px] uppercase tracking-wider border border-amber-100">
              86% Done
            </div>
          </div>
          <div className="relative z-10">
            <p className="subheading-pro">Văn bản xử lý</p>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic">4,102</h3>
            <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '86%' }}
                transition={{ duration: 1, delay: 0.4 }}
                className="h-full bg-gradient-to-r from-amber-500 to-amber-700 rounded-full" 
              />
            </div>
          </div>
        </div>

        <div className="xl:col-span-3 bento-card p-8 flex flex-col justify-between group bg-gradient-to-br from-indigo-600 to-blue-800 text-white border-none shadow-2xl shadow-indigo-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse" />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="p-3 bg-white/20 backdrop-blur-md text-white rounded-2xl group-hover:rotate-12 transition-transform duration-500 shadow-lg">
              <BrainCircuit size={24} />
            </div>
            <div className="px-3 py-1 bg-white/20 backdrop-blur-md text-white rounded-full font-black text-[10px] uppercase tracking-widest border border-white/10">
              AI Active
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">Dự báo chiến lược</p>
            <h3 className="text-4xl font-black tracking-tighter italic">Tích cực</h3>
            <p className="text-[10px] font-bold mt-2 opacity-80 italic flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Dựa trên 24 chỉ số thời gian thực
            </p>
          </div>
        </div>

        {/* Charts Section v5.0 PRO */}
        <div className="xl:col-span-8 bento-card p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4 relative z-10">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">Phân tích Hiệu suất & Rủi ro</h3>
              <p className="subheading-pro mt-1">Dữ liệu tổng hợp từ 12 đơn vị trực thuộc hệ thống</p>
            </div>
            <div className="flex flex-wrap items-center gap-4 p-2.5 bg-slate-50/80 backdrop-blur-sm rounded-2xl border border-slate-200/50">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full shadow-sm shadow-blue-500/20"></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Thực tế</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-200 rounded-full shadow-sm"></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Dự báo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-rose-400 rounded-full shadow-sm shadow-rose-500/20"></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rủi ro</span>
              </div>
            </div>
          </div>
          <div className="h-[400px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '20px', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: '900', textTransform: 'uppercase' }}
                  cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" animationDuration={2000} />
                <Area type="monotone" dataKey="predicted" stroke="#bfdbfe" strokeWidth={2} strokeDasharray="8 8" fill="transparent" />
                <Area type="monotone" dataKey="risk" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorRisk)" animationDuration={2500} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="xl:col-span-4 bento-card p-10 bg-slate-900 text-white border-none shadow-2xl shadow-slate-900/20 relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-blue-600/20 to-transparent pointer-events-none" />
          <h3 className="text-xl font-black text-white tracking-tight uppercase mb-1 italic relative z-10">Ma trận Năng lực</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 relative z-10">Đánh giá 6 chiều theo tiêu chuẩn PRO</p>
          
          <div className="h-[320px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={competencyData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} />
                <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                <Radar
                  name="Hiện tại"
                  dataKey="A"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.5}
                />
                <Radar
                  name="Mục tiêu"
                  dataKey="B"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.2}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 relative z-10">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Điểm trung bình</p>
              <p className="text-2xl font-black text-blue-400 italic">104.2</p>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Độ lệch chuẩn</p>
              <p className="text-2xl font-black text-emerald-400 italic">±4.8</p>
            </div>
          </div>
        </div>

        {/* Strategic Roadmap v5.0 PRO */}
        <div className="xl:col-span-4 bento-card p-10">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase italic">Lộ trình Chiến lược</h3>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <BarChart3 size={20} />
            </div>
          </div>
          <div className="space-y-8">
            {strategicGoals.map((goal, i) => (
              <div key={i} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-800 tracking-tight">{goal.title}</h4>
                  <span className={cn(
                    "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                    goal.status === 'On Track' ? "bg-blue-50 text-blue-600" : goal.status === 'Ahead' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  )}>{goal.status}</span>
                </div>
                <div className="relative h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${goal.progress}%` }}
                    transition={{ duration: 1.5, delay: i * 0.2 }}
                    className={cn("h-full rounded-full shadow-sm", goal.color)} 
                  />
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tiến độ hoàn thành</p>
                  <p className="text-xs font-black text-slate-900">{goal.progress}%</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-10 py-4 bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10">
            Xem báo cáo chi tiết
          </button>
        </div>

        {/* Tasks & Reminders v5.0 PRO */}
        <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bento-card p-8 group">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight italic">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl group-hover:rotate-12 transition-transform">
                  <Zap size={20} />
                </div>
                Nhiệm vụ trọng tâm
              </h3>
              <button onClick={props.onViewTasks} className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest bg-blue-50 px-4 py-2 rounded-full transition-colors border border-blue-100">Tất cả</button>
            </div>
            <div className="space-y-4">
              {props.tasks.slice(0, 4).map((task, i) => (
                <div key={i} className="group/item flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xl hover:border-blue-200 transition-all duration-500">
                  <div className={cn(
                    "w-3.5 h-3.5 rounded-full shadow-lg",
                    task.priority === 'high' ? "bg-red-500 shadow-red-500/30" : task.priority === 'medium' ? "bg-amber-500 shadow-amber-500/30" : "bg-blue-500 shadow-blue-500/30"
                  )}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-800 truncate group-hover/item:text-blue-600 transition-colors tracking-tight">{task.title}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{task.deadline}</p>
                      <span className="text-slate-200">•</span>
                      <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{task.status}</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all">
                    <ArrowUpRight size={14} className="text-slate-400 group-hover/item:text-blue-500" />
                  </div>
                </div>
              ))}
              {props.tasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                  <Zap size={48} className="opacity-10 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest italic">Hệ thống sẵn sàng</p>
                </div>
              )}
            </div>
          </div>

          <div className="bento-card p-8 group">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight italic">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl group-hover:rotate-12 transition-transform">
                  <CalendarIcon size={20} />
                </div>
                Lịch họp chiến lược
              </h3>
              <button onClick={() => props.onNavigate('calendar')} className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest bg-blue-50 px-4 py-2 rounded-full transition-colors border border-blue-100">Xem lịch</button>
            </div>
            <div className="space-y-4">
              {props.meetings.slice(0, 4).map((meeting, i) => (
                <div key={i} className="group/item flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xl hover:border-blue-200 transition-all duration-500">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover/item:bg-blue-600 group-hover/item:text-white transition-all duration-500 shadow-sm">
                    <CalendarIcon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-800 truncate group-hover/item:text-blue-600 transition-colors tracking-tight">{meeting.name}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{meeting.time}</p>
                      <span className="text-slate-200">•</span>
                      <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest truncate max-w-[120px]">{meeting.location}</p>
                    </div>
                  </div>
                </div>
              ))}
              {props.meetings.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                  <CalendarIcon size={48} className="opacity-10 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest italic">Lịch trình trống</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Activity & Birthdays v5.0 PRO */}
        <div className="xl:col-span-4 space-y-8">
          <div className="bento-card p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
            <h3 className="text-sm font-black text-slate-900 mb-8 flex items-center gap-3 uppercase tracking-widest italic relative z-10">
              <div className="p-2 bg-slate-100 text-slate-500 rounded-xl shadow-sm">
                <History size={16} />
              </div>
              Nhật ký hệ thống
            </h3>
            <div className="space-y-6 relative z-10">
              <div className="absolute left-[19px] top-2 bottom-2 w-[1px] bg-slate-100"></div>
              {props.chatHistory.slice(0, 5).map((chat, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={i} 
                  className="flex gap-4 items-start relative z-10"
                >
                  <div className="w-10 h-10 rounded-full bg-white border-4 border-slate-50 flex items-center justify-center text-slate-400 shadow-sm group-hover:scale-110 transition-transform">
                    <History size={14} />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="text-[11px] font-black text-slate-700 leading-relaxed line-clamp-2 italic">"{chat.content}"</p>
                    <p className="text-[9px] font-black text-slate-400 mt-1.5 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      {new Date(chat.timestamp).toLocaleTimeString('vi-VN')}
                    </p>
                  </div>
                </motion.div>
              ))}
              {props.chatHistory.length === 0 && (
                <div className="text-center py-12">
                  <History size={32} className="mx-auto text-slate-100 mb-4" />
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Chưa có hoạt động</p>
                </div>
              )}
            </div>
          </div>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-rose-500 rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
            <StaffBirthdayReminder />
          </div>
        </div>

      </div>
    </motion.div>
  );
});

DashboardModule.displayName = 'DashboardModule';

