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
  ClipboardList,
  Newspaper,
  FileCheck,
  Target,
  Lightbulb,
  BarChart3
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

const NavButton = memo(({ active, onClick, icon, label, collapsed }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, collapsed?: boolean }) => (
  <button 
    onClick={onClick}
    title={collapsed ? label : ""}
    className={cn(
      "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm group",
      active 
        ? "bg-blue-50 text-blue-700" 
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      collapsed && "justify-center px-0"
    )}
  >
    <div className={cn(
      "transition-all duration-200 shrink-0",
      active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
    )}>
      {icon}
    </div>
    {!collapsed && <span className="tracking-tight truncate">{label}</span>}
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
    'drafting-pro': currentTab.startsWith('drafting-pro') || currentTab === 'invitation' || currentTab === 'email-assistant' || currentTab === 'review',
    'management': currentTab === 'dashboard' || currentTab === 'resolution-tracking' || currentTab === 'evaluation',
    'operations': currentTab === 'party-advisory' || currentTab === 'news' || currentTab === 'forecasting' || currentTab === 'knowledge'
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
        "fixed inset-y-0 z-50 bg-[hsl(var(--card))] transition-all duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col",
        sidebarPosition === 'right' ? "right-0 border-l border-[hsl(var(--border))]" : "left-0 border-r border-[hsl(var(--border))]",
        isCollapsed ? "w-20" : "w-64",
        !isSidebarOpen && (sidebarPosition === 'right' ? "translate-x-full" : "-translate-x-full") + " md:hidden"
      )}
    >
      {/* Collapse Toggle */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "absolute top-24 w-6 h-6 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-full hidden md:flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:border-[hsl(var(--primary))]/30 shadow-sm z-10 transition-all",
          sidebarPosition === 'right' ? "-left-3" : "-right-3"
        )}
      >
        {isCollapsed ? (sidebarPosition === 'right' ? <ChevronLeft size={14} /> : <ChevronRight size={14} />) : (sidebarPosition === 'right' ? <ChevronRight size={14} /> : <ChevronLeft size={14} />)}
      </button>

      <div className={cn("p-5 flex items-center gap-3 shrink-0", isCollapsed && "justify-center px-0")}>
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-600/20">
          <ShieldCheck size={20} />
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <h1 className="font-black text-[hsl(var(--foreground))] text-sm tracking-tight truncate uppercase">Strategic Hub</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-widest">System v5.0 Active</p>
            </div>
          </div>
        )}
      </div>

      {!isCollapsed && (
        <div className="px-3 mb-2">
          <div className="relative group">
            <Search className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 transition-colors",
              searchTerm ? "text-blue-500" : "text-slate-400 group-focus-within:text-blue-500"
            )} size={14} />
            <input
              type="text"
              placeholder="Tìm kiếm menu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-100 rounded-xl text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar py-2">
        {/* Simplified navigation */}
        {(!searchTerm || "hội thoại ai".includes(searchTerm.toLowerCase())) && (
          <NavButton 
            active={currentTab === 'chat'} 
            onClick={() => onNavigate('chat')} 
            icon={<MessageSquare size={18} />} 
            label="Hội thoại AI" 
            collapsed={isCollapsed}
          />
        )}

        {/* Nhóm Soạn thảo Pro */}
        {(!searchTerm || [
          "soạn thảo pro", "phân tích & báo cáo", "phân tích văn bản", "soạn thảo ai", 
          "rà soát văn bản đảng", "tạo thư mời", "soạn thảo email", "bài phát biểu"
        ].some(s => s.includes(searchTerm.toLowerCase()))) && (
          <div className="py-1">
            <button 
              onClick={() => toggleSection('drafting-pro')}
              className={cn(
                "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-200 group",
                (expandedSections['drafting-pro'] || currentTab.startsWith('drafting-pro') || currentTab === 'invitation' || currentTab === 'email-assistant' || currentTab === 'review' || currentTab === 'reporting' || searchTerm) 
                  ? "bg-indigo-50/50 text-indigo-700" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                isCollapsed && "justify-center px-0"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "transition-all duration-200 shrink-0",
                  (expandedSections['drafting-pro'] || currentTab.startsWith('drafting-pro') || currentTab === 'invitation' || currentTab === 'email-assistant' || currentTab === 'review' || currentTab === 'reporting' || searchTerm) 
                    ? "text-indigo-600" 
                    : "text-slate-400 group-hover:text-slate-600"
                )}>
                  <PenTool size={18} />
                </div>
                {!isCollapsed && <span className="font-bold tracking-tight truncate">Soạn thảo Pro</span>}
              </div>
              {!isCollapsed && (
                <div className={cn(
                  "transition-transform duration-300",
                  (expandedSections['drafting-pro'] || searchTerm) ? "rotate-180" : ""
                )}>
                  <ChevronDown size={14} className="text-slate-400" />
                </div>
              )}
            </button>

            <AnimatePresence>
              {(expandedSections['drafting-pro'] || searchTerm) && !isCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-1 ml-4 border-l-2 border-slate-100 space-y-1"
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
                  {(!searchTerm || "tạo thư mời".includes(searchTerm.toLowerCase())) && (
                    <NavButton 
                      active={currentTab === 'invitation'} 
                      onClick={() => onNavigate('invitation')} 
                      icon={<FileText size={16} />} 
                      label="Tạo thư mời" 
                      collapsed={isCollapsed}
                    />
                  )}
                  {(!searchTerm || "soạn thảo email".includes(searchTerm.toLowerCase())) && (
                    <NavButton 
                      active={currentTab === 'email-assistant'} 
                      onClick={() => onNavigate('email-assistant')} 
                      icon={<Mail size={16} />} 
                      label="Soạn thảo Email" 
                      collapsed={isCollapsed}
                    />
                  )}
                  {(!searchTerm || "bài phát biểu".includes(searchTerm.toLowerCase())) && (
                    <NavButton 
                      active={currentTab === 'drafting-pro-speech'} 
                      onClick={() => onNavigate('drafting-pro-speech')} 
                      icon={<Mic size={16} />} 
                      label="Bài phát biểu" 
                      collapsed={isCollapsed}
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
                "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-200 group",
                (expandedSections['management'] || searchTerm) ? "bg-blue-50/50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                isCollapsed && "justify-center px-0"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "transition-all duration-200 shrink-0",
                  (expandedSections['management'] || searchTerm) ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                )}>
                  <LayoutDashboard size={18} />
                </div>
                {!isCollapsed && <span className="font-bold tracking-tight truncate">Quản trị & Điều hành</span>}
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
                  className="overflow-hidden mt-1 ml-4 border-l-2 border-slate-100 space-y-1"
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
                  {(!searchTerm || "giao văn bản".includes(searchTerm.toLowerCase())) && (
                    <NavButton 
                      active={currentTab === 'document-assignment'} 
                      onClick={() => onNavigate('document-assignment')} 
                      icon={<FileCheck size={16} />} 
                      label="Giao văn bản" 
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
                "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-200 group",
                (expandedSections['operations'] || searchTerm) ? "bg-emerald-50/50 text-emerald-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                isCollapsed && "justify-center px-0"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "transition-all duration-200 shrink-0",
                  (expandedSections['operations'] || searchTerm) ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"
                )}>
                  <Database size={18} />
                </div>
                {!isCollapsed && <span className="font-bold tracking-tight truncate">Nghiệp vụ & Dữ liệu</span>}
              </div>
              {!isCollapsed && (
                <div className={cn(
                  "transition-transform duration-300",
                  (expandedSections['operations'] || searchTerm) ? "rotate-180" : ""
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
                  className="overflow-hidden mt-1 ml-4 border-l-2 border-slate-100 space-y-1"
                >
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

      <div className={cn("p-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/30 flex flex-col gap-2", isCollapsed && "px-2")}>
        <div 
          onClick={() => {
            if (isCollapsed) {
              onOpenSettings();
            } else {
              setIsProfileExpanded(!isProfileExpanded);
            }
          }}
          className={cn(
            "w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-[hsl(var(--card))] hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group border border-transparent hover:border-[hsl(var(--border))] cursor-pointer",
            isCollapsed && "justify-center p-1"
          )}
        >
          <div className="relative shrink-0">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'User'} className="w-10 h-10 rounded-xl ring-2 ring-white dark:ring-slate-800 shadow-md object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-800 flex items-center justify-center text-white font-bold text-xs ring-2 ring-white dark:ring-slate-800 shadow-md">
                {user?.displayName?.split(' ').map(n => n[0]).join('') || user?.email?.substring(0, 2).toUpperCase() || 'U'}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <p className="text-sm font-extrabold text-[hsl(var(--foreground))] truncate group-hover:text-[hsl(var(--primary))] transition-colors">{user?.displayName || user?.email || 'Người dùng'}</p>
                {user?.email === 'nguyenhuy.thudaumot@gmail.com' && (
                  <span className="text-[8px] font-black bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">Admin</span>
                )}
              </div>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate font-semibold">Chánh Văn phòng Đảng uỷ</p>
            </div>
          )}
          {!isCollapsed && (
            <div className="flex items-center gap-1">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSettings();
                }}
                className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 rounded-lg transition-all"
                title="Cài đặt"
              >
                <Settings size={16} className="group-hover:rotate-90 transition-all duration-500" />
              </button>
              {isProfileExpanded ? <ChevronUp size={16} className="text-[hsl(var(--muted-foreground))]" /> : <ChevronDown size={16} className="text-[hsl(var(--muted-foreground))]" />}
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
              {unitInfo && !isCollapsed && (
                <div className="px-3 py-2.5 rounded-2xl bg-gradient-to-br from-emerald-50/50 to-teal-50/50 border border-emerald-100/40 shadow-sm mx-1">
                  <div className="flex items-center gap-1.5 text-emerald-700 mb-1.5">
                    <MapPin size={12} className="text-emerald-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Đơn vị công tác</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-700 leading-relaxed line-clamp-2" title={unitInfo.fullName}>
                    {unitInfo.fullName}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <NavButton 
                  active={currentTab === 'history'} 
                  onClick={() => onNavigate('history')} 
                  icon={<History size={16} />} 
                  label="Lịch sử hội thoại" 
                  collapsed={isCollapsed}
                />
                <NavButton 
                  active={currentTab === 'work-log'} 
                  onClick={() => onNavigate('work-log')} 
                  icon={<ClipboardList size={16} />} 
                  label="Nhật ký công việc" 
                  collapsed={isCollapsed}
                />
                <NavButton 
                  active={currentTab === 'access-history'} 
                  onClick={() => onNavigate('access-history')} 
                  icon={<Activity size={16} />} 
                  label="Lịch sử truy cập" 
                  collapsed={isCollapsed}
                />
                {isAdmin && (
                  <div className="space-y-1">
                    <NavButton 
                      active={currentTab === 'users'} 
                      onClick={() => onNavigate('users')} 
                      icon={<Users size={16} />} 
                      label="Quản lý Người dùng" 
                      collapsed={isCollapsed}
                    />
                    <NavButton 
                      active={currentTab === 'error-center'} 
                      onClick={() => onNavigate('error-center')} 
                      icon={<ShieldCheck size={16} className="text-emerald-600" />} 
                      label="Trung tâm Sửa lỗi" 
                      collapsed={isCollapsed}
                    />
                  </div>
                )}
                <NavButton 
                  active={currentTab === 'tracking'} 
                  onClick={() => onNavigate('tracking')} 
                  icon={<ListTodo size={16} />} 
                  label="Theo dõi tiến độ" 
                  collapsed={isCollapsed}
                />
              </div>

              <div className={cn("flex items-center gap-2 px-1", isCollapsed && "flex-col")}>
                <button 
                  onClick={onToggleTeamChat}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300 font-bold text-[10px] uppercase tracking-wider",
                    isCollapsed && "w-full",
                    isTeamChatOpen 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                      : "bg-white text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 border border-slate-200/60"
                  )}
                  title="Nhóm"
                >
                  <MessageCircle size={14} />
                  {!isCollapsed && <span>Nhóm</span>}
                </button>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300 font-bold text-[10px] uppercase tracking-wider relative",
                    isCollapsed && "w-full",
                    showNotifications 
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" 
                      : "bg-white text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/50 border border-slate-200/60"
                  )}
                  title="Thông báo"
                >
                  <Bell size={14} />
                  {!isCollapsed && <span>Thông báo</span>}
                  {notifications.some(n => !n.isRead) && (
                    <span className={cn(
                      "absolute bg-red-500 rounded-full ring-2 ring-white animate-pulse",
                      isCollapsed ? "top-2 right-2 w-1.5 h-1.5" : "top-2 right-2 w-2 h-2"
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

      {/* Footer area can be added here if needed */}
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';
