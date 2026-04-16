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
  Calendar as CalendarIcon,
  Target,
  MapPin,
  Gift,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  Search,
  Filter,
  Download,
  Share2,
  MoreVertical
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
const TaskReminder = lazy(() => import('./TaskReminder').then(m => ({ default: m.TaskReminder })));
const MeetingReminder = lazy(() => import('./MeetingReminder').then(m => ({ default: m.MeetingReminder })));
const EventReminder = lazy(() => import('./EventReminder').then(m => ({ default: m.EventReminder })));
const QuickNotes = lazy(() => import('./QuickNotes').then(m => ({ default: m.QuickNotes })));
const WorkForecastingModal = lazy(() => import('./WorkForecastingModal').then(m => ({ default: m.WorkForecastingModal })));
const DirectiveTracking = lazy(() => import('./DirectiveTracking').then(m => ({ default: m.DirectiveTracking })));
const StaffBirthdayReminder = lazy(() => import('./StaffBirthdayReminder').then(m => ({ default: m.StaffBirthdayReminder })));
import { PerformanceAnalytics } from './PerformanceAnalytics';
import { KnowledgeGraph } from './KnowledgeGraph';

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
  addManualKnowledge: (category: string, title: string, content: string, tags: string[], pendingId?: string) => Promise<void>;
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
  smartLearnFromText: (text: string, tagsHint?: string[], isManual?: boolean) => Promise<void>;
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
  isSyncingRemote?: boolean;
  syncRemoteKnowledge?: () => void;
  syncUnifiedStrategicKnowledge?: () => Promise<void>;
  isSyncingUnified?: boolean;
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
  updateBirthdays: (updater: Birthday[] | ((prev: Birthday[]) => Birthday[])) => Promise<void>;
  smartBriefing: string | null;
  isGeneratingBriefing: boolean;
  generateSmartBriefing: (tasks: Task[], meetings: Meeting[], events: Event[], birthdays: Birthday[]) => Promise<void>;
  memberCount: number;
  onlineCount: number;
  visitCount: number;
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
      {/* Header Section v6.0 ELITE */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-800 to-blue-950 text-emerald-500 rounded-[2rem] shadow-2xl shadow-emerald-500/20 border border-emerald-500/20 animate-float">
              <BrainCircuit size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Strategic Hub</h1>
                <span className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-black rounded-full shadow-lg shadow-emerald-500/20">v6.0 ELITE</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Hệ thống Chỉ huy Chiến lược Tích hợp AI</p>
                </div>
                <span className="text-slate-200">|</span>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-slate-100/80 backdrop-blur-md p-1.5 rounded-[1.5rem] border border-slate-200/60 shadow-inner">
            <button 
              onClick={() => setRole('leader')}
              className={cn(
                "px-6 py-2.5 text-[11px] font-black rounded-2xl flex items-center gap-2 transition-all uppercase tracking-widest", 
                role === 'leader' ? "bg-slate-900 text-white shadow-xl" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <ShieldCheck size={14} /> Lãnh đạo
            </button>
            <button 
              onClick={() => setRole('staff')}
              className={cn(
                "px-6 py-2.5 text-[11px] font-black rounded-2xl flex items-center gap-2 transition-all uppercase tracking-widest", 
                role === 'staff' ? "bg-emerald-600 text-white shadow-xl" : "text-slate-500 hover:text-slate-700"
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
              onClick={() => props.syncUnifiedStrategicKnowledge && props.syncUnifiedStrategicKnowledge()}
              disabled={props.isSyncingUnified}
              className="btn-pro bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 gap-2 group"
            >
              <RefreshCw size={14} className={cn("transition-transform duration-500 group-hover:rotate-180", props.isSyncingUnified && "animate-spin")} />
              <span>Nạp Bộ Não</span>
            </button>

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
      
      {/* Module 1: Strategic Knowledge Graph */}
      <div className="xl:col-span-12">
        <KnowledgeGraph data={props.aiKnowledge} />
      </div>

      {/* Module 2: Performance Analytics Hub */}
      <div className="xl:col-span-12">
        <PerformanceAnalytics tasks={props.tasks} />
      </div>
      
      {/* AI Briefing Section - Enhanced v6.0 */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
      </div>

      {/* Bento Grid Layout v6.0 ELITE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-12 gap-8">
        
        {/* Key Metrics Row - Glassmorphism style */}
        <div className="xl:col-span-3 bento-card p-8 flex flex-col justify-between group overflow-hidden relative min-h-[220px]">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700" />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-sm border border-blue-100/50">
              <Users size={26} />
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full font-black text-[10px] uppercase tracking-wider border border-emerald-100 shadow-sm">
              <ArrowUpRight size={14} />
              +{(props.memberCount / 150 * 100).toFixed(1)}%
            </div>
          </div>
          <div className="relative z-10">
            <p className="subheading-pro mb-1">Tổng số nhân sự</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-5xl font-black text-slate-900 tracking-tighter italic">{props.memberCount.toLocaleString()}</h3>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active</span>
            </div>
            <div className="mt-6 h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(props.memberCount / 150 * 100, 100)}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-700 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.3)]" 
              />
            </div>
          </div>
        </div>

        <div className="xl:col-span-3 bento-card p-8 flex flex-col justify-between group overflow-hidden relative min-h-[220px]">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-700" />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500 shadow-sm border border-emerald-100/50">
              <Activity size={26} />
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full font-black text-[10px] uppercase tracking-wider border border-emerald-100 shadow-sm">
              <ArrowUpRight size={14} />
              +5.4%
            </div>
          </div>
          <div className="relative z-10">
            <p className="subheading-pro mb-1">Hiệu suất đơn vị</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-5xl font-black text-slate-900 tracking-tighter italic">92.8%</h3>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Optimal</span>
            </div>
            <div className="mt-6 h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '92.8%' }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                className="h-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-700 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
              />
            </div>
          </div>
        </div>

        <div className="xl:col-span-3 bento-card p-8 flex flex-col justify-between group overflow-hidden relative min-h-[220px]">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all duration-700" />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-sm border border-amber-100/50">
              <TrendingUp size={26} />
            </div>
            <div className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-full font-black text-[10px] uppercase tracking-wider border border-amber-100 shadow-sm">
              {props.visitCount.toLocaleString()} Visits
            </div>
          </div>
          <div className="relative z-10">
            <p className="subheading-pro mb-1">Lượt truy cập</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-5xl font-black text-slate-900 tracking-tighter italic">{props.visitCount.toLocaleString()}</h3>
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Growth</span>
            </div>
            <div className="mt-6 h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '86%' }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.4 }}
                className="h-full bg-gradient-to-r from-amber-500 via-amber-600 to-orange-700 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.3)]" 
              />
            </div>
          </div>
        </div>

        <div className="xl:col-span-3 bento-card p-8 flex flex-col justify-between group bg-slate-900 text-white border-none shadow-2xl shadow-slate-900/40 relative overflow-hidden min-h-[220px]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl -mr-24 -mt-24 animate-pulse duration-[4000ms]" />
          <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.15),transparent_70%)]" />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="p-3.5 bg-white/10 backdrop-blur-xl text-white rounded-2xl group-hover:rotate-12 transition-transform duration-500 shadow-lg border border-white/10">
              <BrainCircuit size={26} />
            </div>
            <div className="px-3 py-1.5 bg-emerald-500/20 backdrop-blur-xl text-emerald-400 rounded-full font-black text-[10px] uppercase tracking-widest border border-emerald-500/20">
              AI Core Active
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60 mb-1">Dự báo chiến lược</p>
            <h3 className="text-4xl font-black tracking-tighter italic uppercase">Tích cực</h3>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[8px] font-black">AI</div>
                ))}
              </div>
              <p className="text-[9px] font-bold opacity-70 italic">
                Phân tích 128 biến số
              </p>
            </div>
          </div>
        </div>

        {/* Charts Section v6.0 ELITE */}
        <div className="xl:col-span-8 bento-card p-10 relative overflow-hidden min-h-[550px]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] -ml-48 -mb-48 pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                  <BarChart3 size={20} />
                </div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Phân tích Hiệu suất Chiến lược</h3>
              </div>
              <p className="subheading-pro ml-13">Dữ liệu tổng hợp thời gian thực từ các đơn vị nghiệp vụ</p>
            </div>
            <div className="flex flex-wrap items-center gap-5 p-3.5 bg-slate-50/80 backdrop-blur-md rounded-[1.5rem] border border-slate-200/60 shadow-inner">
              <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white rounded-xl shadow-sm border border-slate-100">
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Thực tế</span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white rounded-xl shadow-sm border border-slate-100">
                <div className="w-2.5 h-2.5 bg-blue-200 rounded-full"></div>
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Dự báo</span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white rounded-xl shadow-sm border border-slate-100">
                <div className="w-2.5 h-2.5 bg-rose-400 rounded-full shadow-[0_0_8px_rgba(251,113,133,0.5)]"></div>
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Rủi ro</span>
              </div>
            </div>
          </div>

          <div className="h-[420px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                  dy={20}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: '1px solid rgba(226, 232, 240, 0.8)', 
                    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.12)', 
                    padding: '24px', 
                    backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                    backdropFilter: 'blur(12px)' 
                  }}
                  itemStyle={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '4px' }}
                  labelStyle={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={5} fillOpacity={1} fill="url(#colorValue)" animationDuration={2500} />
                <Area type="monotone" dataKey="predicted" stroke="#93c5fd" strokeWidth={2} strokeDasharray="10 10" fill="transparent" />
                <Area type="monotone" dataKey="risk" stroke="#fb7185" strokeWidth={3} fillOpacity={1} fill="url(#colorRisk)" animationDuration={3000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="xl:col-span-4 bento-card p-10 bg-blue-950 text-white border-none shadow-2xl shadow-blue-950/40 relative overflow-hidden min-h-[550px]">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent_60%)]" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] -mr-32 -mb-32" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
                <PieChartIcon size={16} />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight uppercase italic">Ma trận Năng lực</h3>
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-10">Đánh giá 6 chiều tiêu chuẩn Elite</p>
            
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={competencyData}>
                  <PolarGrid stroke="#1e293b" strokeWidth={1} />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                  <Radar
                    name="Hiện tại"
                    dataKey="A"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fill="#3b82f6"
                    fillOpacity={0.4}
                    animationDuration={2500}
                  />
                  <Radar
                    name="Mục tiêu"
                    dataKey="B"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="#10b981"
                    fillOpacity={0.1}
                    animationDuration={3000}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', backgroundColor: '#0f172a', color: '#fff', padding: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-5 mt-8">
              <div className="p-5 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md group hover:bg-white/10 transition-all">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Chỉ số Elite</p>
                <p className="text-3xl font-black text-blue-400 italic tracking-tighter">104.2</p>
                <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[70%]" />
                </div>
              </div>
              <div className="p-5 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md group hover:bg-white/10 transition-all">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Độ ổn định</p>
                <p className="text-3xl font-black text-emerald-400 italic tracking-tighter">98.5%</p>
                <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[98%]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Strategic Roadmap v6.0 ELITE */}
        <div className="xl:col-span-4 bento-card p-10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl -mr-24 -mt-24" />
          <div className="flex items-center justify-between mb-10 relative z-10">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">Lộ trình Chiến lược</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Mục tiêu trung hạn 2024-2026</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm border border-indigo-100/50 group-hover:rotate-12 transition-transform duration-500">
              <Target size={24} />
            </div>
          </div>
          <div className="space-y-10 relative z-10">
            {strategicGoals.map((goal, i) => (
              <div key={i} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-2 h-2 rounded-full animate-pulse", goal.color.replace('bg-', 'bg-'))} />
                    <h4 className="text-[13px] font-black text-slate-800 tracking-tight uppercase">{goal.title}</h4>
                  </div>
                  <span className={cn(
                    "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm border",
                    goal.status === 'On Track' ? "bg-blue-50 text-blue-600 border-blue-100" : goal.status === 'Ahead' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                  )}>{goal.status}</span>
                </div>
                <div className="relative h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/40">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${goal.progress}%` }}
                    transition={{ duration: 2, ease: "circOut", delay: i * 0.3 }}
                    className={cn("h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)]", goal.color)} 
                  />
                </div>
                <div className="flex justify-between items-center px-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={12} className="text-slate-400" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiến độ thực hiện</p>
                  </div>
                  <p className="text-sm font-black text-slate-900 italic">{goal.progress}%</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-12 py-4.5 bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20 active:scale-[0.98] border border-slate-800">
            Phân tích chuyên sâu
          </button>
        </div>

        {/* Tasks & Reminders v6.0 ELITE */}
        <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bento-card p-10 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="flex items-center justify-between mb-10 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-sm border border-amber-100/50">
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Nhiệm vụ trọng tâm</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Ưu tiên xử lý ngay</p>
                </div>
              </div>
              <button onClick={props.onViewTasks} className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest bg-blue-50 px-5 py-2.5 rounded-xl transition-all border border-blue-100 shadow-sm hover:shadow-md active:scale-95">Tất cả</button>
            </div>
            <div className="space-y-5 relative z-10">
              {props.tasks.slice(0, 4).map((task, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={i} 
                  className="group/item flex items-center gap-5 p-5 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50 hover:border-blue-200 transition-all duration-500 cursor-pointer"
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full shadow-lg shrink-0",
                    task.priority === 'high' ? "bg-red-500 shadow-red-500/30" : task.priority === 'medium' ? "bg-amber-500 shadow-amber-500/30" : "bg-blue-500 shadow-blue-500/30"
                  )}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-800 truncate group-hover/item:text-blue-600 transition-colors tracking-tight uppercase">{task.title}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon size={12} className="text-slate-400" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{task.deadline} {task.time && `(${task.time})`}</p>
                      </div>
                      <span className="text-slate-200">|</span>
                      <div className="flex items-center gap-1.5">
                        <Activity size={12} className="text-blue-500" />
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{task.status}</p>
                      </div>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all group-hover/item:bg-blue-600 group-hover/item:text-white shadow-lg shadow-blue-600/20">
                    <ArrowUpRight size={18} />
                  </div>
                </motion.div>
              ))}
              {props.tasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <Zap size={40} className="opacity-20" />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] italic text-slate-400">Hệ thống sẵn sàng cho nhiệm vụ mới</p>
                </div>
              )}
            </div>
          </div>

          <div className="bento-card p-10 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="flex items-center justify-between mb-10 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-sm border border-blue-100/50">
                  <CalendarIcon size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Lịch họp chiến lược</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Sắp xếp thời gian tối ưu</p>
                </div>
              </div>
              <button onClick={() => props.onNavigate('calendar')} className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest bg-blue-50 px-5 py-2.5 rounded-xl transition-all border border-blue-100 shadow-sm hover:shadow-md active:scale-95">Xem lịch</button>
            </div>
            <div className="space-y-5 relative z-10">
              {props.meetings.slice(0, 4).map((meeting, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={i} 
                  className="group/item flex items-center gap-5 p-5 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50 hover:border-blue-200 transition-all duration-500 cursor-pointer"
                >
                  <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover/item:bg-blue-600 group-hover/item:text-white transition-all duration-500 shadow-sm border border-blue-100/50">
                    <CalendarIcon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-800 truncate group-hover/item:text-blue-600 transition-colors tracking-tight uppercase">{meeting.name}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5">
                        <Activity size={12} className="text-slate-400" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{meeting.time}</p>
                      </div>
                      <span className="text-slate-200">|</span>
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-blue-500" />
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest truncate max-w-[150px]">{meeting.location}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {props.meetings.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <CalendarIcon size={40} className="opacity-20" />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] italic text-slate-400">Lịch trình hiện tại đang trống</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Activity & Birthdays v6.0 ELITE */}
        <div className="xl:col-span-4 space-y-8">
          <div className="bento-card p-10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-slate-100 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />
            <div className="flex items-center justify-between mb-10 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-100 text-slate-500 rounded-2xl shadow-sm border border-slate-200/50 group-hover:rotate-12 transition-transform duration-500">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight italic">Nhật ký hệ thống</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Truy vết hoạt động AI</p>
                </div>
              </div>
            </div>
            <div className="space-y-8 relative z-10">
              <div className="absolute left-[23px] top-2 bottom-2 w-[2px] bg-slate-100"></div>
              {props.chatHistory.slice(0, 6).map((chat, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={i} 
                  className="flex gap-5 items-start relative z-10 group/log"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white border-4 border-slate-50 flex items-center justify-center text-slate-400 shadow-sm group-hover/log:scale-110 group-hover/log:border-blue-50 group-hover/log:text-blue-500 transition-all duration-500 shrink-0">
                    <History size={16} />
                  </div>
                  <div className="flex-1 min-w-0 pt-1.5">
                    <p className="text-[12px] font-black text-slate-700 leading-relaxed line-clamp-2 italic group-hover/log:text-slate-900 transition-colors tracking-tight">"{chat.content}"</p>
                    <div className="flex items-center gap-2.5 mt-2.5">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono">
                        {new Date(chat.timestamp).toLocaleTimeString('vi-VN')}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
              {props.chatHistory.length === 0 && (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <History size={32} className="text-slate-200" />
                  </div>
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] italic">Chưa ghi nhận hoạt động</p>
                </div>
              )}
            </div>
          </div>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-[3rem] blur opacity-10 group-hover:opacity-25 transition duration-1000"></div>
            <Suspense fallback={<div className="h-full bg-slate-50 animate-pulse rounded-[2.5rem]" />}>
              <QuickNotes showToast={props.showToast} />
            </Suspense>
          </div>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 rounded-[3rem] blur opacity-10 group-hover:opacity-25 transition duration-1000"></div>
            <Suspense fallback={<div className="h-full bg-slate-50 animate-pulse rounded-[2.5rem]" />}>
              <StaffBirthdayReminder 
                birthdays={props.birthdays} 
                updateBirthdays={props.updateBirthdays} 
              />
            </Suspense>
          </div>
        </div>

      </div>
    </motion.div>
  );
});

DashboardModule.displayName = 'DashboardModule';

