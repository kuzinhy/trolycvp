import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, Sparkles, Copy, Check, Loader2, AlertCircle, Send, FileJson } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { generateContentWithRetry } from '../lib/ai-utils';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';

interface ExtractedAnalysis {
  entities: string[];
  sentiment: string;
  category: string;
  summary: string;
}

export const SmartDataExtractor: React.FC = () => {
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState<ExtractedAnalysis | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const extractData = async () => {
    if (!text.trim()) return;

    setIsExtracting(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
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
    } catch (err) {
      console.error('Error extracting data:', err);
      setError('Đã xảy ra lỗi khi phân tích văn bản. Vui lòng thử lại.');
    } finally {
      setIsExtracting(false);
    }
  };

  const copyToClipboard = () => {
    if (analysis) {
      navigator.clipboard.writeText(JSON.stringify(analysis, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
        </div>

        <div className="relative mb-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Dán văn bản thô, hợp đồng, báo cáo... vào đây để AI phân tích"
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
            Phân tích văn bản
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

      <AnimatePresence>
        {analysis && (
          <motion.div
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
