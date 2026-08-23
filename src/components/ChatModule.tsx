import React, { useState, useRef, useEffect, useMemo, memo, useCallback, lazy, Suspense } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Copy, 
  Check, 
  Database, 
  Trash2, 
  Sparkles,
  Paperclip,
  Mic,
  MoreVertical,
  ChevronDown,
  Search,
  X,
  ArrowUpRight,
  Share2,
  Calendar,
  FileText,
  MessageSquare,
  Zap,
  Users,
  MicOff,
  BrainCircuit,
  History,
  StickyNote,
  Paperclip as PaperclipIcon,
  Wand2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import remarkGfm from 'remark-gfm';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message, TASK_TYPES } from '../constants';
import { cn } from '../lib/utils';
import { UserList } from './UserList';
import { useSpeechToText } from '../hooks/useSpeechToText';
import axios from 'axios';
import { generateContentWithRetry } from '../lib/ai-utils';

// Lazy load heavy components
const ReactMarkdown = lazy(() => import('react-markdown'));
const SyntaxHighlighter = lazy(() => import('react-syntax-highlighter').then(m => ({ default: m.Prism })));
const Brain = lazy(() => import('lucide-react').then(m => ({ default: m.Brain })));

interface ChatModuleProps {
  messages: Message[];
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  handleSend: (text?: string, fileContent?: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  copyToClipboard: (text: string, id: number) => void;
  copiedId: number | null;
  saveToKnowledge: (content: string, tags: string[], index: number) => void;
  isSaving: number | null;
  aiKnowledge: any[];
  smartLearnFromText: (text: string, tagsHint?: string[], isManual?: boolean) => Promise<void>;
  isLearning: boolean;
  onClearChat: () => void;
  chatHistory: any[];
  deleteChatHistory: (index: number) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  isSearchEnabled?: boolean;
  setIsSearchEnabled?: (val: boolean) => void;
  isSimpleMode?: boolean;
  setIsSimpleMode?: (val: boolean) => void;
  onNavigate: (tab: string, params?: any) => void;
}

import { KnowledgeConfirmModal } from './KnowledgeConfirmModal';

export const ChatModule: React.FC<ChatModuleProps> = memo(({
  messages, input, setInput, isLoading, handleSend,
  messagesEndRef, inputRef, copyToClipboard, copiedId,
  saveToKnowledge, isSaving, aiKnowledge, smartLearnFromText, isLearning,
  onClearChat, chatHistory, deleteChatHistory, showToast,
  isSearchEnabled, setIsSearchEnabled,
  isSimpleMode, setIsSimpleMode,
  onNavigate
}) => {
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  const [pendingSave, setPendingSave] = useState<{ content: string; tags: string[]; index: number } | null>(null);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [validationResult, setValidationResult] = useState<{
    isDuplicate: boolean;
    duplicateTitle?: string;
    isNew: boolean;
  } | null>(null);

  const filteredHistory = useMemo(() => {
    if (!historySearchTerm) return chatHistory;
    return chatHistory.filter(chat => 
      chat.content.toLowerCase().includes(historySearchTerm.toLowerCase())
    );
  }, [chatHistory, historySearchTerm]);

  const handleSaveToKnowledge = (content: string, tags: string[], index: number) => {
    const duplicate = aiKnowledge.find(k => 
      k.content.toLowerCase().trim() === content.toLowerCase().trim()
    );

    setValidationResult({
      isDuplicate: !!duplicate,
      duplicateTitle: duplicate?.title,
      isNew: !duplicate
    });
    setPendingSave({ content, tags, index });
    setShowConfirmModal(true);
  };

  const confirmSave = () => {
    if (pendingSave) {
      saveToKnowledge(pendingSave.content, pendingSave.tags, pendingSave.index);
      setPendingSave(null);
      setShowConfirmModal(false);
    }
  };
  const [isUploading, setIsUploading] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());

  const handleRewriteInput = async () => {
    if (!input.trim()) return;
    setIsRewriting(true);
    try {
      const prompt = `Viết lại nội dung sau đây cho thật chuyên nghiệp, đẳng cấp, đầy đủ và rõ nghĩa nhất (theo văn phong tham mưu hành chính, để chuyển cho AI xử lý). Chỉ trả về nội dung đã viết lại, không giải thích: \n\n${input}`;
      const res = await generateContentWithRetry({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      const rewrittenText = res.text;
      setInput(rewrittenText || '');
      if (showToast) showToast('Đã làm phép thành công', 'success');
    } catch (e) {
      if (showToast) showToast('Không thể làm phép tự động, vui lòng thử lại', 'error');
    } finally {
      setIsRewriting(false);
    }
  };
  
  const { isListening, toggleListening } = useSpeechToText(
    (transcript) => setInput(prev => prev ? `${prev} ${transcript}` : transcript),
    (error) => {
      if (showToast) showToast(`Lỗi nhận diện giọng nói: ${error}`, "error");
    }
  );

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleExpand = (id: string) => {
    setExpandedMessages(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/api/parse-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data && response.data.text) {
        setAttachedFile({ name: file.name, content: response.data.text });
        if (showToast) showToast(`Đã đính kèm và xử lý: ${file.name}`, "success");
      } else {
        throw new Error("Không thể trích xuất nội dung từ tệp");
      }
    } catch (error: any) {
      console.error('File upload error:', error);
      const errorMessage = error.response?.data?.error || "Lỗi khi xử lý tệp";
      if (showToast) showToast(errorMessage, "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 192)}px`; // 192px is max-h-48
    }
  }, [input]);

  const onSend = () => {
    if (isLoading) return;
    handleSend(input, attachedFile?.content);
    setAttachedFile(null);
  };



  const filteredMessages = useMemo(() => {
    if (!searchTerm) return messages;
    return messages.filter(msg => 
      msg.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [messages, searchTerm]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 300);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleQuickAction = useCallback((type: string, content: string) => {
    let prompt = '';
    switch (type) {
      case 'plan':
        prompt = `Dựa trên nội dung sau, hãy lập kế hoạch chi tiết (Mục tiêu - Nội dung - Tổ chức thực hiện): \n\n${content}`;
        break;
      case 'summary':
        prompt = `Hãy tóm tắt cốt lõi (Executive Summary) cho nội dung sau: \n\n${content}`;
        break;
      case 'draft':
        prompt = `Hãy soạn thảo văn bản chính thức (tờ trình/báo cáo) dựa trên nội dung này: \n\n${content}`;
        break;
      case 'advise':
        prompt = `Hãy đưa ra các ý kiến tham mưu sắc bén cho vấn đề này: \n\n${content}`;
        break;
    }
    if (prompt) {
      setInput(prompt);
      inputRef.current?.focus();
    }
  }, [setInput, inputRef]);

  const QuickActions = ({ content }: { content: string }) => {
    const actions = [
      { id: 'plan', label: 'Lập kế hoạch', icon: Calendar, keywords: ['kế hoạch', 'lập lịch', 'thời gian', 'nhiệm vụ'] },
      { id: 'summary', label: 'Tóm tắt', icon: Brain, keywords: ['tóm tắt', 'nội dung chính', 'cốt lõi', 'tổng hợp'] },
      { id: 'draft', label: 'Soạn thảo', icon: FileText, keywords: ['soạn thảo', 'văn bản', 'tờ trình', 'báo cáo', 'nghị quyết'] },
      { id: 'advise', label: 'Tham mưu', icon: MessageSquare, keywords: ['tham mưu', 'đề xuất', 'giải pháp', 'chỉ đạo'] },
      { id: 'save', label: 'Lưu vào bộ nhớ', icon: Database, keywords: ['định nghĩa', 'khái niệm', 'thuật ngữ', 'là gì', 'nghĩa là', 'giải thích'] },
    ];

    const visibleActions = actions.filter(action => 
      action.keywords.some(keyword => content.toLowerCase().includes(keyword))
    );

    if (visibleActions.length === 0) return null;

    return (
      <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-2">
        <p className="w-full text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
          <Zap size={10} /> Tác vụ AI gợi ý
        </p>
        {visibleActions.map(action => (
          <button
            key={action.id}
            onClick={() => {
              if (action.id === 'save') {
                saveToKnowledge(content, [], -1); // -1 as index for quick action
              } else {
                handleQuickAction(action.id, content);
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border border-emerald-200/50 shadow-sm hover:shadow-md"
          >
            <action.icon size={10} />
            {action.label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Confirmation Modal */}
      <KnowledgeConfirmModal 
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmSave}
        validationResult={validationResult}
        title="Lưu từ hội thoại"
        content={pendingSave?.content || ""}
      />

      {/* Header */}
      <div className="px-4 py-2.5 bg-white border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-700 to-purple-800 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
            <BrainCircuit size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-extrabold text-slate-900 tracking-tight">Trợ lý Tham mưu AI</h2>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-extrabold rounded-full border border-blue-200/60 uppercase tracking-wider">
                Elite v8.0
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-medium text-slate-500">Sẵn sàng tham mưu chỉ đạo • Tri thức Đảng ủy</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className={cn(
            "flex items-center bg-slate-100 border border-slate-200 rounded-lg overflow-hidden transition-all duration-300",
            showSearch ? "w-44 sm:w-60 opacity-100 px-2" : "w-0 opacity-0 border-none"
          )}>
            <Search size={13} className="text-slate-400 shrink-0" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm trong hội thoại..."
              className="w-full px-2 py-1 text-xs bg-transparent focus:outline-none text-slate-800"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>

          <button 
            onClick={() => setShowSearch(!showSearch)}
            className={cn(
              "p-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1 border",
              showSearch 
                ? "bg-blue-50 text-blue-700 border-blue-200" 
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
            title="Tìm kiếm hội thoại"
          >
            <Search size={14} />
          </button>

          <button 
            onClick={() => setIsSimpleMode && setIsSimpleMode(!isSimpleMode)}
            className={cn(
              "p-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1 border",
              isSimpleMode 
                ? "bg-amber-500 text-white border-amber-400 shadow-xs" 
                : "bg-white text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700"
            )}
            title="Tự động rút gọn câu trả lời"
          >
            <Sparkles size={14} className={cn(isSimpleMode && "animate-pulse")} />
            <span className="hidden sm:inline text-[11px]">Đơn thuần</span>
          </button>
          
          <button 
            onClick={() => setIsSearchEnabled && setIsSearchEnabled(!isSearchEnabled)}
            className={cn(
              "p-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1 border",
              isSearchEnabled 
                ? "bg-blue-600 text-white border-blue-500 shadow-xs" 
                : "bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700"
            )}
            title="Bật/Tắt tìm kiếm Google Search AI"
          >
            <Zap size={14} className={cn(isSearchEnabled && "animate-pulse")} />
            <span className="hidden sm:inline text-[11px]">Tra cứu AI</span>
          </button>

          <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
            <button 
              onClick={() => setIsHistorySidebarOpen(true)}
              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-lg transition-all flex items-center gap-1"
              title="Xem lịch sử"
            >
              <History size={14} />
              <span className="hidden md:inline text-[11px] font-bold">Lịch sử</span>
            </button>

            <button 
              onClick={onClearChat}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-all"
              title="Xóa đoạn chat hiện tại"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* History Sidebar */}
      <AnimatePresence>
        {isHistorySidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistorySidebarOpen(false)}
              className="fixed inset-0 bg-blue-950/40 backdrop-blur-sm z-[90]"
            />
            <motion.div
              initial={{ x: -400 }}
              animate={{ x: 0 }}
              exit={{ x: -400 }}
              className="fixed inset-y-0 left-0 w-80 bg-white border-r border-slate-200 z-[100] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500 text-white rounded-lg">
                    <History size={18} />
                  </div>
                  <h3 className="font-black text-slate-900 text-sm uppercase tracking-tight">Lịch sử hội thoại</h3>
                </div>
                <button 
                  onClick={() => setIsHistorySidebarOpen(false)}
                  className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-4 py-3 border-b border-slate-50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text"
                    placeholder="Tìm kiếm lịch sử..."
                    value={historySearchTerm}
                    onChange={(e) => setHistorySearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                  />
                </div>
              </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Database size={24} className="mx-auto text-slate-200 mb-3" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Không có dữ liệu</p>
                </div>
              ) : (
                chatHistory.map((chat, originalIdx) => ({ chat, originalIdx }))
                  .filter(({ chat }) => !historySearchTerm || chat.content.toLowerCase().includes(historySearchTerm.toLowerCase()))
                  .map(({ chat, originalIdx }) => (
                  <div 
                    key={chat.id || `hist-${originalIdx}`}
                    className="group bg-white border border-slate-100 rounded-xl p-3 hover:border-indigo-200 hover:shadow-md transition-all cursor-default"
                  >
                    <div className="flex items-start justify-between gap-2">
                       <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2 mb-1">
                           <span className={cn(
                             "text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter",
                             chat.role === 'user' ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-600"
                           )}>
                             {chat.role === 'user' ? 'Bạn' : 'AI'}
                           </span>
                           <span className="text-[9px] text-slate-400 font-mono">
                             {new Date(chat.timestamp).toLocaleTimeString('vi-VN')}
                           </span>
                         </div>
                         <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed italic">{chat.content}</p>
                       </div>
                       <button
                         onClick={() => deleteChatHistory(originalIdx)}
                         className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                       >
                         <Trash2 size={12} />
                       </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Messages Area */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto px-2 md:px-4 py-4 space-y-6 custom-scrollbar scroll-smooth"
          >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-3 max-w-3xl mx-auto py-4 my-auto">
            
            {/* Consolidated All-in-One AI Command Card */}
            <div className="w-full bg-white border border-slate-200/90 rounded-2xl shadow-sm p-4 sm:p-5 text-left space-y-4">
              
              {/* Header Banner Section */}
              <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-4 sm:p-5 rounded-xl border border-slate-800 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 z-10">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[9px] font-extrabold rounded-full uppercase tracking-wider">
                      Trợ lý AI • Cấp ủy
                    </span>
                    <span className="text-slate-500 text-xs">•</span>
                    <span className="text-[11px] text-slate-300 font-medium">Văn phòng Đảng ủy</span>
                  </div>

                  <h3 className="text-base sm:text-lg font-extrabold tracking-tight">
                    Chào Đồng chí Nguyễn Minh Huy 👋
                  </h3>
                  <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                    Sẵn sàng hỗ trợ soạn thảo văn bản Đảng, tóm tắt báo cáo, tra cứu tri thức và tham mưu chỉ đạo.
                  </p>
                </div>

                <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs border border-white/10 shrink-0 self-start sm:self-center">
                  <BrainCircuit size={28} className="text-blue-300" />
                </div>
              </div>

              {/* Quick Prompt Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
                  <Zap size={12} className="text-amber-500" /> Mẫu soạn thảo:
                </span>
                {[
                  'Dự thảo Nghị quyết T3/2026',
                  'Tờ trình Chuyển đổi số',
                  'Kế hoạch Kiểm tra Giám sát',
                  'Mẫu Kết luận Hội nghị'
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(`Hãy giúp tôi xây dựng ${chip}: `);
                      inputRef.current?.focus();
                    }}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-semibold rounded-lg transition-all border border-slate-200 hover:border-blue-300 cursor-pointer active:scale-95"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* 4 Task Type Shortcuts Grid */}
              <div className="pt-2 border-t border-slate-100">
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                  Tác vụ Thường dùng
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TASK_TYPES.map((task) => (
                    <button 
                      key={task.id}
                      onClick={() => {
                        setInput(task.promptPrefix);
                        inputRef.current?.focus();
                      }}
                      className="p-3 bg-slate-50/80 hover:bg-blue-50/60 border border-slate-200/80 hover:border-blue-400 rounded-xl text-left transition-all group flex items-center gap-3 cursor-pointer"
                    >
                      <div className="p-2 bg-white group-hover:bg-blue-600 text-blue-600 group-hover:text-white rounded-lg border border-slate-200/60 transition-colors shrink-0 shadow-2xs">
                        <Sparkles size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-slate-800 group-hover:text-blue-700 transition-colors truncate">
                          {task.label}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {task.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-6">
            <AnimatePresence mode="popLayout">
              {filteredMessages.map((msg, idx) => (
                <motion.div
                  key={msg.id ? `msg-${msg.id}` : `msg-idx-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-2 group",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm border transition-transform duration-500 group-hover:scale-110 mt-1",
                    msg.role === 'user' ? "bg-blue-600 text-white border-blue-400" : "bg-white text-blue-600 border-blue-50"
                  )}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={cn(
                    "flex flex-col max-w-[90%] sm:max-w-[85%]",
                    msg.role === 'user' ? "items-end text-right" : "items-start"
                  )}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {msg.role === 'user' ? 'Đồng chí Nguyễn Minh Huy' : 'Trợ lý Tham mưu AI'}
                      </span>
                    </div>
                    
                    <div className={cn(
                      "group/msg relative",
                      msg.role === 'user' ? "flex flex-col items-end" : "flex flex-col items-start"
                    )}>
                      <div 
                        onClick={() => toggleExpand(msg.id || `msg-${idx}`)}
                        className={cn(
                          "px-3 py-2 rounded-2xl text-[13px] leading-relaxed shadow-sm relative transition-all duration-500 hover:shadow-md cursor-pointer break-words border",
                          msg.role === 'user' 
                            ? "bg-blue-950 text-white border-slate-800 rounded-tr-none shadow-md" 
                            : "bg-white text-slate-900 border-slate-200 rounded-tl-none ring-1 ring-slate-200/50 shadow-sm",
                          expandedMessages.has(msg.id || `msg-${idx}`) && "border-blue-500/30 ring-2 ring-blue-500/5 shadow-lg"
                        )}
                      >
                        {msg.title && (
                          <div className="mb-2 pb-2 border-b border-slate-100/50 flex items-center gap-1.5">
                            <Sparkles size={12} className={cn(msg.role === 'user' ? "text-blue-200" : "text-blue-500")} />
                            <h4 className={cn("font-black uppercase tracking-tight text-[11px]", msg.role === 'user' ? "text-white" : "text-slate-900")}>{msg.title}</h4>
                          </div>
                        )}
                        <div className="markdown-body max-w-none break-words leading-relaxed font-medium">
                          <Suspense fallback={<div className="animate-pulse bg-slate-100 h-20 rounded-2xl"></div>}>
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                              code({ node, className, children, ...props }) {
                                const match = /language-(\w+)/.exec(className || '');
                                const isCodeBlock = !!match;
                                
                                return isCodeBlock ? (
                                  <div className="relative group/code my-2">
                                    <div className="absolute right-2 top-2 z-10 opacity-0 group-hover/code:opacity-100 transition-opacity">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                                          if (showToast) showToast("Đã sao chép mã nguồn", "success");
                                        }}
                                        className="p-2 bg-blue-950/80 text-slate-200 hover:text-white rounded-lg backdrop-blur-sm border border-slate-700 shadow-lg transition-all active:scale-95"
                                        title="Sao chép mã"
                                      >
                                        <Copy size={14} />
                                      </button>
                                    </div>
                                    <div className="absolute left-4 top-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest pointer-events-none">
                                      {match[1]}
                                    </div>
                                    <Suspense fallback={<div className="h-40 bg-blue-950 rounded-xl animate-pulse"></div>}>
                                      <SyntaxHighlighter
                                        style={vscDarkPlus as any}
                                        language={match[1]}
                                        PreTag="div"
                                        className="rounded-xl !bg-blue-950 !pt-8 !pb-3 !px-3 !m-0 custom-scrollbar border border-slate-800 shadow-xl text-[12px]"
                                      >
                                        {String(children).replace(/\n$/, '')}
                                      </SyntaxHighlighter>
                                    </Suspense>
                                  </div>
                                ) : (
                                  <code className={cn("bg-slate-100 px-1.5 py-0.5 rounded text-blue-600 font-mono text-xs", className)} {...props}>
                                    {children}
                                  </code>
                                );
                              },
                              table({ children }) {
                                return (
                                  <div className="overflow-x-auto my-3 rounded-xl border border-slate-200 shadow-sm bg-white text-slate-900 text-[12px]">
                                    <table className="min-w-full divide-y divide-slate-200">
                                      {children}
                                    </table>
                                  </div>
                                );
                              },
                              thead({ children }) {
                                return <thead className="bg-slate-50/80 backdrop-blur-sm">{children}</thead>;
                              },
                              th({ children }) {
                                return <th className="px-2 py-1.5 text-left text-[9px] font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200">{children}</th>;
                              },
                              td({ children }) {
                                return <td className="px-2 py-1.5 text-xs text-slate-600 border-b border-slate-100">{children}</td>;
                              },
                              blockquote({ children }) {
                                return <blockquote className={cn(
                                  "border-l-4 px-3 py-2 italic my-3 rounded-r-xl shadow-sm relative overflow-hidden text-[13px]",
                                  msg.role === 'user' ? "border-blue-300 bg-white/10 text-blue-50" : "border-blue-500 bg-blue-50/50 text-slate-700"
                                )}>
                                  {children}
                                </blockquote>;
                              },
                              h1({ children }) { return <h1 className={cn("text-base font-bold mt-4 mb-2 pb-1.5 border-b tracking-tight break-words", msg.role === 'user' ? "text-white border-white/20" : "text-slate-900 border-slate-100")}>{children}</h1>; },
                              h2({ children }) { return <h2 className={cn("text-[15px] font-bold mt-3 mb-1.5 tracking-tight break-words", msg.role === 'user' ? "text-white" : "text-slate-900")}>{children}</h2>; },
                              h3({ children }) { return <h3 className={cn("text-sm font-bold mt-2 mb-1 tracking-tight break-words", msg.role === 'user' ? "text-white" : "text-slate-900")}>{children}</h3>; },
                              ul({ children }) { return <ul className="list-disc pl-5 space-y-1 my-2 break-words text-[13px]">{children}</ul>; },
                              ol({ children }) { return <ol className="list-decimal pl-5 space-y-1 my-2 break-words text-[13px]">{children}</ol>; },
                              li({ children }) { return <li className="leading-snug break-words text-inherit">{children}</li>; },
                              a({ href, children, ...props }) {
                                return (
                                  <a href={href} target="_blank" rel="noopener noreferrer" className={cn("text-blue-600 hover:underline cursor-pointer", msg.role === 'user' ? "text-blue-300" : "")} {...props}>
                                    {children}
                                  </a>
                                );
                              },
                              p({ children }) { return <p className="mb-2 last:mb-0 leading-snug text-inherit break-words text-[13px]">{children}</p>; }
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </Suspense>
                      </div>

                      {msg.role === 'model' && <QuickActions content={msg.content} />}

                      {msg.role === 'model' && msg.groundingMetadata?.groundingChunks && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <Search size={12} /> Nguồn tham khảo
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {msg.groundingMetadata.groundingChunks.map((chunk: any, i: number) => (
                              chunk.web?.uri && (
                                <a 
                                  key={i} 
                                  href={chunk.web.uri} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-[10px] transition-all border border-slate-200 max-w-[200px] truncate"
                                  title={chunk.web.title}
                                >
                                  <ArrowUpRight size={10} className="shrink-0" />
                                  <span className="truncate font-medium">{chunk.web.title || chunk.web.uri}</span>
                                </a>
                              )
                            ))}
                          </div>
                        </div>
                      )}

                      <AnimatePresence>
                        {expandedMessages.has(msg.id || `msg-${idx}`) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-3 pt-3 border-t border-slate-100 overflow-hidden"
                          >
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Thời gian chi tiết</p>
                                <p className="text-[10px] text-slate-600 font-medium">
                                  {new Date(msg.timestamp).toLocaleString('vi-VN', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                  })}
                                </p>
                              </div>
                              <div className="space-y-1 text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ID Tin nhắn</p>
                                <p className="text-[10px] text-slate-600 font-mono truncate">{msg.id || `msg-${idx}`}</p>
                              </div>
                              <div className="col-span-2 space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Độ dài nội dung</p>
                                <p className="text-[10px] text-slate-600 font-medium">{msg.content.length} ký tự</p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    <div className={cn(
                      "flex items-center gap-1 mt-1.5 px-1",
                      msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                    )}>
                      <span className="text-[9px] font-bold text-slate-400 font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      
                      {msg.role === 'model' && !isLoading && (
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveToKnowledge(msg.content, ['ai-derived'], idx);
                            }}
                            disabled={isSaving === idx}
                            className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest hover:text-indigo-600 hover:border-indigo-200 hover:shadow-sm transition-all disabled:opacity-50"
                          >
                            {isSaving === idx ? <Loader2 size={10} className="animate-spin" /> : <Database size={10} />}
                            {isSaving === idx ? 'Đang lưu' : 'Tri thức'}
                          </button>
                          
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(msg.content, idx);
                            }}
                            className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all"
                            title="Sao chép"
                          >
                            {copiedId === idx ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                          
                          {msg.content.length > 500 && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setInput(`Hãy tóm tắt nội dung sau một cách súc tích: \n\n${msg.content}`);
                              }}
                              className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-orange-500 hover:border-orange-200 transition-all"
                              title="Tóm tắt"
                            >
                              <Zap size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2"
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm border bg-white text-emerald-500 border-slate-200 mt-1">
                  <Bot size={16} />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-none bg-white text-slate-700 border border-slate-200/80 shadow-sm flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <motion.div 
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1, times: [0, 0.5, 1] }}
                      className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    />
                    <motion.div 
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1, delay: 0.2, times: [0, 0.5, 1] }}
                      className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    />
                    <motion.div 
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1, delay: 0.4, times: [0, 0.5, 1] }}
                      className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Trợ lý đang xử lý</span>
                    <span className="text-[9px] text-slate-400 font-medium">Đang phân tích dữ liệu tham mưu...</span>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

          {/* Floating Scroll Button */}
          <AnimatePresence>
            {showScrollButton && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={scrollToBottom}
                className="absolute bottom-32 right-8 p-3 bg-white border border-slate-200 rounded-full shadow-xl text-slate-600 hover:text-emerald-600 hover:border-emerald-500 transition-all z-30"
              >
                <ChevronDown size={20} />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Input Area */}
          <div className="p-3 bg-white/50 backdrop-blur-md border-t border-slate-200/60 sticky bottom-0 z-20">
            <div className="max-w-4xl mx-auto relative">
              {isListening && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-rose-500 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl animate-bounce z-30">
                  <Mic size={14} className="animate-pulse" />
                  Đang ghi âm...
                </div>
              )}

              <div className="relative group/input">
                <div className="absolute inset-0 bg-indigo-500/5 blur-xl rounded-3xl group-focus-within/input:bg-indigo-500/10 transition-all duration-500"></div>
                <div className="relative bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-[24px] shadow-lg shadow-slate-200/50 group-focus-within/input:border-indigo-300/50 group-focus-within/input:shadow-indigo-500/10 transition-all duration-500 overflow-hidden">
                    {attachedFile && (
                      <div className="px-4 py-2 bg-indigo-50/50 border-b border-indigo-100/50 flex items-center justify-between animate-in slide-in-from-top duration-300">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-indigo-100 text-indigo-600 rounded-lg">
                            <FileText size={12} />
                          </div>
                          <span className="text-[10px] font-bold text-indigo-900 truncate max-w-[200px]">{attachedFile.name}</span>
                        </div>
                        <button 
                          onClick={() => setAttachedFile(null)}
                          className="p-1 hover:bg-indigo-100 text-indigo-400 hover:text-indigo-600 rounded-lg transition-all"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}

                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          onSend();
                        }
                      }}
                      placeholder={attachedFile ? "Nhập yêu cầu phân tích tệp..." : "Viết nội dung cần cố vấn hoặc chỉ huy..."}
                      className="w-full pl-4 pr-32 py-3 bg-white border-none focus:ring-0 text-[14px] font-medium text-slate-900 placeholder:text-slate-400 resize-none min-h-[48px] max-h-32 custom-scrollbar leading-relaxed"
                      rows={1}
                    />
                    
                    <div className="absolute right-3 bottom-2 flex items-center gap-1.5">
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".docx,.pdf,.txt,.md,image/*"
                      />
                      
                      <div className="flex items-center gap-1 p-0.5 bg-slate-50/80 rounded-xl border border-slate-100">
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className={cn(
                            "p-1.5 rounded-lg transition-all",
                            isUploading ? "text-slate-300" : "text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm"
                          )}
                          title="Đính kèm tệp"
                        >
                          {isUploading ? <Loader2 size={14} className="animate-spin" /> : <PaperclipIcon size={14} />}
                        </button>
                        <button 
                          onClick={toggleListening}
                          className={cn(
                            "p-1.5 rounded-lg transition-all",
                            isListening ? "text-rose-500 bg-white shadow-sm ring-1 ring-rose-100 animate-pulse" : "text-slate-400 hover:text-emerald-600 hover:bg-white hover:shadow-sm"
                          )}
                          title="Nhập giọng nói"
                        >
                          {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                        </button>
                        <button 
                          onClick={handleRewriteInput}
                          disabled={!input.trim() || isRewriting}
                          className={cn(
                            "p-1.5 rounded-lg transition-all",
                            isRewriting ? "text-amber-500 animate-spin" : input.trim() ? "text-amber-500 hover:bg-amber-50 hover:shadow-sm" : "text-slate-300"
                          )}
                          title="Viết lại nội dung (Thông minh hơn)"
                        >
                          {isRewriting ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                        </button>
                      </div>

                      <button 
                        onClick={onSend}
                        disabled={isLoading || (!input.trim() && !attachedFile)}
                        className={cn(
                          "w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-500 shadow-md",
                          isLoading || (!input.trim() && !attachedFile)
                            ? "bg-slate-100 text-slate-300 cursor-not-allowed" 
                            : "bg-indigo-600 text-white shadow-indigo-500/30 hover:bg-indigo-700 hover:scale-110 active:scale-95 group-focus-within/input:bg-indigo-50"
                        )}
                      >
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                      </button>
                    </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-4 px-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => smartLearnFromText(input, [], true)}
                    disabled={!input.trim() || isLearning}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      input.trim() 
                        ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100" 
                        : "bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed"
                    )}
                  >
                    {isLearning ? <Loader2 size={12} className="animate-spin" /> : <Brain size={13} />}
                    Tích lũy tri thức
                  </button>
                  <button
                    onClick={() => {
                      setInput(input ? input + '\n\nHãy lập kế hoạch chiến lược chi tiết: ' : 'Hãy lập kế hoạch chiến lược cho: ');
                      inputRef.current?.focus();
                    }}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100"
                  >
                    <Zap size={13} />
                    Tham mưu chiến lược
                  </button>
                </div>

                <div className="hidden lg:flex items-center gap-4 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] pointer-events-none opacity-50">
                  <span className="flex items-center gap-1"><ArrowUpRight size={10} /> Enter gửi tin</span>
                  <span className="flex items-center gap-1"><ChevronDown size={10} /> Shift+Enter xuống dòng</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User List Sidebar */}
        <AnimatePresence>
          {showUserList && (
            <motion.div
              initial={{ opacity: 0, x: 20, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 320 }}
              exit={{ opacity: 0, x: 20, width: 0 }}
              className="border-l border-slate-200 bg-white overflow-hidden flex flex-col shadow-xl z-10"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                    <Users size={16} />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">Thành viên</h3>
                </div>
                <button 
                  onClick={() => setShowUserList(false)}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <UserList />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

ChatModule.displayName = 'ChatModule';
