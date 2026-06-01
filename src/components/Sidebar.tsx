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
  FileSignature,
  BookOpen
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
  onOpenNotebookModal?: () => void;
}

const NavButton = memo(({ active, onClick, icon, label, collapsed, badge }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, collapsed?: boolean, badge?: string }) => (
  <button 
    onClick={onClick}
    title={collapsed ? label : ""}
    className={cn(
      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors duration-200 text-sm font-medium group relative",
      active 
        ? "bg-blue-50 text-blue-600" 
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
      collapsed && "justify-center px-0"
    )}
  >
    <div className="flex items-center gap-3 relative z-10">
      <div className={cn(
        "transition-colors duration-200 shrink-0",
        active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
      )}>
        {icon}
      </div>
      {!collapsed && <span className="truncate">{label}</span>}
    </div>
    
    {!collapsed && badge && (
      <span className={cn(
        "px-2 py-0.5 text-[10px] font-medium rounded-full",
        active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
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
  sidebarPosition = 'left',
  onOpenNotebookModal
}) => {
  const { isAdmin, unitInfo } = useAuth();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isProfileExpanded, setIsProfileExpanded] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    'ai-assistant': true,
    'drafting-pro': currentTab.startsWith('drafting-pro') || currentTab === 'invitation' || currentTab === 'email-assistant' || currentTab === 'review' || currentTab === 'meeting-hub',
    'management': currentTab === 'task-journal' || currentTab === 'assignment-tracking' || currentTab === 'evaluation',
    'operations': currentTab === 'party-advisory' || currentTab === 'forecasting' || currentTab === 'knowledge' || currentTab === 'strategic',
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
        "fixed inset-y-0 z-50 bg-white transition-all duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col",
        sidebarPosition === 'right' ? "right-0 border-l border-slate-200" : "left-0 border-r border-slate-200",
        isCollapsed ? "w-20" : "w-[280px]",
        !isSidebarOpen && (sidebarPosition === 'right' ? "translate-x-full" : "-translate-x-full") + " md:hidden"
      )}
    >
      {/* Collapse Toggle */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "absolute top-6 w-6 h-6 bg-white border border-slate-200 rounded-full hidden md:flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 z-10 transition-colors cursor-pointer",
          sidebarPosition === 'right' ? "-left-3" : "-right-3"
        )}
      >
        {isCollapsed ? (sidebarPosition === 'right' ? <ChevronLeft size={14} /> : <ChevronRight size={14} />) : (sidebarPosition === 'right' ? <ChevronRight size={14} /> : <ChevronLeft size={14} />)}
      </button>

      {/* Header Section */}
      <div className={cn("p-6 flex flex-col gap-4 shrink-0 border-b border-slate-100", isCollapsed && "items-center px-0 p-4")}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm text-white font-bold text-xl">
            <ShieldCheck size={24} />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="font-semibold text-slate-900 text-base truncate">Trợ lý Văn phòng</h1>
              <p className="text-xs text-slate-500">VP Đảng ủy</p>
            </div>
          )}
        </div>
      </div>

      {/* Search Section */}
      {!isCollapsed && (
        <div className="px-4 py-4">
          <div className="relative group">
            <Search className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 transition-colors",
              searchTerm ? "text-blue-500" : "text-slate-400 group-focus-within:text-blue-500"
            )} size={16} />
            <input
              type="text"
              placeholder="Tìm kiếm chức năng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center opacity-40 group-focus-within:opacity-100 transition-opacity">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs font-medium text-slate-500 shadow-sm">⌘K</kbd>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Section */}
      <div className="flex-1 overflow-y-auto px-4 space-y-1 custom-scrollbar py-2">
        <div className="mb-4">
          {!isCollapsed && <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-3">Công việc nổi bật</p>}
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
                label="Hội thoại AI" 
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
                "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors duration-200 group text-sm font-medium",
                (expandedSections['drafting-pro'] || currentTab.startsWith('drafting-pro') || currentTab === 'invitation' || currentTab === 'email-assistant' || currentTab === 'review' || currentTab === 'reporting' || currentTab === 'meeting-hub' || searchTerm) 
                  ? "bg-slate-50 text-slate-900" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                isCollapsed && "justify-center px-0"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "transition-colors duration-200 shrink-0",
                  (expandedSections['drafting-pro'] || currentTab.startsWith('drafting-pro') || currentTab === 'invitation' || currentTab === 'email-assistant' || currentTab === 'review' || currentTab === 'reporting' || currentTab === 'meeting-hub' || searchTerm) 
                    ? "text-slate-700" 
                    : "text-slate-400 group-hover:text-slate-600"
                )}>
                  <PenTool size={18} />
                </div>
                {!isCollapsed && <span className="truncate">Soạn thảo & Hội họp</span>}
              </div>
              {!isCollapsed && (
                <div className={cn(
                  "transition-transform duration-200",
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
                  className="overflow-hidden mt-1 ml-4 border-l border-slate-200 space-y-1 pl-2"
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
                  {(!searchTerm || "soạn thảo ai".includes(searchTerm.toLowerCase()) || "rà soát văn bản đảng".includes(searchTerm.toLowerCase())) && (
                    <NavButton 
                      active={currentTab === 'drafting-pro' || currentTab === 'drafting-pro-review'} 
                      onClick={() => onNavigate('drafting-pro')} 
                      icon={<PenTool size={16} />} 
                      label="Soạn thảo & Rà soát" 
                      collapsed={isCollapsed}
                    />
                  )}
                  {(!searchTerm || "trợ lý họp thông minh".includes(searchTerm.toLowerCase()) || "tạo kết luận".includes(searchTerm.toLowerCase())) && (
                    <NavButton 
                      active={currentTab === 'meeting-hub'} 
                      onClick={() => onNavigate('meeting-hub')} 
                      icon={<Mic size={16} />} 
                      label="Hội họp & Kết luận" 
                      collapsed={isCollapsed}
                      badge="Mới"
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Nhóm Chức năng chính */}
        {(!searchTerm || [
          "chức năng chính", "sổ tay nhiệm vụ", "theo dõi, đánh giá", "theo dõi phân công", "tham mưu & sinh hoạt", "dự báo chiến lược", "tra cứu thông tin"
        ].some(s => s.includes(searchTerm.toLowerCase()))) && (
          <div className="py-1">
            <button 
              onClick={() => toggleSection('management')}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors duration-200 group text-sm font-medium",
                (expandedSections['management'] || searchTerm) ? "bg-slate-50 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                isCollapsed && "justify-center px-0"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "transition-colors duration-200 shrink-0",
                  (expandedSections['management'] || searchTerm) ? "text-slate-700" : "text-slate-400 group-hover:text-slate-600"
                )}>
                  <LayoutDashboard size={18} />
                </div>
                {!isCollapsed && <span className="truncate">Chức năng chính</span>}
              </div>
              {!isCollapsed && (
                <div className={cn(
                  "transition-transform duration-200",
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
                  className="overflow-hidden mt-1 ml-4 border-l border-slate-200 space-y-1 pl-2"
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
                  {(!searchTerm || "dự báo chiến lược".includes(searchTerm.toLowerCase())) && (
                    <NavButton 
                      active={currentTab === 'forecasting'} 
                      onClick={() => onNavigate('forecasting')} 
                      icon={<TrendingUp size={16} />} 
                      label="Dự báo chiến lược" 
                      collapsed={isCollapsed}
                    />
                  )}
                  {(!searchTerm || "tra cứu thông tin".includes(searchTerm.toLowerCase())) && onOpenNotebookModal && (
                    <NavButton 
                      active={false} 
                      onClick={onOpenNotebookModal} 
                      icon={<Search size={16} />} 
                      label="Tra cứu thông tin" 
                      collapsed={isCollapsed}
                      badge="AI"
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

        {/* Nhóm Quản trị Hệ thống (Admin Only) */}
        {isAdmin && (!searchTerm || [
          "quản trị hệ thống", "quản lý quân số", "lịch sử truy cập", "cập nhật hệ thống", "knowledge core"
        ].some(s => s.includes(searchTerm.toLowerCase()))) && (
          <div className="py-1">
            <button 
              onClick={() => toggleSection('admin')}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors duration-200 group text-sm font-medium",
                (expandedSections['admin'] || searchTerm) ? "bg-slate-50 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                isCollapsed && "justify-center px-0"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "transition-colors duration-200 shrink-0",
                  (expandedSections['admin'] || searchTerm) ? "text-slate-700" : "text-slate-400 group-hover:text-slate-600"
                )}>
                  <ShieldCheck size={18} />
                </div>
                {!isCollapsed && <span className="truncate">Quản trị Hệ thống</span>}
              </div>
              {!isCollapsed && (
                <div className={cn(
                  "transition-transform duration-200",
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
                  className="overflow-hidden mt-1 ml-4 border-l border-slate-200 space-y-1 pl-2"
                >
                  {(!searchTerm || "knowledge core".includes(searchTerm.toLowerCase())) && (
                    <NavButton 
                      active={currentTab === 'knowledge'} 
                      onClick={() => onNavigate('knowledge')} 
                      icon={<Database size={16} />} 
                      label="Knowledge Core" 
                      collapsed={isCollapsed}
                    />
                  )}
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
            label="Lịch công tác liên thông" 
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
            "w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors duration-200 group cursor-pointer",
            isCollapsed && "justify-center p-1"
          )}
        >
          <div className="relative shrink-0">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'User'} className="w-10 h-10 rounded-full border border-slate-200 object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-semibold text-sm border border-blue-100">
                {user?.displayName?.split(' ').map(n => n[0]).join('') || user?.email?.substring(0, 2).toUpperCase() || 'U'}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.displayName || user?.email || 'Người dùng'}</p>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email || 'Administrator'}</p>
            </div>
          )}
          {!isCollapsed && (
            <div className="flex items-center gap-1">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSettings();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Cài đặt"
              >
                <Settings size={16} className="transition-transform group-hover:rotate-45" />
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
                  label="Lịch sử hệ thống" 
                  collapsed={isCollapsed}
                />
                <NavButton 
                  active={currentTab === 'dashboard'} 
                  onClick={() => onNavigate('dashboard')} 
                  icon={<LayoutDashboard size={16} />} 
                  label="Bảng điều khiển" 
                  collapsed={isCollapsed}
                />
                <NavButton 
                  active={currentTab === 'user-manual'} 
                  onClick={() => onNavigate('user-manual')} 
                  icon={<BookOpen size={16} />} 
                  label="Hướng dẫn sử dụng" 
                  collapsed={isCollapsed}
                />
              </div>

              <div className={cn("flex items-center gap-2 mt-1", isCollapsed && "flex-col")}>
                <button 
                  onClick={onToggleTeamChat}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors duration-200 text-sm font-medium",
                    isCollapsed && "w-full",
                    isTeamChatOpen 
                      ? "bg-slate-800 text-white" 
                      : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                  )}
                  title="Thảo luận nhóm"
                >
                  <MessageCircle size={16} />
                  {!isCollapsed && <span>Thảo luận</span>}
                </button>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors duration-200 text-sm font-medium relative",
                    isCollapsed && "w-full",
                    showNotifications 
                      ? "bg-slate-800 text-white" 
                      : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                  )}
                  title="Thông báo"
                >
                  <Bell size={16} />
                  {!isCollapsed && <span>Thông báo</span>}
                  {notifications.some(n => !n.isRead) && (
                    <span className={cn(
                      "absolute bg-rose-500 rounded-full border-2 border-white",
                      isCollapsed ? "top-1 right-1 w-2.5 h-2.5" : "top-1 right-2 w-3 h-3"
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
