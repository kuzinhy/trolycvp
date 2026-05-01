import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Search, 
  Trash2, 
  History, 
  User, 
  Bot, 
  Calendar, 
  Filter,
  ArrowRight,
  MessageSquare,
  Clock,
  ChevronRight,
  Copy,
  Download,
  Share2,
  MoreVertical,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  Minimize2,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

interface ChatHistoryModuleProps {
  chatHistory: any[];
  onDelete: (index: number) => Promise<void>;
  isHistoryLoading: boolean;
  onNavigate: (tab: string) => void;
  onExportToKnowledge?: (content: string) => void;
  onClearAll?: () => void;
}

export const ChatHistoryModule: React.FC<ChatHistoryModuleProps> = ({ 
  chatHistory, 
  onDelete, 
  isHistoryLoading,
  onNavigate,
  onExportToKnowledge,
  onClearAll
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'user' | 'model'>('all');
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [isClearing, setIsClearing] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDownloadPDF = async (chat: any) => {
    alert('Tính năng xuất PDF hiện không khả dụng.');
  };

  const handleShare = async (chat: any) => {
    if (!chat) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Chia sẻ hội thoại AI',
          text: chat.content,
          url: window.location.href
        });
      } catch (error) {
        console.error('Share Error:', error);
      }
    } else {
      navigator.clipboard.writeText(chat.content);
      alert('Đã sao chép nội dung vào bộ nhớ tạm để chia sẻ.');
    }
  };

  const handleClearAll = async () => {
    if (!onClearAll) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử hội thoại? Hành động này không thể hoàn tác.')) {
      setIsClearing(true);
      try {
        await onClearAll();
        setSelectedChat(null);
      } finally {
        setIsClearing(false);
      }
    }
  };

  const filteredHistory = useMemo(() => {
    if (!Array.isArray(chatHistory)) return [];
    return chatHistory.filter(chat => {
      if (!chat || !chat.content) return false;
      const matchesSearch = chat.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === 'all' || chat.role === filterRole;
      
      const chatDate = new Date(chat.timestamp);
      if (isNaN(chatDate.getTime())) return false; // Skip invalid dates
      
      const now = new Date();
      let matchesDate = true;
      
      if (dateFilter === 'today') {
        matchesDate = chatDate.toDateString() === now.toDateString();
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = chatDate >= weekAgo;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = chatDate >= monthAgo;
      }
      
      return matchesSearch && matchesRole && matchesDate;
    });
  }, [chatHistory, searchTerm, filterRole, dateFilter]);

  // Group by date
  const groupedHistory = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredHistory.forEach((chat) => {
      const date = new Date(chat.timestamp).toLocaleDateString('vi-VN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      if (!groups[date]) groups[date] = [];
      
      // Find the index in the original chatHistory array
      const originalIndex = chatHistory.findIndex(c => c.timestamp === chat.timestamp);
      groups[date].push({ ...chat, originalIndex });
    });
    return Object.entries(groups).sort((a, b) => {
      return new Date(b[1][0].timestamp).getTime() - new Date(a[1][0].timestamp).getTime();
    });
  }, [filteredHistory, chatHistory]);

  if (isHistoryLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Đang tải lịch sử...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 h-[calc(100vh-80px)] p-2">
      {/* List Area */}
      <div className={cn(
        "bg-white rounded-3xl border border-slate-200/60 shadow-sm flex flex-col overflow-hidden transition-all duration-300",
        selectedChat ? "lg:col-span-4 hidden lg:flex" : "lg:col-span-12"
      )}>
        <div className="p-3 border-b border-slate-100 bg-slate-50/30">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <History size={16} className="text-indigo-600" />
                Danh sách hội thoại
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-wider">
                  {filteredHistory.length} mục
                </span>
                {onClearAll && chatHistory.length > 0 && (
                  <button 
                    onClick={handleClearAll}
                    disabled={isClearing}
                    className={cn(
                      "text-[10px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider transition-colors",
                      isClearing && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isClearing ? 'Đang xóa...' : 'Xóa tất cả'}
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm nội dung..."
                className="w-full pl-12 pr-4 py-2 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                {(['all', 'user', 'model'] as const).map((role) => (
                  <button 
                    key={role}
                    onClick={() => setFilterRole(role)}
                    className={cn(
                      "px-3 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all",
                      filterRole === role ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {role === 'all' ? 'Tất cả' : role === 'user' ? 'Người dùng' : 'AI'}
                  </button>
                ))}
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                {(['all', 'today', 'week', 'month'] as const).map((period) => (
                  <button 
                    key={period}
                    onClick={() => setDateFilter(period)}
                    className={cn(
                      "px-3 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all",
                      dateFilter === period ? "bg-white text-amber-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {period === 'all' ? 'Mọi lúc' : period === 'today' ? 'Hôm nay' : period === 'week' ? 'Tuần này' : 'Tháng này'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          {groupedHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <History size={32} className="text-slate-200" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Không tìm thấy kết quả</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-xs">Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedHistory.map(([date, chats]) => (
                <div key={date} className="space-y-3">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-slate-100"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{date}</span>
                    <div className="h-px flex-1 bg-slate-100"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {chats.map((chat) => (
                      <motion.div
                        layoutId={`chat-${chat.timestamp}`}
                        key={chat.timestamp}
                        onClick={() => setSelectedChat(chat)}
                        className={cn(
                          "group p-4 bg-white border rounded-2xl transition-all cursor-pointer hover:shadow-md",
                          selectedChat?.timestamp === chat.timestamp 
                            ? "border-indigo-500 ring-4 ring-indigo-500/5 bg-indigo-50/30" 
                            : "border-slate-200/60 hover:border-indigo-200"
                        )}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            chat.role === 'user' ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-600"
                          )}>
                            {chat.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {new Date(chat.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-700 line-clamp-2 font-medium mb-3 leading-relaxed">
                          {chat.content}
                        </p>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <Clock size={12} />
                            {chat.role === 'user' ? (chat.userId === user?.uid ? 'Bạn gửi' : `${chat.userName || 'Người dùng'} gửi`) : 'AI phản hồi'}
                          </div>
                          <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Area */}
      <AnimatePresence>
        {selectedChat && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/60 shadow-sm flex flex-col overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedChat(null)}
                  className="lg:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <ChevronRight size={20} className="rotate-180" />
                </button>
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                  selectedChat.role === 'user' ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-600"
                )}>
                  {selectedChat.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    {selectedChat.role === 'user' ? (selectedChat.userId === user?.uid ? 'Tin nhắn của bạn' : `Tin nhắn của ${selectedChat.userName || 'Người dùng'}`) : 'Phản hồi từ AI'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                    <Clock size={10} />
                    {new Date(selectedChat.timestamp).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(selectedChat.content);
                  }}
                  className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                  title="Sao chép nội dung"
                >
                  <Copy size={18} />
                </button>
                <button 
                  onClick={() => setIsExpanded(true)}
                  className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                  title="Xem mở rộng"
                >
                  <Maximize2 size={18} />
                </button>
                {selectedChat.role === 'model' && onExportToKnowledge && (
                  <button 
                    onClick={() => onExportToKnowledge(selectedChat.content)}
                    className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                    title="Lưu vào Kho tri thức"
                  >
                    <Sparkles size={18} />
                  </button>
                )}
                <button 
                  onClick={() => onDelete(selectedChat.originalIndex)}
                  className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  title="Xóa khỏi lịch sử"
                >
                  <Trash2 size={18} />
                </button>
                <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
                <button 
                  onClick={() => onNavigate('chat')}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-sm"
                >
                  Tiếp tục
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/20">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/20"></div>
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(selectedChat.content);
                      }}
                      className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-slate-100"
                      title="Sao chép toàn bộ"
                    >
                      <Copy size={14} />
                    </button>
                    <button 
                      onClick={() => setIsExpanded(true)}
                      className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-slate-100"
                      title="Xem mở rộng"
                    >
                      <Maximize2 size={14} />
                    </button>
                  </div>
                  <div className="markdown-body prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed">
                    <Markdown remarkPlugins={[remarkGfm]}>
                      {selectedChat.content}
                    </Markdown>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-6 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Calendar size={14} /> Thời gian
                    </h4>
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-900">{new Date(selectedChat.timestamp).toLocaleDateString('vi-VN')}</p>
                      <p className="text-[10px] text-slate-500">{new Date(selectedChat.timestamp).toLocaleTimeString('vi-VN')}</p>
                    </div>
                  </div>
                  
                  <div className="p-6 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <FileText size={14} /> Phân tích
                    </h4>
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-900">{selectedChat.content.split(/\s+/).length} từ</p>
                      <p className="text-[10px] text-slate-500">{selectedChat.content.length} ký tự</p>
                    </div>
                  </div>

                  <div className="p-6 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <AlertCircle size={14} /> Trạng thái
                    </h4>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span className="text-xs font-bold text-slate-900">Đã lưu trữ</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 pt-4">
                  <button 
                    onClick={() => handleDownloadPDF(selectedChat)}
                    disabled={isExportingPDF}
                    className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition-colors disabled:opacity-50"
                  >
                    <Download size={14} /> 
                    {isExportingPDF ? 'Đang xuất...' : 'Tải xuống PDF'}
                  </button>
                  <button 
                    onClick={() => handleShare(selectedChat)}
                    className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition-colors"
                  >
                    <Share2 size={14} /> Chia sẻ
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExpanded && selectedChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-5xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                    selectedChat.role === 'user' ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-600"
                  )}>
                    {selectedChat.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      {selectedChat.role === 'user' ? 'Tin nhắn của bạn' : 'Phản hồi từ AI'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                      {new Date(selectedChat.timestamp).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(selectedChat.content);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-indigo-100 transition-all"
                  >
                    <Copy size={14} />
                    Sao chép toàn bộ
                  </button>
                  <button 
                    onClick={() => setIsExpanded(false)}
                    className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/10">
                <div className="max-w-4xl mx-auto">
                  <div className="markdown-body prose prose-slate max-w-none text-slate-700 leading-relaxed">
                    <Markdown remarkPlugins={[remarkGfm]}>
                      {selectedChat.content}
                    </Markdown>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedChat && (
        <div className="lg:col-span-8 hidden lg:flex flex-col items-center justify-center bg-slate-50/30 rounded-3xl border border-dashed border-slate-200">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
            <MessageSquare size={32} className="text-slate-200" />
          </div>
          <h3 className="text-lg font-bold text-slate-400 uppercase tracking-widest">Chọn một hội thoại để xem chi tiết</h3>
        </div>
      )}
    </div>
  );
};
