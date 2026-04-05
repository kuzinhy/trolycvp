import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Newspaper, RefreshCw, ShieldAlert, Sparkles, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';
import { NewsScannerModule } from './NewsScannerModule';
import { ToxicInfoDetection } from './ToxicInfoDetection';
import { GenZDecoder } from './GenZDecoder';
import { PublicOpinionModule } from './PublicOpinionModule';

export const NewsAndOpinionView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'news' | 'opinion' | 'toxic' | 'genz'>('news');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto p-6 space-y-8"
    >
      <div className="bento-card p-8 bg-gradient-to-br from-slate-900 to-emerald-950 text-white border-none shadow-2xl overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-emerald-500/20 transition-all duration-700" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl">
                <Newspaper className="text-emerald-400" size={28} />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight uppercase">Tin tức & Dư luận v5.0</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
                  <p className="text-emerald-200/80 text-[10px] font-black uppercase tracking-[0.2em]">Hệ thống giám sát dư luận đa chiều</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/10">
            <button
              onClick={() => setActiveTab('news')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 uppercase tracking-wider",
                activeTab === 'news' ? "bg-white text-emerald-900 shadow-xl" : "text-emerald-100/60 hover:text-white hover:bg-white/5"
              )}
            >
              <RefreshCw size={14} className={cn(activeTab === 'news' && "animate-spin-slow")} />
              Quét tin tức
            </button>
            <button
              onClick={() => setActiveTab('opinion')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 uppercase tracking-wider",
                activeTab === 'opinion' ? "bg-white text-emerald-900 shadow-xl" : "text-emerald-100/60 hover:text-white hover:bg-white/5"
              )}
            >
              <MessageSquare size={14} />
              Dư luận & Ý kiến
            </button>
            <button
              onClick={() => setActiveTab('toxic')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 uppercase tracking-wider",
                activeTab === 'toxic' ? "bg-white text-rose-600 shadow-xl" : "text-emerald-100/60 hover:text-white hover:bg-white/5"
              )}
            >
              <ShieldAlert size={14} />
              Xấu độc
            </button>
            <button
              onClick={() => setActiveTab('genz')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 uppercase tracking-wider",
                activeTab === 'genz' ? "bg-white text-purple-600 shadow-xl" : "text-emerald-100/60 hover:text-white hover:bg-white/5"
              )}
            >
              <Sparkles size={14} />
              Gen Z
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'news' ? (
          <motion.div
            key="news"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <NewsScannerModule />
          </motion.div>
        ) : activeTab === 'opinion' ? (
          <motion.div
            key="opinion"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <PublicOpinionModule />
          </motion.div>
        ) : activeTab === 'toxic' ? (
          <motion.div
            key="toxic"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <ToxicInfoDetection />
          </motion.div>
        ) : (
          <motion.div
            key="genz"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <GenZDecoder />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
