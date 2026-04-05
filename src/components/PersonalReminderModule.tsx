import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Clock, Dumbbell, FileText, Calendar, Settings, X, Save } from 'lucide-react';
import { ToastType } from './ui/Toast';

interface ReminderSettings {
  sittingTime: number; // minutes
  sportsTime: string; // HH:mm
  sportsTime2: string; // HH:mm
  docCheckTime: string; // HH:mm
  tomorrowReviewTime: string; // HH:mm
}

interface PersonalReminderModuleProps {
  showToast: (message: string, type?: ToastType) => void;
}

export const PersonalReminderModule: React.FC<PersonalReminderModuleProps> = ({ showToast }) => {
  const [settings, setSettings] = useState<ReminderSettings>({
    sittingTime: 60,
    sportsTime: '17:30',
    sportsTime2: '06:30',
    docCheckTime: '09:00',
    tomorrowReviewTime: '16:30'
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (currentTime === settings.sportsTime || currentTime === settings.sportsTime2) {
        showToast("Đã đến giờ tập thể thao, hãy vận động nâng cao sức khỏe!", "success");
      }
      if (currentTime === settings.docCheckTime) {
        showToast("Đã đến giờ check văn bản, hãy rà soát lại các văn bản cần xử lý!", "info");
      }
      if (currentTime === settings.tomorrowReviewTime) {
        showToast("Đã đến giờ rà soát công tác chuẩn bị nhiệm vụ ngày mai!", "warning");
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [settings, showToast]);

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Clock size={14} className="text-indigo-500" /> Nhắc việc cá nhân
        </h3>
        <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
          <Settings size={14} />
        </button>
      </div>

      {isSettingsOpen ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Thời gian ngồi (phút)</label>
              <input type="number" value={settings.sittingTime} onChange={e => setSettings({...settings, sittingTime: parseInt(e.target.value)})} className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs" />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Tập thể thao 1</label>
              <input type="time" value={settings.sportsTime} onChange={e => setSettings({...settings, sportsTime: e.target.value})} className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs" />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Tập thể thao 2</label>
              <input type="time" value={settings.sportsTime2} onChange={e => setSettings({...settings, sportsTime2: e.target.value})} className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs" />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Check văn bản</label>
              <input type="time" value={settings.docCheckTime} onChange={e => setSettings({...settings, docCheckTime: e.target.value})} className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs" />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Rà soát mai</label>
              <input type="time" value={settings.tomorrowReviewTime} onChange={e => setSettings({...settings, tomorrowReviewTime: e.target.value})} className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs" />
            </div>
          </div>
          <button onClick={() => setIsSettingsOpen(false)} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors">
            <Save size={14} /> Lưu cài đặt
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 font-medium">
              <Dumbbell size={14} className="text-emerald-500" /> Tập thể thao 1
            </div>
            <span className="font-bold text-slate-900">{settings.sportsTime}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 font-medium">
              <Dumbbell size={14} className="text-emerald-500" /> Tập thể thao 2
            </div>
            <span className="font-bold text-slate-900">{settings.sportsTime2}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 font-medium">
              <FileText size={14} className="text-amber-500" /> Check văn bản
            </div>
            <span className="font-bold text-slate-900">{settings.docCheckTime}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 font-medium">
              <Calendar size={14} className="text-rose-500" /> Rà soát mai
            </div>
            <span className="font-bold text-slate-900">{settings.tomorrowReviewTime}</span>
          </div>
        </div>
      )}
    </div>
  );
};
