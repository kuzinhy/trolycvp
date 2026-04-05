import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, Loader2, Copy, Check, Image as ImageIcon, Scan, AlertCircle, Sparkles, Brain, History, FileSearch, ShieldAlert, RefreshCw, ListChecks, Calendar, Users, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from '../hooks/useToast';
import { generateContentWithRetry } from '../lib/ai-utils';
import { Type } from "@google/genai";

export const DocumentReaderModule: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');
  const [docText, setDocText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeView, setActiveView] = useState<'text' | 'analysis'>('text');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const runOcrOnImage = async (file: File | string) => {
    setIsOcrRunning(true);
    setOcrProgress(0);
    setOcrStatus('Đang chuẩn bị OCR...');

    try {
      showToast('Tính năng OCR hiện không hỗ trợ.', 'warning');
      setIsOcrRunning(false);
      return;
    } catch (error) {
      console.error('OCR Error:', error);
      showToast?.('Lỗi khi nhận diện văn bản', 'error');
    } finally {
      setIsOcrRunning(false);
    }
  };


  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement> | File) => {
    const file = event instanceof File ? event : event.target.files?.[0];
    if (!file) return;

    // Advanced Validation
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    if (file.size > MAX_FILE_SIZE) {
      showToast?.('Tệp quá lớn (tối đa 20MB)', 'error');
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.toLowerCase().endsWith('.docx');
    const isDoc = file.type === 'application/msword' || file.name.toLowerCase().endsWith('.doc');
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name);

    if (!isPdf && !isDocx && !isDoc && !isImage) {
      showToast?.('Vui lòng chọn tệp PDF, Word hoặc Hình ảnh', 'error');
      return;
    }

    setIsUploading(true);
    setErrorDetails(null);
    setFileName(file.name);
    setFileType(file.type);
    setDocText('');
    setAnalysisResult(null);
    setActiveView('text');

    if (isImage) {
      await runOcrOnImage(file);
      setIsUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const performUpload = async (attempt = 0): Promise<void> => {
      try {
        const response = await fetch('/api/parse-document', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          if (response.status === 422 && isPdf) {
            showToast?.('Tệp PDF không chứa văn bản lớp trên.', 'error');
            return;
          }
          
          // Retry logic for server errors
          if (response.status >= 500 && attempt < 2) {
            console.log(`Retrying upload (attempt ${attempt + 1})...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            return performUpload(attempt + 1);
          }

          throw new Error(errorData.error || 'Lỗi khi đọc tệp');
        }

        const data = await response.json();
        if (data.text) {
          setDocText(data.text);
          showToast?.('Đọc tệp thành công', 'success');
        } else if (isPdf) {
          showToast?.('Tính năng OCR hiện không hỗ trợ.', 'warning');
        } else {
          throw new Error('Không tìm thấy nội dung văn bản trong tệp');
        }
      } catch (error: any) {
        console.error('Error parsing document:', error);
        setErrorDetails(error.message || 'Có lỗi xảy ra khi đọc tệp');
        showToast?.(error.message || 'Có lỗi xảy ra khi đọc tệp', 'error');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    await performUpload();
  };

  const analyzeDocument = async () => {
    if (!docText) return;
    setIsAnalyzing(true);
    setActiveView('analysis');
    try {
      const response = await generateContentWithRetry({
        model: "gemini-3.1-pro-preview",
        contents: [{ parts: [{ text: `Bạn là trợ lý tham mưu cấp uỷ – hành chính Nhà nước tại Việt Nam, có kinh nghiệm xử lý văn bản, phân công nhiệm vụ và soạn thảo chỉ đạo.

Nhiệm vụ:
Phân tích nội dung văn bản được cung cấp và trả về kết quả tham mưu có cấu trúc, chính xác, phù hợp với chức năng nhiệm vụ của từng cơ quan cấp phường/xã.

=====================
I. NGUYÊN TẮC PHÂN TÍCH
=====================

1. Không suy đoán sai chức năng cơ quan.
2. Nếu không chắc → mặc định:
   "UBND phường chủ trì"
3. Phân công rõ:
   - 01 cơ quan chủ trì
   - Có thể nhiều cơ quan phối hợp
4. Văn phong hành chính – Đảng:
   - Ngắn gọn
   - Rõ trách nhiệm
   - Trang trọng

=====================
II. NHẬN DIỆN VĂN BẢN
=====================

Xác định:
- Loại văn bản:
  (Công văn / Thông báo / Kết luận / Báo cáo / Kế hoạch / Tờ trình)
- Cơ quan ban hành (nếu có)
- Mức độ:
  - khẩn
  - bình thường

=====================
III. TRÍCH XUẤT NHIỆM VỤ
=====================

Tách các nhiệm vụ cụ thể từ văn bản:

Mỗi nhiệm vụ phải có:
- Nội dung công việc (task)
- Thời hạn (deadline) nếu có
- Tính chất:
  - khẩn / thường / định kỳ

Nếu không có thời hạn:
→ để trống và cảnh báo

=====================
IV. PHÂN CÔNG CƠ QUAN
=====================

Dựa vào nội dung để gợi ý:

Quy tắc ưu tiên:
- An ninh, trật tự → Công an
- Quân sự → Ban CHQS
- Thanh niên → Đoàn Thanh niên
- Tuyên truyền → Văn hóa – Thông tin
- Chính sách xã hội → LĐTBXH
- Tổng hợp, điều phối → UBND

Nếu liên quan nhiều lĩnh vực:
→ đề xuất phối hợp

=====================
V. CẢNH BÁO THAM MƯU
=====================

Phát hiện và cảnh báo:

- Thiếu thời hạn
- Nội dung nhạy cảm (an ninh, khiếu nại, chính trị)
- Nhiều đơn vị nhưng chưa rõ chủ trì
- Nội dung chung chung, khó triển khai

=====================
VI. ĐỀ XUẤT CHỈ ĐẠO
=====================

Với mỗi nhiệm vụ, tạo 01 câu chỉ đạo:

Yêu cầu:
- Đúng văn phong Đảng
- Rõ chủ trì – phối hợp
- Có hành động cụ thể

Ví dụ:
"Giao Công an phường chủ trì, phối hợp Đoàn Thanh niên tổ chức triển khai..."

=====================
INPUT:
${docText.substring(0, 30000)}` }] }], // Limit to avoid token issues
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              document_type: { type: Type.STRING },
              issued_by: { type: Type.STRING },
              urgency: { type: Type.STRING },
              summary: { type: Type.STRING },
              action_items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    task: { type: Type.STRING },
                    deadline: { type: Type.STRING },
                    priority: { type: Type.STRING },
                    lead_agency: { type: Type.STRING },
                    support_agency: { type: Type.ARRAY, items: { type: Type.STRING } },
                    note: { type: Type.STRING },
                    suggested_directive: { type: Type.STRING }
                  }
                }
              },
              warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
              general_directive: { type: Type.STRING }
            },
            required: ["document_type", "issued_by", "urgency", "summary", "action_items", "warnings", "general_directive"]
          }
        }
      });

      const result = JSON.parse(response.text);
      setAnalysisResult(result);
      showToast?.('Phân tích văn bản thành công', 'success');
    } catch (error) {
      console.error('Analysis Error:', error);
      showToast?.('Lỗi khi phân tích văn bản bằng AI', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopy = async () => {
    if (!docText) return;
    try {
      await navigator.clipboard.writeText(docText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      showToast?.('Đã sao chép nội dung', 'success');
    } catch (err) {
      console.error('Failed to copy text:', err);
      showToast?.('Không thể sao chép nội dung', 'error');
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-inner">
            <FileText size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Đọc tài liệu & OCR</h2>
            <p className="text-sm text-slate-500">Tải lên PDF, Word hoặc Hình ảnh để trích xuất nội dung</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isOcrRunning}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm shadow-rose-200"
          >
            {isUploading || isOcrRunning ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            <span>Tải lên tệp</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-6 bg-slate-50/30 relative">
        <AnimatePresence mode="wait">
          {errorDetails ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col items-center justify-center text-center p-8"
            >
              <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
                <ShieldAlert size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Có lỗi xảy ra</h3>
              <p className="text-slate-500 mb-6 max-w-md">{errorDetails}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setErrorDetails(null)}
                  className="px-6 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors flex items-center gap-2"
                >
                  <RefreshCw size={18} />
                  Thử lại
                </button>
              </div>
            </motion.div>
          ) : isUploading || isOcrRunning ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-slate-400"
            >
              <div className="relative w-24 h-24 mb-6">
                <Loader2 size={96} className="animate-spin text-rose-500 opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  {isOcrRunning ? <Scan size={32} className="text-rose-500 animate-pulse" /> : <Loader2 size={32} className="animate-spin text-rose-500" />}
                </div>
              </div>
              <p className="font-bold text-slate-700 text-lg">
                {isOcrRunning ? 'Đang nhận diện văn bản (OCR)...' : 'Đang xử lý tệp...'}
              </p>
              <p className="text-sm mt-2 text-slate-500">{ocrStatus || 'Vui lòng đợi trong giây lát'}</p>
              
              {isOcrRunning && (
                <div className="w-64 h-2 bg-slate-200 rounded-full mt-6 overflow-hidden">
                  <motion.div 
                    className="h-full bg-rose-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${ocrProgress}%` }}
                  />
                </div>
              )}
            </motion.div>
          ) : docText ? (
            <motion.div 
              key="content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                <div className="flex flex-1 items-center gap-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    {fileType.startsWith('image/') ? <ImageIcon size={16} className="text-rose-500" /> : <FileText size={16} className="text-rose-500" />}
                    <span className="truncate max-w-[200px]">{fileName}</span>
                  </div>
                  
                  <div className="flex bg-slate-200/50 p-1 rounded-lg">
                    <button
                      onClick={() => setActiveView('text')}
                      className={cn(
                        "px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                        activeView === 'text' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      Văn bản gốc
                    </button>
                    <button
                      onClick={() => {
                        if (analysisResult) {
                          setActiveView('analysis');
                        } else {
                          analyzeDocument();
                        }
                      }}
                      className={cn(
                        "px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-1.5",
                        activeView === 'analysis' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <Sparkles size={12} />
                      Phân tích AI
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    <span>{isCopied ? 'Đã sao chép' : 'Sao chép'}</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {activeView === 'text' ? (
                  <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {docText}
                  </div>
                ) : isAnalyzing ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                    <div className="relative">
                      <Brain size={48} className="text-indigo-500 animate-pulse" />
                      <Sparkles size={20} className="absolute -top-2 -right-2 text-amber-400 animate-bounce" />
                    </div>
                    <p className="text-sm font-bold text-slate-600">AI đang phân tích tài liệu...</p>
                    <div className="w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-indigo-500"
                        animate={{ x: [-200, 200] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      />
                    </div>
                  </div>
                ) : analysisResult ? (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Summary Header */}
                    <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100/50">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                          <Brain size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-indigo-900">Kết quả tham mưu</h3>
                      </div>
                      <div className="flex flex-wrap gap-3 mb-4">
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-200/50">
                          {analysisResult.document_type}
                        </span>
                        {analysisResult.issued_by && (
                          <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200/50">
                            {analysisResult.issued_by}
                          </span>
                        )}
                        {analysisResult.urgency && (
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                            analysisResult.urgency.toLowerCase().includes('khẩn') 
                              ? "bg-rose-100 text-rose-700 border-rose-200/50" 
                              : "bg-emerald-100 text-emerald-700 border-emerald-200/50"
                          )}>
                            {analysisResult.urgency}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700 leading-relaxed italic">"{analysisResult.summary}"</p>
                    </div>

                    {/* Warnings */}
                    {analysisResult.warnings && analysisResult.warnings.length > 0 && (
                      <div className="bg-rose-50/50 rounded-2xl p-6 border border-rose-100/50">
                        <div className="flex items-center gap-2 text-rose-800 font-bold mb-4">
                          <AlertCircle size={18} />
                          <h4>Cảnh báo tham mưu</h4>
                        </div>
                        <ul className="space-y-2">
                          {analysisResult.warnings.map((warning: string, i: number) => (
                            <li key={i} className="flex gap-3 text-sm text-rose-700">
                              <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                              {warning}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* General Directive */}
                    {analysisResult.general_directive && (
                      <div className="bg-amber-50/50 rounded-2xl p-6 border border-amber-100/50">
                        <div className="flex items-center gap-2 text-amber-800 font-bold mb-2">
                          <Sparkles size={18} />
                          <h4>Đề xuất chỉ đạo chung</h4>
                        </div>
                        <p className="text-sm text-amber-900 font-medium">{analysisResult.general_directive}</p>
                      </div>
                    )}

                    {/* Action Items */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-slate-800 font-bold">
                        <ListChecks size={18} className="text-indigo-500" />
                        <h4>Phân công nhiệm vụ chi tiết</h4>
                      </div>
                      <div className="space-y-4">
                        {analysisResult.action_items?.map((item: any, i: number) => (
                          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <h5 className="font-bold text-slate-800 text-base leading-snug">{item.task}</h5>
                              {item.priority && (
                                <span className={cn(
                                  "px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider shrink-0",
                                  item.priority.toLowerCase().includes('khẩn') ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"
                                )}>
                                  {item.priority}
                                </span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                              <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chủ trì</span>
                                <div className="flex items-center gap-2">
                                  <Users size={14} className="text-indigo-500" />
                                  <span className="text-sm font-semibold text-indigo-700">{item.lead_agency || 'Chưa xác định'}</span>
                                </div>
                              </div>
                              
                              <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thời hạn</span>
                                <div className="flex items-center gap-2">
                                  <Calendar size={14} className={item.deadline ? "text-amber-500" : "text-slate-300"} />
                                  <span className={cn("text-sm font-medium", item.deadline ? "text-slate-700" : "text-slate-400 italic")}>
                                    {item.deadline || 'Không có'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {item.support_agency && item.support_agency.length > 0 && (
                              <div className="mb-4">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Phối hợp</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {item.support_agency.map((agency: string, j: number) => (
                                    <span key={j} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200">
                                      {agency}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {item.note && (
                              <div className="mb-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                                <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block mb-1">Lưu ý</span>
                                <p className="text-sm text-blue-900">{item.note}</p>
                              </div>
                            )}

                            {item.suggested_directive && (
                              <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block mb-1">Dự thảo chỉ đạo</span>
                                <p className="text-sm text-emerald-900 font-medium italic">"{item.suggested_directive}"</p>
                              </div>
                            )}
                          </div>
                        ))}
                        {(!analysisResult.action_items || analysisResult.action_items.length === 0) && (
                          <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                            Không tìm thấy nhiệm vụ cụ thể nào trong văn bản.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                    <Brain size={48} strokeWidth={1} />
                    <p className="text-sm font-medium">Nhấn "Phân tích AI" để trích xuất thông tin</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50"
            >
              <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <Scan size={32} className="text-slate-300" />
              </div>
              <p className="font-medium text-slate-500 mb-2">Chưa có tệp nào được tải lên</p>
              <p className="text-sm text-center max-w-sm px-6">
                Nhấn nút "Tải lên tệp" để chọn PDF, Word hoặc Hình ảnh. Hệ thống sẽ tự động trích xuất văn bản, bao gồm cả văn bản từ ảnh (OCR).
              </p>
              <div className="mt-6 flex gap-4">
                <div className="flex flex-col items-center gap-1">
                  <div className="p-3 bg-blue-50 text-blue-500 rounded-xl">
                    <FileText size={20} />
                  </div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">PDF/Word</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl">
                    <ImageIcon size={20} />
                  </div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Hình ảnh</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="p-3 bg-amber-50 text-amber-500 rounded-xl">
                    <Scan size={20} />
                  </div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Quét OCR</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
