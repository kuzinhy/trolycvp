import React, { useState } from 'react';
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
  ChevronRight,
  Plus,
  StickyNote,
  Terminal,
  Cpu,
  Shield,
  Briefcase
} from 'lucide-react';
import { cn } from '../lib/utils';

interface WidgetCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  glow?: boolean;
}

const WidgetCard = ({ title, icon, children, className, action, glow }: WidgetCardProps) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className={cn(
      "os-card p-6 flex flex-col gap-4 border border-white/5",
      glow && "border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.05)]",
      className
    )}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-800/50 rounded-xl text-blue-400">
          {icon}
        </div>
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{title}</h3>
      </div>
      {action}
    </div>
    <div className="flex-1 overflow-y-auto no-scrollbar">
      {children}
    </div>
  </motion.div>
);

export function EliteDashboardHome({ navigateTo, tasks, meetings, onlineCount, memberCount }: any) {
  const [activeTab, setActiveTab] = useState('overview');

  const stats = [
    { label: 'Tiến độ tổng', value: '84%', icon: <Zap size={16} />, color: 'text-blue-400' },
    { label: 'Hoàn thành', value: '12', icon: <CheckCircle2 size={16} />, color: 'text-emerald-400' },
    { label: 'Đang online', value: onlineCount || '0', icon: <Users size={16} />, color: 'text-indigo-400' },
    { label: 'Sự kiện', value: meetings?.length || '0', icon: <Calendar size={16} />, color: 'text-rose-400' },
  ];

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-hidden">
      {/* OS BAR / TOP STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="os-card p-5 flex items-center gap-4 bg-slate-900/20"
          >
            <div className={cn("p-2.5 rounded-xl bg-slate-800", stat.color)}>
              {stat.icon}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stat.label}</p>
              <h4 className="text-xl font-black text-slate-100">{stat.value}</h4>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-0">
        {/* CENTER COLUMN - COMMAND FEED */}
        <div className="xl:col-span-8 flex flex-col gap-6 min-h-0">
          {/* AI Mission Control */}
          <div className="os-card-neon p-8 flex items-center justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] -mr-32 -mt-32 transition-all duration-700 group-hover:scale-125 group-hover:bg-blue-500/20" />
            <div className="relative space-y-4">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-blue-500 text-slate-950 text-[10px] font-black rounded-lg uppercase tracking-widest">
                  AI OS v8.0
                </div>
                <div className="text-blue-400 animate-pulse">
                  <Cpu size={18} />
                </div>
              </div>
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">
                Chào mừng tới <span className="os-glow-text">Trung tâm Điều hành</span>
              </h2>
              <p className="text-slate-400 text-sm font-medium tracking-tight max-w-[500px]">
                Hệ hệ thống đã sẵn sàng. Có <span className="text-blue-400 font-bold">3 nhiệm vụ ưu tiên</span> cần xử lý ngay và <span className="text-indigo-400 font-bold">1 cuộc họp</span> sắp diễn ra.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <button 
                  onClick={() => navigateTo('chat')}
                  className="os-btn os-btn-primary"
                >
                  <Sparkles size={14} className="mr-2" /> Trò chuyện AI
                </button>
                <button 
                  onClick={() => navigateTo('drafting')}
                  className="os-btn os-btn-outline"
                >
                  <Terminal size={14} className="mr-2" /> Lệnh Soạn thảo
                </button>
              </div>
            </div>
            <div className="hidden lg:block relative">
              <div className="p-6 bg-slate-800/40 rounded-full border border-blue-500/10 shadow-[0_0_50px_rgba(59,130,246,0.1)]">
                <Shield size={80} className="text-blue-500/40" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
            {/* Upcoming Tasks Widget */}
            <WidgetCard 
              title="Nhiệm vụ trọng tâm" 
              icon={<CheckCircle2 size={16} />}
              action={<button onClick={() => navigateTo('tasks')} className="p-2 text-slate-500 hover:text-blue-400"><ChevronRight size={18} /></button>}
            >
              <div className="space-y-3">
                {tasks?.slice(0, 5).map((task: any) => (
                  <div key={task.id} className="flex items-center gap-4 p-3 bg-slate-800/30 rounded-xl border border-white/5 hover:border-blue-500/20 transition-all cursor-pointer group">
                    <div className={cn(
                      "w-1 h-8 rounded-full",
                      task.priority === 'High' ? 'bg-rose-500' : 'bg-blue-500'
                    )} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[11px] font-bold text-slate-200 truncate group-hover:text-blue-400 transition-colors">{task.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{task.status}</span>
                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{task.type}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {(!tasks || tasks.length === 0) && (
                  <div className="py-12 text-center text-slate-600 italic text-xs">Không có nhiệm vụ sắp tới</div>
                )}
              </div>
            </WidgetCard>

            {/* Meetings Widget */}
            <WidgetCard 
              title="Lịch họp Đảng ủy" 
              icon={<Calendar size={16} />}
              glow
              action={<button onClick={() => navigateTo('dashboard')} className="p-2 text-slate-500 hover:text-blue-400"><Plus size={18} /></button>}
            >
              <div className="space-y-3">
                {meetings?.slice(0, 5).map((meeting: any) => (
                  <div key={meeting.id} className="p-4 bg-slate-800/30 rounded-2xl border border-white/5 hover:bg-slate-800/50 transition-all cursor-pointer">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="p-2 bg-slate-900 rounded-lg text-rose-400">
                        <Clock size={12} />
                      </div>
                      <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 text-[8px] font-black rounded uppercase tracking-widest border border-rose-500/20">SẮP DIỄN RA</span>
                    </div>
                    <h4 className="text-xs font-black text-slate-100 mb-1 leading-tight">{meeting.title}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      {meeting.location || 'Hội trường A'} • {meeting.time || '14:00'}
                    </p>
                  </div>
                ))}
              </div>
            </WidgetCard>
          </div>
        </div>

        {/* RIGHT COLUMN - ANALYTICS & QUICK NOTES */}
        <div className="xl:col-span-4 flex flex-col gap-6 min-h-0">
          {/* Health/Stats Widget */}
          <WidgetCard title="Chỉ số vận hành" icon={<Activity size={16} />} className="flex-1">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-400">Tải xử lý CPU</span>
                  <span className="text-blue-400">42%</span>
                </div>
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '42%' }} className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-400">Dung lượng bộ nhớ AI</span>
                  <span className="text-indigo-400">1.2 TB</span>
                </div>
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '68%' }} className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                </div>
              </div>

              <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5 space-y-3">
                <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 border-b border-white/5 pb-2">Top nhân sự tích cực</h5>
                {[
                  { name: 'Admin Trung ương', val: 98, color: 'bg-blue-500' },
                  { name: 'Lê Văn Chính', val: 84, color: 'bg-indigo-500' },
                  { name: 'Nguyễn Huy', val: 72, color: 'bg-rose-500' },
                ].map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-700 border border-white/10" />
                    <div className="flex-1">
                      <div className="flex justify-between text-[9px] font-black text-slate-300 uppercase mb-1">
                        <span>{p.name}</span>
                        <span>{p.val} exp</span>
                      </div>
                      <div className="h-0.5 w-full bg-slate-800 rounded-full">
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
            title="Ghi chú nhanh" 
            icon={<StickyNote size={16} />}
            action={<button className="p-2 text-slate-500 hover:text-blue-400"><Plus size={18} /></button>}
          >
            <div className="grid grid-cols-1 gap-3">
              {[
                { title: 'Chuẩn bị đại hội', date: 'Vừa xong', tag: 'Chính trị' },
                { title: 'Dự thảo nghị quyết v3', date: '1 giờ trước', tag: 'Tham mưu' },
                { title: 'Lưu ý kiểm tra cơ sở', date: 'Hôm qua', tag: 'Kiểm tra' },
              ].map((note, i) => (
                <div key={i} className="p-4 bg-slate-800/30 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all group cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[8px] font-black px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded uppercase tracking-tighter group-hover:bg-indigo-500/20 group-hover:text-indigo-400">{note.tag}</span>
                    <span className="text-[8px] font-bold text-slate-600 uppercase italic">{note.date}</span>
                  </div>
                  <h4 className="text-[11px] font-bold text-slate-200 group-hover:text-white">{note.title}</h4>
                </div>
              ))}
            </div>
          </WidgetCard>
        </div>
      </div>
    </div>
  );
}
