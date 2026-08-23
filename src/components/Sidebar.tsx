import React, { memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Database, 
  ListTodo, 
  CalendarDays, 
  MessageCircle,
  Bell,
  ChevronLeft,
  ChevronRight,
  BrainCircuit,
  BarChart3,
  FolderKanban,
  Kanban,
  GitBranch,
  Users,
  Sliders,
  Layers,
  Network
} from 'lucide-react';
import { cn } from '../lib/utils';
import { NotificationDropdown } from './NotificationDropdown';
import { User } from 'firebase/auth';
import { Notification } from '../constants';

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
  onOpenShortcuts?: () => void;
  onOpenCommandCenter?: () => void;
}

const NavButton = memo(({ active, onClick, icon, label, collapsed, badge }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, collapsed?: boolean, badge?: string }) => (
  <button 
    type="button"
    onClick={onClick}
    title={collapsed ? label : ""}
    className={cn(
      "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-sm font-semibold group relative select-none cursor-pointer active:scale-[0.99]",
      active 
        ? "bg-rose-50 text-rose-800 font-bold border-l-4 border-rose-600 shadow-none" 
        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 border-l-4 border-transparent",
      collapsed && "justify-center px-0 border-l-0"
    )}
  >
    <div className="flex items-center gap-3 relative z-10 min-w-0">
      <div className={cn(
        "transition-colors duration-150 shrink-0",
        active ? "text-rose-600" : "text-slate-400 group-hover:text-slate-700"
      )}>
        {icon}
      </div>
      {!collapsed && <span className="truncate tracking-tight">{label}</span>}
    </div>
    
    {!collapsed && badge && (
      <span className={cn(
        "px-2 py-0.5 text-[10px] font-bold rounded-full transition-colors shrink-0",
        active ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"
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
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  return (
    <>
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-[2px] z-40 md:hidden cursor-pointer"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

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
      <div className={cn("p-6 flex flex-col gap-4 shrink-0 border-b border-slate-200/60 bg-slate-50/50", isCollapsed && "items-center px-0 p-4")}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-md border border-slate-200 bg-white transition-transform hover:scale-105 duration-300">
            <img 
              src="https://i.imgur.com/S9tvwYs.png" 
              alt="Logo" 
              className="w-full h-full object-contain p-1"
              referrerPolicy="no-referrer"
            />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="font-extrabold text-slate-900 text-sm tracking-tight leading-none uppercase">VĂN PHÒNG ĐẢNG ỦY</h1>
              <p className="text-[10px] text-slate-400 font-extrabold tracking-wider mt-1 uppercase">Hệ thống Chỉ huy 8.0</p>
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
      <div className="flex-1 overflow-y-auto px-4 space-y-4 custom-scrollbar py-2">
        {/* Group 1: Hệ thống Điều hành */}
        <div>
          {!isCollapsed && <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-3">Điều hành Chiến lược</p>}
          <div className="space-y-0.5">
            {(!searchTerm || "dashboard".includes(searchTerm.toLowerCase()) || "tổng quan".includes(searchTerm.toLowerCase())) && (
              <NavButton 
                active={currentTab === 'dashboard'} 
                onClick={() => onNavigate('dashboard')} 
                icon={<BarChart3 size={16} className="text-rose-600" />} 
                label="Tổng quan (Dashboard)" 
                collapsed={isCollapsed}
              />
            )}
            {(!searchTerm || "dự án".includes(searchTerm.toLowerCase()) || "hồ sơ".includes(searchTerm.toLowerCase())) && (
              <NavButton 
                active={currentTab === 'projects'} 
                onClick={() => onNavigate('projects')} 
                icon={<FolderKanban size={16} className="text-blue-600" />} 
                label="Dự án & Hồ sơ" 
                collapsed={isCollapsed}
              />
            )}
            {(!searchTerm || "nhiệm vụ".includes(searchTerm.toLowerCase())) && (
              <NavButton 
                active={currentTab === 'todo-assistant'} 
                onClick={() => onNavigate('todo-assistant')} 
                icon={<ListTodo size={16} />} 
                label="Quản lý Nhiệm vụ" 
                collapsed={isCollapsed}
              />
            )}
            {(!searchTerm || "gantt".includes(searchTerm.toLowerCase()) || "sơ đồ".includes(searchTerm.toLowerCase())) && (
              <NavButton 
                active={currentTab === 'gantt'} 
                onClick={() => onNavigate('gantt')} 
                icon={<Kanban size={16} className="text-purple-600" />} 
                label="Sơ đồ Gantt Timeline" 
                collapsed={isCollapsed}
              />
            )}
            {(!searchTerm || "lịch công tác".includes(searchTerm.toLowerCase())) && (
              <NavButton 
                active={currentTab === 'work-schedule'} 
                onClick={() => onNavigate('work-schedule')} 
                icon={<CalendarDays size={16} />} 
                label="Lịch công tác" 
                collapsed={isCollapsed}
              />
            )}
          </div>
        </div>

        {/* Group 2: Quy trình Làm việc */}
        <div>
          {!isCollapsed && <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-3">Quy trình & Nghiệp vụ</p>}
          <div className="space-y-0.5">
            {(!searchTerm || "quy trình".includes(searchTerm.toLowerCase())) && (
              <NavButton 
                active={currentTab === 'workflows'} 
                onClick={() => onNavigate('workflows')} 
                icon={<GitBranch size={16} className="text-amber-600" />} 
                label="Quy trình Làm việc" 
                collapsed={isCollapsed}
              />
            )}
          </div>
        </div>

        {/* Group 3: Bộ não AI & Tri thức */}
        <div>
          {!isCollapsed && <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-3">Bộ não AI & Tri thức</p>}
          <div className="space-y-0.5">
            {(!searchTerm || "trợ lý ai".includes(searchTerm.toLowerCase()) || "chat".includes(searchTerm.toLowerCase())) && (
              <NavButton 
                active={currentTab === 'chat'} 
                onClick={() => onNavigate('chat')} 
                icon={<BrainCircuit size={16} className="text-blue-600" />} 
                label="Trợ lý AI (Chat)" 
                collapsed={isCollapsed}
              />
            )}
            {(!searchTerm || "tri thức".includes(searchTerm.toLowerCase()) || "mnn".includes(searchTerm.toLowerCase())) && (
              <NavButton 
                active={currentTab === 'knowledge' || currentTab === 'mnn-knowledge'} 
                onClick={() => onNavigate('knowledge')} 
                icon={<Network size={16} className="text-indigo-600" />} 
                label="Kho Tri Thức MNN" 
                collapsed={isCollapsed}
              />
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Footer: Thảo luận & Thông báo trực tiếp */}
      <div className={cn("p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-2", isCollapsed && "px-2")}>
        <div className={cn("flex items-center gap-2", isCollapsed && "flex-col")}>
          <button 
            onClick={onToggleTeamChat}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-200 text-xs font-bold cursor-pointer",
              isCollapsed && "w-full",
              isTeamChatOpen 
                ? "bg-rose-600 text-white shadow-md shadow-rose-600/10" 
                : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
            )}
            title="Thảo luận nhóm"
          >
            <MessageCircle size={15} />
            {!isCollapsed && <span>Thảo luận</span>}
          </button>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-200 text-xs font-bold relative cursor-pointer",
              isCollapsed && "w-full",
              showNotifications 
                ? "bg-rose-600 text-white shadow-md shadow-rose-600/10" 
                : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
            )}
            title="Thông báo"
          >
            <Bell size={15} />
            {!isCollapsed && <span>Thông báo</span>}
            {notifications.some(n => !n.isRead) && (
              <span className={cn(
                "absolute bg-rose-500 rounded-full border-2 border-white",
                isCollapsed ? "top-1 right-1 w-2.5 h-2.5" : "top-1 right-2 w-3 h-3"
              )} />
            )}
          </button>
        </div>
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
  </>
  );
});

Sidebar.displayName = 'Sidebar';
