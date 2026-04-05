import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lightbulb, 
  Sparkles, 
  Users, 
  Calendar, 
  MessageSquare, 
  ArrowRight, 
  Loader2, 
  Search,
  Zap,
  Target,
  Flag,
  TrendingUp,
  FileText,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../lib/utils';

interface AdvisoryResult {
  title: string;
  content: string;
  recommendations: string[];
  keyPoints: string[];
}

export const PartyAdvisory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'meeting' | 'briefing'>('meeting');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AdvisoryResult | null>(null);
  const [query, setQuery] = useState('');

  const generateAdvisory = async () => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = activeTab === 'meeting' 
        ? `Hãy gợi ý nội dung sinh hoạt chi bộ cho tháng hiện tại (Tháng 3/2026). 
           Dựa trên các nhiệm vụ chính trị trọng tâm của Đảng hiện nay.
           Hãy gợi ý:
           1. Chủ đề sinh hoạt chuyên đề sát thực tế.
           2. Nội dung trọng tâm cần thảo luận.
           3. Các giải pháp thực hiện cụ thể cho chi bộ.
           4. Các văn bản cần quán triệt.`
        : `Tham mưu nhanh cho Bí thư về nội dung chỉ đạo trong tuần này (Tuần 14/2026).
           Câu hỏi/Yêu cầu: "${query || 'Tuần này nên tập trung chỉ đạo gì?'}"
           Hãy phân tích tình hình thời sự, các chỉ đạo cấp trên và dữ liệu địa phương (giả định) để gợi ý:
           1. Các nhiệm vụ trọng tâm cần chỉ đạo ngay.
           2. Nội dung phát biểu/chỉ đạo gợi ý.
           3. Các rủi ro cần lưu ý.
           4. Các đơn vị cần đôn đốc.`;

      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json", responseSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            content: { type: "string" },
            recommendations: { type: "array", items: { type: "string" } },
            keyPoints: { type: "array", items: { type: "string" } }
          },
          required: ["title", "content", "recommendations", "keyPoints"]
        }}
      });

      const res = await model;
      setResult(JSON.parse(res.text || '{}'));
    } catch (error) {
      console.error("Advisory failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <Lightbulb size={24} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tham mưu Chiến lược AI</h1>
          </div>
          <p className="text-slate-500 font-medium max-w-xl">
            Trợ lý thông minh hỗ trợ gợi ý sinh hoạt chi bộ và tham mưu nhanh cho lãnh đạo dựa trên dữ liệu thực tế.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => { setActiveTab('meeting'); setResult(null); }}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
            activeTab === 'meeting' ? "bg-white text-amber-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Users size={14} />
          Gợi ý Sinh hoạt Chi bộ
        </button>
        <button
          onClick={() => { setActiveTab('briefing'); setResult(null); }}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
            activeTab === 'briefing' ? "bg-white text-amber-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Zap size={14} />
          Tham mưu nhanh cho Bí thư
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Control Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="space-y-4">
              <h3 className="font-black text-slate-900 uppercase tracking-wider text-sm">
                {activeTab === 'meeting' ? 'Cấu hình Gợi ý' : 'Nội dung yêu cầu'}
              </h3>
              
              {activeTab === 'meeting' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Thời điểm</p>
                    <p className="text-sm font-bold text-slate-700">Tháng 03/2026 - Quý I</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nhiệm vụ chính trị</p>
                    <p className="text-sm font-bold text-slate-700">Đại hội Đảng các cấp, Chuyển đổi số, Phát triển kinh tế xanh.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ví dụ: Tuần này nên tập trung chỉ đạo gì về công tác cán bộ?"
                    className="w-full h-32 p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-sm font-medium"
                  />
                </div>
              )}
            </div>

            <button
              onClick={generateAdvisory}
              disabled={isAnalyzing}
              className={cn(
                "w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg",
                isAnalyzing
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20 active:scale-[0.98]"
              )}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Đang phân tích...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  {activeTab === 'meeting' ? 'Gợi ý chuyên đề' : 'Tham mưu nhanh'}
                </>
              )}
            </button>
          </div>

          {/* Quick Tips */}
          <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 space-y-4">
            <div className="flex items-center gap-2 text-amber-700">
              <Info size={16} />
              <span className="text-xs font-black uppercase tracking-widest">Lưu ý nghiệp vụ</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed font-medium">
              Các gợi ý từ AI mang tính chất tham khảo dựa trên dữ liệu tổng hợp. Cần đối chiếu với tình hình thực tế tại đơn vị và các văn bản chỉ đạo mới nhất của cấp trên.
            </p>
          </div>
        </div>

        {/* Result Panel */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{result.title}</h2>
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                      <CheckCircle2 size={20} />
                    </div>
                  </div>

                  <div className="prose prose-slate max-w-none">
                    <p className="text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">{result.content}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                        <Target size={14} className="text-amber-500" />
                        Trọng tâm thảo luận
                      </h4>
                      <ul className="space-y-3">
                        {result.keyPoints.map((point, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm font-bold text-slate-700">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-4">
                      <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                        <Flag size={14} className="text-emerald-500" />
                        Giải pháp thực hiện
                      </h4>
                      <ul className="space-y-3">
                        {result.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm font-bold text-slate-700">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                    <button className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors">
                      <FileText size={14} />
                      Xuất văn bản dự thảo
                    </button>
                    <button className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
                      Lưu vào kho tri thức
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : isAnalyzing ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-6 h-full min-h-[500px]">
                <div className="relative">
                  <div className="w-20 h-20 bg-amber-100 rounded-full animate-ping absolute inset-0" />
                  <div className="w-20 h-20 bg-amber-500 rounded-full flex items-center justify-center text-white relative z-10">
                    <Sparkles size={40} className="animate-pulse" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">AI đang phân tích dữ liệu chiến lược</h3>
                  <p className="text-slate-500 font-medium max-w-xs mx-auto">Vui lòng đợi trong giây lát, trợ lý đang tổng hợp các chỉ đạo và tình hình thực tế...</p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-3xl border border-dashed border-slate-300 p-12 flex flex-col items-center justify-center text-center space-y-6 h-full min-h-[500px]">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                  <Lightbulb size={40} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-400 uppercase tracking-tight mb-2">Sẵn sàng tham mưu</h3>
                  <p className="text-slate-400 font-medium max-w-xs mx-auto">Chọn chức năng bên trái và nhấn nút để nhận các gợi ý chiến lược từ AI.</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const Info: React.FC<{ size?: number, className?: string }> = ({ size = 16, className }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);
