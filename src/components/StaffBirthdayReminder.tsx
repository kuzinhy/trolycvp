import React, { useMemo, useState } from 'react';
import { Cake, Calendar, Plus, X, UserPlus } from 'lucide-react';
import { Birthday } from '../constants';
import { cn } from '../lib/utils';

interface StaffBirthdayReminderProps {
  birthdays: Birthday[];
  updateBirthdays: (updater: Birthday[] | ((prev: Birthday[]) => Birthday[])) => Promise<void>;
}

export const StaffBirthdayReminder: React.FC<StaffBirthdayReminderProps> = ({ birthdays, updateBirthdays }) => {
  const today = new Date();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');

  const upcomingBirthdays = useMemo(() => {
    const next30Days = new Date();
    next30Days.setDate(today.getDate() + 30);

    return birthdays.filter(b => {
      const parts = b.date.split('/');
      if (parts.length < 2) return false;
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const bDate = new Date(today.getFullYear(), month - 1, day);
      
      // If birthday already passed this year, look at next year
      if (bDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
        bDate.setFullYear(today.getFullYear() + 1);
      }
      
      return bDate >= today && bDate <= next30Days;
    }).sort((a, b) => {
        const partsA = a.date.split('/');
        const partsB = b.date.split('/');
        const dayA = parseInt(partsA[0], 10);
        const monthA = parseInt(partsA[1], 10);
        const dayB = parseInt(partsB[0], 10);
        const monthB = parseInt(partsB[1], 10);
        
        const dateA = new Date(today.getFullYear(), monthA - 1, dayA);
        const dateB = new Date(today.getFullYear(), monthB - 1, dayB);
        if (dateA < today) dateA.setFullYear(today.getFullYear() + 1);
        if (dateB < today) dateB.setFullYear(today.getFullYear() + 1);
        return dateA.getTime() - dateB.getTime();
    });
  }, [today, birthdays]);

  const handleAddBirthday = async () => {
    if (!newName.trim() || !newDate.trim()) return;
    
    // Validate date format DD/MM
    if (!/^\d{1,2}\/\d{1,2}(\/\d{4})?$/.test(newDate)) {
      alert('Vui lòng nhập ngày định dạng DD/MM hoặc DD/MM/YYYY');
      return;
    }

    const newBirthday: Birthday = {
      id: `b-${Date.now()}`,
      name: newName,
      date: newDate,
      source: 'agency'
    };

    await updateBirthdays(prev => [...prev, newBirthday]);
    setNewName('');
    setNewDate('');
    setIsAdding(false);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-rose-50/50 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-sm">
              <Cake size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Sinh nhật cán bộ</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">30 ngày tới</p>
            </div>
          </div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
          >
            {isAdding ? <X size={16} /> : <Plus size={16} />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-2 custom-scrollbar">
        {isAdding && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-4 space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Họ tên</label>
              <input 
                type="text" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ngày sinh (DD/MM)</label>
              <input 
                type="text" 
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                placeholder="01/01"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <button 
              onClick={handleAddBirthday}
              className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
            >
              <UserPlus size={14} />
              Lưu thông tin
            </button>
          </div>
        )}

        {upcomingBirthdays.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-slate-400 font-medium">Không có sinh nhật trong 30 ngày tới</p>
            <p className="text-[10px] text-slate-300 mt-1">Hãy thêm mới để theo dõi</p>
          </div>
        ) : (
          upcomingBirthdays.map(b => (
            <div 
              key={b.id}
              className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Calendar size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{b.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{b.date}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
