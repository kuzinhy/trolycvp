import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Event } from '../constants';
import { Bell, Plus, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { ToastType } from './ui/Toast';

interface EventReminderProps {
  events: Event[];
  updateEvents: (updater: (prev: Event[]) => Event[]) => Promise<void>;
  showToast: (message: string, type?: ToastType) => void;
}

export const EventReminder: React.FC<EventReminderProps> = ({ events, updateEvents, showToast }) => {
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newType, setNewType] = useState<Event['type']>('other');
  const [newTime, setNewTime] = useState('09:00');
  const [newReminderType, setNewReminderType] = useState<'minutes' | 'hours' | 'days' | 'none'>('minutes');
  const [newReminderValue, setNewReminderValue] = useState(30);
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (newName && newDate) {
      const newId = `e-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Auto-set reminder for founding days
      let finalReminderType = newReminderType;
      let finalReminderValue = newReminderValue;
      if (newType.startsWith('founding_day_')) {
        finalReminderType = 'days';
        finalReminderValue = 7;
      }

      updateEvents(prev => [...prev, { 
        id: newId, 
        name: newName, 
        date: newDate, 
        time: newTime,
        type: newType, 
        reminderType: finalReminderType,
        reminderValue: finalReminderValue
      }]);
      setNewName('');
      setNewDate('');
      setNewTime('09:00');
      setNewReminderValue(30);
      setIsAdding(false);
      showToast("Đã thêm sự kiện mới!", "success");
    }
  };

  return (
    <motion.div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-300 group h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Calendar size={16} className="text-indigo-500" /> Sự kiện Đảng ủy
        </h3>
        <button onClick={() => setIsAdding(!isAdding)} className="p-1.5 rounded-lg hover:bg-indigo-50 transition-colors text-slate-400 hover:text-indigo-600">
          <Plus size={16} className={isAdding ? "rotate-45 transition-transform" : "transition-transform"} />
        </button>
      </div>
      {isAdding && (
        <div className="mb-4 p-4 bg-slate-50 rounded-xl space-y-2">
          <input type="text" placeholder="Tên sự kiện" value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-2 rounded-lg border text-sm" />
          <div className="flex gap-2">
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="flex-1 p-2 rounded-lg border text-sm" />
            <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-24 p-2 rounded-lg border text-sm" />
          </div>
          <select value={newType} onChange={e => setNewType(e.target.value as Event['type'])} className="w-full p-2 rounded-lg border text-sm">
            <option value="meeting">Cuộc họp</option>
            <option value="anniversary">Kỷ niệm</option>
            <option value="holiday">Ngày lễ</option>
            <option value="founding_day_industry">Thành lập ngành</option>
            <option value="founding_day_party">Thành lập Đảng</option>
            <option value="founding_day_mttq">Thành lập MTTQ</option>
            <option value="founding_day_union">Thành lập đoàn thể</option>
            <option value="founding_day_party_building">Ban xây dựng Đảng</option>
            <option value="other">Khác</option>
          </select>
          <div className="flex gap-2">
            <input type="number" min="1" value={newReminderValue} onChange={e => setNewReminderValue(parseInt(e.target.value))} className="w-20 p-2 rounded-lg border text-sm" placeholder="Giá trị" />
            <select value={newReminderType} onChange={e => setNewReminderType(e.target.value as any)} className="flex-1 p-2 rounded-lg border text-sm">
              <option value="minutes">Phút trước</option>
              <option value="hours">Giờ trước</option>
              <option value="days">Ngày trước</option>
              <option value="none">Không nhắc</option>
            </select>
          </div>
          <button onClick={handleAdd} className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold">Thêm</button>
        </div>
      )}
      <div className="space-y-2">
        {events.map(e => (
          <div key={e.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-xs">
            <div>
              <p className="font-bold text-slate-900">{e.name}</p>
              <p className="text-slate-500">
                {e.date} {e.time ? `• ${e.time}` : ''} • Nhắc trước: {e.reminderType === 'none' ? 'Không' : `${e.reminderValue} ${e.reminderType === 'minutes' ? 'phút' : e.reminderType === 'hours' ? 'giờ' : 'ngày'}`}
              </p>
            </div>
            <button onClick={() => updateEvents(prev => prev.filter(ev => ev.id !== e.id))} className="text-rose-500 hover:text-rose-700">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
