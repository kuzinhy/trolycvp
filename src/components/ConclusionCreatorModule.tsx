import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSignature, 
  Send, 
  Sparkles, 
  Trash2, 
  FileText, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  ChevronRight,
  Plus,
  ArrowRight,
  Copy,
  Download,
  X,
  Users,
  Check,
  Layout,
  Link,
  Target,
  Search,
  Database
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useConclusionCreator } from '../hooks/useConclusionCreator';
import { STRATEGIC_PROJECTS } from '../constants';

interface ConclusionCreatorModuleProps {
  showToast: (msg: string, type?: any) => void;
  aiKnowledge: any[];
  onSave?: (category: string, title: string, content: string, tags: string[], pendingId?: string, projectId?: string, references?: string[]) => Promise<void>;
}

export const ConclusionCreatorModule: React.FC<ConclusionCreatorModuleProps> = ({ 
  showToast,
  aiKnowledge,
  onSave
}) => {
  const {
    segments,
    currentRawText,
    setCurrentRawText,
    meetingType,
    setMeetingType,
    meetingDate,
    setMeetingDate,
    meetingTitle,
    setMeetingTitle,
    participants,
    setParticipants,
    selectedParticipants,
    setSelectedParticipants,
    initialDraft,
    setInitialDraft,
    isGenerating,
    isDraftingInitial,
    generateInitialDraft,
    suggestions,
    generateSuggestions,
    addSegment,
    updateSegment,
    removeSegment,
    finalAnnouncement,
    setFinalAnnouncement,
    generateFinalAnnouncement,
    isCompleting,
    isConcise,
    setIsConcise,
    projectId,
    setProjectId,
    referencedKnowledgeIds,
    setReferencedKnowledgeIds,
    reset
  } = useConclusionCreator();

  const [activeStep, setActiveStep] = useState<'input' | 'preview'>('input');
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [referenceSearch, setReferenceSearch] = useState('');
  const [organization, setOrganization] = useState('Văn phòng Đảng uỷ phường Thủ Dầu Một');
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState('');

  const BAN_THUONG_VU = [
    "Bí thư Đảng ủy",
    "Phó Bí thư Thường trực",
    "Phó Bí thư - Chủ tịch UBND",
    "Trưởng Công an",
    "Chỉ huy trưởng Quân sự",
    "Chủ nhiệm UBKT",
    "Trưởng Ban Tuyên giáo",
    "Trưởng Ban Dân vận",
    "Phó Chủ tịch HĐND"
  ];

  const handleToggleParticipant = (name: string) => {
    const updated = selectedParticipants.includes(name)
      ? selectedParticipants.filter(p => p !== name)
      : [...selectedParticipants, name];
    setSelectedParticipants(updated);
    setParticipants(updated.join(', '));
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Đã sao chép vào bộ nhớ tạm", "success");
  };

  const handleDownload = () => {
    const blob = new Blob([finalAnnouncement], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ket_luan_chi_dao_${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGenerate = async () => {
    try {
      await generateSuggestions(currentRawText, organization, aiKnowledge);
      setShowSuggestionsModal(true);
      showToast("Đã tạo các phương án gợi ý", "success");
    } catch (error) {
      showToast("Không thể kết nối với AI. Vui lòng kiểm tra lại nội dung hoặc thử lại sau.", "error");
    }
  };

  const handleDraftInitial = async () => {
    if (!meetingTitle) {
      showToast("Vui lòng nhập tên cuộc họp", "warning");
      return;
    }
    try {
      await generateInitialDraft(organization, aiKnowledge);
      showToast("Đã tạo dàn ý ban đầu", "success");
    } catch (error) {
      showToast("Lỗi khi tạo dàn ý", "error");
    }
  };

  const handleFinalize = async () => {
    try {
      await generateFinalAnnouncement(organization);
      setActiveStep('preview');
      showToast("Đã tổng hợp thông báo kết luận", "success");
    } catch (error) {
      showToast("Có lỗi xảy ra khi tổng hợp văn bản.", "error");
    }
  };

  const MEETING_TYPES = [
    "Họp thường kỳ",
    "Giao ban tháng/quý",
    "Họp Đảng uỷ",
    "Chỉ đạo đột xuất",
    "Hội nghị Tổng kết",
    "Làm việc chuyên đề"
  ];

  const CATEGORY_LABELS = {
    evaluation: { label: 'Đánh giá', color: 'bg-amber-100 text-amber-700' },
    task: { label: 'Nhiệm vụ', color: 'bg-blue-100 text-blue-700' },
    organization: { label: 'Tổ chức', color: 'bg-purple-100 text-purple-700' },
    general: { label: 'Chung', color: 'bg-slate-100 text-slate-700' }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header Consolidated */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <FileSignature size={20} />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase leading-tight">Tạo Kết Luận</h1>
            <p className="text-[8px] text-slate-400 font-bold tracking-widest uppercase font-mono">Strategic Drafting Engine</p>
          </div>
        </div>

        {/* Compact Admin Bar in Header */}
        <div className="flex-1 max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-2 px-4 border-l border-slate-100 ml-4">
          <div className="flex flex-col gap-0.5 min-w-0">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Ngày thực hiện</label>
            <input 
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-slate-800 focus:outline-none w-full border-b border-transparent hover:border-slate-200"
            />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Loại hình</label>
            <select 
              value={meetingType}
              onChange={(e) => setMeetingType(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-slate-800 focus:outline-none w-full appearance-none cursor-pointer border-b border-transparent hover:border-slate-200"
            >
              {MEETING_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-0.5 min-w-0 col-span-2 md:col-span-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Đơn vị</label>
            <input 
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-slate-800 focus:outline-none w-full border-b border-transparent hover:border-slate-200 truncate"
              placeholder="Nhập tên đơn vị..."
            />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0 md:col-span-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Tên cuộc họp</label>
            <input 
              type="text"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-slate-800 focus:outline-none w-full border-b border-transparent hover:border-slate-200 truncate"
              placeholder="Nhập tên cuộc họp..."
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowParticipantsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all font-bold text-[10px] uppercase"
          >
            <Users size={14} />
            {selectedParticipants.length > 0 ? `${selectedParticipants.length} TV` : 'Chọn TV'}
          </button>
          <button 
            onClick={reset}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
            title="Làm mới"
          >
            <RotateCcw size={16} />
          </button>
          {segments.length > 0 && (
            <button 
              onClick={() => {
                if (activeStep === 'input') {
                  handleFinalize();
                } else {
                  setActiveStep('input');
                }
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-bold text-[10px] uppercase shadow-md",
                activeStep === 'input' 
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-slate-800 text-white hover:bg-slate-900"
              )}
            >
              {isCompleting ? <Sparkles size={14} className="animate-pulse" /> : <FileText size={14} />}
              {activeStep === 'input' ? 'Hoàn thiện' : 'Quay lại'}
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-3 bg-slate-50/50">
        <div className="max-w-[1600px] mx-auto h-full flex flex-col gap-3">
          
          <AnimatePresence mode="wait">
            {activeStep === 'input' ? (
              <motion.div 
                key="input-step"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-full min-h-0"
              >
                {/* Left Column: Input and Suggestions */}
                <div className="lg:col-span-8 flex flex-col gap-3 h-full overflow-y-auto custom-scrollbar pr-2">
                  
                  {/* Strategic Linking Bar */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Target size={16} />
                      </div>
                      <div className="flex-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Dự án chiến lược liên kết</label>
                        <select 
                          value={projectId}
                          onChange={(e) => setProjectId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                        >
                          <option value="">-- Không liên kết dự án --</option>
                          {STRATEGIC_PROJECTS.map(p => (
                            <option key={p.id} value={p.id}>[{p.code}] {p.title}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Link size={16} />
                      </div>
                      <div className="flex-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Liên kết tri thức tham chiếu</label>
                        <button 
                          onClick={() => setShowReferenceModal(true)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-100 hover:border-slate-200 transition-all text-left flex items-center justify-between"
                        >
                          {referencedKnowledgeIds.length > 0 
                            ? `Đã liên kết ${referencedKnowledgeIds.length} tài liệu` 
                            : 'Chọn tài liệu tham chiếu...'}
                          <Plus size={14} className="text-slate-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Raw Input Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/40 flex flex-col">
                    <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono">Ý tưởng tập trung</span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 font-mono italic">Nhập nội dung thô bên dưới</span>
                    </div>
                    <textarea 
                      value={currentRawText}
                      onChange={(e) => setCurrentRawText(e.target.value)}
                      placeholder="Nhập nội dung ý kiến, chỉ đạo thô tại đây... Ví dụ: 'Cần đẩy mạnh giải quyết thủ tục hành chính cho dân nhanh hơn, tránh gây phiền hà'."
                      className="w-full h-24 p-4 text-slate-700 placeholder:text-slate-300 focus:outline-none resize-none bg-transparent font-medium leading-relaxed text-sm"
                    />
                    <div className="p-3 bg-slate-50/50 rounded-b-2xl border-t border-slate-100 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <span className="text-[9px] font-bold text-slate-400 font-mono ml-2">{currentRawText.length} kí tự</span>
                        <button 
                          onClick={() => setIsConcise(!isConcise)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all border",
                            isConcise 
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20" 
                              : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                          )}
                        >
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isConcise ? "bg-white animate-pulse" : "bg-slate-300"
                          )} />
                          Ngắn gọn
                        </button>
                      </div>
                      <button 
                        onClick={handleGenerate}
                        disabled={isGenerating || !currentRawText.trim()}
                        className={cn(
                          "flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-2xl shadow-blue-500/40 hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all relative overflow-hidden group",
                          currentRawText.trim() && !isGenerating && "animate-pulse"
                        )}
                      >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        {isGenerating ? <Sparkles size={18} className="animate-spin relative z-10" /> : <Sparkles size={18} className="relative z-10" />}
                        <span className="relative z-10">Tạo nội dung kết luận (Gợi ý)</span>
                      </button>
                    </div>
                  </div>

                  {/* Dàn ý AI - Strategic Core */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col shrink-0">
                    <div className="p-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <Layout size={14} className="text-blue-500" />
                        <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest font-mono">Dàn ý & Định hướng chiến lược</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {isConcise && (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                             <Sparkles size={10} />
                             <span className="text-[9px] font-black uppercase">Chế độ ngắn gọn</span>
                          </div>
                        )}
                        <button 
                          onClick={handleDraftInitial}
                          disabled={isDraftingInitial}
                          className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase hover:bg-black transition-all disabled:opacity-50"
                        >
                          {isDraftingInitial ? <RotateCcw size={10} className="animate-spin" /> : <Sparkles size={10} />}
                          Gợi ý khung chỉ đạo
                        </button>
                      </div>
                    </div>
                    <textarea 
                      value={initialDraft}
                      onChange={(e) => setInitialDraft(e.target.value)}
                      placeholder="AI sẽ gợi ý dàn ý tại đây. Bạn có thể chỉnh sửa trực tiếp..."
                      className="w-full h-24 p-3 text-xs text-slate-700 leading-relaxed font-medium focus:outline-none resize-none bg-transparent"
                    />
                  </div>

                  {/* Suggestions List */}
                  <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles size={12} className="text-blue-500" />
                        <h2 className="text-[10px] font-black text-slate-600 uppercase tracking-widest font-mono">Phiên bản chuyên nghiệp</h2>
                      </div>
                      {suggestions.length > 0 && (
                        <button 
                          onClick={() => setShowSuggestionsModal(true)}
                          className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                        >
                          Tất cả phương án
                        </button>
                      )}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                      <AnimatePresence>
                        {isGenerating ? (
                          <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                              <div key={`skeleton-suggestion-${i}`} className="bg-white/50 border border-slate-100 rounded-2xl p-4 animate-pulse">
                                <div className="h-4 w-1/3 bg-slate-200 rounded mb-3" />
                                <div className="h-3 w-full bg-slate-100 rounded" />
                              </div>
                            ))}
                          </div>
                        ) : suggestions.length > 0 ? (
                            suggestions.slice(0, 3).map((version, idx) => (
                              <motion.div 
                                key={`inline-suggestion-${version.id}-${idx}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="group bg-white border border-slate-200 rounded-2xl p-4 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/5 transition-all relative overflow-hidden"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex flex-col gap-1">
                                    <h3 className="font-bold text-slate-900 flex items-center gap-2 text-[13px]">
                                      <CheckCircle2 size={14} className="text-indigo-500" />
                                      {version.title}
                                    </h3>
                                    {version.reasoning && (
                                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 rounded-md border border-indigo-100 w-fit">
                                        <Sparkles size={8} className="text-indigo-600" />
                                        <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest italic">Phân tích tham mưu</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex gap-1">
                                    <div className="flex bg-slate-100 rounded-lg p-0.5 mr-1">
                                      {(['evaluation', 'task', 'organization'] as const).map(cat => (
                                        <button
                                          key={cat}
                                          onClick={() => addSegment(version.content, cat)}
                                          className={cn(
                                            "px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition-all",
                                            cat === 'evaluation' ? "hover:bg-amber-200 text-amber-600" :
                                            cat === 'task' ? "hover:bg-blue-200 text-blue-600" :
                                            "hover:bg-purple-200 text-purple-600"
                                          )}
                                          title={`Thêm vào mục ${CATEGORY_LABELS[cat].label}`}
                                        >
                                          + {CATEGORY_LABELS[cat].label.charAt(0)}
                                        </button>
                                      ))}
                                    </div>
                                    <button 
                                      onClick={() => handleCopy(version.content)}
                                      className="p-1 text-slate-400 hover:text-blue-600 transition-all"
                                    >
                                      <Copy size={12} />
                                    </button>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-100 font-medium whitespace-pre-wrap">
                                    {version.content}
                                  </p>
                                  {version.reasoning && (
                                    <p className="text-[10px] text-indigo-600/70 italic px-3 border-l-2 border-indigo-200">
                                      {version.reasoning}
                                    </p>
                                  )}
                                </div>
                              </motion.div>
                            ))
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/30">
                            <Sparkles size={24} className="text-blue-200 mb-3" />
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 text-center">
                              Nhập nội dung để bắt đầu
                            </p>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Right Side: Collected Segments */}
                <div className="lg:col-span-4 flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar-dark pr-1">
                  <div className="bg-slate-900 rounded-[2rem] p-4 flex flex-col h-full shadow-2xl shadow-slate-900/40 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl -translate-y-1/2 translate-x-1/2 rounded-full" />
                    
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white border border-white/10">
                          <CheckCircle2 size={16} />
                        </div>
                        <div>
                          <h2 className="text-xs font-black text-white tracking-tight uppercase">Ý đồ chỉ đạo</h2>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest font-mono">{segments.length} segments</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar-dark pr-2 relative z-10">
                      <AnimatePresence initial={false}>
                        {segments.map((segment, idx) => (
                          <motion.div 
                            key={`${segment.id}-${idx}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, x: 20 }}
                            className="bg-white/5 border border-white/10 rounded-xl p-3 group relative"
                          >
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between">
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter",
                                  CATEGORY_LABELS[segment.category].color
                                )}>
                                  {CATEGORY_LABELS[segment.category].label}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => {
                                      setEditingSegmentId(segment.id);
                                      setEditBuffer(segment.selectedVersion);
                                    }}
                                    className="p-1 text-slate-400 hover:text-white"
                                  >
                                    <FileSignature size={10} />
                                  </button>
                                  <button 
                                    onClick={() => removeSegment(segment.id)}
                                    className="p-1 text-slate-400 hover:text-rose-400"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              </div>

                              {editingSegmentId === segment.id ? (
                                <div className="flex flex-col gap-1.5">
                                  <textarea 
                                    value={editBuffer}
                                    onChange={(e) => setEditBuffer(e.target.value)}
                                    className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-[11px] text-white focus:outline-none h-16"
                                  />
                                  <div className="flex justify-end gap-1.5">
                                    <button 
                                      onClick={() => setEditingSegmentId(null)}
                                      className="text-[9px] text-slate-400 hover:text-white"
                                    >
                                      Hủy
                                    </button>
                                    <button 
                                      onClick={() => {
                                        updateSegment(segment.id, editBuffer);
                                        setEditingSegmentId(null);
                                      }}
                                      className="text-[9px] text-blue-400 hover:text-blue-300 font-bold"
                                    >
                                      Lưu
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start gap-2">
                                  <span className="text-[9px] font-black text-white/20 mt-0.5">{String(idx + 1).padStart(2, '0')}</span>
                                  <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3">{segment.selectedVersion}</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      
                      {segments.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3 opacity-50">
                          <Plus size={20} className="border-2 border-dashed border-slate-700 rounded-full p-1" />
                          <p className="text-[9px] uppercase font-black tracking-widest text-center px-4">Hãy thêm các gợi ý</p>
                        </div>
                      )}
                    </div>

                    {segments.length > 0 && (
                      <div className="mt-auto pt-4 border-t border-white/10 relative z-10">
                        <button 
                          onClick={handleFinalize}
                          disabled={isCompleting}
                          className="w-full flex items-center justify-center gap-2 py-3 bg-white text-slate-900 rounded-xl font-black text-[10px] uppercase hover:bg-blue-50 hover:text-blue-600 transition-all shadow-xl"
                        >
                          {isCompleting ? (
                            <Sparkles size={14} className="animate-spin" />
                          ) : (
                            <>
                              Hoàn thiện kết luận
                              <ArrowRight size={14} />
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="preview-step"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="h-full flex flex-col gap-6"
              >
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-2xl flex flex-col h-full overflow-hidden">
                  <div className="bg-slate-50 px-8 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText size={18} className="text-blue-600" />
                      <span className="text-xs font-black text-slate-700 uppercase tracking-widest font-mono">Drafted Announcement</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleCopy(finalAnnouncement)}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Sao chép"
                      >
                        <Copy size={16} />
                      </button>
                      <button 
                        onClick={handleDownload}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Tải xuống (.txt)"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <textarea 
                    value={finalAnnouncement}
                    onChange={(e) => setFinalAnnouncement(e.target.value)}
                    className="flex-1 w-full p-12 text-slate-800 focus:outline-none bg-white font-serif text-lg leading-loose selection:bg-blue-100"
                    spellCheck={false}
                  />
                  
                  <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-center">
                    <button 
                      onClick={async () => {
                        if (onSave) {
                          try {
                            await onSave(
                              'Chỉ đạo & Kết luận',
                              meetingTitle || `Kết luận họp ${meetingDate}`,
                              finalAnnouncement,
                              ['Kết luận họp', meetingType, organization],
                              undefined,
                              projectId,
                              referencedKnowledgeIds
                            );
                            showToast("Đã lưu kết luận vào hệ thống tri thức", "success");
                          } catch (error) {
                            showToast("Lỗi khi lưu kết luận", "error");
                          }
                        } else {
                          showToast("Tính năng lưu trữ chưa khả dụng trên môi trường này", "warning");
                        }
                      }}
                      className="flex items-center gap-3 px-12 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase hover:bg-black transition-all shadow-xl shadow-slate-900/20"
                    >
                      <Save size={18} />
                      Lưu trữ kết luận
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
      
      {/* Footer Meta */}
      <div className="px-8 py-3 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">AI Analysis Core: Online</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Drafting Engine: Optimized</span>
          </div>
        </div>
        <div className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">
          ELITE STRATEGIC OPERATING SYSTEM
        </div>
      </div>

      {/* Suggestions Modal */}
      <AnimatePresence>
        {showParticipantsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowParticipantsModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                    <Users size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Thành phần họp</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">Chọn Ban Thường vụ dự họp</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowParticipantsModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {BAN_THUONG_VU.map((name) => (
                  <div 
                    key={name}
                    onClick={() => handleToggleParticipant(name)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all",
                      selectedParticipants.includes(name)
                        ? "bg-indigo-50 border-indigo-600 shadow-sm"
                        : "bg-white border-slate-50 hover:border-slate-200 shadow-sm"
                    )}
                  >
                    <div className="flex flex-col">
                      <span className={cn(
                        "text-[13px] font-bold transition-all",
                        selectedParticipants.includes(name) ? "text-indigo-700" : "text-slate-700"
                      )}>
                        {name}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Thành viên Ban Thường vụ</span>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                      selectedParticipants.includes(name)
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "border-slate-200"
                    )}>
                      {selectedParticipants.includes(name) && <Check size={12} strokeWidth={4} />}
                    </div>
                  </div>
                ))}

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-amber-600" />
                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Góc nhìn tham mưu</span>
                  </div>
                  <p className="text-[11px] text-amber-700/80 leading-relaxed italic">
                    Hệ thống sẽ tự động điều chỉnh văn phong và nội dung trọng tâm dựa trên thành phần lãnh đạo dự họp (Bí thư: Định hướng chính trị; Chủ tịch: Tổ chức thực hiện).
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Đã chọn: <span className="text-blue-600">{selectedParticipants.length}</span></span>
                <button 
                  onClick={() => setShowParticipantsModal(false)}
                  className="px-6 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-black transition-all"
                >
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Suggestions Modal */}
      <AnimatePresence>
        {showSuggestionsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSuggestionsModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl bg-slate-50 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="bg-white px-8 py-6 border-b border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Kết quả phân tích AI</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">Select the best drafting style for your directive</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSuggestionsModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="flex flex-col gap-6">
                  {/* Original Input Display */}
                  <div className="bg-slate-100/50 rounded-2xl p-4 border border-slate-200">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono block mb-2">Nội dung thô ban đầu</span>
                    <p className="text-sm text-slate-600 italic leading-relaxed">"{currentRawText}"</p>
                  </div>

                  {/* Suggestions Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {suggestions.map((version, idx) => (
                      <motion.div 
                        key={`modal-suggestion-${version.id}-${idx}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="group bg-white border border-slate-200 rounded-3xl p-6 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 transition-all flex flex-col h-full relative"
                      >
                                  <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase rounded-lg tracking-tighter">
                                        Phương án {version.id}
                                      </span>
                                      {version.reasoning && (
                                        <div className="flex items-center gap-1">
                                          <Sparkles size={10} className="text-indigo-400" />
                                          <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest font-mono">Tham mưu AI</span>
                                        </div>
                                      )}
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-base leading-snug">{version.title}</h3>
                                    {version.reasoning && (
                                      <p className="mt-2 text-[10px] text-indigo-500 font-medium italic bg-indigo-50/30 p-2 rounded-lg border border-indigo-100/50">
                                        "{version.reasoning}"
                                      </p>
                                    )}
                                  </div>
                        
                        <div className="flex-1 bg-slate-50/50 rounded-2xl p-4 mb-6 border border-slate-100 flex flex-col">
                          <p className="text-sm text-slate-600 leading-relaxed font-medium flex-1">
                            {version.content}
                          </p>
                          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2">
                            {(['evaluation', 'task', 'organization'] as const).map(cat => (
                              <button 
                                key={cat}
                                onClick={() => {
                                  addSegment(version.content, cat);
                                  setShowSuggestionsModal(false);
                                }}
                                className={cn(
                                  "py-2 rounded-xl font-bold text-[9px] uppercase transition-all shadow-sm border",
                                  cat === 'evaluation' ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100" :
                                  cat === 'task' ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100" :
                                  "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                                )}
                              >
                                {CATEGORY_LABELS[cat].label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-auto">
                          <button 
                            onClick={() => handleCopy(version.content)}
                            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="Sao chép"
                          >
                            <Copy size={18} />
                          </button>
                          <button 
                            onClick={() => {
                              addSegment(version.content);
                              setShowSuggestionsModal(false);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase hover:bg-blue-600 transition-all shadow-lg shadow-slate-900/10"
                          >
                            <Plus size={16} />
                            Chọn đoạn này
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 px-8 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">
                  * Nhấp vào nút "Chọn" để thêm đoạn văn này vào danh sách kết luận.
                </p>
                <button 
                  onClick={() => setShowSuggestionsModal(false)}
                  className="px-6 py-2 text-slate-500 hover:text-slate-900 font-bold text-xs uppercase transition-all"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showReferenceModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReferenceModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl shadow-slate-900/40 flex flex-col overflow-hidden max-h-[80vh]"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg">
                    <Link size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Liên kết tri thức tham chiếu</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 italic">Chọn các văn bản, nghị quyết liên quan đến cuộc họp</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowReferenceModal(false)}
                  className="p-3 text-slate-400 hover:text-slate-900 hover:bg-white rounded-2xl transition-all shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 border-b border-slate-100 shrink-0">
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    value={referenceSearch}
                    onChange={(e) => setReferenceSearch(e.target.value)}
                    placeholder="Tìm kiếm tài liệu trong kho tri thức..."
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                {aiKnowledge
                  .filter(k => (k.title || '').toLowerCase().includes((referenceSearch || '').toLowerCase()))
                  .map(k => {
                    const isSelected = referencedKnowledgeIds.includes(k.id);
                    return (
                      <button 
                        key={`ref-item-${k.id}-${idx}`}
                        onClick={() => {
                          if (isSelected) {
                            setReferencedKnowledgeIds(prev => prev.filter(id => id !== k.id));
                          } else {
                            setReferencedKnowledgeIds(prev => [...prev, k.id]);
                          }
                        }}
                        className={cn(
                          "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group",
                          isSelected 
                            ? "bg-blue-50 border-blue-200 text-blue-700" 
                            : "bg-white border-slate-100 text-slate-600 hover:border-blue-200 hover:shadow-lg"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all",
                          isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500"
                        )}>
                          <FileText size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm truncate">{k.title}</h4>
                          <p className="text-[10px] opacity-60 truncate mt-0.5">{(k.content || '').substring(0, 100)}...</p>
                        </div>
                        <div className={cn(
                          "w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all",
                          isSelected ? "bg-blue-600 border-blue-600" : "border-slate-200 bg-white"
                        )}>
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>
                      </button>
                    );
                  })
                }
                {aiKnowledge.length === 0 && (
                  <div className="text-center py-12 text-slate-300">
                    <Database size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="text-sm font-bold uppercase tracking-widest italic">Kho tri thức đang trống</p>
                  </div>
                ) || aiKnowledge.filter(k => (k.title || '').toLowerCase().includes((referenceSearch || '').toLowerCase())).length === 0 && (
                  <div className="text-center py-12 text-slate-300">
                    <Search size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="text-sm font-bold uppercase tracking-widest italic">Không tìm thấy tài liệu phù hợp</p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                <span className="text-[10px] font-bold text-slate-400">Đã chọn {referencedKnowledgeIds.length} tài liệu tham chiếu</span>
                <button 
                  onClick={() => setShowReferenceModal(false)}
                  className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase hover:bg-black transition-all shadow-xl"
                >
                  Hoàn tất
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
