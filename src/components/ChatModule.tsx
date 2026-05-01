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
  Paperclip as PaperclipIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import remarkGfm from 'remark-gfm';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message, TASK_TYPES } from '../constants';
import { cn } from '../lib/utils';
import { UserList } from './UserList';
import { useSpeechToText } from '../hooks/useSpeechToText';
import axios from 'axios';

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
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  
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
      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
        <p className="w-full text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border border-emerald-200/50 shadow-sm hover:shadow-md"
          >
            <action.icon size={12} />
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
      <div className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <BrainCircuit className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Trợ lý Chỉ huy Elite v8.0</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-sm shadow-blue-500/50"></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Strategic Context: Active</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl overflow-hidden transition-all duration-300",
            showSearch ? "w-48 sm:w-64 opacity-100 px-2" : "w-0 opacity-0 border-none"
          )}>
            <Search size={14} className="text-[hsl(var(--muted-foreground))] shrink-0" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full px-2 py-1.5 text-xs bg-transparent focus:outline-none text-[hsl(var(--foreground))]"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                <X size={12} />
              </button>
            )}
          </div>

          <button 
            onClick={() => setShowUserList(!showUserList)}
            className={cn(
              "p-2.5 rounded-xl transition-all duration-200",
              showUserList ? "bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]" : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
            )}
            title="Danh sách người dùng"
          >
            <Users size={18} />
          </button>

          <button 
            onClick={() => setShowSearch(!showSearch)}
            className={cn(
              "p-2.5 rounded-xl transition-all duration-200",
              showSearch ? "bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]" : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
            )}
            title="Tìm kiếm"
          >
            <Search size={18} />
          </button>

          <button 
            onClick={() => setIsSimpleMode && setIsSimpleMode(!isSimpleMode)}
            className={cn(
              "p-2.5 rounded-xl transition-all duration-300 shadow-sm border flex items-center gap-2",
              isSimpleMode ? "bg-amber-500 text-white border-amber-400 shadow-amber-500/20" : "bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:text-amber-600 hover:bg-amber-50 border-[hsl(var(--border))]"
            )}
            title="Chế độ đơn thuần (Trả lời ngắn gọn, trọng tâm)"
          >
            <Sparkles size={18} className={cn(isSimpleMode && "animate-pulse")} />
            {!isSimpleMode && <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Đơn thuần</span>}
          </button>

          <button 
            onClick={() => setIsSearchEnabled && setIsSearchEnabled(!isSearchEnabled)}
            className={cn(
              "p-2.5 rounded-xl transition-all duration-300 shadow-sm border flex items-center gap-2",
              isSearchEnabled ? "bg-blue-600 text-white border-blue-500 shadow-blue-500/20" : "bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 border-slate-200"
            )}
            title="Tìm kiếm thông tin thực tế (Google Search Grounding)"
          >
            <Zap size={18} className={cn(isSearchEnabled && "animate-pulse")} />
            {!isSearchEnabled && <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Search AI</span>}
          </button>

          <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-100">
            <button 
              onClick={() => setIsHistorySidebarOpen(true)}
              className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200"
              title="Lịch sử hội thoại"
            >
              <Database size={18} />
            </button>
            <button 
              onClick={onClearChat}
              className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all duration-200"
              title="Làm mới hội thoại"
            >
              <Trash2 size={18} />
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
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90]"
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
            className="flex-1 overflow-y-auto px-4 md:px-12 py-10 space-y-10 custom-scrollbar scroll-smooth"
          >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto py-20">
            <div className="w-24 h-24 rounded-3xl bg-blue-600 shadow-2xl shadow-blue-500/20 flex items-center justify-center mb-8 animate-bounce-slow border border-white/20">
              <BrainCircuit size={48} className="text-white" />
            </div>
            <h3 className="text-3xl font-black text-slate-900 mb-3 uppercase tracking-tighter italic">Trung tâm Chỉ huy Elite v8.0</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-bold max-w-lg uppercase tracking-wide">
              Hệ thống đã sẵn sàng cho các tác vụ tham mưu và chỉ huy chiến lược.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-12 w-full max-w-3xl">
              {TASK_TYPES.map((task) => (
                <button 
                  key={task.id}
                  onClick={() => {
                    setInput(task.promptPrefix);
                    inputRef.current?.focus();
                  }}
                  className="p-6 bg-white border border-slate-200 rounded-2xl text-left hover:border-blue-500 hover:shadow-2xl hover:-translate-y-1 transition-all group shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Sparkles size={18} />
                    </div>
                    <span className="text-sm font-black text-slate-900 uppercase tracking-wider">{task.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 font-medium">{task.description}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-10">
            <AnimatePresence mode="popLayout">
              {filteredMessages.map((msg, idx) => (
                <motion.div
                  key={msg.id ? `msg-${msg.id}` : `msg-idx-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-4 group",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border transition-transform duration-500 group-hover:scale-110",
                    msg.role === 'user' ? "bg-blue-600 text-white border-blue-400" : "bg-white text-blue-600 border-blue-50"
                  )}>
                    {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                  </div>
                  <div className={cn(
                    "flex flex-col max-w-[85%] sm:max-w-[80%]",
                    msg.role === 'user' ? "items-end text-right" : "items-start"
                  )}>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        {msg.role === 'user' ? 'Giao thức người dùng' : 'Phản hồi tham mưu AI'}
                      </span>
                    </div>
                    
                    <div className={cn(
                      "group/msg relative",
                      msg.role === 'user' ? "flex flex-col items-end" : "flex flex-col items-start"
                    )}>
                      <div 
                        onClick={() => toggleExpand(msg.id || `msg-${idx}`)}
                        className={cn(
                          "px-6 py-5 rounded-3xl text-[14px] leading-relaxed shadow-sm relative transition-all duration-500 hover:shadow-xl hover:shadow-blue-500/5 cursor-pointer break-words border",
                          msg.role === 'user' 
                            ? "bg-slate-900 text-white border-slate-800 rounded-tr-none shadow-xl shadow-slate-200" 
                            : "bg-white text-slate-900 border-slate-200 rounded-tl-none ring-1 ring-slate-200/50 shadow-sm",
                          expandedMessages.has(msg.id || `msg-${idx}`) && "border-blue-500/30 ring-4 ring-blue-500/5 shadow-2xl"
                        )}
                      >
                        {msg.title && (
                          <div className="mb-3 pb-3 border-b border-slate-100/50 flex items-center gap-2">
                            <Sparkles size={14} className={cn(msg.role === 'user' ? "text-blue-200" : "text-blue-500")} />
                            <h4 className={cn("font-black uppercase tracking-tight text-xs", msg.role === 'user' ? "text-white" : "text-slate-900")}>{msg.title}</h4>
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
                                  <div className="relative group/code my-4">
                                    <div className="absolute right-3 top-3 z-10 opacity-0 group-hover/code:opacity-100 transition-opacity">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                                          if (showToast) showToast("Đã sao chép mã nguồn", "success");
                                        }}
                                        className="p-2 bg-slate-800/80 text-slate-200 hover:text-white rounded-lg backdrop-blur-sm border border-slate-700 shadow-lg transition-all active:scale-95"
                                        title="Sao chép mã"
                                      >
                                        <Copy size={14} />
                                      </button>
                                    </div>
                                    <div className="absolute left-4 top-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest pointer-events-none">
                                      {match[1]}
                                    </div>
                                    <Suspense fallback={<div className="h-40 bg-slate-900 rounded-2xl animate-pulse"></div>}>
                                      <SyntaxHighlighter
                                        style={vscDarkPlus as any}
                                        language={match[1]}
                                        PreTag="div"
                                        className="rounded-2xl !bg-slate-900 !pt-10 !pb-4 !px-4 !m-0 custom-scrollbar border border-slate-800 shadow-2xl"
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
                                  <div className="overflow-x-auto my-6 rounded-2xl border border-slate-200 shadow-sm bg-white text-slate-900">
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
                                return <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200">{children}</th>;
                              },
                              td({ children }) {
                                return <td className="px-4 py-3 text-sm text-slate-600 border-b border-slate-100">{children}</td>;
                              },
                              blockquote({ children }) {
                                return <blockquote className={cn(
                                  "border-l-4 px-6 py-4 italic my-6 rounded-r-2xl shadow-sm relative overflow-hidden",
                                  msg.role === 'user' ? "border-blue-300 bg-white/10 text-blue-50" : "border-blue-500 bg-blue-50/50 text-slate-700"
                                )}>
                                  {children}
                                </blockquote>;
                              },
                              h1({ children }) { return <h1 className={cn("text-xl font-bold mt-8 mb-4 pb-2 border-b tracking-tight break-words", msg.role === 'user' ? "text-white border-white/20" : "text-slate-900 border-slate-100")}>{children}</h1>; },
                              h2({ children }) { return <h2 className={cn("text-lg font-bold mt-6 mb-3 tracking-tight break-words", msg.role === 'user' ? "text-white" : "text-slate-900")}>{children}</h2>; },
                              h3({ children }) { return <h3 className={cn("text-base font-bold mt-5 mb-2 tracking-tight break-words", msg.role === 'user' ? "text-white" : "text-slate-900")}>{children}</h3>; },
                              ul({ children }) { return <ul className="list-disc pl-5 space-y-2 my-4 break-words">{children}</ul>; },
                              ol({ children }) { return <ol className="list-decimal pl-5 space-y-2 my-4 break-words">{children}</ol>; },
                              li({ children }) { return <li className="leading-relaxed break-words text-inherit">{children}</li>; },
                              p({ children }) { return <p className="mb-4 last:mb-0 leading-relaxed text-inherit break-words">{children}</p>; }
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </Suspense>
                      </div>

                      {msg.role === 'model' && <QuickActions content={msg.content} />}

                      {msg.role === 'model' && msg.groundingMetadata?.groundingChunks && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
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
                            className="mt-4 pt-4 border-t border-slate-100 overflow-hidden"
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
                      "flex items-center gap-2 mt-2 px-1",
                      msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                    )}>
                      <span className="text-[10px] font-bold text-slate-400 font-mono">
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
                className="flex gap-4"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm border bg-white text-emerald-500 border-slate-200">
                  <Bot size={18} />
                </div>
                <div className="px-6 py-4 rounded-2xl rounded-tl-none bg-white text-slate-700 border border-slate-200/80 shadow-sm flex items-center gap-3">
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
          <div className="p-6 bg-white/50 backdrop-blur-md border-t border-slate-200/60 sticky bottom-0 z-20">
            <div className="max-w-4xl mx-auto relative">
              {isListening && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-rose-500 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl animate-bounce z-30">
                  <Mic size={14} className="animate-pulse" />
                  Đang ghi âm...
                </div>
              )}

              <div className="relative group/input">
                <div className="absolute inset-0 bg-indigo-500/5 blur-xl rounded-[40px] group-focus-within/input:bg-indigo-500/10 transition-all duration-500"></div>
                <div className="relative bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-[32px] shadow-2xl shadow-slate-200/50 group-focus-within/input:border-indigo-300/50 group-focus-within/input:shadow-indigo-500/10 transition-all duration-500 overflow-hidden">
                    {attachedFile && (
                      <div className="px-6 py-3 bg-indigo-50/50 border-b border-indigo-100/50 flex items-center justify-between animate-in slide-in-from-top duration-300">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                            <FileText size={14} />
                          </div>
                          <span className="text-[11px] font-bold text-indigo-900 truncate max-w-[200px]">{attachedFile.name}</span>
                        </div>
                        <button 
                          onClick={() => setAttachedFile(null)}
                          className="p-1 hover:bg-indigo-100 text-indigo-400 hover:text-indigo-600 rounded-lg transition-all"
                        >
                          <X size={14} />
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
                      className="w-full pl-6 pr-36 py-5 bg-white border-none focus:ring-0 text-[15px] font-medium text-slate-900 placeholder:text-slate-400 resize-none min-h-[64px] max-h-48 custom-scrollbar leading-relaxed"
                      rows={1}
                    />
                    
                    <div className="absolute right-4 bottom-3 flex items-center gap-2">
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".docx,.pdf,.txt,.md,image/*"
                      />
                      
                      <div className="flex items-center gap-1 p-1 bg-slate-50/80 rounded-2xl border border-slate-100">
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className={cn(
                            "p-2 rounded-xl transition-all",
                            isUploading ? "text-slate-300" : "text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm"
                          )}
                          title="Đính kèm tệp"
                        >
                          {isUploading ? <Loader2 size={16} className="animate-spin" /> : <PaperclipIcon size={16} />}
                        </button>
                        <button 
                          onClick={toggleListening}
                          className={cn(
                            "p-2 rounded-xl transition-all",
                            isListening ? "text-rose-500 bg-white shadow-sm ring-1 ring-rose-100 animate-pulse" : "text-slate-400 hover:text-emerald-600 hover:bg-white hover:shadow-sm"
                          )}
                          title="Nhập giọng nói"
                        >
                          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                        </button>
                      </div>

                      <button 
                        onClick={onSend}
                        disabled={isLoading || (!input.trim() && !attachedFile)}
                        className={cn(
                          "w-11 h-11 flex items-center justify-center rounded-[18px] transition-all duration-500 shadow-lg",
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
