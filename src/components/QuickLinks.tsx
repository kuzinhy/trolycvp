import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, ExternalLink, Plus, Trash2, FileText } from 'lucide-react';
import { ToastType } from './ui/Toast';

interface QuickLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
}

const DEFAULT_LINKS: QuickLink[] = [
  { id: '1', title: 'Cổng TTĐT Chính phủ', url: 'https://chinhphu.vn' },
  { id: '2', title: 'Hệ thống Quản lý Văn bản', url: '#' },
  { id: '3', title: 'Lịch công tác Tuần', url: '#' },
];

export const QuickLinks: React.FC<{ showToast: (msg: string, type?: ToastType) => void }> = ({ showToast }) => {
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('ai_assistant_quick_links');
    if (saved) {
      try {
        setLinks(JSON.parse(saved));
      } catch (e) {
        setLinks(DEFAULT_LINKS);
      }
    } else {
      setLinks(DEFAULT_LINKS);
    }
  }, []);

  const saveLinks = (newLinks: QuickLink[]) => {
    setLinks(newLinks);
    localStorage.setItem('ai_assistant_quick_links', JSON.stringify(newLinks));
  };

  const handleAdd = () => {
    if (!newTitle.trim() || !newUrl.trim()) return;
    if (editingId) {
      saveLinks(links.map(l => l.id === editingId ? { ...l, title: newTitle, url: newUrl.startsWith('http') ? newUrl : `https://${newUrl}` } : l));
      setEditingId(null);
      showToast('Đã cập nhật liên kết', 'success');
    } else {
      const newLink: QuickLink = {
        id: `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: newTitle,
        url: newUrl.startsWith('http') ? newUrl : `https://${newUrl}`
      };
      saveLinks([...links, newLink]);
      showToast('Đã thêm liên kết nhanh', 'success');
    }
    setNewTitle('');
    setNewUrl('');
    setIsAdding(false);
  };

  const handleEdit = (link: QuickLink) => {
    setEditingId(link.id);
    setNewTitle(link.title);
    setNewUrl(link.url);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    saveLinks(links.filter(l => l.id !== id));
    showToast('Đã xóa liên kết', 'info');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-200 transition-all duration-300 group"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
            <Link size={18} />
          </div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Liên kết nhanh</h3>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-indigo-600"
        >
          <Plus size={18} className={isAdding ? "rotate-45 transition-transform" : "transition-transform"} />
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
            <input 
              type="text" 
              placeholder="Tên liên kết (VD: Báo cáo tháng)" 
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            <input 
              type="text" 
              placeholder="URL (VD: docs.google.com/...)" 
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            <button 
              onClick={handleAdd}
              className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-500 transition-colors"
            >
              Thêm liên kết
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
        {links.map((link, index) => (
          <motion.div 
            key={link.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group/item flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all"
          >
            <a 
              href={link.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm group-hover/item:border-indigo-200 group-hover/item:text-indigo-600 transition-colors">
                <ExternalLink size={14} />
              </div>
              <span className="text-sm font-medium text-slate-700 truncate group-hover/item:text-indigo-700 transition-colors">
                {link.title}
              </span>
            </a>
            <button 
              onClick={() => handleEdit(link)}
              className="opacity-0 group-hover/item:opacity-100 p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
            >
              <FileText size={14} />
            </button>
            <button 
              onClick={() => handleDelete(link.id)}
              className="opacity-0 group-hover/item:opacity-100 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
            >
              <Trash2 size={14} />
            </button>
          </motion.div>
        ))}
        {links.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-4 italic">Chưa có liên kết nào.</p>
        )}
      </div>
    </motion.div>
  );
};
