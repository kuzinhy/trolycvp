import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Network, Sparkles, Search, Loader2, ArrowRight, BookOpen, BrainCircuit } from 'lucide-react';
import { generateContentWithRetry, parseAIResponse } from '../lib/ai-utils';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';

interface KnowledgeLinkerProps {
  knowledge: any[];
}

interface Relationship {
  source: string;
  target: string;
  reason: string;
  type: string;
}

export const KnowledgeLinker: React.FC<KnowledgeLinkerProps> = ({ knowledge }) => {
  const [query, setQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    summary: string;
    relationships: Relationship[];
    insights: string[];
  } | null>(null);

  const handleAnalyze = async () => {
    if (!knowledge || knowledge.length === 0) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const knowledgeContext = knowledge.map((k, i) => `[Mục ${i + 1}]: ${k.content}`).join('\n\n');
      
      const prompt = `Từ khóa tìm kiếm quan tâm: "${query || 'Tất cả chủ đề'}".\nDưới đây là cơ sở tri thức hiện tại của hệ thống:\n${knowledgeContext}\n\nHãy đóng vai trò "Trình Kết nối tri thức" (Knowledge Linker) để phân tích và tìm ra các mối liên hệ ẩn, sự tương đồng và liên kết logic giữa các mục tri thức này. Trả về JSON với định dạng:\n{\n  "summary": "Tóm tắt ngắn gọn",\n  "relationships": [{ "source": "Tên chủ đề/mục A", "target": "Tên chủ đề/mục B", "reason": "Lý do liên kết", "type": "Tương đồng / Nhân quả / Trái ngược" }],\n  "insights": ["Phát hiện 1", "Phát hiện 2"]\n}`;

      const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      const parsed = parseAIResponse(response.text);
      if (parsed) {
        setAnalysisResult(parsed);
      } else {
        throw new Error("Không thể phân tích dữ liệu trả về");
      }
    } catch (e) {
      console.error(e);
      // Fallback in case of parsing errors or timeouts
      setAnalysisResult({
        summary: "Đã xảy ra lỗi khi phân tích.",
        relationships: [],
        insights: []
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-fuchsia-600 to-purple-700 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Network size={120} />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <BrainCircuit className="text-white" size={24} />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Bản đồ Tri thức 
            </h2>
          </div>
          <p className="text-fuchsia-100 font-medium text-sm leading-relaxed mb-6">
            Mô-đun "Kết nối tri thức" tự động phân tích cơ sở dữ liệu hiện tại, tìm ra các mối quan hệ ẩn giấu và cấu trúc lại thông tin thành mạng lưới tri thức toàn diện.
          </p>

          <div className="flex bg-white/10 rounded-2xl p-1.5 backdrop-blur-md border border-white/20">
            <div className="relative flex-1 flex items-center px-4">
              <Search size={18} className="text-fuchsia-200 shrink-0" />
              <input
                type="text"
                placeholder="Nhập từ khóa chủ đề (VD: Công nghệ) để phân tích liên kết..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent border-none text-white placeholder:text-fuchsia-200/70 focus:outline-none focus:ring-0 ml-3 text-sm font-medium"
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || knowledge.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-white text-fuchsia-700 rounded-xl font-bold text-sm hover:bg-fuchsia-50 transition-colors disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Đang phân tích...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Kết nối ngay
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {knowledge.length === 0 && (
        <div className="text-center py-12">
          <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">Cơ sở tri thức hiện tại đang trống. Vui lòng thêm tri thức trước khi phân tích liên kết.</p>
        </div>
      )}

      {analysisResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                <Network className="text-fuchsia-500" size={20} />
                Mạng lưới quan hệ
              </h3>
              
              <div className="space-y-4">
                {analysisResult.relationships.length > 0 ? (
                  analysisResult.relationships.map((rel, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 shadow-sm w-full sm:w-auto text-center line-clamp-2">
                        {rel.source}
                      </div>
                      <div className="flex shrink-0 flex-col items-center justify-center px-2 w-full sm:w-auto">
                        <span className="text-[10px] font-black uppercase tracking-wider text-fuchsia-600 mb-1 bg-fuchsia-100 px-2 py-0.5 rounded-full">
                          {rel.type}
                        </span>
                        <ArrowRight className="text-slate-300 rotate-90 sm:rotate-0" size={20} />
                      </div>
                      <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 shadow-sm w-full sm:w-auto text-center line-clamp-2">
                        {rel.target}
                      </div>
                      <div className="w-full sm:w-auto mt-2 sm:mt-0 text-xs font-medium text-slate-500 italic border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-4">
                        {rel.reason}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 italic">Không tìm thấy mối liên kết rõ ràng nào.</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
             <div className="bg-fuchsia-50 rounded-3xl p-6 border border-fuchsia-100">
              <h3 className="text-lg font-black text-fuchsia-900 mb-3">Tóm tắt Tổng thể</h3>
              <div className="text-sm text-fuchsia-800 font-medium leading-relaxed markdown-body">
                 <ReactMarkdown>{analysisResult.summary}</ReactMarkdown>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                <Sparkles className="text-amber-500" size={20} />
                Phát hiện cốt lõi
              </h3>
              <ul className="space-y-3">
                {analysisResult.insights.map((insight, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-slate-600 font-medium pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-600 font-bold flex items-center justify-center text-xs">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed pt-0.5">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
