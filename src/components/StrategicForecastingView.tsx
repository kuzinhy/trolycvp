import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, Send, Loader2, Globe, BookOpen, Newspaper, Check, 
  BrainCircuit, Zap, Activity, FileText, Database, Download, Copy 
} from 'lucide-react';
import { generateContentWithRetry } from '../lib/ai-utils';
import { cn } from '../lib/utils';
import { WEB_SOURCES } from '../constants';

const SOURCES = [
  { id: 'internet', label: 'Internet (Google Search)', icon: Globe },
  { id: 'knowledge', label: 'Kho tri thức nội bộ', icon: BookOpen },
  { id: 'news', label: 'Tin tức thời sự', icon: Newspaper }
];

const STRATEGIC_SITUATIONS = [
  'Tăng trưởng kinh tế & Đầu tư công',
  'Chuyển đổi số & Chính quyền điện tử',
  'An ninh trật tự & An toàn xã hội',
  'Cải cách hành chính & Phục vụ người dân',
  'An sinh xã hội & Đời sống dân sinh',
  'Công tác xây dựng Đảng & Hệ thống chính trị',
  'Quản lý đô thị & Môi trường',
  'Tuyên truyền & Định hướng dư luận',
  'Phát triển nguồn nhân lực & Giáo dục',
  'Biến đổi khí hậu & Phòng chống thiên tai'
];

