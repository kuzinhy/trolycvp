import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, Sparkles, Copy, Check, Loader2, AlertCircle, FileJson, Calendar, ListTodo, AlertTriangle, Plus } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { generateContentWithRetry } from '../lib/ai-utils';
import { cn } from '../lib/utils';
import { useDashboardContext } from '../context/DashboardContext';
import { useToast } from '../hooks/useToast';

interface ExtractedAnalysis {
  entities: string[];
  sentiment: string;
  category: string;
  summary: string;
}

interface ExtractedSchedule {
  meetings: any[];
  tasks: any[];
  warnings: string[];
}

export const SmartDataExtractor: React.FC = () => {
  const [mode, setMode] = useState<'general' | 'schedule'>('schedule');
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState<ExtractedAnalysis | null>(null);
  const [scheduleData, setScheduleData] = useState<ExtractedSchedule | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const { addTask, updateMeetings, meetings, tasks } = useDashboardContext();
  const { showToast } = useToast();

  const [savingItems, setSavingItems] = useState<{ [key: string]: boolean }>({});

  const extractData = async () => {
    if (!text.trim()) return;

    setIsExtracting(true);
    setError(null);
    setAnalysis(null);
    setScheduleData(null);

    try {
      if (mode === 'general') {
        const response = await generateContentWithRetry({
          model: "gemini-3.5-flash",
          contents: [{ parts: [{ text: `Phân tích văn bản sau và trích xuất dữ liệu, định dạng JSON:\n\n${text}` }] }],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                entities: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Danh sách các thực thể quan trọng (người, địa điểm, tổ chức)." },
                sentiment: { type: Type.STRING, description: "Cảm xúc của văn bản (Tích cực, Tiêu cực, Trung tính)." },
                category: { type: Type.STRING, description: "Phân loại văn bản (Hành chính, Báo cáo, Công văn, Tờ trình...)." },
                summary: { type: Type.STRING, description: "Tóm tắt nội dung văn bản." }
              },
              required: ["entities", "sentiment", "category", "summary"]
            }
          }
        });
        const result = JSON.parse(response.text || '{}');
        setAnalysis(result);
      } else {
        // Schedule Mode
        const contextStr = `\n\n--- THÔNG TIN LỊCH TRÌNH HIỆN TẠI ĐỂ KIỂM TRA XUNG ĐỘT ---\n${JSON.stringify({ 
          existingMeetings: meetings.map(m => ({ date: m.date, time: m.time, name: m.name })),
          existingTasks: tasks.map(t => ({ deadline: t.deadline, name: t.title }))
        })}`;

        const response = await generateContentWithRetry({
          model: "gemini-3.5-flash",
          contents: [{ parts: [{ text: `Bạn là trợ lý AI. Hãy phân tích văn bản sau để trích xuất các mục lịch họp, sự kiện, hoặc nhiệm vụ công việc. Định dạng trả về là JSON.\n\n${text}${contextStr}` }] }],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                meetings: { 
                  type: Type.ARRAY, 
                  items: { 
                    type: Type.OBJECT, 
                    properties: { 
                      name: {type: Type.STRING, description: "Tên cuộc họp/sự kiện"}, 
                      date: {type: Type.STRING, description: "Ngày định dạng YYYY-MM-DD"}, 
                      time: {type: Type.STRING, description: "Giờ định dạng HH:mm"}, 
                      location: {type: Type.STRING, description: "Phòng họp / Địa điểm"}, 
                      chairperson: {type: Type.STRING, description: "Người chủ trì"}, 
                      participants: {type: Type.STRING, description: "Thành phần tham dự"}, 
                      description: {type: Type.STRING} 
                    } 
                  } 
                },
                tasks: { 
                  type: Type.ARRAY, 
                  items: { 
                    type: Type.OBJECT, 
                    properties: { 
                      title: {type: Type.STRING, description: "Tên nhiệm vụ"}, 
                      description: {type: Type.STRING}, 
                      deadline: {type: Type.STRING, description: "Hạn chót YYYY-MM-DD"}, 
                      time: {type: Type.STRING, description: "HH:mm (nếu có)"}, 
                      priority: {type: Type.STRING, description: "high, medium, low"}, 
                      category: {type: Type.STRING} 
                    } 
                  } 
                },
                warnings: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Cảnh báo thiết sót thông tin hoặc xung đột thời gian với lịch hiện tại" }
              }
            }
          }
        });
        const result = JSON.parse(response.text || '{}');
        setScheduleData(result);
      }
    } catch (err) {
      console.error('Error extracting data:', err);
      setError('Đã xảy ra lỗi khi phân tích văn bản. Vui lòng thử lại.');
    } finally {
      setIsExtracting(false);
    }
  };

  const copyToClipboard = () => {
    if (analysis || scheduleData) {
      navigator.clipboard.writeText(JSON.stringify(analysis || scheduleData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveMeeting = async (meeting: any, index: number) => {
    setSavingItems(prev => ({ ...prev, [`meeting-${index}`]: true }));
    try {
      const newMeeting = {
        id: Date.now().toString() + index,
        name: meeting.name,
        date: meeting.date,
        time: meeting.time || "08:00",
        location: meeting.location || "",
        chairperson: meeting.chairperson || "",
        participants: meeting.participants || "",
        description: meeting.description || ""
      };
      updateMeetings(prev => [...prev, newMeeting]);
      showToast("Đã lưu lịch họp thành công!", "success");
    } catch (err) {
      showToast("Lỗi khi lưu lịch", "error");
    }
    setSavingItems(prev => ({ ...prev, [`meeting-${index}`]: false }));
  };

  const handleSaveTask = async (task: any, index: number) => {
    setSavingItems(prev => ({ ...prev, [`task-${index}`]: true }));
    try {
      await addTask({
        title: task.title,
        description: task.description || "",
        deadline: task.deadline || new Date().toISOString().split('T')[0],
        time: task.time || "",
        priority: (task.priority as any) || "medium",
        status: "Pending",
        progress: 0,
        category: task.category || "Công việc chung"
      });
      showToast("Đã lưu nhiệm vụ thành công!", "success");
    } catch (err) {
      showToast("Lỗi khi lưu nhiệm vụ", "error");
    }
    setSavingItems(prev => ({ ...prev, [`task-${index}`]: false }));
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
              <Database size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Trợ lý Trích xuất Dữ liệu</h3>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">AI Data Extractor</p>
            </div>
          </div>
          
          <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setMode('schedule')}
              className={cn(
                "px-4 py-2 flex items-center gap-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all", 
                mode === 'schedule' ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Calendar size={14} /> Lịch & Nhiệm vụ
            </button>
            <button 
              onClick={() => setMode('general')}
              className={cn(
                "px-4 py-2 flex items-center gap-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all", 
                mode === 'general' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <FileJson size={14} /> Dữ liệu chung
            </button>
          </div>
        </div>

        <div className="relative mb-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={mode === 'schedule' 
              ? "Dán nội dung chỉ đạo, biên bản họp, văn bản hành chính... AI sẽ tìm thời gian, địa điểm, thành phần và xuất ra Lịch Họp & Nhiệm vụ"
              : "Dán văn bản thô vào đây để AI phân tích thực thể, cảm xúc và tóm tắt..."}
            className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-2xl resize-none focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 transition-all text-sm"
          />
          <button
            onClick={extractData}
            disabled={!text.trim() || isExtracting}
            className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-600/20"
          >
            {isExtracting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            {mode === 'schedule' ? 'Trích xuất Lịch trình' : 'Phân tích văn bản'}
          </button>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 border border-red-100"
          >
            <AlertCircle size={18} />
            <p className="text-sm font-medium">{error}</p>
          </motion.div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {mode === 'schedule' && scheduleData && (
          <motion.div
            key="schedule-results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {scheduleData.warnings && scheduleData.warnings.length > 0 && (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-amber-700 font-bold uppercase text-[10px] tracking-wider mb-2">
                  <AlertTriangle size={16} /> Nhận xét / Cảnh báo từ AI
                </div>
                <ul className="list-disc list-inside text-sm text-amber-800 space-y-1">
                  {scheduleData.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            {scheduleData.meetings && scheduleData.meetings.length > 0 && (
              <div className="glass-panel p-6">
                <div className="flex items-center gap-2 text-blue-700 mb-6 font-bold uppercase text-[10px] tracking-wider">
                  <Calendar size={16} /> Lịch Họp phát hiện được ({scheduleData.meetings.length})
                </div>
                <div className="grid gap-4">
                  {scheduleData.meetings.map((meeting, i) => (
                    <div key={i} className="bg-white border text-sm border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-4 justify-between group">
                      <div className="space-y-2 flex-1">
                        <h4 className="font-bold text-slate-900 text-base">{meeting.name}</h4>
                        <div className="grid grid-cols-2 gap-2 text-slate-600">
                          <p><span className="font-semibold">Thời gian:</span> {meeting.date} {meeting.time}</p>
                          <p><span className="font-semibold">Địa điểm:</span> {meeting.location || 'Chưa rõ'}</p>
                          <p><span className="font-semibold">Chủ trì:</span> {meeting.chairperson || 'Chưa rõ'}</p>
                          <p className="line-clamp-1"><span className="font-semibold">Thành phần:</span> {meeting.participants || 'Chưa rõ'}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <button 
                          onClick={() => handleSaveMeeting(meeting, i)}
                          disabled={savingItems[`meeting-${i}`]}
                          className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 w-full md:w-auto mt-4 md:mt-0"
                        >
                          {savingItems[`meeting-${i}`] ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14}/>} Lưu Lịch
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {scheduleData.tasks && scheduleData.tasks.length > 0 && (
              <div className="glass-panel p-6">
                <div className="flex items-center gap-2 text-indigo-700 mb-6 font-bold uppercase text-[10px] tracking-wider">
                  <ListTodo size={16} /> Nhiệm vụ phát hiện được ({scheduleData.tasks.length})
                </div>
                <div className="grid gap-4">
                  {scheduleData.tasks.map((task, i) => (
                    <div key={i} className="bg-white border text-sm border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-4 justify-between group">
                      <div className="space-y-2 flex-1">
                        <h4 className="font-bold text-slate-900 text-base">{task.title}</h4>
                        <p className="text-slate-600 text-xs line-clamp-2">{task.description}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-semibold uppercase">
                            Hạn: {task.deadline} {task.time}
                          </span>
                          <span className={cn(
                            "px-2 py-1 rounded-md text-[10px] font-semibold uppercase",
                            task.priority === 'high' ? "bg-red-50 text-red-600" : 
                            task.priority === 'medium' ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                          )}>
                            Ưu tiên: {task.priority}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <button 
                          onClick={() => handleSaveTask(task, i)}
                          disabled={savingItems[`task-${i}`]}
                          className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 w-full md:w-auto mt-4 md:mt-0"
                        >
                          {savingItems[`task-${i}`] ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14}/>} Giao việc
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {mode === 'general' && analysis && (
          <motion.div
            key="general-results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-panel p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-700">
                <Sparkles size={18} />
                <h4 className="font-bold text-sm uppercase tracking-wider">Kết quả phân tích</h4>
              </div>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 transition-all"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                {copied ? 'Đã sao chép' : 'Sao chép JSON'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cảm xúc</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{analysis.sentiment}</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phân loại</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{analysis.category}</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Số lượng thực thể</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{analysis.entities.length}</p>
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tóm tắt</p>
                <p className="text-sm text-slate-700">{analysis.summary}</p>
            </div>
            
            <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Thực thể chính</p>
                <div className="flex flex-wrap gap-2">
                    {analysis.entities.map((entity, i) => (
                        <span key={i} className="px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-semibold">{entity}</span>
                    ))}
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

