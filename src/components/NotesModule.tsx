import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Save, 
  FileText, 
  MoreVertical, 
  ChevronRight, 
  Clock, 
  Tag, 
  Sparkles,
  FileCheck,
  Zap,
  Filter,
  X,
  CheckCircle2,
  AlertCircle,
  StickyNote,
  Mic,
  MicOff,
  Wand2,
  PanelLeftClose,
  PanelLeftOpen,
  Bold,
  Italic,
  List,
  ListOrdered,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  Minimize2,
  Pin,
  PinOff,
  Copy,
  Settings,
  Palette,
  ChevronDown,
  ChevronUp,
  Layout
} from 'lucide-react';
import { useNotes, Note } from '../hooks/useNotes';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { generateContentWithRetry } from '../lib/ai-utils';

interface NotesModuleProps {
  onNavigate: (tab: string, params?: any) => void;
  showToast: (message: string, type?: any) => void;
}

export const NotesModule: React.FC<NotesModuleProps> = ({ onNavigate, showToast }) => {
  const { notes, isLoading, addNote, updateNote, deleteNote, togglePin } = useNotes();
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    fontSize: 'text-lg',
    theme: 'white',
    fontFamily: 'font-sans',
    lineHeight: 'leading-[2]'
  });
  const [currentNoteData, setCurrentNoteData] = useState({ title: '', content: '' });

  const { isListening, toggleListening } = useSpeechToText((transcript) => {
    setCurrentNoteData(prev => ({
      ...prev,
      content: prev.content + (prev.content ? ' ' : '') + transcript
    }));
    showToast('Đã ghi nhận giọng nói', 'success');
  });

  const activeNote = useMemo(() => 
    notes.find(n => n.id === activeNoteId), 
    [notes, activeNoteId]
  );

  const toggleFocusMode = () => {
    const newFocusMode = !isFocusMode;
    setIsFocusMode(newFocusMode);
    setIsSidebarCollapsed(newFocusMode);
    setIsToolbarCollapsed(newFocusMode);
    if (newFocusMode) {
      showToast('Đã bật chế độ tập trung', 'info');
    }
  };

  const handleOptimize = async () => {
    if (!currentNoteData.content) return;
    setIsOptimizing(true);
    try {
      const prompt = `Bạn là trợ lý văn phòng Đảng ủy chuyên nghiệp. Hãy tối ưu hóa ghi chú sau đây thành một đoạn văn bản mạch lạc, chuyên nghiệp nhưng vẫn giữ nguyên ý chính. Nếu ghi chú là các gạch đầu dòng, hãy sắp xếp lại cho logic.
      
      Nội dung ghi chú:
      ${currentNoteData.content}`;

      const response = await generateContentWithRetry({
        model: 'gemini-2.0-flash',
        contents: [{ parts: [{ text: prompt }] }]
      });

      if (response.text) {
        setCurrentNoteData(prev => ({ ...prev, content: response.text }));
        showToast('Đã tối ưu hóa nội dung bằng AI', 'success');
      }
    } catch (error) {
      showToast('Lỗi khi tối ưu hóa nội dung', 'error');
    } finally {
      setIsOptimizing(false);
    }
  };

  const filteredNotes = useMemo(() => {
    const filtered = notes.filter(n => 
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      n.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Sort: Pinned first, then by updatedAt
    return [...filtered].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0; // Already sorted by updatedAt in memory in useNotes hook
    });
  }, [notes, searchTerm]);

  const handleCreateNote = async () => {
    const title = 'Ghi chú mới ' + format(new Date(), 'HH:mm');
    await addNote(title, '');
    showToast('Đã tạo ghi chú mới', 'success');
  };

  const handleSave = async () => {
    if (!activeNoteId) return;
    setIsSaving(true);
    try {
      await updateNote(activeNoteId, {
        title: currentNoteData.title,
        content: currentNoteData.content
      });
      setIsSaving(false);
      setShowActionModal(true);
    } catch (error) {
      setIsSaving(false);
      showToast('Lỗi khi lưu ghi chú', 'error');
    }
  };

  const handleAction = (action: string) => {
    setShowActionModal(false);
    switch (action) {
      case 'notice-tv':
        onNavigate('drafting-pro', { 
          template: 'notice-standing-committee',
          content: activeNote?.content 
        });
        showToast('Đang chuyển sang soạn thảo Thông báo kết luận BTV', 'info');
        break;
      case 'notice-tt':
        onNavigate('drafting-pro', { 
          template: 'notice-standing-board',
          content: activeNote?.content 
        });
        showToast('Đang chuyển sang soạn thảo Thông báo kết luận Thường trực', 'info');
        break;
      case 'directive':
        onNavigate('todo-assistant', { 
          action: 'create-directive',
          content: activeNote?.content 
        });
        showToast('Đang chuyển sang tạo chủ trương thực hiện', 'info');
        break;
      case 'filter':
        showToast('Đã lọc nội dung vào ghi chú hệ thống', 'success');
        break;
      default:
        break;
    }
  };

  React.useEffect(() => {
    if (activeNote) {
      setCurrentNoteData({
        title: activeNote.title,
        content: activeNote.content
      });
    } else {
      setCurrentNoteData({ title: '', content: '' });
    }
  }, [activeNote]);

  return (
    <div className={cn(
      "flex h-full bg-slate-50/50 rounded-[2.5rem] overflow-hidden border border-slate-200/60 shadow-inner relative transition-all duration-500",
      isFullScreen && "fixed inset-4 z-[150] bg-white rounded-[3rem] shadow-2xl"
    )}>
      {/* Sidebar */}
      <motion.div 
        initial={false}
        animate={{ 
          width: isSidebarCollapsed ? 80 : 320,
          opacity: 1 
        }}
        className={cn(
          "border-r border-slate-200/60 bg-white/50 backdrop-blur-md flex flex-col overflow-hidden transition-all duration-300",
          isSidebarCollapsed && "items-center"
        )}
      >
        <div className={cn("p-6 space-y-4 w-full", isSidebarCollapsed ? "px-2" : "px-6")}>
          <div className="flex items-center justify-between">
            {!isSidebarCollapsed && <h2 className="text-xl font-black text-slate-900 tracking-tight italic">Ghi chú Elite</h2>}
            <button 
              onClick={handleCreateNote}
              className={cn(
                "bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center",
                isSidebarCollapsed ? "w-12 h-12" : "p-2"
              )}
              title="Tạo ghi chú mới"
            >
              <Plus size={isSidebarCollapsed ? 24 : 20} />
            </button>
          </div>
          {!isSidebarCollapsed ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Tìm ghi chú..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              />
            </div>
          ) : (
            <button 
              onClick={() => setIsSidebarCollapsed(false)}
              className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-all"
            >
              <Search size={20} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar w-full">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              {!isSidebarCollapsed && <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Đang tải...</p>}
            </div>
          ) : filteredNotes.length > 0 ? (
            filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setActiveNoteId(note.id);
                  }
                }}
                className={cn(
                  "w-full text-left rounded-2xl transition-all group relative overflow-hidden border cursor-pointer flex flex-col items-center",
                  activeNoteId === note.id 
                    ? "bg-white border-blue-200 shadow-xl shadow-blue-600/5" 
                    : "bg-transparent border-transparent hover:bg-white/60 hover:border-slate-200",
                  isSidebarCollapsed ? "p-3" : "p-4"
                )}
              >
                {activeNoteId === note.id && (
                  <div className="absolute left-0 top-0 w-1 h-full bg-blue-600" />
                )}
                
                {isSidebarCollapsed ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      activeNoteId === note.id ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400"
                    )}>
                      {note.isPinned ? <Pin size={18} /> : <FileText size={18} />}
                    </div>
                    {note.isPinned && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />}
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2 w-full">
                      <h3 className={cn(
                        "text-sm font-black truncate flex-1",
                        activeNoteId === note.id ? "text-blue-700" : "text-slate-700"
                      )}>
                        {note.title || 'Không có tiêu đề'}
                      </h3>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePin(note.id, !!note.isPinned);
                          }}
                          className={cn(
                            "p-1 transition-all",
                            note.isPinned ? "text-blue-600" : "text-slate-400 hover:text-blue-600"
                          )}
                        >
                          {note.isPinned ? <Pin size={14} /> : <PinOff size={14} />}
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Xóa ghi chú này?')) deleteNote(note.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed w-full">
                      {note.content || 'Chưa có nội dung...'}
                    </p>
                    <div className="flex items-center gap-2 mt-3 w-full">
                      <Clock size={10} className="text-slate-300" />
                      <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">
                        {note.updatedAt ? format(note.updatedAt.toDate(), 'dd/MM HH:mm', { locale: vi }) : 'Vừa xong'}
                      </span>
                      {note.isPinned && (
                        <div className="ml-auto flex items-center gap-1 text-blue-600">
                          <Pin size={10} />
                          <span className="text-[8px] font-black uppercase tracking-widest">Ghim</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <StickyNote size={24} className="text-slate-300" />
              </div>
              {!isSidebarCollapsed && <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Không có ghi chú</p>}
            </div>
          )}
        </div>
      </motion.div>

      {/* Editor */}
      <div className="flex-1 flex flex-col bg-white relative">
        {/* Collapse Toggle Button */}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 w-8 h-12 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 shadow-lg transition-all hover:scale-110 group"
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>

        {activeNoteId ? (
          <>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-4 flex-1 mr-4">
                {isSidebarCollapsed && (
                  <button 
                    onClick={() => setIsSidebarCollapsed(false)}
                    className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"
                  >
                    <PanelLeftOpen size={18} />
                  </button>
                )}
                <div className="flex flex-col">
                  <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Đang soạn thảo</h2>
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-blue-600" />
                    <span className="text-xs font-bold text-slate-600 truncate max-w-[200px]">{currentNoteData.title || 'Tài liệu không tên'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={toggleFocusMode}
                  className={cn(
                    "p-2.5 rounded-xl transition-all active:scale-95",
                    isFocusMode ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                  title={isFocusMode ? "Tắt chế độ tập trung" : "Bật chế độ tập trung"}
                >
                  <Zap size={18} fill={isFocusMode ? "currentColor" : "none"} />
                </button>
                <button 
                  onClick={() => setIsToolbarCollapsed(!isToolbarCollapsed)}
                  className={cn(
                    "p-2.5 rounded-xl transition-all active:scale-95",
                    isToolbarCollapsed ? "bg-slate-100 text-slate-400" : "bg-blue-50 text-blue-600"
                  )}
                  title={isToolbarCollapsed ? "Hiện thanh công cụ" : "Ẩn thanh công cụ"}
                >
                  <Layout size={18} />
                </button>
                <button 
                  onClick={toggleListening}
                  className={cn(
                    "p-2.5 rounded-xl transition-all active:scale-95",
                    isListening ? "bg-rose-100 text-rose-600 animate-pulse" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                  title={isListening ? "Đang nghe..." : "Ghi âm giọng nói"}
                >
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <button 
                  onClick={handleOptimize}
                  disabled={isOptimizing || !currentNoteData.content}
                  className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all active:scale-95 disabled:opacity-50"
                  title="Tối ưu hóa bằng AI"
                >
                  <Wand2 size={18} className={isOptimizing ? "animate-spin" : ""} />
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  Lưu & Xử lý
                </button>
                <button 
                  onClick={() => {
                    if (confirm('Xóa ghi chú này?')) {
                      deleteNote(activeNoteId);
                      setActiveNoteId(null);
                    }
                  }}
                  className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all active:scale-95"
                  title="Xóa ghi chú"
                >
                  <Trash2 size={18} />
                </button>
                {isFullScreen && (
                  <button 
                    onClick={() => setIsFullScreen(false)}
                    className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all active:scale-95"
                    title="Đóng toàn màn hình"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Professional Toolbar */}
            <AnimatePresence>
              {!isToolbarCollapsed && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-6 py-3 border-b border-slate-100 bg-white flex items-center gap-4 sticky top-[88px] z-10 shadow-sm overflow-hidden"
                >
                  <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-lg">
                    <button className="p-2 text-slate-500 hover:bg-white hover:text-blue-600 rounded-md transition-all hover:shadow-sm"><Type size={16} /></button>
                    <button className="p-2 text-slate-500 hover:bg-white hover:text-blue-600 rounded-md transition-all font-bold hover:shadow-sm"><Bold size={16} /></button>
                    <button className="p-2 text-slate-500 hover:bg-white hover:text-blue-600 rounded-md transition-all italic hover:shadow-sm"><Italic size={16} /></button>
                  </div>
                  <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-lg">
                    <button className="p-2 text-slate-500 hover:bg-white hover:text-blue-600 rounded-md transition-all hover:shadow-sm"><List size={16} /></button>
                    <button className="p-2 text-slate-500 hover:bg-white hover:text-blue-600 rounded-md transition-all hover:shadow-sm"><ListOrdered size={16} /></button>
                  </div>
                  <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-lg">
                    <button className="p-2 text-slate-500 hover:bg-white hover:text-blue-600 rounded-md transition-all hover:shadow-sm"><AlignLeft size={16} /></button>
                    <button className="p-2 text-slate-500 hover:bg-white hover:text-blue-600 rounded-md transition-all hover:shadow-sm"><AlignCenter size={16} /></button>
                    <button className="p-2 text-slate-500 hover:bg-white hover:text-blue-600 rounded-md transition-all hover:shadow-sm"><AlignRight size={16} /></button>
                  </div>
                  <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-lg ml-auto">
                    <button 
                      onClick={() => setShowSettings(!showSettings)}
                      className={cn(
                        "p-2 rounded-md transition-all hover:shadow-sm",
                        showSettings ? "bg-blue-100 text-blue-600" : "text-slate-500 hover:bg-white hover:text-blue-600"
                      )}
                      title="Tùy chỉnh giao diện"
                    >
                      <Palette size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(currentNoteData.content);
                        showToast('Đã sao chép nội dung vào bộ nhớ tạm', 'success');
                      }}
                      className="p-2 text-slate-500 hover:bg-white hover:text-blue-600 rounded-md transition-all hover:shadow-sm"
                      title="Sao chép nội dung"
                    >
                      <Copy size={16} />
                    </button>
                    <button className="p-2 text-slate-500 hover:bg-white hover:text-blue-600 rounded-md transition-all hover:shadow-sm"><Tag size={16} /></button>
                    <button 
                      onClick={() => {
                        setIsFullScreen(!isFullScreen);
                        if (!isFullScreen) setIsSidebarCollapsed(true);
                      }}
                      className={cn(
                        "p-2 rounded-md transition-all hover:shadow-sm",
                        isFullScreen ? "bg-blue-100 text-blue-600" : "text-slate-500 hover:bg-white hover:text-blue-600"
                      )}
                      title={isFullScreen ? "Thu nhỏ" : "Toàn màn hình"}
                    >
                      {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center gap-6 overflow-hidden"
                >
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cỡ chữ</span>
                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg shadow-sm">
                      {['text-sm', 'text-base', 'text-lg', 'text-xl'].map(size => (
                        <button 
                          key={size}
                          onClick={() => setSettings(prev => ({ ...prev, fontSize: size }))}
                          className={cn(
                            "px-3 py-1 rounded-md text-xs font-bold transition-all",
                            settings.fontSize === size ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"
                          )}
                        >
                          {size.split('-')[1].toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chủ đề</span>
                    <div className="flex items-center gap-2">
                      {[
                        { id: 'white', bg: 'bg-white', border: 'border-slate-200' },
                        { id: 'sepia', bg: 'bg-[#f4ecd8]', border: 'border-[#e0d5b8]' },
                        { id: 'dark', bg: 'bg-slate-900', border: 'border-slate-800' }
                      ].map(theme => (
                        <button 
                          key={theme.id}
                          onClick={() => setSettings(prev => ({ ...prev, theme: theme.id }))}
                          className={cn(
                            "w-8 h-8 rounded-full border-2 transition-all",
                            theme.bg,
                            settings.theme === theme.id ? "ring-2 ring-blue-500 ring-offset-2" : theme.border
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giãn dòng</span>
                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg shadow-sm">
                      {['leading-relaxed', 'leading-[2]', 'leading-[2.5]'].map(lh => (
                        <button 
                          key={lh}
                          onClick={() => setSettings(prev => ({ ...prev, lineHeight: lh }))}
                          className={cn(
                            "px-3 py-1 rounded-md text-xs font-bold transition-all",
                            settings.lineHeight === lh ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"
                          )}
                        >
                          {lh === 'leading-relaxed' ? '1.5' : lh.match(/\[(.*?)\]/)?.[1] || '2'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => setShowSettings(false)}
                    className="ml-auto p-2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={cn(
              "flex-1 overflow-y-auto p-4 md:p-12 flex justify-center custom-scrollbar transition-colors duration-500",
              settings.theme === 'white' && "bg-slate-200/40",
              settings.theme === 'sepia' && "bg-[#e8dfc8]",
              settings.theme === 'dark' && "bg-slate-950"
            )}>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "w-full max-w-4xl shadow-[0_20px_60px_rgba(0,0,0,0.08)] rounded-sm min-h-[110%] p-12 md:p-24 relative flex flex-col mb-12 transition-all duration-500",
                  settings.theme === 'white' && "bg-white text-slate-800",
                  settings.theme === 'sepia' && "bg-[#f4ecd8] text-[#433422]",
                  settings.theme === 'dark' && "bg-slate-900 text-slate-100"
                )}
              >
                {/* Page Decorative Elements */}
                <div className="absolute left-0 top-0 w-1 h-full bg-blue-600/5 pointer-events-none" />
                <div className="absolute left-12 top-0 w-px h-full bg-slate-100/50 pointer-events-none hidden md:block" />
                
                {/* Document Header */}
                <div className={cn(
                  "mb-12 pb-8 border-b",
                  settings.theme === 'dark' ? "border-slate-800" : "border-slate-100"
                )}>
                  <input 
                    type="text" 
                    value={currentNoteData.title}
                    onChange={(e) => setCurrentNoteData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Tiêu đề tài liệu..."
                    className={cn(
                      "w-full text-3xl font-black border-none focus:ring-0 placeholder:text-slate-200 tracking-tight italic bg-transparent",
                      settings.theme === 'dark' ? "text-white" : "text-slate-900"
                    )}
                  />
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <Clock size={12} />
                      <span>{activeNote?.updatedAt ? format(activeNote.updatedAt.toDate(), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'Mới tạo'}</span>
                    </div>
                    <div className="w-1 h-1 bg-slate-300 rounded-full" />
                    <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Bản thảo Elite</div>
                  </div>
                </div>

                <textarea 
                  value={currentNoteData.content}
                  onChange={(e) => setCurrentNoteData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Bắt đầu soạn thảo nội dung tại đây..."
                  className={cn(
                    "w-full flex-1 resize-none border-none focus:ring-0 placeholder:text-slate-200 font-medium bg-transparent selection:bg-blue-100 z-10",
                    settings.fontSize,
                    settings.lineHeight,
                    settings.theme === 'dark' ? "text-slate-100" : "text-slate-800"
                  )}
                  style={{ minHeight: '800px' }}
                />

                {/* Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none overflow-hidden">
                  <h1 className="text-[12rem] font-black -rotate-12 tracking-tighter uppercase">Elite</h1>
                </div>

                {/* Page Footer Decoration */}
                <div className="mt-12 pt-8 border-t border-slate-50 flex justify-center">
                  <div className="w-8 h-1 bg-slate-100 rounded-full" />
                </div>
                {/* Floating Action Button for Quick Actions when toolbar is collapsed */}
                <AnimatePresence>
                  {isToolbarCollapsed && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: 20 }}
                      className="fixed bottom-24 right-12 z-50 flex flex-col gap-3"
                    >
                      <button 
                        onClick={handleOptimize}
                        disabled={isOptimizing}
                        className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-indigo-700 transition-all active:scale-95 group relative"
                        title="Tối ưu AI"
                      >
                        <Wand2 size={24} className={isOptimizing ? "animate-spin" : "group-hover:rotate-12 transition-transform"} />
                        <span className="absolute right-full mr-4 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap pointer-events-none">Tối ưu AI</span>
                      </button>
                      <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-700 transition-all active:scale-95 group relative"
                        title="Lưu ghi chú"
                      >
                        {isSaving ? (
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Save size={24} className="group-hover:scale-110 transition-transform" />
                        )}
                        <span className="absolute right-full mr-4 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap pointer-events-none">Lưu & Xử lý</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
            <div className="px-8 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trang:</span>
                  <span className="text-xs font-bold text-slate-600">01 / 01</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Từ:</span>
                  <span className="text-xs font-bold text-slate-600">{currentNoteData.content.trim() ? currentNoteData.content.trim().split(/\s+/).length : 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ký tự:</span>
                  <span className="text-xs font-bold text-slate-600">{currentNoteData.content.length}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isSaving ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
                )} />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {isSaving ? "Đang lưu..." : "Đã lưu vào hệ thống"}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-64 h-80 bg-white shadow-xl rounded-sm border border-slate-100 flex flex-col p-6 relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-600/10" />
              <div className="space-y-3">
                <div className="w-3/4 h-2 bg-slate-100 rounded-full" />
                <div className="w-full h-2 bg-slate-50 rounded-full" />
                <div className="w-5/6 h-2 bg-slate-50 rounded-full" />
                <div className="w-2/3 h-2 bg-slate-50 rounded-full" />
              </div>
              <div className="mt-auto flex justify-center">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <Sparkles size={24} className="text-blue-600" />
                </div>
              </div>
            </motion.div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight italic mt-12 mb-4">Sẵn sàng cho bản thảo mới?</h3>
            <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
              Bắt đầu ghi lại nội dung cuộc họp hoặc ý tưởng của bạn. Hệ thống AI Elite sẽ giúp bạn trình bày chúng như một văn bản chuyên nghiệp.
            </p>
            <button 
              onClick={handleCreateNote}
              className="mt-8 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-blue-700 shadow-2xl shadow-blue-600/30 transition-all active:scale-95 flex items-center gap-3"
            >
              <Plus size={20} />
              Tạo bản thảo mới
            </button>
          </div>
        )}
      </div>

      {/* Action Modal */}
      <AnimatePresence>
        {showActionModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight italic">Xử lý Ghi chú</h3>
                  <p className="text-sm text-slate-500 mt-1">Chọn hành động tiếp theo cho nội dung này</p>
                </div>
                <button 
                  onClick={() => setShowActionModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="p-8 space-y-3">
                <button 
                  onClick={() => handleAction('notice-tv')}
                  className="w-full flex items-center gap-4 p-5 bg-slate-50 hover:bg-blue-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all group text-left"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <FileCheck className="text-blue-600" size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight">Thông báo kết luận BTV</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Chuyển nội dung sang mẫu thông báo Ban Thường vụ</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                </button>

                <button 
                  onClick={() => handleAction('notice-tt')}
                  className="w-full flex items-center gap-4 p-5 bg-slate-50 hover:bg-indigo-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all group text-left"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <FileText className="text-indigo-600" size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight">Thông báo kết luận Thường trực</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Chuyển nội dung sang mẫu thông báo Thường trực</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </button>

                <button 
                  onClick={() => handleAction('directive')}
                  className="w-full flex items-center gap-4 p-5 bg-slate-50 hover:bg-emerald-50 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-all group text-left"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Zap className="text-emerald-600" size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight">Cho chủ trương thực hiện</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Tạo chỉ thị hoặc nhiệm vụ thực hiện từ ghi chú</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                </button>

                <button 
                  onClick={() => handleAction('filter')}
                  className="w-full flex items-center gap-4 p-5 bg-slate-50 hover:bg-amber-50 rounded-2xl border border-slate-100 hover:border-amber-200 transition-all group text-left"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Filter className="text-amber-600" size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight">Lọc nội dung ghi chú</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Phân loại và lưu trữ các ý chính vào hệ thống</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
                </button>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-center">
                <button 
                  onClick={() => setShowActionModal(false)}
                  className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                >
                  Để sau
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
