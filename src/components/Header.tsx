import React, { useState, useEffect, useMemo, memo } from 'react';
import { Menu, TrendingUp, Search, AlertTriangle, Brain, Bell, Cloud, CloudOff, Gift, MessageCircle, FileEdit, Mic, Database, Calendar, PenTool, FileText, CheckCircle, Users, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { OnlineUsers } from './OnlineUsers';
import { SPECIALIZED_TASKS, Notification, Birthday } from '../constants';
import { NotificationDropdown } from './NotificationDropdown';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  currentTab: string;
  onQuickTask: (prompt: string) => void;
  onNavigate: (tab: any) => void;
  onOpenCommandCenter?: () => void;
  isLearning: boolean;
  birthdays: Birthday[];
  memberCount: number;
  onlineCount: number;
  visitCount: number;
}

export const Header: React.FC<HeaderProps> = memo(({
  isSidebarOpen,
  setIsSidebarOpen,
  currentTab,
  onQuickTask,
  onNavigate,
  onOpenCommandCenter,
  isLearning,
  birthdays,
  memberCount,
  onlineCount,
  visitCount
}) => {
  const { unitInfo } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const birthdayToday = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}`;
    
    const todayBirthdays = birthdays.filter(b => b.date.startsWith(todayStr));
    if (todayBirthdays.length > 0) {
      return todayBirthdays.map(b => b.name).join(', ');
    }
    return null;
  }, [birthdays]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const { title, subtitle } = useMemo(() => {
    const titles: Record<string, string> = {
      dashboard: "Bảng điều khiển",
      knowledge: "Knowledge Core",
      tracking: "Theo dõi tiến độ",
      calendar: "Lịch công tác",
      tasks: "Quản lý nhiệm vụ",
      users: "Quản lý Người dùng",
      drafting: "Trợ lý soạn thảo",
      speech: "Viết bài phát biểu",
      utilities: "Tiện ích hệ thống",
      reporting: "Phân tích & Báo cáo"
    };

    const subtitles: Record<string, string> = {
      dashboard: "Tổng quan hoạt động & Chỉ số",
      knowledge: "Cơ sở dữ liệu tri thức & Quy định",
      tracking: "Quản lý nhiệm vụ & Kết luận",
      calendar: "Quản lý lịch công tác & sự kiện quan trọng",
      tasks: "Danh sách công việc cá nhân",
      users: "Quản lý tài khoản và phân quyền",
      drafting: "Hỗ trợ soạn thảo và kiểm tra văn bản",
      speech: "Hỗ trợ soạn thảo bài phát biểu cho lãnh đạo",
      utilities: "Công cụ hỗ trợ & Trợ lý chuyên sâu",
      reporting: "Phân tích dữ liệu và tạo báo cáo tự động"
    };

    return {
      title: titles[currentTab] || "Hội thoại thông minh",
      subtitle: subtitles[currentTab] || "Trợ lý ảo AI hỗ trợ công tác"
    };
  }, [currentTab]);

  return (
    <header className="h-20 bg-white/80 backdrop-blur-3xl border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-[50] sticky top-0 shadow-sm shadow-blue-500/5">
      <div className="flex items-center gap-6">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2.5 hover:bg-slate-100 rounded-2xl text-slate-500 md:hidden transition-all duration-300 active:scale-90"
        >
          <Menu size={24} />
        </button>
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-slate-900 tracking-tighter leading-none uppercase">{title}</h2>
            <div className="flex items-center gap-1">
              <div className="px-2 py-0.5 bg-blue-600 text-white text-[8px] font-black rounded-md uppercase tracking-tighter shadow-sm shadow-blue-500/20">v8.0.0</div>
              <div className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 text-[8px] font-black rounded-md uppercase tracking-tighter">Live System</div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50 animate-pulse"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="hidden md:flex items-center flex-1" />

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 bg-slate-50/50 px-4 py-2 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider" title="Thành viên">
            <Users size={14} className="text-blue-500" />
            <span className="text-slate-900">{memberCount}</span>
          </div>
          <div className="w-[1px] h-3 bg-slate-200" />
          <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider" title="Đang trực tuyến">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-slate-900">{onlineCount}</span>
          </div>
          <div className="w-[1px] h-3 bg-slate-200" />
          <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider" title="Lượt truy cập">
            <TrendingUp size={14} className="text-indigo-500" />
            <span className="text-slate-900">{visitCount}</span>
          </div>
        </div>

        {birthdayToday && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-rose-50 text-rose-600 border-rose-100 text-[10px] font-black uppercase tracking-wider"
          >
            <Gift size={14} />
            <span>Chúc mừng: {birthdayToday}</span>
          </motion.div>
        )}

        {isLearning && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-sm"
          >
            <Brain size={16} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-wider">AI Synapse v2.4</span>
          </motion.div>
        )}
        <div className="h-8 w-[1px] bg-slate-100" />
      </div>
    </header>
  );
});

Header.displayName = 'Header';
