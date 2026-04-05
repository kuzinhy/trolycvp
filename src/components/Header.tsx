import React, { useState, useEffect, useMemo, memo } from 'react';
import { Menu, TrendingUp, Search, AlertTriangle, Brain, Bell, Cloud, CloudOff, Gift, MessageCircle, FileEdit, Mic, Database, Calendar, PenTool, FileText, CheckCircle, Users, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { OnlineUsers } from './OnlineUsers';
import { SPECIALIZED_TASKS, Notification, Birthday } from '../constants';
import { NotificationDropdown } from './NotificationDropdown';
import { WeatherWidget } from './WeatherWidget';
import { EnglishLearningWidget } from './EnglishLearningWidget';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  currentTab: string;
  onQuickTask: (prompt: string) => void;
  onNavigate: (tab: any) => void;
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
    <header className="h-20 bg-white/70 backdrop-blur-2xl border-b border-slate-200/40 flex items-center justify-between px-8 shrink-0 z-[50] sticky top-0 shadow-sm">
      <div className="flex items-center gap-6">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2.5 hover:bg-slate-100 rounded-2xl text-slate-500 md:hidden transition-all duration-300 active:scale-90"
        >
          <Menu size={24} />
        </button>
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase">{title}</h2>
            <div className="flex items-center gap-1">
              <div className="px-2 py-0.5 bg-blue-600 text-white text-[8px] font-black rounded-md uppercase tracking-tighter shadow-sm">v5.0</div>
              <div className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black rounded-md uppercase tracking-tighter">Live</div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 active-glow shadow-sm shadow-emerald-500/50"></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-3">
        <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-2xl border border-slate-200/40">
          {SPECIALIZED_TASKS.map((task) => (
            <button
              key={task.id}
              onClick={() => onQuickTask(task.promptPrefix)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-600 hover:bg-white hover:text-emerald-700 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 text-[10px] font-black uppercase tracking-tighter group"
            >
              <div className="text-slate-400 group-hover:text-emerald-600 group-hover:scale-110 transition-all duration-300">
                {task.id === 'forecast' && <TrendingUp size={14} />}
                {task.id === 'search' && <Search size={14} />}
                {task.id === 'mistakes' && <AlertTriangle size={14} />}
              </div>
              <span>{task.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider" title="Tổng số thành viên">
            <Users size={14} className="text-blue-500" />
            <span>{memberCount}</span>
          </div>
          <OnlineUsers />
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider" title="Tổng số lượt truy cập">
            <TrendingUp size={14} />
            <span>{visitCount}</span>
          </div>
          <EnglishLearningWidget />
          <WeatherWidget />
        </div>

        {birthdayToday && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-rose-50 text-rose-600 border-rose-100 text-[10px] font-bold uppercase tracking-wider"
          >
            <Gift size={14} />
            <span>Hôm nay sinh nhật: {birthdayToday}</span>
          </motion.div>
        )}

        {isLearning && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100 shadow-sm"
          >
            <Brain size={16} className="animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider">AI Learning Active</span>
          </motion.div>
        )}
        <div className="h-8 w-[1px] bg-slate-200" />
      </div>
    </header>
  );
});

Header.displayName = 'Header';
