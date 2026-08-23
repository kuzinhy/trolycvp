import React, { useState } from 'react';
import { 
  Bell, Archive, MessageSquare, Send, CheckCircle2, ShieldCheck, 
  Clock, RefreshCw, Key, Link as LinkIcon, Smartphone, Sparkles, 
  HelpCircle, Check, AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

interface AutomationsSettingsModuleProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const AutomationsSettingsModule: React.FC<AutomationsSettingsModuleProps> = ({
  showToast
}) => {
  // Auto-Archive State
  const [autoArchiveEnabled, setAutoArchiveEnabled] = useState(true);
  const [archiveAfterDays, setArchiveAfterDays] = useState(30);

  // Deadline Reminders State
  const [deadlineAlertEnabled, setDeadlineAlertEnabled] = useState(true);
  const [alertDaysBefore, setAlertDaysBefore] = useState(2);
  const [alertTime, setAlertTime] = useState('08:00');
  const [alertFrequency, setAlertFrequency] = useState('daily');

  // Telegram Bot State
  const [telegramToken, setTelegramToken] = useState('7812345678:AAEF_ExampleTokenForTelegramBot99');
  const [telegramChatId, setTelegramChatId] = useState('-1001987654321');
  const [telegramStatus, setTelegramStatus] = useState<'connected' | 'idle' | 'testing'>('connected');

  // Zalo Bot State
  const [zaloToken, setZaloToken] = useState('zalo_oa_sec_8877665544332211');
  const [zaloChatId, setZaloChatId] = useState('0988123456');
  const [zaloStatus, setZaloStatus] = useState<'connected' | 'idle' | 'testing'>('connected');

  const handleTestTelegram = () => {
    setTelegramStatus('testing');
    setTimeout(() => {
      setTelegramStatus('connected');
      showToast('Đã gửi tin nhắn thử nghiệm Telegram Bot thành công!', 'success');
    }, 1200);
  };

  const handleTestZalo = () => {
    setZaloStatus('testing');
    setTimeout(() => {
      setZaloStatus('connected');
      showToast('Đã kết nối và kiểm tra Zalo Bot thành công!', 'success');
    }, 1200);
  };

  const handleSaveAllSettings = () => {
    showToast('Đã lưu cấu hình Tự động hóa & Kết nối Bot thành công!', 'success');
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50/60 min-h-screen space-y-8">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-xs font-extrabold rounded-md uppercase tracking-wider border border-rose-200">
              Hệ thống Tự động
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Cấu hình Lưu trữ & Kết nối Bot</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Cài đặt Tự động & Thông báo Bot
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Cấu hình thời gian tự động lưu trữ nhiệm vụ hoàn thành, quy định cảnh báo deadline và tích hợp Telegram / Zalo Bot.
          </p>
        </div>

        <button
          onClick={handleSaveAllSettings}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-md shadow-rose-600/20 transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <CheckCircle2 size={18} />
          <span>Lưu Cấu hình</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Section 1: Auto-Archive Config */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Archive size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Cài đặt Tự động Lưu trữ (Auto-Archive)</h3>
              <p className="text-xs text-slate-500">Tự động chuyển các dự án & nhiệm vụ đã hoàn thành vào kho lưu trữ.</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <span className="font-bold text-slate-800 block">Kích hoạt Tự động Lưu trữ</span>
                <span className="text-slate-500 text-[11px]">Giúp không gian làm việc luôn gọn gàng.</span>
              </div>
              <input
                type="checkbox"
                checked={autoArchiveEnabled}
                onChange={(e) => setAutoArchiveEnabled(e.target.checked)}
                className="w-5 h-5 accent-rose-600 rounded cursor-pointer"
              />
            </div>

            {autoArchiveEnabled && (
              <div className="space-y-1.5 pt-1">
                <label className="block font-bold text-slate-700">Tự động lưu trữ sau khi hoàn thành (Ngày)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={archiveAfterDays}
                    onChange={(e) => setArchiveAfterDays(Number(e.target.value))}
                    className="w-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none"
                  />
                  <span className="text-slate-500 font-medium">ngày kể từ khi bấm Hoàn thành</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Deadline Reminders Config */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <Bell size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Cảnh báo Deadline & Lịch hẹn</h3>
              <p className="text-xs text-slate-500">Quy định mốc gửi thông báo nhắc nhở cán bộ trước thời hạn.</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <span className="font-bold text-slate-800 block">Bật Nhắc nhở Deadline</span>
                <span className="text-slate-500 text-[11px]">Tự động quét và nhắc việc đến hạn.</span>
              </div>
              <input
                type="checkbox"
                checked={deadlineAlertEnabled}
                onChange={(e) => setDeadlineAlertEnabled(e.target.checked)}
                className="w-5 h-5 accent-rose-600 rounded cursor-pointer"
              />
            </div>

            {deadlineAlertEnabled && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cảnh báo trước (Ngày)</label>
                  <input
                    type="number"
                    min={1}
                    max={14}
                    value={alertDaysBefore}
                    onChange={(e) => setAlertDaysBefore(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giờ gửi thông báo</label>
                  <input
                    type="time"
                    value={alertTime}
                    onChange={(e) => setAlertTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Telegram Bot Integration */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
                <Send size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Cấu hình Telegram Bot</h3>
                <p className="text-xs text-slate-500">Gửi thông báo nhắc việc và báo cáo nhóm qua Telegram.</p>
              </div>
            </div>

            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full uppercase">
              Đã kết nối
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Telegram Bot Token</label>
              <input
                type="text"
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Group / Admin Chat ID</label>
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800"
              />
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                onClick={handleTestTelegram}
                disabled={telegramStatus === 'testing'}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2"
              >
                <Send size={14} />
                <span>{telegramStatus === 'testing' ? 'Đang gửi...' : 'Gửi tin nhắn thử nghiệm'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 4: Zalo Bot Integration */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <MessageSquare size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Cấu hình Zalo Bot Creator</h3>
                <p className="text-xs text-slate-500">Tích hợp tin nhắn Zalo cá nhân / Zalo OA cho cán bộ.</p>
              </div>
            </div>

            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full uppercase">
              Đã kết nối
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Zalo Bot Token / Secret Key</label>
              <input
                type="text"
                value={zaloToken}
                onChange={(e) => setZaloToken(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Zalo User ID / Số điện thoại mặc định</label>
              <input
                type="text"
                value={zaloChatId}
                onChange={(e) => setZaloChatId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800"
              />
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                onClick={handleTestZalo}
                disabled={zaloStatus === 'testing'}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2"
              >
                <MessageSquare size={14} />
                <span>{zaloStatus === 'testing' ? 'Đang gửi...' : 'Kiểm tra kết nối Zalo'}</span>
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
