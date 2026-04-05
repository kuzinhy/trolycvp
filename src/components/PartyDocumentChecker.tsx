import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileCheck, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  Layout, 
  Type, 
  GitBranch, 
  Sparkles,
  ArrowRight,
  Download,
  Copy,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../lib/utils';

interface Issue {
  id: string;
  type: 'format' | 'wording' | 'logic';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  suggestion: string;
  originalText?: string;
}

export const PartyDocumentChecker: React.FC = () => {
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [score, setScore] = useState<number | null>(null);

  const analyzeDocument = async () => {
    if (!text.trim()) return;

    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              {
                text: `Bạn là một chuyên gia về thể thức văn bản Đảng (theo Quy định 66-QĐ/TW) và ngôn ngữ chính trị. 
                Hãy rà soát văn bản sau đây về 3 khía cạnh:
                1. Căn lề và Thể thức (Format): Kiểm tra các quy định về lề, font, cỡ chữ, cách trình bày tiêu đề, số hiệu...
                2. Cách dùng từ (Wording): Kiểm tra tính chính xác của thuật ngữ chính trị, văn phong Đảng, tránh từ ngữ Gen Z hoặc không trang trọng.
                3. Logic nội dung (Logic): Kiểm tra tính nhất quán, các mục tiêu, nhiệm vụ có logic với nhau không.

                Văn bản cần rà soát:
                "${text}"

                Hãy trả về kết quả dưới dạng JSON với cấu trúc:
                {
                  "score": number (0-100),
                  "issues": [
                    {
                      "type": "format" | "wording" | "logic",
                      "severity": "low" | "medium" | "high",
                      "title": "Tiêu đề lỗi",
                      "description": "Mô tả chi tiết lỗi",
                      "suggestion": "Gợi ý cách sửa",
                      "originalText": "Đoạn văn bản gốc bị lỗi (nếu có)"
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
      setIssues(data.issues || []);
      setScore(data.score || 0);
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-100';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-100';
      default: return 'text-blue-600 bg-blue-50 border-blue-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'format': return <Layout size={16} />;
      case 'wording': return <Type size={16} />;
      case 'logic': return <GitBranch size={16} />;
      default: return <Info size={16} />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
              <FileCheck size={24} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Rà soát Văn bản Đảng</h1>
          </div>
          <p className="text-slate-500 font-medium max-w-xl">
            Hệ thống AI tự động kiểm tra thể thức, ngôn từ và logic nghị quyết theo tiêu chuẩn nghiệp vụ Đảng.
          </p>
        </div>
        
        {score !== null && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4"
          >
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Điểm chất lượng</p>
              <p className="text-2xl font-black text-emerald-600">{score}/100</p>
            </div>
            <div className={cn(
              "w-12 h-12 rounded-full border-4 flex items-center justify-center font-black text-sm",
              score >= 80 ? "border-emerald-500 text-emerald-600" : 
              score >= 50 ? "border-amber-500 text-amber-600" : "border-red-500 text-red-600"
            )}>
              {score}%
            </div>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-emerald-600" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nội dung văn bản</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setText('')}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                  title="Xóa tất cả"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Dán nội dung văn bản Đảng cần rà soát tại đây..."
              className="flex-1 p-6 text-slate-700 bg-transparent resize-none focus:outline-none font-serif text-lg leading-relaxed"
            />
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={analyzeDocument}
                disabled={isAnalyzing || !text.trim()}
                className={cn(
                  "w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg",
                  isAnalyzing || !text.trim()
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20 active:scale-[0.98]"
                )}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Đang rà soát...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Bắt đầu rà soát AI
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6 h-[600px] overflow-y-auto custom-scrollbar">
            {!issues.length && !isAnalyzing ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center">
                  <FileCheck size={40} className="text-slate-400" />
                </div>
                <div>
                  <p className="font-black text-slate-600 uppercase tracking-wider">Chưa có dữ liệu phân tích</p>
                  <p className="text-sm text-slate-500">Hãy nhập văn bản và nhấn nút "Bắt đầu rà soát AI"</p>
                </div>
              </div>
            ) : isAnalyzing ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 animate-pulse space-y-3">
                    <div className="h-4 w-24 bg-slate-100 rounded" />
                    <div className="h-6 w-full bg-slate-50 rounded" />
                    <div className="h-4 w-2/3 bg-slate-50 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-slate-900 uppercase tracking-wider text-sm">Kết quả rà soát ({issues.length})</h3>
                  <div className="flex gap-2">
                    <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                      <Download size={16} />
                    </button>
                    <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                      <Copy size={16} />
                    </button>
                  </div>
                </div>

                <AnimatePresence mode="popLayout">
                  {issues.map((issue, idx) => (
                    <motion.div
                      key={issue.id || idx}
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                          getSeverityColor(issue.severity)
                        )}>
                          {getTypeIcon(issue.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                              issue.type === 'format' ? "bg-blue-100 text-blue-700" :
                              issue.type === 'wording' ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"
                            )}>
                              {issue.type === 'format' ? 'Thể thức' : issue.type === 'wording' ? 'Ngôn từ' : 'Logic'}
                            </span>
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-md",
                              issue.severity === 'high' ? "bg-red-100 text-red-700" :
                              issue.severity === 'medium' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                            )}>
                              {issue.severity === 'high' ? 'Nghiêm trọng' : issue.severity === 'medium' ? 'Cần lưu ý' : 'Gợi ý'}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 mb-2 leading-tight">{issue.title}</h4>
                          <p className="text-sm text-slate-600 mb-4 leading-relaxed">{issue.description}</p>
                          
                          {issue.originalText && (
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-3 italic text-sm text-slate-500 relative">
                              <span className="absolute -top-2 -left-1 bg-slate-200 text-[8px] font-black px-1 rounded uppercase">Gốc</span>
                              "{issue.originalText}"
                            </div>
                          )}

                          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-start gap-3">
                            <Sparkles size={14} className="text-emerald-600 mt-1 shrink-0" />
                            <div>
                              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">Gợi ý sửa đổi</p>
                              <p className="text-sm text-emerald-800 font-medium leading-relaxed">{issue.suggestion}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guidelines Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: <Layout className="text-blue-500" />, title: "Quy định 66-QĐ/TW", desc: "Đảm bảo chuẩn xác về thể thức, lề, font chữ và cách trình bày văn bản Đảng." },
          { icon: <Type className="text-purple-500" />, title: "Ngôn ngữ Chính trị", desc: "Rà soát tính chính xác của thuật ngữ, văn phong trang trọng, đúng chuẩn mực." },
          { icon: <GitBranch className="text-emerald-500" />, title: "Logic Nghị quyết", desc: "Kiểm tra tính nhất quán giữa mục tiêu, chỉ tiêu và các giải pháp thực hiện." }
        ].map((item, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 flex items-start gap-4">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0">
              {item.icon}
            </div>
            <div>
              <h5 className="font-bold text-slate-900 text-sm mb-1">{item.title}</h5>
              <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
