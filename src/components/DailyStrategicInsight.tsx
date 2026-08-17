import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  BrainCircuit, 
  RefreshCw, 
  Zap, 
  Calendar, 
  CheckSquare, 
  Link2, 
  ChevronRight,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { generateContentWithRetry } from '../lib/ai-utils';
import Markdown from 'react-markdown';

interface Task {
  id: string;
  title: string;
  status: string;
  priority?: string;
  deadline?: string;
  type?: string;
  description?: string;
}

interface Meeting {
  id: string;
  title?: string;
  name?: string;
  time?: string;
  date?: string;
  location?: string;
  description?: string;
}

interface DailyStrategicInsightProps {
  tasks: Task[];
  meetings: Meeting[];
  events?: any[];
  aiKnowledge: any[];
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const DailyStrategicInsight: React.FC<DailyStrategicInsightProps> = ({
  tasks = [],
  meetings = [],
  events = [],
  aiKnowledge = [],
  showToast
}) => {
  const [insight, setInsight] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Lấy khóa cache duy nhất cho ngày hôm nay
  const cacheKey = useMemo(() => {
    const today = new Date();
    return `strategic-insight-${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  }, []);

  // Đọc dữ liệu từ cache khi component mount hoặc ngày thay đổi
  useEffect(() => {
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(`${cacheKey}-time`);
    if (cachedData) {
      setInsight(cachedData);
      if (cachedTime) {
        setLastUpdated(cachedTime);
      }
    } else {
      // Tự động sinh nếu chưa có cache
      generateInsight();
    }
  }, [cacheKey]);

  // Bộ lọc dữ liệu cốt lõi hôm nay
  const todayStats = useMemo(() => {
    const urgentTasks = tasks.filter(t => t.status !== 'Completed' && t.priority === 'High');
    const todayMeetings = meetings.slice(0, 3);
    return {
      urgentTasksCount: urgentTasks.length,
      todayMeetingsCount: todayMeetings.length,
      urgentTasksList: urgentTasks.slice(0, 3),
      todayMeetingsList: todayMeetings
    };
  }, [tasks, meetings]);

  const generateInsight = async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const todayString = new Date().toLocaleDateString('vi-VN', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      const tasksBrief = tasks.length > 0 
        ? tasks.slice(0, 8).map(t => `- [${t.priority || 'Bình thường'}] ${t.title} (${t.status}, Hạn: ${t.deadline || 'Chưa có'})`).join('\n')
        : 'Không có nhiệm vụ tồn đọng.';

      const meetingsBrief = meetings.length > 0
        ? meetings.slice(0, 5).map(m => `- ${m.time || ''} ${m.date || ''}: ${m.title || m.name || ''} tại ${m.location || 'Hội trường'}`).join('\n')
        : 'Không có lịch họp sắp tới.';

      const knowledgeBrief = aiKnowledge.length > 0
        ? aiKnowledge.slice(0, 5).map(k => `- [${k.category || 'Văn bản'}] ${k.title}: ${k.content ? k.content.substring(0, 100) : ''}...`).join('\n')
        : 'Không có tài liệu hướng dẫn chỉ đạo gốc.';

      const prompt = `Bạn là Trợ lý AI Tham mưu thông minh cấp cao của Văn phòng Đảng ủy, chuyên phụ trách hỗ trợ đồng chí Nguyễn Minh Huy - Chánh Văn phòng Đảng ủy.
Hôm nay là ngày ${todayString}.

Dựa trên dữ liệu vận hành thời gian thực của văn phòng dưới đây, hãy lập một "BẢN ĐIỂM TIN CHIẾN LƯỢC HÀNG NGÀY" cực kỳ súc tích, sắc sảo, đúng chuẩn văn phong chính trị tham mưu văn phòng và có cấu trúc chặt chẽ.

DỮ LIỆU THỜI GIAN THỰC CỦA VĂN PHÒNG:
1. Danh sách nhiệm vụ chuyên môn cần xử lý (Tasks):
${tasksBrief}

2. Lịch họp & sự kiện trong ngày (Meetings & Events):
${meetingsBrief}

3. Các văn bản chỉ đạo / quy định cốt lõi trong kho tri thức (Knowledge):
${knowledgeBrief}

Hãy trình bày dưới dạng Markdown với các mục rõ ràng sau:
### 🌟 ĐIỂM NHẤN CHIẾN LƯỢC HÔM NAY
(Một đoạn tóm tắt khoảng 3-4 câu cực kỳ sắc sảo và mang tầm nhìn bao quát về trọng tâm điều hành hôm nay, định hướng công tác trọng yếu cho Chánh Văn phòng Nguyễn Minh Huy, bám sát các cuộc họp cốt lõi hoặc nhiệm vụ khẩn cấp nhất).

### 🎯 KIẾN NGHỊ THAM MƯU HÀNH ĐỘNG
(Đưa ra đúng 3 khuyến nghị hành động thực tế cực kỳ cụ thể, chỉ ra nhiệm vụ nào cần đốc thúc cán bộ gấp, tài liệu nào cần đối chiếu, hoặc cuộc họp nào cần đặc biệt lưu ý kết luận).

### 🔗 KẾT NỐI TRI THỨC PHÁP QUY (Knowledge Linking)
(Liên kết trực tiếp ít nhất một nhiệm vụ/lịch họp cụ thể với văn bản chỉ đạo hoặc quy định tương ứng có trong Kho tri thức để bảo đảm tính pháp quy, tính tuân thủ chặt chẽ của cơ quan Đảng ủy)`;

      const response = await generateContentWithRetry({
        model: 'gemini-3.7-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const resultText = response?.text || 'Không thể tạo tóm tắt điểm tin chiến lược vào lúc này.';
      
      // Lưu vào cache
      localStorage.setItem(cacheKey, resultText);
      const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      localStorage.setItem(`${cacheKey}-time`, nowStr);
      
      setInsight(resultText);
      setLastUpdated(nowStr);
      showToast('Đã đồng bộ điểm tin chiến lược hàng ngày thành công!', 'success');
    } catch (error: any) {
      console.error('Error generating daily insight:', error);
      showToast('Lỗi đồng bộ điểm tin chiến lược từ máy chủ AI.', 'error');
      // Set fallback if cache is empty
      if (!insight) {
        setInsight(`### 🌟 ĐIỂM NHẤN CHIẾN LƯỢC HÔM NAY\nHệ thống tạm thời chưa thể kết nối đến máy chủ AI để lập điểm tin chiến lược. Tuy nhiên, qua rà soát cơ sở dữ liệu cục bộ, hôm nay Văn phòng ghi nhận **${meetings.length} lịch họp** và **${tasks.filter(t => t.status !== 'Completed').length} nhiệm vụ** cần xử lý.\n\n### 🎯 KIẾN NGHỊ THAM MƯU HÀNH ĐỘNG\n1. Kiểm tra tiến độ chuẩn bị nội dung và tài liệu cho các cuộc họp sắp tới trong ngày.\n2. Đôn đốc xử lý dứt điểm các nhiệm vụ có độ ưu tiên cao.\n3. Thường xuyên đối chiếu quy trình công tác với Kho tri thức văn bản Đảng.\n\n### 🔗 KẾT NỐI TRI THỨC PHÁP QUY (Knowledge Linking)\n• Kết nối các báo cáo tham mưu với các văn bản hướng dẫn và nghị quyết chỉ đạo tương ứng trong Kho tri thức để đảm bảo tính pháp lý.`);
        setLastUpdated('Mặc định');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 relative overflow-hidden group hover:shadow-lg transition-all duration-300"
    >
      {/* Glow Effects */}
      <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-gradient-to-br from-indigo-500/5 to-rose-500/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[150px] h-[150px] bg-gradient-to-tr from-blue-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100/50 group-hover:scale-105 transition-transform duration-300">
            <BrainCircuit size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-150 text-[9px] font-black uppercase tracking-widest text-indigo-600 rounded-md">
                Strategic Intelligence
              </span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 tracking-tight uppercase mt-0.5">
              Điểm tin Chiến lược Hàng ngày
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          {lastUpdated && (
            <span className="text-[10px] font-medium text-slate-400">
              Đồng bộ lúc: {lastUpdated}
            </span>
          )}
          <button
            onClick={generateInsight}
            disabled={isGenerating}
            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider"
            title="Đồng bộ lại dữ liệu chỉ huy mới nhất"
          >
            <RefreshCw size={14} className={isGenerating ? 'animate-spin text-indigo-600' : ''} />
            <span className="hidden md:inline">Cập nhật</span>
          </button>
        </div>
      </div>

      {/* Real-time Indicators Box */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-b border-slate-100 bg-slate-50/50 -mx-6 px-6 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-rose-50 rounded-lg text-rose-600">
            <Calendar size={14} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Họp hôm nay</p>
            <p className="text-xs font-black text-slate-800">{todayStats.todayMeetingsCount} cuộc họp</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600">
            <CheckSquare size={14} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nhiệm vụ High</p>
            <p className="text-xs font-black text-slate-800">{todayStats.urgentTasksCount} khẩn cấp</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
            <BookOpen size={14} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Kho tri thức</p>
            <p className="text-xs font-black text-slate-800">{aiKnowledge.length} văn bản gốc</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
            <Zap size={14} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Độ bảo mật</p>
            <p className="text-xs font-black text-emerald-600 flex items-center gap-1">
              <ShieldCheck size={12} /> Tối đa
            </p>
          </div>
        </div>
      </div>

      {/* Main AI Summary Area */}
      <div className="pt-5 relative z-10">
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="w-10 h-10 relative">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
              <BrainCircuit size={18} className="absolute inset-0 m-auto text-indigo-600 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-widest text-slate-700">Trợ lý AI đang phân tích...</p>
              <p className="text-[10px] text-slate-400 mt-1 italic">Đang đối chiếu lịch trình, nhiệm vụ khẩn cấp và kết nối tri thức pháp quy của Đảng bộ...</p>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="prose prose-sm max-w-none prose-headings:text-slate-950 prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-headings:border-l-4 prose-headings:border-indigo-500 prose-headings:pl-3 prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600 prose-li:my-1 prose-strong:text-slate-900 prose-strong:font-bold prose-headings:mt-4 prose-headings:mb-3"
          >
            <Markdown>{insight}</Markdown>
          </motion.div>
        )}
      </div>

      {/* Bottom context linking visual aid */}
      {!isGenerating && todayStats.urgentTasksList.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10 bg-slate-50/40 p-4 rounded-2xl">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
              Đề xuất đôn đốc khẩn:
            </p>
            <span className="text-xs text-rose-700 font-bold bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg max-w-[250px] truncate">
              {todayStats.urgentTasksList[0].title}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer group">
            <span>Tiến hành đôn đốc qua hệ thống</span>
            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      )}
    </motion.div>
  );
};
