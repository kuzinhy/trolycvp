import React, { memo } from 'react';
import { Search, Filter, Brain, Trash2, RefreshCw, FileText, Sparkles, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { KNOWLEDGE_CATEGORIES } from '../constants';

interface KnowledgeHeaderProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  filterCategory: string;
  onFilterChange: (val: string) => void;
  onSummarize: () => void;
  onDeleteAll: () => void;
  onSyncSecondBrain: () => void;
  onAudit: () => void;
  isSummarizing: boolean;
  isDeletingAll: boolean;
  isSyncingSecondBrain: boolean;
  isAuditing: boolean;
  totalItems: number;
}

export const KnowledgeHeader: React.FC<KnowledgeHeaderProps> = memo(({
  searchQuery,
  onSearchChange,
  filterCategory,
  onFilterChange,
  onSummarize,
  onDeleteAll,
  onSyncSecondBrain,
  onAudit,
  isSummarizing,
  isDeletingAll,
  isSyncingSecondBrain,
  isAuditing,
  totalItems
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Main Stats & Title */}
      <div className="md:col-span-2 bento-card p-6 flex flex-col justify-between bg-gradient-to-br from-white to-slate-50/50">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                Kho Tri Thức Chiến Lược
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              Hệ thống lưu trữ và quản trị tri thức nghiệp vụ tập trung, hỗ trợ tra cứu và phân tích bằng AI.
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">{totalItems}</div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tài liệu hệ thống</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-6">
          <div className="md:col-span-8 relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm kiếm tiêu đề, nội dung hoặc thẻ..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100/50 border border-border/40 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary/30 outline-none transition-all text-sm"
            />
          </div>
          
          <div className="md:col-span-4 relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Filter className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => onFilterChange(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-100/50 border border-border/40 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary/30 outline-none transition-all text-sm appearance-none cursor-pointer"
            >
              <option value="Tất cả">Tất cả danh mục</option>
              {KNOWLEDGE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bento-card p-6 flex flex-col justify-between bg-slate-900 text-white border-none">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Thao tác nhanh</h3>
          <div className="space-y-2">
            <button 
              onClick={onAudit}
              disabled={isAuditing}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-primary/20 hover:bg-primary/30 transition-all group disabled:opacity-50 border border-primary/30"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg group-hover:rotate-12 transition-transform">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-white tracking-tight">Audit & Tối ưu</p>
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest">Dọn dẹp tri thức</p>
                </div>
              </div>
              {isAuditing ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />}
            </button>

            <button 
              onClick={onSummarize}
              disabled={isSummarizing}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all group disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg group-hover:scale-110 transition-transform">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-sm font-medium">Tóm tắt AI</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            <button 
              onClick={onSyncSecondBrain}
              disabled={isSyncingSecondBrain}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all group disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg group-hover:scale-110 transition-transform">
                  <RefreshCw className={`w-4 h-4 text-blue-400 ${isSyncingSecondBrain ? 'animate-spin' : ''}`} />
                </div>
                <span className="text-sm font-medium">Đồng bộ GitHub</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        <button 
          onClick={onDeleteAll}
          disabled={isDeletingAll}
          className="mt-4 flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Xóa toàn bộ kho tri thức
        </button>
      </div>
    </div>
  );
});
