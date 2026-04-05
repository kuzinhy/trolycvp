import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Button } from './ui/Button';

interface KnowledgeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  validationResult: {
    isDuplicate: boolean;
    duplicateTitle?: string;
    isNew: boolean;
  } | null;
  title: string;
  content: string;
}

export const KnowledgeConfirmModal: React.FC<KnowledgeConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  validationResult,
  title,
  content
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 max-w-md w-full space-y-6 border border-slate-100 dark:border-slate-800"
      >
        <div className="flex items-center gap-4 text-amber-600">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Xác nhận thông tin</h3>
        </div>

        <div className="space-y-4">
          {validationResult?.isDuplicate ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-2xl">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-700 dark:text-red-400 font-bold">Cảnh báo: Dữ liệu trùng lặp!</p>
              </div>
              <p className="text-xs text-red-600 dark:text-red-400/80 mt-1">
                Hệ thống phát hiện tài liệu có tiêu đề hoặc nội dung tương tự: 
                <span className="font-bold block mt-1 italic">"{validationResult.duplicateTitle}"</span>
              </p>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-2xl">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <p className="text-sm text-emerald-700 dark:text-emerald-400 font-bold">Dữ liệu mới!</p>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400/80 mt-1">
                Hệ thống xác nhận đây là kiến thức mới chưa có trong bộ não tri thức.
              </p>
            </div>
          )}

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
              <Info className="w-4 h-4 text-blue-600" />
              <p className="text-sm text-blue-700 dark:text-blue-400 font-bold">Kiểm tra độ chính xác</p>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400/80 mt-1">
              Bạn đã kiểm tra kỹ nội dung và đảm bảo tính chính xác của tài liệu này chưa? 
              Dữ liệu sẽ được nạp vào bộ não AI để phục vụ tham mưu.
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Xem trước nội dung</p>
            <div className="max-h-32 overflow-y-auto custom-scrollbar">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">{title}</h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-4">{content}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl py-6">
            Kiểm tra lại
          </Button>
          <Button variant="primary" onClick={onConfirm} className="flex-1 rounded-xl py-6 font-bold shadow-lg shadow-primary/20">
            Xác nhận & Lưu
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
