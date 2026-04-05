import React, { useMemo } from 'react';
import { Cake, Calendar } from 'lucide-react';
import { Birthday } from '../constants';
import { STAFF_BIRTHDAYS } from '../data/staffBirthdays';
import { cn } from '../lib/utils';

export const StaffBirthdayReminder: React.FC = () => {
  const today = new Date();
  
  const upcomingBirthdays = useMemo(() => {
    const next30Days = new Date();
    next30Days.setDate(today.getDate() + 30);

    return STAFF_BIRTHDAYS.filter(b => {
      const [day, month] = b.date.split('/').map(Number);
      const bDate = new Date(today.getFullYear(), month - 1, day);
      
      // If birthday already passed this year, look at next year
      if (bDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
        bDate.setFullYear(today.getFullYear() + 1);
      }
      
      return bDate >= today && bDate <= next30Days;
    }).sort((a, b) => {
        const [dayA, monthA] = a.date.split('/').map(Number);
        const [dayB, monthB] = b.date.split('/').map(Number);
        const dateA = new Date(today.getFullYear(), monthA - 1, dayA);
        const dateB = new Date(today.getFullYear(), monthB - 1, dayB);
        if (dateA < today) dateA.setFullYear(today.getFullYear() + 1);
        if (dateB < today) dateB.setFullYear(today.getFullYear() + 1);
        return dateA.getTime() - dateB.getTime();
    });
  }, [today]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-rose-50/50 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-sm">
            <Cake size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Sinh nhật cán bộ (30 ngày tới)</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gắn kết đồng chí</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-2 custom-scrollbar">
        {upcomingBirthdays.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-slate-400 font-medium">Không có sinh nhật trong 30 ngày tới</p>
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
