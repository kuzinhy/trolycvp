import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  FileText, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  RefreshCw, 
  Copy, 
  Download, 
  FileCode, 
  Info, 
  FileUp, 
  ArrowRight,
  Gauge,
  History,
  AlertTriangle,
  BadgeAlert,
  SpellCheck,
  Check,
  Languages,
  LayoutTemplate,
  Printer,
  ChevronRight,
  Eye,
  FileCheck2,
  CalendarDays
} from 'lucide-react';
import { useMediaAnalysis, MediaAnalysisResult, AnalysisHistoryItem } from '../hooks/useMediaAnalysis';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export function AIAnalysisModule() {
  const { showToast } = useToast();
  const { user, isAdmin } = useAuth();
  const {
    history,
    isLoadingHistory,
    isAnalyzing,
    analysisProgress,
    progressStatus,
    runAnalysis,
    deleteAnalysis
  } = useMediaAnalysis(showToast);

  // States
  const [activeTab, setActiveTab] = useState<'image' | 'document' | 'text'>('image');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [directText, setDirectText] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('Poster truyền thông');
  const [requirements, setRequirements] = useState<string>('');
  const [activeResult, setActiveResult] = useState<MediaAnalysisResult | null>(null);
  const [currentFileMeta, setCurrentFileMeta] = useState<{ name: string; size: number } | null>(null);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick requirement suggestions
  const SUGGESTIONS = [
    "Kiểm tra lỗi chính tả và ngữ pháp tiếng Việt",
    "Kiểm tra bố cục trực quan có cân đối không",
    "Đánh giá tính trang trọng, chuẩn mực hành chính nhà nước",
    "Gợi ý phối màu hiện đại hơn",
    "Phát hiện nội dung nhạy cảm, từ ngữ không phù hợp"
  ];

  const handleAddRequirement = (suggestion: string) => {
    setRequirements(prev => {
      if (prev.includes(suggestion)) return prev;
      return prev ? `${prev}\n- ${suggestion}` : `- ${suggestion}`;
    });
  };

  // Drag and Drop support
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const processFile = (file: File) => {
    const isImageTab = activeTab === 'image';
    const isDocTab = activeTab === 'document';

    // File validation
    if (file.size > 10 * 1024 * 1024) {
      showToast("Tệp tin vượt quá dung lượng tối đa cho phép (10 MB).", "error");
      return;
    }

    if (isImageTab) {
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        showToast("Vui lòng chọn định dạng hình ảnh hợp lệ (JPG, PNG, WEBP).", "error");
        return;
      }
      setSelectedFile(file);
      setCurrentFileMeta({ name: file.name, size: file.size });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (isDocTab) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'docx', 'txt'].includes(extension || '')) {
        showToast("Vui lòng chọn định dạng tài liệu hợp lệ (PDF, DOCX, TXT).", "error");
        return;
      }
      setSelectedFile(file);
      setCurrentFileMeta({ name: file.name, size: file.size });
      setPreviewUrl(null);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [activeTab]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCurrentFileMeta(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Run AI Analysis
  const handleStartAnalysis = async () => {
    // Validate inputs
    if (activeTab === 'image' && !selectedFile) {
      showToast("Vui lòng tải lên hình ảnh poster cần phân tích.", "error");
      return;
    }
    if (activeTab === 'document' && !selectedFile) {
      showToast("Vui lòng tải lên tài liệu (PDF, DOCX, TXT) cần phân tích.", "error");
      return;
    }
    if (activeTab === 'text' && !directText.trim()) {
      showToast("Vui lòng nhập nội dung văn bản cần phân tích.", "error");
      return;
    }

    const result = await runAnalysis(
      activeTab !== 'text' ? selectedFile : null,
      directText,
      purpose,
      requirements
    );

    if (result) {
      setActiveResult(result);
    }
  };

  // Score badge/color generator
  const getScoreColor = (score: number) => {
    if (score >= 9.0) return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', fill: 'bg-emerald-500', label: 'Xuất sắc' };
    if (score >= 8.0) return { bg: 'bg-blue-50 text-blue-700 border-blue-200', fill: 'bg-blue-500', label: 'Tốt' };
    if (score >= 7.0) return { bg: 'bg-amber-50 text-amber-700 border-amber-200', fill: 'bg-amber-500', label: 'Khá' };
    if (score >= 5.0) return { bg: 'bg-orange-50 text-orange-700 border-orange-200', fill: 'bg-orange-500', label: 'Trung bình' };
    return { bg: 'bg-rose-50 text-rose-700 border-rose-200', fill: 'bg-rose-500', label: 'Chưa đạt' };
  };

  const getStatusColor = (status: string) => {
    if (status === 'Tốt') return 'bg-emerald-100 text-emerald-800';
    if (status === 'Cần lưu ý') return 'bg-amber-100 text-amber-800';
    return 'bg-rose-100 text-rose-800';
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Nghiêm trọng':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Quan trọng':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Trung bình':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  // Helper formatting size
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Copy functionalities
  const handleCopyText = (text: string, msg = "Đã sao chép nội dung thành công!") => {
    navigator.clipboard.writeText(text);
    showToast(msg, "success");
  };

  const handleCopyAllResults = () => {
    if (!activeResult) return;
    const formatted = `
=== KẾT QUẢ PHÂN TÍCH AI ===
Mẫu phân tích: ${activeResult.documentType}
Điểm tổng thể: ${activeResult.overallScore}/10 (${activeResult.classification})
Trạng thái đề xuất: ${activeResult.usageStatus}
Tóm tắt đánh giá: ${activeResult.summary}

ĐIỂM CHI TIẾT:
- Nội dung: ${activeResult.scores.content.score}/10 - ${activeResult.scores.content.comment}
- Chính tả & Ngôn ngữ: ${activeResult.scores.spellingAndLanguage.score}/10 - ${activeResult.scores.spellingAndLanguage.comment}
- Bố cục: ${activeResult.scores.layout.score}/10 - ${activeResult.scores.layout.comment}
- Thẩm mỹ: ${activeResult.scores.aesthetics.score}/10 - ${activeResult.scores.aesthetics.comment}
- Khả năng đọc: ${activeResult.scores.readability.score}/10 - ${activeResult.scores.readability.comment}
- Mức độ phù hợp: ${activeResult.scores.appropriateness.score}/10 - ${activeResult.scores.appropriateness.comment}

ĐIỂM MẠNH:
${activeResult.strengths.map(s => `- ${s}`).join('\n')}

ĐỀ XUẤT CẢI THIỆN:
- Việc cần sửa ngay: ${activeResult.urgentActions.map(a => `  + ${a}`).join('\n')}
- Việc nên cải thiện: ${activeResult.recommendedImprovements.map(a => `  + ${a}`).join('\n')}
- Gợi ý nâng cao: ${activeResult.advancedSuggestions.map(a => `  + ${a}`).join('\n')}
`;
    handleCopyText(formatted, "Đã sao chép toàn bộ kết quả phân tích!");
  };

  // Print / PDF Export
  const handlePrintReport = () => {
    window.print();
  };

  // Load old item from history
  const handleLoadHistoryItem = (item: AnalysisHistoryItem) => {
    setActiveResult(item.analysis);
    setPurpose(item.purpose);
    setRequirements(item.requirements);
    setCurrentFileMeta({ name: item.fileName, size: item.fileSize });
    // Reset file uploads
    setSelectedFile(null);
    setPreviewUrl(null);
    setDirectText('');
    showToast(`Đã tải kết quả từ lịch sử: ${item.fileName}`, "success");
  };

  return (
    <div className="w-full h-full min-h-screen bg-slate-50/60 p-4 md:p-6 lg:p-8 space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-rose-50 rounded-xl text-rose-600 shadow-sm border border-rose-100">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </span>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
              AI PHÂN TÍCH HÌNH ẢNH VÀ VĂN BẢN
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1 md:max-w-2xl leading-relaxed">
            Hệ thống nhận diện thông minh đa phương thức giúp tự động đánh giá poster, phông hội nghị, tài liệu Đảng và văn bản hành chính để phát hiện lỗi bố cục, chính tả và đề xuất cải tiến chuyên nghiệp.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide border transition-all cursor-pointer",
              showHistory 
                ? "bg-rose-50 border-rose-200 text-rose-700 shadow-sm" 
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            <History className="w-4 h-4" />
            <span>Lịch sử phân tích ({history.length})</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* SIDEBAR HISTORY (ANALYZE HISTORY PANEL) */}
        {showHistory && (
          <div className="lg:col-span-12 xl:col-span-12 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-800">
                <History className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Lịch sử rà soát & phân tích</h3>
              </div>
              <button 
                onClick={() => setShowHistory(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
              >
                Đóng [X]
              </button>
            </div>
            
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-rose-600" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Chưa có dữ liệu lịch sử phân tích nào của đồng chí trong hệ thống.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                {history.map((item) => {
                  const sColor = getScoreColor(item.overallScore);
                  return (
                    <div 
                      key={item.id}
                      className="group flex flex-col justify-between p-3.5 bg-slate-50 hover:bg-rose-50/20 border border-slate-200 hover:border-rose-200 rounded-xl transition-all relative overflow-hidden"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={cn("px-2 py-0.5 text-[9px] font-bold rounded-md border uppercase tracking-wider", sColor.bg)}>
                            {item.overallScore.toFixed(1)} - {item.classification}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString('vi-VN') : 'Đang đồng bộ'}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-rose-700 transition-colors">
                            {item.fileName}
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">
                            Loại: {item.purpose}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-200/50 mt-3 pt-2 text-[10px]">
                        <button
                          onClick={() => handleLoadHistoryItem(item)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem chi tiết</span>
                        </button>
                        <button
                          onClick={() => deleteAnalysis(item.id)}
                          className="flex items-center gap-1 text-rose-600 hover:text-rose-800 font-bold cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* INPUT PANEL */}
        <div className={cn("bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-6", activeResult ? "lg:col-span-5" : "lg:col-span-12")}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Dữ liệu đầu vào</span>
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Tối đa 10 MB</span>
            </div>

            {/* Tab selector */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => { setActiveTab('image'); handleRemoveFile(); }}
                className={cn(
                  "py-2 px-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex flex-col md:flex-row items-center justify-center gap-1.5",
                  activeTab === 'image' 
                    ? "bg-white text-rose-700 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <FileUp className="w-4 h-4 shrink-0" />
                <span>Tải hình ảnh</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('document'); handleRemoveFile(); }}
                className={cn(
                  "py-2 px-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex flex-col md:flex-row items-center justify-center gap-1.5",
                  activeTab === 'document' 
                    ? "bg-white text-rose-700 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <FileCheck2 className="w-4 h-4 shrink-0" />
                <span>Tải tài liệu</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('text'); handleRemoveFile(); }}
                className={cn(
                  "py-2 px-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex flex-col md:flex-row items-center justify-center gap-1.5",
                  activeTab === 'text' 
                    ? "bg-white text-rose-700 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span>Nhập văn bản</span>
              </button>
            </div>

            {/* Input area */}
            <div className="space-y-3">
              {activeTab === 'image' && (
                <div 
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-6 text-center transition-all relative overflow-hidden",
                    dragActive ? "border-rose-500 bg-rose-50/20" : "border-slate-300 bg-slate-50/50 hover:bg-slate-50"
                  )}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png,.webp"
                    className="hidden"
                  />
                  
                  {previewUrl ? (
                    <div className="space-y-4">
                      <div className="relative max-w-xs mx-auto rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                        <img 
                          src={previewUrl} 
                          alt="Xem trước ảnh" 
                          className="max-h-48 w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700 transition-colors cursor-pointer shadow-md"
                          title="Xóa tệp tin"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        <p className="font-semibold text-slate-700 line-clamp-1">{currentFileMeta?.name}</p>
                        <p className="text-[10px] mt-0.5">{formatBytes(currentFileMeta?.size || 0)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={triggerFileSelect}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                      >
                        Thay đổi hình ảnh khác
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 py-4 cursor-pointer" onClick={triggerFileSelect}>
                      <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mx-auto shadow-sm border border-rose-100">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">Kéo thả hình ảnh vào đây hoặc click để chọn file</p>
                        <p className="text-[10px] text-slate-400 mt-1">Hỗ trợ định dạng: JPG, JPEG, PNG, WEBP</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'document' && (
                <div 
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-6 text-center transition-all relative overflow-hidden",
                    dragActive ? "border-rose-500 bg-rose-50/20" : "border-slate-300 bg-slate-50/50 hover:bg-slate-50"
                  )}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.txt"
                    className="hidden"
                  />

                  {selectedFile ? (
                    <div className="space-y-4 py-2">
                      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl max-w-sm mx-auto shadow-sm">
                        <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="text-left min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-700 truncate">{currentFileMeta?.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{formatBytes(currentFileMeta?.size || 0)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
                          title="Xóa tệp tin"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={triggerFileSelect}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                      >
                        Thay đổi tài liệu khác
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 py-4 cursor-pointer" onClick={triggerFileSelect}>
                      <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mx-auto shadow-sm border border-rose-100">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">Kéo thả tài liệu vào đây hoặc click để chọn file</p>
                        <p className="text-[10px] text-slate-400 mt-1">Hỗ trợ định dạng: PDF, DOCX, TXT</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'text' && (
                <div className="space-y-1">
                  <textarea
                    rows={6}
                    value={directText}
                    onChange={(e) => setDirectText(e.target.value)}
                    placeholder="Nhập hoặc dán nội dung văn bản hành chính, thông báo, báo cáo cần rà soát tại đây..."
                    className="w-full text-xs bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-slate-800 placeholder:text-slate-400 leading-relaxed font-mono"
                  />
                  <div className="text-right text-[10px] text-slate-400">
                    Đã nhập {directText.length} ký tự
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* PARAMS */}
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Mục đích phân tích</label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-slate-700 font-semibold cursor-pointer"
              >
                <option value="Poster truyền thông">Poster truyền thông</option>
                <option value="Phông hội nghị">Phông hội nghị / Banner</option>
                <option value="Văn bản hành chính">Văn bản hành chính Đảng & Nhà nước</option>
                <option value="Thông báo">Thông báo nội bộ / Đại hội</option>
                <option value="Nội dung mạng xã hội">Nội dung mạng xã hội / Cổng TTĐT</option>
                <option value="Tài liệu chuyên môn">Tài liệu chuyên môn / Đề án</option>
                <option value="Nội dung khác">Nội dung khác</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Yêu cầu riêng biệt</label>
                <span className="text-[10px] font-medium text-slate-400">Không bắt buộc</span>
              </div>
              <textarea
                rows={3}
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="Ví dụ: Rà soát kỹ lỗi viết hoa tên chức danh, kiểm tra xem phông màu có quá tối và khó đọc không..."
                className="w-full text-xs bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-slate-800 leading-relaxed"
              />
              
              {/* Quick suggestions */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gợi ý nhanh:</p>
                <div className="flex flex-wrap gap-1">
                  {SUGGESTIONS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddRequirement(item)}
                      className="text-[10px] font-medium text-slate-600 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200/60 px-2 py-1 rounded-lg transition-all cursor-pointer"
                    >
                      + {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ACTION BUTTON & PROGRESS */}
          <div className="pt-4 border-t border-slate-100">
            {isAnalyzing ? (
              <div className="space-y-3 bg-rose-50/30 border border-rose-100 p-4 rounded-2xl animate-pulse">
                <div className="flex items-center justify-between text-xs font-extrabold text-rose-700">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{progressStatus}</span>
                  </span>
                  <span>{analysisProgress}%</span>
                </div>
                <div className="w-full bg-rose-100/60 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-rose-600 h-full transition-all duration-300"
                    style={{ width: `${analysisProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 font-medium text-center">
                  ⚠️ AI đang phân tích nội dung, vui lòng không đóng trang.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStartAnalysis}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs tracking-wider uppercase py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-600/10 hover:shadow-lg hover:shadow-rose-600/15 cursor-pointer transform active:scale-[0.99]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Phân tích bằng AI</span>
              </button>
            )}
          </div>
        </div>

        {/* RESULTS PANEL */}
        {activeResult ? (
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-6">
            
            {/* Action Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100">
                  <CheckCircle className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Kết quả đánh giá</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopyAllResults}
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  title="Sao chép báo cáo"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handlePrintReport}
                  className="flex items-center gap-1.5 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 text-xs font-bold transition-colors cursor-pointer"
                  title="In/Xuất PDF báo cáo"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Xuất báo cáo PDF</span>
                </button>
              </div>
            </div>

            {/* Print View Wrapper */}
            <div id="media-analysis-printable-report" className="space-y-6">
              
              {/* Score summary Card */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 border border-slate-200/60 p-4.5 rounded-2xl items-center">
                
                <div className="md:col-span-4 text-center md:border-r md:border-slate-200 md:pr-4 py-2 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Điểm tổng thể</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl md:text-4xl font-black text-rose-600 font-mono">
                      {activeResult.overallScore.toFixed(1)}
                    </span>
                    <span className="text-slate-400 text-sm font-bold">/10</span>
                  </div>
                  <span className={cn(
                    "inline-block px-2.5 py-0.5 text-[9px] font-extrabold rounded-full border uppercase tracking-wider",
                    getScoreColor(activeResult.overallScore).bg
                  )}>
                    {activeResult.classification}
                  </span>
                </div>

                <div className="md:col-span-8 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                    <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider">Trạng thái kiến nghị:</span>
                    <span className="text-xs font-bold text-slate-700">{activeResult.usageStatus}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed italic">
                    "{activeResult.summary}"
                  </p>
                </div>
              </div>

              {/* Six criteria breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-slate-400" />
                  <span>Bảng điểm chi tiết các khía cạnh</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(activeResult.scores).map(([key, value]) => {
                    // map visual label
                    const labelMap: Record<string, string> = {
                      content: 'Nội dung thông tin',
                      spellingAndLanguage: 'Chính tả & Ngôn ngữ',
                      layout: 'Bố cục mỹ thuật',
                      aesthetics: 'Tính thẩm mỹ',
                      readability: 'Khả năng đọc',
                      appropriateness: 'Mức độ phù hợp'
                    };
                    const color = getScoreColor(value.score);
                    return (
                      <div key={key} className="p-3 bg-white border border-slate-200/80 rounded-xl space-y-2 hover:shadow-sm transition-shadow">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">{labelMap[key] || key}</span>
                          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase", getStatusColor(value.status))}>
                            {value.score.toFixed(1)} - {value.status}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className={cn("h-full", color.fill)} style={{ width: `${value.score * 10}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">{value.comment}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Strengths */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>Điểm mạnh nổi bật</span>
                </h4>
                <div className="bg-emerald-50/30 border border-emerald-100 rounded-xl p-3.5 space-y-2">
                  {activeResult.strengths && activeResult.strengths.length > 0 ? (
                    <ul className="space-y-1.5">
                      {activeResult.strengths.map((str, i) => (
                        <li key={i} className="text-xs text-slate-700 flex items-start gap-2 leading-relaxed">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Chưa phát hiện điểm nổi trội đáng kể.</p>
                  )}
                </div>
              </div>

              {/* Issues detected */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Các vấn đề phát hiện rà soát</span>
                </h4>
                
                {activeResult.issues && activeResult.issues.length > 0 ? (
                  <div className="space-y-3">
                    {activeResult.issues
                      .sort((a, b) => {
                        const sevWeight = { 'Nghiêm trọng': 4, 'Quan trọng': 3, 'Trung bình': 2, 'Nhẹ': 1 };
                        return (sevWeight[b.severity] || 0) - (sevWeight[a.severity] || 0);
                      })
                      .map((issue, idx) => (
                        <div key={idx} className="border border-slate-200 hover:border-slate-300 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
                          {/* Issue header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3.5 py-2.5 border-b border-slate-100">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                              {issue.title}
                            </span>
                            <span className={cn("px-2 py-0.5 text-[8px] font-black rounded border uppercase tracking-wider", getSeverityBadge(issue.severity))}>
                              {issue.severity}
                            </span>
                          </div>
                          
                          {/* Issue body */}
                          <div className="p-3.5 space-y-2.5 text-xs text-slate-600 leading-relaxed">
                            {issue.location && (
                              <p className="font-semibold text-slate-800">
                                📍 Vị trí/Bối cảnh: <span className="font-mono text-slate-500 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">{issue.location}</span>
                              </p>
                            )}
                            {issue.originalContent && (
                              <div className="bg-red-50/40 border border-red-100 p-2 rounded-lg">
                                <p className="font-bold text-red-800 text-[10px] uppercase tracking-wider">Nội dung gốc:</p>
                                <p className="text-slate-700 mt-0.5 italic">"{issue.originalContent}"</p>
                              </div>
                            )}
                            <p>
                              <strong className="text-slate-700">Nguyên nhân:</strong> {issue.explanation}
                            </p>
                            <div className="bg-emerald-50/40 border border-emerald-100 p-2.5 rounded-lg text-emerald-900">
                              <strong className="text-emerald-800">💡 Đề xuất phương án sửa:</strong> {issue.suggestion}
                            </div>
                          </div>
                        </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-emerald-50/20 border border-emerald-100 rounded-xl p-4 text-center text-xs text-emerald-800 font-medium">
                    🎉 Tuyệt vời! AI không phát hiện bất kỳ vấn đề lỗi nghiêm trọng nào trong tệp tin.
                  </div>
                )}
              </div>

              {/* Language and spelling corrections */}
              {activeResult.languageCorrections && activeResult.languageCorrections.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <SpellCheck className="w-4 h-4 text-rose-500" />
                    <span>Lỗi chính tả và ngôn từ chính xác</span>
                  </h4>
                  
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3">Nội dung gốc</th>
                            <th className="p-3">Lỗi phát hiện</th>
                            <th className="p-3">Đề xuất sửa</th>
                            <th className="p-3">Lý do</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeResult.languageCorrections.map((corr, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-mono text-red-600 line-through bg-red-50/20">{corr.original}</td>
                              <td className="p-3 font-medium text-slate-700">{corr.issue}</td>
                              <td className="p-3 font-mono text-emerald-600 font-bold bg-emerald-50/20">{corr.suggested}</td>
                              <td className="p-3 text-slate-500 leading-relaxed">{corr.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Action recommendations split */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <BadgeAlert className="w-4 h-4 text-rose-600" />
                  <span>Kế hoạch hành động chi tiết</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Urgent */}
                  <div className="bg-rose-50/30 border border-rose-100 rounded-xl p-3.5 space-y-2">
                    <h5 className="text-[11px] font-bold text-rose-800 uppercase tracking-wider border-b border-rose-100 pb-1.5">
                      🚨 Cần chỉnh sửa ngay
                    </h5>
                    <ul className="space-y-1 text-xs text-slate-700 list-disc pl-4 leading-relaxed">
                      {activeResult.urgentActions && activeResult.urgentActions.map((act, i) => <li key={i}>{act}</li>)}
                    </ul>
                  </div>

                  {/* Improvements */}
                  <div className="bg-amber-50/30 border border-amber-100 rounded-xl p-3.5 space-y-2">
                    <h5 className="text-[11px] font-bold text-amber-800 uppercase tracking-wider border-b border-amber-100 pb-1.5">
                      📈 Nên cải tiến
                    </h5>
                    <ul className="space-y-1 text-xs text-slate-700 list-disc pl-4 leading-relaxed">
                      {activeResult.recommendedImprovements && activeResult.recommendedImprovements.map((act, i) => <li key={i}>{act}</li>)}
                    </ul>
                  </div>

                  {/* Advanced */}
                  <div className="bg-blue-50/30 border border-blue-100 rounded-xl p-3.5 space-y-2">
                    <h5 className="text-[11px] font-bold text-blue-800 uppercase tracking-wider border-b border-blue-100 pb-1.5">
                      ✨ Gợi ý nâng cao
                    </h5>
                    <ul className="space-y-1 text-xs text-slate-700 list-disc pl-4 leading-relaxed">
                      {activeResult.advancedSuggestions && activeResult.advancedSuggestions.map((act, i) => <li key={i}>{act}</li>)}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Revised layout / revised version output text */}
              {activeResult.posterLayoutSuggestion && activeResult.documentType.toLowerCase().includes('poster') ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <LayoutTemplate className="w-4 h-4 text-rose-600" />
                    <span>Phương án cải tạo thiết kế Poster & Phông chữ</span>
                  </h4>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Tiêu đề chính (Main Title):</span>
                        <p className="text-xs font-extrabold text-slate-800">{activeResult.posterLayoutSuggestion.mainTitle || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Tiêu đề phụ (Subtitle):</span>
                        <p className="text-xs text-slate-700 font-semibold">{activeResult.posterLayoutSuggestion.subtitle || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Đơn vị tổ chức (Organizer):</span>
                        <p className="text-xs text-slate-700 font-semibold">{activeResult.posterLayoutSuggestion.organizer || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Thời gian & Địa điểm (Time/Place):</span>
                        <p className="text-xs text-slate-700 font-semibold">
                          {activeResult.posterLayoutSuggestion.time} - {activeResult.posterLayoutSuggestion.location}
                        </p>
                      </div>
                    </div>

                    {activeResult.posterLayoutSuggestion.contentToRemove && activeResult.posterLayoutSuggestion.contentToRemove.length > 0 && (
                      <div className="space-y-1 border-t border-slate-200/60 pt-3">
                        <span className="text-[10px] font-bold text-red-600 uppercase">Cần bỏ bớt để thông thoáng:</span>
                        <ul className="text-xs text-slate-600 list-disc pl-4 leading-relaxed">
                          {activeResult.posterLayoutSuggestion.contentToRemove.map((rem, i) => <li key={i}>{rem}</li>)}
                        </ul>
                      </div>
                    )}

                    {activeResult.posterLayoutSuggestion.contentToShorten && activeResult.posterLayoutSuggestion.contentToShorten.length > 0 && (
                      <div className="space-y-1 border-t border-slate-200/60 pt-3">
                        <span className="text-[10px] font-bold text-amber-600 uppercase">Cần rút gọn nội dung:</span>
                        <ul className="text-xs text-slate-600 list-disc pl-4 leading-relaxed">
                          {activeResult.posterLayoutSuggestion.contentToShorten.map((rem, i) => <li key={i}>{rem}</li>)}
                        </ul>
                      </div>
                    )}

                    <div className="space-y-3 border-t border-slate-200 pt-3 text-xs">
                      {activeResult.posterLayoutSuggestion.typographySuggestion && (
                        <p className="leading-relaxed">
                          <strong className="text-slate-800">🔤 Phông chữ & Phân cấp:</strong> {activeResult.posterLayoutSuggestion.typographySuggestion}
                        </p>
                      )}
                      {activeResult.posterLayoutSuggestion.colorSuggestion && (
                        <p className="leading-relaxed">
                          <strong className="text-slate-800">🎨 Phối màu trực quan:</strong> {activeResult.posterLayoutSuggestion.colorSuggestion}
                        </p>
                      )}
                      {activeResult.posterLayoutSuggestion.layoutSuggestion && (
                        <p className="leading-relaxed">
                          <strong className="text-slate-800">📐 Sắp xếp bố cục hình học:</strong> {activeResult.posterLayoutSuggestion.layoutSuggestion}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : activeResult.revisedContent ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Languages className="w-4 h-4 text-emerald-500" />
                      <span>Nội dung đề xuất đã hiệu hiệu chỉnh hoàn chỉnh</span>
                    </h4>
                    <button
                      onClick={() => handleCopyText(activeResult.revisedContent, "Đã sao chép nội dung hiệu chỉnh hoàn chỉnh!")}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Sao chép bản sửa</span>
                    </button>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                    {activeResult.revisedContent}
                  </div>
                </div>
              ) : null}

            </div> {/* End Print View Wrapper */}

            {/* Action Bottom Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => {
                  setActiveResult(null);
                  handleRemoveFile();
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Phân tích tệp mới
              </button>
              
              <button
                type="button"
                onClick={handleStartAnalysis}
                disabled={isAnalyzing}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-extrabold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isAnalyzing && "animate-spin")} />
                <span>Rà soát lại dữ liệu này</span>
              </button>
            </div>

          </div>
        ) : (
          <div className="lg:col-span-12 xl:col-span-12 bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm space-y-4">
            <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 mx-auto">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Chưa có nội dung phân tích tích cực</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                Đồng chí hãy tải lên poster, banner phông nền đại hội hội nghị, tài liệu văn bản chụp hoặc dán văn bản trực tiếp ở bảng bên để bắt đầu phân tích kiểm duyệt rà soát thông minh bằng AI.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
