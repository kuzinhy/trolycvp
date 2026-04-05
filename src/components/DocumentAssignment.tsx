import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Sparkles, AlertTriangle, CheckCircle, Clock, Users, Building, ChevronRight, Loader2, Save, Copy, Check, Plus, Trash2, Upload } from 'lucide-react';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';
import { generateContentWithRetry } from '../lib/ai-utils';

interface Task {
  title: string;
  assigned_to: string;
  deadline: string;
  priority: 'high' | 'normal';
  status: 'pending';
}

interface ScheduleItem {
  time: string;
  event: string;
  location: string;
}

interface DocumentAnalysisResult {
  type: 'vanban' | 'lich' | 'chi_dao' | 'bao_cao';
  summary: string;
  analysis: {
    field: string;
    priority: 'high' | 'normal';
    objective: string;
  };
  tasks: Task[];
  schedule: ScheduleItem[];
  risk: string;
  final_text: string;
}

export const DocumentAssignment: React.FC = () => {
  const [documentText, setDocumentText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DocumentAnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const analyzeContent = async (content: string | { data: string, mimeType: string }, isFile: boolean = false) => {
    setIsAnalyzing(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Thiếu API Key của Gemini');
      }

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `
Bạn là “BỘ NÃO ĐIỀU HÀNH THÔNG MINH” cấp phường.
Nhiệm vụ: phân tích mọi yêu cầu/văn bản, xác định loại việc (văn bản, lịch, chỉ đạo, báo cáo), tóm tắt nội dung, phân tích mức độ và lĩnh vực, đề xuất ít nhất 2 phương án xử lý, phân công rõ cơ quan/chịu trách nhiệm, gán thời hạn, phát hiện rủi ro, và soạn nội dung hành chính hoàn chỉnh có thể dùng ngay.

Yêu cầu bắt buộc:
- Không trả lời chung chung
- Phải cụ thể, đúng thực tế cấp phường
- Có thể triển khai ngay

Luôn xuất kết quả DUY NHẤT dưới dạng JSON theo schema đã định nghĩa.

INPUT:
${isFile ? 'Tài liệu đính kèm' : content}
`;

      const contents: any = isFile ? [
        { inlineData: content },
        { text: prompt }
      ] : prompt;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: contents,
        config: {
          systemInstruction: "Bạn là BỘ NÃO ĐIỀU HÀNH THÔNG MINH cấp phường. Bạn phân tích văn bản, xác định loại việc, tóm tắt, phân tích, đề xuất phương án, phân công, gán thời hạn, phát hiện rủi ro và soạn nội dung hành chính hoàn chỉnh. Kết quả trả về phải là JSON tuân thủ schema.",
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ['vanban', 'lich', 'chi_dao', 'bao_cao'] },
              summary: { type: Type.STRING },
              analysis: {
                type: Type.OBJECT,
                properties: {
                  field: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ['high', 'normal'] },
                  objective: { type: Type.STRING }
                },
                required: ['field', 'priority', 'objective']
              },
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    assigned_to: { type: Type.STRING },
                    deadline: { type: Type.STRING },
                    priority: { type: Type.STRING, enum: ['high', 'normal'] },
                    status: { type: Type.STRING, enum: ['pending'] }
                  },
                  required: ['title', 'assigned_to', 'deadline', 'priority', 'status']
                }
              },
              schedule: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    time: { type: Type.STRING },
                    event: { type: Type.STRING },
                    location: { type: Type.STRING }
                  },
                  required: ['time', 'event', 'location']
                }
              },
              risk: { type: Type.STRING },
              final_text: { type: Type.STRING }
            },
            required: ['type', 'summary', 'analysis', 'tasks', 'schedule', 'risk', 'final_text']
          }
        }
      });

      const jsonStr = response.text?.trim();
      if (jsonStr) {
        const parsed = JSON.parse(jsonStr) as DocumentAnalysisResult;
        setResult(parsed);
        showToast('Phân tích văn bản thành công', 'success');
      }
    } catch (error) {
      console.error('Lỗi khi phân tích văn bản:', error);
      showToast('Có lỗi xảy ra khi phân tích văn bản', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!documentText.trim()) {
      showToast('Vui lòng nhập nội dung văn bản cần phân tích', 'warning');
      return;
    }
    await analyzeContent(documentText);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      let mimeType = file.type;
      if (!mimeType) {
        if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
        else if (file.name.endsWith('.txt')) mimeType = 'text/plain';
        else mimeType = 'application/octet-stream';
      }

      await analyzeContent({ data: base64Data, mimeType }, true);
    } catch (error) {
      console.error('Lỗi khi upload file:', error);
      showToast('Có lỗi xảy ra khi upload file', 'error');
    }
  };

  const handleCopy = () => {
    if (!result) return;
    
    let textToCopy = `KẾT QUẢ PHÂN TÍCH VĂN BẢN\n`;
    textToCopy += `- Loại việc: ${result.type}\n`;
    textToCopy += `- Lĩnh vực: ${result.analysis.field}\n`;
    textToCopy += `- Mức độ: ${result.analysis.priority}\n`;
    textToCopy += `- Mục tiêu: ${result.analysis.objective}\n`;
    textToCopy += `- Tóm tắt: ${result.summary}\n\n`;
    
    textToCopy += `NỘI DUNG HÀNH CHÍNH\n`;
    textToCopy += `${result.final_text}\n\n`;

    textToCopy += `NHIỆM VỤ\n`;
    result.tasks.forEach((task, index) => {
      textToCopy += `${index + 1}. ${task.title} - Đơn vị: ${task.assigned_to} - Hạn: ${task.deadline}\n`;
    });
    textToCopy += `\nLỊCH TRÌNH\n`;
    result.schedule.forEach((item, index) => {
      textToCopy += `${index + 1}. ${item.event} - Thời gian: ${item.time} - Địa điểm: ${item.location}\n`;
    });
    textToCopy += `\nRỦI RO: ${result.risk}\n`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Đã sao chép kết quả phân tích', 'success');
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <header className="flex-none px-8 py-6 border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-xl">
                <FileText className="text-white" size={24} />
              </div>
              Giao văn bản thông minh
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              Phân tích văn bản đến và tự động đề xuất ý kiến chỉ đạo, phân công nhiệm vụ
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel: Input */}
          <section className="flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                Nội dung văn bản
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                >
                  <Upload size={16} />
                  Tải lên
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.txt,.png,.jpg,.jpeg"
                  className="hidden"
                />
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !documentText.trim()}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all shadow-sm",
                    isAnalyzing || !documentText.trim()
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md"
                  )}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Đang phân tích...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Phân tích
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="flex-1 p-5">
              <textarea
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
                placeholder="Dán nội dung văn bản cần xử lý vào đây..."
                className="w-full h-full p-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 resize-none outline-none transition-all text-slate-700 leading-relaxed"
              />
            </div>
          </section>

          {/* Right Panel: Results */}
          <section className="flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500" />
                Kết quả phân tích
              </h2>
              {result && (
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    {copied ? 'Đã copy' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <AnimatePresence mode="wait">
                {!result ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                      <Sparkles size={32} className="text-slate-300" />
                    </div>
                    <p className="text-lg font-medium text-slate-500 mb-2">Chưa có dữ liệu</p>
                    <p className="text-sm max-w-sm">
                      Dán nội dung văn bản vào ô bên trái và bấm "Phân tích" để hệ thống xử lý.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* General Info */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <FileText size={16} className="text-blue-600" />
                        Thông tin phân tích
                      </h3>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Loại việc</p>
                          <p className="text-sm font-medium text-slate-900">{result.type}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Lĩnh vực</p>
                          <p className="text-sm font-medium text-slate-900">{result.analysis.field}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Mức độ</p>
                          <p className="text-sm font-medium text-slate-900">{result.analysis.priority}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Mục tiêu</p>
                          <p className="text-sm font-medium text-slate-900">{result.analysis.objective}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Tóm tắt</p>
                          <p className="text-sm text-slate-700 leading-relaxed">{result.summary}</p>
                        </div>
                      </div>
                    </div>

                    {/* Final Text */}
                    <div className="bg-blue-600 rounded-xl p-4 text-white shadow-md shadow-blue-200">
                      <h3 className="font-semibold mb-2 flex items-center gap-2 text-blue-100">
                        <Sparkles size={16} />
                        Nội dung hành chính
                      </h3>
                      <p className="text-sm font-medium leading-relaxed">{result.final_text}</p>
                    </div>

                    {/* Tasks */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <CheckCircle size={16} className="text-emerald-600" />
                        Nhiệm vụ ({result.tasks.length})
                      </h3>
                      <div className="space-y-3">
                        {result.tasks.map((task, idx) => (
                          <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                            <p className="text-sm font-medium text-slate-900 mb-2">{task.title}</p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
                              <span className="font-medium text-slate-900">Đơn vị: {task.assigned_to}</span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-semibold">
                                <Clock size={12} />
                                {task.deadline}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Schedule */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <Clock size={16} className="text-indigo-600" />
                        Lịch trình ({result.schedule.length})
                      </h3>
                      <div className="space-y-3">
                        {result.schedule.map((item, idx) => (
                          <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                            <p className="text-sm font-medium text-slate-900">{item.event}</p>
                            <p className="text-xs text-slate-500 mt-1">{item.time} - {item.location}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Risk */}
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                        <AlertTriangle size={16} />
                        Rủi ro cần lưu ý
                      </h3>
                      <p className="text-sm text-amber-700">{result.risk}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
