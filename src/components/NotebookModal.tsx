import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, Search } from 'lucide-react';
import { cn } from '../lib/utils';

interface NotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotebookModal: React.FC<NotebookModalProps> = ({ isOpen, onClose }) => {
  const notebookUrl = "https://notebooklm.google.com/notebook/45c07771-a51f-41aa-9e04-70a3c98ad2cd";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed z-[101] flex flex-col bg-slate-50 border border-slate-200 shadow-2xl transition-all duration-300 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-lg rounded-2xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white rounded-t-2xl shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <span className="font-black text-xs">AI</span>
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Tra cứu thông tin</h2>
                  <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">NotebookLM Core Service</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6 sm:p-8 bg-white rounded-b-2xl text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-4 ring-white shadow-sm border border-blue-100">
                <Search size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3">Hệ thống Tra cứu Tri thức</h3>
              <p className="text-slate-600 mb-8 text-sm leading-relaxed max-w-sm mx-auto">
                Hệ thống Tra cứu Thông tin được liên kết với nền tảng Google NotebookLM. 
                <br/><br/>
                Do chính sách bảo mật xác thực tài khoản của Google, bạn cần mở công cụ này trong một thẻ trình duyệt mới thay vì xem trực tiếp tại đây.
              </p>
              
              <div className="space-y-3">
                <a 
                  href={notebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="inline-flex items-center justify-center w-full gap-2 px-6 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                >
                  <span>Mở Trung tâm Tra cứu (Tab mới)</span>
                  <ExternalLink size={18} />
                </a>
                <button
                  onClick={onClose}
                  className="inline-flex items-center justify-center w-full px-6 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Quay lại
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
