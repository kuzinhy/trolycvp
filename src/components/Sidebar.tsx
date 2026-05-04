import React, { memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Search, 
  MessageSquare, 
  LayoutDashboard, 
  History,
  Activity,
  Database, 
  ListTodo, 
  Check, 
  Calendar, 
  TrendingUp, 
  AlertTriangle, 
  Settings,
  FileText,
  Users,
  MessageCircle,
  Bell,
  X,
  Wrench,
  Sparkles,
  PenTool,
  CheckCircle,
  MapPin,
  Mail,
  Mic,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Zap,
  BrainCircuit,
  Rocket,
  ClipboardList,
  Newspaper,
  FileCheck,
  Target,
  Lightbulb,
  BarChart3,
  StickyNote,
  FileSignature
} from 'lucide-react';
import { cn } from '../lib/utils';
import { SPECIALIZED_TASKS, APP_VERSION } from '../constants';
import { NotificationDropdown } from './NotificationDropdown';

import { User } from 'firebase/auth';
import { Notification } from '../constants';

import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  currentTab: string;
  onNavigate: (tab: any) => void;
  onQuickTask: (prompt: string) => void;
  onOpenSettings: () => void;
  user: User | null;
  notifications: Notification[];
  showNotifications: boolean;
  setShowNotifications: (val: boolean) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onToggleTeamChat: () => void;
  isTeamChatOpen: boolean;
  sidebarPosition?: 'left' | 'right';
}

const NavButton = memo(({ active, onClick, icon, label, collapsed, badge }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, collapsed?: boolean, badge?: string }) => (
  <button 
    onClick={onClick}
    title={collapsed ? label : ""}
    className={cn(
      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 text-xs font-medium group relative",
      active 
        ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] border-blue-500" 
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-transparent",
      collapsed && "justify-center px-0",
      "border"
    )}
  >
    <div className="flex items-center gap-3 relative z-10">
      <div className={cn(
        "transition-all duration-200 shrink-0",
        active ? "text-white" : "text-slate-400 group-hover:text-slate-600"
      )}>
        {icon}
      </div>
      {!collapsed && <span className={cn("truncate", active ? "font-black uppercase tracking-tight" : "font-medium")}>{label}</span>}
    </div>
    
    {!collapsed && badge && (
      <span className={cn(
        "px-2 py-0.5 text-[10px] font-black uppercase rounded tracking-tight",
        active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
      )}>
        {badge}
      </span>
    )}
  </button>
));

NavButton.displayName = 'NavButton';

