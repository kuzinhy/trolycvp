import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileCheck, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  Layout, 
  Type, 
  GitBranch, 
  Sparkles,
  ArrowRight,
  Download,
  Copy,
  RotateCcw,
  Loader2,
  Upload,
  Settings2,
  Plus,
  Trash2,
  BookOpen,
  Hash,
  ShieldCheck,
  FileText,
  Search,
  X
} from 'lucide-react';
import { generateContentWithRetry, parseAIResponse } from '../lib/ai-utils';
import { cn } from '../lib/utils';
import { usePartyReviewRules } from '../hooks/usePartyReviewRules';
import mammoth from 'mammoth';
import { useToast } from '../hooks/useToast';

interface Issue {
  id: string;
  type: 'format' | 'wording' | 'logic' | 'grammar' | 'policy';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  suggestion: string;
  originalText?: string;
}

// Redundant definitions removed
export const PartyDocumentChecker: React.FC = () => {
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [score, setScore] = useState<number | null>(null);
  
  const { rules, addRule, toggleRule, deleteRule } = usePartyReviewRules();
  const { showToast } = useToast();
  
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [newRule, setNewRule] = useState<{ title: string; description: string; content: string; category: 'party_rule' | 'grammar' | 'format' }>({ 
    title: '', 
    description: '', 
    content: '', 
    category: 'party_rule' 
  });
  const [activeTab, setActiveTab] = useState<'review' | 'rules'>('review');

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setText(result.value);
        showToast('Đã tải văn bản từ file Word', 'success');
      } catch (error) {
        console.error('Word parsing error:', error);
        showToast('Lỗi khi đọc file Word. Vui lòng kiểm tra lại định dạng.', 'error');
      }
    } else {
      showToast('Vui lòng tải file định dạng Word (.doc, .docx)', 'warning');
    }
  };

  const handleAddRule = () => {
    if (!newRule.title || !newRule.content) return;
    addRule(newRule);
    setNewRule({ title: '', description: '', content: '', category: 'party_rule' });
    setShowRuleModal(false);
  };

  const handleAnalyze = async () => {
    if (!text.trim()) return;

    setIsAnalyzing(true);
    const activeRulesContent = rules
      .filter(r => r.isActive)
      .map(r => `- ${r.title}: ${r.content}`)
      .join('\n');

    try {
      const prompt = `Bạn là một Chuyên gia Thư ký Đảng uỷ và Ngôn ngữ học chính trị.
      NHIỆM VỤ: Rà soát và chỉnh lỗi văn bản Đảng dựa trên các quy tắc sau:
      ${activeRulesContent}

      NỘI DUNG CẦN RÀ SOÁT:
      "${text}"

      YÊU CẦU TRẢ VỀ JSON:
      {
        "score": number (0-100),
        "summary": "Tóm tắt ngắn gọn tình trạng văn bản",
        "issues": [
          {
            "id": "unique_id",
            "type": "format" | "wording" | "logic" | "grammar" | "policy",
            "severity": "low" | "medium" | "high",
            "title": "Tên lỗi",
            "description": "Giải thích tại sao đây là lỗi",
            "suggestion": "Cách sửa cụ thể",
            "originalText": "Đoạn gốc"
          }
        ]
      }`;

      const response = await generateContentWithRetry({
        model: 'gemini-1.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      });

      const responseText = response.text || '';
      const data = parseAIResponse(responseText);
      setIssues(data.issues || []);
      setScore(data.score || 0);
      setShowResultsModal(true);
      setActiveTab('review');
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-100';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-100';
      default: return 'text-blue-600 bg-blue-50 border-blue-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'format': return <Layout size={16} />;
      case 'wording': return <Type size={16} />;
      case 'logic': return <GitBranch size={16} />;
      default: return <Info size={16} />;
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto p-6 space-y-8 h-full flex flex-col">
      {/* Header Optimized */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-600/10 rotate-3 p-2 border border-emerald-50">
            <img 
              src="https://i.imgur.com/S9tvwYs.png" 
              alt="Elite Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Rà soát Văn bản Đảng 6.0
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[10px] font-black uppercase rounded-lg tracking-widest">Next-Gen AI</span>
            </h1>
            <p className="text-slate-500 font-medium text-sm">
              Hệ thống thẩm định thể thức, nội dung và logic chính trị theo Quy định 66-QĐ/TW.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setActiveTab('review')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-2",
                activeTab === 'review' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <FileCheck size={14} />
              Rà soát
            </button>
            <button 
              onClick={() => setActiveTab('rules')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-2",
                activeTab === 'rules' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <BookOpen size={14} />
              Hệ thống Quy tắc
            </button>
          </div>

          {score !== null && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3"
            >
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase">Chất lượng</p>
                <p className="text-lg font-black text-emerald-600 leading-none">{score}/100</p>
              </div>
              <div className={cn(
                "w-10 h-10 rounded-full border-4 flex items-center justify-center font-black text-xs",
                score >= 80 ? "border-emerald-500 text-emerald-600" : 
                score >= 50 ? "border-amber-500 text-amber-600" : "border-red-500 text-red-600"
              )}>
                {score}%
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'review' ? (
          <motion.div 
            key="review-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0"
          >
            {/* Left: Input & Active Rules */}
            <div className="lg:col-span-7 flex flex-col gap-4 h-full">
              <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1 relative group">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-emerald-600" />
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest font-mono">Input Document</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      className="hidden" 
                      accept=".doc,.docx"
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 transition-all text-[10px] font-black uppercase"
                    >
                      <Upload size={14} />
                      Tải file Word (.doc/.docx)
                    </button>
                    <button 
                      onClick={() => setText('')}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>
                </div>
                
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Dán nội dung văn bản hoặc tải file lên..."
                  className="flex-1 p-8 text-slate-800 bg-transparent resize-none focus:outline-none font-serif text-lg leading-loose selection:bg-emerald-100"
                />

                <div className="p-6 bg-slate-50/80 border-t border-slate-100">
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !text.trim()}
                    className={cn(
                      "w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 shadow-xl active:scale-[0.98]",
                      isAnalyzing || !text.trim()
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-slate-900 text-white hover:bg-black shadow-slate-900/10"
                    )}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Đang rà soát trí tuệ nhân tạo...
                      </>
                    ) : (
                      <>
                        <Sparkles size={20} className="text-emerald-400" />
                        Bắt đầu thẩm định văn bản
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Active Rules Mini List */}
              <div className="flex flex-wrap gap-2">
                {rules.filter(r => r.isActive).map(rule => (
                  <div key={rule.id} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[9px] font-black uppercase">
                    <CheckCircle2 size={10} />
                    {rule.title}
                  </div>
                ))}
                <button 
                  onClick={() => setActiveTab('rules')}
                  className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase hover:bg-slate-200 transition-all"
                >
                  + Cấu hình quy tắc
                </button>
              </div>
            </div>

            {/* Right: Analysis Results */}
            <div className="lg:col-span-5 flex flex-col gap-4 h-full">
              <div className="bg-slate-50 rounded-[2rem] border border-slate-200 p-6 flex-1 overflow-y-auto custom-scrollbar shadow-inner relative">
                {!issues.length && !isAnalyzing ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-sm border border-slate-100">
                      <FileCheck size={48} className="text-slate-200" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-400 uppercase tracking-widest text-xs">Sẵn sàng thẩm định</h3>
                      <p className="text-[10px] text-slate-400 mt-2 italic px-12">
                        Hệ thống sẽ rà soát dựa trên {rules.filter(r => r.isActive).length} quy tắc Đảng đang kích hoạt.
                      </p>
                    </div>
                  </div>
                ) : isAnalyzing ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Loader2 size={16} className="animate-spin text-emerald-600" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">AI đang phân tích từng dòng...</span>
                    </div>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 animate-pulse space-y-4 shadow-sm">
                        <div className="flex gap-4">
                           <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                           <div className="flex-1 space-y-2">
                             <div className="h-4 w-3/4 bg-slate-100 rounded" />
                             <div className="h-3 w-1/2 bg-slate-50 rounded" />
                           </div>
                        </div>
                        <div className="h-12 w-full bg-slate-50 rounded-2xl" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex flex-col">
                        <h3 className="font-black text-slate-900 uppercase tracking-widest text-[10px]">Báo cáo chi tiết</h3>
                        <p className="text-[9px] text-slate-500 font-medium italic">Phát hiện {issues.length} vấn đề cần xử lý</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-emerald-600 transition-all">
                          <Download size={14} />
                        </button>
                        <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-emerald-600 transition-all">
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>

                    <AnimatePresence mode="popLayout">
                      {issues.map((issue, idx) => (
                        <motion.div
                          key={issue.id || idx}
                          initial={{ x: 20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 transition-all group overflow-hidden relative"
                        >
                          <div className={cn(
                            "absolute top-0 right-0 w-1 h-full",
                            issue.severity === 'high' ? "bg-rose-500" :
                            issue.severity === 'medium' ? "bg-amber-500" : "bg-blue-500"
                          )} />
                          
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border-2",
                              getSeverityColor(issue.severity)
                            )}>
                              {getTypeIcon(issue.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                <span className={cn(
                                  "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                                  issue.type === 'format' ? "bg-blue-100 text-blue-700" :
                                  issue.type === 'wording' ? "bg-purple-100 text-purple-700" : 
                                  issue.type === 'grammar' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                                )}>
                                  {issue.type === 'format' ? 'Thể thức' : 
                                   issue.type === 'wording' ? 'Ngôn từ' : 
                                   issue.type === 'grammar' ? 'Ngữ pháp' : 
                                   issue.type === 'policy' ? 'Chính sách' : 'Logic'}
                                </span>
                                <span className={cn(
                                  "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                                  issue.severity === 'high' ? "bg-rose-100 text-rose-700" :
                                  issue.severity === 'medium' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                                )}>
                                  {issue.severity === 'high' ? 'Nghiêm trọng' : issue.severity === 'medium' ? 'Lưu ý' : 'Gợi ý'}
                                </span>
                              </div>
                              <h4 className="font-bold text-slate-900 mb-2 leading-snug">{issue.title}</h4>
                              <p className="text-[11px] text-slate-500 mb-4 leading-relaxed font-medium">{issue.description}</p>
                              
                              {issue.originalText && (
                                <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 mb-4 italic text-xs text-slate-400 relative">
                                  <span className="absolute -top-2 left-4 bg-slate-100 text-[7px] font-black px-1.5 rounded uppercase border border-slate-200">Gốc</span>
                                  "{issue.originalText}"
                                </div>
                              )}

                              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50 flex items-start gap-4">
                                <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                                  <Sparkles size={14} />
                                </div>
                                <div className="flex-1">
                                  <p className="text-[8px] font-black text-emerald-700 uppercase tracking-widest mb-1 font-mono">Tham mưu chỉnh sửa</p>
                                  <p className="text-[11px] text-emerald-900 font-bold leading-relaxed">{issue.suggestion}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="rules-tab"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 overflow-hidden flex flex-col gap-6"
          >
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <BookOpen size={20} className="text-emerald-600" />
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Hệ thống Quy tắc Thẩm định</h3>
              </div>
              <button 
                onClick={() => setShowRuleModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/10"
              >
                <Plus size={16} />
                Thêm quy tắc mới
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto p-2 custom-scrollbar flex-1 min-h-0">
              {rules.map((rule) => (
                <motion.div 
                  key={rule.id}
                  layout
                  className={cn(
                    "bg-white rounded-[2.5rem] p-8 border-2 transition-all flex flex-col relative group",
                    rule.isActive ? "border-emerald-600 shadow-xl shadow-emerald-900/5" : "border-slate-100 opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center text-lg",
                      rule.category === 'party_rule' ? "bg-rose-100 text-rose-600" :
                      rule.category === 'grammar' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                    )}>
                      {rule.category === 'party_rule' ? <ShieldCheck /> : rule.category === 'grammar' ? <Type /> : <Layout />}
                    </div>
                    <div className="flex items-center gap-2">
                       <button 
                        onClick={() => toggleRule(rule.id, rule.isActive)}
                        className={cn(
                          "w-10 h-5 rounded-full relative transition-all",
                          rule.isActive ? "bg-emerald-600" : "bg-slate-200"
                        )}
                       >
                         <div className={cn(
                           "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                           rule.isActive ? "left-6" : "left-1"
                         )} />
                       </button>
                       <button 
                        onClick={() => deleteRule(rule.id)}
                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                       >
                         <Trash2 size={16} />
                       </button>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Category: {rule.category}</span>
                    <h4 className="text-lg font-black text-slate-900 mb-2">{rule.title}</h4>
                    <p className="text-xs text-slate-500 font-medium mb-4 leading-relaxed">{rule.description}</p>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[10px] text-slate-600 font-medium italic leading-relaxed">
                      "{rule.content}"
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Modal */}
      {showResultsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            onClick={() => setShowResultsModal(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Kết quả rà soát AI</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phát hiện {issues.length} vấn đề</span>
                    {score !== null && (
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-black uppercase",
                        score >= 80 ? "bg-emerald-100 text-emerald-600" : 
                        score >= 50 ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
                      )}>
                        Điểm: {score}/100
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowResultsModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-white">
              <div className="space-y-6">
                <AnimatePresence mode="popLayout">
                  {issues.map((issue, idx) => (
                    <motion.div
                      key={issue.id || idx}
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 transition-all group overflow-hidden relative"
                    >
                      <div className={cn(
                        "absolute top-0 left-0 w-2 h-full",
                        issue.severity === 'high' ? "bg-rose-500" :
                        issue.severity === 'medium' ? "bg-amber-500" : "bg-blue-500"
                      )} />
                      
                      <div className="flex items-start gap-6">
                        <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2",
                          getSeverityColor(issue.severity)
                        )}>
                          {getTypeIcon(issue.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-4">
                            <span className={cn(
                              "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg",
                              issue.type === 'format' ? "bg-blue-100 text-blue-700" :
                              issue.type === 'wording' ? "bg-purple-100 text-purple-700" : 
                              issue.type === 'grammar' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                            )}>
                              {issue.type === 'format' ? 'Thể thức' : 
                               issue.type === 'wording' ? 'Ngôn từ' : 
                               issue.type === 'grammar' ? 'Ngữ pháp' : 
                               issue.type === 'policy' ? 'Chính sách' : 'Logic'}
                            </span>
                          </div>
                          <h4 className="text-xl font-bold text-slate-900 mb-2 leading-snug">{issue.title}</h4>
                          <p className="text-sm text-slate-600 mb-6 leading-relaxed font-medium">{issue.description}</p>
                          
                          {issue.originalText && (
                            <div className="bg-white/80 px-5 py-4 rounded-2xl border border-slate-200 mb-6 italic text-sm text-slate-500 relative">
                              <span className="absolute -top-2 left-4 bg-slate-200 text-[8px] font-black px-2 py-0.5 rounded uppercase border border-slate-300">Gốc</span>
                              "{issue.originalText}"
                            </div>
                          )}

                          <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex items-start gap-5 shadow-sm">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm shrink-0 border border-emerald-50">
                              <Sparkles size={18} />
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">Tham mưu chỉnh sửa</p>
                              <p className="text-sm text-emerald-900 font-bold leading-relaxed">{issue.suggestion}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {issues.length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle2 size={64} className="mx-auto text-emerald-500 mb-4 opacity-20" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Văn bản không phát hiện lỗi nghiêm trọng</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4">
               <button 
                onClick={() => setShowResultsModal(false)}
                className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/10"
              >
                Hoàn tất
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* New Rule Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            onClick={() => setShowRuleModal(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl p-10 overflow-hidden"
          >
            <div className="w-20 h-2 bg-slate-100 rounded-full mx-auto mb-8" />
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-8 text-center">Thêm quy tắc mới</h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Loại quy tắc</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['party_rule', 'grammar', 'format'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setNewRule({ ...newRule, category: cat as 'party_rule' | 'grammar' | 'format' })}
                      className={cn(
                        "py-3 rounded-2xl text-[9px] font-black uppercase transition-all border-2",
                        newRule.category === cat ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-slate-100 text-slate-400 hover:border-slate-200"
                      )}
                    >
                      {cat === 'party_rule' ? 'Đảng' : cat === 'grammar' ? 'Ngữ pháp' : 'Thể thức'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Tên quy tắc</label>
                <input 
                  type="text"
                  value={newRule.title}
                  onChange={(e) => setNewRule({ ...newRule, title: e.target.value })}
                  placeholder="Ví dụ: Quy tắc danh từ riêng..."
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Mệnh lệnh cho AI</label>
                <textarea 
                  value={newRule.content}
                  onChange={(e) => setNewRule({ ...newRule, content: e.target.value })}
                  placeholder="Mô tả chi tiết để AI hiểu cần làm gì..."
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all h-32 resize-none"
                />
              </div>
            </div>

            <div className="mt-10 flex gap-4">
              <button 
                onClick={() => setShowRuleModal(false)}
                className="flex-1 py-4 text-slate-500 font-black text-[10px] uppercase hover:bg-slate-50 rounded-2xl transition-all"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleAddRule}
                className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl shadow-emerald-600/20 active:scale-[0.98]"
              >
                Xác nhận thêm
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
