import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Dumbbell, FileText, Calendar, Settings, X, Save } from 'lucide-react';
import { ToastType } from './ui/Toast';
import { Button } from './ui/Button';

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
    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all group h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Clock size={14} className="text-indigo-500" /> Nhắc việc cá nhân
        </h3>
        <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
          <Settings size={14} />
        </button>
      </div>

      <div className="space-y-2.5 flex-1">
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

      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Settings size={20} />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900">Cài đặt nhắc việc</h3>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Thời gian ngồi tối đa (phút)</label>
                    <input 
                      type="number" 
                      value={settings.sittingTime} 
                      onChange={e => setSettings({...settings, sittingTime: parseInt(e.target.value)})} 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium" 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Tập thể thao 1</label>
                      <input 
                        type="time" 
                        value={settings.sportsTime} 
                        onChange={e => setSettings({...settings, sportsTime: e.target.value})} 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Tập thể thao 2</label>
                      <input 
                        type="time" 
                        value={settings.sportsTime2} 
                        onChange={e => setSettings({...settings, sportsTime2: e.target.value})} 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Check văn bản</label>
                      <input 
                        type="time" 
                        value={settings.docCheckTime} 
                        onChange={e => setSettings({...settings, docCheckTime: e.target.value})} 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Rà soát ngày mai</label>
                      <input 
                        type="time" 
                        value={settings.tomorrowReviewTime} 
                        onChange={e => setSettings({...settings, tomorrowReviewTime: e.target.value})} 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium" 
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={() => {
                    setIsSettingsOpen(false);
                    showToast("Đã lưu cài đặt nhắc việc", "success");
                  }} 
                  className="w-full rounded-2xl py-6 font-bold shadow-lg shadow-indigo-200"
                >
                  <Save size={18} className="mr-2" /> Lưu cài đặt
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
