import React, { memo, useCallback, useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, 
  RefreshCw, 
  ShieldCheck, 
  Zap, 
  Activity,
  BrainCircuit,
  Calendar as CalendarIcon,
  TrendingUp,
  Users,
  History,
  MapPin,
  Clock
} from 'lucide-react';
import { Birthday, Task, Meeting, Event } from '../constants';
import { cn } from '../lib/utils';
import { seedEvaluationData } from '../lib/seed-evaluation';
import { StatCard } from './dashboard/StatCard';
import { PerformanceChart } from './dashboard/PerformanceChart';
import { CompetencyMatrix } from './dashboard/CompetencyMatrix';

// Lazy load dashboard sub-modules
const WorkForecastingModal = lazy(() => import('./WorkForecastingModal').then(m => ({ default: m.WorkForecastingModal })));
const QuickNotes = lazy(() => import('./QuickNotes').then(m => ({ default: m.QuickNotes })));
const StaffBirthdayReminder = lazy(() => import('./StaffBirthdayReminder').then(m => ({ default: m.StaffBirthdayReminder })));
import { PerformanceAnalytics } from './PerformanceAnalytics';
import { KnowledgeGraph } from './KnowledgeGraph';

import { ToastType } from '../components/ui/Toast';

interface DashboardModuleProps {
  aiKnowledge: any[];
  pendingKnowledge: any[];
  isPendingLoading: boolean;
  isAdmin: boolean;
  loadKnowledge: () => void;
  isMemoryLoading: boolean;
  addManualKnowledge: (category: string, title: string, content: string, tags: string[], pendingId?: string) => Promise<void>;
  updateKnowledge: (id: string, data: any) => void;
  deleteKnowledge: (id: string) => void;
  smartLearnFromText: (text: string, tagsHint?: string[], isManual?: boolean) => Promise<void>;
  isLearning: boolean;
  addPendingKnowledge: (name: string) => void;
  deletePendingKnowledge: (id: string) => void;
  updatePendingKnowledge: (id: string, name: string) => void;
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
  birthdays: Birthday[];
  updateBirthdays: (updater: Birthday[] | ((prev: Birthday[]) => Birthday[])) => Promise<void>;
  smartBriefing: string | null;
  isGeneratingBriefing: boolean;
  generateSmartBriefing: (tasks: Task[], meetings: Meeting[], events: Event[], birthdays: Birthday[]) => Promise<void>;
  memberCount: number;
  onlineCount: number;
  visitCount: number;
}

const StrategicBriefingCard = memo(() => (
  <div className="xl:col-span-3 os-card p-8 flex flex-col justify-between group bg-white border border-blue-100 shadow-xl shadow-blue-500/5 relative overflow-hidden min-h-[220px]">
    <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -mr-24 -mt-24 animate-pulse duration-[4000ms]" />
    <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.05),transparent_70%)]" />
    <div className="flex items-center justify-between mb-6 relative z-10">
      <div className="p-3.5 bg-blue-600 text-white rounded-2xl group-hover:rotate-12 transition-transform duration-500 shadow-lg shadow-blue-600/20 border border-white/20">
        <BrainCircuit size={26} />
      </div>
      <div className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full font-black text-[10px] uppercase tracking-widest border border-blue-100 shadow-sm">
        AI Core Active
      </div>
    </div>
    <div className="relative z-10">
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-1">Dự báo chiến lược</p>
      <h3 className="text-4xl font-black tracking-tighter italic uppercase text-slate-900">Tích cực</h3>
      <div className="flex items-center gap-2 mt-3">
        <div className="flex -space-x-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-blue-50 flex items-center justify-center text-[8px] font-black text-blue-600 shadow-sm">AI</div>
          ))}
        </div>
        <p className="text-[9px] font-bold text-slate-500 italic">
          Phân tích 128 biến số
        </p>
      </div>
    </div>
  </div>
));

StrategicBriefingCard.displayName = 'StrategicBriefingCard';

