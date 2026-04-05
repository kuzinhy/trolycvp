import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Newspaper, RefreshCw, ChevronRight, X, ExternalLink, Clock, Globe, Zap, AlertCircle } from 'lucide-react';
import { useNews, NewsItem } from '../context/NewsContext';
import { cn } from '../lib/utils';

export const NewsBar: React.FC = () => {
  const { results, isScanning, handleScan, newsTopics, lastRefresh } = useNews();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (results.length === 0 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % results.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [results.length, isPaused]);

  if (newsTopics.length === 0) {
    return (
      <div className="bg-white border-b border-slate-200/60 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-slate-500">
          <AlertCircle size={16} className="text-amber-500" />
          <p className="text-xs font-medium">Chưa cấu hình chủ đề tin tức. Hãy vào Cài đặt để thiết lập.</p>
        </div>
        <button 
          onClick={() => handleScan()}
          className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline"
        >
          Thiết lập ngay
        </button>
      </div>
    );
  }

  const currentNews = results[currentIndex];

  return (
    <div className="bg-white border-b border-slate-200/60 px-4 sm:px-6 py-2.5 flex items-center gap-4 relative z-30 overflow-hidden">
      {/* Label */}
      <div className="flex items-center gap-2 shrink-0 border-r border-slate-200 pr-4">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
          <Newspaper size={16} />
        </div>
        <div className="hidden sm:block">
          <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-tighter leading-none">Tin tức</h3>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Theo chủ đề</p>
        </div>
      </div>

      {/* Ticker */}
      <div 
        className="flex-1 overflow-hidden relative h-6"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <AnimatePresence mode="wait">
          {isScanning ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 h-full"
            >
              <RefreshCw size={12} className="animate-spin text-slate-400" />
              <div className="h-2 w-48 bg-slate-100 rounded-full animate-pulse" />
            </motion.div>
          ) : results.length > 0 ? (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex items-center gap-3 h-full cursor-pointer group"
              onClick={() => setSelectedNews(currentNews)}
            >
              {currentNews.isAlert && (
                <span className="shrink-0 px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[8px] font-black rounded uppercase tracking-tighter animate-pulse">
                  Khẩn
                </span>
              )}
              <span className="shrink-0 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black rounded uppercase tracking-tighter">
                Mới
              </span>
              <p className="text-xs font-bold text-slate-700 truncate group-hover:text-indigo-600 transition-colors">
                {currentNews.title}
              </p>
              <span className="hidden md:inline text-[10px] text-slate-400 font-medium shrink-0">
                • {currentNews.source}
              </span>
            </motion.div>
          ) : (
            <motion.p 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-slate-400 font-medium h-full flex items-center"
            >
              Không có tin tức mới cho các chủ đề đã chọn.
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0 ml-auto">
        <div className="hidden lg:flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest mr-2">
          <Clock size={10} />
          <span>Cập nhật: {lastRefresh ? lastRefresh.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
        </div>
        
        <button 
          onClick={() => handleScan()}
          disabled={isScanning}
          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-50"
          title="Làm mới"
        >
          <RefreshCw size={14} className={cn(isScanning && "animate-spin")} />
        </button>

        <button 
          className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
        >
          Xem tất cả
          <ChevronRight size={12} />
        </button>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedNews && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSelectedNews(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="relative h-48 sm:h-64 shrink-0">
                <img 
                  src={selectedNews.imageUrl || `https://picsum.photos/seed/${selectedNews.title}/800/450`} 
                  alt={selectedNews.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                <button 
                  onClick={() => setSelectedNews(null)}
                  className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-all"
                >
                  <X size={20} />
                </button>
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded-md uppercase tracking-wider">
                      {selectedNews.source}
                    </span>
                    <span className="px-2 py-0.5 bg-white/20 text-white text-[10px] font-bold rounded-md uppercase tracking-wider backdrop-blur-sm">
                      {selectedNews.date}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                    {selectedNews.title}
                  </h2>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sắc thái</span>
                    <span className={cn(
                      "text-xs font-bold",
                      selectedNews.sentiment === 'Tích cực' ? "text-emerald-600" : 
                      selectedNews.sentiment === 'Tiêu cực' ? "text-rose-600" : "text-slate-600"
                    )}>
                      {selectedNews.sentiment || 'Trung lập'}
                    </span>
                  </div>
                  <div className="w-[1px] h-8 bg-slate-200" />
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quan tâm</span>
                    <span className="text-xs font-bold text-slate-700">
                      {selectedNews.publicInterest || 'Trung bình'}
                    </span>
                  </div>
                  <div className="w-[1px] h-8 bg-slate-200" />
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Liên quan</span>
                    <span className="text-xs font-bold text-indigo-600">
                      {selectedNews.relevance || 'Cao'}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Zap size={18} className="text-amber-500 shrink-0 mt-1" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 mb-1">Tóm tắt nội dung</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {selectedNews.summary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Globe size={18} className="text-blue-500 shrink-0 mt-1" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 mb-1">Nội dung chi tiết</h4>
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {selectedNews.fullContent || "Đang cập nhật nội dung chi tiết..."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <Clock size={12} />
                  <span>Đăng ngày: {selectedNews.date}</span>
                </div>
                <a 
                  href={selectedNews.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold text-sm transition-all shadow-lg shadow-slate-200"
                >
                  Xem bài viết gốc
                  <ExternalLink size={16} />
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
