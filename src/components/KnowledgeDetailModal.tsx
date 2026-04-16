import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  X, 
  Tag, 
  Clock, 
  AlertCircle, 
  Calendar, 
  CheckCircle2, 
  BarChart3, 
  Edit2, 
  Trash2,
  FileText,
  Shield,
  User,
  Info,
  Copy,
  Share2,
  Maximize2,
  Minimize2,
  Download,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';

interface KnowledgeDetailModalProps {
  item: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const KnowledgeDetailModal: React.FC<KnowledgeDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onEdit,
  onDelete
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'summary'>('content');

  if (!item) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(item.content);
    toast.success('Đã sao chép nội dung vào bộ nhớ tạm');
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([item.content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${item.title}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Đã bắt đầu tải xuống tài liệu');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              width: isFullScreen ? '100%' : 'auto',
              maxWidth: isFullScreen ? '100%' : '1024px',
              height: isFullScreen ? '100%' : 'auto',
              maxHeight: isFullScreen ? '100%' : '90vh'
            }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn(
              "bg-white dark:bg-slate-900 shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col transition-all duration-500 ease-in-out",
              isFullScreen ? "rounded-none" : "rounded-[3rem]"
            )}
          >
            {/* Header */}
            <div className="p-8 bg-gradient-to-br from-indigo-600 to-blue-700 text-white relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] -mr-32 -mt-32" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                      <FileText size={28} className="text-blue-100" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="px-3 py-1 bg-white/20 rounded-full backdrop-blur-md text-[10px] font-black uppercase tracking-widest inline-block">
                          {item.category}
                        </div>
                        {item.isImportant && (
                          <div className="px-3 py-1 bg-rose-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest inline-block animate-pulse">
                            Quan trọng
                          </div>
                        )}
                      </div>
                      <h2 className="text-3xl font-black tracking-tight leading-tight">{item.title}</h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsFullScreen(!isFullScreen)}
                      className="p-3 hover:bg-white/20 rounded-2xl transition-all active:scale-90"
                      title={isFullScreen ? "Thu nhỏ" : "Toàn màn hình"}
                    >
                      {isFullScreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
                    </button>
                    <button 
                      onClick={onClose}
                      className="p-3 hover:bg-white/20 rounded-2xl transition-all active:scale-90"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
                    <Clock size={14} className="text-blue-200" />
                    <span className="text-xs font-bold uppercase tracking-wider">Ngày tạo: {item.createdAt ? new Date(item.createdAt.toMillis?.() || item.createdAt).toLocaleDateString('vi-VN') : 'N/A'}</span>
                  </div>
                  {item.deadline && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
                      <Calendar size={14} className="text-amber-300" />
                      <span className="text-xs font-bold uppercase tracking-wider">Hạn chót: {new Date(item.deadline).toLocaleDateString('vi-VN')}</span>
                    </div>
                  )}
                  <div className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-2xl backdrop-blur-sm border",
                    item.priority === 'high' ? "bg-red-500/20 border-red-500/30 text-red-100" :
                    item.priority === 'medium' ? "bg-amber-500/20 border-amber-500/30 text-amber-100" :
                    "bg-blue-500/20 border-blue-500/30 text-blue-100"
                  )}>
                    <AlertCircle size={14} />
                    <span className="text-xs font-bold uppercase tracking-wider">Ưu tiên: {item.priority === 'high' ? 'Cao' : item.priority === 'medium' ? 'Trung bình' : 'Thấp'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="px-8 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setActiveTab('content')}
                  className={cn(
                    "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                    activeTab === 'content' ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <BookOpen size={16} />
                  Nội dung
                </button>
                <button 
                  onClick={() => setActiveTab('summary')}
                  className={cn(
                    "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                    activeTab === 'summary' ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Sparkles size={16} />
                  Tóm tắt AI
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleCopy} className="p-2.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-500 transition-all" title="Sao chép">
                  <Copy size={18} />
                </button>
                <button onClick={handleDownload} className="p-2.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-500 transition-all" title="Tải xuống">
                  <Download size={18} />
                </button>
                <button className="p-2.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-500 transition-all" title="Chia sẻ">
                  <Share2 size={18} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-white dark:bg-slate-900">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Main Content Area */}
                <div className="lg:col-span-8 space-y-10">
                  {activeTab === 'content' ? (
                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="prose prose-slate dark:prose-invert max-w-none">
                        <div className="markdown-body text-lg text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {item.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </section>
                  ) : (
                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="p-8 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/30">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl">
                            <Sparkles className="text-indigo-600" size={20} />
                          </div>
                          <h3 className="text-lg font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest">Tóm tắt thông minh</h3>
                        </div>
                        <p className="text-base text-indigo-800 dark:text-indigo-300 leading-relaxed italic">
                          {item.summary || "Hệ thống đang phân tích và tạo tóm tắt cho tài liệu này. Vui lòng quay lại sau hoặc nhấn nút 'Tóm tắt AI' trong danh mục chính."}
                        </p>
                      </div>
                    </section>
                  )}

                  {item.tags && item.tags.length > 0 && (
                    <section className="pt-10 border-t border-slate-100 dark:border-slate-800">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Tag size={16} className="text-indigo-500" />
                        Thẻ phân loại liên quan
                      </h3>
                      <div className="flex flex-wrap gap-3">
                        {item.tags.map((tag: string, idx: number) => (
                          <span key={idx} className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:text-indigo-600 transition-all cursor-default">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}
                </div>

                {/* Sidebar Info */}
                <div className="lg:col-span-4 space-y-8">
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 space-y-8">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Thông tin quản trị</h4>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-3">
                          <Shield size={16} className="text-indigo-500" />
                          <span className="text-xs font-bold text-slate-500">Trạng thái</span>
                        </div>
                        <span className={cn(
                          "text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-wider",
                          item.status === 'Completed' ? "bg-emerald-100 text-emerald-700" :
                          item.status === 'In Progress' ? "bg-blue-100 text-blue-700" :
                          "bg-slate-200 text-slate-700"
                        )}>
                          {item.status === 'Completed' ? 'Hoàn thành' : item.status === 'In Progress' ? 'Đang làm' : 'Chờ xử lý'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-3">
                          <BarChart3 size={16} className="text-indigo-500" />
                          <span className="text-xs font-bold text-slate-500">Mức độ</span>
                        </div>
                        <span className={cn(
                          "text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-wider",
                          item.isImportant ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"
                        )}>
                          {item.isImportant ? 'Quan trọng' : 'Thường'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-3">
                          <User size={16} className="text-indigo-500" />
                          <span className="text-xs font-bold text-slate-500">Phạm vi</span>
                        </div>
                        <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider">
                          {item.isPublic ? 'Công khai' : 'Nội bộ'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-slate-200 dark:border-slate-700 space-y-3">
                      <Button 
                        variant="outline" 
                        onClick={onEdit}
                        className="w-full rounded-2xl py-6 font-black uppercase tracking-widest border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                      >
                        <Edit2 size={16} className="mr-2" />
                        Chỉnh sửa
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={onDelete}
                        className="w-full rounded-2xl py-6 font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                      >
                        <Trash2 size={16} className="mr-2" />
                        Xóa tài liệu
                      </Button>
                    </div>
                  </div>

                  <div className="p-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-[2.5rem] text-white shadow-xl shadow-indigo-500/20">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-white/20 rounded-xl">
                        <Info size={20} />
                      </div>
                      <h4 className="text-sm font-black uppercase tracking-widest">Trợ giúp AI</h4>
                    </div>
                    <p className="text-xs text-indigo-100 leading-relaxed font-medium">
                      Tài liệu này đã được tối ưu hóa để tìm kiếm bằng ngôn ngữ tự nhiên. Bạn có thể hỏi trợ lý ảo về bất kỳ nội dung nào trong văn bản này.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
              <Button 
                onClick={onClose}
                className="rounded-2xl px-16 py-6 font-black uppercase tracking-widest shadow-2xl shadow-indigo-600/20 bg-indigo-600 hover:bg-indigo-700 text-white transition-all active:scale-95"
              >
                Hoàn tất đọc
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
