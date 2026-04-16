import React, { memo, useState } from 'react';
import { Search, Filter, Brain, Trash2, RefreshCw, FileText, Sparkles, ChevronDown, ChevronRight, Loader2, Settings, Save, X, LayoutGrid, List } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { KNOWLEDGE_CATEGORIES } from '../constants';
import { cn } from '../lib/utils';

interface KnowledgeHeaderProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  filterCategory: string;
  onFilterChange: (val: string) => void;
  onSummarize: () => void;
  onDeleteAll: () => void;
  onSyncUnified: () => Promise<void>;
  onAudit: () => void;
  isSummarizing: boolean;
  isDeletingAll: boolean;
  isSyncingUnified: boolean;
  isAuditing: boolean;
  totalItems: number;
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
}

export const KnowledgeHeader: React.FC<KnowledgeHeaderProps> = memo(({
  searchQuery,
  onSearchChange,
  filterCategory,
  onFilterChange,
  onSummarize,
  onDeleteAll,
  onSyncUnified,
  onAudit,
  isSummarizing,
  isDeletingAll,
  isSyncingUnified,
  isAuditing,
  totalItems,
  viewMode,
  onViewModeChange
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Main Stats & Title */}
      <div className="md:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 rounded-xl">
                <Brain className="w-6 h-6 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Kho Tri Thức Chiến Lược
              </h2>
            </div>
            <p className="text-sm text-slate-500 mt-2 max-w-md">
              Hệ thống lưu trữ và quản trị tri thức nghiệp vụ tập trung, hỗ trợ tra cứu và phân tích bằng AI.
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-indigo-600">{totalItems}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tài liệu hệ thống</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-8">
          <div className="md:col-span-7 relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm kiếm tiêu đề, nội dung hoặc thẻ..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none transition-all text-sm"
            />
          </div>
          
          <div className="md:col-span-3 relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Filter className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => onFilterChange(e.target.value)}
              className="w-full pl-10 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none transition-all text-sm appearance-none cursor-pointer"
            >
              <option value="Tất cả">Tất cả danh mục</option>
              {KNOWLEDGE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div className="md:col-span-2 flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => onViewModeChange('list')}
              className={cn(
                "flex-1 flex items-center justify-center p-2 rounded-lg transition-all",
                viewMode === 'list' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
              title="Xem danh sách"
            >
              <List size={18} />
            </button>
            <button 
              onClick={() => onViewModeChange('grid')}
              className={cn(
                "flex-1 flex items-center justify-center p-2 rounded-lg transition-all",
                viewMode === 'grid' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
              title="Xem lưới"
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Brain Connections & Quick Actions */}
      <div className="bg-slate-900 rounded-2xl p-6 flex flex-col justify-between text-white shadow-sm border border-slate-800">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Kết nối bộ não</h3>
            <Badge variant="outline" className="text-[10px] border-indigo-500/30 text-indigo-400 bg-indigo-500/10">
              V5.0 Active
            </Badge>
          </div>
          
          <div className="space-y-3">
            {/* Primary Brain: Firebase */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <Brain className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Bộ não Chính (Firebase)</p>
                  <p className="text-[9px] text-emerald-400 uppercase tracking-widest font-bold">Đang kết nối</p>
                </div>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {/* Unified Strategic Knowledge Harvester */}
            <div className="space-y-2">
              <button 
                onClick={onSyncUnified}
                disabled={isSyncingUnified}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 transition-all group disabled:opacity-50 border border-indigo-500/30 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 rounded-lg group-hover:scale-110 transition-transform">
                    <RefreshCw className={`w-4 h-4 text-indigo-400 ${isSyncingUnified ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-white">Nạp Bộ Não (Apps Script v6.0)</p>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest">
                      Kết nối Unified Brain API
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="pt-2 border-t border-white/10 mt-2">
              <button 
                onClick={onAudit}
                disabled={isAuditing}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 transition-all group disabled:opacity-50 border border-indigo-500/30"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 rounded-lg group-hover:rotate-12 transition-transform">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-white tracking-tight">Audit & Tối ưu</p>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest">Dọn dẹp tri thức</p>
                  </div>
                </div>
                {isAuditing ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button 
            onClick={onDeleteAll}
            disabled={isDeletingAll}
            className="flex items-center gap-2 text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3" />
            Xóa toàn bộ
          </button>
          
          <button 
            onClick={onSummarize}
            disabled={isSummarizing}
            className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3" />
            Tóm tắt AI
          </button>
        </div>
      </div>
    </div>
  );
});
