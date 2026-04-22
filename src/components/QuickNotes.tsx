import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StickyNote, Plus, Trash2, Edit2, Check, X, Save, ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';
import { ToastType } from './ui/Toast';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

interface Note {
  id: string;
  content: string;
  timestamp: number;
  colorIndex?: number;
}

export const QuickNotes: React.FC<{ 
  showToast: (msg: string, type?: ToastType) => void,
  externalIsAdding?: boolean,
  setExternalIsAdding?: (val: boolean) => void
}> = ({ showToast, externalIsAdding, setExternalIsAdding }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [internalIsAdding, setInternalIsAdding] = useState(false);
  
  const isAdding = externalIsAdding !== undefined ? externalIsAdding : internalIsAdding;
  const setIsAdding = setExternalIsAdding !== undefined ? setExternalIsAdding : setInternalIsAdding;
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [selectedColorIndex, setSelectedColorIndex] = useState(0);

  const noteColors = [
    { bg: '#fef9c3', border: '#fde047', line: '#facc15', text: '#854d0e', name: 'Vàng' },
    { bg: '#dbeafe', border: '#bfdbfe', line: '#60a5fa', text: '#1e40af', name: 'Xanh dương' },
    { bg: '#dcfce7', border: '#bbf7d0', line: '#4ade80', text: '#166534', name: 'Xanh lá' },
    { bg: '#fee2e2', border: '#fecaca', line: '#f87171', text: '#991b1b', name: 'Đỏ' },
    { bg: '#f3e8ff', border: '#e9d5ff', line: '#a855f7', text: '#6b21a8', name: 'Tím' },
    { bg: '#ffedd5', border: '#fed7aa', line: '#fb923c', text: '#9a3412', name: 'Cam' },
  ];

  useEffect(() => {
    const saved = localStorage.getItem('ai_assistant_quick_notes');
    if (saved) {
      try {
        setNotes(JSON.parse(saved));
      } catch (e) {
        setNotes([]);
      }
    }
  }, []);

  const saveNotes = (newNotes: Note[]) => {
    setNotes(newNotes);
    localStorage.setItem('ai_assistant_quick_notes', JSON.stringify(newNotes));
  };

  const handleAdd = () => {
    if (!newContent.trim()) return;
    const newNote: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: newContent,
      timestamp: Date.now(),
      colorIndex: selectedColorIndex
    };
    saveNotes([newNote, ...notes]);
    setNewContent('');
    setIsAdding(false);
    showToast('Đã lưu vào sổ tay cá nhân', 'success');
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa ghi chú này?')) return;
    saveNotes(notes.filter(n => n.id !== id));
    showToast('Đã xóa ghi chú', 'info');
  };

  const handleEdit = (id: string, content: string, colorIndex?: number) => {
    setEditingId(id);
    setEditContent(content);
    if (colorIndex !== undefined) setSelectedColorIndex(colorIndex);
  };

  const handleSaveEdit = (id: string) => {
    if (!editContent.trim()) {
      handleDelete(id);
      return;
    }
    saveNotes(notes.map(n => n.id === id ? { 
      ...n, 
      content: editContent, 
      timestamp: Date.now(),
      colorIndex: selectedColorIndex 
    } : n));
    setEditingId(null);
    showToast('Đã cập nhật ghi chú', 'success');
  };


  return (
    <motion.div 
      layout
      className={cn(
        "bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-500 flex flex-col overflow-hidden",
        isCollapsed ? "h-fit" : "h-full"
      )}
    >
      <div className={cn(
        "flex items-center justify-between p-6",
        !isCollapsed && "border-b border-slate-50"
      )}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
            <StickyNote size={20} className="text-amber-500" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Ghi chú nhanh</h3>
            <p className="text-[10px] text-slate-400 font-bold">{notes.length} ghi chú</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!isCollapsed && (
            <button 
              onClick={() => setIsAdding(true)}
              className="p-2 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all active:scale-95"
              title="Thêm ghi chú"
            >
              <Plus size={18} />
            </button>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all active:scale-95"
          >
            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-1 overflow-hidden flex flex-col"
          >
            <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
              {notes.map((note, index) => {
                const color = noteColors[note.colorIndex !== undefined ? note.colorIndex : index % noteColors.length];
                return (
                  <motion.div 
                    key={note.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    style={{ 
                      backgroundColor: color.bg,
                      borderColor: color.border,
                      color: color.text,
                      backgroundImage: `linear-gradient(${color.line}20 1px, transparent 1px)`,
                      backgroundSize: '100% 1.5rem'
                    }}
                    className="group/item relative p-6 pl-10 rounded-xl border shadow-sm hover:shadow-md transition-all overflow-hidden"
                  >
                    {/* Paper Margin Line */}
                    <div 
                      className="absolute left-7 top-0 bottom-0 w-[1px]" 
                      style={{ backgroundColor: `${color.line}40` }}
                    />

                    {editingId === note.id ? (
                      <div className="space-y-4">
                        <textarea 
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          rows={3}
                          className="w-full text-sm px-4 py-3 bg-white/80 backdrop-blur-sm border border-amber-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all resize-none font-medium"
                          autoFocus
                        />
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex gap-1.5 p-1 bg-white/50 backdrop-blur-sm rounded-lg border border-white/50">
                            {noteColors.map((c, i) => (
                              <button
                                key={i}
                                onClick={() => setSelectedColorIndex(i)}
                                className={cn(
                                  "w-5 h-5 rounded-full border-2 transition-all",
                                  selectedColorIndex === i ? "border-slate-800 scale-110 shadow-sm" : "border-transparent opacity-60 hover:opacity-100"
                                )}
                                style={{ backgroundColor: c.bg, borderColor: selectedColorIndex === i ? c.line : 'transparent' }}
                                title={c.name}
                              />
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                              <X size={16} />
                            </button>
                            <button onClick={() => handleSaveEdit(note.id)} className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
                              <Check size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-slate-800 whitespace-pre-wrap leading-[1.5rem] font-medium relative z-10">{note.content}</p>
                        <div className="mt-4 flex items-center justify-between relative z-10">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            {new Date(note.timestamp).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} • {new Date(note.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div className="opacity-0 group-hover/item:opacity-100 flex items-center gap-1 transition-all translate-x-2 group-hover/item:translate-x-0">
                            <button onClick={() => handleEdit(note.id, note.content, note.colorIndex)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-white rounded-xl transition-all shadow-sm"><Edit2 size={12} /></button>
                            <button onClick={() => handleDelete(note.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-white rounded-xl transition-all shadow-sm"><Trash2 size={12} /></button>
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                );
              })}
              {notes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <StickyNote size={32} className="text-slate-200" />
                  </div>
                  <p className="text-sm text-slate-400 font-medium max-w-[180px]">Chưa có ghi chú nào. Hãy bắt đầu ghi lại ý tưởng của bạn!</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <Plus size={20} />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900">Thêm ghi chú mới</h3>
                </div>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chọn màu sắc</p>
                  <div className="flex gap-3 p-2 bg-slate-100 rounded-2xl border border-slate-200 w-fit">
                    {noteColors.map((c, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedColorIndex(i)}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center",
                          selectedColorIndex === i ? "border-slate-800 scale-110 shadow-md" : "border-transparent opacity-60 hover:opacity-100"
                        )}
                        style={{ backgroundColor: c.bg }}
                      >
                        {selectedColorIndex === i && <Check size={14} className="text-slate-800" />}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea 
                  placeholder="Nhập ghi chú nhanh của bạn tại đây..." 
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  rows={5}
                  className="w-full text-base px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all resize-none font-medium"
                  autoFocus
                />
                <Button 
                  onClick={handleAdd}
                  disabled={!newContent.trim()}
                  className="w-full rounded-2xl py-6 font-bold shadow-lg shadow-amber-200 bg-amber-500 hover:bg-amber-600"
                >
                  <Plus size={18} className="mr-2" /> Thêm vào sổ tay cá nhân
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
