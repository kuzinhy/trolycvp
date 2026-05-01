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

interface WidgetCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  glow?: boolean;
  type?: 'default' | 'technical';
}

const WidgetCard = ({ title, icon, children, className, action, glow, type = 'default' }: WidgetCardProps) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className={cn(
      "os-card flex flex-col gap-4 border border-white/5",
      glow && "border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.05)]",
      type === 'technical' ? "p-4 bg-slate-900/40 rounded-3xl" : "p-6",
      className
    )}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-xl text-blue-400",
          type === 'technical' ? "bg-slate-900/80" : "bg-slate-800/50"
        )}>
          {icon}
        </div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{title}</h3>
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
    { label: 'Tiến độ tham mưu', value: '84%', icon: <Zap size={16} />, color: 'text-blue-400', barColor: 'bg-blue-500' },
    { label: 'Nhiệm vụ hoàn tất', value: '12/15', icon: <CheckCircle2 size={16} />, color: 'text-emerald-400', barColor: 'bg-emerald-500' },
    { label: 'Nhân sự trực tuyến', value: onlineCount || '3/12', icon: <Users size={16} />, color: 'text-indigo-400', barColor: 'bg-indigo-500' },
    { label: 'Cuộc họp hôm nay', value: meetings?.length || '0', icon: <Calendar size={16} />, color: 'text-rose-400', barColor: 'bg-rose-500' },
  ];

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-hidden bg-[slate-950]">
      {/* STATUS BAR - TOP RAIL */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-900/40 border border-white/5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hệ thống: Online</span>
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center gap-2">
            <TrendingUp size={12} className="text-blue-400" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hiệu năng: Tốt</span>
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleTogglePush}
            disabled={isPushLoading}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
              isPushEnabled 
                ? "bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                : "bg-slate-800 border-white/5 text-slate-500 hover:text-slate-300"
            )}
          >
            {isPushLoading ? (
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isPushEnabled ? (
              <Bell size={12} className="animate-pulse" />
            ) : (
              <BellOff size={12} />
            )}
            <span className="text-[9px] font-black uppercase tracking-widest">
              {isPushEnabled ? "Cảnh báo: Bật" : "Cảnh báo: Tắt"}
            </span>
          </motion.button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[8px] font-black text-slate-400">
                U{i}
              </div>
            ))}
          </div>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            className="p-2 text-slate-400 hover:text-white"
          >
            <Bell size={18} />
          </motion.button>
        </div>
      </div>

      {/* QUICK STATS RAIL */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="os-card p-5 flex flex-col gap-3 bg-slate-900/20 border-white/5 group hover:border-blue-500/20 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className={cn("p-2 rounded-xl bg-slate-800", stat.color)}>
                {stat.icon}
              </div>
              <h4 className="text-xl font-black text-slate-100">{stat.value}</h4>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-300 transition-colors">{stat.label}</p>
              <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }} 
                  animate={{ width: parseInt(stat.value) ? `${stat.value}` : '40%' }} 
                  className={cn("h-full", stat.barColor)} 
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-0">
        {/* LEFT COLUMN - COMMAND FEED (xl:col-span-8) */}
        <div className="xl:col-span-8 flex flex-col gap-6 min-h-0 overflow-y-auto no-scrollbar">
          {/* AI Mission Control */}
          <div className="os-card-neon p-8 flex items-center justify-between relative overflow-hidden group min-h-[220px] shrink-0">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] -mr-32 -mt-32 transition-all duration-700 group-hover:scale-125 group-hover:bg-blue-500/20" />
            <div className="relative space-y-5">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-blue-600 text-white text-[9px] font-black rounded-lg uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20">
                  COMMAND OS v6.0
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/80 text-blue-400 text-[9px] font-black rounded-lg border border-blue-500/20">
                  <Cpu size={12} className="animate-spin-slow" />
                  AI ACTIVE
                </div>
              </div>
              <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
                Trung tâm <span className="os-glow-text">Chỉ huy Chiến lược</span>
              </h2>
              <p className="text-slate-400 text-sm font-bold tracking-tight max-w-[500px] leading-relaxed">
                Chào đồng chí <span className="text-blue-400">Chánh Văn phòng</span>. Hệ thống đã đồng bộ hóa dữ liệu mới nhất. Có <span className="text-rose-400">3 sự kiện</span> quan trọng và <span className="text-indigo-400">1 dự thảo</span> cần đồng chí phê duyệt tham mưu.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <button 
                  onClick={() => navigateTo('chat')}
                  className="os-btn os-btn-primary hover:scale-105 transition-transform"
                >
                  <Sparkles size={14} className="mr-2" /> Trò chuyện tham mưu
                </button>
                <button 
                  onClick={() => navigateTo('drafting-pro')}
                  className="os-btn os-btn-outline"
                >
                  <Terminal size={14} className="mr-2" /> Soạn thảo Nghị quyết
                </button>
                <button 
                  onClick={() => navigateTo('conclusion-creator')}
                  className="os-btn os-btn-outline border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                >
                  <FileSignature size={14} className="mr-2" /> Kết luận họp nhanh
                </button>
              </div>
            </div>
            <div className="hidden lg:block relative">
              <div className="p-8 bg-slate-800/40 rounded-full border border-blue-500/10 shadow-[0_0_80px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/5">
                <Shield size={100} className="text-blue-500/30 animate-pulse" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
            {/* Upcoming Tasks Widget */}
            <WidgetCard 
              title="Nhiệm vụ trọng tâm" 
              icon={<Layers size={16} />}
              type="technical"
              action={<button onClick={() => navigateTo('tasks')} className="p-2 text-slate-500 hover:text-blue-400"><ChevronRight size={18} /></button>}
            >
              <div className="space-y-2">
                {tasks?.slice(0, 5).map((task: any, i: number) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={task.id ? `elite-task-${task.id}` : `elite-task-idx-${i}`} 
                    className="flex items-center gap-4 p-3 bg-slate-900/40 rounded-2xl border border-white/5 hover:border-blue-500/20 hover:bg-slate-800/40 transition-all cursor-pointer group"
                  >
                    <div className={cn(
                      "w-1 h-8 rounded-full shadow-[0_0_8px_currentColor]",
                      task.priority === 'High' ? 'text-rose-500 bg-rose-500' : 'text-blue-500 bg-blue-500'
                    )} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[11px] font-black text-slate-200 truncate group-hover:text-blue-400 transition-colors uppercase tracking-tight">{task.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{task.status}</span>
                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                        <span className="text-[8px] font-black text-indigo-400/70 uppercase tracking-widest">{task.type}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {(!tasks || tasks.length === 0) && (
                  <div className="py-12 text-center text-slate-600 italic text-[10px] uppercase font-black tracking-widest">Hệ thống trống</div>
                )}
              </div>
            </WidgetCard>

            {/* Meetings Widget */}
            <WidgetCard 
              title="Lịch họp Đảng ủy" 
              icon={<Calendar size={16} />}
              glow
              type="technical"
              action={<button onClick={() => navigateTo('dashboard')} className="p-2 text-slate-500 hover:text-blue-400"><Plus size={18} /></button>}
            >
              <div className="space-y-3">
                {meetings?.slice(0, 5).map((meeting: any, i: number) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    key={meeting.id ? `elite-meeting-${meeting.id}` : `elite-meeting-idx-${i}`} 
                    className="p-4 bg-slate-900/40 rounded-2xl border border-white/5 hover:bg-slate-800/40 transition-all cursor-pointer relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="p-2 bg-slate-800 rounded-lg text-rose-400">
                        <Clock size={12} />
                      </div>
                      <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 text-[8px] font-black rounded uppercase tracking-widest border border-rose-500/20">SẮP DIỄN RA</span>
                    </div>
                    <h4 className="text-[11px] font-black text-slate-100 mb-1 leading-tight uppercase group-hover:text-rose-400 transition-colors">{meeting.title}</h4>
                    <div className="flex items-center gap-2">
                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest leading-none">
                        {meeting.location || 'Hội trường A'} • {meeting.time || '14:00'}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </WidgetCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0 pb-6">
            <WidgetCard 
              title="Tham mưu AI (Smart Insight)" 
              icon={<Sparkles size={16} />}
              glow
              type="technical"
              className="bg-indigo-500/5"
            >
              <div className="space-y-4">
                <div className="p-4 bg-slate-900/60 rounded-2xl border border-blue-500/20 italic text-[11px] text-blue-100 leading-relaxed">
                  "Dựa trên dữ liệu 24h qua, tôi nhận thấy có sự gia tăng các thảo luận về <span className="text-rose-400">cải cách hành chính</span>. Đồng chí nên xem xét dự thảo nghị quyết số 12 để đảm bảo tiến độ tham mưu."
                </div>
                <div className="flex items-center justify-between px-2">
                   <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Độ tin cậy AI: 96%</span>
                   <button className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest">Chi tiết phân tích</button>
                </div>
              </div>
            </WidgetCard>

            <WidgetCard 
              title="Cảnh báo sớm (Early Warning)" 
              icon={<Shield size={16} />}
              type="technical"
              className="bg-rose-500/5 shadow-lg shadow-rose-500/5"
            >
              <div className="space-y-3">
                {[
                  { msg: 'Phát hiện 02 tin bài tiêu cực về cơ quan', level: 'Critical' },
                  { msg: 'Nhiệm vụ soạn thảo QĐ-24 quá hạn 2h', level: 'Warning' }
                ].map((w, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-slate-900/60 rounded-xl border border-white/5">
                    <div className={cn(
                      "w-2 h-2 rounded-full animate-pulse",
                      w.level === 'Critical' ? "bg-rose-500" : "bg-amber-500"
                    )} />
                    <span className="text-[10px] font-bold text-slate-200">{w.msg}</span>
                  </div>
                ))}
              </div>
            </WidgetCard>
          </div>
        </div>

        {/* RIGHT COLUMN - ANALYTICS & QUICK NOTES (xl:col-span-4) */}
        <div className="xl:col-span-4 flex flex-col gap-6 min-h-0">
          {/* Health/Stats Widget */}
          <WidgetCard title="Chỉ số vận hành hệ thống" icon={<Activity size={16} />} className="flex-1" type="technical">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                  <span className="text-slate-400">Tải tham mưu AI</span>
                  <span className="text-blue-400">62%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '62%' }} className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                  <span className="text-slate-400">Đồng bộ tri thức</span>
                  <span className="text-indigo-400">94%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '94%' }} className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                </div>
              </div>

              <div className="p-5 bg-slate-950/40 rounded-3xl border border-white/5 space-y-4">
                <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 border-b border-white/5 pb-2">Tham mưu tích cực</h5>
                {[
                  { name: 'Admin Huy', val: 92, color: 'bg-blue-500' },
                  { name: 'Phòng Chính trị', val: 78, color: 'bg-indigo-500' },
                  { name: 'Văn phòng', val: 85, color: 'bg-emerald-500' },
                ].map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[9px] font-black text-slate-500">
                      {p.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase mb-1.5 px-0.5">
                        <span>{p.name}</span>
                        <span>{p.val}%</span>
                      </div>
                      <div className="h-1 w-full bg-slate-800 rounded-full">
                        <div className={cn("h-full rounded-full", p.color)} style={{ width: `${p.val}%` }} />
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
            icon={<StickyNote size={16} />}
            type="technical"
            action={<button className="p-2 text-slate-500 hover:text-blue-400"><Plus size={18} /></button>}
          >
            <div className="grid grid-cols-1 gap-3">
              {[
                { title: 'Công tác phát triển Đảng 2026', date: 'Vừa xong', tag: 'Chính trị' },
                { title: 'Tối ưu quy trình văn phòng', date: '1 giờ trước', tag: 'Vận hành' },
                { title: 'Chuẩn bị nội dung giao ban', date: 'Hôm qua', tag: 'Tham mưu' },
              ].map((note, i) => (
                <motion.div 
                  whileHover={{ x: 5 }}
                  key={i} 
                  className="p-4 bg-slate-900/40 rounded-2xl border border-white/5 hover:border-blue-500/20 transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[8px] font-black px-2 py-0.5 bg-slate-800 text-slate-500 rounded uppercase tracking-tighter group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">{note.tag}</span>
                    <span className="text-[8px] font-bold text-slate-600 uppercase italic">{note.date}</span>
                  </div>
                  <h4 className="text-[10px] font-black text-slate-200 group-hover:text-white uppercase leading-tight tracking-tight">{note.title}</h4>
                </motion.div>
              ))}
            </div>
          </WidgetCard>
        </div>
      </div>

      {/* FOOTER ACTION RAIL / TERMINAL */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border border-white/5 rounded-2xl shrink-0">
        <div className="flex items-center gap-4 text-xs font-mono text-slate-500 whitespace-nowrap overflow-hidden">
          <span className="text-blue-500 font-bold">$</span>
          <span className="animate-typing">Hệ thống đang sẵn sàng phục vụ Chánh Văn phòng...</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">Trợ giúp</button>
          <div className="h-4 w-[1px] bg-white/5" />
          <button className="text-[9px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-400 transition-colors">Tải báo cáo số</button>
        </div>
      </div>
    </div>
  );
}
