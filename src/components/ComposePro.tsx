import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Plus, Search, History, Save, Download, Upload, Copy, Printer, 
  Sparkles, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
  List, ListOrdered, Heading1, Heading2, Table as TableIcon, Image as ImageIcon,
  Undo, Redo, Type, ChevronLeft, ChevronRight, Wand2, Trash2, FileDown, 
  CheckCircle2, AlertCircle, Loader2, MoreVertical, Clock, Languages, 
  Eraser, FileType, FileOutput, FileInput, Send, Columns
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline as UnderlineExtension } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Image } from '@tiptap/extension-image';
import { generateContentWithRetry } from '../lib/ai-utils';
import { db } from '../lib/firebase';
import { 
  collection, query, where, onSnapshot, addDoc, updateDoc, 
  doc, deleteDoc, serverTimestamp, orderBy, limit 
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { DocumentScanner } from './DocumentScanner';
import Markdown from 'react-markdown';

interface DraftingDocument {
  id: string;
  title: string;
  content: string;
  userId: string;
  unitId: string;
  lastModified: any;
  versionHistory?: { content: string; timestamp: any; label: string }[];
}

interface ComposeProProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  aiKnowledge: any[];
}

export const ComposePro: React.FC<ComposeProProps> = ({ showToast, aiKnowledge }) => {
  const { user, unitId } = useAuth();
  const [documents, setDocuments] = useState<DraftingDocument[]>([]);
  const [currentDoc, setCurrentDoc] = useState<DraftingDocument | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiFeedback, setAiFeedback] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiSidebarOpen, setAiSidebarOpen] = useState(true);
  const [activeRailTab, setActiveRailTab] = useState<'docs' | 'ai' | 'templates' | 'history'>('ai');
  const [draftingMode, setDraftingMode] = useState<'general' | 'resolution' | 'report' | 'proposal'>('general');
  const [layout, setLayout] = useState<'single' | 'split'>('single');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastSavedContent = useRef<string>('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExtension,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({ inline: true, allowBase64: true }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      // Autosave logic handled by useEffect
    },
  });

  // Fetch documents
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'drafting_documents'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DraftingDocument));
      
      // Sort in memory to avoid requiring composite indexes
      docs.sort((a, b) => {
        const timeA = a.lastModified?.toMillis ? a.lastModified.toMillis() : 0;
        const timeB = b.lastModified?.toMillis ? b.lastModified.toMillis() : 0;
        return timeB - timeA; // Descending
      });
      
      setDocuments(docs);

      // Seed sample document if empty
      if (docs.length === 0 && snapshot.metadata.fromCache === false) {
        try {
          const sampleDoc = {
            title: 'Mẫu: Báo cáo kết quả công tác Đảng quý I/2026',
            content: `
              <h1>BÁO CÁO</h1>
              <h2>Kết quả công tác Đảng quý I và phương hướng nhiệm vụ quý II năm 2026</h2>
              <p>Căn cứ chương trình công tác năm 2026 của Đảng ủy, Ban Chấp hành Đảng bộ báo cáo kết quả thực hiện nhiệm vụ quý I như sau:</p>
              <h3>I. KẾT QUẢ ĐẠT ĐƯỢC</h3>
              <p><strong>1. Công tác chính trị, tư tưởng:</strong> Đã tổ chức học tập, quán triệt đầy đủ các Nghị quyết của Trung ương và cấp trên cho 100% đảng viên.</p>
              <p><strong>2. Công tác tổ chức, cán bộ:</strong> Hoàn thành việc rà soát, bổ sung quy hoạch cán bộ nhiệm kỳ 2025-2030.</p>
              <table style="width: 100%;">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Chỉ tiêu</th>
                    <th>Kết quả</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td>Kết nạp đảng viên mới</td>
                    <td>05/10</td>
                    <td>Đạt 50% kế hoạch</td>
                  </tr>
                  <tr>
                    <td>2</td>
                    <td>Sinh hoạt chi bộ định kỳ</td>
                    <td>100%</td>
                    <td>Duy trì tốt</td>
                  </tr>
                </tbody>
              </table>
              <h3>II. PHƯƠNG HƯỚNG NHIỆM VỤ QUÝ II</h3>
              <p>Tiếp tục đẩy mạnh công tác xây dựng Đảng, tập trung vào việc nâng cao chất lượng sinh hoạt chi bộ và chuẩn bị cho Đại hội Đảng các cấp.</p>
            `,
            userId: user.uid,
            unitId: unitId || '',
            lastModified: serverTimestamp(),
            versionHistory: []
          };
          await addDoc(collection(db, 'drafting_documents'), sampleDoc);
        } catch (err) {
          console.error('Seeding error:', err);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Load document into editor
  useEffect(() => {
    if (currentDoc && editor) {
      if (editor.getHTML() !== currentDoc.content) {
        editor.commands.setContent(currentDoc.content);
        lastSavedContent.current = currentDoc.content;
      }
    } else if (!currentDoc && editor) {
      editor.commands.setContent('');
      lastSavedContent.current = '';
    }
  }, [currentDoc, editor]);

  // Autosave
  useEffect(() => {
    if (!currentDoc || !editor) return;

    const timer = setTimeout(async () => {
      const currentContent = editor.getHTML();
      if (currentContent !== lastSavedContent.current && currentContent !== '<p></p>') {
        setIsSaving(true);
        try {
          await updateDoc(doc(db, 'drafting_documents', currentDoc.id), {
            content: currentContent,
            lastModified: serverTimestamp()
          });
          lastSavedContent.current = currentContent;
        } catch (err) {
          console.error('Autosave error:', err);
        } finally {
          setIsSaving(false);
        }
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [editor?.getHTML(), currentDoc]);

  if (!editor) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">Khởi động trình soạn thảo...</p>
        </div>
      </div>
    );
  }

  const handleCreateNew = async () => {
    if (!user) return;
    try {
      const newDoc = {
        title: 'Văn bản mới',
        content: '<p>Bắt đầu soạn thảo...</p>',
        userId: user.uid,
        unitId: unitId || '',
        lastModified: serverTimestamp(),
        versionHistory: []
      };
      const docRef = await addDoc(collection(db, 'drafting_documents'), newDoc);
      setCurrentDoc({ id: docRef.id, ...newDoc } as any);
      showToast('Đã tạo văn bản mới', 'success');
    } catch (err) {
      showToast('Lỗi khi tạo văn bản', 'error');
    }
  };

  const handleDeleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Bạn có chắc muốn xóa văn bản này?')) return;
    try {
      await deleteDoc(doc(db, 'drafting_documents', id));
      if (currentDoc?.id === id) setCurrentDoc(null);
      showToast('Đã xóa văn bản', 'success');
    } catch (err) {
      showToast('Lỗi khi xóa văn bản', 'error');
    }
  };

  const handleImportDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    showToast('Tính năng nhập file .docx hiện không khả dụng.', 'warning');
  };

  const handleExportDocx = async () => {
    if (!editor) return;
    try {
      const content = editor.getHTML();
      // Simple HTML to DOC export that Word can read
      const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
      const footer = "</body></html>";
      const sourceHTML = header + content + footer;
      
      const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
      const fileDownload = document.createElement("a");
      document.body.appendChild(fileDownload);
      fileDownload.href = source;
      fileDownload.download = `${currentDoc?.title || 'VanBan'}.doc`;
      fileDownload.click();
      document.body.removeChild(fileDownload);
      
      showToast('Đã xuất file Word', 'success');
    } catch (err) {
      showToast('Lỗi khi xuất file Word', 'error');
    }
  };

  const handleExportPDF = async () => {
    showToast('Tính năng xuất PDF hiện không khả dụng.', 'warning');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    if (!editor) return;
    const text = editor.getText();
    navigator.clipboard.writeText(text);
    showToast('Đã sao chép nội dung', 'success');
  };

  const handleAIAction = async (action: string) => {
    if (!editor) return;
    const selectedText = editor.state.selection.empty 
      ? editor.getText() 
      : editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to);

    if (!selectedText.trim()) {
      showToast('Vui lòng chọn hoặc nhập văn bản để AI xử lý', 'warning');
      return;
    }

    setIsAIProcessing(true);
    try {
      let prompt = '';
      
      switch(action) {
        case 'rewrite': prompt = `Hãy viết lại đoạn văn bản sau theo phong cách hành chính chuyên nghiệp, trang trọng hơn. Chế độ soạn thảo: ${draftingMode === 'general' ? 'Chung' : draftingMode === 'resolution' ? 'Nghị quyết' : draftingMode === 'report' ? 'Báo cáo' : 'Tờ trình'}:\n\n${selectedText}`; break;
        case 'shorten': prompt = `Hãy tóm tắt và rút gọn đoạn văn bản sau mà vẫn giữ đủ ý chính:\n\n${selectedText}`; break;
        case 'expand': prompt = `Hãy mở rộng và diễn đạt chi tiết hơn đoạn văn bản sau theo văn phong Đảng và Nhà nước. Chế độ soạn thảo: ${draftingMode === 'general' ? 'Chung' : draftingMode === 'resolution' ? 'Nghị quyết' : draftingMode === 'report' ? 'Báo cáo' : 'Tờ trình'}:\n\n${selectedText}`; break;
        case 'spellcheck': prompt = `Hãy kiểm tra lỗi chính tả, ngữ pháp và chuẩn hóa các thuật ngữ hành chính trong đoạn văn bản sau. Trả về bản đã sửa:\n\n${selectedText}`; break;
        case 'standardize': prompt = `Hãy chuẩn hóa đoạn văn bản sau theo đúng thể thức văn bản hành chính (Nghị định 30/2020/NĐ-CP). Chế độ soạn thảo: ${draftingMode === 'general' ? 'Chung' : draftingMode === 'resolution' ? 'Nghị quyết' : draftingMode === 'report' ? 'Báo cáo' : 'Tờ trình'}:\n\n${selectedText}`; break;
        default: prompt = `Với vai trò là trợ lý soạn thảo văn bản chuyên nghiệp, hãy thực hiện yêu cầu sau: ${action}. Chế độ soạn thảo: ${draftingMode}. Nội dung văn bản:\n\n${selectedText}`;
      }

      const response = await generateContentWithRetry({
        model: 'gemini-3.1-pro-preview',
        contents: [{ parts: [{ text: prompt }] }]
      });

      const resultText = response.text || '';
      setAiFeedback(resultText);
      showToast('AI đã xử lý xong', 'success');
    } catch (err) {
      showToast('Lỗi khi gọi AI', 'error');
    } finally {
      setIsAIProcessing(false);
    }
  };

  const applyAIResult = () => {
    if (!editor || !aiFeedback) return;
    if (editor.state.selection.empty) {
      editor.commands.setContent(aiFeedback);
    } else {
      editor.commands.insertContent(aiFeedback);
    }
    setAiFeedback('');
  };

  const filteredDocs = documents.filter(d => 
    d.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!editor) return null;

  return (
    <div className="flex h-[calc(100vh-180px)] bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden shadow-2xl relative">
      {/* Left Rail - Navigation */}
      <div className="w-16 bg-slate-900 flex flex-col items-center py-6 gap-6 shrink-0 z-20">
        <button 
          onClick={() => { setActiveRailTab('docs'); setSidebarOpen(true); }}
          className={cn(
            "p-3 rounded-2xl transition-all",
            activeRailTab === 'docs' && sidebarOpen ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-400 hover:text-white hover:bg-white/10"
          )}
          title="Văn bản"
        >
          <FileText size={20} />
        </button>
        <button 
          onClick={() => { setActiveRailTab('ai'); setSidebarOpen(true); }}
          className={cn(
            "p-3 rounded-2xl transition-all",
            activeRailTab === 'ai' && sidebarOpen ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-400 hover:text-white hover:bg-white/10"
          )}
          title="Trợ lý AI"
        >
          <Sparkles size={20} />
        </button>
        <button 
          onClick={() => { setActiveRailTab('templates'); setSidebarOpen(true); }}
          className={cn(
            "p-3 rounded-2xl transition-all",
            activeRailTab === 'templates' && sidebarOpen ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-400 hover:text-white hover:bg-white/10"
          )}
          title="Mẫu văn bản"
        >
          <FileType size={20} />
        </button>
        <button 
          onClick={() => { setActiveRailTab('history'); setSidebarOpen(true); }}
          className={cn(
            "p-3 rounded-2xl transition-all",
            activeRailTab === 'history' && sidebarOpen ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-400 hover:text-white hover:bg-white/10"
          )}
          title="Lịch sử"
        >
          <History size={20} />
        </button>
        
        <div className="mt-auto flex flex-col gap-4">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-3 text-slate-400 hover:text-white transition-colors"
          >
            {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>
      </div>

      {/* Left Sidebar - Contextual Panel */}
      <motion.div 
        initial={false}
        animate={{ width: sidebarOpen ? 340 : 0 }}
        className="bg-white border-r border-slate-200 flex flex-col overflow-hidden relative z-10"
      >
        <div className="flex-1 flex flex-col min-w-[340px]">
          {activeRailTab === 'docs' && (
            <>
              <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Quản lý văn bản</h3>
                <button 
                  onClick={handleCreateNew}
                  className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all shadow-sm"
                  title="Tạo mới"
                >
                  <Plus size={18} />
                </button>
              </div>

              <div className="p-4 shrink-0">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Tìm kiếm văn bản..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {filteredDocs.map((doc) => (
                  <div 
                    key={doc.id}
                    onClick={() => setCurrentDoc(doc)}
                    className={cn(
                      "group p-3 rounded-2xl cursor-pointer transition-all flex items-center gap-3 border",
                      currentDoc?.id === doc.id 
                        ? "bg-indigo-50 border-indigo-100 shadow-sm" 
                        : "bg-transparent border-transparent hover:bg-slate-50"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-xl shrink-0",
                      currentDoc?.id === doc.id ? "bg-white text-indigo-600" : "bg-slate-100 text-slate-400"
                    )}>
                      <FileText size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-bold truncate",
                        currentDoc?.id === doc.id ? "text-indigo-900" : "text-slate-700"
                      )}>
                        {doc.title}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Clock size={10} />
                        {doc.lastModified?.toDate ? doc.lastModified.toDate().toLocaleString('vi-VN') : 'Vừa xong'}
                      </p>
                    </div>
                    <button 
                      onClick={(e) => handleDeleteDoc(doc.id, e)}
                      className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeRailTab === 'ai' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-indigo-600" />
                  <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Trợ lý Soạn thảo AI</h3>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Chế độ soạn thảo</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'general', label: 'Chung' },
                      { id: 'resolution', label: 'Nghị quyết' },
                      { id: 'report', label: 'Báo cáo' },
                      { id: 'proposal', label: 'Tờ trình' },
                    ].map(mode => (
                      <button 
                        key={mode.id}
                        onClick={() => setDraftingMode(mode.id as any)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border",
                          draftingMode === mode.id 
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                            : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300"
                        )}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Yêu cầu soạn thảo</p>
                  <div className="relative">
                    <textarea 
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      placeholder="Nhập yêu cầu cho AI (VD: Viết báo cáo tổng kết quý...)"
                      rows={4}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                    />
                    <button 
                      onClick={() => handleAIAction(aiInput)}
                      disabled={isAIProcessing || !aiInput.trim()}
                      className="absolute bottom-3 right-3 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/20"
                    >
                      {isAIProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Công cụ hiệu đính</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'rewrite', label: 'Viết lại', icon: <Wand2 size={18} /> },
                      { id: 'shorten', label: 'Rút gọn', icon: <ChevronLeft size={18} /> },
                      { id: 'expand', label: 'Mở rộng', icon: <ChevronRight size={18} /> },
                      { id: 'spellcheck', label: 'Chính tả', icon: <CheckCircle2 size={18} /> },
                    ].map(action => (
                      <button 
                        key={action.id}
                        onClick={() => handleAIAction(action.id)}
                        className="flex flex-col items-center gap-2 p-3 bg-white border border-slate-100 rounded-2xl hover:bg-indigo-50 hover:border-indigo-100 hover:text-indigo-600 transition-all group shadow-sm"
                      >
                        <div className="text-slate-400 group-hover:text-indigo-500">{action.icon}</div>
                        <span className="text-[11px] font-bold">{action.label}</span>
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => handleAIAction('standardize')}
                    className="w-full py-3 bg-slate-900 text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
                  >
                    <Languages size={16} /> Chuẩn hóa hành chính
                  </button>
                </div>

                <AnimatePresence>
                  {aiFeedback && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-3xl relative">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Kết quả AI</p>
                          <button onClick={() => setAiFeedback('')} className="text-slate-400 hover:text-rose-500"><Eraser size={14} /></button>
                        </div>
                        <div className="text-sm text-indigo-900 leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar prose prose-sm prose-indigo">
                          <Markdown>{aiFeedback}</Markdown>
                        </div>
                        <button 
                          onClick={applyAIResult}
                          className="w-full mt-4 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20"
                        >
                          Áp dụng vào văn bản
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {activeRailTab === 'templates' && (
            <div className="flex-1 flex flex-col">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Thư viện Mẫu</h3>
              </div>
              <div className="p-4 space-y-3">
                {[
                  { id: 'nghi_quyet', label: 'Nghị quyết', desc: 'Mẫu nghị quyết Đảng ủy' },
                  { id: 'chi_thi', label: 'Chỉ thị', desc: 'Mẫu chỉ thị công tác' },
                  { id: 'to_trinh', label: 'Tờ trình', desc: 'Mẫu tờ trình phê duyệt' },
                  { id: 'bao_cao', label: 'Báo cáo', desc: 'Mẫu báo cáo tổng kết' },
                ].map(t => (
                  <button 
                    key={t.id}
                    onClick={() => {
                      editor?.commands.setContent(`<h1>${t.label.toUpperCase()}</h1><p>Nội dung mẫu...</p>`);
                      showToast(`Đã áp dụng mẫu ${t.label}`, 'success');
                    }}
                    className="w-full text-left p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-300 hover:shadow-md transition-all group"
                  >
                    <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600">{t.label}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeRailTab === 'history' && (
            <div className="flex-1 flex flex-col">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Lịch sử phiên bản</h3>
              </div>
              <div className="p-4 overflow-y-auto custom-scrollbar">
                {!currentDoc?.versionHistory || currentDoc.versionHistory.length === 0 ? (
                  <div className="text-center py-12 opacity-30">
                    <Clock size={32} className="mx-auto mb-2" />
                    <p className="text-[10px] font-medium italic">Chưa có lịch sử phiên bản</p>
                  </div>
                ) : (
                  currentDoc.versionHistory.map((v, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        editor?.commands.setContent(v.content);
                        showToast('Đã khôi phục phiên bản!', 'success');
                      }}
                      className="w-full text-left p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer group mb-2"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-700">Phiên bản {currentDoc.versionHistory.length - idx}</span>
                        <span className="text-[10px] text-slate-400">{new Date(v.timestamp).toLocaleString('vi-VN')}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2 italic">
                        {v.content.replace(/<[^>]*>/g, '').substring(0, 50)}...
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col bg-white min-w-0">
        {/* Toolbar */}
        <div className="p-2 border-b border-slate-100 bg-white flex items-center justify-between shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5 pr-2 border-r border-slate-100">
              <button 
                onClick={() => editor?.chain().focus().undo().run()}
                className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-all"
                title="Hoàn tác"
              >
                <Undo size={16} />
              </button>
              <button 
                onClick={() => editor?.chain().focus().redo().run()}
                className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-all"
                title="Làm lại"
              >
                <Redo size={16} />
              </button>
            </div>

            <div className="flex items-center gap-0.5 px-2 border-r border-slate-100">
              <button 
                onClick={() => editor?.chain().focus().toggleBold().run()}
                className={cn("p-2 rounded-lg transition-all", editor?.isActive('bold') ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50")}
                title="In đậm"
              >
                <Bold size={16} />
              </button>
              <button 
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                className={cn("p-2 rounded-lg transition-all", editor?.isActive('italic') ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50")}
                title="In nghiêng"
              >
                <Italic size={16} />
              </button>
              <button 
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                className={cn("p-2 rounded-lg transition-all", editor?.isActive('underline') ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50")}
                title="Gạch chân"
              >
                <Underline size={16} />
              </button>
            </div>

            <div className="flex items-center gap-0.5 px-2 border-r border-slate-100">
              <button 
                onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                className={cn("p-2 rounded-lg transition-all", editor?.isActive('heading', { level: 1 }) ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50")}
                title="Tiêu đề 1"
              >
                <Heading1 size={16} />
              </button>
              <button 
                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                className={cn("p-2 rounded-lg transition-all", editor?.isActive('heading', { level: 2 }) ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50")}
                title="Tiêu đề 2"
              >
                <Heading2 size={16} />
              </button>
            </div>

            <div className="flex items-center gap-0.5 px-2 border-r border-slate-100">
              <button 
                onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                className={cn("p-2 rounded-lg transition-all", editor?.isActive({ textAlign: 'left' }) ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50")}
                title="Căn trái"
              >
                <AlignLeft size={16} />
              </button>
              <button 
                onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                className={cn("p-2 rounded-lg transition-all", editor?.isActive({ textAlign: 'center' }) ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50")}
                title="Căn giữa"
              >
                <AlignCenter size={16} />
              </button>
              <button 
                onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                className={cn("p-2 rounded-lg transition-all", editor?.isActive({ textAlign: 'right' }) ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50")}
                title="Căn phải"
              >
                <AlignRight size={16} />
              </button>
            </div>

            <div className="flex items-center gap-0.5 px-2 border-r border-slate-100">
              <button 
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                className={cn("p-2 rounded-lg transition-all", editor?.isActive('bulletList') ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50")}
                title="Danh sách"
              >
                <List size={16} />
              </button>
              <button 
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                className={cn("p-2 rounded-lg transition-all", editor?.isActive('orderedList') ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50")}
                title="Danh sách số"
              >
                <ListOrdered size={16} />
              </button>
            </div>

            <div className="flex items-center gap-0.5 px-2">
              <button 
                onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-all"
                title="Chèn bảng"
              >
                <TableIcon size={16} />
              </button>
              <button 
                onClick={() => {
                  const url = window.prompt('Nhập URL ảnh:');
                  if (url) editor.chain().focus().setImage({ src: url }).run();
                }}
                className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-all"
                title="Chèn ảnh"
              >
                <ImageIcon size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 pr-2 border-r border-slate-100">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-all"
                title="Nhập file Word"
              >
                <FileInput size={16} />
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImportDocx} accept=".docx" className="hidden" />
              <button 
                onClick={handleExportDocx}
                className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-all"
                title="Xuất file Word"
              >
                <FileOutput size={16} />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setLayout(layout === 'single' ? 'split' : 'single')}
                className={cn("p-2 rounded-lg transition-all", layout === 'split' ? "bg-indigo-100 text-indigo-600" : "text-slate-500 hover:bg-slate-50")}
                title="Chia đôi màn hình"
              >
                <Columns size={16} />
              </button>
              <button 
                onClick={handleCopy}
                className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-all"
                title="Sao chép"
              >
                <Copy size={16} />
              </button>
              <button 
                onClick={handlePrint}
                className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-all"
                title="In"
              >
                <Printer size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Editor Content */}
        <div className={cn("flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30 p-8 flex gap-4", layout === 'split' ? "flex-row" : "justify-center")}>
          <div className={cn("bg-white shadow-xl border border-slate-200 min-h-[1056px] p-[2.5cm] tiptap-editor-container relative group transition-all duration-500", layout === 'split' ? "w-1/2" : "w-full max-w-[850px]")}>
            {currentDoc ? (
              <>
                <input 
                  type="text"
                  value={currentDoc.title}
                  onChange={async (e) => {
                    const newTitle = e.target.value;
                    setCurrentDoc({ ...currentDoc, title: newTitle });
                    await updateDoc(doc(db, 'drafting_documents', currentDoc.id), { title: newTitle });
                  }}
                  className="w-full mb-8 text-3xl font-black text-slate-900 border-none focus:ring-0 p-0 placeholder:text-slate-200 text-center uppercase tracking-tight"
                  placeholder="Tiêu đề văn bản..."
                />
                <EditorContent editor={editor} className="prose prose-slate max-w-none min-h-[800px] focus:outline-none" />
                
                {isSaving && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 text-[10px] font-bold text-indigo-500 uppercase tracking-widest bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full border border-indigo-100 shadow-sm">
                    <Loader2 size={10} className="animate-spin" />
                    Đang lưu...
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-6">
                <FileText size={80} strokeWidth={1} />
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-400">Chọn một văn bản hoặc tạo mới</p>
                  <p className="text-sm">Bắt đầu soạn thảo chuyên nghiệp với trợ lý AI</p>
                </div>
                <button 
                  onClick={handleCreateNew}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                >
                  <Plus size={18} /> Tạo văn bản mới
                </button>
              </div>
            )}
          </div>
          {layout === 'split' && (
            <div className="w-1/2 bg-white shadow-xl border border-slate-200 min-h-[1056px] p-[2.5cm] relative group">
              <DocumentScanner />
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - AI Assistant (Removed as it's now on the left) */}

      {/* Global CSS for Tiptap */}
      <style>{`
        .tiptap-editor-container .ProseMirror {
          min-height: 800px;
          outline: none;
        }
        .tiptap-editor-container .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        .tiptap-editor-container table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 0;
          overflow: hidden;
        }
        .tiptap-editor-container table td,
        .tiptap-editor-container table th {
          min-width: 1em;
          border: 2px solid #ced4da;
          padding: 3px 5px;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
        }
        .tiptap-editor-container table th {
          font-weight: bold;
          text-align: left;
          background-color: #f8f9fa;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          .tiptap-editor-container, .tiptap-editor-container * {
            visibility: visible;
          }
          .tiptap-editor-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};
