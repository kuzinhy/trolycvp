import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Check, Info, AlertTriangle, AlertCircle, CheckCircle2, Clock, Filter, Eye, EyeOff } from 'lucide-react';
import { Notification } from '../constants';
import { cn } from '../lib/utils';

interface NotificationDropdownProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNavigate: (tab: Notification['link']) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigate
}) => {
  const [filterType, setFilterType] = useState<Notification['type'] | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'read'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredNotifications = notifications.filter(n => {
    const typeMatch = filterType === 'all' || n.type === filterType;
    const statusMatch = filterStatus === 'all' || 
                       (filterStatus === 'unread' && !n.isRead) || 
                       (filterStatus === 'read' && n.isRead);
    return typeMatch && statusMatch;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const handleNotificationClick = (n: Notification) => {
    onMarkAsRead(n.id);
    setSelectedNotification(n);
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="text-emerald-500" size={16} />;
      case 'warning': return <AlertTriangle className="text-amber-500" size={16} />;
      case 'error': return <AlertCircle className="text-rose-500" size={16} />;
      default: return <Info className="text-blue-500" size={16} />;
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return new Date(timestamp).toLocaleDateString('vi-VN');
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
      >
        <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden ring-1 ring-black/5">
        <div className="p-4 border-b border-slate-100 bg-slate-50/80 backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm">Thông báo</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full">
                {unreadCount} mới
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button 
                onClick={onMarkAllAsRead}
                className="px-3 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
              >
                Đọc tất cả
              </button>
            )}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                showFilters || filterType !== 'all' || filterStatus !== 'all' 
                  ? "bg-emerald-100 text-emerald-600" 
                  : "hover:bg-slate-200 text-slate-400"
              )}
              title="Lọc thông báo"
            >
              <Filter size={16} />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-slate-50 border-b border-slate-100 overflow-hidden"
            >
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Loại thông báo</p>
                  <div className="flex flex-wrap gap-2">
                    {(['all', 'info', 'success', 'warning', 'error'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setFilterType(t)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border",
                          filterType === t 
                            ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                            : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                        )}
                      >
                        {t === 'all' ? 'Tất cả' : t === 'info' ? 'Thông tin' : t === 'success' ? 'Thành công' : t === 'warning' ? 'Cảnh báo' : 'Lỗi'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</p>
                  <div className="flex gap-2">
                    {(['all', 'unread', 'read'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border flex items-center gap-1.5",
                          filterStatus === s 
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-md" 
                            : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                        )}
                      >
                        {s === 'unread' && <EyeOff size={12} />}
                        {s === 'read' && <Eye size={12} />}
                        {s === 'all' ? 'Tất cả' : s === 'unread' ? 'Chưa đọc' : 'Đã đọc'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
          {filteredNotifications.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {filteredNotifications.map((n) => (
                <div 
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    "p-4 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 relative group",
                    !n.isRead && "bg-emerald-50/30"
                  )}
                >
                  <div className="mt-1 shrink-0">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className={cn("text-xs font-bold text-slate-900 mb-0.5", !n.isRead && "text-emerald-900")}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap font-medium">
                        {formatTime(n.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {n.description}
                    </p>
                  </div>
                  {!n.isRead && (
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-500 rounded-full" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400">
              <div className="p-4 bg-slate-50 rounded-full mb-3">
                <Bell size={32} className="opacity-20" />
              </div>
              <p className="text-xs font-bold">Không có thông báo nào</p>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-100 bg-slate-50/30 text-center">
          <button className="text-[10px] font-bold text-slate-500 hover:text-slate-900 uppercase tracking-widest transition-colors">
            Xem tất cả thông báo
          </button>
        </div>
        </div>
      </motion.div>

      {selectedNotification && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-slate-100"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-slate-100 rounded-2xl">
                {getIcon(selectedNotification.type)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedNotification.title}</h3>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  {formatTime(selectedNotification.timestamp)}
                </p>
              </div>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-2xl mb-8">
              <p className="text-sm text-slate-700 leading-relaxed">{selectedNotification.description}</p>
            </div>
            
            <div className="flex gap-3">
              <button onClick={() => { setSelectedNotification(null); onClose(); }} className="flex-1 px-6 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20">Đã hiểu</button>
              <button onClick={() => { setSelectedNotification(null); onClose(); }} className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-all">Để sau</button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};
