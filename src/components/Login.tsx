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
        className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 text-center max-w-sm w-full"
      >
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Chào mừng trở lại</h1>
        <p className="text-slate-500 mb-8">Vui lòng đăng nhập để tiếp tục sử dụng Trợ lý CVP Đảng ủy</p>
        
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
