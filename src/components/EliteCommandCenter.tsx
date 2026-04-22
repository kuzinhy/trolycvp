import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Terminal, 
  Command as CommandIcon, 
  Sparkles, 
  Calendar, 
  CheckCircle, 
  Book, 
  X, 
  ChevronRight, 
  Clock, 
  FilePlus, 
  MessageSquare,
  TrendingUp,
  Settings,
  ShieldCheck,
  Zap,
  LayoutGrid
} from 'lucide-react';
import { cn } from '../lib/utils';

interface EliteCommandCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: any) => void;
  aiKnowledge?: any[];
  tasks?: any[];
}

export const EliteCommandCenter: React.FC<EliteCommandCenterProps> = ({ 
  isOpen, 
  onClose, 
  onNavigate,
  aiKnowledge = [],
  tasks = []
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const commandGroups = [
    {
      title: "Hành động nhanh",
      items: [
        { id: 'chat', label: 'Bắt đầu hội thoại AI', icon: <MessageSquare size={16} />, tab: 'chat' },
        { id: 'task', label: 'Quản lý nhiệm vụ', icon: <CheckCircle size={16} />, tab: 'tasks' },
        { id: 'calendar', label: 'Lịch công tác tuần', icon: <Calendar size={16} />, tab: 'calendar' },
        { id: 'knowledge', label: 'Tra cứu tri thức/Văn bản', icon: <Book size={16} />, tab: 'knowledge' },
        { id: 'utilities', label: 'Tiện ích Trợ lý (AI Apps)', icon: <Zap size={16} />, tab: 'utilities' },
      ]
    },
    {
      title: "Phân tích & Chiến lược",
      items: [
        { id: 'forecast', label: 'Dự báo chiến lược', icon: <TrendingUp size={16} />, tab: 'forecasting' },
        { id: 'reporting', label: 'Báo cáo thông minh', icon: <LayoutGrid size={16} />, tab: 'reporting' },
        { id: 'drafting', label: 'Soạn thảo văn bản Elite', icon: <FilePlus size={16} />, tab: 'drafting-pro' },
      ]
    },
    {
      title: "Hệ thống",
      items: [
        { id: 'user', label: 'Quản lý quân số', icon: <ShieldCheck size={16} />, tab: 'users' },
        { id: 'settings', label: 'Cài đặt hệ thống', icon: <Settings size={16} />, action: 'settings' },
      ]
    }
  ];

  // Simple search filtering
  const filteredGroups = query ? commandGroups.map(group => ({
    ...group,
    items: group.items.filter(item => 
      item.label.toLowerCase().includes(query.toLowerCase())
    )
  })).filter(group => group.items.length > 0) : commandGroups;

  const allItems = filteredGroups.flatMap(g => g.items);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex(prev => (prev + 1) % allItems.length);
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(prev => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === 'Enter') {
      const selected = allItems[selectedIndex];
      if (selected) handleAction(selected);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleAction = (item: any) => {
    if (item.tab) {
      onNavigate(item.tab);
    }
    // Handle other actions if needed
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] transition-all"
          />
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[101] pointer-events-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-2xl bg-white border border-slate-200/60 shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col pointer-events-auto"
              onKeyDown={handleKeyDown}
            >
              <div className="flex items-center gap-4 px-8 py-6 border-b border-slate-100 bg-slate-50/50 backdrop-blur-xl">
                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 p-1.5 border border-slate-100">
                  <img 
                    src="https://i.imgur.com/S9tvwYs.png" 
                    alt="Elite Logo" 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <input 
                  ref={inputRef}
                  type="text"
                  placeholder="Tôi có thể hỗ trợ gì cho đồng chí? (Gõ '/' để thực hiện lệnh...)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none text-lg font-bold text-slate-800 focus:outline-none placeholder:text-slate-400 placeholder:font-medium"
                />
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md text-[10px] font-black text-slate-500 uppercase">ESC</kbd>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[450px] p-6 custom-scrollbar">
                {filteredGroups.length > 0 ? (
                  filteredGroups.map((group, gIdx) => (
                    <div key={group.title} className="mb-8 last:mb-2">
                      <h4 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{group.title}</h4>
                      <div className="space-y-1">
                        {group.items.map((item, iIdx) => {
                          // Calculate global index
                          let globalIndex = 0;
                          for(let j=0; j<gIdx; j++) globalIndex += filteredGroups[j].items.length;
                          globalIndex += iIdx;
                          
                          const isActive = globalIndex === selectedIndex;

                          return (
                            <button
                              key={item.id}
                              onClick={() => handleAction(item)}
                              onMouseEnter={() => setSelectedIndex(globalIndex)}
                              className={cn(
                                "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 group",
                                isActive 
                                  ? "bg-indigo-600 text-white shadow-xl shadow-indigo-200 translate-x-1" 
                                  : "hover:bg-slate-50 text-slate-600"
                              )}
                            >
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "p-2 rounded-xl transition-colors",
                                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-white border border-transparent group-hover:border-slate-100 shadow-sm"
                                )}>
                                  {item.icon}
                                </div>
                                <span className={cn("text-sm font-black tracking-tight", isActive ? "text-white" : "text-slate-700 font-bold")}>
                                  {item.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {isActive && (
                                  <motion.div 
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-white/60"
                                  >
                                    <ChevronRight size={16} />
                                  </motion.div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <Target size={32} className="text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Không tìm thấy lệnh hoặc dữ liệu phù hợp</p>
                  </div>
                )}
              </div>

              <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-1 bg-white border border-slate-200 rounded text-[9px] font-black text-slate-500">↑↓</kbd>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Di chuyển</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-1 bg-white border border-slate-200 rounded text-[9px] font-black text-slate-500">Enter</kbd>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Chọn</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-indigo-600 font-black italic text-[10px] uppercase tracking-widest">
                  <Sparkles size={12} />
                  Elite Command Center
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

const Target = ({ size, className }: { size: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);
