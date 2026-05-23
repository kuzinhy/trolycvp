import React from 'react';
import { motion } from 'motion/react';
import { useHistory } from '../context/HistoryContext';
import { History, Clock, FileText, Search, PlusCircle, Trash, RefreshCw } from 'lucide-react';

export const SystemHistoryModule: React.FC = () => {
  const { logs, isLoading, indexError } = useHistory();

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'visit': return <Search className="w-4 h-4 text-blue-500" />;
      case 'create': return <PlusCircle className="w-4 h-4 text-emerald-500" />;
      case 'delete': return <Trash className="w-4 h-4 text-rose-500" />;
      case 'update': return <RefreshCw className="w-4 h-4 text-amber-500" />;
      default: return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'visit': return 'Truy cập';
      case 'click': return 'Nhấn';
      case 'search': return 'Tìm kiếm';
      case 'ai_interaction': return 'Tương tác AI';
      case 'create': return 'Tạo mới';
      case 'update': return 'Cập nhật';
      case 'delete': return 'Xóa';
      default: return action;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100/50 rounded-xl text-blue-600">
            <History size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Lịch sử hệ thống</h2>
            <p className="text-xs text-slate-500 mt-0.5">Lưu vết các thao tác và truy cập gần đây (Dữ liệu 100 mục gần nhất)</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/20">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : indexError ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-3">
              <History size={24} />
            </div>
            <p className="text-sm font-medium text-slate-900">Chưa cấu hình Index dữ liệu</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">{indexError}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500">
            <History size={32} className="mb-3 text-slate-300" />
            <p className="text-sm font-medium">Chưa có dữ liệu lịch sử</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log, index) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={log.id}
                className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:border-blue-100 hover:shadow-md transition-all duration-200"
              >
                <div className="mt-1 p-2 bg-slate-50 rounded-lg">
                  {getActionIcon(log.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {getActionLabel(log.action)} <span className="text-slate-400 font-medium">({log.module})</span>
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
                      <Clock size={12} />
                      {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString('vi-VN') : 'Không rõ thời gian'}
                    </div>
                  </div>
                  {log.details && (
                    <p className="text-sm text-slate-600 mt-1.5 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                      {log.details}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
