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
  Paperclip as PaperclipIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import remarkGfm from 'remark-gfm';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message, TASK_TYPES } from '../constants';
import { cn } from '../lib/utils';
import { UserList } from './UserList';
import { useSpeechToText } from '../hooks/useSpeechToText';

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
  smartLearnFromText: (text: string, isManual: boolean) => void;
  isLearning: boolean;
  onClearChat: () => void;
  chatHistory: any[];
  deleteChatHistory: (index: number) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  isSearchEnabled?: boolean;
  setIsSearchEnabled?: (val: boolean) => void;
  isSimpleMode?: boolean;
  setIsSimpleMode?: (val: boolean) => void;
}

import { KnowledgeConfirmModal } from './KnowledgeConfirmModal';

export const ChatModule: React.FC<ChatModuleProps> = memo(({
  messages, input, setInput, isLoading, handleSend,
  messagesEndRef, inputRef, copyToClipboard, copiedId,
  saveToKnowledge, isSaving, aiKnowledge, smartLearnFromText, isLearning,
  onClearChat, chatHistory, deleteChatHistory, showToast,
  isSearchEnabled, setIsSearchEnabled,
  isSimpleMode, setIsSimpleMode
}) => {
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  const [pendingSave, setPendingSave] = useState<{ content: string; tags: string[]; index: number } | null>(null);
  const [validationResult, setValidationResult] = useState<{
    isDuplicate: boolean;
    duplicateTitle?: string;
    isNew: boolean;
  } | null>(null);

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
      let content = '';
      if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        content = await file.text();
      } else {
        if (showToast) showToast("Định dạng file không hỗ trợ (Chỉ hỗ trợ .txt, .md)", "warning");
        setIsUploading(false);
        return;
      }

      setAttachedFile({ name: file.name, content });
      if (showToast) showToast(`Đã đính kèm: ${file.name}`, "success");
    } catch (error) {
      console.error('File upload error:', error);
      if (showToast) showToast("Lỗi khi đọc file", "error");
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
    <div className="flex flex-col h-full bg-slate-50/30 relative">
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
      <div className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[hsl(var(--accent))] flex items-center justify-center shadow-lg shadow-[hsl(var(--accent)/0.2)]">
            <Sparkles className="text-[hsl(var(--accent-foreground))]" size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[hsl(var(--foreground))] tracking-tight">Trợ lý Tham mưu AI</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--accent))] animate-pulse"></div>
              <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Hệ thống sẵn sàng</span>
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
              isSearchEnabled ? "bg-blue-500 text-white border-blue-400 shadow-blue-500/20" : "bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 border-slate-200/60"
            )}
            title="Tìm kiếm thông tin thực tế (Google Search Grounding)"
          >
            <Zap size={18} className={cn(isSearchEnabled && "animate-pulse")} />
            {!isSearchEnabled && <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Search AI</span>}
          </button>

          <button 
            onClick={() => setShowHistoryModal(true)}
            className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200"
            title="Lịch sử hội thoại"
          >
            <Database size={18} />
          </button>

          <button 
            onClick={onClearChat}
            className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all duration-200"
            title="Xóa hội thoại"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* History Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setShowHistoryModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl max-h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                    <Database size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Lịch sử hội thoại</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Quản lý các cuộc hội thoại trước đây</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowHistoryModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {chatHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <Database size={24} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-bold text-slate-900">Chưa có lịch sử</p>
                    <p className="text-xs text-slate-500 mt-1">Các cuộc hội thoại sẽ được lưu lại ở đây.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chatHistory.map((chat, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-indigo-200 transition-colors group">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                              chat.role === 'user' ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-600"
                            )}>
                              {chat.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                  {chat.role === 'user' ? 'Bạn' : 'AI'}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(chat.timestamp).toLocaleString('vi-VN')}
                                </span>
                              </div>
                              <p className="text-sm text-slate-700 line-clamp-3">{chat.content}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteChatHistory(idx)}
                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                            title="Xóa"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Messages Area */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto px-4 py-8 space-y-8 custom-scrollbar scroll-smooth"
          >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto">
            <div className="w-20 h-20 rounded-3xl bg-white shadow-xl shadow-slate-200/50 flex items-center justify-center mb-6 animate-bounce-slow">
              <Bot size={40} className="text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Xin chào Đồng chí!</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium max-w-md">
              Tôi là trợ lý AI chuyên sâu về công tác tham mưu. Hãy đặt câu hỏi hoặc chọn một tác vụ gợi ý bên dưới.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10 w-full">
              {TASK_TYPES.map((task) => (
                <button 
                  key={task.id}
                  onClick={() => {
                    setInput(task.promptPrefix);
                    inputRef.current?.focus();
                  }}
                  className="p-5 bg-white border border-slate-200 rounded-2xl text-left hover:border-emerald-500 hover:shadow-xl hover:-translate-y-1 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <Sparkles size={16} />
                    </div>
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">{task.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{task.description}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-8">
            <AnimatePresence mode="popLayout">
              {filteredMessages.map((msg, idx) => (
                <motion.div
                  key={msg.id || `msg-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-4 group",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm border",
                    msg.role === 'user' ? "bg-slate-800 text-white border-slate-700" : "bg-white text-emerald-500 border-slate-200"
                  )}>
                    {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                  </div>
                  <div className={cn(
                    "flex flex-col max-w-[85%] sm:max-w-[80%]",
                    msg.role === 'user' ? "items-end" : "items-start"
                  )}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">
                      {msg.role === 'user' ? 'Bạn' : 'Trợ lý AI'}
                    </span>
                    <div 
                      onClick={() => toggleExpand(msg.id || `msg-${idx}`)}
                      className={cn(
                        "px-6 py-4 rounded-2xl text-sm leading-relaxed shadow-sm relative transition-all duration-200 hover:bg-slate-50 cursor-pointer break-words",
                        msg.role === 'user' 
                          ? "bg-white text-slate-800 border border-slate-200 rounded-tr-none" 
                          : "bg-white text-slate-700 border border-slate-200/80 rounded-tl-none",
                        expandedMessages.has(msg.id || `msg-${idx}`) && "ring-2 ring-emerald-500/20 border-emerald-200 shadow-md"
                      )}
                    >
                      {msg.title && (
                        <div className="mb-2 pb-2 border-b border-slate-100/50">
                          <h4 className="font-bold text-slate-900">{msg.title}</h4>
                        </div>
                      )}
                      <div className="markdown-body max-w-none break-words">
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
                                        onClick={() => {
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
                                  <code className={cn("bg-slate-100 px-1.5 py-0.5 rounded text-emerald-600 font-mono text-xs", className)} {...props}>
                                    {children}
                                  </code>
                                );
                              },
                              table({ children }) {
                                return (
                                  <div className="overflow-x-auto my-6 rounded-2xl border border-slate-200 shadow-sm bg-white">
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
                                return <blockquote className="border-l-4 border-emerald-500 bg-emerald-50/50 px-6 py-4 italic text-slate-700 my-6 rounded-r-2xl shadow-sm relative overflow-hidden">
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500/20"></div>
                                  {children}
                                </blockquote>;
                              },
                              h1({ children }) { return <h1 className="text-xl font-bold text-slate-900 mt-8 mb-4 pb-2 border-b border-slate-100 tracking-tight break-words">{children}</h1>; },
                              h2({ children }) { return <h2 className="text-lg font-bold text-slate-900 mt-6 mb-3 tracking-tight break-words">{children}</h2>; },
                              h3({ children }) { return <h3 className="text-base font-bold text-slate-900 mt-5 mb-2 tracking-tight break-words">{children}</h3>; },
                              ul({ children }) { return <ul className="list-disc pl-5 space-y-2 my-4 break-words">{children}</ul>; },
                              ol({ children }) { return <ol className="list-decimal pl-5 space-y-2 my-4 break-words">{children}</ol>; },
                              li({ children }) { return <li className="text-slate-700 leading-relaxed break-words">{children}</li>; },
                              p({ children }) { return <p className="mb-4 last:mb-0 leading-relaxed text-slate-700 break-words">{children}</p>; }
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
                      "flex items-center gap-3 mt-1.5 px-1",
                      msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                    )}>
                      <span className="text-[9px] font-medium text-slate-400">
                        {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button 
                          onClick={() => copyToClipboard(msg.content, idx)}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
                          title="Sao chép"
                        >
                          {copiedId === idx ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                        <button 
                          onClick={() => handleSaveToKnowledge(msg.content, [], idx)}
                          disabled={isSaving !== null}
                          className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-all"
                          title="Lưu vào kiến thức"
                        >
                          {isSaving === idx ? <Loader2 size={12} className="animate-spin" /> : <Database size={12} />}
                        </button>
                        <button 
                          onClick={() => {
                            if (navigator.share) {
                              navigator.share({
                                title: msg.title || 'Chia sẻ nội dung từ Trợ lý AI',
                                text: msg.content,
                              }).catch(err => {
                                if (err.name !== 'AbortError') {
                                  console.error('Error sharing:', err);
                                }
                              });
                            } else {
                              copyToClipboard(msg.content, idx);
                              if (showToast) showToast("Đã sao chép nội dung vào bộ nhớ tạm để chia sẻ", "info");
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-all"
                          title="Chia sẻ"
                        >
                          <Share2 size={12} />
                        </button>
                        {msg.role === 'model' && (
                          <button 
                            onClick={() => {
                              const zaloShareUrl = `https://zalo.me/share?text=${encodeURIComponent(msg.content)}`;
                              window.open(zaloShareUrl, '_blank');
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-all"
                            title="Chia sẻ Zalo"
                          >
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                              <path d="M22.12 11.23c-.15-.43-.45-.8-.85-1.04l-7.38-4.26c-.8-.46-1.8-.46-2.6 0l-7.38 4.26c-.4.23-.7.61-.85 1.04-.15.43-.15.9 0 1.33.15.43.45.8.85 1.04l7.38 4.26c.4.23.8.35 1.3.35s.9-.12 1.3-.35l7.38-4.26c.4-.23.7-.61.85-1.04.15-.43.15-.9 0-1.33zM12 15.5l-6.5-3.75 6.5-3.75 6.5 3.75-6.5 3.75z" />
                            </svg>
                          </button>
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
          <div className="p-6 bg-white/80 backdrop-blur-md border-t border-slate-200/60 sticky bottom-0 z-20">
            <div className="max-w-7xl mx-auto">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-3xl blur opacity-10 group-focus-within:opacity-20 transition duration-500"></div>
                <div className="relative bg-white border border-slate-200 rounded-3xl shadow-sm focus-within:border-emerald-500/50 transition-all duration-300">
                    {isListening && (
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg animate-bounce">
                        <Mic size={14} className="animate-pulse" />
                        Đang lắng nghe...
                      </div>
                    )}
                    
                    {attachedFile && (
                      <div className="absolute -top-12 left-6 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-2 border border-indigo-200 shadow-sm">
                        <FileText size={12} />
                        <span className="max-w-[150px] truncate">{attachedFile.name}</span>
                        <button 
                          onClick={() => setAttachedFile(null)}
                          className="p-0.5 hover:bg-indigo-200 rounded-md transition-colors"
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
                      placeholder={attachedFile ? "Nhập yêu cầu phân tích tệp..." : "Nhập nội dung cần tham mưu..."}
                      className="w-full pl-6 pr-32 py-4 bg-transparent border-none focus:ring-0 text-sm text-slate-700 placeholder:text-slate-400 resize-none min-h-[56px] max-h-48 custom-scrollbar"
                      rows={1}
                    />
                    <div className="absolute right-3 bottom-2.5 flex items-center gap-1.5">
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".docx,.txt,.md"
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className={cn(
                          "p-2 rounded-xl transition-all",
                          isUploading ? "text-slate-300" : "text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
                        )}
                        title="Đính kèm tệp (.docx, .txt, .md)"
                      >
                        {isUploading ? <Loader2 size={18} className="animate-spin" /> : <PaperclipIcon size={18} />}
                      </button>
                      <button 
                        onClick={toggleListening}
                        className={cn(
                          "p-2 rounded-xl transition-all",
                          isListening ? "text-rose-500 bg-rose-50 animate-pulse" : "text-slate-400 hover:text-emerald-600 hover:bg-slate-50"
                        )}
                        title={isListening ? "Dừng nghe" : "Nhập bằng giọng nói"}
                      >
                        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                      </button>
                      <button 
                        onClick={onSend}
                        disabled={isLoading || (!input.trim() && !attachedFile)}
                        className={cn(
                          "p-2.5 rounded-2xl transition-all duration-300 shadow-lg",
                          isLoading || (!input.trim() && !attachedFile)
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                            : "bg-emerald-500 text-white shadow-emerald-500/30 hover:scale-105 hover:bg-emerald-600"
                        )}
                      >
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                      </button>
                    </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 px-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => smartLearnFromText(input, true)}
                    disabled={!input.trim() || isLearning}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                      input.trim() 
                        ? "bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100" 
                        : "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                    )}
                  >
                    {isLearning ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
                    AI Học hỏi
                  </button>
                  <button
                    onClick={() => {
                      setInput(input ? input + '\n\nHãy lập kế hoạch chi tiết...' : 'Hãy lập kế hoạch chi tiết cho...');
                      inputRef.current?.focus();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                  >
                    <Calendar size={12} />
                    Lập kế hoạch
                  </button>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shift + Enter để xuống dòng</p>
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
