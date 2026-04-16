import React, { memo, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Upload, Plus, FileText, X, AlertCircle, Loader2, PenLine, Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Button } from './ui/Button';
import { KNOWLEDGE_CATEGORIES } from '../constants';
import { KnowledgeConfirmModal } from './KnowledgeConfirmModal';

interface KnowledgeFormProps {
  onFileUpload: (file: File) => Promise<void>;
  onManualAdd: (item: any) => Promise<void>;
  isAddingManual: boolean;
  setIsAddingManual: (val: boolean) => void;
  isLearning: boolean;
  existingKnowledge: any[];
}

export const KnowledgeForm: React.FC<KnowledgeFormProps> = memo(({
  onFileUpload,
  onManualAdd,
  isAddingManual,
  setIsAddingManual,
  isLearning,
  existingKnowledge
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newKnowledge, setNewKnowledge] = useState({
    title: '',
    content: '',
    category: 'Quy định - Hướng dẫn',
    tags: [] as string[],
    priority: 'medium' as 'low' | 'medium' | 'high',
    deadline: '',
    status: 'Pending' as 'Pending' | 'In Progress' | 'Completed'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isDuplicate: boolean;
    duplicateTitle?: string;
    isNew: boolean;
  } | null>(null);

  const generateAIInsights = async () => {
    if (!newKnowledge.title || !newKnowledge.content) return;
    setIsGenerating(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey: apiKey || '' });
      
      const prompt = `Phân tích nội dung tài liệu sau và:
      1. Đề xuất 3-5 thẻ (tags) ngắn gọn, phù hợp để phân loại.
      2. Tóm tắt nội dung tài liệu trong 1-2 câu.
      
      Tiêu đề: ${newKnowledge.title}
      Nội dung: ${newKnowledge.content}
      
      Trả về JSON: { "tags": ["tag1", "tag2"], "summary": "tóm tắt" }`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      
      const result = JSON.parse(response.text || '{}');
      setNewKnowledge(prev => ({
        ...prev,
        tags: result.tags || prev.tags,
      }));
      // Could also set a summary field if it existed in the state
    } catch (error) {
      console.error("AI Insight error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // For file upload, we might want to log it but duplicate check is harder without parsing
    setIsUploading(true);
    try {
      await onFileUpload(file);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const validateKnowledge = () => {
    const duplicate = existingKnowledge.find(k => 
      (k.title || '').toLowerCase().trim() === newKnowledge.title.toLowerCase().trim() ||
      (k.content || '').toLowerCase().trim() === newKnowledge.content.toLowerCase().trim()
    );

    setValidationResult({
      isDuplicate: !!duplicate,
      duplicateTitle: duplicate?.title,
      isNew: !duplicate
    });
    setShowConfirmModal(true);
  };

  const handleFinalSubmit = async () => {
    await onManualAdd(newKnowledge);
    setNewKnowledge({
      title: '',
      content: '',
      category: 'Quy định - Hướng dẫn',
      tags: [],
      priority: 'medium',
      deadline: '',
      status: 'Pending'
    });
    setIsAddingManual(false);
    setShowConfirmModal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKnowledge.title || !newKnowledge.content) return;
    validateKnowledge();
  };

  return (
    <div className="space-y-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="bg-white rounded-2xl p-6 flex items-center gap-5 shadow-sm border border-slate-200/60 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".pdf,.docx,.doc,.txt"
          />
          <div className="flex-shrink-0 p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
            {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-900 text-base">Tải lên tài liệu</h3>
            <p className="text-xs text-slate-500 mt-1">Hỗ trợ PDF, Word, Text (Tối đa 20MB)</p>
          </div>
          <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Plus className="w-5 h-5" />
          </div>
        </div>

        <div 
          onClick={() => setIsAddingManual(true)}
          className="bg-white rounded-2xl p-6 flex items-center gap-5 shadow-sm border border-slate-200/60 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex-shrink-0 p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
            <PenLine className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-900 text-base">Nhập thủ công</h3>
            <p className="text-xs text-slate-500 mt-1">Thêm kiến thức mới trực tiếp vào hệ thống</p>
          </div>
          <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Plus className="w-5 h-5" />
          </div>
        </div>
      </div>

      {isAddingManual && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200/60"
        >
          <KnowledgeConfirmModal 
            isOpen={showConfirmModal}
            onClose={() => setShowConfirmModal(false)}
            onConfirm={handleFinalSubmit}
            validationResult={validationResult}
            title={newKnowledge.title}
            content={newKnowledge.content}
          />
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-bold text-xl text-foreground">Thêm kiến thức mới</h3>
            </div>
            <button onClick={() => setIsAddingManual(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-8 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tiêu đề tài liệu</label>
                  <input
                    type="text"
                    required
                    value={newKnowledge.title}
                    onChange={(e) => setNewKnowledge(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-border/40 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary/30 outline-none transition-all text-sm font-medium"
                    placeholder="Nhập tiêu đề rõ ràng..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nội dung chi tiết</label>
                  <div className="relative">
                    <textarea
                      required
                      value={newKnowledge.content}
                      onChange={(e) => setNewKnowledge(prev => ({ ...prev, content: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-border/40 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary/30 outline-none transition-all text-sm min-h-[200px] resize-y"
                      placeholder="Nhập nội dung chi tiết của tài liệu..."
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={generateAIInsights} 
                      disabled={isGenerating || !newKnowledge.title || !newKnowledge.content}
                      className="absolute top-2 right-2 rounded-lg text-xs"
                    >
                      {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                      Gợi ý AI
                    </Button>
                  </div>
                </div>
              </div>

              <div className="md:col-span-4 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Danh mục</label>
                  <select
                    value={newKnowledge.category}
                    onChange={(e) => setNewKnowledge(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-border/40 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary/30 outline-none transition-all text-sm appearance-none cursor-pointer font-medium"
                  >
                    {KNOWLEDGE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Thẻ (Tags)</label>
                  <input
                    type="text"
                    value={newKnowledge.tags.join(', ')}
                    onChange={(e) => setNewKnowledge(prev => ({ ...prev, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-border/40 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary/30 outline-none transition-all text-sm"
                    placeholder="huong-dan, quy-dinh..."
                  />
                  <p className="text-[10px] text-muted-foreground italic">Phân cách bằng dấu phẩy (,)</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Mức độ ưu tiên</label>
                    <select
                      value={newKnowledge.priority}
                      onChange={(e) => setNewKnowledge(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-border/40 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary/30 outline-none transition-all text-sm font-medium"
                    >
                      <option value="low">Thấp</option>
                      <option value="medium">Trung bình</option>
                      <option value="high">Cao</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Trạng thái</label>
                    <select
                      value={newKnowledge.status}
                      onChange={(e) => setNewKnowledge(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-border/40 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary/30 outline-none transition-all text-sm font-medium"
                    >
                      <option value="Pending">Chờ xử lý</option>
                      <option value="In Progress">Đang thực hiện</option>
                      <option value="Completed">Đã hoàn thành</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Hạn chót</label>
                  <input
                    type="date"
                    value={newKnowledge.deadline}
                    onChange={(e) => setNewKnowledge(prev => ({ ...prev, deadline: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-border/40 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary/30 outline-none transition-all text-sm font-medium"
                  />
                </div>

                <div className="pt-6 border-t border-border/40 flex flex-col gap-2">
                  <Button type="submit" variant="primary" disabled={!newKnowledge.title || !newKnowledge.content || isLearning} className="w-full rounded-xl py-6 font-bold shadow-lg shadow-primary/20">
                    {isLearning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Lưu tài liệu
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setIsAddingManual(false)} className="w-full rounded-xl py-6 text-muted-foreground">
                    Hủy bỏ
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </motion.div>
      )}
    </div>
  );
});
