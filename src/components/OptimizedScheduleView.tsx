import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  ShieldAlert,
  Zap,
  LayoutGrid,
  List as ListIcon,
  Plus,
  FileUp,
  Trash2,
  Loader2,
  Save,
  Brain,
  Edit2
} from 'lucide-react';
import { Meeting, Task, Event } from '../constants';
import { cn } from '../lib/utils';
import { format, startOfWeek, addDays, subDays, isSameDay, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { extractTextFromPDF } from '../lib/pdf-utils';
import { generateContentWithRetry, parseAIResponse } from '../lib/ai-utils';
import Papa from 'papaparse';
import ICAL from 'ical.js';

interface OptimizedScheduleViewProps {
  meetings: Meeting[];
  tasks: Task[];
  events: Event[];
  updateMeetings: (updater: any[] | ((prev: any[]) => any[])) => Promise<void>;
  updateTasks: (updater: any[] | ((prev: any[]) => any[])) => Promise<void>;
  updateEvents: (updater: any[] | ((prev: any[]) => any[])) => Promise<void>;
  isUploading: boolean;
  onUploadCalendarFile: (file: File) => void;
  onNavigate: (tab: string) => void;
  onSwitchToCreate: () => void;
  onEditItem?: (item: any) => void;
  smartLearnFromText: (text: string, tagsHint?: string[], isManual?: boolean) => Promise<void>;
  isLearning: boolean;
  showToast: (message: string, type?: any) => void;
}

export const OptimizedScheduleView: React.FC<OptimizedScheduleViewProps> = ({ 
  meetings, 
  tasks, 
  events,
  updateMeetings,
  updateTasks,
  updateEvents,
  isUploading,
  onUploadCalendarFile,
  onNavigate,
  onSwitchToCreate,
  onEditItem,
  smartLearnFromText,
  isLearning,
  showToast
}) => {
  const today = new Date();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(today, { weekStartsOn: 1 }));

  const handlePrevWeek = () => setCurrentWeekStart(prev => subDays(prev, 7));
  const handleNextWeek = () => setCurrentWeekStart(prev => addDays(prev, 7));
  const handleResetWeek = () => setCurrentWeekStart(startOfWeek(today, { weekStartsOn: 1 }));

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isParsing, setIsParsing] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<any | null>(null);
  const [selectedType, setSelectedType] = React.useState<'meeting' | 'task' | 'event' | null>(null);
  const [smartInput, setSmartInput] = React.useState('');
  const [isSmartProcessing, setIsSmartProcessing] = React.useState(false);

  const handleSmartInput = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!smartInput.trim()) return;

    setIsSmartProcessing(true);
    try {
      const prompt = `Bạn là Trợ lý Lịch công tác chuyên nghiệp. Hãy phân tích câu sau và chuyển thành thông tin lịch công tác chi tiết: "${smartInput}"
      Ngày hiện tại là: ${format(new Date(), 'EEEE, dd/MM/yyyy', { locale: vi })}.
      
      HÃY TRẢ VỀ JSON: { 
        date (YYYY-MM-DD), 
        time (HH:mm), 
        endTime (HH:mm),
        content (nội dung ngắn gọn), 
        chairperson (người chủ trì), 
        location (địa điểm), 
        participants (mảng tên người tham gia), 
        type (meeting|task|event), 
        priority (high|medium|low),
        notes (ghi chú thêm nếu có)
      }.
      
      Quy tắc:
      - Nếu không có ngày cụ thể, hãy dùng ngày hiện tại hoặc ngày gần nhất phù hợp.
      - Nếu ghi "Sáng" mặc định "08:00", "Chiều" mặc định "14:00".
      - Chỉ trả về JSON duy nhất.`;

      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const data = parseAIResponse(response.text || '{}');

      if (data && data.content) {
        const baseItem = {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
          date: data.date || format(new Date(), 'yyyy-MM-dd'),
          time: data.time || "08:00",
          endTime: data.endTime || "09:00",
          location: data.location || '',
          participants: data.participants || [],
          description: data.notes || '',
          status: 'pending'
        };

        if (data.type === 'meeting') {
          await updateMeetings(prev => [...prev, { ...baseItem, name: data.content, chairperson: data.chairperson, type: 'internal' }]);
        } else if (data.type === 'task') {
          await updateTasks(prev => [...prev, { ...baseItem, title: data.content, priority: data.priority || 'medium', deadline: baseItem.date, assignee: data.chairperson || 'Chưa phân công' }]);
        } else {
          await updateEvents(prev => [...prev, { ...baseItem, name: data.content, type: 'other' }]);
        }

        setSmartInput('');
        showToast('Đã thêm lịch thông minh thành công', 'success');
      }
    } catch (err) {
      console.error("Smart Input Error:", err);
      showToast('Không thể xử lý thông tin. Vui lòng thử lại.', 'error');
    } finally {
      setIsSmartProcessing(false);
    }
  };

  const handleDeleteMeeting = async (id: string) => {
    await updateMeetings(prev => prev.filter(m => m.id !== id));
  };

  const handleDeleteTask = async (id: string) => {
    await updateTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleDeleteEvent = async (id: string) => {
    await updateEvents(prev => prev.filter(e => e.id !== id));
  };

  const handleClearAll = async () => {
    try {
      await Promise.all([
        updateMeetings([]),
        updateTasks([]),
        updateEvents([])
      ]);
      showToast('Đã xóa toàn bộ dữ liệu lịch trình thành công.', 'success');
    } catch (error) {
      console.error('Error clearing data:', error);
      showToast('Lỗi khi xóa dữ liệu.', 'error');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isWord = fileName.endsWith('.doc') || fileName.endsWith('.docx') || file.type.includes('word');
    const isPDF = fileName.endsWith('.pdf') || file.type === 'application/pdf';
    const isCSV = fileName.endsWith('.csv') || file.type === 'text/csv';
    const isICS = fileName.endsWith('.ics') || file.type === 'text/calendar';

    setIsParsing(true);
    try {
      if (isICS) {
        const text = await file.text();
        const jcalData = ICAL.parse(text);
        const vcalendar = new ICAL.Component(jcalData);
        const vevents = vcalendar.getAllSubcomponents('vevent');
        
        const newMeetings = vevents.map(vevent => {
          const event = new ICAL.Event(vevent);
          return {
            id: Math.random().toString(36).substr(2, 9),
            date: format(event.startDate.toJSDate(), 'yyyy-MM-dd'),
            time: format(event.startDate.toJSDate(), 'HH:mm'),
            name: event.summary,
            location: event.location || '',
            description: event.description || '',
            chairperson: '',
            participants: '',
            priority: 'medium'
          };
        });
        
        await updateMeetings(prev => [...prev, ...newMeetings]);
        showToast(`Đã nhập ${newMeetings.length} sự kiện từ tệp ICS thành công!`, 'success');
      } else if (isCSV) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            try {
              const text = JSON.stringify(results.data);
              await processTextWithAI(text, "Dữ liệu CSV");
            } catch (err: any) {
              showToast('Lỗi khi xử lý dữ liệu CSV: ' + err.message, 'error');
            }
          }
        });
      } else if (isWord || isPDF) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/parse-document', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Lỗi khi phân tích tệp');
        
        const { text } = await response.json();
        await processTextWithAI(text, file.name);
      } else {
        showToast('Định dạng tệp không được hỗ trợ. Vui lòng sử dụng .doc, .docx, .pdf, .csv, hoặc .ics', 'error');
      }
    } catch (error: any) {
      console.error('Parsing error:', error);
      showToast('Lỗi khi phân tích tệp: ' + error.message, 'error');
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const processTextWithAI = async (text: string, sourceName: string) => {
    const prompt = `Bạn là trợ lý AI thông minh chuyên trách trích xuất lịch công tác. Hãy trích xuất lịch công tác từ văn bản sau đây thành định dạng JSON chính xác.
    
    NGUYÊN TẮC TỐI THƯỢNG:
    1. GIỮ NGUYÊN NỘI DUNG GỐC: Tuyệt đối không được thay đổi, chỉnh sửa, tóm tắt, diễn đạt lại hay thêm bớt bất kỳ từ ngữ nào. Trích xuất ĐÚNG VÀ ĐỦ 100% như trong văn bản gốc cho các trường: tên hội nghị (name), địa điểm (location), người chủ trì (chairperson), thành phần (participants), và ghi chú (description).
    2. KHÔNG LÀM MƯỢT VĂN BẢN: Không được tự ý thay đổi văn phong, thuật ngữ hay cách trình bày của văn bản gốc.
    3. TRÍCH XUẤT ĐẦY ĐỦ: Đảm bảo không bỏ sót bất kỳ thông tin nào liên quan đến cuộc họp, đặc biệt là thành phần tham dự và các ghi chú đi kèm.
    
    Yêu cầu kỹ thuật:
    1. Định dạng JSON: { 
      meetings: { date: string, time: string, name: string, location: string, chairperson: string, participants: string, description: string, priority: "low"|"medium"|"high" }[], 
      tasks: { title: string, deadline: string, description: string, priority: "low"|"medium"|"high" }[] , 
      events: { name: string, date: string, time: string, location: string, description: string }[] 
    }.
    2. Định dạng ngày tháng PHẢI là YYYY-MM-DD.
    3. Trường 'name': Tên hội nghị/cuộc họp (giữ nguyên văn).
    4. Trường 'chairperson': Người chủ trì (giữ nguyên văn).
    5. Trường 'participants': Trích xuất toàn bộ thông tin "Thành phần tham dự" (giữ nguyên văn).
    6. Trường 'description': Trích xuất toàn bộ các ghi chú, nội dung chi tiết, hoặc thông tin khác đi kèm (giữ nguyên văn).
    7. Chỉ trả về JSON, không giải thích gì thêm.
    
    Văn bản gốc (${sourceName}): ${text}`;

    const aiResponse = await generateContentWithRetry({
      model: 'gemini-3.1-pro-preview',
      contents: [{ parts: [{ text: prompt }] }]
    });
    
    const parsedData = parseAIResponse(aiResponse.text || '{}');
    
    if (parsedData && parsedData.meetings && parsedData.meetings.length > 0) {
      await updateMeetings(prev => [...prev, ...parsedData.meetings.map((m: any) => ({ ...m, id: Math.random().toString(36).substr(2, 9) }))]);
    }
    if (parsedData.tasks && parsedData.tasks.length > 0) {
      await updateTasks(prev => [...prev, ...parsedData.tasks.map((t: any) => ({ ...t, id: Math.random().toString(36).substr(2, 9) }))]);
    }
    if (parsedData.events && parsedData.events.length > 0) {
      await updateEvents(prev => [...prev, ...parsedData.events.map((e: any) => ({ ...e, id: Math.random().toString(36).substr(2, 9) }))]);
    }
    
    showToast(`Đã cập nhật lịch công tác từ ${sourceName} thành công!`, 'success');
  };

  const handleSaveToKnowledge = async () => {
    const weekStart = format(currentWeekStart, 'dd/MM/yyyy');
    const weekEnd = format(addDays(currentWeekStart, 6), 'dd/MM/yyyy');
    
    let summary = `Lịch công tác tuần từ ${weekStart} đến ${weekEnd}:\n\n`;
    
    Array.from({ length: 7 }).forEach((_, i) => {
      const day = addDays(currentWeekStart, i);
      const { meetings: dayMeetings, events: dayEvents, tasks: dayTasks } = getDaySchedule(day);
      
      if (dayMeetings.length > 0 || dayEvents.length > 0 || dayTasks.length > 0) {
        summary += `--- ${format(day, 'EEEE, dd/MM', { locale: vi })} ---\n`;
        dayEvents.forEach(e => summary += `[Sự kiện] ${e.name}${e.location ? ` tại ${e.location}` : ''}${e.description ? `. Chi tiết: ${e.description}` : ''}\n`);
        dayTasks.forEach(t => summary += `[Nhiệm vụ] ${t.title}${t.description ? `. Chi tiết: ${t.description}` : ''}\n`);
        dayMeetings.forEach(m => summary += `[Họp] ${m.time}: ${m.name} tại ${m.location || 'Chưa rõ'} (Chủ trì: ${m.chairperson || 'Chưa rõ'})${m.participants ? `. Thành phần: ${m.participants}` : ''}${m.description ? `. Ghi chú: ${m.description}` : ''}\n`);
        summary += '\n';
      }
    });

    try {
      await smartLearnFromText(summary, ['lịch công tác', 'tuần', 'kế hoạch']);
      showToast('Đã gửi lịch công tác tuần cho AI phân tích. Vui lòng kiểm tra và xác nhận trong bảng hiện ra.', 'success');
    } catch (error) {
      console.error('Lỗi khi lưu vào bộ nhớ:', error);
      showToast('Có lỗi xảy ra khi gửi dữ liệu cho AI.', 'error');
    }
  };
  
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const scheduleStats = useMemo(() => {
    const weekStart = startOfDay(currentWeekStart);
    const weekEnd = endOfDay(addDays(currentWeekStart, 6));

    const weekMeetings = meetings.filter(m => {
      const d = parseISO(m.date);
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    });

    const highPriorityCount = weekMeetings.filter(m => m.priority === 'high').length;
    const totalDuration = weekMeetings.length * 60;

    // Conflict detection algorithm
    const conflicts: Record<string, string[]> = {};
    const processedPairs = new Set<string>();

    weekMeetings.forEach(m => {
      const dayMeetings = weekMeetings.filter(other => other.date === m.date && other.id !== m.id);
      dayMeetings.forEach(other => {
        const pairId = [m.id, other.id].sort().join('-');
        if (processedPairs.has(pairId)) return;
        processedPairs.add(pairId);

        const mStart = m.time || '00:00';
        const otherStart = other.time || '00:00';
        // Assume 1h duration if not specified
        const mParts = mStart.split(':');
        const h = parseInt(mParts[0]) || 0;
        const min = parseInt(mParts[1]) || 0;
        const mEnd = `${(h + 1).toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        
        const oParts = otherStart.split(':');
        const oh = parseInt(oParts[0]) || 0;
        const omin = parseInt(oParts[1]) || 0;
        const otherEnd = `${(oh + 1).toString().padStart(2, '0')}:${omin.toString().padStart(2, '0')}`;

        // Check for overlap: (StartA < EndB) and (EndA > StartB)
        if (mStart < otherEnd && mEnd > otherStart) {
          if (!conflicts[m.date]) conflicts[m.date] = [];
          conflicts[m.date].push(`Trùng giờ: ${m.name} (${m.time}) & ${other.name} (${other.time})`);
        }
      });
    });

    return {
      totalMeetings: weekMeetings.length,
      highPriorityCount,
      totalDuration,
      conflicts,
      busiestDay: weekDays[0]
    };
  }, [meetings, weekDays, currentWeekStart]);

  const getDaySchedule = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayMeetings = meetings.filter(m => m.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
    const dayEvents = events.filter(e => e.date === dateStr);
    const dayTasks = tasks.filter(t => t.deadline === dateStr);
    return { meetings: dayMeetings, events: dayEvents, tasks: dayTasks };
  };

  return (
    <div className="space-y-8">
      {/* Executive Summary Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-1 md:col-span-2 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-8 text-white shadow-xl shadow-indigo-200 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] -mr-32 -mt-32" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                  <Sparkles size={24} className="text-blue-100" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">Tầm nhìn Tuần mới</h2>
                  <p className="text-xs font-bold text-blue-100 uppercase tracking-widest opacity-80">Chiến lược & Hiệu suất</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleClearAll}
                  className="p-2 bg-rose-500/20 hover:bg-rose-500/40 text-rose-100 rounded-xl backdrop-blur-md transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest border border-rose-500/30"
                  title="Xóa tất cả dữ liệu lịch trình"
                >
                  <Trash2 size={16} />
                  <span>Xóa hết</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept=".doc,.docx,.pdf,.csv,.ics"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isParsing}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-md transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                >
                  {isUploading || isParsing ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
                  <span>Import Lịch</span>
                </button>
                <button 
                  onClick={onSwitchToCreate}
                  className="p-2 bg-white text-indigo-600 rounded-xl shadow-lg hover:scale-105 transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                >
                  <Plus size={16} />
                  <span>Thêm mới</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <div className="text-blue-200 mb-1"><TrendingUp size={16} /></div>
                <div className="text-lg font-black">85%</div>
                <div className="text-[9px] font-bold uppercase tracking-wider opacity-60">Mật độ lịch</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <div className="text-amber-300 mb-1"><ShieldAlert size={16} /></div>
                <div className="text-lg font-black">{scheduleStats.highPriorityCount}</div>
                <div className="text-[9px] font-bold uppercase tracking-wider opacity-60">Trọng điểm</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <div className="text-emerald-300 mb-1"><Zap size={16} /></div>
                <div className="text-lg font-black">{Math.round(scheduleStats.totalDuration / 60)}h</div>
                <div className="text-[9px] font-bold uppercase tracking-wider opacity-60">Tổng thời gian</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <p className="text-sm font-medium text-blue-50 italic">
                "Tuần này tập trung vào công tác cơ sở và chuẩn bị Đại hội."
              </p>
              <button 
                onClick={() => onNavigate('strategic')}
                className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform"
              >
                Phân tích AI
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col gap-6"
        >
          {/* Smart AI Input */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Thêm nhanh AI</h3>
                <p className="text-[10px] font-bold text-slate-400">Nhập bằng ngôn ngữ tự nhiên</p>
              </div>
            </div>
            
            <form onSubmit={handleSmartInput} className="space-y-3">
              <textarea 
                value={smartInput}
                onChange={(e) => setSmartInput(e.target.value)}
                placeholder="VD: Sáng mai họp giao ban lúc 8h tại phòng họp 1..."
                className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:bg-white focus:border-blue-500 outline-none transition-all resize-none"
              />
              <button 
                type="submit"
                disabled={!smartInput.trim() || isSmartProcessing}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isSmartProcessing ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Thêm lịch ngay
              </button>
            </form>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Conflict Alerts */}
          <div className="flex-1 flex flex-col min-h-0">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              Cảnh báo Xung đột
            </h3>
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[240px] pr-2 custom-scrollbar">
              {Object.keys(scheduleStats.conflicts).length > 0 ? (
                Object.entries(scheduleStats.conflicts).map(([date, msgs]) => (
                  <div key={date} className="p-4 bg-rose-50 border border-rose-100 rounded-2xl space-y-2">
                    <div className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{date}</div>
                    {msgs.map((msg, i) => (
                      <p key={i} className="text-xs font-bold text-rose-700 flex items-start gap-2">
                        <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                        {msg}
                      </p>
                    ))}
                  </div>
                ))
              ) : (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col items-center justify-center text-center py-8">
                  <CheckCircle2 size={32} className="text-emerald-500 mb-2" />
                  <p className="text-xs font-bold text-emerald-700">Lịch trình tuần này rất khoa học. Không phát hiện xung đột lớn.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Optimized Timeline View */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 italic">
              <CalendarIcon className="text-indigo-600" size={20} />
              Lộ trình Công tác Tuần
            </h3>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button 
                onClick={handlePrevWeek}
                className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-600 transition-all"
                title="Tuần trước"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={handleResetWeek}
                className="px-3 py-1.5 hover:bg-white hover:shadow-sm rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all"
              >
                Hiện tại
              </button>
              <button 
                onClick={handleNextWeek}
                className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-600 transition-all"
                title="Tuần sau"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSaveToKnowledge}
              disabled={isLearning}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100"
            >
              {isLearning ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
              <span>Ghi vào bộ nhớ</span>
            </button>
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <button className="p-2 bg-white shadow-sm rounded-lg text-indigo-600"><LayoutGrid size={16} /></button>
              <button className="p-2 text-slate-500 hover:text-slate-900"><ListIcon size={16} /></button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {weekDays.map((day, idx) => {
            const { meetings: dayMeetings, events: dayEvents, tasks: dayTasks } = getDaySchedule(day);
            const isToday = isSameDay(day, today);
            
            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  "flex flex-col min-h-[300px] rounded-3xl border transition-all",
                  isToday 
                    ? "bg-white border-indigo-500 shadow-xl shadow-indigo-100 ring-1 ring-indigo-500/20" 
                    : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md"
                )}
              >
                <div className={cn(
                  "p-4 border-b text-center",
                  isToday ? "bg-indigo-600 text-white rounded-t-[22px]" : "bg-slate-50/50 text-slate-600 rounded-t-[22px]"
                )}>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                    {format(day, 'EEEE', { locale: vi })}
                  </div>
                  <div className="text-2xl font-black tracking-tighter">
                    {format(day, 'dd/MM')}
                  </div>
                </div>

                <div className="p-3 flex-1 space-y-3 overflow-y-auto max-h-[400px] custom-scrollbar">
                  <button 
                    onClick={onSwitchToCreate}
                    className="w-full py-2 border border-dashed border-slate-200 rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center justify-center gap-1"
                  >
                    <Plus size={12} />
                    Thêm
                  </button>
                  
                  {scheduleStats.conflicts[format(day, 'yyyy-MM-dd')] && (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-600">
                      <AlertTriangle size={12} />
                      <span className="text-[9px] font-black uppercase">Có xung đột</span>
                    </div>
                  )}
                  
                  {dayEvents.map(e => (
                    <div 
                      key={e.id} 
                      onClick={() => { setSelectedItem(e); setSelectedType('event'); }}
                      className="group relative p-2 bg-rose-50 border border-rose-100 rounded-xl cursor-pointer hover:bg-rose-100 transition-colors"
                    >
                      <div className="text-[8px] font-black text-rose-600 uppercase tracking-widest mb-1">Sự kiện</div>
                      <div className="text-[10px] font-bold text-slate-900 leading-tight">{e.name}</div>
                      <button 
                        onClick={(ev) => { ev.stopPropagation(); handleDeleteEvent(e.id); }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-rose-200 rounded-full flex items-center justify-center text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}

                  {dayTasks.map(t => (
                    <div 
                      key={t.id} 
                      onClick={() => { setSelectedItem(t); setSelectedType('task'); }}
                      className="group relative p-2 bg-emerald-50 border border-emerald-100 rounded-xl cursor-pointer hover:bg-emerald-100 transition-colors"
                    >
                      <div className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Nhiệm vụ</div>
                      <div className="text-[10px] font-bold text-slate-900 leading-tight">{t.title}</div>
                      <button 
                        onClick={(ev) => { ev.stopPropagation(); handleDeleteTask(t.id); }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-emerald-200 rounded-full flex items-center justify-center text-emerald-400 hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}

                  {dayMeetings.length > 0 ? (
                    dayMeetings.map(m => (
                      <div 
                        key={m.id} 
                        onClick={() => { setSelectedItem(m); setSelectedType('meeting'); }}
                        className="p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-indigo-50 hover:border-indigo-200 transition-all group cursor-pointer relative"
                      >
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1.5">
                          <Clock size={10} />
                          {m.time}
                        </div>
                        <div className="text-[11px] font-bold text-slate-900 leading-snug mb-2 group-hover:text-indigo-700 transition-colors">
                          {m.name}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                            <MapPin size={10} className="text-rose-400" />
                            <span className="truncate">{m.location || 'Chưa rõ'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                            <Users size={10} className="text-blue-400" />
                            <span className="truncate">{m.chairperson || 'Chưa rõ'}</span>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteMeeting(m.id); }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center py-8 opacity-20 grayscale">
                      <CalendarIcon size={32} className="text-slate-300 mb-2" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Trống</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
          >
            <div className={cn(
              "p-6 text-white relative",
              selectedType === 'meeting' ? "bg-gradient-to-br from-indigo-600 to-blue-700" :
              selectedType === 'task' ? "bg-gradient-to-br from-emerald-600 to-teal-700" :
              "bg-gradient-to-br from-rose-600 to-pink-700"
            )}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="px-3 py-1 bg-white/20 rounded-full backdrop-blur-md text-[10px] font-black uppercase tracking-widest">
                    {selectedType === 'meeting' ? 'Lịch họp' : selectedType === 'task' ? 'Nhiệm vụ' : 'Sự kiện'}
                  </div>
                  <button 
                    onClick={() => { setSelectedItem(null); setSelectedType(null); }}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <Plus size={20} className="rotate-45" />
                  </button>
                </div>
                <h3 className="text-2xl font-black leading-tight tracking-tight">
                  {selectedType === 'task' ? selectedItem.title : selectedItem.name}
                </h3>
                <div className="mt-4 flex gap-2">
                  <button 
                    onClick={() => {
                      if (onEditItem) onEditItem(selectedItem);
                      setSelectedItem(null);
                    }}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-md text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                  >
                    <Edit2 size={14} />
                    Chỉnh sửa
                  </button>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày thực hiện</div>
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <CalendarIcon size={16} className="text-indigo-500" />
                    {format(parseISO(selectedType === 'task' ? selectedItem.deadline : selectedItem.date), 'EEEE, dd/MM/yyyy', { locale: vi })}
                  </div>
                </div>
                {(selectedItem.time || selectedType === 'meeting') && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời gian</div>
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <Clock size={16} className="text-amber-500" />
                      {selectedItem.time || 'Cả ngày'}
                    </div>
                  </div>
                )}
              </div>

              {selectedType === 'meeting' && (
                <>
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Địa điểm</div>
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <MapPin size={16} className="text-rose-500" />
                      {selectedItem.location || 'Chưa xác định'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chủ trì / Thành phần</div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-slate-900 font-bold">
                        <Users size={16} className="text-blue-500" />
                        {selectedItem.chairperson || 'Chưa rõ'}
                      </div>
                      {selectedItem.participants && (
                        <div className="text-xs text-slate-600 bg-blue-50 p-3 rounded-xl border border-blue-100 mt-1">
                          <span className="font-black text-[9px] uppercase tracking-wider text-blue-700 block mb-1">Thành phần chi tiết:</span>
                          {selectedItem.participants}
                        </div>
                      )}
                    </div>
                  </div>
                  {selectedItem.description && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nội dung / Ghi chú</div>
                      <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 whitespace-pre-wrap">
                        {selectedItem.description}
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedType === 'task' && (
                <>
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mô tả chi tiết</div>
                    <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      {selectedItem.description || 'Không có mô tả chi tiết cho nhiệm vụ này.'}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiến độ hoàn thành</div>
                      <div className="text-sm font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                        {selectedItem.progress || 0}%
                      </div>
                    </div>
                    <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${selectedItem.progress || 0}%` }}
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      />
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={selectedItem.progress || 0}
                        onChange={async (e) => {
                          const newProgress = parseInt(e.target.value);
                          const updatedItem = { 
                            ...selectedItem, 
                            progress: newProgress,
                            status: newProgress === 100 ? 'Completed' : newProgress > 0 ? 'In Progress' : 'Pending'
                          };
                          setSelectedItem(updatedItem);
                          await updateTasks(prev => prev.map(t => t.id === selectedItem.id ? updatedItem : t));
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>Bắt đầu</span>
                      <span>Hoàn thành</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</div>
                      <div className={cn(
                        "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                        selectedItem.status === 'Completed' ? "bg-emerald-100 text-emerald-700" :
                        selectedItem.status === 'In Progress' ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-700"
                      )}>
                        {selectedItem.status === 'Completed' ? 'Đã hoàn thành' : selectedItem.status === 'In Progress' ? 'Đang thực hiện' : 'Chờ xử lý'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Độ ưu tiên</div>
                      <div className={cn(
                        "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                        selectedItem.priority === 'high' ? "bg-rose-100 text-rose-700" :
                        selectedItem.priority === 'medium' ? "bg-amber-100 text-amber-700" :
                        "bg-blue-100 text-blue-700"
                      )}>
                        {selectedItem.priority === 'high' ? 'Cao' : selectedItem.priority === 'medium' ? 'Trung bình' : 'Thấp'}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {selectedType === 'event' && (
                <>
                  {selectedItem.location && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Địa điểm</div>
                      <div className="flex items-center gap-2 text-slate-900 font-bold">
                        <MapPin size={16} className="text-rose-500" />
                        {selectedItem.location}
                      </div>
                    </div>
                  )}
                  {selectedItem.description && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nội dung chi tiết</div>
                      <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 whitespace-pre-wrap">
                        {selectedItem.description}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="pt-6 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => { setSelectedItem(null); setSelectedType(null); }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-colors"
                >
                  Đóng
                </button>
                <button 
                  onClick={() => {
                    if (onEditItem) {
                      onEditItem({ ...selectedItem, type: selectedType });
                      setSelectedItem(null);
                      setSelectedType(null);
                    }
                  }}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  <Edit2 size={16} />
                  Chỉnh sửa
                </button>
                <button 
                  onClick={() => {
                    if (selectedType === 'meeting') handleDeleteMeeting(selectedItem.id);
                    else if (selectedType === 'task') handleDeleteTask(selectedItem.id);
                    else if (selectedType === 'event') handleDeleteEvent(selectedItem.id);
                    setSelectedItem(null);
                    setSelectedType(null);
                  }}
                  className="px-6 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl text-xs font-black uppercase tracking-widest transition-colors border border-rose-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
