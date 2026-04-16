import React, { useState, useCallback, useMemo, memo, useRef, useEffect } from 'react';
import { motion, Reorder, AnimatePresence } from 'motion/react';
import { 
  AlertCircle,
  Loader2,
  X,
  Plus,
  FileText,
  Check,
  Download,
  Copy,
  Brain,
  Sparkles,
  ChevronRight,
  BarChart3,
  Search,
  Filter,
  Zap,
  Clock,
  RefreshCw
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../lib/utils';
import { logActivity, getLogs, ActivityLog } from '../lib/logService';
import { auth } from '../lib/firebase';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { KnowledgeHeader } from './KnowledgeHeader';
import { KnowledgeForm } from './KnowledgeForm';
import { KnowledgeItem } from './KnowledgeItem';
import { PendingKnowledgeList } from './PendingKnowledgeList';
import { AIReviewModal } from './AIReviewModal';
import { KnowledgeDetailModal } from './KnowledgeDetailModal';

export interface KnowledgeModuleProps {
  aiKnowledge: any[];
  pendingKnowledge: any[];
  isMemoryLoading: boolean;
  isPendingLoading: boolean;
  isAdmin: boolean;
  loadKnowledge: () => void;
  isAddingManual: boolean;
  setIsAddingManual: (val: boolean) => void;
  manualValue: string;
  setManualValue: (val: string) => void;
  manualTags: string;
  setManualTags: (val: string) => void;
  manualTitle: string;
  setManualTitle: (val: string) => void;
  manualDocNumber: string;
  setManualDocNumber: (val: string) => void;
  manualIssueDate: string;
  setManualIssueDate: (val: string) => void;
  manualSigner: string;
  setManualSigner: (val: string) => void;
  manualStaffMember: string;
  setManualStaffMember: (val: string) => void;
  manualPermissionLevel: string;
  setManualPermissionLevel: (val: string) => void;
  manualVersion: string;
  setManualVersion: (val: string) => void;
  manualReviewStatus: string;
  setManualReviewStatus: (val: string) => void;
  manualReviewNotes: string;
  setManualReviewNotes: (val: string) => void;
  manualPriority: 'low' | 'medium' | 'high';
  setManualPriority: (val: 'low' | 'medium' | 'high') => void;
  manualDeadline: string;
  setManualDeadline: (val: string) => void;
  manualStatus: 'Pending' | 'In Progress' | 'Completed';
  setManualStatus: (val: 'Pending' | 'In Progress' | 'Completed') => void;
  isManualPublic: boolean;
  setIsManualPublic: (val: boolean) => void;
  isManualImportant: boolean;
  setIsManualImportant: (val: boolean) => void;
  addManualKnowledge: (category: string, title: string, content: string, tags: string[], pendingId?: string) => Promise<void>;
  isUpdating: boolean;
  editingIndex: number | null;
  setEditingIndex: (idx: number | null) => void;
  editValue: string;
  setEditValue: (val: string) => void;
  editTags: string;
  setEditTags: (val: string) => void;
  editCategory: string;
  setEditCategory: (val: string) => void;
  editIsImportant: boolean;
  setEditIsImportant: (val: boolean) => void;
  editIsPublic: boolean;
  setEditIsPublic: (val: boolean) => void;
  editTitle: string;
  setEditTitle: (val: string) => void;
  editSummary: string;
  setEditSummary: (val: string) => void;
  editDocNumber: string;
  setEditDocNumber: (val: string) => void;
  editIssueDate: string;
  setEditIssueDate: (val: string) => void;
  editSigner: string;
  setEditSigner: (val: string) => void;
  editStaffMember: string;
  setEditStaffMember: (val: string) => void;
  editPermissionLevel: string;
  setEditPermissionLevel: (val: string) => void;
  editVersion: string;
  setEditVersion: (val: string) => void;
  editReviewStatus: string;
  setEditReviewStatus: (val: string) => void;
  editReviewNotes: string;
  setEditReviewNotes: (val: string) => void;
  editPriority: 'low' | 'medium' | 'high';
  setEditPriority: (val: 'low' | 'medium' | 'high') => void;
  editDeadline: string;
  setEditDeadline: (val: string) => void;
  editStatus: 'Pending' | 'In Progress' | 'Completed';
  setEditStatus: (val: 'Pending' | 'In Progress' | 'Completed') => void;
  updateKnowledge: (id: string, data: any) => void;
  deleteKnowledge: (id: string) => void;
  isDeleting: string | null;
  onReorderKnowledge?: (newOrder: any[]) => void;
  smartLearnFromText: (text: string, tagsHint?: string[], isManual?: boolean) => Promise<void>;
  learnFromFile?: (file: File) => void;
  isLearning: boolean;
  isSuggestingTags?: boolean;
  suggestTagsForContent?: (content: string) => void;
  addPendingKnowledge: (name: string) => void;
  deletePendingKnowledge: (id: string) => void;
  updatePendingKnowledge: (id: string, name: string) => void;
  removeDuplicates?: () => void;
  isRemovingDuplicates?: boolean;
  auditAndOptimizeKnowledge?: () => Promise<any>;
  isAuditing?: boolean;
  deleteAllKnowledge?: () => void;
  isDeletingAll?: boolean;
  isSyncingRemote?: boolean;
  syncRemoteKnowledge?: () => void;
  isSyncingOneNote?: boolean;
  syncOneNote?: () => void;
  smartSummarizeKnowledge: (category: string) => void;
  isSummarizing: boolean;
  summarizedContent: string | null;
  setSummarizedContent: (val: string | null) => void;
  syncUnifiedStrategicKnowledge: () => Promise<void>;
  isSyncingUnified?: boolean;
  showToast: (message: string, type?: any) => void;
  pendingAIItems: any[];
  isReviewingAI: boolean;
  setIsReviewingAI: (val: boolean) => void;
  confirmAIItems: (selectedItems: any[]) => void;
  discardAIItems: () => void;
}

export const KnowledgeModule: React.FC<KnowledgeModuleProps> = (props) => {
  const {
    aiKnowledge,
    pendingKnowledge,
    isMemoryLoading,
    isPendingLoading,
    isAdmin,
    loadKnowledge,
    isAddingManual,
    setIsAddingManual,
    manualValue,
    setManualValue,
    manualTags,
    setManualTags,
    manualTitle,
    setManualTitle,
    manualDocNumber,
    setManualDocNumber,
    manualIssueDate,
    setManualIssueDate,
    manualSigner,
    setManualSigner,
    manualStaffMember,
    setManualStaffMember,
    manualPermissionLevel,
    setManualPermissionLevel,
    manualVersion,
    setManualVersion,
    manualReviewStatus,
    setManualReviewStatus,
    manualReviewNotes,
    setManualReviewNotes,
    isManualPublic,
    setIsManualPublic,
    isManualImportant,
    setIsManualImportant,
    addManualKnowledge,
    isUpdating,
    editingIndex,
    setEditingIndex,
    editValue,
    setEditValue,
    editTags,
    setEditTags,
    editCategory,
    setEditCategory,
    editIsImportant,
    setEditIsImportant,
    editIsPublic,
    setEditIsPublic,
    editTitle,
    setEditTitle,
    editSummary,
    setEditSummary,
    editDocNumber,
    setEditDocNumber,
    editIssueDate,
    setEditIssueDate,
    editSigner,
    setEditSigner,
    editStaffMember,
    setEditStaffMember,
    editPermissionLevel,
    setEditPermissionLevel,
    editVersion,
    setEditVersion,
    editReviewStatus,
    setEditReviewStatus,
    editReviewNotes,
    setEditReviewNotes,
    updateKnowledge,
    deleteKnowledge,
    isDeleting,
    onReorderKnowledge,
    smartLearnFromText,
    learnFromFile,
    isLearning,
    isSuggestingTags,
    suggestTagsForContent,
    addPendingKnowledge,
    deletePendingKnowledge,
    updatePendingKnowledge,
    removeDuplicates,
    isRemovingDuplicates,
    deleteAllKnowledge,
    isDeletingAll,
    isSyncingRemote,
    syncRemoteKnowledge,
    isSyncingOneNote,
    syncOneNote,
    auditAndOptimizeKnowledge,
    isAuditing,
    smartSummarizeKnowledge,
    isSummarizing,
    summarizedContent,
    setSummarizedContent,
    syncUnifiedStrategicKnowledge,
    isSyncingUnified,
    showToast,
    pendingAIItems,
    isReviewingAI,
    setIsReviewingAI,
    confirmAIItems,
    discardAIItems
  } = props;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('Tất cả');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'list' | 'history'>('list');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [selectedKnowledge, setSelectedKnowledge] = useState<any | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    const data = await getLogs('knowledge');
    setLogs(data);
    setIsLoadingLogs(false);
  }, []);

  useEffect(() => {
    if (activeView === 'history') {
      fetchLogs();
    }
  }, [activeView, fetchLogs]);

  // Optimized Search and Filter Logic
  const filteredKnowledge = useMemo(() => {
    let result = [...aiKnowledge];

    if (filterCategory !== 'Tất cả') {
      result = result.filter(item => item.category === filterCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(item => 
        item.title?.toLowerCase().includes(query) ||
        item.content?.toLowerCase().includes(query) ||
        item.tags?.some((tag: string) => (tag || '').toLowerCase().includes(query))
      );
    }

    // Sort by order
    return result.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [aiKnowledge, searchQuery, filterCategory]);

  const handleStrategicAnalysis = async () => {
    if (aiKnowledge.length === 0) {
      showToast("Kho tri thức trống, không thể phân tích.", "error");
      return;
    }

    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      
      const knowledgeSummary = aiKnowledge.map(k => `- ${k.title} (${k.category}): ${k.content.substring(0, 100)}...`).join('\n');
      
      const prompt = `Dựa trên danh sách các tài liệu tri thức sau đây trong hệ thống quản trị cán bộ, hãy thực hiện phân tích chiến lược:
      
      ${knowledgeSummary}
      
      Yêu cầu:
      1. Đánh giá độ bao phủ của tri thức (đã đủ các lĩnh vực chưa?).
      2. Xác định các "lỗ hổng" tri thức (những mảng nào còn thiếu hoặc cần bổ sung?).
      3. Đề xuất 3 hướng nghiên cứu hoặc cập nhật quy định mới để nâng cao hiệu quả quản trị.
      4. Đưa ra nhận xét về tính hệ thống của kho tri thức hiện tại.
      
      Trả về kết quả bằng tiếng Việt, định dạng Markdown chuyên nghiệp.`;

      const response = await ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: prompt }] }],
      });

      setAnalysisResult(response.text || "Không có phản hồi từ AI.");
      showToast("Phân tích chiến lược hoàn tất.", "success");
    } catch (error) {
      console.error("Analysis error:", error);
      showToast("Lỗi khi thực hiện phân tích AI.", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = useCallback(async (file: File) => {
    if (learnFromFile) {
      learnFromFile(file);
      logActivity({
        userId: auth.currentUser?.uid || 'anonymous',
        userEmail: auth.currentUser?.email || 'anonymous',
        action: 'Tải lên tài liệu',
        details: `Tải lên tệp: ${file.name}`,
        type: 'info',
        module: 'knowledge'
      });
    }
  }, [learnFromFile]);

  const handleManualAdd = useCallback(async (item: any) => {
    const tags = item.tags || [];
    if (props.setManualPriority) props.setManualPriority(item.priority || 'medium');
    if (props.setManualDeadline) props.setManualDeadline(item.deadline || '');
    if (props.setManualStatus) props.setManualStatus(item.status || 'Pending');
    
    addManualKnowledge(item.category, item.title, item.content, tags);
    
    logActivity({
      userId: auth.currentUser?.uid || 'anonymous',
      userEmail: auth.currentUser?.email || 'anonymous',
      action: 'Thêm kiến thức thủ công',
      details: `Thêm tài liệu: ${item.title}`,
      type: 'success',
      module: 'knowledge'
    });
  }, [addManualKnowledge]);

  const handleSaveEdit = useCallback(async (updatedItem: any) => {
    if (updatedItem.id) {
      updateKnowledge(updatedItem.id, updatedItem);
    }
  }, [updateKnowledge]);

  const handleCopySummary = useCallback(() => {
    if (!summarizedContent) return;
    navigator.clipboard.writeText(summarizedContent);
    showToast("Đã sao chép tóm tắt vào bộ nhớ tạm.", "success");
  }, [summarizedContent, showToast]);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 pb-32">
      {/* Header & Stats */}
      <KnowledgeHeader 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterCategory={filterCategory}
        onFilterChange={setFilterCategory}
        onSummarize={() => smartSummarizeKnowledge(filterCategory)}
        onDeleteAll={deleteAllKnowledge || (() => {})}
        onSyncUnified={syncUnifiedStrategicKnowledge}
        onAudit={auditAndOptimizeKnowledge || (() => Promise.resolve())}
        isSummarizing={isSummarizing}
        isDeletingAll={isDeletingAll || false}
        isSyncingUnified={isSyncingUnified || false}
        isAuditing={isAuditing || false}
        totalItems={aiKnowledge.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveView('list')}
            className={cn(
              "px-6 py-2 rounded-xl font-bold text-sm transition-all",
              activeView === 'list' ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-white text-muted-foreground hover:bg-slate-50"
            )}
          >
            Danh mục tài liệu
          </button>
          <button 
            onClick={() => setActiveView('history')}
            className={cn(
              "px-6 py-2 rounded-xl font-bold text-sm transition-all",
              activeView === 'history' ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-white text-muted-foreground hover:bg-slate-50"
            )}
          >
            Nhật ký hoạt động
          </button>
        </div>

        {activeView === 'list' && (
          <Button 
            onClick={() => setIsAddingManual(true)}
            className="rounded-xl px-6 font-bold shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Thêm kiến thức
          </Button>
        )}
      </div>

      {activeView === 'list' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Left Column: List */}
          <div className="xl:col-span-8 space-y-8">
            {/* KnowledgeForm Modal */}
            <AnimatePresence>
              {isAddingManual && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
                  >
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Plus className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="font-bold text-xl text-foreground">Thêm kiến thức mới</h3>
                      </div>
                      <button onClick={() => setIsAddingManual(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                      <KnowledgeForm 
                        onFileUpload={handleFileUpload}
                        onManualAdd={handleManualAdd}
                        isAddingManual={isAddingManual}
                        setIsAddingManual={setIsAddingManual}
                        isLearning={isLearning}
                        existingKnowledge={aiKnowledge}
                      />
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {pendingKnowledge.length > 0 && (
              <div className="bg-amber-50/50 rounded-2xl p-6 border border-amber-200/50">
                <PendingKnowledgeList 
                  items={pendingKnowledge}
                  onApprove={async (item) => {
                    props.setManualTitle(item.title || item.name || "Kiến thức mới");
                    props.setManualValue(item.content || item.name || "");
                    addManualKnowledge(item.category || "Chung", item.title || item.name || "Kiến thức mới", item.content || item.name || "", item.tags || [], item.id);
                  }}
                  onReject={async (id) => {
                    try {
                      await deletePendingKnowledge(id);
                      showToast("Đã bỏ qua kiến thức chờ duyệt.", "success");
                    } catch (error) {
                      showToast("Lỗi khi bỏ qua kiến thức.", "error");
                    }
                  }}
                  isApproving={null}
                  isRejecting={null}
                />
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">Danh mục tài liệu</h3>
                    <p className="text-sm text-slate-500">Quản lý và tra cứu kho tri thức</p>
                  </div>
                </div>
                {searchQuery && (
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-3 py-1.5 rounded-full">
                    {filteredKnowledge.length} kết quả
                  </span>
                )}
              </div>

              <div className="p-6">
                {isMemoryLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Đang truy xuất kho tri thức...</p>
                  </div>
                ) : filteredKnowledge.length > 0 ? (
                  viewMode === 'list' ? (
                    <Reorder.Group 
                      axis="y" 
                      values={filteredKnowledge} 
                      onReorder={(newItems) => onReorderKnowledge?.(newItems)}
                      className="space-y-4"
                    >
                      {filteredKnowledge.map((item, index) => (
                        <KnowledgeItem 
                          key={item.id || index}
                          item={item}
                          isEditing={editingIndex === index}
                          onEdit={() => setSelectedKnowledge(item)}
                          onDelete={() => deleteKnowledge(item.id)}
                          onSave={handleSaveEdit}
                          onCancel={() => setEditingIndex(null)}
                          isDeleting={isDeleting === item.id}
                        />
                      ))}
                    </Reorder.Group>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredKnowledge.map((item, index) => (
                        <motion.div
                          key={item.id || index}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700 p-5 hover:border-indigo-500 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
                          onClick={() => setSelectedKnowledge(item)}
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
                                <FileText size={20} />
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 text-[9px] font-black uppercase tracking-wider">
                                  {item.category}
                                </span>
                                {item.isImportant && (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 text-[9px] font-black uppercase tracking-wider">
                                    Quan trọng
                                  </span>
                                )}
                              </div>
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors line-clamp-2">
                              {item.title}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                              {item.content}
                            </p>
                          </div>
                          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              <Clock size={12} />
                              {item.createdAt ? new Date(item.createdAt.toMillis?.() || item.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                            </div>
                            <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 space-y-5">
                    <div className="p-6 bg-slate-50 rounded-full">
                      <AlertCircle className="w-12 h-12 text-slate-300" />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="font-bold text-xl text-slate-900">Không tìm thấy tài liệu</p>
                      <p className="text-sm text-slate-500 max-w-xs mx-auto">Hãy thử thay đổi từ khóa hoặc bộ lọc danh mục.</p>
                    </div>
                    {searchQuery && (
                      <Button variant="outline" onClick={() => setSearchQuery('')} className="rounded-xl px-6 mt-4">
                        Xóa tìm kiếm
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: AI Insights & Strategic Analysis */}
          <div className="xl:col-span-4 space-y-8">
          {/* Strategic Analysis Card */}
          <div className="bento-card p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <Zap className="w-32 h-32 text-primary" />
            </div>
            
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-lg">Phân tích Chiến lược</h3>
              </div>
              
              <p className="text-sm text-slate-400 leading-relaxed">
                Sử dụng AI để quét toàn bộ kho tri thức, xác định các mảng kiến thức còn thiếu và đề xuất hướng phát triển nghiệp vụ.
              </p>

              <button 
                onClick={handleStrategicAnalysis}
                disabled={isAnalyzing}
                className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Brain className="w-5 h-5" />
                )}
                {isAnalyzing ? 'Đang phân tích...' : 'Kích hoạt AI Phân tích'}
              </button>
            </div>
          </div>

          {/* AI Insights / Tips Card */}
          <div className="bento-card p-6 bg-white border-primary/20">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-primary" />
              Gợi ý từ Hệ thống
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-border/40 space-y-2">
                <h4 className="text-sm font-bold text-foreground">Tối ưu hóa tìm kiếm</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sử dụng các thẻ (tags) nhất quán để AI có thể phân loại và tóm tắt dữ liệu chính xác hơn.
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-border/40 space-y-2">
                <h4 className="text-sm font-bold text-foreground">Đồng bộ định kỳ</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Hãy nhấn "Đồng bộ" sau khi thêm nhiều tài liệu mới để cập nhật chỉ mục tìm kiếm thông minh.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    ) : (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200/60 min-h-[600px]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-50 text-slate-600 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-xl text-slate-900">Nhật ký hoạt động Tri thức</h3>
            </div>
            <Button variant="outline" onClick={fetchLogs} disabled={isLoadingLogs} className="rounded-xl">
              {isLoadingLogs ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Làm mới
            </Button>
          </div>

          {isLoadingLogs ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Đang tải nhật ký...</p>
            </div>
          ) : logs.length > 0 ? (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4 hover:bg-slate-100 transition-all">
                  <div className={cn(
                    "p-2 rounded-xl shrink-0",
                    log.type === 'success' ? "bg-emerald-100 text-emerald-600" :
                    log.type === 'warning' ? "bg-amber-100 text-amber-600" :
                    log.type === 'error' ? "bg-red-100 text-red-600" :
                    "bg-blue-100 text-blue-600"
                  )}>
                    {log.type === 'success' ? <Check className="w-4 h-4" /> :
                     log.type === 'warning' ? <AlertCircle className="w-4 h-4" /> :
                     log.type === 'error' ? <X className="w-4 h-4" /> :
                     <FileText className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <h4 className="font-bold text-sm text-slate-900">{log.action}</h4>
                      <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                        {log.timestamp?.toDate ? new Date(log.timestamp.toDate()).toLocaleString('vi-VN') : 'Vừa xong'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{log.details}</p>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium">Thực hiện bởi: {log.userEmail}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <AlertCircle className="w-10 h-10 text-slate-200" />
              <p className="text-slate-400 font-bold">Chưa có nhật ký hoạt động nào.</p>
            </div>
          )}
        </div>
      )}

      {/* Knowledge Detail Modal */}
      <KnowledgeDetailModal 
        item={selectedKnowledge}
        isOpen={!!selectedKnowledge}
        onClose={() => setSelectedKnowledge(null)}
        onEdit={() => {
          const index = aiKnowledge.findIndex(k => k.id === selectedKnowledge.id);
          setEditingIndex(index);
          setSelectedKnowledge(null);
        }}
        onDelete={() => {
          deleteKnowledge(selectedKnowledge.id);
          setSelectedKnowledge(null);
        }}
      />

      {/* AI Analysis Result Modal */}
      <AnimatePresence>
        {analysisResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-white/20"
            >
              <div className="p-8 border-b border-border flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-2xl">
                    <BarChart3 className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-2xl text-foreground">Báo cáo Phân tích Chiến lược AI</h3>
                    <p className="text-sm text-muted-foreground">Phân tích tổng quan kho tri thức nghiệp vụ</p>
                  </div>
                </div>
                <button onClick={() => setAnalysisResult(null)} className="p-3 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                <div className="prose prose-slate max-w-none">
                  <div className="whitespace-pre-wrap text-slate-700 leading-relaxed text-lg">
                    {analysisResult}
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-border bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="outline" className="rounded-xl px-6" onClick={() => {
                    navigator.clipboard.writeText(analysisResult);
                    showToast("Đã sao chép báo cáo.", "success");
                  }}>
                    <Copy className="w-4 h-4 mr-2" />
                    Sao chép báo cáo
                  </Button>
                </div>
                <Button variant="primary" onClick={() => setAnalysisResult(null)} className="rounded-xl px-10 py-6 font-bold">
                  Hoàn tất xem
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Summary Modal */}
      <AnimatePresence>
        {summarizedContent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-3xl max-h-[85vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-border flex items-center justify-between bg-primary/5">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-2xl">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-2xl text-foreground">Tóm tắt Tri thức AI</h3>
                    <p className="text-sm text-muted-foreground">Tổng hợp thông minh từ kho tri thức</p>
                  </div>
                </div>
                <button onClick={() => setSummarizedContent(null)} className="p-3 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                <div className="prose prose-slate max-w-none">
                  <div className="whitespace-pre-wrap text-slate-700 leading-relaxed text-lg">
                    {summarizedContent}
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-border bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="outline" className="rounded-xl px-6" onClick={handleCopySummary}>
                    <Copy className="w-4 h-4 mr-2" />
                    Sao chép
                  </Button>
                </div>
                <Button variant="primary" onClick={() => setSummarizedContent(null)} className="rounded-xl px-10 py-6 font-bold">
                  Đóng
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
