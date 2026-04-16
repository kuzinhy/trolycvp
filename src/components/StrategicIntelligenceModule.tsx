import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BrainCircuit, 
  MessageSquare, 
  MapPin, 
  TrendingUp, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  FileText,
  Clock,
  ChevronRight,
  Lightbulb,
  ShieldAlert,
  Zap,
  Copy,
  Check
} from 'lucide-react';
import { useStrategicIntelligence } from '../hooks/useStrategicIntelligence';
import { ToastType } from './ui/Toast';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';

interface StrategicIntelligenceModuleProps {
  aiKnowledge: any[];
  showToast: (message: string, type?: ToastType) => void;
}

export const StrategicIntelligenceModule: React.FC<StrategicIntelligenceModuleProps> = ({ aiKnowledge, showToast }) => {
  const { 
    opinions, 
    situations, 
    analyses, 
    isAnalyzing, 
    addOpinion, 
    addSituation, 
    generateAnalysis, 
    deleteAnalysis 
  } = useStrategicIntelligence(showToast);

  const [activeTab, setActiveTab] = useState<'opinion' | 'situation' | 'analysis'>('analysis');
  const [isAddingOpinion, setIsAddingOpinion] = useState(false);
  const [isAddingSituation, setIsAddingSituation] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [opinionForm, setOpinionForm] = useState({ content: '', source: '', sentiment: 'neutral' as 'positive' | 'neutral' | 'negative' });
  const [situationForm, setSituationForm] = useState({ content: '', category: 'social' as 'economic' | 'social' | 'security' | 'other' });

  const handleAddOpinion = () => {
    if (!opinionForm.content.trim()) return;
    addOpinion(opinionForm.content, opinionForm.source, opinionForm.sentiment);
    setOpinionForm({ content: '', source: '', sentiment: 'neutral' });
    setIsAddingOpinion(false);
  };

  const handleAddSituation = () => {
    if (!situationForm.content.trim()) return;
    addSituation(situationForm.content, situationForm.category);
    setSituationForm({ content: '', category: 'social' });
    setIsAddingSituation(false);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast("Đã sao chép vào bộ nhớ tạm", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const latestAnalysis = analyses[0];

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-[2rem] shadow-2xl shadow-indigo-500/30">
            <BrainCircuit size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Strategic Intelligence</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Phân tích đa chiều & Tham mưu chiến lược AI</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => generateAnalysis(aiKnowledge)}
            disabled={isAnalyzing || (opinions.length === 0 && situations.length === 0)}
            className={cn(
              "btn-pro btn-pro-primary gap-3 px-8 py-4",
              isAnalyzing && "animate-pulse"
            )}
          >
            {isAnalyzing ? <Zap size={18} className="animate-spin" /> : <Sparkles size={18} />}
            <span>{isAnalyzing ? "Đang phân tích..." : "Phân tích chiến lược"}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Column: Inputs */}
        <div className="xl:col-span-4 space-y-8">
          
          {/* Public Opinion Section */}
          <div className="bento-card p-6 group">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest italic">
                <MessageSquare size={18} className="text-blue-500" />
                Dư luận xã hội
              </h3>
              <button 
                onClick={() => setIsAddingOpinion(!isAddingOpinion)}
                className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all"
              >
                <Plus size={16} />
              </button>
            </div>

            <AnimatePresence>
              {isAddingOpinion && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-6 space-y-4"
                >
                  <textarea 
                    value={opinionForm.content}
                    onChange={(e) => setOpinionForm({...opinionForm, content: e.target.value})}
                    placeholder="Nội dung dư luận..."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none min-h-[100px]"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      type="text"
                      value={opinionForm.source}
                      onChange={(e) => setOpinionForm({...opinionForm, source: e.target.value})}
                      placeholder="Nguồn tin..."
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                    />
                    <select 
                      value={opinionForm.sentiment}
                      onChange={(e) => setOpinionForm({...opinionForm, sentiment: e.target.value as any})}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                    >
                      <option value="positive">Tích cực</option>
                      <option value="neutral">Trung lập</option>
                      <option value="negative">Tiêu cực</option>
                    </select>
                  </div>
                  <button 
                    onClick={handleAddOpinion}
                    className="w-full py-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-500/20"
                  >
                    Lưu dư luận
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {opinions.map((o) => (
                <div key={o.id} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all group/item">
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                      o.sentiment === 'positive' ? "bg-emerald-100 text-emerald-600" : 
                      o.sentiment === 'negative' ? "bg-rose-100 text-rose-600" : "bg-slate-200 text-slate-600"
                    )}>
                      {o.sentiment}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400">{o.date}</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed italic">"{o.content}"</p>
                  <p className="text-[9px] font-bold text-slate-400 mt-2 flex items-center gap-1">
                    <Clock size={10} /> Nguồn: {o.source || 'Không xác định'}
                  </p>
                </div>
              ))}
              {opinions.length === 0 && (
                <div className="text-center py-8 text-slate-300">
                  <MessageSquare size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Chưa có dữ liệu dư luận</p>
                </div>
              )}
            </div>
          </div>

          {/* Local Situation Section */}
          <div className="bento-card p-6 group">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest italic">
                <MapPin size={18} className="text-emerald-500" />
                Tình hình địa phương
              </h3>
              <button 
                onClick={() => setIsAddingSituation(!isAddingSituation)}
                className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all"
              >
                <Plus size={16} />
              </button>
            </div>

            <AnimatePresence>
              {isAddingSituation && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-6 space-y-4"
                >
                  <textarea 
                    value={situationForm.content}
                    onChange={(e) => setSituationForm({...situationForm, content: e.target.value})}
                    placeholder="Nội dung tình hình..."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none min-h-[100px]"
                  />
                  <select 
                    value={situationForm.category}
                    onChange={(e) => setSituationForm({...situationForm, category: e.target.value as any})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  >
                    <option value="economic">Kinh tế</option>
                    <option value="social">Xã hội</option>
                    <option value="security">An ninh - Quốc phòng</option>
                    <option value="other">Khác</option>
                  </select>
                  <button 
                    onClick={handleAddSituation}
                    className="w-full py-3 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/20"
                  >
                    Lưu tình hình
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {situations.map((s) => (
                <div key={s.id} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-all group/item">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-full text-[8px] font-black uppercase tracking-widest">
                      {s.category}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400">{s.date}</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{s.content}</p>
                </div>
              ))}
              {situations.length === 0 && (
                <div className="text-center py-8 text-slate-300">
                  <MapPin size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Chưa có dữ liệu tình hình</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Analysis & Suggestions */}
        <div className="xl:col-span-8 space-y-8">
          
          {/* Analysis Result */}
          <div className="bento-card p-10 relative overflow-hidden min-h-[600px]">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none" />
            
            <div className="flex items-center justify-between mb-10 relative z-10">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">Phân tích Chiến lược AI</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 italic">Dựa trên tổng hợp Tin tức, Dư luận và Tình hình thực tế</p>
              </div>
              <div className="flex items-center gap-2">
                {latestAnalysis && (
                  <>
                    <button 
                      onClick={() => handleCopy(latestAnalysis.analysis)}
                      className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"
                      title="Sao chép phân tích"
                    >
                      {copied ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
                    </button>
                    <button 
                      onClick={() => deleteAnalysis(latestAnalysis.id)}
                      className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                      title="Xóa bản phân tích"
                    >
                      <Trash2 size={20} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-6">
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-indigo-100 rounded-full animate-spin border-t-indigo-600" />
                  <BrainCircuit size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 animate-pulse" />
                </div>
                <div className="text-center">
                  <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight italic">Đang xử lý dữ liệu đa chiều</h4>
                  <p className="text-xs text-slate-400 mt-2 italic">Gemini đang kết nối các điểm dữ liệu để đưa ra tham mưu chiến lược...</p>
                </div>
              </div>
            ) : latestAnalysis ? (
              <div className="space-y-12 relative z-10">
                {/* Analysis Content */}
                <div className="prose prose-slate max-w-none">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <TrendingUp size={20} />
                    </div>
                    <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight italic">Báo cáo phân tích mối quan hệ</h4>
                  </div>
                  <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 leading-relaxed text-slate-700">
                    <Markdown>{latestAnalysis.analysis}</Markdown>
                  </div>
                </div>

                {/* Strategic Suggestions */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                      <Lightbulb size={20} />
                    </div>
                    <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight italic">Hành động tham mưu chiến lược</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {latestAnalysis.suggestions.map((suggestion, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        key={idx} 
                        className="flex gap-4 p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all group/item"
                      >
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover/item:bg-indigo-600 group-hover/item:text-white transition-all duration-500">
                          <span className="text-xs font-black italic">{idx + 1}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-700 leading-relaxed">{suggestion}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-slate-300">
                <ShieldAlert size={64} className="opacity-10 mb-6" />
                <h4 className="text-xl font-black uppercase tracking-widest italic">Chưa có bản phân tích nào</h4>
                <p className="text-xs mt-2 italic">Hãy thêm dữ liệu dư luận và tình hình địa phương, sau đó nhấn "Phân tích chiến lược"</p>
              </div>
            )}
          </div>

          {/* Historical Analyses */}
          {analyses.length > 1 && (
            <div className="bento-card p-8">
              <h3 className="text-sm font-black text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-widest italic">
                <Clock size={18} className="text-slate-400" />
                Lịch sử phân tích
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analyses.slice(1, 5).map((a) => (
                  <div key={a.id} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all cursor-pointer group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        {new Date(a.createdAt?.toMillis?.() || 0).toLocaleDateString('vi-VN')}
                      </span>
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </div>
                    <p className="text-xs font-bold text-slate-700 line-clamp-2 italic">
                      {a.analysis.substring(0, 100)}...
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
