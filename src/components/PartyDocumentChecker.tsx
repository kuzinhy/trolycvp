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
  const [summary, setSummary] = useState<string>('');
  
  const { rules, addRule, toggleRule, deleteRule } = usePartyReviewRules();
  const { showToast } = useToast();
  
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'review' | 'rules'>('review');
  const [newRule, setNewRule] = useState<{ title: string; description: string; content: string; category: 'party_rule' | 'grammar' | 'format' }>({ 
    title: '', 
    description: '', 
    content: '', 
    category: 'party_rule' 
  });

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
    showToast('Đã thêm quy tắc mới', 'success');
  };

  const handleAnalyze = async () => {
    if (!text.trim()) {
      showToast('Vui lòng nhập hoặc tải nội dung văn bản', 'warning');
      return;
    }

    setIsAnalyzing(true);
    setIssues([]); // Reset issues
    const activeRulesContent = rules
      .filter(r => r.isActive)
      .map(r => `- ${r.title}: ${r.content}`)
      .join('\n');

    try {
      const prompt = `Bạn là một Chuyên gia Thư ký Đảng uỷ và Ngôn ngữ học chính trị, tuân thủ Quy định 66-QĐ/TW.
      NHIỆM VỤ: Rà soát và chỉnh lỗi văn bản Đảng dựa trên các quy tắc sau:
      ${activeRulesContent}

      NỘI DUNG CẦN RÀ SOÁT:
      "${text}"

      YÊU CẦU TRẢ VỀ JSON:
      {
        "score": number (0-100),
        "summary": "Tóm tắt ngắn gọn tình trạng văn bản (khoảng 2 câu)",
        "issues": [
          {
            "id": "unique_id",
            "type": "format" | "wording" | "logic" | "grammar" | "policy",
            "severity": "low" | "medium" | "high",
            "title": "Tên lỗi",
            "description": "Giải thích tại sao đây là lỗi",
            "suggestion": "Cách sửa cụ thể",
            "originalText": "Đoạn gốc chứa lỗi"
          }
        ]
      }`;

      const response = await generateContentWithRetry({
        model: 'gemini-3.1-pro-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      });

      const responseText = response.text || '';
      const data = parseAIResponse(responseText);
      setIssues(data.issues || []);
      setScore(data.score || 0);
      setSummary(data.summary || '');
      showToast('Đã hoàn tất thẩm định văn bản', 'success');
    } catch (error) {
      console.error("Analysis failed:", error);
      showToast('Lỗi khi thực hiện rà soát AI', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-rose-600 bg-rose-50 border-rose-100';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-100';
      default: return 'text-blue-600 bg-blue-50 border-blue-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'format': return <Layout size={18} />;
      case 'wording': return <Type size={18} />;
      case 'logic': return <GitBranch size={18} />;
      case 'policy': return <ShieldCheck size={18} />;
      default: return <Info size={18} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa]">
      {/* Header Bar */}
      <div className="bg-[#b33a30] text-white px-6 py-3 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-white/10 p-2 rounded-lg">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight uppercase">
            Rà soát Văn bản Đảng 6.0
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#2c7a36] px-4 py-1.5 rounded-md text-[11px] font-bold flex items-center gap-2 shadow-sm">
            <CheckCircle2 size={14} /> Chuẩn Quy định 66-QĐ/TW
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Live Input/View */}
        <div className="flex-[1.2] p-8 overflow-y-auto custom-scrollbar flex flex-col items-center bg-[#ecedef]">
          <div className="relative w-fit">
            <div className="absolute -left-20 top-0 flex flex-col gap-3">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-white rounded-2xl shadow-md text-slate-500 hover:text-[#b33a30] transition-colors group relative"
              >
                <Upload size={24} />
                <span className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Tải file Word</span>
              </button>
              <button 
                onClick={() => setText('')}
                className="p-3 bg-white rounded-2xl shadow-md text-slate-500 hover:text-rose-600 transition-colors group relative"
              >
                <RotateCcw size={24} />
                <span className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Làm mới</span>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept=".doc,.docx"
              />
            </div>

            {/* A4 Paper Mockup for Reading/Input */}
            <div className="bg-white w-[794px] min-h-[1123px] shadow-2xl p-[80px] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
               <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Dán nội dung văn bản Đảng cần rà soát tại đây..."
                className="flex-1 w-full text-[15px] leading-[1.8] text-slate-800 bg-transparent resize-none focus:outline-none font-serif text-justify selection:bg-rose-100 placeholder:italic placeholder:text-slate-300"
              />
              
              <div className="mt-auto pt-10 border-t border-slate-50">
                 <p className="text-[10px] text-slate-400 italic text-center">
                  Cung cấp văn bản đầy đủ bao gồm cả tiêu đề để AI rà soát thể thức chính xác nhất.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Control Panel & Results */}
        <div className="flex-1 bg-white border-l border-slate-200 flex flex-col shadow-inner">
          {/* Tabs */}
          <div className="flex border-b border-slate-100 bg-white sticky top-0 z-10 shrink-0">
            <button
              onClick={() => setActiveTab('review')}
              className={cn(
                "flex-1 py-4 text-[11px] font-bold uppercase tracking-wider transition-all relative",
                activeTab === 'review' ? "text-[#b33a30]" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Phân tích & Kết quả
              {activeTab === 'review' && (
                <motion.div layoutId="checkerTab" className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[#b33a30]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={cn(
                "flex-1 py-4 text-[11px] font-bold uppercase tracking-wider transition-all relative",
                activeTab === 'rules' ? "text-[#b33a30]" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Quy tắc chuẩn ({rules.filter(r => r.isActive).length})
              {activeTab === 'rules' && (
                <motion.div layoutId="checkerTab" className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[#b33a30]" />
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
            <AnimatePresence mode="wait">
              {activeTab === 'review' && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {!issues.length && !isAnalyzing ? (
                    <div className="space-y-8">
                      <div className="p-8 rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm mb-6">
                           <FileCheck size={40} className="text-slate-200" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Sẵn sàng thẩm định</h3>
                        <p className="text-sm text-slate-500 mt-2 max-w-[280px]">
                          Vui lòng nhập nội dung ở bên trái và nhấn nút bên dưới để bắt đầu rà soát tự động.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Các hạng mục rà soát</p>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { icon: <Layout />, label: 'Thể thức' },
                            { icon: <Type />, label: 'Ngôn từ' },
                            { icon: <GitBranch />, label: 'Logic' },
                            { icon: <ShieldCheck />, label: 'Chính sách' }
                          ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                              <div className="text-[#b33a30]">{item.icon}</div>
                              <span className="text-xs font-bold text-slate-700">{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : isAnalyzing ? (
                    <div className="space-y-6">
                       <div className="p-6 rounded-3xl bg-slate-900 text-white flex flex-col items-center gap-4">
                        <Loader2 size={32} className="animate-spin text-rose-500" />
                        <div className="text-center">
                          <p className="text-sm font-bold uppercase tracking-widest">Đang rà soát trí tuệ nhân tạo</p>
                          <p className="text-[10px] text-slate-400 mt-1">Đang đối chiếu dữ liệu với Quy định 66 và Điều lệ Đảng...</p>
                        </div>
                      </div>
                      {[1, 2, 3].map(i => (
                        <div key={i} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 animate-pulse space-y-4">
                          <div className="h-4 w-3/4 bg-slate-200 rounded" />
                          <div className="h-20 w-full bg-slate-100 rounded-2xl" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Summary & Score */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 p-5 bg-[#b33a30] text-white rounded-3xl shadow-lg shadow-rose-900/20 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Sparkles size={60} />
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Tóm tắt kết luận</p>
                          <p className="text-xs font-medium leading-relaxed italic line-clamp-3">
                            "{summary || 'Cần điều chỉnh một số lỗi về thể thức và ngôn từ để đảm bảo chuẩn mực văn bản Đảng.'}"
                          </p>
                        </div>
                        <div className="p-5 bg-white border border-slate-200 rounded-3xl flex flex-col items-center justify-center text-center shadow-sm">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Điểm số</p>
                           <p className={cn(
                             "text-3xl font-black",
                             score! >= 80 ? "text-emerald-600" : score! >= 50 ? "text-amber-600" : "text-rose-600"
                           )}>{score}/100</p>
                        </div>
                      </div>

                      {/* Issue List */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pl-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phát hiện {issues.length} lỗi/gợi ý</p>
                          <button className="text-[10px] font-bold text-[#b33a30] uppercase">Xuất báo cáo</button>
                        </div>
                        
                        <div className="space-y-4 pb-20">
                          {issues.map((issue, idx) => (
                            <motion.div
                              key={issue.id || idx}
                              initial={{ y: 20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: idx * 0.1 }}
                              className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden group hover:border-slate-300 transition-all"
                            >
                              <div className={cn(
                                "flex items-center gap-3 px-4 py-3 border-b border-slate-50",
                                issue.severity === 'high' ? "bg-rose-50/50" : issue.severity === 'medium' ? "bg-amber-50/50" : "bg-blue-50/50"
                              )}>
                                <div className={cn("p-1.5 rounded-lg", getSeverityColor(issue.severity))}>
                                  {getTypeIcon(issue.type)}
                                </div>
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", getSeverityColor(issue.severity).split(' ')[0])}>
                                  {issue.type === 'format' ? 'Thể thức' : issue.type === 'wording' ? 'Ngôn từ' : issue.type === 'logic' ? 'Logic' : 'Chính sách'}
                                </span>
                                <div className="ml-auto flex gap-1">
                                  <div className={cn("w-1.5 h-1.5 rounded-full", issue.severity === 'high' ? "bg-rose-500" : issue.severity === 'medium' ? "bg-amber-500" : "bg-blue-500")} />
                                  <div className={cn("w-1.5 h-1.5 rounded-full opacity-30", issue.severity === 'high' ? "bg-rose-500" : issue.severity === 'medium' ? "bg-amber-500" : "bg-blue-500")} />
                                </div>
                              </div>
                              <div className="p-5">
                                <h4 className="text-sm font-bold text-slate-900 mb-2">{issue.title}</h4>
                                <p className="text-xs text-slate-500 mb-4 leading-relaxed line-clamp-2 italic group-hover:line-clamp-none transition-all">"{issue.description}"</p>
                                
                                <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-100/50 flex items-start gap-4">
                                  <div className="bg-white p-2 rounded-xl text-emerald-600 shadow-sm shrink-0 border border-emerald-50">
                                    <Sparkles size={16} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest mb-1">Phương án sửa đổi</p>
                                    <p className="text-xs text-emerald-900 font-bold leading-relaxed">{issue.suggestion}</p>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="sticky bottom-0 bg-white pt-4 pb-2">
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || !text.trim()}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-slate-900/10 hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 size={20} className="animate-spin" /> Đang thẩm định...
                        </>
                      ) : (
                        <>
                          Thẩm định văn bản AI <Sparkles size={20} className="text-rose-500" />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'rules' && (
                <motion.div
                  key="rules"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">Hệ thống quy tắc</h3>
                    <button 
                      onClick={() => setShowRuleModal(true)}
                      className="p-2 bg-[#b33a30] text-white rounded-xl shadow-md hover:bg-[#a02f26] transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {rules.map((rule) => (
                      <div 
                        key={rule.id}
                        className={cn(
                          "p-5 rounded-3xl border-2 transition-all group",
                          rule.isActive ? "bg-white border-[#b33a30] shadow-md" : "bg-slate-50 border-slate-100 opacity-60"
                        )}
                      >
                         <div className="flex items-center justify-between mb-3">
                           <div className={cn(
                             "w-10 h-10 rounded-xl flex items-center justify-center",
                             rule.isActive ? "bg-rose-50 text-[#b33a30]" : "bg-slate-100 text-slate-400"
                           )}>
                             {rule.category === 'party_rule' ? <ShieldCheck size={20} /> : <FileText size={20} />}
                           </div>
                           <div className="flex items-center gap-2">
                             <button 
                               onClick={() => toggleRule(rule.id, rule.isActive)}
                               className={cn(
                                 "w-10 h-5 rounded-full relative transition-all",
                                 rule.isActive ? "bg-[#b33a30]" : "bg-slate-200"
                               )}
                             >
                                <div className={cn(
                                 "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                                 rule.isActive ? "left-6" : "left-1"
                               )} />
                             </button>
                             <button 
                               onClick={() => deleteRule(rule.id)}
                               className="p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                               <Trash2 size={16} />
                             </button>
                           </div>
                         </div>
                         <h4 className="font-bold text-slate-800 text-sm mb-1">{rule.title}</h4>
                         <p className="text-[11px] text-slate-500 leading-relaxed italic">"{rule.description}"</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* New Rule Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            onClick={() => setShowRuleModal(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8"
          >
            <h3 className="text-xl font-bold text-slate-900 mb-6 uppercase tracking-tight">Thêm quy tắc mới</h3>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên quy tắc</label>
                <input 
                  type="text"
                  value={newRule.title}
                  onChange={(e) => setNewRule({ ...newRule, title: e.target.value })}
                  placeholder="Ví dụ: Kiểm tra xưng hô..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-[#b33a30]/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mô tả định hướng</label>
                <textarea 
                  value={newRule.content}
                  onChange={(e) => setNewRule({ ...newRule, content: e.target.value })}
                  placeholder="Nhập yêu cầu để AI dựa vào đó kiểm tra..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-[#b33a30]/10 h-32 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowRuleModal(false)} className="flex-1 py-4 text-slate-500 font-bold text-[11px] uppercase tracking-widest hover:bg-slate-50 rounded-2xl">Hủy</button>
              <button onClick={handleAddRule} className="flex-1 py-4 bg-[#b33a30] text-white font-bold text-[11px] uppercase tracking-widest rounded-2xl shadow-lg shadow-rose-900/20">Xác nhận</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};;
