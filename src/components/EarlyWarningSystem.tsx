import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, ShieldAlert, TrendingDown, TrendingUp, RefreshCw, ExternalLink, BrainCircuit, Activity } from 'lucide-react';
import { generateContentWithRetry } from '../lib/ai-utils';
import { cn } from '../lib/utils';
import axios from 'axios';

interface WarningItem {
  id: string;
  title: string;
  summary: string;
  sentiment: 'negative' | 'neutral' | 'positive';
  urgency: 'high' | 'medium' | 'low';
  source: string;
  url: string;
  aiAnalysis: string;
}

export const EarlyWarningSystem: React.FC = () => {
  const [warnings, setWarnings] = useState<WarningItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);

  const scanForWarnings = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch some news first (mocking or using proxy)
      const newsUrls = [
        "https://www.hcmcpv.org.vn/",
        "https://tuoitre.vn/thoi-su.htm",
        "https://vnexpress.net/thoi-su"
      ];
      
      // For demo, we'll use a prompt to simulate scanning and analysis
      const prompt = `Bạn là một chuyên gia phân tích rủi ro và dư luận xã hội. 
Hãy giả lập việc quét các trang tin tức lớn tại Việt Nam (Tuổi Trẻ, VnExpress, Báo Đảng bộ TP.HCM) 
để tìm ra 3 vấn đề nổi cộm, có nguy cơ gây khủng hoảng dư luận hoặc cần sự chỉ đạo khẩn cấp từ lãnh đạo Đảng ủy.

Yêu cầu trả về định dạng JSON mảng các đối tượng:
{
  "id": "string",
  "title": "Tiêu đề tin tức",
  "summary": "Tóm tắt ngắn gọn",
  "sentiment": "negative" | "neutral" | "positive",
  "urgency": "high" | "medium" | "low",
  "source": "Tên nguồn tin",
  "url": "Link giả lập",
  "aiAnalysis": "Phân tích chuyên sâu của AI về tác động và đề xuất hướng xử lý"
}

Hãy tập trung vào các vấn đề: Khiếu kiện, thiên tai, dịch bệnh, sai phạm cán bộ, hoặc các vấn đề dân sinh bức xúc.`;

      const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }]
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        setWarnings(data);
      }
      setLastScan(new Date());
    } catch (error) {
      console.error('Warning scan error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    scanForWarnings();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">Hệ thống Cảnh báo Sớm</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
            Giám sát rủi ro dư luận & Tin tức khẩn cấp
          </p>
        </div>
        <button 
          onClick={scanForWarnings}
          disabled={isLoading}
          className="btn-pro btn-pro-primary gap-2"
        >
          <RefreshCw size={14} className={cn(isLoading && "animate-spin")} />
          <span>Quét hệ thống</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="popLayout">
            {warnings.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "p-8 rounded-[2.5rem] border bg-white shadow-sm relative overflow-hidden group",
                  item.urgency === 'high' ? "border-rose-200" : "border-slate-200"
                )}
              >
                {item.urgency === 'high' && (
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
                )}
                
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-3 rounded-2xl",
                      item.urgency === 'high' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {item.urgency === 'high' ? <ShieldAlert size={24} /> : <AlertTriangle size={24} />}
                    </div>
                    <div>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                        item.urgency === 'high' ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-amber-50 text-amber-600 border-amber-100"
                      )}>
                        {item.urgency === 'high' ? 'Khẩn cấp' : 'Cần lưu ý'}
                      </span>
                      <h4 className="text-xl font-black text-slate-900 mt-2 tracking-tight uppercase">{item.title}</h4>
                    </div>
                  </div>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                    <ExternalLink size={18} />
                  </a>
                </div>

                <p className="text-slate-600 mb-6 leading-relaxed italic">"{item.summary}"</p>

                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <BrainCircuit size={16} className="text-indigo-600" />
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Phân tích AI & Đề xuất</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">{item.aiAnalysis}</p>
                </div>

                <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Activity size={14} className="text-slate-400" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.source}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {item.sentiment === 'negative' ? <TrendingDown size={14} className="text-rose-500" /> : <TrendingUp size={14} className="text-emerald-500" />}
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        item.sentiment === 'negative' ? "text-rose-500" : "text-emerald-500"
                      )}>
                        Sắc thái: {item.sentiment === 'negative' ? 'Tiêu cực' : 'Tích cực'}
                      </span>
                    </div>
                  </div>
                  <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">
                    Tạo báo cáo tham mưu
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="space-y-8">
          <div className="bento-card p-8 bg-slate-900 text-white border-none shadow-2xl">
            <h4 className="text-lg font-black uppercase tracking-tight italic mb-6">Chỉ số rủi ro tổng hợp</h4>
            <div className="flex flex-col items-center justify-center py-10">
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    className="text-slate-800"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={502.4}
                    strokeDashoffset={502.4 * (1 - 0.35)}
                    className="text-amber-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black italic">35%</span>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Ổn định</span>
                </div>
              </div>
            </div>
            <div className="space-y-4 mt-6">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Dư luận mạng</span>
                <span className="text-xs font-black text-emerald-400">Tích cực</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">An ninh trật tự</span>
                <span className="text-xs font-black text-amber-400">Cần lưu ý</span>
              </div>
            </div>
          </div>

          <div className="bento-card p-8">
            <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight italic mb-6">Nguồn tin giám sát</h4>
            <div className="space-y-4">
              {['VnExpress', 'Tuổi Trẻ', 'Báo HCM', 'Cổng TTĐT Chính phủ'].map((source, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-700">{source}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Live</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
