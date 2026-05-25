import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
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
  const [activeTab, setActiveTab] = useState<'meeting' | 'briefing' | 'strategic'>('meeting');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AdvisoryResult | null>(null);
  const [query, setQuery] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');

  const generateAdvisory = async () => {
    setIsAnalyzing(true);
    try {
      const apiKeyToUse = customApiKey.trim() || process.env.GEMINI_API_KEY;
      if (!apiKeyToUse) {
        throw new Error("Không có API Key. Vui lòng nhập Token hệ thống hoặc kiểm tra cấu hình chung.");
      }
      
      const ai = new GoogleGenAI({ apiKey: apiKeyToUse });
      let prompt = '';
      
      const citationInstruction = "QUAN TRỌNG: Bạn PHẢI trích dẫn rõ nguồn gốc (như: Theo Chỉ thị/Nghị quyết số..., trên Báo Điện tử Đảng Cộng sản, Cổng thông tin Chính phủ...) cho các thông tin, chủ trương đưa ra để đảm bảo tính tin cậy tuyệt đối.";
      
      if (activeTab === 'meeting') {
        const currentDate = format(new Date(), 'MM/yyyy', { locale: vi });
        prompt = `Bạn là Trợ lý tham mưu chuyên nghiệp của cơ quan Đảng. Hãy gợi ý nội dung sinh hoạt chi bộ cho thời điểm hiện tại (Tháng ${currentDate}). 
           Dựa trên các nhiệm vụ chính trị trọng tâm, các định hướng của Trung ương, Thành ủy, địa phương và các vấn đề thời sự nổi bật nhất hiện nay.
           Hãy gợi ý:
           1. Chủ đề sinh hoạt chuyên đề sát với thời gian thực và tình hình thực tế.
           2. Nội dung trọng tâm cần thảo luận (gắn với các vấn đề đang 'nóng' cần giải quyết).
           3. Các giải pháp thực hiện cụ thể cho chi bộ.
           4. Các văn bản chỉ đạo mới nhất cần quán triệt.
           ${citationInstruction}`;
      } else if (activeTab === 'briefing') {
        prompt = `Tham mưu nhanh cho Bí thư về nội dung chỉ đạo trong tuần này.
           Câu hỏi/Yêu cầu: "${query || 'Tuần này nên tập trung chỉ đạo gì?'}"
           Hãy phân tích tình hình thời sự, các chỉ đạo cấp trên và dữ liệu địa phương (giả định) để gợi ý:
           1. Các nhiệm vụ trọng tâm cần chỉ đạo ngay.
           2. Nội dung phát biểu/chỉ đạo gợi ý.
           3. Các rủi ro cần lưu ý.
           4. Các đơn vị cần đôn đốc.
           ${citationInstruction}`;
      } else if (activeTab === 'strategic') {
        prompt = `Bạn là Trợ lý Tham mưu Chiến lược cho Bí thư Đảng ủy. 
           Nhiệm vụ: Đề xuất các giải pháp tham mưu cho Bí thư Đảng ủy để thực hiện hiệu quả nhiệm vụ: '${query || '[MÔ TẢ NHIỆM VỤ CỤ THỂ]'}'
           Yêu cầu:
           1. Nội dung đề xuất cần ngắn gọn, có trọng tâm và mang tính thực tiễn cao.
           2. Phân tích các bước thực hiện then chốt.
           3. Đề xuất các giải pháp đột phá hoặc giải quyết nút thắt.
           4. Dự báo các khó khăn và cách khắc phục.
           ${citationInstruction}`;
      }

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
            Trợ lý thông minh hỗ trợ gợi ý lịch công tác và tham mưu chiến lược, tự động hóa quy trình quản trị nội bộ Đảng ủy.
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
          Tham mưu nhanh
        </button>
        <button
          onClick={() => { setActiveTab('strategic'); setResult(null); }}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
            activeTab === 'strategic' ? "bg-white text-amber-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Target size={14} />
          Tham mưu Nhiệm vụ
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Control Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="space-y-4">
              <h3 className="font-black text-slate-900 uppercase tracking-wider text-sm">
                {activeTab === 'meeting' ? 'Trí tuệ nhân tạo Tự động' : activeTab === 'briefing' ? 'Nội dung yêu cầu' : 'Mô tả nhiệm vụ cụ thể'}
              </h3>
              
              {activeTab === 'meeting' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600 mt-0.5">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-blue-900 mb-1">Tự động hóa hoàn toàn</p>
                      <p className="text-xs text-blue-700/80 leading-relaxed font-medium">Hệ thống AI sẽ tự động phân tích thời gian thực (tháng hiện tại), liên kết các chỉ đạo mới nhất của Trung ương, Thành ủy và các điểm nóng thời sự để đề xuất nội dung sinh hoạt phù hợp nhất.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={activeTab === 'briefing' ? "Ví dụ: Tuần này nên tập trung chỉ đạo gì về công tác cán bộ?" : "Mô tả nhiệm vụ cụ thể cần tham mưu giải pháp..."}
                    className="w-full h-32 p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-sm font-medium"
                  />
                </div>
              )}
              
              <div className="pt-2 border-t border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Sử dụng GEMINI TOKEN riêng (Tuỳ chọn)
                </label>
                <input
                  type="password"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  placeholder="Nhập API Key nếu sử dụng token khác..."
                  className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-xs font-medium"
                />
              </div>
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
                  {activeTab === 'meeting' ? 'Gợi ý chuyên đề' : activeTab === 'briefing' ? 'Tham mưu nhanh' : 'Đề xuất giải pháp'}
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
                <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-indigo-200 shadow-[0_0_40px_-15px_rgba(99,102,241,0.2)] space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-transparent blur-3xl rounded-full pointer-events-none" />
                  <div className="flex items-center justify-between relative z-10">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{result.title}</h2>
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                      <CheckCircle2 size={20} />
                    </div>
                  </div>

                  <div className="prose prose-slate max-w-none relative z-10">
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
              <div className="bg-[#fafafd]/50 backdrop-blur-xl p-12 rounded-3xl border border-indigo-100 shadow-sm flex flex-col items-center justify-center text-center space-y-6 h-full min-h-[500px] relative overflow-hidden">
                {/* Tech background elements */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-[-50%] border-[0.5px] border-indigo-200/40 rounded-full opacity-30"
                  style={{ backgroundImage: 'radial-gradient(circle, transparent 50%, rgba(99,102,241,0.1) 100%)' }}
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  className="absolute w-[150%] h-[150%] border-[1px] border-blue-200/30 rounded-full opacity-30"
                  style={{ borderStyle: 'dashed' }}
                />
                <div className="relative z-10 space-y-8">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center text-white relative shadow-2xl shadow-indigo-500/30 overflow-hidden">
                    <motion.div
                      animate={{ y: ['-100%', '100%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 bg-gradient-to-b from-transparent via-white/40 to-transparent blur-sm"
                    />
                    <Zap size={40} className="relative z-10" />
                  </div>
                  <div>
                    <motion.h3 
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="text-xl font-black text-slate-800 uppercase tracking-tight mb-3"
                    >
                      AI đang phân tích dữ liệu chiến lược
                    </motion.h3>
                    <p className="text-slate-500 font-medium max-w-sm mx-auto">
                      Hệ thống đang tổng hợp dữ liệu thực tế, các chỉ đạo mới nhất và trích xuất tri thức từ hệ thống...
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/40 backdrop-blur-md rounded-3xl border border-dashed border-indigo-200/70 p-12 flex flex-col items-center justify-center text-center space-y-6 h-full min-h-[500px]">
                <div className="relative">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 bg-indigo-100/50 rounded-full blur-xl"
                  />
                  <div className="w-20 h-20 bg-slate-50/80 backdrop-blur-sm rounded-full flex items-center justify-center text-indigo-300 relative z-10">
                    <Sparkles size={40} />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-700 uppercase tracking-tight mb-2">Hệ thống sẵn sàng tư vấn</h3>
                  <p className="text-slate-500 font-medium max-w-sm mx-auto">
                    Trí tuệ nhân tạo đã được tối ưu hóa cho công tác tham mưu. Kết quả được căn chỉnh phù hợp với văn phong chính trị, pháp lý cơ quan Đảng.
                  </p>
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
