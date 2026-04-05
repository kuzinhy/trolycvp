import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface ProgressPopupProps {
  isOpen: boolean;
  progress: number;
  title?: string;
  message?: string;
}

export const ProgressPopup: React.FC<ProgressPopupProps> = ({
  isOpen,
  progress,
  title = 'Đang xử lý',
  message = 'Vui lòng đợi trong giây lát...'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm mx-4 border border-slate-100 flex flex-col items-center text-center relative overflow-hidden"
          >
            {/* Background decoration */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-50 rounded-full blur-3xl opacity-50" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-50 rounded-full blur-3xl opacity-50" />

            <div className="relative z-10 w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-indigo-100/50">
              <Sparkles className="text-indigo-600 animate-pulse" size={32} />
            </div>
            
            <h3 className="relative z-10 text-xl font-bold text-slate-900 mb-2">{title}</h3>
            <p className="relative z-10 text-sm text-slate-500 mb-8 max-w-[250px]">{message}</p>
            
            <div className="relative z-10 w-full bg-slate-100 rounded-full h-3 mb-3 overflow-hidden shadow-inner">
              <motion.div 
                className="bg-gradient-to-r from-indigo-500 to-blue-500 h-full rounded-full relative overflow-hidden"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "easeOut", duration: 0.5 }}
              >
                {/* Shine effect */}
                <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/20 w-full h-full animate-shimmer" style={{
                  backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                }} />
              </motion.div>
            </div>
            
            <div className="relative z-10 w-full flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Tiến trình</span>
              <span className="text-indigo-600">{progress}%</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
