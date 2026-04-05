import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Plus, X, MapPin, Clock, Trash2, Eraser } from 'lucide-react';
import { Meeting } from '../constants';
import { cn } from '../lib/utils';
import { ToastType } from './ui/Toast';

interface MeetingReminderProps {
  meetings: Meeting[];
  updateMeetings: (updater: (prev: Meeting[]) => Meeting[]) => Promise<void>;
  showToast: (message: string, type?: ToastType) => void;
  isSaving?: boolean;
}

export const MeetingReminder: React.FC<MeetingReminderProps> = ({ meetings, updateMeetings, showToast, isSaving }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newMeeting, setNewMeeting] = useState({ 
    name: '', 
    date: '', 
    time: '', 
    location: '', 
    reminderMinutes: 30,
    reminderType: 'minutes' as 'minutes' | 'hours' | 'days' | 'none',
    reminderValue: 30
  });

  const addMeeting = () => {
    if (!newMeeting.name || !newMeeting.date || !newMeeting.time || !newMeeting.location) return;
    const newId = `m-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    updateMeetings(prev => [...prev, { ...newMeeting, id: newId }]);
    setNewMeeting({ 
      name: '', 
      date: '', 
      time: '', 
      location: '', 
      reminderMinutes: 30,
      reminderType: 'minutes',
      reminderValue: 30
    });
    setIsAdding(false);
    showToast("Đã thêm lịch công tác mới!", "success");
  };

  const deleteMeeting = (id: string) => {
    updateMeetings(prev => prev.filter(m => m.id !== id));
    showToast("Đã xóa lịch công tác!", "info");
  };

  const clearAllMeetings = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch công tác?")) {
      updateMeetings(() => []);
      showToast("Đã xóa toàn bộ lịch công tác!", "warning");
    }
  };

  const sortedMeetings = [...meetings].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 group h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Calendar size={16} className="text-blue-500" /> Lịch công tác sắp tới
          </h3>
          {isSaving && (
            <span className="flex items-center gap-1.5 text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full animate-pulse">
              <div className="w-1 h-1 bg-blue-600 rounded-full"></div>
              ĐANG LƯU
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {meetings.length > 0 && (
            <button 
              onClick={clearAllMeetings}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
              title="Xóa tất cả"
            >
              <Eraser size={14} />
            </button>
          )}
          <button 
            onClick={() => setIsAdding(!isAdding)} 
            className={cn(
              "p-1.5 rounded-lg transition-all",
              isAdding 
                ? "bg-rose-50 text-rose-600 hover:bg-rose-100" 
                : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
            )}
          >
            {isAdding ? <X size={14} /> : <Plus size={14} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 space-y-3 overflow-hidden"
          >
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
              <input 
                type="text" 
                placeholder="Tên cuộc họp..." 
                value={newMeeting.name} 
                onChange={e => setNewMeeting({...newMeeting, name: e.target.value})} 
                className="w-full text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
              />
              <div className="flex gap-2">
                <input 
                  type="date" 
                  value={newMeeting.date} 
                  onChange={e => setNewMeeting({...newMeeting, date: e.target.value})} 
                  className="flex-1 text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-600" 
                />
                <input 
                  type="time" 
                  value={newMeeting.time} 
                  onChange={e => setNewMeeting({...newMeeting, time: e.target.value})} 
                  className="w-28 text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-600" 
                />
              </div>
              <input 
                type="text" 
                placeholder="Địa điểm..." 
                value={newMeeting.location} 
                onChange={e => setNewMeeting({...newMeeting, location: e.target.value})} 
                className="w-full text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
              />
              <div className="flex gap-2">
                <input 
                  type="number" 
                  placeholder="30" 
                  value={newMeeting.reminderValue} 
                  onChange={e => setNewMeeting({...newMeeting, reminderValue: parseInt(e.target.value)})} 
                  className="w-20 text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                />
                <select
                  value={newMeeting.reminderType}
                  onChange={e => setNewMeeting({...newMeeting, reminderType: e.target.value as any})}
                  className="flex-1 text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-600"
                >
                  <option value="minutes">Phút trước</option>
                  <option value="hours">Giờ trước</option>
                  <option value="days">Ngày trước</option>
                  <option value="none">Không nhắc</option>
                </select>
              </div>
              <button 
                onClick={addMeeting} 
                className="w-full py-2 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-blue-500 transition-colors"
              >
                Thêm lịch công tác
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        <AnimatePresence>
          {sortedMeetings.map((m, index) => (
            <motion.div 
              key={m.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 bg-white border border-slate-100 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all group/item flex justify-between items-start"
            >
              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-900 line-clamp-1">{m.name}</p>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    <Calendar size={12} className="text-blue-500" /> 
                    {new Date(m.date).toLocaleDateString('vi-VN')}
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    <Clock size={12} className="text-amber-500" /> 
                    {m.time}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 flex items-center gap-1.5 pl-0.5">
                  <MapPin size={12} className="text-slate-400" /> 
                  <span className="truncate max-w-[200px]">{m.location}</span>
                </p>
              </div>
              <button 
                onClick={() => deleteMeeting(m.id)} 
                className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-all opacity-0 group-hover/item:opacity-100"
                title="Xóa lịch công tác"
              >
                <Trash2 size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {sortedMeetings.length === 0 && (
          <div className="text-center py-8">
            <Calendar size={32} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm text-slate-500 italic">Không có lịch công tác sắp tới</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

