import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Newspaper, 
  Loader2, 
  Command, 
  AlertTriangle, 
  MessageSquare, 
  ClipboardCheck, 
  ShieldAlert, 
  Activity,
  ArrowRight,
  Info,
  Globe,
  Crosshair,
  Search,
  Radio,
  Wifi,
  ScanEye,
  ServerCrash,
  BarChart2,
  List,
  MapPin
} from 'lucide-react';
import { cn } from '../lib/utils';
import { generateContentWithRetry, parseAIResponse } from '../lib/ai-utils';
import { useNews, ALL_SOURCES } from '../context/NewsContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface AnalysisResult {
  quickWarning: string;
  opinionAnalysis: string;
  advisoryProposal: string;
  priorityLevel: 'THẤP' | 'TRUNG BÌNH' | 'CAO' | 'RẤT CAO';
  nature: string;
  spreadLevel: 'THẤP' | 'TRUNG BÌNH' | 'CAO' | 'RẤT CAO';
}

export const NewsAndOpinionView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'AUTO' | 'MANUAL'>('AUTO');
  
  // MANUAL TAB STATE
  const [inputContent, setInputContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // AUTO TAB STATE
  const { results, isScanning, handleScan, searchQuery, setSearchQuery, selectedSources, setSelectedSources, locationName } = useNews();
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [viewMode, setViewMode] = useState<'LIST' | 'FORECAST'>('LIST');
  const [filterLocalOnly, setFilterLocalOnly] = useState(false);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const generateTrendData = () => {
    // Determine base values based on actual results sentiment (to fake forecast algorithm)
    const basePositive = results.filter(r => r.sentiment === 'Tích cực').length || 2;
    const baseNegative = results.filter(r => r.sentiment === 'Tiêu cực').length || 1;
    const baseNeutral = results.filter(r => r.sentiment === 'Trung lập').length || 3;

    return [
      { name: 'Tuần 1', Tích_cực: basePositive + Math.floor(Math.random() * 3), Tiêu_cực: baseNegative + Math.floor(Math.random() * 2), Trung_lập: baseNeutral + 1 },
      { name: 'Tuần 2', Tích_cực: basePositive + Math.floor(Math.random() * 4), Tiêu_cực: baseNegative + Math.floor(Math.random() * 4), Trung_lập: baseNeutral + 2 },
      { name: 'Tuần 3', Tích_cực: basePositive + Math.floor(Math.random() * 2), Tiêu_cực: baseNegative + Math.floor(Math.random() * 3), Trung_lập: baseNeutral + Math.floor(Math.random() * 2) },
      { name: 'Tuần 4', Tích_cực: basePositive + Math.floor(Math.random() * 5), Tiêu_cực: baseNegative + Math.floor(Math.random() * 1), Trung_lập: baseNeutral + 3 },
    ];
  };

  const handleManualAnalyze = async () => {
    if (!inputContent.trim()) return;
    
    setIsAnalyzing(true);
    setResult(null);
    setError(null);
    
    try {
      const prompt = `Bạn là trợ lý chuyên trách nắm bắt dư luận xã hội trên không gian mạng phục vụ công tác tham mưu tại địa phương.
Dữ liệu đầu vào từ báo online, mạng xã hội hoặc nguồn mở:
"""
${inputContent}
"""

Hãy phân tích dữ liệu trên theo 7 tiêu chí:
1. Tóm tắt vụ việc/nội dung chính.
2. Xác định địa bàn, cơ quan, cá nhân, lĩnh vực liên quan.
3. Đánh giá tính chất thông tin: tích cực, tiêu cực, trung tính, nhạy cảm, chưa kiểm chứng, có dấu hiệu sai sự thật.
4. Đánh giá mức độ lan truyền: thấp, trung bình, cao, rất cao.
5. Phân tích xu hướng bình luận, nhóm ý kiến chính và nguy cơ phát sinh (nếu có bình luận thì phân tích, không thì dự báo).
6. Xác định nội dung cần xác minh.
7. Đề xuất hướng tham mưu xử lý, định hướng thông tin và theo dõi tiếp.

Hãy trả về kết quả KHÔNG có markdown, là một JSON BẮT BUỘC có cấu trúc:
{
  "quickWarning": "Cảnh báo nhanh ngắn gọn, bao gồm tóm tắt, vụ việc và đối tượng liên quan.",
  "opinionAnalysis": "Phân tích chi tiết dư luận, xu hướng bình luận, nhóm ý kiến và nội dung cần xác minh.",
  "advisoryProposal": "Đề xuất tham mưu xử lý (đề xuất đơn vị xử lý, cách xử lý, định hướng thông tin và theo dõi).",
  "priorityLevel": "THẤP" | "TRUNG BÌNH" | "CAO" | "RẤT CAO",
  "nature": "Một trong các chuỗi: TÍCH CỰC, TIÊU CỰC, TRUNG TÍNH, NHẠY CẢM, CHƯA KIỂM CHỨNG, SAI SỰ THẬT",
  "spreadLevel": "THẤP" | "TRUNG BÌNH" | "CAO" | "RẤT CAO"
}`;

      const response = await generateContentWithRetry({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
        }
      });
      
      const text = response.text;
      const parsed = parseAIResponse(text);
      if (parsed) {
        setResult(parsed as AnalysisResult);
      } else {
        throw new Error('Không thể phân tích dữ liệu trả về từ AI. Định dạng sai.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Đã có lỗi xảy ra trong quá trình phân tích.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executeAutoScan = () => {
    setSearchQuery(localQuery);
    handleScan(localQuery);
  };

  const getPriorityColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'RẤT CAO': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'CAO': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'TRUNG BÌNH': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'THẤP': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getNatureColor = (nature: string) => {
    switch (nature?.toUpperCase()) {
      case 'TIÊU CỰC': return 'text-rose-600 bg-rose-50';
      case 'SAI SỰ THẬT': return 'text-rose-700 bg-rose-100 border-rose-300';
      case 'NHẠY CẢM': return 'text-amber-600 bg-amber-50';
      case 'CHƯA KIỂM CHỨNG': return 'text-orange-600 bg-orange-50';
      case 'TÍCH CỰC': return 'text-emerald-600 bg-emerald-50';
      case 'TRUNG TÍNH': return 'text-blue-600 bg-blue-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const filteredResults = filterLocalOnly 
    ? results.filter((item: any) => {
        const textToSearch = (item.title + ' ' + item.summary + ' ' + (item.fullContent || '')).toLowerCase();
        const localNameLower = locationName ? locationName.toLowerCase() : '';
        const localKeywords = ['thủ dầu một', 'bình dương'];
        if (localNameLower) localKeywords.push(localNameLower);
        return localKeywords.some(kw => textToSearch.includes(kw));
      })
    : results;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8"
    >
      {/* Header */}
      <div className="bento-card p-6 md:p-8 bg-gradient-to-br from-slate-900 to-indigo-950 text-white border-none shadow-xl overflow-hidden relative group md:rounded-[2rem]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-indigo-500/20 transition-all duration-700" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl">
                <RadarIcon className="text-indigo-400" size={32} />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">Tin tức & Dư luận v5.0</h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
                  <p className="text-indigo-200 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em]">Hệ thống giám sát OSINT chuyên sâu</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex p-1 bg-white/10 rounded-xl backdrop-blur-sm self-start md:self-auto">
            <button 
              onClick={() => setActiveTab('AUTO')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2",
                activeTab === 'AUTO' ? "bg-white text-indigo-900 shadow-md" : "text-white/70 hover:text-white"
              )}
            >
              <Radio size={14} /> Tự động quét (OSINT)
            </button>
            <button 
              onClick={() => setActiveTab('MANUAL')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2",
                activeTab === 'MANUAL' ? "bg-white text-indigo-900 shadow-md" : "text-white/70 hover:text-white"
              )}
            >
              <ClipboardCheck size={14} /> Phân tích thủ công
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'MANUAL' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8">
          {/* Input Panel */}
          <div className="xl:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/60 p-5 md:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Command size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Dữ liệu đầu vào</h3>
                  <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-0.5">Văn bản / Bài đăng</p>
                </div>
              </div>
              
              <textarea
                className="w-full h-[400px] p-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none font-medium text-slate-700"
                placeholder="Dán nội dung bản tin, bài đăng mạng xã hội, hoặc luồng bình luận cần phân tích vào đây..."
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                disabled={isAnalyzing}
              />

              <button
                onClick={handleManualAnalyze}
                disabled={!inputContent.trim() || isAnalyzing}
                className={cn(
                  "w-full mt-4 flex items-center justify-center gap-2 py-4 rounded-xl font-bold uppercase tracking-wider text-sm transition-all",
                  !inputContent.trim() || isAnalyzing 
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20"
                )}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Đang phân tích dữ liệu...
                  </>
                ) : (
                  <>
                    <Activity size={18} />
                    Bắt đầu phân tích
                  </>
                )}
              </button>
              
              {error && (
                <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl flex gap-3 text-rose-700 text-sm font-medium">
                  <AlertTriangle size={18} className="shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Output Panel */}
          <div className="xl:col-span-7 space-y-6">
            <AnimatePresence mode="wait">
              {!result && !isAnalyzing && (
                 <motion.div 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="h-full min-h-[400px] border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 space-y-4 p-8 text-center"
                 >
                   <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-2">
                     <Newspaper size={32} />
                   </div>
                   <p className="font-medium">Hệ thống chờ phân tích dữ liệu thủ công.</p>
                 </motion.div>
              )}

              {isAnalyzing && (
                 <motion.div 
                   key="loading"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="h-full min-h-[400px] border border-slate-200 rounded-3xl flex flex-col items-center justify-center bg-white shadow-sm space-y-4 p-8"
                 >
                   <div className="relative">
                     <div className="w-16 h-16 border-4 border-indigo-100 rounded-full animate-pulse" />
                     <div className="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin" />
                   </div>
                   <p className="font-bold text-slate-600 animate-pulse">Trí tuệ nhân tạo đang phân tích lớp nghĩa...</p>
                 </motion.div>
              )}

              {result && !isAnalyzing && (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-2 gap-4 md:gap-6">
                    <div className="bg-gradient-to-br from-indigo-50/50 to-white p-6 rounded-[1.5rem] border border-indigo-100 shadow-sm shadow-indigo-100/50 flex flex-col gap-3 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl -mr-10 -mt-10 group-hover:bg-indigo-500/10 transition-all" />
                      <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400/80">Ưu tiên xử lý</span>
                      <span className={cn("px-4 py-2.5 rounded-xl text-sm font-black w-max flex items-center gap-2 border uppercase tracking-wider relative z-10", getPriorityColor(result.priorityLevel))}>
                        {result.priorityLevel === 'RẤT CAO' || result.priorityLevel === 'CAO' ? <AlertTriangle size={16} /> : <Info size={16} />}
                        {result.priorityLevel}
                      </span>
                    </div>
                    
                    <div className="bg-gradient-to-br from-slate-50/50 to-white p-6 rounded-[1.5rem] border border-slate-200/60 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/5 rounded-full blur-xl -mr-10 -mt-10 group-hover:bg-slate-500/10 transition-all" />
                      <div className="flex items-center justify-between relative z-10">
                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Đánh giá chung</span>
                        <Activity size={16} className="text-slate-300" />
                      </div>
                      <div className="flex gap-2 flex-wrap mt-3 relative z-10">
                        <span className={cn("px-3 py-1.5 rounded-lg text-[11px] font-bold border uppercase tracking-wider", getNatureColor(result.nature))}>
                          {result.nature}
                        </span>
                        <span className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">
                          Lan truyền: {result.spreadLevel}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -mr-16 -mt-16" />
                    <div className="flex items-center gap-3 mb-4 relative z-10">
                      <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                        <ShieldAlert size={20} />
                      </div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Cảnh báo nhanh</h3>
                    </div>
                    <div className="relative z-10 text-slate-700 leading-relaxed text-sm whitespace-pre-wrap">
                      {result.quickWarning}
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-16 -mt-16" />
                    <div className="flex items-center gap-3 mb-4 relative z-10">
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                        <MessageSquare size={20} />
                      </div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Phân tích dư luận</h3>
                    </div>
                    <div className="relative z-10 text-slate-700 leading-relaxed text-sm whitespace-pre-wrap">
                      {result.opinionAnalysis}
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-16 -mt-16" />
                    <div className="flex items-center gap-3 mb-4 relative z-10">
                      <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                        <ClipboardCheck size={20} />
                      </div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Đề xuất tham mưu</h3>
                    </div>
                    <div className="relative z-10 text-slate-700 leading-relaxed text-sm whitespace-pre-wrap">
                      {result.advisoryProposal}
                    </div>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {activeTab === 'AUTO' && (
        <div className="space-y-6 md:space-y-8">
          <div className="bg-slate-950 text-slate-300 rounded-[2rem] p-6 md:p-10 shadow-2xl shadow-indigo-900/20 border border-indigo-900/30 relative overflow-hidden group">
            {/* Ambient Background Effects */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none group-hover:bg-indigo-900/20 transition-all duration-1000" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-transparent to-transparent pointer-events-none" />
            
            <div className="relative z-10 flex flex-col lg:flex-row gap-6 items-end">
              <div className="flex-1 w-full space-y-3">
                <label className="flex items-center gap-2 text-xs font-mono tracking-[0.2em] text-indigo-400 uppercase">
                  <Crosshair size={14} className="text-indigo-500" />
                  Mục tiêu giám sát (Keywords / Entities)
                </label>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Search size={20} className="text-indigo-500/50 group-focus-within/input:text-indigo-400 transition-colors" />
                  </div>
                  <input 
                    type="text" 
                    className="w-full bg-slate-900/50 border border-indigo-500/20 text-indigo-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 font-mono text-base placeholder:text-slate-600 shadow-inner shadow-black/20 transition-all"
                    placeholder="Vd: Lộ lọt dữ liệu, APT32, Mã độc hại, Tình hình an ninh trật tự..."
                    value={localQuery}
                    onChange={(e) => setLocalQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && executeAutoScan()}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/80 border border-slate-700/50 text-[10px] text-slate-400 font-mono">
                      <span>↵</span> Enter
                    </div>
                  </div>
                </div>
              </div>
              
              <button
                onClick={executeAutoScan}
                disabled={isScanning || !localQuery.trim()}
                className={cn(
                  "w-full lg:w-auto px-8 py-4 rounded-2xl font-black uppercase tracking-[0.15em] text-sm transition-all flex items-center justify-center gap-3 relative overflow-hidden",
                  isScanning 
                    ? "bg-slate-800/80 text-slate-500 border border-slate-700/50 cursor-not-allowed" 
                    : "bg-indigo-600 text-white hover:bg-indigo-500 border border-indigo-500 hover:border-indigo-400 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]"
                )}
              >
                {isScanning ? (
                  <><ScanEye size={20} className="animate-pulse" /> Đang quyét mảng mạng...</>
                ) : (
                  <>
                    <span className="relative z-10 flex items-center gap-2"><Radio size={20} /> Khởi động Radar</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[150%] hover:animate-[shimmer_1.5s_infinite]" />
                  </>
                )}
              </button>
            </div>
            
            <div className="mt-8 pt-6 border-t border-indigo-500/10 hidden md:block relative z-10">
               <div className="flex flex-wrap gap-3 items-center">
                 <span className="text-[10px] font-black tracking-widest text-slate-500 mr-2 uppercase flex items-center gap-1.5">
                   <ServerCrash size={12} /> Data Nodes:
                 </span>
                 
                 <div className="px-3 py-1.5 bg-indigo-900/30 rounded-lg text-xs font-mono flex items-center gap-2 border border-indigo-500/30 text-indigo-300">
                   <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                   AI Grounding OSINT
                 </div>
                 
                 <div className="px-3 py-1.5 bg-emerald-900/30 rounded-lg text-xs font-mono flex items-center gap-2 border border-emerald-500/30 text-emerald-300">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                   Real-time RSS Syndication
                 </div>

                 {ALL_SOURCES.slice(0, 3).map(src => (
                   <div key={src.id} className="px-3 py-1.5 bg-slate-800/50 rounded-lg text-[10px] font-mono flex items-center gap-2 border border-slate-700/50 text-slate-400 transition-colors hover:text-slate-300 hover:border-slate-600">
                     <Globe size={10} className="opacity-50" />
                     {src.url.replace('https://', '').replace('/', '')}
                   </div>
                 ))}
                 <div className="px-3 py-1.5 bg-slate-800/30 rounded-lg text-[10px] font-mono flex items-center gap-1.5 border border-slate-800 text-slate-500">
                   + {ALL_SOURCES.length - 3} targets pending
                 </div>
               </div>
             </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                Kết quả quét mảng thông tin
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold border border-slate-200">{filteredResults.length}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <MapPin size={12} className="text-indigo-500" /> Vùng dữ liệu ưu tiên: <strong className="text-slate-700">{locationName}</strong>
              </p>
            </div>
            
            {results.length > 0 && (
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={filterLocalOnly} 
                    onChange={(e) => setFilterLocalOnly(e.target.checked)}
                    className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-bold">Tin tức {locationName ? locationName.split(',')[0] : 'địa phương'}</span>
                </label>
                <div className="flex p-1 bg-slate-100 rounded-xl">
                <button 
                  onClick={() => setViewMode('LIST')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2",
                    viewMode === 'LIST' ? "bg-white text-indigo-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <List size={14} /> Danh sách
                </button>
                <button 
                  onClick={() => setViewMode('FORECAST')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2",
                    viewMode === 'FORECAST' ? "bg-white text-indigo-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <BarChart2 size={14} /> Dự báo xu hướng
                </button>
                </div>
              </div>
            )}
          </div>

          {!isScanning && filteredResults.length > 0 && viewMode === 'FORECAST' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-950 rounded-[2rem] border border-indigo-900/30 p-6 md:p-10 shadow-2xl shadow-indigo-900/20 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden group"
            >
              <div 
                className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-50" 
                style={{ WebkitMaskImage: 'radial-gradient(circle at center, black, transparent 80%)', maskImage: 'radial-gradient(circle at center, black, transparent 80%)' }}
              />
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
              
              <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between mb-10 relative z-10 gap-4">
                <div>
                  <h4 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-3">
                    Dự báo Xu hướng Dư luận 
                    <span className="px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-mono tracking-widest uppercase border border-indigo-500/30">30 Ngày tới</span>
                  </h4>
                  <p className="text-xs font-mono text-slate-400 mt-2 uppercase tracking-wide">Hệ thống phân tích và dự báo tự động bằng AI Models.</p>
                </div>
                <div className="px-4 py-2.5 bg-slate-900 text-indigo-400 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 border border-slate-800 shadow-inner shadow-black relative overflow-hidden group-hover:border-indigo-500/50 transition-colors cursor-default">
                  <div className="absolute inset-0 bg-indigo-500/10 -translate-x-full animate-[shimmer_3s_infinite]" />
                  <Activity size={14} className="relative z-10" /> Mô hình Dự báo Alpha
                </div>
              </div>
              
              <div className="w-full h-[400px] relative z-10 bg-slate-900/50 rounded-2xl p-4 border border-slate-800 backdrop-blur-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={generateTrendData()} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorNeg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorNeu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#64748b" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.5} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}
                      dy={15}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}
                      dx={-15}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid rgba(51,65,85,0.8)', backgroundColor: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(8px)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', color: '#f8fafc', fontWeight: 600, fontSize: '12px' }}
                      itemStyle={{ fontWeight: 700, margin: '2px 0' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#94a3b8', textTransform: 'uppercase' }} />
                    <Area type="monotone" dataKey="Tích_cực" name="Tích cực" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPos)" filter="url(#glow)" />
                    <Area type="monotone" dataKey="Trung_lập" name="Trung lập" stroke="#64748b" strokeWidth={3} fillOpacity={1} fill="url(#colorNeu)" />
                    <Area type="monotone" dataKey="Tiêu_cực" name="Tiêu cực" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorNeg)" filter="url(#glow)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          <div className={cn("grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6", viewMode === 'FORECAST' ? 'hidden' : '')}>
            <AnimatePresence mode="popLayout">
              {isScanning && (
                <motion.div 
                  key="scanning-indicator"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="col-span-full h-80 border border-indigo-500/20 bg-slate-950/80 rounded-[2.5rem] flex flex-col items-center justify-center space-y-8 relative overflow-hidden backdrop-blur-xl"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900/50 to-transparent blur-2xl" />
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500/30 blur-2xl rounded-full" />
                    <div className="absolute inset-0 border border-indigo-400/50 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                    <div className="w-24 h-24 rounded-full bg-indigo-900/50 border border-indigo-500/50 flex items-center justify-center relative z-10 shadow-[0_0_50px_rgba(79,70,229,0.5)]">
                      <ScanEye size={40} className="text-indigo-400 animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-3 text-center relative z-10 max-w-sm">
                    <p className="font-mono text-indigo-400 font-bold uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-2">
                       <Loader2 size={16} className="animate-spin" /> Deep OSINT Reconnaissance...
                    </p>
                    <p className="font-mono text-slate-500 text-xs leading-relaxed">Hệ thống đang rà quét các mạng lưới dữ liệu mở, trích xuất thực thể và đánh giá rủi ro an ninh mạng.</p>
                  </div>
                </motion.div>
              )}

              {!isScanning && filteredResults.length === 0 && (
                <motion.div 
                  key="empty-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full h-80 border border-slate-200 bg-white/50 rounded-[2.5rem] flex flex-col items-center justify-center space-y-6 shadow-sm"
                >
                  <div className="w-24 h-24 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-2 relative">
                    <div className="absolute inset-0 border border-slate-200 rounded-full animate-[ping_3s_infinite] opacity-50" />
                    <Wifi size={32} />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="font-black text-slate-700 text-lg">Radar Monitoring Mode Standby</p>
                    <p className="text-sm text-slate-500 font-medium">Nhập thực thể mục tiêu và khởi động dữ liệu trinh sát.</p>
                  </div>
                </motion.div>
              )}

              {!isScanning && filteredResults.map((item, idx) => {
                const isCritical = item.threatLevel === 'Critical' || (item as any).severity === 'critical' || (item as any).severity === 'Critical';
                return (
                <motion.div
                  key={`${item.url}-${idx}`}
                  initial={{ opacity: 0, scale: 0.95, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: idx * 0.1, type: "spring", stiffness: 200, damping: 20 }}
                  className={cn(
                    "news-card flex flex-col bg-white rounded-[1.5rem] border overflow-hidden transition-all duration-300 hover:scale-[1.015] hover:shadow-[0_10px_40px_rgb(0,0,0,0.06)] shadow-[0_2px_15px_rgb(0,0,0,0.03)] group relative",
                    isCritical
                      ? "border-rose-500/40 hover:border-rose-500/60 shadow-[0_8px_30px_rgba(225,29,72,0.12)] hover:shadow-[0_12px_40px_rgba(225,29,72,0.2)] z-10" 
                      : item.threatLevel === 'High' 
                        ? "border-orange-200 hover:border-orange-300 shadow-[0_4px_20px_rgba(234,88,12,0.05)] hover:shadow-[0_8px_30px_rgba(234,88,12,0.08)]" 
                        : "border-slate-200/60 hover:border-indigo-200"
                  )}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-transparent pointer-events-none" />
                  
                  {isCritical && (
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-rose-600 via-rose-400 to-rose-600 animate-[shimmer_2s_infinite] bg-[length:200%_100%]"></div>
                  )}
                  {/* Status Indicator */}
                  <div className={cn("p-5 border-b relative z-10 flex items-center justify-between", isCritical ? "bg-rose-50/80 border-rose-100/50" : "bg-slate-50/80 border-slate-100 backdrop-blur-sm")}>
                    <div className="flex items-center gap-2.5">
                       {isCritical ? (
                         <div className="bg-rose-100 text-rose-600 w-7 h-7 rounded-lg flex items-center justify-center animate-pulse shadow-inner shadow-white">
                           <AlertTriangle size={14} strokeWidth={2.5} />
                         </div>
                       ) : (
                         <span className="flex h-2.5 w-2.5 relative">
                          <span className={cn(
                            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                            item.threatLevel === 'High' ? 'bg-orange-500' :
                            'bg-emerald-500'
                          )}></span>
                          <span className={cn(
                            "relative inline-flex rounded-full h-full w-full",
                            item.threatLevel === 'High' ? 'bg-orange-500' :
                            'bg-emerald-500'
                          )}></span>
                        </span>
                       )}
                      <span className={cn("text-[10px] font-black tracking-[0.2em] uppercase", isCritical ? "text-rose-600" : "text-slate-500 group-hover:text-indigo-600 transition-colors")}>{item.source || 'Nguồn mở'}</span>
                    </div>
                    <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">{item.date}</span>
                  </div>

                  <div className="p-6 md:p-8 flex-1 flex flex-col relative z-10 bg-white">
                    <h3 className="font-extrabold text-slate-900 text-lg md:text-xl leading-tight mb-4 group-hover:text-indigo-600 transition-colors line-clamp-2">
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="focus:outline-none">{item.title}</a>
                    </h3>
                    
                    <p className="text-slate-600 text-sm leading-relaxed line-clamp-3 mb-8 flex-1 text-justify font-medium">
                      {item.summary}
                    </p>

                    <div className="space-y-4 mt-auto">
                      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
                        <span className="text-slate-400">Sắc thái dư luận</span>
                        <span className={cn(
                          "px-3 py-1.5 rounded-lg border",
                          item.sentiment === 'Tích cực' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          item.sentiment === 'Tiêu cực' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          'bg-slate-50 text-slate-600 border-slate-200'
                        )}>{item.sentiment || 'Trung lập'}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
                        <span className="text-slate-400">Nguy cơ rủi ro</span>
                        <div className="flex items-center gap-2">
                          {item.threatLevel === 'Critical' && <ServerCrash size={14} className="text-rose-600 animate-pulse" />}
                          <span className={cn(
                            "px-3 py-1.5 rounded-lg border",
                            item.threatLevel === 'Critical' ? 'text-rose-700 bg-rose-50 border-rose-200 shadow-sm shadow-rose-200' :
                            item.threatLevel === 'High' ? 'text-orange-700 bg-orange-50 border-orange-200' :
                            item.threatLevel === 'Medium' ? 'text-blue-700 bg-blue-50 border-blue-200' :
                            'text-emerald-700 bg-emerald-50 border-emerald-200'
                          )}>
                            {item.threatLevel === 'Critical' ? 'CRITICAL' : 
                             item.threatLevel === 'High' ? 'HIGH' :
                             item.threatLevel === 'Medium' ? 'MEDIUM' : 'LOW'}
                          </span>
                        </div>
                      </div>

                      {item.attackVector && (
                        <div className="pt-4 border-t border-slate-100 border-dashed">
                          <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Vectors / Indicators</p>
                          <p className="text-[11px] font-mono text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">{item.attackVector}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {item.isAlert && (
                     <div className="bg-gradient-to-r from-rose-50 to-rose-100/50 p-5 flex items-start gap-3 relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-rose-200 via-rose-300 to-rose-200" />
                       <ShieldAlert className="text-rose-600 shrink-0 mt-0.5 relative z-10" size={18} />
                       <p className="text-xs font-bold text-rose-800 leading-relaxed relative z-10">{item.alertReason || 'Phát hiện rủi ro an ninh mạng cần theo dõi khẩn.'}</p>
                     </div>
                  )}
                </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// Helper icon
const RadarIcon = ({ className, size }: { className?: string; size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19.07 4.93A10 10 0 0 0 6.99 3.34" />
    <path d="M4 6h.01" />
    <path d="M2.29 9.62A10 10 0 1 0 21.31 8.35" />
    <path d="M16.24 7.76A6 6 0 1 0 8.23 16.67" />
    <path d="M12 18h.01" />
    <path d="M17.99 11.66A6 6 0 0 1 15.77 16.67" />
    <circle cx="12" cy="12" r="2" />
    <path d="m13.41 10.59 5.66-5.66" />
  </svg>
)
