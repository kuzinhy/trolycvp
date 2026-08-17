import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Keyboard, Command, ChevronRight, HelpCircle, ArrowRight, BookOpen, MessageSquare, Settings } from 'lucide-react';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({ isOpen, onClose }) => {
  const shortcutGroups = [
    {
      title: "Hệ thống & Chỉ huy nhanh",
      items: [
        { keys: ["Ctrl", "K"], desc: "Mở Bảng chỉ huy chiến lược (Command Center)" },
        { keys: ["Ctrl", "B"], desc: "Thu gọn / Mở rộng Sidebar điều hướng" },
        { keys: ["Ctrl", "Shift", "H"], desc: "Hiển thị hướng dẫn phím tắt này" },
        { keys: ["Esc"], desc: "Đóng nhanh các cửa sổ / hộp thoại đang hoạt động" }
      ]
    },
    {
      title: "Chuyển nhanh các Phân hệ",
      items: [
        { keys: ["Ctrl", "Alt", "D"], desc: "Đến Bảng điều khiển Tổng quan (Dashboard)" },
        { keys: ["Ctrl", "Alt", "K"], desc: "Đến Kho tri thức & Quy định (Knowledge Core)" },
        { keys: ["Ctrl", "Alt", "L"], desc: "Đến Lịch công tác & Sự kiện Đảng uỷ (Calendar)" },
        { keys: ["Ctrl", "Alt", "T"], desc: "Đến Danh sách Nhiệm vụ & Chỉ đạo (Tasks)" }
      ]
    },
    {
      title: "Tiện ích & Liên lạc",
      items: [
        { keys: ["Ctrl", "Shift", "C"], desc: "Mở/đóng nhanh Kênh liên lạc nội bộ (Team Chat)" },
        { keys: ["Ctrl", "Shift", "S"], desc: "Mở Thiết lập & Cấu hình tài khoản (Settings)" }
      ]
    }
  ];

  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Overlay background blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-2xl bg-white border border-slate-200/80 rounded-3xl shadow-2xl shadow-slate-900/10 overflow-hidden flex flex-col z-10"
          >
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                  <Keyboard size={20} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                    Sơ đồ phím tắt điều hành nhanh
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tối ưu hiệu suất làm việc cho Đồng chí Chánh Văn phòng Đảng ủy
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-200/60 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
                title="Đóng (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content body */}
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
              {shortcutGroups.map((group, groupIdx) => (
                <div key={groupIdx} className="space-y-3">
                  <h4 className="text-xs font-extrabold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {group.title}
                  </h4>
                  <div className="grid gap-2">
                    {group.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="flex items-center justify-between p-3 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all duration-200 group"
                      >
                        <span className="text-xs text-slate-600 font-medium group-hover:text-slate-800 transition-colors pr-4">
                          {item.desc}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {item.keys.map((key, keyIdx) => {
                            // Translate Ctrl/Alt/Shift for MacOS if needed
                            let displayKey = key;
                            if (isMac) {
                              if (key === 'Ctrl') displayKey = '⌘';
                              if (key === 'Alt') displayKey = '⌥';
                              if (key === 'Shift') displayKey = '⇧';
                            }
                            return (
                              <React.Fragment key={keyIdx}>
                                {keyIdx > 0 && <span className="text-slate-300 text-[10px] mx-0.5 font-bold">+</span>}
                                <kbd className="px-2 py-1 bg-white text-[11px] font-bold text-slate-700 border border-slate-200 rounded-lg shadow-sm font-mono min-w-[20px] text-center uppercase tracking-tight">
                                  {displayKey}
                                </kbd>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="bg-slate-50/80 border-t border-slate-100 px-6 py-4 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5 text-slate-400">
                <HelpCircle size={14} />
                <span>Nhấn <kbd className="px-1 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono">Ctrl+Shift+H</kbd> bất kỳ lúc nào để mở bảng này.</span>
              </div>
              <button 
                onClick={onClose}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-sm shadow-blue-500/10 active:scale-95"
              >
                Đồng ý
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
