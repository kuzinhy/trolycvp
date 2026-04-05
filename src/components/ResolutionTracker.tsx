import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, 
  ClipboardList, 
  Users, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Plus, 
  Sparkles,
  Loader2,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../lib/utils';

interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  deadline: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  category: string;
}

export const ResolutionTracker: React.FC = () => {
  const [resolutionText, setResolutionText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<string | null>(null);

  const processResolution = async () => {
    if (!resolutionText.trim()) return;

    setIsProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              {
                text: `Bạn là một chuyên gia quản trị văn phòng Đảng ủy. Hãy bóc tách các nhiệm vụ cụ thể từ nghị quyết sau đây.
                Với mỗi nhiệm vụ, hãy xác định:
                1. Tiêu đề nhiệm vụ (ngắn gọn)
                2. Mô tả chi tiết (nội dung cần thực hiện)
                3. Đơn vị/Cá nhân chủ trì (gợi ý dựa trên nội dung)
                4. Thời hạn hoàn thành (nếu có trong văn bản, nếu không hãy gợi ý thời hạn phù hợp)
                5. Mức độ ưu tiên (thấp, trung bình, cao)
                6. Phân loại (Chính trị, Kinh tế, Văn hóa, Xây dựng Đảng...)

                Nghị quyết:
                "${resolutionText}"

                Hãy trả về kết quả dưới dạng JSON với cấu trúc:
                {
                  "summary": "Tóm tắt ngắn gọn tinh thần nghị quyết",
                  "tasks": [
                    {
                      "title": "Tên nhiệm vụ",
                      "description": "Nội dung",
                      "assignee": "Đơn vị chủ trì",
                      "deadline": "YYYY-MM-DD",
                      "priority": "low" | "medium" | "high",
                      "category": "Lĩnh vực"
                    }
                  ]
                }`
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const result = await model;
      const data = JSON.parse(result.text || '{}');
      setTasks(data.tasks.map((t: any, i: number) => ({ ...t, id: `task-${i}`, status: 'pending' })) || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error("Processing failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              <Target size={24} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Quản trị Nghị quyết AI</h1>
          </div>
          <p className="text-slate-500 font-medium max-w-xl">
            Tự động bóc tách nhiệm vụ, giao việc và theo dõi tiến độ thực hiện nghị quyết thông minh.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Area */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[650px]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-blue-600" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Văn bản Nghị quyết</span>
              </div>
            </div>
            <textarea
              value={resolutionText}
              onChange={(e) => setResolutionText(e.target.value)}
              placeholder="Dán nội dung nghị quyết cần bóc tách nhiệm vụ..."
              className="flex-1 p-6 text-slate-700 bg-transparent resize-none focus:outline-none font-serif text-lg leading-relaxed"
            />
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={processResolution}
                disabled={isProcessing || !resolutionText.trim()}
                className={cn(
                  "w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg",
                  isProcessing || !resolutionText.trim()
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20 active:scale-[0.98]"
                )}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Đang bóc tách...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Bóc tách nhiệm vụ AI
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tasks Display */}
        <div className="lg:col-span-8 space-y-6">
          {summary && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl text-white shadow-xl shadow-blue-600/20"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={18} className="text-blue-200" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">Tóm tắt tinh thần nghị quyết</span>
              </div>
              <p className="text-lg font-bold leading-relaxed">{summary}</p>
            </motion.div>
          )}

          <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6 h-[500px] overflow-y-auto custom-scrollbar">
            {!tasks.length && !isProcessing ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center">
                  <ClipboardList size={40} className="text-slate-400" />
                </div>
                <div>
                  <p className="font-black text-slate-600 uppercase tracking-wider">Chưa có danh sách nhiệm vụ</p>
                  <p className="text-sm text-slate-500">Hãy nhập nghị quyết và nhấn nút "Bóc tách nhiệm vụ AI"</p>
                </div>
              </div>
            ) : isProcessing ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 animate-pulse space-y-3">
                    <div className="h-4 w-24 bg-slate-100 rounded" />
                    <div className="h-6 w-full bg-slate-50 rounded" />
                    <div className="h-4 w-2/3 bg-slate-50 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {tasks.map((task, idx) => (
                    <motion.div
                      key={task.id}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                    >
                      <div className={cn(
                        "absolute top-0 left-0 w-1 h-full",
                        task.priority === 'high' ? "bg-red-500" : 
                        task.priority === 'medium' ? "bg-amber-500" : "bg-blue-500"
                      )} />
                      
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{task.category}</span>
                        <div className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                          task.priority === 'high' ? "bg-red-50 text-red-600" : 
                          task.priority === 'medium' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                        )}>
                          {task.priority}
                        </div>
                      </div>

                      <h4 className="font-bold text-slate-900 mb-2 leading-tight group-hover:text-blue-600 transition-colors">{task.title}</h4>
                      <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">{task.description}</p>

                      <div className="space-y-2 border-t border-slate-50 pt-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                          <Users size={14} className="text-slate-400" />
                          <span>{task.assignee}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                          <Calendar size={14} className="text-slate-400" />
                          <span>Hạn: {task.deadline}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-slate-200" />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chờ xử lý</span>
                        </div>
                        <button className="text-blue-600 hover:text-blue-700 transition-colors">
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Stats Summary */}
          {tasks.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng nhiệm vụ</p>
                  <p className="text-xl font-black text-slate-900">{tasks.length}</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ưu tiên cao</p>
                  <p className="text-xl font-black text-slate-900">{tasks.filter(t => t.priority === 'high').length}</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đã bóc tách</p>
                  <p className="text-xl font-black text-slate-900">100%</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