export const Sidebar: React.FC<SidebarProps> = memo(({
  isSidebarOpen,
  setIsSidebarOpen,
  currentTab,
  onNavigate,
  onQuickTask,
  onOpenSettings,
  user,
  notifications,
  showNotifications,
  setShowNotifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onToggleTeamChat,
  isTeamChatOpen,
  sidebarPosition = 'left'
}) => {
  const { isAdmin, unitInfo } = useAuth();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isProfileExpanded, setIsProfileExpanded] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    'ai-assistant': true,
    'drafting-pro': currentTab.startsWith('drafting-pro') || currentTab === 'invitation' || currentTab === 'email-assistant' || currentTab === 'review' || currentTab === 'conclusion-creator',
    'management': currentTab === 'dashboard' || currentTab === 'resolution-tracking' || currentTab === 'evaluation',
    'operations': currentTab === 'party-advisory' || currentTab === 'news' || currentTab === 'forecasting' || currentTab === 'knowledge' || currentTab === 'strategic',
    'admin': currentTab === 'users' || currentTab === 'access-history' || currentTab === 'system-updates'
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <aside 
      className={cn(
        "fixed inset-y-0 z-50 bg-white/80 backdrop-blur-3xl transition-all duration-500 ease-in-out md:relative md:translate-x-0 flex flex-col",
        sidebarPosition === 'right' ? "right-0 border-l border-slate-200" : "left-0 border-r border-slate-200",
        isCollapsed ? "w-20" : "w-72",
        !isSidebarOpen && (sidebarPosition === 'right' ? "translate-x-full" : "-translate-x-full") + " md:hidden",
        "shadow-[0_20px_40px_rgba(0,0,0,0.05)]"
      )}
    >
      {/* Collapse Toggle */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "absolute top-24 w-6 h-6 bg-white border border-slate-200 rounded-full hidden md:flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 shadow-sm z-10 transition-all",
          sidebarPosition === 'right' ? "-left-3" : "-right-3"
        )}
      >
        {isCollapsed ? (sidebarPosition === 'right' ? <ChevronLeft size={14} /> : <ChevronRight size={14} />) : (sidebarPosition === 'right' ? <ChevronRight size={14} /> : <ChevronLeft size={14} />)}
      </button>

      {/* Header Section */}
      <div className={cn("p-6 flex flex-col gap-4 shrink-0 border-b border-slate-100 bg-slate-50/30", isCollapsed && "items-center px-0")}>
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-2xl shadow-blue-500/20 group-hover:scale-110 transition-all duration-500 border border-slate-100">
              <img 
                src="https://i.imgur.com/S9tvwYs.png" 
                alt="Elite Strategic Hub Logo" 
                className="w-full h-full object-contain p-1"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.6)]" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="font-black text-slate-900 text-base tracking-tighter truncate uppercase leading-none mb-1">STRATEGIC HUB</h1>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[7px] font-black rounded uppercase">v6.0</span>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">SYSTEM READY</p>
              </div>
            </div>
          )}
        </div>
        
        {!isCollapsed && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-white border border-slate-100 p-2 rounded-xl flex flex-col items-center justify-center shadow-sm">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">AI Health</span>
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-bold text-slate-700 font-mono">99.8%</span>
              </div>
            </div>
            <div className="bg-white border border-slate-100 p-2 rounded-xl flex flex-col items-center justify-center shadow-sm">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Uptime</span>
              <span className="text-[9px] font-bold text-slate-700 font-mono text-center truncate w-full">24d 11h</span>
            </div>
          </div>
        )}
      </div>

      {/* Search Section */}
      {!isCollapsed && (
        <div className="px-4 py-4">
          <div className="relative group">
            <Search className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 transition-colors",
              searchTerm ? "text-blue-500" : "text-slate-400 group-focus-within:text-blue-500"
            )} size={14} />
            <input
              type="text"
              placeholder="TRUY VẤN HỆ THỐNG..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-12 py-2.5 bg-slate-100/50 border border-slate-200 rounded-xl text-[10px] font-black text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono uppercase tracking-wider"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-40 group-focus-within:opacity-100 transition-opacity">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[8px] font-black text-slate-500">⌘K</kbd>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Section */}
      <div className="flex-1 overflow-y-auto px-4 space-y-1 custom-scrollbar py-2">
        <div className="mb-4">
          {!isCollapsed && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-3">Kernel Services</p>}
          <div className="space-y-0.5">
            {(!searchTerm || "việc cần làm".includes(searchTerm.toLowerCase())) && (
              <NavButton 
                active={currentTab === 'todo-assistant'} 
                onClick={() => onNavigate('todo-assistant')} 
                icon={<ListTodo size={16} />} 
                label="Việc cần làm" 
                collapsed={isCollapsed}
              />
            )}
            {(!searchTerm || "hội thoại ai".includes(searchTerm.toLowerCase())) && (
              <NavButton 
                active={currentTab === 'chat'} 
                onClick={() => onNavigate('chat')} 
                icon={<BrainCircuit size={16} />} 
                label="Hội thoại AI Elite" 
                collapsed={isCollapsed}
              />
            )}
          </div>
        </div>

        {/* Nhóm Soạn thảo Pro */}
        {(!searchTerm || [
          "soạn thảo pro", "phân tích & báo cáo", "phân tích văn bản", "soạn thảo ai", 
          "rà soát văn bản đảng", "tạo thư mời", "soạn thảo email", "bài phát biểu"
        ].some(s => s.includes(searchTerm.toLowerCase()))) && (
          <div className="py-1">
            <button 
              onClick={() => toggleSection('drafting-pro')}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 group text-xs",
                (expandedSections['drafting-pro'] || currentTab.startsWith('drafting-pro') || currentTab === 'invitation' || currentTab === 'email-assistant' || currentTab === 'review' || currentTab === 'reporting' || searchTerm) 
                  ? "bg-indigo-50 text-indigo-700" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                isCollapsed && "justify-center px-0"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "transition-all duration-200 shrink-0",
                  (expandedSections['drafting-pro'] || currentTab.startsWith('drafting-pro') || currentTab === 'invitation' || currentTab === 'email-assistant' || currentTab === 'review' || currentTab === 'reporting' || searchTerm) 
                    ? "text-indigo-600" 
                    : "text-slate-400"
                )}>
                  <PenTool size={16} />
                </div>
                {!isCollapsed && <span className="font-semibold truncate">Soạn thảo Pro</span>}
              </div>
              {!isCollapsed && (
                <div className={cn(
                  "transition-transform duration-200",
                  (expandedSections['drafting-pro'] || searchTerm) ? "rotate-180" : ""
                )}>
                  <ChevronDown size={12} className="text-slate-400" />
                </div>
              )}
            </button>

            <AnimatePresence>
              {(expandedSections['drafting-pro'] || searchTerm) && !isCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-1 ml-4 border-l border-slate-200/60 space-y-1 pl-2"
                >
                  {(!searchTerm || "phân tích & báo cáo".includes(searchTerm.toLowerCase())) && (
                    <NavButton 
                      active={currentTab === 'reporting'} 
                      onClick={() => onNavigate('reporting')} 
                      icon={<BarChart3 size={16} />} 
                      label="Phân tích & Báo cáo" 
                      collapsed={isCollapsed}
                    />
                  )}
                  {(!searchTerm || "soạn thảo ai".includes(searchTerm.toLowerCase())) && (
                    <NavButton 
                      active={currentTab === 'drafting-pro'} 
                      onClick={() => onNavigate('drafting-pro')} 
                      icon={<PenTool size={16} />} 
                      label="Soạn thảo AI" 
                      collapsed={isCollapsed}
                    />
                  )}
                  {(!searchTerm || "rà soát văn bản đảng".includes(searchTerm.toLowerCase())) && (
                    <NavButton 
                      active={currentTab === 'drafting-pro-review'} 
                      onClick={() => onNavigate('drafting-pro-review')} 
                      icon={<FileCheck size={16} />} 
                      label="Rà soát Văn bản Đảng" 
                      collapsed={isCollapsed}
                    />
                  )}
                  {(!searchTerm || "soạn bài phát biểu".includes(searchTerm.toLowerCase())) && (
                    <NavButton 
                      active={currentTab === 'drafting-pro-speech'} 
                      onClick={() => onNavigate('drafting-pro-speech')} 
                      icon={<Mic size={16} />} 
                      label="Soạn bài phát biểu" 
                      collapsed={isCollapsed}
                    />
                  )}
                  {(!searchTerm || "tạo kết luận".includes(searchTerm.toLowerCase())) && (
                    <NavButton 
                      active={currentTab === 'conclusion-creator'} 
                      onClick={() => onNavigate('conclusion-creator')} 
                      icon={<FileSignature size={16} />} 
                      label="Tạo kết luận" 
                      collapsed={isCollapsed}
                      badge="Mới"
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Nhóm Quản trị & Điều hành */}
        {(!searchTerm || [
          "quản trị & điều hành", "bảng điều khiển", "quản trị nghị quyết", "theo dõi, đánh giá", "giao văn bản"
        ].some(s => s.includes(searchTerm.toLowerCase()))) && (
          <div className="py-1">
            <button 
              onClick={() => toggleSection('management')}
              className={cn(
                "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-300 group",
                (expandedSections['management'] || searchTerm) ? "bg-blue-50/80 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                isCollapsed && "justify-center px-0"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "transition-all duration-300 shrink-0",
                  (expandedSections['management'] || searchTerm) ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                )}>
                  <LayoutDashboard size={18} />
                </div>
                {!isCollapsed && <span className="font-bold tracking-tight truncate text-sm">Quản trị & Điều hành</span>}
              </div>
              {!isCollapsed && (
                <div className={cn(
                  "transition-transform duration-300",
                  (expandedSections['management'] || searchTerm) ? "rotate-180" : ""
                )}>
                  <ChevronDown size={14} className="text-slate-400" />
                </div>
              )}
            </button>

            <AnimatePresence>
              {(expandedSections['management'] || searchTerm) && !isCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-1 ml-4 border-l border-slate-200/60 space-y-1 pl-2"
                >
                  {(!searchTerm || "bảng điều khiển".includes(searchTerm.toLowerCase())) && (
                    <NavButton 
                      active={currentTab === 'dashboard'} 
                      onClick={() => onNavigate('dashboard')} 
                      icon={<LayoutDashboard size={16} />} 
                      label="Bảng điều khiển" 
                      collapsed={isCollapsed}
                    />
                  )}
                  {(!searchTerm || "sổ tay nhiệm vụ".includes(searchTerm.toLowerCase())) && (
                    <NavButton 
                      active={currentTab === 'task-journal'} 
                      onClick={() => onNavigate('task-journal')} 
                      icon={<FileText size={16} />} 
                      label="Sổ tay Thống kê" 
                      collapsed={isCollapsed}
                    />
                  )}
                  {(!searchTerm || "theo dõi phân công".includes(searchTerm.toLowerCase())) && (
                    <NavButton 
                      active={currentTab === 'assignment-tracking'} 
                      onClick={() => onNavigate('assignment-tracking')} 
                      icon={<ClipboardList size={16} />} 
                      label="Theo dõi phân công" 
                      collapsed={isCollapsed}
                    />
                  )}
                  {(!searchTerm || "quản trị nghị quyết".includes(searchTerm.toLowerCase())) && (
                    <NavButton 
                      active={currentTab === 'resolution-tracking'} 
                      onClick={() => onNavigate('resolution-tracking')} 
                      icon={<Target size={16} />} 
                      label="Quản trị Nghị quyết" 
                      collapsed={isCollapsed}
                    />
                  )}
                  {(!searchTerm || "theo dõi, đánh giá".includes(searchTerm.toLowerCase())) && (
                    <NavButton 
                      active={currentTab === 'evaluation'} 
                      onClick={() => onNavigate('evaluation')} 
                      icon={<CheckCircle size={16} />} 
                      label="Theo dõi, Đánh giá" 
                      collapsed={isCollapsed}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Nhóm Nghiệp vụ & Dữ liệu */}
        {(!searchTerm || [
          "nghiệp vụ & dữ liệu", "tham mưu & sinh hoạt", "tin tức & dư luận", "dự báo chiến lược", "knowledge core"
        ].some(s => s.includes(searchTerm.toLowerCase()))) && (
          <div className="py-1">
            <button 
              onClick={() => toggleSection('operations')}
              className={cn(
                "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-300 group",
                (expandedSections['operations'] || currentTab === 'strategic' || searchTerm) ? "bg-emerald-50/80 text-emerald-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                isCollapsed && "justify-center px-0"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "transition-all duration-300 shrink-0",
                  (expandedSections['operations'] || currentTab === 'strategic' || searchTerm) ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"
                )}>
                  <Database size={18} />
                </div>
                {!isCollapsed && <span className="font-bold tracking-tight truncate text-sm">Nghiệp vụ & Dữ liệu</span>}
              </div>
              {!isCollapsed && (
                <div className={cn(
                  "transition-transform duration-300",
                  (expandedSections['operations'] || currentTab === 'strategic' || searchTerm) ? "rotate-180" : ""
                )}>
                  <ChevronDown size={14} className="text-slate-400" />
                </div>
              )}
            </button>

            <AnimatePresence>
              {(expandedSections['operations'] || searchTerm) && !isCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-1 ml-4 border-l border-slate-200/60 space-y-1 pl-2"
                >
                  {(!searchTerm || "tham mưu chiến lược".includes(searchTerm.toLowerCase())) && (
                    <NavButton 
                      active={currentTab === 'strategic'} 
                      onClick={() => onNavigate('strategic')} 
                      icon={<BrainCircuit size={16} />} 
                      label="Tham mưu chiến lược" 
                      collapsed={isCollapsed}
                    />
                  )}
                  {(!searchTerm || "tham mưu & sinh hoạt".includes(searchTerm.toLowerCase())) && (
                    <NavButton 
                      active={currentTab === 'party-advisory'} 
                      onClick={() => onNavigate('party-advisory')} 
                      icon={<Lightbulb size={16} />} 
                      label="Tham mưu & Sinh hoạt" 
                      collapsed={isCollapsed}
                    />
                  )}
                  {(!searchTerm || "tin tức & dư luận".includes(searchTerm.toLowerCase())) && (
                    <NavButton 
                      active={currentTab === 'news'} 
                      onClick={() => onNavigate('news')} 
                      icon={<Newspaper size={16} />} 
                      label="Tin tức & Dư luận" 
                      collapsed={isCollapsed}
                    />
                  )}
                  {(!searchTerm || "dự báo chiến lược".includes(searchTerm.toLowerCase())) && (
                    <NavButton 
                      active={currentTab === 'forecasting'} 
                      onClick={() => onNavigate('forecasting')} 
                      icon={<TrendingUp size={16} />} 
                      label="Dự báo chiến lược" 
                      collapsed={isCollapsed}
                    />
                  )}
                  {(!searchTerm || "knowledge core".includes(searchTerm.toLowerCase())) && (
                    <NavButton 
                      active={currentTab === 'knowledge'} 
                      onClick={() => onNavigate('knowledge')} 
                      icon={<Database size={16} />} 
                      label="Knowledge Core" 
                      collapsed={isCollapsed}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Nhóm Quản trị Hệ thống (Admin Only) */}
        {isAdmin && (!searchTerm || [
          "quản trị hệ thống", "quản lý quân số", "lịch sử truy cập", "cập nhật hệ thống"
        ].some(s => s.includes(searchTerm.toLowerCase()))) && (
          <div className="py-1">
            <button 
              onClick={() => toggleSection('admin')}
              className={cn(
                "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-300 group",
                (expandedSections['admin'] || searchTerm) ? "bg-rose-50/80 text-rose-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                isCollapsed && "justify-center px-0"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "transition-all duration-300 shrink-0",
                  (expandedSections['admin'] || searchTerm) ? "text-rose-600" : "text-slate-400 group-hover:text-slate-600"
                )}>
                  <ShieldCheck size={18} />
                </div>
                {!isCollapsed && <span className="font-bold tracking-tight truncate text-sm">Quản trị Hệ thống</span>}
              </div>
              {!isCollapsed && (
                <div className={cn(
                  "transition-transform duration-300",
                  (expandedSections['admin'] || searchTerm) ? "rotate-180" : ""
                )}>
                  <ChevronDown size={14} className="text-slate-400" />
                </div>
              )}
            </button>

            <AnimatePresence>
              {(expandedSections['admin'] || searchTerm) && !isCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-1 ml-4 border-l border-slate-200/60 space-y-1 pl-2"
                >
                  {(!searchTerm || "quản lý quân số".includes(searchTerm.toLowerCase())) && (
                    <NavButton 
                      active={currentTab === 'users'} 
                      onClick={() => onNavigate('users')} 
                      icon={<Users size={16} />} 
                      label="Quản lý quân số" 
                      collapsed={isCollapsed}
                    />
                  )}
                  {(!searchTerm || "lịch sử truy cập".includes(searchTerm.toLowerCase())) && (
                    <NavButton 
                      active={currentTab === 'access-history'} 
                      onClick={() => onNavigate('access-history')} 
                      icon={<History size={16} />} 
                      label="Lịch sử truy cập" 
                      collapsed={isCollapsed}
                    />
                  )}
                  {(!searchTerm || "cập nhật hệ thống".includes(searchTerm.toLowerCase())) && (
                    <NavButton 
                      active={currentTab === 'system-updates'} 
                      onClick={() => onNavigate('system-updates')} 
                      icon={<Wrench size={16} />} 
                      label="Cập nhật hệ thống" 
                      collapsed={isCollapsed}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {(!searchTerm || "lịch công tác".includes(searchTerm.toLowerCase())) && (
          <NavButton 
            active={currentTab === 'calendar'} 
            onClick={() => onNavigate('calendar')} 
            icon={<Calendar size={18} />} 
            label="Lịch công tác" 
            collapsed={isCollapsed}
          />
        )}
      </div>

      {/* User Profile Section */}
      <div className={cn("p-4 border-t border-slate-100 bg-white/50 flex flex-col gap-3", isCollapsed && "px-2")}>
        <div 
          onClick={() => {
            if (isCollapsed) {
              onOpenSettings();
            } else {
              setIsProfileExpanded(!isProfileExpanded);
            }
          }}
          className={cn(
            "w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition-all duration-500 group border border-transparent hover:border-slate-100 cursor-pointer",
            isCollapsed && "justify-center p-1"
          )}
        >
          <div className="relative shrink-0">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'User'} className="w-11 h-11 rounded-xl ring-2 ring-white shadow-md object-cover" />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-xs ring-2 ring-white shadow-md border border-blue-100">
                {user?.displayName?.split(' ').map(n => n[0]).join('') || user?.email?.substring(0, 2).toUpperCase() || 'U'}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full shadow-[0_0_8px_rgba(59,130,246,0.3)]" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-slate-900 truncate group-hover:text-blue-600 transition-colors uppercase tracking-tight">{user?.displayName || user?.email || 'Người dùng'}</p>
              </div>
              <p className="text-[10px] text-slate-400 truncate font-black uppercase tracking-widest font-mono">Quantum Operator</p>
            </div>
          )}
          {!isCollapsed && (
            <div className="flex items-center gap-1">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSettings();
                }}
                className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                title="Cài đặt"
              >
                <Settings size={16} className="group-hover:rotate-90 transition-all duration-700" />
              </button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {(isProfileExpanded || isCollapsed) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden flex flex-col gap-2"
            >
              <div className="space-y-1">
                <NavButton 
                  active={currentTab === 'history'} 
                  onClick={() => onNavigate('history')} 
                  icon={<History size={16} />} 
                  label="LỊCH SỬ HỆ THỐNG" 
                  collapsed={isCollapsed}
                />
              </div>

              <div className={cn("flex items-center gap-2 px-1", isCollapsed && "flex-col")}>
                <button 
                  onClick={onToggleTeamChat}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-500 font-black text-[10px] uppercase tracking-[0.15em] font-mono",
                    isCollapsed && "w-full",
                    isTeamChatOpen 
                      ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]" 
                      : "bg-slate-50 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200"
                  )}
                  title="Nhóm"
                >
                  <MessageCircle size={14} />
                  {!isCollapsed && <span>Nodes</span>}
                </button>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-500 font-black text-[10px] uppercase tracking-[0.15em] font-mono relative",
                    isCollapsed && "w-full",
                    showNotifications 
                      ? "bg-blue-600 text-white shadow-[0_10px_15px_rgba(59,130,246,0.2)]" 
                      : "bg-slate-50 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200"
                  )}
                  title="Thông báo"
                >
                  <Bell size={14} />
                  {!isCollapsed && <span>Pulse</span>}
                  {notifications.some(n => !n.isRead) && (
                    <span className={cn(
                      "absolute bg-rose-500 rounded-full ring-2 ring-white",
                      isCollapsed ? "top-2 right-2 w-2 h-2" : "top-2 right-2 w-2.5 h-2.5"
                    )} />
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {showNotifications && (
          <NotificationDropdown 
            notifications={notifications}
            onClose={() => setShowNotifications(false)}
            onMarkAsRead={onMarkAsRead}
            onMarkAllAsRead={onMarkAllAsRead}
            onNavigate={onNavigate}
          />
        )}
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';
