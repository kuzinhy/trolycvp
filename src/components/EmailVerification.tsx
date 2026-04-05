import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, RefreshCw, LogOut, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const EmailVerification: React.FC = () => {
  const { user, signOutUser, sendVerificationEmail, refreshUser } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendEmail = async () => {
    if (countdown > 0) return;
    setIsSending(true);
    setMessage(null);
    try {
      await sendVerificationEmail();
      setMessage({ text: 'Email xác thực đã được gửi. Vui lòng kiểm tra hộp thư của bạn.', type: 'success' });
      setCountdown(60);
    } catch (error: any) {
      setMessage({ text: error.message || 'Lỗi khi gửi email xác thực.', type: 'error' });
    } finally {
      setIsSending(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setMessage(null);
    try {
      await refreshUser();
    } catch (error: any) {
      setMessage({ text: error.message || 'Lỗi khi làm mới trạng thái.', type: 'error' });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 text-center border border-slate-100"
      >
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="text-emerald-500 w-10 h-10" />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Xác thực Email</h1>
        <p className="text-slate-500 mb-8">
          Chúng tôi đã gửi một liên kết xác thực đến địa chỉ email: <br />
          <span className="font-semibold text-slate-700">{user?.email}</span>
        </p>

        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 text-left ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
          }`}>
            {message.type === 'success' ? <CheckCircle size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
          >
            {isRefreshing ? <RefreshCw className="animate-spin" size={20} /> : <RefreshCw size={20} />}
            Tôi đã xác thực email
          </button>

          <button
            onClick={handleSendEmail}
            disabled={isSending || countdown > 0}
            className="w-full bg-white hover:bg-slate-50 disabled:bg-white text-slate-600 font-bold py-3 px-4 rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-2"
          >
            {isSending ? <RefreshCw className="animate-spin" size={20} /> : <Mail size={20} />}
            {countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại email xác thực'}
          </button>

          <button
            onClick={signOutUser}
            className="w-full bg-white hover:bg-slate-50 text-slate-400 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={20} />
            Đăng xuất
          </button>
        </div>

        <div className="mt-8 pt-8 border-top border-slate-100">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">
            Hệ thống quản lý văn phòng thông minh
          </p>
        </div>
      </motion.div>
    </div>
  );
};
