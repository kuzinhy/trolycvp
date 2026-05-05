import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Layout, 
  MessageSquare, 
  Search, 
  Sparkles, 
  TrendingUp, 
  Users,
  Zap,
  Bell,
  BellOff,
  ChevronRight,
  Plus,
  StickyNote,
  Terminal,
  FileSignature,
  Cpu,
  Shield,
  Briefcase
} from 'lucide-react';
import { cn } from '../lib/utils';
import { notificationService } from '../services/notificationService';
import { OnlineStatsModule } from './OnlineStatsModule';

interface WidgetCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  glow?: boolean;
}

const WidgetCard = ({ title, icon, children, className, action }: WidgetCardProps) => (
  <motion.div 
    whileHover={{ y: -2 }}
    className={cn(
      "bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col gap-5",
      className
    )}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-100">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      {action}
    </div>
    <div className="flex-1 overflow-y-auto no-scrollbar">
      {children}
    </div>
  </motion.div>
);

export function EliteDashboardHome({ navigateTo, tasks, meetings, onlineCount, memberCount }: any) {
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);

  useEffect(() => {
    const checkPushStatus = async () => {
      const subscribed = await notificationService.isSubscribed();
      setIsPushEnabled(subscribed);
    };
    checkPushStatus();
  }, []);

  const handleTogglePush = async () => {
    setIsPushLoading(true);
    try {
      const permission = await notificationService.requestPermission();
      if (permission === 'granted') {
        const success = await notificationService.subscribeUser();
        setIsPushEnabled(!!success);
        if (success) {
          notificationService.sendTestNotification(
            "Hệ thống Chỉ huy Elite", 
            "Đã kích hoạt thông báo đẩy thành công. Cảnh báo chiến lược sẽ được gửi tới đồng chí tại đây."
          );
        }
      } else {
        alert("Đồng chí cần cấp quyền thông báo trên trình duyệt để nhận cảnh báo này.");
      }
    } catch (error) {
      console.error("Push toggle error:", error);
    } finally {
      setIsPushLoading(false);
    }
  };

  const stats = [
    { label: 'Tiến độ tham mưu', value: '84%', icon: <Zap size={20} />, color: 'text-indigo-600', barColor: 'bg-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Nhiệm vụ hoàn tất', value: '12/15', icon: <CheckCircle2 size={20} />, color: 'text-emerald-600', barColor: 'bg-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Nhân sự trực tuyến', value: onlineCount || '3/12', icon: <Users size={20} />, color: 'text-blue-600', barColor: 'bg-blue-600', bg: 'bg-blue-50' },
    { label: 'Cuộc họp hôm nay', value: meetings?.length || '0', icon: <Calendar size={20} />, color: 'text-rose-600', barColor: 'bg-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-hidden bg-slate-50/50">
      {/* STATUS BAR - TOP RAIL */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-slate-600">Hệ thống: Online</span>
          </div>
          <div className="h-4 w-[1px] bg-slate-200" />
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-blue-500" />
            <span className="text-xs font-medium text-slate-600">Hiệu năng: Tốt</span>
          </div>
          <div className="h-4 w-[1px] bg-slate-200" />
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleTogglePush}
            disabled={isPushLoading}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-medium",
              isPushEnabled 
                ? "bg-blue-50 border-blue-200 text-blue-700" 
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            {isPushLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isPushEnabled ? (
              <Bell size={14} className="animate-pulse" />
            ) : (
              <BellOff size={14} />
            )}
            <span>
              {isPushEnabled ? "Cảnh báo: Bật" : "Cảnh báo: Tắt"}
            </span>
          </motion.button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                U{i}
              </div>
            ))}
          </div>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            className="p-2.5 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors bg-white border border-slate-200 shadow-sm"
          >
            <Bell size={18} />
          </motion.button>
        </div>
      </div>

      {/* QUICK STATS RAIL */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-4 group"
          >
            <div className="flex items-center justify-between">
              <div className={cn("p-3 rounded-2xl", stat.bg, stat.color)}>
                {stat.icon}
              </div>
              <h4 className="text-2xl font-bold text-slate-900">{stat.value}</h4>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }} 
                  animate={{ width: parseInt(stat.value) ? stat.value : '40%' }} 
                  className={cn("h-full rounded-full", stat.barColor)} 
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <OnlineStatsModule />

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-0">
        {/* LEFT COLUMN - COMMAND FEED (xl:col-span-8) */}
        <div className="xl:col-span-8 flex flex-col gap-6 min-h-0 overflow-y-auto no-scrollbar pb-6">
          {/* AI Mission Control */}
          <div className="bg-white p-8 md:p-10 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between relative overflow-hidden group min-h-[240px] shrink-0">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-50 to-blue-50/50 rounded-full blur-3xl -mr-64 -mt-64 transition-all duration-700" />
            <div className="relative space-y-6 z-10 w-full md:w-auto">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-sm">
                  COMMAND OS v6.0
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg border border-blue-100">
                  <Cpu size={14} className="animate-spin-slow" />
                  AI ACTIVE
                </div>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Trung tâm <span className="text-indigo-600 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600">Chỉ huy Chiến lược</span>
              </h2>
              <p className="text-slate-600 text-base max-w-[500px] leading-relaxed">
                Chào đồng chí <span className="font-semibold text-indigo-700">Chánh Văn phòng</span>. Hệ thống đã đồng bộ hóa dữ liệu mới nhất. Có <span className="font-semibold text-rose-600">3 sự kiện</span> quan trọng và <span className="font-semibold text-blue-600">1 dự thảo</span> cần đồng chí phê duyệt tham mưu.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button 
                  onClick={() => navigateTo('chat')}
                  className="flex items-center px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl shadow-sm hover:bg-indigo-700 transition-colors"
                >
                  <Sparkles size={16} className="mr-2" /> Trò chuyện tham mưu
                </button>
                <button 
                  onClick={() => navigateTo('drafting-pro')}
                  className="flex items-center px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <Terminal size={16} className="mr-2" /> Soạn thảo Nghị quyết
                </button>
                <button 
                  onClick={() => navigateTo('conclusion-creator')}
                  className="flex items-center px-5 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium rounded-xl hover:bg-emerald-100 transition-colors"
                >
                  <FileSignature size={16} className="mr-2" /> Kết luận họp nhanh
                </button>
              </div>
            </div>
            <div className="hidden lg:flex relative right-8">
              <div className="p-8 bg-white rounded-full border border-slate-100 shadow-2xl relative z-10 w-32 h-32 flex items-center justify-center">
                <Shield size={64} className="text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
            {/* Upcoming Tasks Widget */}
            <WidgetCard 
              title="Nhiệm vụ trọng tâm" 
              icon={<Layers size={18} />}
              action={<button onClick={() => navigateTo('tasks')} className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><ChevronRight size={18} /></button>}
            >
              <div className="space-y-3">
                {tasks?.slice(0, 5).map((task: any, i: number) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={task.id ? 'elite-task-' + task.id : 'elite-task-idx-' + i} 
                    className="flex items-center gap-4 p-3.5 bg-white rounded-2xl border border-slate-100 hover:border-slate-300 transition-all cursor-pointer group shadow-sm hover:shadow-md"
                  >
                    <div className={cn(
                      "w-1.5 h-10 rounded-full",
                      task.priority === 'High' ? 'bg-rose-500' : 'bg-indigo-500'
                    )} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{task.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{task.status}</span>
                        <div className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{task.type}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {(!tasks || tasks.length === 0) && (
                  <div className="py-12 text-center text-slate-400 text-sm font-medium">Chưa có nhiệm vụ nào</div>
                )}
              </div>
            </WidgetCard>

            {/* Meetings Widget */}
            <WidgetCard 
              title="Lịch họp Đảng ủy" 
              icon={<Calendar size={18} />}
              action={<button onClick={() => navigateTo('dashboard')} className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Plus size={18} /></button>}
            >
              <div className="space-y-4">
                {meetings?.slice(0, 5).map((meeting: any, i: number) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    key={meeting.id ? 'elite-meeting-' + meeting.id : 'elite-meeting-idx-' + i} 
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2 text-rose-600 bg-rose-50 px-2 py-1 rounded-md text-xs font-semibold">
                        <Clock size={12} />
                        <span>SẮP DIỄN RA</span>
                      </div>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-1 leading-snug group-hover:text-rose-600 transition-colors">{meeting.title}</h4>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-2">
                      <span className="inline-block w-2 l h-2 rounded-full border-2 border-slate-300" /> 
                      {meeting.location || 'Hội trường A'} • {meeting.time || '14:00'}
                    </p>
                  </motion.div>
                ))}
                {(!meetings || meetings.length === 0) && (
                  <div className="py-12 text-center text-slate-400 text-sm font-medium">Không có cuộc họp sắp tới</div>
                )}
              </div>
            </WidgetCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
            <WidgetCard 
              title="Tham mưu AI (Smart Insight)" 
              icon={<Sparkles size={18} />}
              className="bg-indigo-50 border-indigo-100/50 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 blur-2xl rounded-full" />
              <div className="space-y-4 relative z-10">
                <div className="p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-white shadow-sm text-sm text-slate-700 leading-relaxed font-medium">
                  "Dựa trên dữ liệu 24h qua, tôi nhận thấy có sự gia tăng các thảo luận về <span className="text-indigo-600 font-bold bg-indigo-100 px-1 rounded">cải cách hành chính</span>. Đồng chí nên xem xét dự thảo nghị quyết số 12 để đảm bảo tiến độ tham mưu."
                </div>
                <div className="flex items-center justify-between px-2">
                   <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Độ tin cậy AI: 96%</span>
                   <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">Chi tiết phân tích &rarr;</button>
                </div>
              </div>
            </WidgetCard>

            <WidgetCard 
              title="Cảnh báo sớm (Early Warning)" 
              icon={<Shield size={18} />}
              className="border-rose-100 bg-rose-50"
            >
              <div className="space-y-3">
                {[
                  { msg: 'Phát hiện 02 tin bài tiêu cực về cơ quan', level: 'Critical' },
                  { msg: 'Nhiệm vụ soạn thảo QĐ-24 quá hạn 2h', level: 'Warning' }
                ].map((w, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-rose-100 shadow-sm">
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full flex-shrink-0",
                      w.level === 'Critical' ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)] animate-pulse" : "bg-amber-500"
                    )} />
                    <span className="text-sm font-medium text-slate-700 leading-snug">{w.msg}</span>
                  </div>
                ))}
              </div>
            </WidgetCard>
          </div>
        </div>

        {/* RIGHT COLUMN - ANALYTICS & QUICK NOTES (xl:col-span-4) */}
        <div className="xl:col-span-4 flex flex-col gap-6 min-h-0 pb-6">
          {/* Health/Stats Widget */}
          <WidgetCard title="Chỉ số vận hành hệ thống" icon={<Activity size={18} />} className="flex-1">
            <div className="space-y-8 mt-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-600 uppercase tracking-wider">Tải tham mưu AI</span>
                  <span className="text-indigo-600">62%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '62%' }} className="h-full bg-indigo-500" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-600 uppercase tracking-wider">Đồng bộ tri thức</span>
                  <span className="text-blue-500">94%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '94%' }} className="h-full bg-blue-500" />
                </div>
              </div>

              <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl space-y-5">
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 border-b border-slate-200 pb-3">Tham mưu tích cực</h5>
                {[
                  { name: 'Admin Huy', val: 92, color: 'bg-indigo-500' },
                  { name: 'Phòng Chính trị', val: 78, color: 'bg-blue-500' },
                  { name: 'Văn phòng', val: 85, color: 'bg-emerald-500' },
                ].map((p, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-xs font-bold text-slate-700">
                      {p.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2">
                        <span>{p.name}</span>
                        <span>{p.val}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full">
                        <div className={cn("h-full rounded-full", p.color)} style={{ width: p.val + '%' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </WidgetCard>

          {/* Quick Notes Widget */}
          <WidgetCard 
            title="Ghi chú chiến lược" 
            icon={<StickyNote size={18} />}
            action={<button className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Plus size={18} /></button>}
          >
            <div className="grid grid-cols-1 gap-4">
              {[
                { title: 'Công tác phát triển Đảng 2026', date: 'Vừa xong', tag: 'Chính trị' },
                { title: 'Tối ưu quy trình văn phòng', date: '1 giờ trước', tag: 'Vận hành' },
                { title: 'Chuẩn bị nội dung giao ban', date: 'Hôm qua', tag: 'Tham mưu' },
              ].map((note, i) => (
                <motion.div 
                  whileHover={{ x: 4 }}
                  key={i} 
                  className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md uppercase tracking-wider group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">{note.tag}</span>
                    <span className="text-[10px] font-medium text-slate-400 uppercase">{note.date}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors">{note.title}</h4>
                </motion.div>
              ))}
            </div>
          </WidgetCard>
        </div>
      </div>

      {/* FOOTER ACTION RAIL / TERMINAL */}
      <div className="flex items-center justify-between px-8 py-5 bg-white border border-slate-200 rounded-2xl shadow-sm shrink-0">
        <div className="flex items-center gap-4 text-sm font-medium text-slate-600 whitespace-nowrap overflow-hidden">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="animate-typing">Hệ thống đang sẵn sàng phục vụ chỉ huy điều hành...</span>
        </div>
        <div className="flex items-center gap-6">
          <button className="text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-900 transition-colors">Trợ giúp</button>
          <div className="h-4 w-[1px] bg-slate-200" />
          <button className="text-xs font-semibold text-indigo-600 uppercase tracking-wider hover:text-indigo-800 transition-colors">Tải báo cáo số</button>
        </div>
      </div>
    </div>
  );
}
