import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, ArrowRight, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { Notification } from '../constants';
import { cn } from '../lib/utils';

interface NotificationPopupProps {
  notification: Notification | null;
  onClose: () => void;
  onView: (link?: string) => void;
  onDismiss?: (id: string) => void;
}

export const NotificationPopup: React.FC<NotificationPopupProps> = ({ notification, onClose, onView, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 500); // Wait for exit animation
      }, 12000); // Show for 12 seconds for reminders
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!notification) return null;

  const Icon = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle
  }[notification.type] || Info;

  const colorClass = {
    info: "text-blue-500 bg-blue-50 border-blue-100",
    success: "text-emerald-500 bg-emerald-50 border-emerald-100",
    warning: "text-amber-500 bg-amber-50 border-amber-100",
    error: "text-rose-500 bg-rose-50 border-rose-100"
  }[notification.type] || "text-blue-500 bg-blue-50 border-blue-100";

  const buttonClass = {
    info: "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20",
    success: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20",
    warning: "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20",
    error: "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
  }[notification.type] || "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 100, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.9, transition: { duration: 0.3 } }}
          className="fixed bottom-6 right-6 z-[130] w-full max-w-sm"
        >
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/40 overflow-hidden flex flex-col ring-1 ring-black/5">
            <div className="p-5 flex gap-4">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border", colorClass)}>
                <Icon size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {notification.type === 'warning' ? 'Nhắc nhở sự kiện' : 'Thông báo mới'}
                  </span>
                  <button 
                    onClick={() => {
                      setIsVisible(false);
                      setTimeout(onClose, 500);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
                <h4 className="text-sm font-bold text-slate-900 truncate">{notification.title}</h4>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed font-medium">
                  {notification.description}
                </p>
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {onDismiss && (
                  <button
                    onClick={() => {
                      const idToDismiss = notification.eventId || notification.id;
                      if (idToDismiss) onDismiss(idToDismiss);
                      setIsVisible(false);
                      setTimeout(onClose, 500);
                    }}
                    className="text-[10px] font-bold text-slate-400 hover:text-rose-500 uppercase tracking-wider transition-colors"
                  >
                    Tắt nhắc nhở
                  </button>
                )}
                {!onDismiss && (
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Vừa xong
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  onView(notification.link);
                  setIsVisible(false);
                  setTimeout(onClose, 500);
                }}
                className={cn("flex items-center gap-1.5 px-4 py-1.5 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg", buttonClass)}
              >
                Xem chi tiết
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
