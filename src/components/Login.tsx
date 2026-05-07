import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';

export const Login: React.FC = () => {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 text-center max-w-sm w-full"
      >
        <div className="w-20 h-20 bg-white rounded-3xl mx-auto mb-6 flex items-center justify-center p-2 shadow-xl shadow-blue-500/10 border border-slate-50">
          <img 
            src="https://i.imgur.com/S9tvwYs.png" 
            alt="Trợ lý Văn phòng cấp ủy" 
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tighter uppercase">Trợ lý Văn phòng cấp ủy</h1>
        <p className="text-[10px] font-black text-slate-400 mb-8 uppercase tracking-[0.25em]">Trợ lý Chiến lược Đảng uỷ</p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        <button 
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-colors disabled:bg-blue-300"
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập với Google"}
        </button>
        <p className="mt-4 text-sm text-slate-500">
          Chưa có tài khoản? <button onClick={handleLogin} className="text-blue-600 hover:underline">Đăng ký ngay</button>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
