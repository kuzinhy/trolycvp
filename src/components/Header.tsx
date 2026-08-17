import React, { useState, useEffect, useMemo, memo } from 'react';
import { 
  Menu, TrendingUp, Search, AlertTriangle, Brain, Bell, Cloud, CloudOff, Gift, 
  MessageCircle, FileEdit, Mic, Database, Calendar, PenTool, FileText, CheckCircle, 
  Users, Eye, Keyboard, HelpCircle, ShieldAlert, Award, ChevronDown, ShieldCheck, 
  Activity, UserCheck, LogOut, Settings, Shield, Lock, Fingerprint, FileCheck, 
  History, Wrench, Terminal, Sparkles, ChevronRight, SlidersHorizontal, User,
  Mail, MapPin, Briefcase, CheckCircle2
} from 'lucide-react';
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
  onOpenShortcuts?: () => void;
  onOpenSettings?: () => void;
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
  onOpenShortcuts,
  onOpenSettings,
  isLearning,
  birthdays,
  memberCount,
  onlineCount,
  visitCount
}) => {
  const { unitInfo, user, userInfo, isAdmin, isSuperAdmin, role, signOutUser } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isHubOpen, setIsHubOpen] = useState(false);
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
      knowledge: "Cơ sở tri thức",
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
      dashboard: "Tổng quan hoạt động & Chỉ số chỉ huy",
      knowledge: "Cơ sở dữ liệu tri thức chính trị & Quy định của Đảng",
      tracking: "Quản lý nhiệm vụ & Theo dõi sát sao kết luận chỉ đạo",
      calendar: "Điều phối lịch công tác và cuộc họp của Ban Thường vụ",
      tasks: "Danh mục nhiệm vụ và chỉ tiêu được giao",
      users: "Quản trị phân quyền tài khoản & Bảo mật thông tin",
      drafting: "Kiểm tra văn bản, tóm tắt và dự thảo nghị quyết tự động",
      speech: "Hỗ trợ chuẩn bị phát biểu và nghị luận chính trị cho Lãnh đạo",
      utilities: "Công cụ tham mưu nâng cao & Trung tâm kết nối tri thức",
      reporting: "Phân tích tự động, kết xuất báo cáo tổng hợp thông minh"
    };

    return {
      title: titles[currentTab] || "Hội thoại thông minh",
      subtitle: subtitles[currentTab] || "Trợ lý ảo AI tham mưu & quản trị"
    };
  }, [currentTab]);

  return (
    <header className="h-22 bg-white/70 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-4 md:px-8 shrink-0 z-[50] sticky top-0 shadow-sm transition-all duration-300">
      <div className="flex items-center gap-3 md:gap-6 min-w-0">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-slate-100/80 rounded-2xl text-slate-500 md:hidden transition-all duration-300 active:scale-90"
        >
          <Menu size={22} />
        </button>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
              <div className="p-1.5 bg-gradient-to-tr from-amber-500 to-rose-600 rounded-lg text-white shadow-md shadow-rose-500/10">
                <Award size={16} className="animate-pulse md:w-[18px] md:h-[18px]" />
              </div>
              <h2 className="text-xs sm:text-sm md:text-lg font-extrabold text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
                HỆ THỐNG <span className="text-rose-600 font-black">8.0</span> <span className="text-slate-300 font-normal">•</span> <span className="truncate">{title}</span>
              </h2>
            </div>
            <div className="hidden lg:flex items-center gap-1 shrink-0">
              <div className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 text-[8px] font-black rounded-full tracking-wider shadow-sm uppercase">VĂN PHÒNG ĐẢNG ỦY</div>
              <div className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 text-[8px] font-black rounded-full tracking-wider shadow-sm uppercase">KÊNH CHỈ HUY BẢO MẬT</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse shrink-0"></div>
            <p className="text-[10px] md:text-[11px] font-semibold text-slate-500 leading-none truncate max-w-[280px] sm:max-w-none">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6 shrink-0">
        {/* Dropdown Menu Cá nhân & Chỉ số Hệ thống */}
        <div className="relative">
          <button 
            onClick={() => setIsHubOpen(!isHubOpen)}
            className="flex items-center gap-2 md:gap-3 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all px-2.5 md:px-3.5 py-1.5 rounded-2xl shadow-sm cursor-pointer select-none"
          >
            {/* Avatar Cá nhân */}
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-xs shadow-md shadow-rose-600/20">
              {user?.displayName?.split(' ').map(n => n[0]).join('') || "H"}
            </div>
            
            {/* Tên & Trạng thái trực tuyến ghép vào */}
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-[11px] md:text-xs font-black text-slate-800 leading-tight">
                {isAdmin ? "Nguyễn Minh Huy" : (user?.displayName || "Đảng viên")}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="text-[9px] md:text-[10px] text-slate-500 font-bold leading-none">
                  Trực tuyến: {onlineCount}
                </span>
              </div>
            </div>

            <ChevronDown size={12} className={cn("text-slate-400 transition-transform duration-300 ml-0.5", isHubOpen && "rotate-180")} />
          </button>

          <AnimatePresence>
            {isHubOpen && (
              <>
                {/* Backdrop overlay cực nhẹ để click-out đóng menu */}
                <div 
                  className="fixed inset-0 z-40 cursor-default" 
                  onClick={() => setIsHubOpen(false)}
                />
                
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-3 w-[24rem] sm:w-[27rem] max-h-[85vh] overflow-y-auto custom-scrollbar bg-white rounded-3xl border border-slate-200 shadow-2xl shadow-slate-300/60 p-5 z-50"
                >
                  <div className="space-y-4">
                    {/* Header: THẺ HỒ SƠ DỮ LIỆU CÁ NHÂN */}
                    <div className="p-4 bg-gradient-to-br from-rose-50/80 via-white to-amber-50/50 rounded-2xl border border-rose-100/80 shadow-xs space-y-3">
                      <div className="flex items-start gap-3.5">
                        {user?.photoURL ? (
                          <img 
                            src={user.photoURL} 
                            alt="Avatar" 
                            className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-md shadow-rose-600/20 shrink-0" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 text-white flex items-center justify-center font-black text-base shadow-md shadow-rose-600/20 shrink-0">
                            {userInfo?.displayName?.split(' ').map(n => n[0]).join('') || user?.displayName?.split(' ').map(n => n[0]).join('') || "H"}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-sm font-black text-slate-900 leading-snug truncate">
                              {userInfo?.displayName || (isAdmin ? "Nguyễn Minh Huy" : (user?.displayName || "Đảng viên / Cán bộ"))}
                            </h4>
                            <span className={cn(
                              "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 border",
                              isAdmin 
                                ? "text-rose-700 bg-rose-50 border-rose-200/80" 
                                : "text-blue-700 bg-blue-50 border-blue-200/80"
                            )}>
                              {isSuperAdmin ? "Super Admin" : isAdmin ? "Admin" : "Cán bộ"}
                            </span>
                          </div>
                          
                          <p className="text-[11px] font-bold text-rose-700 mt-0.5 leading-tight">
                            {isAdmin ? "Chánh Văn phòng Đảng ủy" : (unitInfo?.organization || "Văn phòng Đảng ủy")}
                          </p>

                          <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-slate-500 font-medium truncate">
                            <Mail size={11} className="text-slate-400 shrink-0" />
                            <span className="truncate">{user?.email || "nguyenhuy.thudaumot@gmail.com"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Chi tiết dữ liệu định danh bổ trợ */}
                      <div className="pt-2 border-t border-rose-100/60 grid grid-cols-2 gap-2 text-[10px]">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <MapPin size={11} className="text-rose-500 shrink-0" />
                          <span className="truncate font-semibold">{unitInfo?.organization || "Đảng ủy Phường"}</span>
                        </div>
                        <div className="flex items-center justify-end gap-1 text-emerald-600 font-bold">
                          <CheckCircle2 size={11} className="shrink-0" />
                          <span className="truncate">Đã xác thực</span>
                        </div>
                      </div>
                    </div>

                    {/* Chỉ số Thống kê trực tuyến */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100">
                      <div className="flex flex-col items-center justify-center p-2 text-center bg-white rounded-xl border border-slate-200/50 shadow-2xs">
                        <Users size={14} className="text-blue-600 mb-1" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight leading-none mb-1">Thành viên</span>
                        <span className="text-xs sm:text-sm font-black text-slate-900 font-mono">{memberCount}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 text-center bg-white rounded-xl border border-slate-200/50 shadow-2xs">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mb-1.5" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight leading-none mb-1">Đang trực</span>
                        <span className="text-xs sm:text-sm font-black text-emerald-600 font-mono">{onlineCount}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 text-center bg-white rounded-xl border border-slate-200/50 shadow-2xs">
                        <TrendingUp size={14} className="text-indigo-600 mb-1" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight leading-none mb-1">Lượt truy</span>
                        <span className="text-xs sm:text-sm font-black text-slate-900 font-mono">{visitCount}</span>
                      </div>
                    </div>

                    {/* TÁC NGHIỆP CÁ NHÂN & SỔ TAY CÔNG TÁC */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between px-1 mb-1">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                          Dữ liệu & Tác nghiệp Cá nhân
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => {
                            setIsHubOpen(false);
                            onNavigate('task-journal');
                          }}
                          className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100/90 border border-slate-200/70 rounded-xl text-left transition-all cursor-pointer group"
                        >
                          <div className="p-1.5 bg-white group-hover:bg-rose-50 text-slate-600 group-hover:text-rose-600 rounded-lg border border-slate-200/50 transition-colors shrink-0">
                            <FileText size={13} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">Nhật ký công tác</p>
                            <p className="text-[9px] text-slate-400 font-medium truncate">Sổ tay cá nhân</p>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            setIsHubOpen(false);
                            onNavigate('assignment-tracking');
                          }}
                          className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100/90 border border-slate-200/70 rounded-xl text-left transition-all cursor-pointer group"
                        >
                          <div className="p-1.5 bg-white group-hover:bg-blue-50 text-slate-600 group-hover:text-blue-600 rounded-lg border border-slate-200/50 transition-colors shrink-0">
                            <CheckCircle size={13} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">Nhiệm vụ của tôi</p>
                            <p className="text-[9px] text-slate-400 font-medium truncate">Theo dõi tiến độ</p>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* KHỐI QUẢN TRỊ HỆ THỐNG (ADMIN COMMAND & CONTROL) */}
                    {isAdmin && (
                      <div className="border-t border-slate-100 pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <div className="p-1 rounded-lg bg-rose-100 text-rose-700">
                              <ShieldCheck size={13} />
                            </div>
                            <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                              Quản trị Hệ thống
                            </span>
                          </div>
                          <span className="text-[9px] font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-tight">
                            Phân quyền Admin
                          </span>
                        </div>

                        <div className="space-y-1">
                          {/* Quản lý quân số & Phân quyền */}
                          <button 
                            onClick={() => {
                              setIsHubOpen(false);
                              onNavigate('users');
                            }}
                            className="w-full group flex items-center justify-between p-2.5 hover:bg-rose-50/70 active:bg-rose-100/70 border border-transparent hover:border-rose-100 rounded-2xl transition-all text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                                <Users size={15} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 group-hover:text-rose-900 leading-tight">
                                  Quản lý quân số & Phân quyền
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                  Danh sách cán bộ, cấp quyền & vai trò
                                </p>
                              </div>
                            </div>
                            <ChevronRight size={13} className="text-slate-300 group-hover:text-rose-600 transition-transform group-hover:translate-x-0.5 shrink-0 ml-2" />
                          </button>

                          {/* An toàn & Giám sát An ninh */}
                          <button 
                            onClick={() => {
                              setIsHubOpen(false);
                              onNavigate('security-monitor');
                            }}
                            className="w-full group flex items-center justify-between p-2.5 hover:bg-amber-50/70 active:bg-amber-100/70 border border-transparent hover:border-amber-100 rounded-2xl transition-all text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                                <ShieldAlert size={15} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 group-hover:text-amber-900 leading-tight">
                                  An toàn & Giám sát An ninh
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                  Kiểm soát an toàn thông tin & phòng thủ
                                </p>
                              </div>
                            </div>
                            <ChevronRight size={13} className="text-slate-300 group-hover:text-amber-600 transition-transform group-hover:translate-x-0.5 shrink-0 ml-2" />
                          </button>

                          {/* Nhật ký truy cập hệ thống */}
                          <button 
                            onClick={() => {
                              setIsHubOpen(false);
                              onNavigate('access-history');
                            }}
                            className="w-full group flex items-center justify-between p-2.5 hover:bg-blue-50/70 active:bg-blue-100/70 border border-transparent hover:border-blue-100 rounded-2xl transition-all text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                                <History size={15} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 group-hover:text-blue-900 leading-tight">
                                  Lịch sử truy cập & Audit Log
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                  Lưu vết đăng nhập, thiết bị & địa chỉ IP
                                </p>
                              </div>
                            </div>
                            <ChevronRight size={13} className="text-slate-300 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5 shrink-0 ml-2" />
                          </button>

                          {/* Knowledge Core */}
                          <button 
                            onClick={() => {
                              setIsHubOpen(false);
                              onNavigate('knowledge');
                            }}
                            className="w-full group flex items-center justify-between p-2.5 hover:bg-emerald-50/70 active:bg-emerald-100/70 border border-transparent hover:border-emerald-100 rounded-2xl transition-all text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                                <Database size={15} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-900 leading-tight">
                                  Knowledge Core (Tri thức Lõi)
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                  Cơ sở tri thức chỉ đạo & văn kiện Đảng
                                </p>
                              </div>
                            </div>
                            <ChevronRight size={13} className="text-slate-300 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5 shrink-0 ml-2" />
                          </button>

                          {/* Cập nhật hệ thống */}
                          <button 
                            onClick={() => {
                              setIsHubOpen(false);
                              onNavigate('system-updates');
                            }}
                            className="w-full group flex items-center justify-between p-2.5 hover:bg-purple-50/70 active:bg-purple-100/70 border border-transparent hover:border-purple-100 rounded-2xl transition-all text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                                <Wrench size={15} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 group-hover:text-purple-900 leading-tight">
                                  Cập nhật & Nâng cấp Hệ thống
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                  Phiên bản 8.0, nhật ký cập nhật tính năng
                                </p>
                              </div>
                            </div>
                            <ChevronRight size={13} className="text-slate-300 group-hover:text-purple-600 transition-transform group-hover:translate-x-0.5 shrink-0 ml-2" />
                          </button>

                          {/* Command Center & Phím tắt */}
                          <div className="grid grid-cols-2 gap-1.5 pt-1">
                            {onOpenCommandCenter && (
                              <button 
                                onClick={() => {
                                  setIsHubOpen(false);
                                  onOpenCommandCenter();
                                }}
                                className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/70 rounded-xl text-left transition-all cursor-pointer"
                              >
                                <Terminal size={14} className="text-slate-700 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold text-slate-800 truncate">Lệnh tác chiến</p>
                                  <p className="text-[9px] text-slate-400 font-mono">Ctrl + K</p>
                                </div>
                              </button>
                            )}

                            {onOpenShortcuts && (
                              <button 
                                onClick={() => {
                                  setIsHubOpen(false);
                                  onOpenShortcuts();
                                }}
                                className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/70 rounded-xl text-left transition-all cursor-pointer"
                              >
                                <Keyboard size={14} className="text-slate-700 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold text-slate-800 truncate">Sơ đồ phím tắt</p>
                                  <p className="text-[9px] text-slate-400 font-mono">Phím tắt nhanh</p>
                                </div>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Chỉ số Kỹ thuật & Bảo mật hệ thống */}
                    <div className="bg-slate-50 border border-slate-200/50 p-3 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-semibold">Bảo mật kênh truyền</span>
                        <span className="font-extrabold text-blue-700 bg-blue-50 border border-blue-100/50 px-2 py-0.5 rounded-lg text-[9px] uppercase font-mono">ENCRYPTED</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-semibold">Kết nối AI chỉ huy</span>
                        <span className="font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 rounded-lg text-[9px] uppercase font-mono">SẴN SÀNG</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-semibold">Độ trễ liên kết (Latency)</span>
                        <span className="font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-lg text-[9px] uppercase font-mono">14ms</span>
                      </div>
                    </div>

                    {/* Chứng chỉ & An toàn Thông tin chính thống */}
                    <div className="border-t border-slate-100 pt-3">
                      <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Shield size={12} className="text-rose-600" />
                        <span>Chứng nhận an ninh & AI cấp ủy</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 p-2 bg-emerald-50/40 border border-emerald-100/30 rounded-xl">
                          <Lock size={13} className="text-emerald-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-slate-800 leading-tight">ISO/IEC 27001</p>
                            <p className="text-[8px] text-slate-400 font-bold leading-none mt-0.5">An toàn thông tin</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-blue-50/40 border border-blue-100/30 rounded-xl">
                          <Fingerprint size={13} className="text-blue-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-slate-800 leading-tight">Mật mã AES-256</p>
                            <p className="text-[8px] text-slate-400 font-bold leading-none mt-0.5">Ban Cơ yếu CP</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Thiết lập & Đăng xuất */}
                    <div className="space-y-1 pt-1.5 border-t border-slate-100/80">
                      {onOpenSettings && (
                        <button 
                          onClick={() => {
                            setIsHubOpen(false);
                            onOpenSettings();
                          }}
                          className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-xl transition-all text-xs font-semibold text-left cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5">
                            <User size={14} className="text-slate-400 group-hover:text-rose-600 transition-colors" />
                            <span>Hồ sơ cán bộ & Cài đặt</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium group-hover:text-slate-600">Chi tiết & Thiết lập</span>
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setIsHubOpen(false);
                          signOutUser();
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-rose-50 text-rose-600 hover:text-rose-700 rounded-xl transition-all text-xs font-bold text-left cursor-pointer"
                      >
                        <LogOut size={14} />
                        <span>Đăng xuất an toàn</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
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
      </div>
    </header>
  );
});

Header.displayName = 'Header';
