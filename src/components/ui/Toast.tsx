import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  message: string;
  type?: ToastType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'info', 
  isVisible, 
  onClose, 
  duration = 3000 
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 right-6 z-[120] flex items-center gap-2 px-4 py-2 rounded-2xl shadow-lg backdrop-blur-md border border-white/20"
          style={{
            backgroundColor: type === 'success' ? 'rgba(16, 185, 129, 0.85)' : 
                           type === 'error' ? 'rgba(239, 68, 68, 0.85)' : 
                           type === 'warning' ? 'rgba(245, 158, 11, 0.85)' :
                           'rgba(30, 41, 59, 0.85)',
            color: 'white'
          }}
        >
          {type === 'success' && <Check size={14} className="text-white" />}
          {type === 'error' && <AlertCircle size={14} className="text-white" />}
          {type === 'warning' && <AlertTriangle size={14} className="text-white" />}
          {type === 'info' && <Info size={14} className="text-white" />}
          
          <span className="text-xs font-medium tracking-wide">{message}</span>
          
          <button onClick={onClose} className="ml-2 p-0.5 hover:bg-white/20 rounded-full transition-colors">
            <X size={12} className="text-white/80" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
