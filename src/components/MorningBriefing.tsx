import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { Sparkles, Calendar, Clock, AlertCircle, CheckCircle2, X, Sun, CloudRain, Wind, Thermometer, ChevronRight, Brain, Minus, Maximize2, GripHorizontal, Move } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateContentWithRetry } from '../lib/ai-utils';
import { cn } from '../lib/utils';

interface MorningBriefingProps {
  tasks: any[];
  meetings: any[];
  events: any[];
  onClose: () => void;
}

export const MorningBriefing: React.FC<MorningBriefingProps> = ({ tasks, meetings, events, onClose }) => {
  const [briefing, setBriefing] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [size, setSize] = useState({ width: 450, height: 550 });
  const [weather, setWeather] = useState<{ temp: number, condition: string, icon: any }>({ 
    temp: 28, 
    condition: 'Nắng nhẹ', 
    icon: Sun 
  });
  
  const dragControls = useDragControls();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const generateBriefing = async () => {
      setIsLoading(true);
      try {
        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');
        
        const todayMeetings = meetings.filter(m => m.date === todayStr);
        const todayEvents = events.filter(e => e.date === todayStr);
        const pendingTasks = tasks.filter(t => t.status !== 'Completed');
        const overdueTasks = tasks.filter(t => t.status !== 'Completed' && t.deadline && new Date(t.deadline) < today);

        const prompt = `Bạn là Trợ lý Chỉ huy Elite. Hãy viết một bản tin "Chào buổi sáng" (Morning Briefing) cực kỳ ngắn gọn (dưới 100 từ), chuyên nghiệp và sắc bén cho Anh Huy.
        
        Dữ liệu hôm nay (${format(today, 'EEEE, dd/MM/yyyy', { locale: vi })}):
        - Cuộc họp: ${todayMeetings.length}
        - Sự kiện: ${todayEvents.length}
        - Nhiệm vụ chưa xong: ${pendingTasks.length}
        - Nhiệm vụ quá hạn: ${overdueTasks.length}
        
        Yêu cầu trình bày:
        1. Lời chào ngắn gọn.
        2. Tóm tắt 3 điểm quan trọng nhất (mỗi điểm một dòng, có dấu gạch đầu dòng).
        3. 1 câu châm ngôn hoặc lời khuyên chiến lược (xuống dòng mới).
        4. Sử dụng Markdown, đảm bảo các phần được ngăn cách bằng dòng trống để dễ đọc.
        5. Chỉ trả về nội dung bản tin.`;

        const response = await generateContentWithRetry({
          model: 'gemini-3-flash-preview',
          contents: [{ parts: [{ text: prompt }] }]
        });

        setBriefing(response.text || 'Không thể tạo bản tin lúc này.');
      } catch (error) {
        console.error('Error generating briefing:', error);
        setBriefing('Chào buổi sáng Chỉ huy! Hệ thống đang phân tích dữ liệu.');
      } finally {
        setIsLoading(false);
      }
    };

    generateBriefing();
  }, [tasks, meetings, events]);

  const handleResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.pageX;
    const startY = e.pageY;
    const startWidth = size.width;
    const startHeight = size.height;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(350, startWidth + (moveEvent.pageX - startX));
      const newHeight = Math.max(200, startHeight + (moveEvent.pageY - startY));
      setSize({ width: newWidth, height: newHeight });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <AnimatePresence>
      <motion.div 
        ref={containerRef}
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.9, x: 20, y: 20 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          width: isMinimized ? 300 : size.width,
          height: isMinimized ? 'auto' : size.height,
        }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed top-20 right-8 z-[200] bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-200 overflow-hidden flex flex-col backdrop-blur-xl"
        style={{ touchAction: 'none' }}
      >
        {/* Header / Drag Handle */}
        <div 
          onPointerDown={(e) => dragControls.start(e)}
          className="bg-slate-900 p-4 text-white flex items-center justify-between cursor-move select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Brain size={18} />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest">Morning Briefing</h2>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">Elite Command v6.0</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              {isMinimized ? <Maximize2 size={14} /> : <Minus size={14} />}
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-rose-500/20 rounded-lg transition-colors text-slate-400 hover:text-rose-400"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Weather & Date Bar */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-indigo-600" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                  {format(new Date(), 'EEEE, dd/MM', { locale: vi })}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <weather.icon size={16} className="text-amber-500" />
                <span className="text-xs font-black text-slate-900">{weather.temp}°C</span>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white/50">
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 py-12">
                  <div className="w-10 h-10 border-2 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Đang phân tích...</p>
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="p-6 bg-indigo-50/50 rounded-[2rem] border border-indigo-100/50 relative overflow-hidden group shadow-inner">
                    <Sparkles className="absolute -right-2 -top-2 text-indigo-200 opacity-20 group-hover:scale-110 transition-transform" size={48} />
                    <div className="prose prose-slate prose-sm max-w-none text-slate-700 font-medium leading-relaxed prose-p:mb-4 prose-li:mb-2 prose-headings:text-indigo-900 prose-headings:font-black">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{briefing}</ReactMarkdown>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                        <Calendar size={16} />
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lịch họp</p>
                        <p className="text-sm font-black text-slate-900">{meetings.filter(m => m.date === format(new Date(), 'yyyy-MM-dd')).length}</p>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                      <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center">
                        <AlertCircle size={16} />
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Quá hạn</p>
                        <p className="text-sm font-black text-slate-900">{tasks.filter(t => t.status !== 'Completed' && t.deadline && new Date(t.deadline) < new Date()).length}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">System Ready</span>
              </div>
              <button 
                onClick={onClose}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200 flex items-center gap-2"
              >
                Bắt đầu
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Resize Handle */}
            <div 
              onMouseDown={handleResize}
              className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-1 group"
            >
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full group-hover:bg-indigo-500 transition-colors" />
            </div>
          </>
        )}

        {isMinimized && (
          <div className="p-3 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Briefing Active</span>
            </div>
            <button 
              onClick={() => setIsMinimized(false)}
              className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
            >
              Mở rộng
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
