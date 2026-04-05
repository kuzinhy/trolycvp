import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, CheckCircle, AlertCircle, Plus, Trash2, Edit2, Play, Loader2, Copy, Eraser, Sparkles, BookOpen, Settings2, PenTool, Upload, Layers, Mic, FileCheck, Mail, Send, UserCheck, MessageSquare } from 'lucide-react';
import { generateContentWithRetry } from '../lib/ai-utils';
import { ToastType } from './ui/Toast';
import { DraftingRule } from '../hooks/useDraftingRules';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { ComposePro } from './ComposePro';
import { InvitationGenerator } from './InvitationGenerator';
import { SmartEmailAssistant } from './SmartEmailAssistant';
import { SpeechAssistant } from './SpeechAssistant';
import { PartyDocumentChecker } from './PartyDocumentChecker';
import { ProgressPopup } from './ui/ProgressPopup';
import { useSimulatedProgress } from '../hooks/useSimulatedProgress';
import { useKnowledgeSuggestions } from '../hooks/useKnowledgeSuggestions';
import { STAFF_LIST } from '../constants';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';
import { useAuth } from '../context/AuthContext';

interface DraftingModuleProps {
  rules: DraftingRule[];
  addRule: (content: string) => void;
  toggleRule: (id: string) => void;
  deleteRule: (id: string) => void;
  updateRule: (id: string, content: string) => void;
  showToast: (msg: string, type?: ToastType) => void;
  aiKnowledge: any[];
  initialMainTab?: 'review' | 'compose' | 'invitation' | 'bulk' | 'email' | 'speech' | 'party-docs';
  speechProps?: {
    aiKnowledge: any[];
  };
}

export const DraftingModule: React.FC<DraftingModuleProps> = ({
  rules, addRule, toggleRule, deleteRule, updateRule, showToast, aiKnowledge, initialMainTab = 'compose', speechProps
}) => {
  const [mainTab, setMainTab] = useState<'review' | 'compose' | 'invitation' | 'bulk' | 'email' | 'speech' | 'party-docs'>(initialMainTab);
  const [documentText, setDocumentText] = useState('');
  const [author, setAuthor] = useState('');
  const [status, setStatus] = useState('draft');
  const [complianceCheck, setComplianceCheck] = useState(true);
  const [template, setTemplate] = useState('none');
  const [isChecking, setIsChecking] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'feedback'>('editor');
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [newRuleContent, setNewRuleContent] = useState('');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editRuleContent, setEditRuleContent] = useState('');
  const { user, unitId } = useAuth();
  // ...
  const progress = useSimulatedProgress();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const suggestions = useKnowledgeSuggestions(documentText, aiKnowledge);

  const insertKnowledge = (content: string) => {
    setDocumentText(prev => prev + '\n\n' + content);
    showToast('Đã chèn kiến thức vào văn bản', 'success');
  };

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(200, textareaRef.current.scrollHeight)}px`;
    }
  }, [documentText]);

  React.useEffect(() => {
    if (initialMainTab) {
      setMainTab(initialMainTab);
    }
  }, [initialMainTab]);

  const handleExport = () => {
    if (!documentText.trim()) return;
    const blob = new Blob([documentText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VanBan_${status}_${new Date().toISOString().slice(0,10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã xuất văn bản', 'success');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      if (file.name.endsWith('.docx')) {
        showToast('File .docx hiện không hỗ trợ.', 'warning');
        return;
      }
      const text = await file.text();
      setDocumentText(text);
      
      // Auto-parse author name
      let foundAuthor = '';

      // 1. Try looking after "Lưu Văn phòng Đảng ủy" or "Lưu VPĐU"
      const keywords = ['Lưu Văn phòng Đảng ủy', 'Lưu VPĐU'];
      for (const kw of keywords) {
        const kwIndex = text.indexOf(kw);
        if (kwIndex !== -1) {
          const afterKw = text.substring(kwIndex + kw.length, kwIndex + kw.length + 50);
          // Match something like ", Phương." or " Phương."
          // We look for the first word after optional comma/space/dot
          const match = afterKw.match(/[,.\s]+([^,.\n\s]+)/);
          if (match && match[1]) {
            const extractedName = match[1].trim();
            // Try to find full name in STAFF_LIST
            const fullName = STAFF_LIST.find(s => s.endsWith(extractedName) || s === extractedName);
            foundAuthor = fullName || extractedName;
            break;
          }
        }
      }

      // 2. Fallback: Check last 5 lines for exact full name matches
      if (!foundAuthor) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const lastLines = lines.slice(-5); // Check last 5 lines
        
        for (const line of lastLines) {
          for (const staff of STAFF_LIST) {
            if (line.includes(staff)) {
              foundAuthor = staff;
              break;
            }
          }
          if (foundAuthor) break;
        }
      }
      
      if (foundAuthor) {
        setAuthor(foundAuthor);
        showToast(`Đã tìm thấy cán bộ soạn thảo: ${foundAuthor}`, 'success');
      } else {
        showToast('Đã tải lên văn bản. Không tự động tìm thấy tên cán bộ.', 'info');
      }
    } catch (error) {
      console.error('Error reading docx:', error);
      showToast('Lỗi khi đọc file Word', 'error');
    }
  };

  const handleCheck = async (retryCount = 0) => {
    if (!documentText.trim()) {
      showToast('Vui lòng nhập nội dung văn bản cần kiểm tra', 'warning');
      return;
    }

    const activeRules = rules.filter(r => r.isActive).map(r => r.content);
    
    setIsChecking(true);
    progress.start();
    setFeedback('');
    setActiveTab('feedback');

    try {
      let prompt = `Bạn là một chuyên viên văn phòng Đảng ủy dày dạn kinh nghiệm.