export const StrategicForecastingView: React.FC = () => {
  const [selectedSituations, setSelectedSituations] = useState<string[]>([]);
  const [additionalContext, setAdditionalContext] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>(['internet', 'knowledge']);
  const [selectedWebSources, setSelectedWebSources] = useState<string[]>([]);
  const [forecast, setForecast] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const toggleSituation = (situation: string) => {
    setSelectedSituations(prev => 
      prev.includes(situation) ? prev.filter(s => s !== situation) : [...prev, situation]
    );
  };

  const toggleSource = (id: string) => {
    setSelectedSources(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleWebSource = (id: string) => {
    setSelectedWebSources(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setForecast(null);
    
    try {
      const selectedWebUrls = WEB_SOURCES
        .filter(s => selectedWebSources.includes(s.id))
        .map(s => s.url);

      const prompt = `Bạn là Tổ phân tích chiến lược và dự báo tình hình, có vai trò tương tự cơ quan tham mưu chiến lược của Đảng và Nhà nước.

      Nhiệm vụ của bạn là phân tích sâu các tình hình sau dựa trên các nguồn: ${selectedSources.join(', ')} ${selectedWebUrls.length > 0 ? `, và các nguồn web: ${selectedWebUrls.join(', ')}` : ''}; nhận diện xu hướng, nguy cơ, cơ hội; từ đó tham mưu nội dung lãnh đạo, chỉ đạo cho cấp ủy, chính quyền địa phương.

      Các tình hình cần phân tích:
      ${selectedSituations.map(s => `- ${s}`).join('\n')}

      Thông tin bổ sung từ người dùng:
      ${additionalContext}

      Hãy phân tích và trình bày theo đúng cấu trúc 11 phần sau đây, áp dụng tư duy chiến lược của các cơ quan tham mưu Trung ương:
      1. Tổng quan tình hình hiện tại
      2. Phân tích các yếu tố tác động (Trong nước & Quốc tế)
      3. Nhận diện các xu hướng vận động chủ yếu
      4. Đánh giá các nguy cơ và thách thức tiềm ẩn
      5. Xác định các cơ hội chiến lược
      6. Dự báo các kịch bản có thể xảy ra (Lạc quan, Cơ sở, Tiêu cực)
      7. Đề xuất quan điểm chỉ đạo và mục tiêu chiến lược
      8. Các nhiệm vụ trọng tâm và giải pháp đột phá
      9. Phân công trách nhiệm và lộ trình thực hiện
      10. Đề xuất cơ chế giám sát và đánh giá
      11. Kết luận và kiến nghị cấp trên
      `;

      const config: any = {};
      if (selectedWebUrls.length > 0) {
        config.tools = [{ urlContext: {} }];
      }

      const response = await generateContentWithRetry({
        model: 'gemini-3.1-pro-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config
      });
      
      setForecast(response.text || 'Không thể tạo báo cáo.');
    } catch (error: any) {
      console.error(error);
      setForecast(error.message || 'Lỗi khi tạo báo cáo: Lỗi không xác định');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto p-6 space-y-8"
    >
      {/* Strategic Header */}
      <div className="bento-card p-8 bg-gradient-to-br from-slate-900 to-indigo-950 text-white border-none shadow-2xl overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-blue-500/20 transition-all duration-700" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl">
                <BrainCircuit className="text-blue-400" size={28} />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight uppercase">Dự báo chiến lược v5.0</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
                  <p className="text-blue-200/80 text-[10px] font-black uppercase tracking-[0.2em]">Hệ thống tham mưu trí tuệ nhân tạo cao cấp</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex flex-col items-end mr-4">
              <span className="text-[10px] font-black text-blue-300/60 uppercase tracking-widest">Độ tin cậy hệ thống</span>
              <span className="text-xl font-black text-emerald-400">98.4%</span>
            </div>
            <button 
              onClick={handleAnalyze}
              disabled={isAnalyzing || selectedSituations.length === 0}
              className="btn-pro btn-pro-primary px-8 py-4 text-sm flex items-center gap-3 group/btn"
            >
              {isAnalyzing ? <Loader2 className="animate-spin" size={20}/> : <Zap className="group-hover/btn:fill-current" size={20}/>}
              <span>{isAnalyzing ? 'Đang phân tích...' : 'Kích hoạt dự báo'}</span>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key="analysis"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* Configuration Panel */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bento-card p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Activity size={16} className="text-blue-600" />
                  Cấu hình tham số phân tích
                </h3>
                <span className="text-[10px] font-bold text-slate-400 italic">Đã chọn {selectedSituations.length} lĩnh vực</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {STRATEGIC_SITUATIONS.map(situation => {
                  const isSelected = selectedSituations.includes(situation);
                  return (
                    <button 
                      key={situation}
                      onClick={() => toggleSituation(situation)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-2xl border transition-all duration-300 text-xs font-bold text-left group",
                        isSelected 
                          ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm" 
                          : "bg-slate-50/50 border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-white hover:shadow-md"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all duration-300", 
                        isSelected ? "bg-blue-600 border-blue-600 shadow-md shadow-blue-600/20" : "border-slate-300 bg-white group-hover:border-blue-400"
                      )}>
                        {isSelected && <Check size={12} className="text-white stroke-[3px]" />}
                      </div>
                      <span className="truncate">{situation}</span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={14} />
                    Dữ liệu bối cảnh bổ sung
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">{additionalContext.length}/2000 ký tự</span>
                </div>
                <textarea 
                  value={additionalContext} 
                  onChange={e => setAdditionalContext(e.target.value)} 
                  className="w-full h-40 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none placeholder:text-slate-400" 
                  placeholder="Nhập các chi tiết cụ thể, dữ liệu nội bộ hoặc bối cảnh đặc thù để AI phân tích chính xác hơn..." 
                />
              </div>
            </div>

            {forecast && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="bento-card p-10 text-slate-800 leading-relaxed whitespace-pre-line prose prose-slate max-w-none relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 rounded-xl">
                      <TrendingUp className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Báo cáo Phân tích Chiến lược</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Generated by AI Strategic Engine v5.0</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                      <Download size={18} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                      <Copy size={18} />
                    </button>
                  </div>
                </div>
                <div className="text-base font-medium text-slate-700 leading-loose">
                  {forecast}
                </div>
              </motion.div>
            )}
          </div>

          {/* Sources Panel */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bento-card p-6 space-y-6">
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                <Database size={14} className="text-blue-600" />
                Nguồn dữ liệu hợp nhất
              </h3>
              <div className="space-y-2">
                {SOURCES.map(source => {
                  const Icon = source.icon;
                  const isSelected = selectedSources.includes(source.id);
                  return (
                    <button 
                      key={source.id}
                      onClick={() => toggleSource(source.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 text-xs font-bold group",
                        isSelected 
                          ? "bg-blue-50 border-blue-200 text-blue-700" 
                          : "bg-slate-50/50 border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-white"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg transition-all duration-300",
                          isSelected ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500 group-hover:bg-slate-300"
                        )}>
                          <Icon size={14} />
                        </div>
                        {source.label}
                      </div>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-blue-600 shadow-sm shadow-blue-600/50" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bento-card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Globe size={14} className="text-blue-600" />
                  Cổng thông tin chuyên sâu
                </h3>
                <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">AI Web Search</span>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {WEB_SOURCES.map(source => {
                  const isSelected = selectedWebSources.includes(source.id);
                  return (
                    <button 
                      key={source.id}
                      onClick={() => toggleWebSource(source.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 text-[11px] font-bold text-left group",
                        isSelected 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                          : "bg-slate-50/50 border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-white"
                      )}
                    >
                      <span className="truncate pr-2">{source.label}</span>
                      {isSelected && <Check size={14} className="text-emerald-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Strategic Insights (Mock) */}
            <div className="bento-card p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none">
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-80">Chỉ số chiến lược</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold opacity-70">Tốc độ xử lý</span>
                  <span className="text-sm font-black">0.8s / 1M tokens</span>
                </div>
                <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="w-[85%] h-full bg-emerald-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold opacity-70">Độ phủ dữ liệu</span>
                  <span className="text-sm font-black">Toàn cầu</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default StrategicForecastingView;

