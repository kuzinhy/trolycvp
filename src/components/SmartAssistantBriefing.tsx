import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Calendar, CheckCircle2, AlertCircle, ArrowRight, RefreshCw, Clock } from 'lucide-react';
import { Task, Meeting, Event, Birthday } from '../constants';
import { cn } from '../lib/utils';

interface SmartAssistantBriefingProps {
  tasks: Task[];
  meetings: Meeting[];
  events: Event[];
  birthdays: Birthday[];
  smartBriefing: string | null;
  isGenerating: boolean;
  onGenerate: () => void;
  onNavigate: (tab: string) => void;
}

export const SmartAssistantBriefing: React.FC<SmartAssistantBriefingProps> = ({ 
  tasks, 
  meetings, 
  events, 
  birthdays,
  smartBriefing,
  isGenerating,
  onGenerate,
  onNavigate 
}) => {
  const stats = useMemo(() => {
    const pendingTasks = tasks.filter(t => t.status !== 'Completed').length;
    const todayMeetings = meetings.filter(m => {
      const date = new Date(m.date);
      const today = new Date();
      return date.toDateString() === today.toDateString();
    }).length;
    const upcomingEvents = events.length;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const tomorrowMeetings = meetings.filter(m => m.date === tomorrowStr);
    const tomorrowEvents = events.filter(e => e.date === tomorrowStr);
    const hasTomorrowSchedule = tomorrowMeetings.length > 0 || tomorrowEvents.length > 0;

    let priority = "Bình thường";
    let color = "text-emerald-600";
    
    if (pendingTasks > 5 || todayMeetings > 3) {
      priority = "Cao";
      color = "text-rose-600";
    } else if (pendingTasks > 2 || todayMeetings > 1) {
      priority = "Trung bình";
      color = "text-amber-600";
    }

    return { pendingTasks, todayMeetings, upcomingEvents, priority, color, hasTomorrowSchedule, tomorrowMeetings, tomorrowEvents, tomorrowStr };
  }, [tasks, meetings, events]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl bg-blue-600 text-white p-6 shadow-2xl shadow-blue-200/50 group"
    >
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[100px] -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 blur-[100px] -ml-32 -mb-32" />
      
      <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/20 text-white rounded-xl">
                <Sparkles size={20} className={cn(isGenerating && "animate-pulse")} />
              </div>
              <span className="text-[10px] font-black text-blue-100 uppercase tracking-widest">Bản tin công việc thông minh</span>
            </div>
            <button 
              onClick={onGenerate}
              disabled={isGenerating}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all disabled:opacity-50"
              title="Cập nhật bản tin AI"
            >
              <RefreshCw size={14} className={cn(isGenerating && "animate-spin")} />
            </button>
          </div>
          
          {smartBriefing ? (
            <div className="space-y-3">
              <p className="text-lg font-medium leading-relaxed italic text-blue-50">
                "{smartBriefing}"
              </p>
            </div>
          ) : (
            <>
              <h3 className="text-2xl font-bold leading-tight">
                Chào đồng chí, hôm nay bạn có <span className="text-white underline decoration-blue-400 underline-offset-4">{stats.pendingTasks} nhiệm vụ</span> và <span className="text-white underline decoration-blue-400 underline-offset-4">{stats.todayMeetings} cuộc họp</span> cần lưu ý.
              </h3>
              
              <p className="text-blue-100 text-sm leading-relaxed max-w-xl">
                Trợ lý AI đã phân tích lịch trình của bạn. Mức độ bận rộn hôm nay là <span className={cn("font-bold px-2 py-0.5 rounded bg-white/20", stats.color === 'text-rose-600' ? 'text-rose-100' : stats.color === 'text-amber-600' ? 'text-amber-100' : 'text-emerald-100')}>{stats.priority}</span>. 
                Hãy tập trung hoàn thành các nhiệm vụ quan trọng trước 11h sáng để tối ưu hiệu suất.
              </p>
            </>
          )}

          <div className="flex flex-wrap gap-4 pt-2">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-2xl border border-white/20">
              <CheckCircle2 size={16} className="text-white" />
              <span className="text-xs font-bold">{stats.pendingTasks} Nhiệm vụ</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-2xl border border-white/20">
              <Calendar size={16} className="text-white" />
              <span className="text-xs font-bold">{stats.todayMeetings} Cuộc họp</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-2xl border border-white/20">
              <AlertCircle size={16} className="text-white" />
              <span className="text-xs font-bold">{stats.upcomingEvents} Sự kiện</span>
            </div>
          </div>

          {stats.hasTomorrowSchedule && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mt-4 p-3 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-blue-200" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-100">Chuẩn bị cho ngày mai ({stats.tomorrowStr})</span>
              </div>
              <div className="space-y-1">
                {stats.tomorrowMeetings.map((m, i) => (
                  <div key={`tm-${i}`} className="text-xs flex items-center gap-2">
                    <div className="w-1 h-1 bg-blue-300 rounded-full" />
                    <span className="font-medium">{m.time} - {m.name}</span>
                  </div>
                ))}
                {stats.tomorrowEvents.map((e, i) => (
                  <div key={`te-${i}`} className="text-xs flex items-center gap-2">
                    <div className="w-1 h-1 bg-amber-300 rounded-full" />
                    <span className="font-medium">{e.name}</span>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-blue-200 mt-2 italic">* Đồng chí hãy chuẩn bị tài liệu và nội dung tham mưu trước.</p>
            </motion.div>
          )}
        </div>

        <div className="shrink-0">
          <button 
            onClick={() => onNavigate('tasks')}
            className="group/btn relative px-8 py-4 bg-white text-blue-600 rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-black/10 flex items-center gap-3"
          >
            Bắt đầu làm việc
            <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