Hãy kiểm tra văn bản dưới đây dựa trên các tiêu chí sau:
1. Quy tắc bắt buộc:
${activeRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}
${complianceCheck ? '2. Tuân thủ quy định Đảng: Kiểm tra chặt chẽ các thuật ngữ, thể thức văn bản theo quy định của Đảng.' : ''}
3. Mẫu văn bản: ${template !== 'none' ? `Sử dụng mẫu: ${template}` : 'Không áp dụng mẫu cụ thể.'}

Thông tin bổ sung:
- Cán bộ soạn thảo: ${author || 'Không xác định'}
- Trạng thái văn bản: ${status}

Nhiệm vụ của bạn:
1. PHÁT HIỆN LỖI: Chỉ ra các lỗi vi phạm quy tắc, lỗi chính tả, ngữ pháp, hoặc văn phong không phù hợp. Trích dẫn đoạn văn bản bị lỗi.
2. ĐỀ XUẤT SỬA: Đưa ra cách sửa lại cho đúng, chuẩn mực và chuyên nghiệp hơn theo văn phong Đảng.
3. RÀ SOÁT CĂN CỨ VĂN BẢN: Kiểm tra các tên căn cứ văn bản (luật, nghị định, thông tư, quy định...) có đúng tên, số hiệu, ngày ban hành không? Có phù hợp với nội dung văn bản không? Có văn bản nào mới hơn thay thế các văn bản này không? Nếu có, hãy đề xuất thay thế cụ thể.
4. ĐÁNH GIÁ CHẤT LƯỢNG: Đưa ra nhận xét chuyên sâu về chất lượng tham mưu.
5. ĐÁNH GIÁ CHUNG: Nhận xét ngắn gọn về chất lượng văn bản.
6. ĐIỂM SỐ: Hãy đánh giá chất lượng văn bản trên thang điểm 10. Trả về điểm số dưới dạng JSON: {"score": <điểm_số>}.

