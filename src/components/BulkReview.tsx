import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Trash2, 
  Play, 
  Download, 
  FileCheck,
  XCircle,
  AlertTriangle,
  Info,
  Plus,
  Settings,
  X,
  Check,
  Edit2
} from 'lucide-react';
import { generateContentWithRetry } from '../lib/ai-utils';
import { cn } from '../lib/utils';
import { DraftingRule } from '../hooks/useDraftingRules';
import { ToastType } from './ui/Toast';
import { useReviewCriteria, ReviewCriteria } from '../hooks/useReviewCriteria';

interface BulkReviewProps {
  rules: DraftingRule[];
  showToast: (msg: string, type?: ToastType) => void;
  aiKnowledge: any[];
}

interface FileResult {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  score?: number;
  errors?: string[];
  suggestions?: string[];
  summary?: string;
  errorMsg?: string;
  ignoredErrors?: string[]; // Track ignored errors
}

export const BulkReview: React.FC<BulkReviewProps> = ({ rules, showToast, aiKnowledge }) => {
  const [files, setFiles] = useState<FileResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState<number | null>(null);
  const { criteria, addCriteria, toggleCriteria, deleteCriteria, updateCriteria } = useReviewCriteria(showToast);
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([]);
  const [showCriteriaManager, setShowCriteriaManager] = useState(false);
  const [newCriteriaLabel, setNewCriteriaLabel] = useState('');
  const [newCriteriaCategory, setNewCriteriaCategory] = useState<'party' | 'leadership' | 'general'>('party');
  const [editingCriteriaId, setEditingCriteriaId] = useState<string | null>(null);
  const [editCriteriaLabel, setEditCriteriaLabel] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (criteria.length > 0 && selectedCriteria.length === 0) {
      setSelectedCriteria(criteria.filter(c => c.isActive).map(c => c.id));
    }
  }, [criteria]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    const newFiles: FileResult[] = selectedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      status: 'pending',
      file: file // Store the actual file object temporarily
    } as FileResult & { file: File }));

    setFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearAll = () => {
    if (window.confirm('Xóa tất cả danh sách file?')) {
      setFiles([]);
    }
  };

  const toggleIgnoreError = (fileId: string, errorText: string) => {
    setFiles(prev => prev.map(f => {
      if (f.id !== fileId) return f;
      const ignored = f.ignoredErrors || [];
      const newIgnored = ignored.includes(errorText) 
        ? ignored.filter(e => e !== errorText)
        : [...ignored, errorText];
      return { ...f, ignoredErrors: newIgnored };
    }));
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);

    const activeRules = rules.filter(r => r.isActive).map(r => r.content);
    
    // Build criteria string for prompt
    const criteriaPrompt = criteria
      .filter(c => selectedCriteria.includes(c.id))
      .map(c => `- ${c.label} (${c.category === 'party' ? 'Công tác Đảng' : c.category === 'leadership' ? 'Công tác Chỉ đạo' : 'Chung'})`).join('\n');

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'completed') continue;

      setCurrentFileIndex(i);
      setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'processing' } : f));

      try {
        const fileObj = (files[i] as any).file;
        if (fileObj.name.endsWith('.docx')) {
            showToast(`File ${fileObj.name} là .docx, hiện không hỗ trợ.`, 'warning');
            setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', errorMsg: 'Không hỗ trợ .docx' } : f));
            continue;
        }
        const text = await fileObj.text();

        const prompt = `Bạn là chuyên gia kiểm soát chất lượng văn bản hành chính Đảng.
Hãy rà soát văn bản sau dựa trên các tiêu chí sau:
${criteriaPrompt}

NHIỆM VỤ:
1. Đánh giá chi tiết theo từng tiêu chí đã chọn.
2. Liệt kê các lỗi (chính tả, ngữ pháp, thể thức, nội dung).
3. Đưa ra đề xuất sửa đổi cụ thể cho từng lỗi.
4. Đánh giá điểm chất lượng (1-10).
5. Tóm tắt nhận xét chung.

YÊU CẦU TRẢ VỀ ĐỊNH DẠNG JSON:
{
  "score": number,
  "detailedEvaluation": {
    "criteria": "Đánh giá theo từng tiêu chí",
    "errors": ["lỗi 1", "lỗi 2", ...],
    "suggestions": ["sửa 1", "sửa 2", ...],
    "summary": "nhận xét ngắn gọn"
  }
}

VĂN BẢN CẦN KIỂM TRA:
"""
${text}
"""`;

        const response = await generateContentWithRetry({
          model: 'gemini-3.1-pro-preview',
          contents: [{ parts: [{ text: prompt }] }],
          config: { responseMimeType: 'application/json' }
        });

        const data = JSON.parse(response.text || '{}');
        const evalData = data.detailedEvaluation || {};
        
        setFiles(prev => prev.map((f, idx) => idx === i ? { 
          ...f, 
          status: 'completed',
          score: data.score || 0,
          errors: evalData.errors || [],
          suggestions: evalData.suggestions || [],
          summary: evalData.summary || 'Đã hoàn thành kiểm tra.'
        } : f));

      } catch (error) {
        console.error('Error processing file:', error);
        setFiles(prev => prev.map((f, idx) => idx === i ? { 
          ...f, 
          status: 'error',
          errorMsg: 'Lỗi khi xử lý file hoặc AI không phản hồi.'
        } : f));
      }
    }

    setIsProcessing(false);
    setCurrentFileIndex(null);
    showToast('Đã hoàn thành rà soát hàng loạt', 'success');
  };

  const downloadReport = () => {
    const completedFiles = files.filter(f => f.status === 'completed');
    if (completedFiles.length === 0) return;

    let report = `# BÁO CÁO RÀ SOÁT LỖI VĂN BẢN HÀNG LOẠT\n`;
    report += `Ngày thực hiện: ${new Date().toLocaleString('vi-VN')}\n\n`;

    completedFiles.forEach((f, idx) => {
      report += `## ${idx + 1}. File: ${f.name}\n`;
      report += `- **Điểm số:** ${f.score}/10\n`;
      report += `- **Nhận xét:** ${f.summary}\n`;
      report += `### Các lỗi phát hiện:\n`;
      f.errors?.forEach(err => report += `- ${err}\n`);
      report += `### Đề xuất sửa đổi:\n`;
      f.suggestions?.forEach(sug => report += `- ${sug}\n`);
      report += `\n---\n\n`;
    });

    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BaoCao_RaSoatLoi_${new Date().toISOString().slice(0,10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
            <Upload size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Kiểm tra văn bản</h3>
            <p className="text-sm text-slate-500">Tải lên nhiều file Word để kiểm tra đồng thời</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            multiple 
            accept=".docx" 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all flex items-center gap-2"
          >
            <Plus size={18} /> Chọn file
          </button>
          <button
            onClick={processFiles}
            disabled={isProcessing || files.length === 0 || files.every(f => f.status === 'completed')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
            Bắt đầu rà soát
          </button>
          {files.some(f => f.status === 'completed') && (
            <button
              onClick={downloadReport}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-500 transition-all flex items-center gap-2"
            >
              <Download size={18} /> Xuất báo cáo
            </button>
          )}
          <button
            onClick={clearAll}
            disabled={isProcessing || files.length === 0}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Criteria Selection Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-slate-900">Tiêu chí rà soát</h4>
          <button
            onClick={() => setShowCriteriaManager(!showCriteriaManager)}
            className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-all"
          >
            <Settings size={14} />
            {showCriteriaManager ? 'Đóng quản lý' : 'Quản lý tiêu chí'}
          </button>
        </div>

        <AnimatePresence>
          {showCriteriaManager && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6 space-y-4"
            >
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-7">
                    <input
                      type="text"
                      value={newCriteriaLabel}
                      onChange={(e) => setNewCriteriaLabel(e.target.value)}
                      placeholder="Nhập tiêu chí mới..."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <select
                      value={newCriteriaCategory}
                      onChange={(e) => setNewCriteriaCategory(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    >
                      <option value="party">Công tác Đảng</option>
                      <option value="leadership">Công tác Chỉ đạo</option>
                      <option value="general">Chung</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <button
                      onClick={() => {
                        addCriteria(newCriteriaLabel, newCriteriaCategory);
                        setNewCriteriaLabel('');
                      }}
                      disabled={!newCriteriaLabel.trim()}
                      className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 transition-all disabled:opacity-50"
                    >
                      Thêm
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                  {criteria.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100 group">
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={c.isActive}
                          onChange={() => toggleCriteria(c.id)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        {editingCriteriaId === c.id ? (
                          <input
                            type="text"
                            value={editCriteriaLabel}
                            onChange={(e) => setEditCriteriaLabel(e.target.value)}
                            onBlur={() => {
                              updateCriteria(c.id, editCriteriaLabel);
                              setEditingCriteriaId(null);
                            }}
                            autoFocus
                            className="flex-1 px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none"
                          />
                        ) : (
                          <div className="flex flex-col">
                            <span className={cn("text-sm font-medium", !c.isActive && "text-slate-400 line-through")}>{c.label}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                              {c.category === 'party' ? 'Công tác Đảng' : c.category === 'leadership' ? 'Công tác Chỉ đạo' : 'Chung'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingCriteriaId(c.id);
                            setEditCriteriaLabel(c.label);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md transition-all"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => deleteCriteria(c.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {['party', 'leadership', 'general'].map((cat) => {
            const catCriteria = criteria.filter(c => c.category === cat && c.isActive);
            if (catCriteria.length === 0) return null;
            
            return (
              <div key={cat} className="space-y-2">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {cat === 'party' ? 'Công tác Đảng' : cat === 'leadership' ? 'Công tác Chỉ đạo' : 'Tiêu chí chung'}
                </h5>
                <div className="flex flex-wrap gap-2">
                  {catCriteria.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCriteria(prev => 
                        prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                      )}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                        selectedCriteria.includes(c.id) 
                          ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm" 
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 grid grid-cols-12 gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
          <div className="col-span-1 text-center">STT</div>
          <div className="col-span-4">Tên File</div>
          <div className="col-span-2 text-center">Trạng thái</div>
          <div className="col-span-1 text-center">Điểm</div>
          <div className="col-span-3">Nhận xét nhanh</div>
          <div className="col-span-1 text-center">Thao tác</div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
          {files.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-60">
              <FileText size={64} strokeWidth={1} />
              <p className="text-sm font-medium">Chưa có file nào trong danh sách</p>
            </div>
          ) : (
            files.map((file, index) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "grid grid-cols-12 gap-4 p-4 rounded-xl border transition-all items-center",
                  currentFileIndex === index ? "bg-indigo-50 border-indigo-200" : "bg-white border-slate-100 hover:border-slate-200"
                )}
              >
                <div className="col-span-1 text-center text-sm font-medium text-slate-400">
                  {index + 1}
                </div>
                <div className="col-span-4 flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    file.status === 'completed' ? "bg-emerald-100 text-emerald-600" : 
                    file.status === 'error' ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-600"
                  )}>
                    <FileText size={18} />
                  </div>
                  <span className="text-sm font-bold text-slate-700 truncate">{file.name}</span>
                </div>
                <div className="col-span-2 flex justify-center">
                  {file.status === 'pending' && (
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">Chờ xử lý</span>
                  )}
                  {file.status === 'processing' && (
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Loader2 size={10} className="animate-spin" /> Đang rà soát
                    </span>
                  )}
                  {file.status === 'completed' && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <FileCheck size={10} /> Hoàn thành
                    </span>
                  )}
                  {file.status === 'error' && (
                    <span className="px-3 py-1 bg-rose-100 text-rose-600 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <XCircle size={10} /> Lỗi
                    </span>
                  )}
                </div>
                <div className="col-span-1 text-center">
                  {file.score !== undefined ? (
                    <span className={cn(
                      "text-sm font-bold",
                      file.score >= 8 ? "text-emerald-600" : file.score >= 5 ? "text-amber-600" : "text-rose-600"
                    )}>
                      {file.score}/10
                    </span>
                  ) : "-"}
                </div>
                <div className="col-span-3">
                  <p className="text-xs text-slate-500 truncate italic">
                    {file.status === 'error' ? file.errorMsg : file.summary || "..."}
                  </p>
                </div>
                <div className="col-span-1 flex justify-center">
                  <button
                    onClick={() => removeFile(file.id)}
                    disabled={isProcessing}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                {file.status === 'completed' && (file.errors?.length || 0) > 0 && (
                  <div className="col-span-12 mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-rose-600 uppercase tracking-widest">
                        <AlertTriangle size={12} /> Lỗi phát hiện ({file.errors?.length})
                      </div>
                      <ul className="space-y-1">
                        {file.errors?.map((err, i) => (
                          <li key={i} className="text-xs text-slate-600 flex items-start gap-2 group">
                            <span className={cn("mt-1 w-1 h-1 rounded-full shrink-0", (file.ignoredErrors || []).includes(err) ? "bg-slate-300" : "bg-rose-400")} />
                            <span className={cn("flex-1", (file.ignoredErrors || []).includes(err) && "line-through opacity-50")}>{err}</span>
                            <button 
                              onClick={() => toggleIgnoreError(file.id, err)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200"
                              title={(file.ignoredErrors || []).includes(err) ? "Bỏ qua" : "Thống nhất sửa"}
                            >
                              {(file.ignoredErrors || []).includes(err) ? <X size={12} /> : <Check size={12} />}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                        <Info size={12} /> Đề xuất sửa đổi
                      </div>
                      <ul className="space-y-1">
                        {file.suggestions?.slice(0, 3).map((sug, i) => (
                          <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                            <span className="mt-1 w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                            {sug}
                          </li>
                        ))}
                        {(file.suggestions?.length || 0) > 3 && (
                          <li className="text-[10px] text-slate-400 italic">... và {(file.suggestions?.length || 0) - 3} đề xuất khác</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
