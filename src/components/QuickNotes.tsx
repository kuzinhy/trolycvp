import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StickyNote, Plus, Trash2, Edit2, Check } from 'lucide-react';
import { ToastType } from './ui/Toast';

interface Note {
  id: string;
  content: string;
  timestamp: number;
}

export const QuickNotes: React.FC<{ showToast: (msg: string, type?: ToastType) => void }> = ({ showToast }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

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
      timestamp: Date.now()
    };
    saveNotes([newNote, ...notes]);
    setNewContent('');
    setIsAdding(false);
    showToast('Đã lưu ghi chú', 'success');
  };

  const handleDelete = (id: string) => {
    saveNotes(notes.filter(n => n.id !== id));
    showToast('Đã xóa ghi chú', 'info');
  };

  const handleEdit = (id: string, content: string) => {
    setEditingId(id);
    setEditContent(content);
  };

  const handleSaveEdit = (id: string) => {
    if (!editContent.trim()) {
      handleDelete(id);
      return;
    }
    saveNotes(notes.map(n => n.id === id ? { ...n, content: editContent, timestamp: Date.now() } : n));
    setEditingId(null);
    showToast('Đã cập nhật ghi chú', 'success');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-amber-200 transition-all duration-300 group h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <StickyNote size={16} className="text-amber-500" /> Sổ tay nhanh
        </h3>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors text-slate-400 hover:text-amber-600"
        >
          <Plus size={16} className={isAdding ? "rotate-45 transition-transform" : "transition-transform"} />
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 space-y-3 overflow-hidden"
          >
            <textarea 
              placeholder="Nhập ghi chú nhanh..." 
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              rows={3}
              className="w-full text-sm px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
            />
            <button 
              onClick={handleAdd}
              className="w-full py-2 bg-amber-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-amber-600 transition-colors"
            >
              Lưu ghi chú
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {notes.map((note, index) => (
          <motion.div 
            key={note.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="group/item relative p-4 rounded-xl bg-amber-50/30 border border-amber-100 hover:border-amber-300 hover:shadow-sm transition-all"
          >
            {editingId === note.id ? (
              <div className="space-y-2">
                <textarea 
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={3}
                  className="w-full text-sm px-3 py-2 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditingId(null)} className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1">Hủy</button>
                  <button onClick={() => handleSaveEdit(note.id)} className="text-xs font-bold text-amber-600 hover:text-amber-700 px-2 py-1 bg-amber-100 rounded-md">Lưu</button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                    {new Date(note.timestamp).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="opacity-0 group-hover/item:opacity-100 flex items-center gap-1 transition-opacity">
                    <button onClick={() => handleEdit(note.id, note.content)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-100 rounded-md transition-colors"><Edit2 size={12} /></button>
                    <button onClick={() => handleDelete(note.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors"><Trash2 size={12} /></button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        ))}
        {notes.length === 0 && (
          <div className="text-center py-8">
            <StickyNote size={32} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm text-slate-500 italic">Sổ tay trống. Thêm ghi chú nhanh để không quên việc.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
