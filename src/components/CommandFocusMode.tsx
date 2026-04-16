import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, X, Target, Zap, Clock, CheckCircle2, AlertCircle, Sparkles, Brain } from 'lucide-react';
import { cn } from '../lib/utils';
import { Task } from '../constants';

interface CommandFocusModeProps {
  task: Task;
  onClose: () => void;
  onComplete: (id: string) => void;
}

export const CommandFocusMode: React.FC<CommandFocusModeProps> = ({ task, onClose, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // Default 25 mins
  const [isActive, setIsActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(25 * 60);
  };

  const handleComplete = () => {
    setIsCompleted(true);
    setTimeout(() => {
      onComplete(task.id);
      onClose();
    }, 1500);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-slate-950 flex flex-col items-center justify-center p-6"
    >
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute top-0 left-0 w-full h-full opacity-20" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10 w-full max-w-3xl flex flex-col items-center gap-12">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-4">
          <div className="flex items-center gap-3 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400">
            <Target size={18} />
            <span className="text-xs font-black uppercase tracking-[0.3em]">Command Focus Mode</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight max-w-2xl">
            {task.title}
          </h2>
          <p className="text-slate-400 text-lg max-w-xl font-medium">
            {task.description || "Đang tập trung xử lý nhiệm vụ chiến lược..."}
          </p>
        </div>

        {/* Timer Circle */}
        <div className="relative flex items-center justify-center">
          <svg className="w-64 h-64 md:w-80 md:h-80 transform -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="48%"
              className="stroke-slate-800 fill-none"
              strokeWidth="4"
            />
            <motion.circle
              cx="50%"
              cy="50%"
              r="48%"
              className="stroke-indigo-500 fill-none"
              strokeWidth="4"
              strokeDasharray="100"
              initial={{ strokeDashoffset: 100 }}
              animate={{ strokeDashoffset: (timeLeft / (25 * 60)) * 100 }}
              transition={{ duration: 1, ease: "linear" }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-6xl md:text-8xl font-black text-white tracking-tighter font-mono">
              {formatTime(timeLeft)}
            </span>
            <span className="text-xs font-black text-indigo-400 uppercase tracking-widest mt-2">Thời gian còn lại</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6">
          <button 
            onClick={resetTimer}
            className="p-4 bg-slate-900 text-slate-400 rounded-2xl border border-slate-800 hover:text-white hover:border-slate-700 transition-all"
          >
            <RotateCcw size={24} />
          </button>
          
          <button 
            onClick={toggleTimer}
            className={cn(
              "w-20 h-20 rounded-3xl flex items-center justify-center transition-all shadow-2xl",
              isActive 
                ? "bg-rose-500 text-white shadow-rose-500/20" 
                : "bg-indigo-600 text-white shadow-indigo-600/20"
            )}
          >
            {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
          </button>

          <button 
            onClick={handleComplete}
            disabled={isCompleted}
            className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"
          >
            <CheckCircle2 size={24} />
          </button>
        </div>

        {/* Tips / AI Advice */}
        <div className="w-full max-w-lg bg-slate-900/50 backdrop-blur-md p-6 rounded-[2rem] border border-slate-800 flex items-start gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl">
            <Brain size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Lời khuyên từ AI</p>
            <p className="text-sm text-slate-300 font-medium leading-relaxed">
              Hãy tập trung hoàn thành dứt điểm nhiệm vụ này. Mọi thông báo đã được tạm ẩn để đảm bảo hiệu suất cao nhất cho Chỉ huy.
            </p>
          </div>
        </div>
      </div>

      {/* Exit Button */}
      <button 
        onClick={onClose}
        className="absolute top-8 right-8 p-3 text-slate-500 hover:text-white transition-colors"
      >
        <X size={32} />
      </button>

      {/* Completion Overlay */}
      <AnimatePresence>
        {isCompleted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 bg-emerald-600 flex flex-col items-center justify-center text-white"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="w-24 h-24 bg-white text-emerald-600 rounded-full flex items-center justify-center shadow-2xl">
                <CheckCircle2 size={48} />
              </div>
              <h3 className="text-4xl font-black tracking-tight">Nhiệm vụ Hoàn tất!</h3>
              <p className="text-emerald-100 font-bold uppercase tracking-widest">Tuyệt vời, thưa Chỉ huy.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
