import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, CheckCircle, CheckCircle2, AlertCircle, Plus, Trash2, Edit2, Play, Loader2, Copy, Eraser, Sparkles, BookOpen, Settings2, PenTool, Upload, Layers, Mic, FileCheck, Mail, Send, UserCheck, MessageSquare, Brain } from 'lucide-react';
import { generateContentWithRetry } from '../lib/ai-utils';
import { ToastType } from './ui/Toast';
import { DraftingRule } from '../hooks/useDraftingRules';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { ComposeProV2 } from './ComposeProV2';
import { PartyDocumentChecker } from './PartyDocumentChecker';
import { SmartEmailAssistant } from './SmartEmailAssistant';
import { SpeechAssistant } from './SpeechAssistant';
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
  initialMainTab?: 'review' | 'compose' | 'bulk' | 'party-docs' | 'email' | 'speech';
  navigationParams?: any;
}

export const DraftingModule: React.FC<DraftingModuleProps> = ({
  rules, addRule, toggleRule, deleteRule, updateRule, showToast, aiKnowledge, initialMainTab = 'compose', navigationParams
}) => {
  const [mainTab, setMainTab] = useState<'review' | 'compose' | 'bulk' | 'party-docs' | 'email' | 'speech'>(initialMainTab);
  const [documentText, setDocumentText] = useState(navigationParams?.content || '');
  const [author, setAuthor] = useState('');
  const [status, setStatus] = useState('draft');
  const [complianceCheck, setComplianceCheck] = useState(true);
  const [template, setTemplate] = useState(navigationParams?.template || 'none');
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
      let prompt = `Bạn là một chuyên gia văn phòng Đảng ủy dày dạn kinh nghiệm, đóng vai trò là "Co-pilot" hỗ trợ soạn thảo văn bản cấp cao.
Hãy kiểm tra văn bản dưới đây dựa trên các tiêu chí sau:
1. Quy tắc bắt buộc:
${activeRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}
${complianceCheck ? '2. Tuân thủ quy định Đảng: Kiểm tra chặt chẽ các thuật ngữ, thể thức văn bản theo quy định của Đảng (ví dụ: Quy định 66-QĐ/TW về thể thức văn bản của Đảng).' : ''}
3. Mẫu văn bản: ${template !== 'none' ? `Sử dụng mẫu: ${template}` : 'Không áp dụng mẫu cụ thể.'}

Thông tin bổ sung:
- Cán bộ soạn thảo: ${author || 'Không xác định'}
- Trạng thái văn bản: ${status}

Nhiệm vụ chuyên gia của bạn:
1. PHÁT HIỆN LỖI: Chỉ ra các lỗi vi phạm quy tắc, lỗi chính tả, ngữ pháp, hoặc văn phong không phù hợp. Trích dẫn đoạn văn bản bị lỗi.
2. ĐỀ XUẤT SỬA: Đưa ra cách sửa lại cho đúng, chuẩn mực và chuyên nghiệp hơn theo văn phong Đảng.
3. ĐỐI CHIẾU TRI THỨC: So sánh nội dung văn bản với các quy định và kiến thức trong bộ nhớ chung (nếu có bên dưới) để đảm bảo tính thống nhất.
4. RÀ SOÁT CĂN CỨ VĂN BẢN: Kiểm tra các tên căn cứ văn bản (luật, nghị định, thông tư, quy định...) có đúng tên, số hiệu, ngày ban hành không? Có văn bản nào mới hơn thay thế các văn bản này không?
5. ĐÁNH GIÁ CHUYÊN SÂU: Nhận xét về tính logic, tính thuyết phục và độ sắc bén của các luận điểm trong văn bản.
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
        model: 'gemini-2.0-flash-exp',
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
      className="max-w-[1800px] mx-auto p-4 md:p-8 h-full flex flex-col"
    >
      <ProgressPopup 
        isOpen={progress.isSimulating} 
        progress={progress.progress} 
        title="Phân tích & Sửa lỗi" 
        message="AI đang phân tích chuyên sâu văn bản của bạn..." 
      />

      <div className="mb-8 flex items-end justify-between border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Sparkles className="text-blue-600" size={32} />
            Trợ lý Soạn thảo Chuyên sâu
          </h2>
          <p className="text-slate-500 mt-2 text-sm font-medium">Soạn thảo, hiệu đính, chuẩn hóa văn phong và kiểm tra tuân thủ quy tắc hành chính</p>
          
          <div className="flex items-center gap-1 mt-6 bg-slate-100/50 p-1 rounded-2xl border border-slate-200/60 w-fit">
            {[
              { id: 'compose', label: 'Soạn thảo Pro', icon: <PenTool size={14} /> },
              { id: 'review', label: 'Kiểm tra văn bản', icon: <FileCheck size={14} /> },
              { id: 'email', label: 'Soạn Email', icon: <Send size={14} /> },
              { id: 'speech', label: 'Bài phát biểu', icon: <Mic size={14} /> },
              { id: 'party-docs', label: 'Văn bản Đảng', icon: <UserCheck size={14} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMainTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  mainTab === tab.id 
                    ? "bg-white text-blue-600 shadow-sm border border-slate-200/60" 
                    : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {mainTab === 'compose' ? (
        <div className="flex-1 overflow-hidden -mx-8 -mb-8">
          <ComposeProV2 showToast={showToast} aiKnowledge={aiKnowledge} />
        </div>
      ) : mainTab === 'party-docs' ? (
        <div className="flex-1 overflow-hidden -mx-8 -mb-8">
          <PartyDocumentChecker />
        </div>
      ) : mainTab === 'email' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          <SmartEmailAssistant aiKnowledge={aiKnowledge} showToast={showToast} />
        </div>
      ) : mainTab === 'speech' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <SpeechAssistant aiKnowledge={aiKnowledge} />
        </div>
      ) : (
        <div className="flex gap-8 flex-1 min-h-0 p-2 overflow-hidden">
          {/* Left Column - Document Editor & Controls */}
          <div className="flex-[1.2] flex flex-col min-h-0 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20">
                  <FileText size={18} />
                </div>
                <span className="text-xs font-black text-slate-700 uppercase tracking-[0.2em]">Văn bản gốc</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCheck()}
                  disabled={isChecking || !documentText.trim()}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isChecking ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Phân tích & Sửa lỗi
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Mini Sidebar for Controls */}
              <div className="w-16 border-r border-slate-100 bg-slate-50/30 flex flex-col items-center py-6 gap-6 shrink-0">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 text-slate-400 hover:text-blue-600 hover:bg-white rounded-2xl transition-all shadow-sm hover:shadow-md"
                  title="Tải lên file Word"
                >
                  <Upload size={20} />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".docx" className="hidden" />
                
                <button
                  onClick={handleExport}
                  className="p-3 text-slate-400 hover:text-blue-600 hover:bg-white rounded-2xl transition-all shadow-sm hover:shadow-md"
                  title="Xuất văn bản"
                >
                  <Copy size={20} />
                </button>

                <button
                  onClick={copyText}
                  className="p-3 text-slate-400 hover:text-blue-600 hover:bg-white rounded-2xl transition-all shadow-sm hover:shadow-md"
                  title="Sao chép"
                >
                  <Layers size={20} />
                </button>

                <button
                  onClick={clearText}
                  className="p-3 text-slate-400 hover:text-rose-600 hover:bg-white rounded-2xl transition-all shadow-sm hover:shadow-md mt-auto"
                  title="Xóa trắng"
                >
                  <Eraser size={20} />
                </button>
              </div>

              <div className="flex-1 flex flex-col p-8 bg-white overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mẫu văn bản</p>
                    <select
                      value={template}
                      onChange={(e) => setTemplate(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-slate-700"
                    >
                      <option value="none">Không áp dụng mẫu</option>
                      <option value="nghi_quyet">Nghị quyết</option>
                      <option value="chi_thi">Chỉ thị</option>
                      <option value="to_trinh">Tờ trình</option>
                      <option value="bao_cao">Báo cáo</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</p>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-slate-700"
                    >
                      <option value="draft">Bản nháp</option>
                      <option value="review">Đang duyệt</option>
                      <option value="approved">Đã duyệt</option>
                      <option value="issued">Ban hành</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-6 mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex-1 space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cán bộ soạn thảo</p>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="Nhập tên cán bộ..."
                      className="w-full px-0 bg-transparent border-none focus:ring-0 text-sm font-black text-slate-900 placeholder:text-slate-300"
                    />
                  </div>
                  <div className="w-px h-10 bg-slate-200" />
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={cn(
                      "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                      complianceCheck ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-600/20" : "border-slate-300 group-hover:border-blue-400"
                    )}>
                      {complianceCheck && <CheckCircle2 size={12} className="text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      checked={complianceCheck}
                      onChange={(e) => setComplianceCheck(e.target.checked)}
                      className="hidden"
                    />
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Tuân thủ Đảng</span>
                  </label>
                </div>

                <textarea
                  ref={textareaRef}
                  value={documentText}
                  onChange={(e) => setDocumentText(e.target.value)}
                  placeholder="Dán hoặc gõ nội dung văn bản cần kiểm tra vào đây..."
                  className="w-full flex-1 bg-transparent border-none focus:ring-0 resize-none text-base leading-loose text-slate-800 placeholder:text-slate-300 custom-scrollbar min-h-[400px]"
                  spellCheck={false}
                />

                {suggestions.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Kiến thức gợi ý từ bộ não:</h4>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => insertKnowledge(s.content)}
                          className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center gap-2 border border-blue-100/50"
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
          </div>

          {/* Right Column - Stacked Feedback & Rules */}
          <div className="flex-1 flex flex-col gap-6 min-h-0 overflow-hidden">
            {/* Feedback Section */}
            <div className="flex-[2] bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20">
                    <CheckCircle size={18} />
                  </div>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-[0.2em]">Kết quả phân tích</span>
                </div>
                {score > 0 && (
                  <div className="px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-black">
                    Điểm: {score}/10
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/20">
                {isChecking ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-6">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
                      <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400 animate-pulse" size={24} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black text-slate-600 uppercase tracking-widest">AI đang thẩm định...</p>
                      <p className="text-[10px] text-slate-400 mt-2">Đang rà soát quy tắc và đối chiếu tri thức</p>
                    </div>
                  </div>
                ) : feedback ? (
                  <div className="prose prose-slate max-w-none prose-headings:text-blue-900 prose-headings:font-black prose-headings:uppercase prose-headings:tracking-widest prose-headings:text-xs prose-a:text-blue-600 prose-strong:text-slate-900 prose-p:leading-relaxed prose-li:leading-relaxed text-sm">
                    <ReactMarkdown>{feedback}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-6 opacity-40">
                    <Brain size={80} strokeWidth={1} />
                    <div className="text-center max-w-xs">
                      <p className="text-sm font-black uppercase tracking-widest">Sẵn sàng phân tích</p>
                      <p className="text-[10px] mt-2 leading-relaxed">Hãy nhập nội dung văn bản và nhấn nút "Phân tích" để bắt đầu quá trình thẩm định chuyên sâu.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Rules Section */}
            <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/20">
                    <Settings2 size={18} />
                  </div>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-[0.2em]">Bộ quy tắc ({rules.filter(r => r.isActive).length})</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRuleContent}
                    onChange={(e) => setNewRuleContent(e.target.value)}
                    placeholder="Thêm quy tắc thẩm định mới..."
                    className="flex-1 text-xs px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 transition-all font-medium"
                  />
                  <button
                    onClick={handleAddRule}
                    disabled={!newRuleContent.trim()}
                    className="p-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <div className="space-y-2">
                  {rules.map((rule) => (
                    <div 
                      key={rule.id} 
                      className={cn(
                        "p-4 rounded-2xl border transition-all group",
                        rule.isActive 
                          ? "bg-white border-slate-100 hover:border-amber-200 shadow-sm" 
                          : "bg-slate-50 border-transparent opacity-50"
                      )}
                    >
                      {editingRuleId === rule.id ? (
                        <div className="space-y-3">
                          <textarea
                            value={editRuleContent}
                            onChange={(e) => setEditRuleContent(e.target.value)}
                            className="w-full text-xs px-3 py-2 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 transition-all resize-none"
                            rows={2}
                          />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingRuleId(null)} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600">Hủy</button>
                            <button onClick={() => saveEdit(rule.id)} className="text-[10px] font-black uppercase text-amber-600 hover:text-amber-700">Lưu</button>
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
                              "text-xs leading-relaxed font-medium",
                              rule.isActive ? "text-slate-700" : "text-slate-400 line-through"
                            )}>
                              {rule.content}
                            </p>
                            <div className="flex items-center gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => { setEditingRuleId(rule.id); setEditRuleContent(rule.content); }}
                                className="text-[9px] font-black uppercase text-slate-400 hover:text-amber-600 transition-colors"
                              >
                                Sửa
                              </button>
                              <button 
                                onClick={() => deleteRule(rule.id)}
                                className="text-[9px] font-black uppercase text-slate-400 hover:text-rose-500 transition-colors"
                              >
                                Xóa
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