Trình bày bằng Markdown rõ ràng, sử dụng các tiêu đề (###), danh sách (-, 1.), và in đậm (** **) để làm nổi bật.
`;

      // Filter knowledge base for drafting rules or styles
      const draftingKnowledge = aiKnowledge.filter(k => 
        k.category === 'Quy định' || 
        k.category === 'Văn bản mẫu' ||
        k.tags?.some((t: string) => t.toLowerCase().includes('hành chính') || t.toLowerCase().includes('văn bản') || t.toLowerCase().includes('quy định'))
      );

      if (draftingKnowledge.length > 0) {
        prompt += '\n[THAM KHẢO VĂN PHONG VÀ QUY ĐỊNH TỪ BỘ NHỚ CHUNG]:\n';
        draftingKnowledge.forEach((k, i) => {
          prompt += `Tài liệu ${i+1} (${k.title || 'Không tên'}):\n${k.content}\n\n`;
        });
      }

      prompt += `
Văn bản cần kiểm tra:
"""
${documentText}
"""`;

      const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }]
      });

      const responseText = response.text || '';
      setFeedback(responseText);
      
      // Extract score
      let score = 0;
      try {
        const scoreMatch = responseText.match(/{"score":\s*(\d+(\.\d+)?)}/);
        if (scoreMatch) {
          score = parseFloat(scoreMatch[1]);
        }
      } catch (e) {
        console.error('Error parsing score:', e);
      }
      setScore(score);

      // Save to Firebase
      try {
        await addDoc(collection(db, 'analysisResults'), {
          author: author || 'Không xác định',
          authorId: user?.uid || 'anonymous',
          unitId: unitId || '',
          score: score,
          documentText: documentText,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'analysisResults');
      }

      showToast(`Đã phân tích xong và lưu kết quả (Điểm: ${score})`, 'success');
    } catch (error: any) {
      console.error('Check error:', error);
      if (error.message?.includes('429') && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return handleCheck(retryCount + 1);
      }
      showToast('Lỗi khi kiểm tra văn bản', 'error');
    } finally {
      progress.complete();
      setIsChecking(false);
    }
  };

  const handleAddRule = () => {
    if (newRuleContent.trim()) {
      addRule(newRuleContent);
      setNewRuleContent('');
    }
  };

  const saveEdit = (id: string) => {
    if (editRuleContent.trim()) {
      updateRule(id, editRuleContent);
      setEditingRuleId(null);
    }
  };

  const copyText = () => {
    if (!documentText.trim()) return;
    navigator.clipboard.writeText(documentText);
    showToast('Đã sao chép văn bản', 'success');
  };

  const clearText = () => {
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ nội dung?')) {
      setDocumentText('');
      setFeedback('');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="max-w-7xl mx-auto p-8 h-full flex flex-col"
    >
      <ProgressPopup 
        isOpen={progress.isSimulating} 
        progress={progress.progress} 
        title="Phân tích & Sửa lỗi" 
        message="AI đang phân tích chuyên sâu văn bản của bạn..." 
      />

      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Sparkles className="text-indigo-600" size={32} />
            Trợ lý Soạn thảo Chuyên sâu
          </h2>
          <p className="text-slate-500 mt-2 text-sm font-medium">Soạn thảo, hiệu đính, chuẩn hóa văn phong và kiểm tra tuân thủ quy tắc hành chính</p>
        </div>
      </div>

      {mainTab === 'compose' ? (
        <ComposePro showToast={showToast} aiKnowledge={aiKnowledge} />
      ) : mainTab === 'party-docs' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <PartyDocumentChecker />
        </div>
      ) : mainTab === 'email' ? (
        <SmartEmailAssistant aiKnowledge={aiKnowledge} showToast={showToast} />
      ) : mainTab === 'invitation' ? (
        <InvitationGenerator />
      ) : mainTab === 'speech' ? (
        <SpeechAssistant {...(speechProps || { aiKnowledge: [] })} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0 p-2">
          {/* Left Column - Document Editor */}
          <div className="flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-slate-400" />
                <span className="text-sm font-bold text-slate-700 uppercase tracking-widest">Văn bản gốc</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  <option value="none">Chọn mẫu văn bản</option>
                  <option value="nghi_quyet">Nghị quyết</option>
                  <option value="chi_thi">Chỉ thị</option>
                  <option value="to_trinh">Tờ trình</option>
                  <option value="bao_cao">Báo cáo</option>
                </select>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  <option value="draft">Nháp</option>
                  <option value="review">Đang duyệt</option>
                  <option value="approved">Đã duyệt</option>
                  <option value="issued">Ban hành</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={complianceCheck}
                    onChange={(e) => setComplianceCheck(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  Tuân thủ Đảng
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Tên cán bộ"
                  className="w-32 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                  title="Tải lên file Word"
                >
                  <Upload size={16} />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".docx" className="hidden" />
                <button
                  onClick={handleExport}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                  title="Xuất văn bản"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={clearText}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                  title="Xóa trắng"
                >
                  <Eraser size={16} />
                </button>
                <button
                  onClick={() => handleCheck()}
                  disabled={isChecking || !documentText.trim()}
                  className="ml-2 px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isChecking ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  Phân tích
                </button>
              </div>
            </div>
            
            <div className="flex-1 p-6 bg-slate-50/30 flex flex-col">
              <textarea
                ref={textareaRef}
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
                placeholder="Dán hoặc gõ nội dung văn bản cần kiểm tra vào đây, hoặc tải lên file Word (.docx)..."
                className="w-full flex-1 bg-transparent border-none focus:ring-0 resize-none text-base leading-loose text-slate-800 placeholder:text-slate-400 custom-scrollbar"
                spellCheck={false}
              />
              {suggestions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Kiến thức gợi ý:</h4>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => insertKnowledge(s.content)}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-all flex items-center gap-2"
                      >
                        <Sparkles size={12} />
                        {s.title || 'Kiến thức'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Stacked Feedback & Rules */}
          <div className="flex flex-col gap-6 min-h-0 overflow-y-auto custom-scrollbar">
            {/* Feedback Section */}
            <div className="flex-[2] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 bg-slate-50 font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <CheckCircle size={18} className="text-indigo-600" />
                Kết quả phân tích
              </div>
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {isChecking ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                    <Loader2 size={48} className="animate-spin text-indigo-500" />
                    <p className="text-sm font-medium animate-pulse">AI đang phân tích chuyên sâu...</p>
                  </div>
                ) : feedback ? (
                  <div className="prose prose-slate max-w-none prose-headings:text-indigo-900 prose-headings:font-bold prose-a:text-indigo-600 prose-strong:text-slate-900 prose-p:leading-relaxed prose-li:leading-relaxed">
                    <ReactMarkdown>{feedback}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-6 opacity-60">
                    <BookOpen size={64} strokeWidth={1} />
                    <p className="text-base font-medium text-center px-8">
                      Chưa có kết quả phân tích.<br/>Hãy nhập văn bản hoặc tải lên file Word<br/>và bấm "Phân tích & Sửa lỗi".
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Rules Section */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 bg-slate-50 font-bold text-slate-700 uppercase tracking-widest flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 size={18} className="text-amber-600" />
                  Bộ quy tắc ({rules.filter(r => r.isActive).length}/{rules.length})
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-3">
                <div className="space-y-3 shrink-0">
                  <textarea
                    value={newRuleContent}
                    onChange={(e) => setNewRuleContent(e.target.value)}
                    placeholder="Thêm quy tắc mới..."
                    rows={2}
                    className="w-full text-sm px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none shadow-sm"
                  />
                  <button
                    onClick={handleAddRule}
                    disabled={!newRuleContent.trim()}
                    className="w-full py-2.5 bg-amber-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
                  >
                    <Plus size={16} /> Thêm quy tắc
                  </button>
                </div>
                {rules.map((rule) => (
                  <div 
                    key={rule.id} 
                    className={cn(
                      "p-4 rounded-xl border transition-all",
                      rule.isActive 
                        ? "bg-white border-slate-200 hover:border-amber-300 shadow-sm" 
                        : "bg-slate-50 border-slate-100 opacity-60"
                    )}
                  >
                    {editingRuleId === rule.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={editRuleContent}
                          onChange={(e) => setEditRuleContent(e.target.value)}
                          className="w-full text-sm px-3 py-2 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all resize-none"
                          rows={3}
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingRuleId(null)} className="text-xs font-medium text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">Hủy</button>
                          <button onClick={() => saveEdit(rule.id)} className="text-xs font-bold text-amber-700 px-3 py-1.5 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors">Lưu lại</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <input 
                          type="checkbox" 
                          checked={rule.isActive}
                          onChange={() => toggleRule(rule.id)}
                          className="mt-1 w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm leading-relaxed",
                            rule.isActive ? "text-slate-700" : "text-slate-500 line-through"
                          )}>
                            {rule.content}
                          </p>
                          <div className="flex items-center gap-3 mt-3">
                            <button 
                              onClick={() => { setEditingRuleId(rule.id); setEditRuleContent(rule.content); }}
                              className="text-[11px] font-medium text-slate-400 hover:text-amber-600 transition-colors flex items-center gap-1"
                            >
                              <Edit2 size={12} /> Sửa
                            </button>
                            <button 
                              onClick={() => deleteRule(rule.id)}
                              className="text-[11px] font-medium text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1"
                            >
                              <Trash2 size={12} /> Xóa
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {rules.length === 0 && (
                  <div className="text-center py-8">
                    <AlertCircle size={32} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm text-slate-500 font-medium">Chưa có quy tắc nào.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
