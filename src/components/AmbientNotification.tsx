import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Bell } from 'lucide-react';
import { cn } from '../lib/utils';

interface AmbientNotificationProps {
  notification: { title: string; description: string } | null;
  onClose: () => void;
}

export const AmbientNotification: React.FC<AmbientNotificationProps> = ({ notification, onClose }) => {
  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, x: 100, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.9 }}
          className="fixed bottom-6 right-6 z-[110] w-72"
        >
          <div className="relative group">
            {/* Background with blur and subtle gradient */}
            <div className="absolute inset-0 bg-white/40 backdrop-blur-md rounded-2xl border border-white/40 shadow-2xl shadow-slate-200/50" />
            
            {/* Content */}
            <div className="relative p-4 flex gap-3 items-start">
              <div className="shrink-0 p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                <Sparkles size={16} className="animate-pulse" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Trợ lý nhắc nhở</span>
                  <button 
                    onClick={onClose}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                  >
                    <X size={12} />
                  </button>
                </div>
                <h4 className="text-xs font-bold text-slate-900 mb-1 truncate">{notification.title}</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2 opacity-80 group-hover:opacity-100 transition-opacity">
                  {notification.description}
                </p>
              </div>
            </div>

            {/* Subtle progress bar */}
            <motion.div 
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 8, ease: "linear" }}
              className="absolute bottom-0 left-0 h-0.5 bg-emerald-500/30 rounded-full mx-4 mb-1"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
