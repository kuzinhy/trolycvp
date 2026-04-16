import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Check, X, AlertCircle, FileText, Tag, User, Calendar, Hash, Shield, Info } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

interface AIReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedItems: any[]) => void;
  items: any[];
  existingKnowledge: any[];
}

export const AIReviewModal: React.FC<AIReviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  items,
  existingKnowledge
}) => {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set((items || []).map((_, i) => i)));
  const [editingItem, setEditingItem] = useState<any | null>(null);

  React.useEffect(() => {
    if (isOpen && items) {
      setSelectedIndices(new Set(items.map((_, i) => i)));
    }
  }, [isOpen, items]);

  if (!isOpen) return null;

  const toggleSelect = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) newSelected.delete(index);
    else newSelected.add(index);
    setSelectedIndices(newSelected);
  };

  const handleConfirm = () => {
    const selectedItems = items.filter((_, i) => selectedIndices.has(i));
    onConfirm(selectedItems);
  };

  const checkDuplicate = (item: any) => {
    return existingKnowledge.find(k => {
      const kTitle = k?.title?.toLowerCase()?.trim() || '';
      const iTitle = item?.title?.toLowerCase()?.trim() || '';
      const kContent = k?.content?.toLowerCase()?.trim() || '';
      const iContent = item?.content?.toLowerCase()?.trim() || '';
      
      return (kTitle !== '' && kTitle === iTitle) || (kContent !== '' && kContent === iContent);
    });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Brain className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Kiểm soát Tri thức AI</h2>
              <p className="text-sm text-muted-foreground mt-1">AI đã trích xuất {(items || []).length} mục kiến thức. Vui lòng rà soát độ chính xác.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
          <div className="grid grid-cols-1 gap-6">
            {(items || []).map((item, idx) => {
              const duplicate = checkDuplicate(item);
              const isSelected = selectedIndices.has(idx);

              return (
                <motion.div 
                  key={idx}
                  layout
                  className={cn(
                    "group relative p-6 rounded-[24px] border-2 transition-all duration-300",
                    isSelected 
                      ? "bg-white dark:bg-slate-900 border-primary shadow-xl shadow-primary/5" 
                      : "bg-slate-50/50 dark:bg-slate-800/30 border-transparent opacity-60 grayscale-[0.5]"
                  )}
                >
                  <div className="flex items-start gap-6">
                    {/* Selection Toggle */}
                    <button 
                      onClick={() => toggleSelect(idx)}
                      className={cn(
                        "mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                        isSelected 
                          ? "bg-primary border-primary text-white" 
                          : "border-slate-300 dark:border-slate-600 hover:border-primary"
                      )}
                    >
                      {isSelected && <Check className="w-4 h-4" />}
                    </button>

                    <div className="flex-1 space-y-4">
                      {/* Title & Duplicate Warning */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">{item.title}</h3>
                          {duplicate && (
                            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span className="text-[11px] font-bold uppercase tracking-wider">Trùng lặp: {duplicate.title}</span>
                            </div>
                          )}
                        </div>
                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-[10px] font-bold uppercase tracking-widest">
                          {item.category}
                        </span>
                      </div>

                      {/* Content Preview */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3 italic">
                          "{item.content}"
                        </p>
                      </div>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {item.doc_number && (
                          <div className="flex items-center gap-2 text-slate-500">
                            <Hash className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">{item.doc_number}</span>
                          </div>
                        )}
                        {item.issue_date && (
                          <div className="flex items-center gap-2 text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">{item.issue_date}</span>
                          </div>
                        )}
                        {item.signer && (
                          <div className="flex items-center gap-2 text-slate-500">
                            <Shield className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">{item.signer}</span>
                          </div>
                        )}
                        {item.staff_member && (
                          <div className="flex items-center gap-2 text-slate-500">
                            <User className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">{item.staff_member}</span>
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {item.tags.map((tag: string, tIdx: number) => (
                            <span key={tIdx} className="flex items-center gap-1 px-2 py-0.5 bg-primary/5 text-primary rounded-md text-[10px] font-bold">
                              <Tag className="w-2.5 h-2.5" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Info className="w-4 h-4" />
            <p className="text-xs font-medium">Đã chọn {selectedIndices.size} / {(items || []).length} mục kiến thức</p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={onClose} className="rounded-2xl px-8 py-6">
              Hủy bỏ
            </Button>
            <Button 
              variant="primary" 
              onClick={handleConfirm} 
              disabled={selectedIndices.size === 0}
              className="rounded-2xl px-12 py-6 font-bold shadow-xl shadow-primary/20"
            >
              Xác nhận & Nạp Tri thức
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