const StrategicRoadmap = memo(({ data }: { data: any[] }) => (
  <div className="xl:col-span-4 os-card p-10 relative overflow-hidden group bg-white border border-slate-200/60 transition-all hover:shadow-md">
    <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl -mr-24 -mt-24" />
    <div className="flex items-center justify-between mb-10 relative z-10">
      <div>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">Lộ trình Chiến lược</h3>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Mục tiêu trung hạn 2024-2026</p>
      </div>
      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm border border-indigo-100/50 group-hover:rotate-12 transition-transform duration-500">
        <Activity size={24} />
      </div>
    </div>
    <div className="space-y-10 relative z-10">
      {data.map((goal, i) => (
        <div key={`goal-${goal.title}-${i}`} className="space-y-4">
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
    <button className="w-full mt-12 py-4 px-6 bg-blue-600 text-white text-[11px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98] border border-blue-500/10">
      Phân tích chuyên sâu
    </button>
  </div>
));

StrategicRoadmap.displayName = 'StrategicRoadmap';

export const DashboardModule = memo((props: DashboardModuleProps) => {
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
    <div
      key="dashboard"
      className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8"
    >
      {/* Header Section v8.0 ELITE */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white text-blue-600 rounded-[1.5rem] shadow-xl shadow-blue-500/10 border border-blue-100 flex items-center justify-center">
              <BrainCircuit size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Strategic Hub</h1>
                <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-full shadow-lg shadow-blue-500/20">v8.0 ELITE</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Hệ thống Chỉ huy Chiến lược Tích hợp AI</p>
                </div>
                <span className="text-slate-200">|</span>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest text-nowrap">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-slate-100/10 backdrop-blur-md p-1.5 rounded-[1.5rem] border border-slate-200/60 shadow-inner">
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
                role === 'staff' ? "bg-blue-600 text-white shadow-xl" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Zap size={14} /> Tham mưu
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className="px-5 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
            >
              <RefreshCw size={14} className={cn("transition-transform duration-500", isSyncing && "animate-spin")} />
              <span>Đồng bộ</span>
            </button>

            {props.isAdmin && (
              <button 
                onClick={handleReseed}
                disabled={isReseeding}
                className="px-5 py-3 bg-white border border-amber-200 text-amber-600 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-amber-50 transition-all shadow-sm"
              >
                <Database size={14} />
                <span>Nạp Dữ liệu</span>
              </button>
            )}

            <button 
              onClick={() => setIsForecastingOpen(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
            >
              <TrendingUp size={16} />
              <span>Dự báo AI</span>
            </button>
          </div>
        </div>
      </div>
      
      <Suspense fallback={null}>
        <WorkForecastingModal isOpen={isForecastingOpen} onClose={() => setIsForecastingOpen(false)} />
      </Suspense>
      
      {/* Module 1: Strategic Knowledge Graph */}
      <div className="xl:col-span-12">
        <KnowledgeGraph data={props.aiKnowledge} />
      </div>

      {/* Module 2: Performance Analytics Hub */}
      <div className="xl:col-span-12">
        <PerformanceAnalytics tasks={props.tasks} />
      </div>
      
      {/* Bento Grid Layout v8.0 ELITE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-12 gap-8">
        {/* Key Metrics Row */}
        <div className="xl:col-span-3">
          <StatCard 
            title="Tổng số nhân sự"
            value={props.memberCount.toLocaleString()}
            subtitle="Active"
            icon={Users}
            colorClass="bg-blue-500"
            progress={Math.min(props.memberCount / 150 * 100, 100)}
            trend={`+${(props.memberCount / 150 * 100).toFixed(1)}%`}
            onAction={() => props.onNavigate('users')}
          />
        </div>

        <div className="xl:col-span-3">
          <StatCard 
            title="Hiệu suất đơn vị"
            value="92.8%"
            subtitle="Optimal"
            icon={Activity}
            colorClass="bg-emerald-500"
            progress={92.8}
            trend="+5.4%"
            onAction={() => props.onNavigate('reporting')}
          />
        </div>

        <div className="xl:col-span-3">
          <StatCard 
            title="Lượt truy cập"
            value={props.visitCount.toLocaleString()}
            subtitle="Growth"
            icon={TrendingUp}
            colorClass="bg-amber-500"
            progress={86}
          />
        </div>

        <StrategicBriefingCard />

        {/* Charts Section v8.0 ELITE */}
        <PerformanceChart data={performanceData} />

        <CompetencyMatrix data={competencyData} />

        {/* Strategic Roadmap v8.0 ELITE */}
        <StrategicRoadmap data={strategicGoals} />

        {/* Tasks & Reminders v8.0 ELITE */}
        <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="os-card p-10 group relative overflow-hidden bg-white border border-slate-200/60 shadow-sm rounded-[2rem]">
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
                  key={task.id ? `dashboard-task-${task.id}` : `dashboard-task-idx-${i}`} 
                  className="group/item flex items-center gap-5 p-5 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50 hover:border-blue-200 transition-all duration-500 cursor-pointer"
                >
                  <div className={cn(
                    "w-3 h-3 rounded-full shadow-lg shrink-0",
                    task.priority === 'high' ? "bg-red-500" : task.priority === 'medium' ? "bg-amber-500" : "bg-blue-500"
                  )}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-800 truncate group-hover/item:text-blue-600 transition-colors tracking-tight uppercase">{task.title}</p>
                    <div className="flex items-center gap-4 mt-2">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{task.deadline}</span>
                       <span className="text-slate-200">|</span>
                       <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{task.status}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="os-card p-10 group relative overflow-hidden bg-white border border-slate-200/60 shadow-sm rounded-[2rem]">
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
                  key={meeting.id ? `dashboard-meeting-${meeting.id}` : `dashboard-meeting-idx-${i}`} 
                  className="group/item flex items-center gap-5 p-5 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50 hover:border-blue-200 transition-all duration-500 cursor-pointer"
                >
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover/item:bg-blue-600 group-hover/item:text-white transition-all duration-500">
                    <CalendarIcon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-800 truncate group-hover/item:text-blue-600 transition-colors tracking-tight uppercase">{meeting.name}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{meeting.time} • {meeting.location}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Activity & Birthdays v8.0 ELITE */}
        <div className="xl:col-span-4 space-y-8">
          <div className="os-card p-10 relative overflow-hidden group bg-white border border-slate-200/60 shadow-sm rounded-[2rem]">
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
                  key={chat.id ? `dashboard-chat-${chat.id}` : `dashboard-chat-idx-${i}`} 
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
            </div>
          </div>

          <Suspense fallback={<div className="h-40 bg-slate-50 animate-pulse rounded-[2rem]" />}>
            <QuickNotes showToast={props.showToast} />
          </Suspense>

          <Suspense fallback={<div className="h-40 bg-slate-50 animate-pulse rounded-[2rem]" />}>
            <StaffBirthdayReminder 
              birthdays={props.birthdays} 
              updateBirthdays={props.updateBirthdays} 
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
});

DashboardModule.displayName = 'DashboardModule';

