import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Activity, 
  MessageSquare, 
  Database, 
  LayoutDashboard, 
  TrendingUp, 
  Settings,
  ShieldCheck,
  ChevronRight,
  Calendar,
  Download,
  Trash2,
  MoreVertical,
  ExternalLink
} from 'lucide-react';
import { useHistory, AccessLog } from '../context/HistoryContext';
import { cn } from '../lib/utils';

const ACTION_ICONS: Record<string, any> = {
  'visit': LayoutDashboard,
  'click': Activity,
  'search': Search,
  'ai_interaction': MessageSquare,
  'knowledge_add': Database,
  'settings_change': Settings,
  'auth_login': ShieldCheck,
  'auth_logout': ShieldCheck,
};

const MODULE_LABELS: Record<string, string> = {
  'dashboard': 'Bảng điều khiển',
  'chat': 'Hội thoại AI',
  'news': 'Rà quét tin tức',
  'knowledge': 'Kho kiến thức',
  'tasks': 'Nhiệm vụ',
  'utilities': 'Tiện ích',
  'settings': 'Cài đặt',
  'auth': 'Xác thực',
  'forecasting': 'Dự báo chiến lược',
  'work-log': 'Nhật ký công việc',
};

const ACTION_LABELS: Record<string, string> = {
  'visit': 'Truy cập',
  'click': 'Tương tác',
  'search': 'Tìm kiếm',
  'ai_interaction': 'Hỏi đáp AI',
  'knowledge_add': 'Thêm kiến thức',
  'settings_change': 'Thay đổi cài đặt',
  'auth_login': 'Đăng nhập',
  'auth_logout': 'Đăng xuất',
};

export const AccessHistoryModule: React.FC = () => {
  const { logs, isLoading, indexError } = useHistory();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesModule = filterModule === 'all' || log.module === filterModule;
      
      return matchesSearch && matchesModule;
    });
  }, [logs, searchTerm, filterModule]);

  const stats = useMemo(() => {
    const total = logs.length;
    const today = logs.filter(l => {
      const date = l.timestamp?.toDate ? l.timestamp.toDate() : new Date(l.timestamp);
      return date.toDateString() === new Date().toDateString();
    }).length;
    const aiInteractions = logs.filter(l => l.action === 'ai_interaction').length;
    
    return { total, today, aiInteractions };
  }, [logs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200/60 p-6 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 ring-4 ring-emerald-50">
                <History size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Lịch sử truy cập</h2>
                <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Theo dõi hoạt động hệ thống của bạn</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                <Download size={14} />
                Xuất báo cáo
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20">
                <Trash2 size={14} />
                Xóa lịch sử
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          {indexError && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 shadow-sm mb-6"
            >
              <History className="text-amber-600 shrink-0 mt-0.5" size={18} />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-amber-900 mb-1">Yêu cầu cấu hình Firestore</h3>
                <p className="text-xs text-amber-700 leading-relaxed">
                  {indexError}
                </p>
                <div className="mt-3 flex gap-3">
                  <a 
                    href="https://console.firebase.google.com/v1/r/project/trolycvp/firestore/indexes?create_composite=Ckxwcm9qZWN0cy90cm9seWN2cC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvYWNjZXNzX2xvZ3MvaW5kZXhlcy9fEAEaCgoGdXNlcklkEAEaDQoJdGltZXN0YW1wEAIaDAoIX19uYW1lX18QAg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-black uppercase tracking-widest bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    Tạo Index ngay
                  </a>
                </div>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-sm">
                <Activity size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-0.5">Tổng hoạt động</p>
                <p className="text-xl font-black text-emerald-900">{stats.total}</p>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-blue-500 text-white rounded-xl shadow-sm">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-0.5">Hôm nay</p>
                <p className="text-xl font-black text-blue-900">{stats.today}</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-amber-500 text-white rounded-xl shadow-sm">
                <MessageSquare size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-0.5">Tương tác AI</p>
                <p className="text-xl font-black text-amber-900">{stats.aiInteractions}</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Tìm kiếm trong lịch sử..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all font-semibold"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <Filter size={12} />
                Lọc theo:
              </div>
              <select 
                value={filterModule}
                onChange={(e) => setFilterModule(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all"
              >
                <option value="all">Tất cả mô-đun</option>
                {Object.entries(MODULE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <History size={32} />
              </div>
              <p className="text-sm font-bold uppercase tracking-widest">Không tìm thấy lịch sử phù hợp</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log, index) => {
                const Icon = ACTION_ICONS[log.action] || Activity;
                const timestamp = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                
                return (
                  <motion.div 
                    key={log.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedLog(log)}
                    className={cn(
                      "bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm interactive-card group cursor-pointer",
                      selectedLog?.id === log.id && "ring-2 ring-emerald-500 border-transparent shadow-emerald-500/10"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm transition-all duration-300 group-hover:scale-110",
                        log.action === 'ai_interaction' ? "bg-amber-50 text-amber-600" :
                        log.action === 'visit' ? "bg-blue-50 text-blue-600" :
                        log.action === 'knowledge_add' ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-600"
                      )}>
                        <Icon size={20} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {MODULE_LABELS[log.module] || log.module}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                              log.action === 'ai_interaction' ? "bg-amber-100 text-amber-700" :
                              log.action === 'visit' ? "bg-blue-100 text-blue-700" :
                              log.action === 'knowledge_add' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                            )}>
                              {ACTION_LABELS[log.action] || log.action}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                            <Clock size={10} />
                            {timestamp.toLocaleString('vi-VN')}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-900 truncate pr-4">
                            {log.details || `Đã thực hiện ${ACTION_LABELS[log.action]?.toLowerCase() || log.action} tại ${MODULE_LABELS[log.module] || log.module}`}
                          </p>
                          <ChevronRight size={16} className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail Sidebar */}
      <AnimatePresence>
        {selectedLog && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Chi tiết hoạt động</h3>
                <button 
                  onClick={() => setSelectedLog(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <Trash2 size={20} className="text-slate-400" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className={cn(
                    "w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg ring-8 ring-slate-50",
                    selectedLog.action === 'ai_interaction' ? "bg-amber-500 text-white shadow-amber-500/20" :
                    selectedLog.action === 'visit' ? "bg-blue-500 text-white shadow-blue-500/20" :
                    selectedLog.action === 'knowledge_add' ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-slate-900 text-white"
                  )}>
                    {React.createElement(ACTION_ICONS[selectedLog.action] || Activity, { size: 32 })}
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-900 tracking-tight">
                      {ACTION_LABELS[selectedLog.action] || selectedLog.action}
                    </h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                      {MODULE_LABELS[selectedLog.module] || selectedLog.module}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Chi tiết</p>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed">
                      {selectedLog.details || 'Không có chi tiết bổ sung cho hoạt động này.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Thời gian</p>
                      <p className="text-xs font-bold text-slate-900">
                        {selectedLog.timestamp?.toDate ? selectedLog.timestamp.toDate().toLocaleTimeString('vi-VN') : new Date(selectedLog.timestamp).toLocaleTimeString('vi-VN')}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ngày</p>
                      <p className="text-xs font-bold text-slate-900">
                        {selectedLog.timestamp?.toDate ? selectedLog.timestamp.toDate().toLocaleDateString('vi-VN') : new Date(selectedLog.timestamp).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Người thực hiện</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-xs ring-2 ring-white shadow-md">
                        {selectedLog.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{selectedLog.userName}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{selectedLog.userEmail}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 bg-slate-50/50">
                <button 
                  onClick={() => setSelectedLog(null)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
                >
                  Đóng chi tiết
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
