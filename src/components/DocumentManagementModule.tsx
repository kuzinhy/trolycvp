import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileCheck, 
  User, 
  History, 
  Stamp, 
  PenTool, 
  ArrowRight,
  MoreVertical,
  Download,
  Eye,
  Trash2,
  ChevronRight,
  LayoutDashboard,
  Files,
  Activity,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { requestLocalLink, verifyPermission, listDirectoryFiles, LocalFileHandle } from '../lib/localFs';
import { HardDrive, FolderOpen, RefreshCcw, ExternalLink } from 'lucide-react';

// Types for Document Management
interface ApprovalStep {
  id: string;
  role: string;
  user: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp?: string;
  comment?: string;
}

interface Document {
  id: string;
  title: string;
  docNumber: string;
  type: 'incoming' | 'outgoing';
  category: string;
  status: 'draft' | 'reviewing' | 'approved' | 'signed' | 'archived';
  priority: 'normal' | 'high' | 'urgent';
  creator: string;
  createdAt: string;
  updatedAt: string;
  currentStep: number;
  workflow: ApprovalStep[];
  attachments: string[];
}

interface SealLog {
  id: string;
  docId: string;
  docTitle: string;
  user: string;
  timestamp: string;
  type: 'seal' | 'signature';
  purpose: string;
}

// Mock Data
const MOCK_DOCUMENTS: Document[] = [
  {
    id: 'DOC-001',
    title: 'Báo cáo sơ kết công tác Đảng quý I/2026',
    docNumber: '12-BC/ĐU',
    type: 'outgoing',
    category: 'Báo cáo',
    status: 'reviewing',
    priority: 'high',
    creator: 'Nguyễn Khánh Linh',
    createdAt: '2026-03-15T08:30:00Z',
    updatedAt: '2026-03-20T10:15:00Z',
    currentStep: 1,
    workflow: [
      { id: 's1', role: 'Chuyên viên soạn thảo', user: 'Nguyễn Khánh Linh', status: 'approved', timestamp: '2026-03-15T08:45:00Z' },
      { id: 's2', role: 'Phó Chánh Văn phòng thẩm định', user: 'Lê Thị Kiều Oanh', status: 'pending', comment: 'Đang rà soát số liệu kinh tế' },
      { id: 's3', role: 'Chánh Văn phòng phê duyệt', user: 'Nguyễn Minh Huy', status: 'pending' },
      { id: 's4', role: 'Thường trực Đảng ủy ký ban hành', user: 'Bí thư Đảng ủy', status: 'pending' }
    ],
    attachments: ['baocao_q1.pdf']
  },
  {
    id: 'DOC-002',
    title: 'Công văn v/v triển khai học tập Nghị quyết Trung ương',
    docNumber: '45-CV/ĐU',
    type: 'outgoing',
    category: 'Công văn',
    status: 'signed',
    priority: 'urgent',
    creator: 'Lê Hồng Quân',
    createdAt: '2026-03-18T14:20:00Z',
    updatedAt: '2026-03-21T09:00:00Z',
    currentStep: 4,
    workflow: [
      { id: 's1', role: 'Chuyên viên soạn thảo', user: 'Lê Hồng Quân', status: 'approved', timestamp: '2026-03-18T14:30:00Z' },
      { id: 's2', role: 'Phó Chánh Văn phòng thẩm định', user: 'Trần Quốc Bảo', status: 'approved', timestamp: '2026-03-19T10:00:00Z' },
      { id: 's3', role: 'Chánh Văn phòng phê duyệt', user: 'Nguyễn Minh Huy', status: 'approved', timestamp: '2026-03-20T15:00:00Z' },
      { id: 's4', role: 'Thường trực Đảng ủy ký ban hành', user: 'Bí thư Đảng ủy', status: 'approved', timestamp: '2026-03-21T09:00:00Z' }
    ],
    attachments: ['congvan_hoc_tap_nq.pdf', 'kehoach_kemtheo.docx']
  },
  {
    id: 'DOC-003',
    title: 'Tờ trình v/v bổ sung nhân sự Văn phòng',
    docNumber: '08-TTr/VPĐU',
    type: 'outgoing',
    category: 'Tờ trình',
    status: 'draft',
    priority: 'normal',
    creator: 'Nguyễn Minh Huy',
    createdAt: '2026-03-21T08:00:00Z',
    updatedAt: '2026-03-21T08:00:00Z',
    currentStep: 0,
    workflow: [
      { id: 's1', role: 'Người soạn thảo', user: 'Nguyễn Minh Huy', status: 'pending' },
      { id: 's2', role: 'Thường trực Đảng ủy xem xét', user: 'Bí thư Đảng ủy', status: 'pending' }
    ],
    attachments: []
  }
];

const MOCK_SEAL_LOGS: SealLog[] = [
  { id: 'L001', docId: 'DOC-002', docTitle: 'Công văn v/v triển khai học tập Nghị quyết Trung ương', user: 'Nguyễn Thị Thanh Loan', timestamp: '2026-03-21T09:15:00Z', type: 'seal', purpose: 'Đóng dấu ban hành' },
  { id: 'L002', docId: 'DOC-002', docTitle: 'Công văn v/v triển khai học tập Nghị quyết Trung ương', user: 'Bí thư Đảng ủy', timestamp: '2026-03-21T09:00:00Z', type: 'signature', purpose: 'Ký ban hành' }
];

export const DocumentManagementModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'documents' | 'logs' | 'local'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  // Local Linking State
  const [localHandle, setLocalHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [localFiles, setLocalFiles] = useState<LocalFileHandle[]>([]);
  const [isRefreshingLocal, setIsRefreshingLocal] = useState(false);

  const handleLinkLocalFolder = async () => {
    try {
      const handle = await requestLocalLink('directory') as FileSystemDirectoryHandle;
      if (handle) {
        setLocalHandle(handle);
        const files = await listDirectoryFiles(handle);
        setLocalFiles(files);
      }
    } catch (err) {
      console.error("Local link error:", err);
    }
  };

  const refreshLocalFiles = async () => {
    if (!localHandle) return;
    setIsRefreshingLocal(true);
    try {
      const hasPermission = await verifyPermission(localHandle);
      if (hasPermission) {
        const files = await listDirectoryFiles(localHandle);
        setLocalFiles(files);
      }
    } finally {
      setIsRefreshingLocal(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'reviewing':
        return { backgroundColor: '#dbeafe', color: '#1e40af' }; // Light blue (Pending)
      case 'draft':
        return { backgroundColor: '#f1f5f9', color: '#475569' }; // Slate
      case 'approved':
        return { backgroundColor: '#ffedd5', color: '#9a3412' }; // Light orange (In Progress)
      case 'signed':
        return { backgroundColor: '#d1fae5', color: '#065f46' }; // Light green (Completed)
      case 'archived':
        return { backgroundColor: '#e2e8f0', color: '#475569' }; // Slate
      default:
        return {};
    }
  };

  const filteredDocs = useMemo(() => {
    return MOCK_DOCUMENTS.filter(doc => {
      const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           doc.docNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || doc.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [searchQuery, filterType]);

  const stats = {
    total: MOCK_DOCUMENTS.length,
    pending: MOCK_DOCUMENTS.filter(d => d.status === 'reviewing').length,
    approved: MOCK_DOCUMENTS.filter(d => d.status === 'approved' || d.status === 'signed').length,
    urgent: MOCK_DOCUMENTS.filter(d => d.priority === 'urgent').length
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="text-blue-600" />
              QUẢN LÝ VĂN BẢN & ĐIỀU HÀNH
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Hệ thống trình ký số & Lưu trữ văn bản Đảng
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
              <Plus size={16} />
              Tạo văn bản mới
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1">
          {[
            { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
            { id: 'documents', label: 'Văn bản', icon: Files },
            { id: 'logs', label: 'Nhật ký', icon: Activity },
            { id: 'local', label: 'Laptop Link', icon: HardDrive }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === tab.id 
                  ? "bg-blue-50 text-blue-600 shadow-sm" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {activeTab === 'local' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 border-none">Liên kết Cục bộ (Laptop Link)</h3>
                  <p className="text-xs text-slate-500">Truy cập và đồng bộ văn bản trực tiếp từ thư mực trên máy tính cá nhân của bạn.</p>
                </div>
                {!localHandle ? (
                  <button 
                    onClick={handleLinkLocalFolder}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
                  >
                    <FolderOpen size={16} />
                    Chọn thư mục liên kết
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={refreshLocalFiles}
                      className={cn(
                        "p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm",
                        isRefreshingLocal && "animate-spin text-blue-600 border-blue-200"
                      )}
                      title="Làm mới"
                    >
                      <RefreshCcw size={18} />
                    </button>
                    <button 
                      onClick={() => setLocalHandle(null)}
                      className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm"
                      title="Hủy liên kết"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
              </div>

              {!localHandle ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <HardDrive size={32} className="text-slate-300" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-2">Chưa có liên kết cục bộ</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">Liên kết với thư mục văn bản trên laptop của bạn để truy cập nhanh mà không cần upload lên đám mây.</p>
                  <button 
                    onClick={handleLinkLocalFolder}
                    className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all"
                  >
                    Bắt đầu liên kết
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {localFiles.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-400 italic text-xs">Thư mục trống hoặc chưa được cấp quyền truy cập.</div>
                  ) : (
                    localFiles.map((file) => (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-200 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2.5 rounded-xl",
                            file.kind === 'directory' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                          )}>
                            {file.kind === 'directory' ? <FolderOpen size={18} /> : <FileText size={18} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{file.name}</h4>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-widest">
                              {file.kind === 'directory' ? 'Thư mục' : 'Tập tin'}
                            </p>
                          </div>
                          <button className="p-1.5 text-slate-300 hover:text-blue-600 transition-colors">
                            <ExternalLink size={14} />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: 'Tổng số', value: stats.total, icon: Files, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Đang trình ký', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Đã ban hành', value: stats.approved, icon: FileCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Khẩn cấp', value: stats.urgent, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={cn("p-2 rounded-xl", stat.bg, stat.color)}>
                        <stat.icon size={18} />
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                  </motion.div>
                ))}
              </div>

              {/* Recent Activity & Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Văn bản cần xử lý ngay</h3>
                    <button className="text-[10px] font-bold text-blue-600 uppercase hover:underline">Xem tất cả</button>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {MOCK_DOCUMENTS.filter(d => d.status === 'reviewing').map(doc => (
                      <div key={doc.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => setSelectedDoc(doc)}>
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                            <Clock size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{doc.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">{doc.docNumber}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-300" />
                              <span className="text-[10px] font-bold text-blue-500 uppercase">{doc.creator}</span>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Nhật ký con dấu gần đây</h3>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {MOCK_SEAL_LOGS.map(log => (
                      <div key={log.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={cn("p-2 rounded-lg", log.type === 'seal' ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600")}>
                            {log.type === 'seal' ? <Stamp size={16} /> : <PenTool size={16} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 line-clamp-1">{log.docTitle}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold text-slate-500">{log.user}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-300" />
                              <span className="text-[10px] font-bold text-slate-400">{new Date(log.timestamp).toLocaleString('vi-VN')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tiêu đề, số hiệu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <select 
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  >
                    <option value="all">Tất cả loại</option>
                    <option value="incoming">Văn bản đến</option>
                    <option value="outgoing">Văn bản đi</option>
                  </select>
                  <button className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-100 transition-all">
                    <Filter size={18} />
                  </button>
                </div>
              </div>

              {/* Document List */}
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Số hiệu / Tiêu đề</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Loại</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Người tạo</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredDocs.map(doc => (
                      <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4" style={getStatusStyle(doc.status)}>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-blue-600 uppercase mb-1">{doc.docNumber}</span>
                            <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{doc.title}</span>
                            <span className="text-[10px] text-slate-400 mt-1">{new Date(doc.createdAt).toLocaleDateString('vi-VN')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4" style={getStatusStyle(doc.status)}>
                          <span className={cn(
                            "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                            doc.type === 'incoming' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                          )}>
                            {doc.type === 'incoming' ? 'Đến' : 'Đi'}
                          </span>
                        </td>
                        <td className="px-6 py-4" style={getStatusStyle(doc.status)}>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                              {doc.creator.charAt(0)}
                            </div>
                            <span className="text-xs font-bold text-slate-600">{doc.creator}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4" style={getStatusStyle(doc.status)}>
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                            doc.status === 'draft' && "bg-slate-100 text-slate-500",
                            doc.status === 'reviewing' && "bg-amber-100 text-amber-600",
                            doc.status === 'approved' && "bg-blue-100 text-blue-600",
                            doc.status === 'signed' && "bg-emerald-100 text-emerald-600",
                            doc.status === 'archived' && "bg-slate-200 text-slate-600",
                          )}>
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              doc.status === 'draft' && "bg-slate-400",
                              doc.status === 'reviewing' && "bg-amber-500 animate-pulse",
                              doc.status === 'approved' && "bg-blue-500",
                              doc.status === 'signed' && "bg-emerald-500",
                              doc.status === 'archived' && "bg-slate-500",
                            )} />
                            {doc.status === 'draft' ? 'Bản thảo' : 
                             doc.status === 'reviewing' ? 'Đang trình' : 
                             doc.status === 'approved' ? 'Đã duyệt' : 
                             doc.status === 'signed' ? 'Đã ban hành' : 'Lưu trữ'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right" style={getStatusStyle(doc.status)}>
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setSelectedDoc(doc)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                              <Eye size={16} />
                            </button>
                            <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                              <Download size={16} />
                            </button>
                            <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời gian</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Loại tác vụ</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Văn bản</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Người thực hiện</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mục đích</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {MOCK_SEAL_LOGS.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-xs font-medium text-slate-600">
                          {new Date(log.timestamp).toLocaleString('vi-VN')}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                            log.type === 'seal' ? "bg-indigo-100 text-indigo-600" : "bg-emerald-100 text-emerald-600"
                          )}>
                            {log.type === 'seal' ? <Stamp size={12} /> : <PenTool size={12} />}
                            {log.type === 'seal' ? 'Đóng dấu' : 'Ký số'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-900">{log.docTitle}</span>
                            <span className="text-[10px] text-slate-400">{log.docId}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-700">
                          {log.user}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {log.purpose}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Side Panel for Document Detail */}
        <AnimatePresence>
          {selectedDoc && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-96 bg-white border-l border-slate-200 shadow-2xl z-20 flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Chi tiết văn bản</h3>
                <button onClick={() => setSelectedDoc(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                  <X size={18} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{selectedDoc.docNumber}</span>
                    <h2 className="text-lg font-black text-slate-900 leading-tight mt-1">{selectedDoc.title}</h2>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Loại văn bản</p>
                      <p className="text-xs font-bold text-slate-700">{selectedDoc.category}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Độ khẩn</p>
                      <p className={cn(
                        "text-xs font-bold",
                        selectedDoc.priority === 'urgent' ? "text-rose-600" : 
                        selectedDoc.priority === 'high' ? "text-amber-600" : "text-slate-700"
                      )}>
                        {selectedDoc.priority === 'urgent' ? 'Hỏa tốc' : 
                         selectedDoc.priority === 'high' ? 'Khẩn' : 'Thường'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Workflow Timeline */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <History size={14} />
                    Tiến độ trình ký
                  </h4>
                  <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                    {selectedDoc.workflow.map((step, idx) => (
                      <div key={step.id} className="relative pl-8">
                        <div className={cn(
                          "absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10",
                          step.status === 'approved' ? "bg-emerald-500 text-white" : 
                          step.status === 'rejected' ? "bg-rose-500 text-white" : "bg-slate-200 text-slate-400"
                        )}>
                          {step.status === 'approved' ? <CheckCircle2 size={12} /> : 
                           step.status === 'rejected' ? <AlertCircle size={12} /> : <Clock size={12} />}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{step.role}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{step.user}</p>
                          {step.timestamp && (
                            <p className="text-[10px] text-slate-400 mt-1">{new Date(step.timestamp).toLocaleString('vi-VN')}</p>
                          )}
                          {step.comment && (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-100 rounded-lg text-[10px] text-amber-700 italic">
                              "{step.comment}"
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Attachments */}
                {selectedDoc.attachments.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tệp đính kèm</h4>
                    <div className="space-y-2">
                      {selectedDoc.attachments.map((file, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl group hover:border-indigo-200 transition-all">
                          <div className="flex items-center gap-3">
                            <FileText size={16} className="text-slate-400 group-hover:text-indigo-500" />
                            <span className="text-xs font-bold text-slate-600 truncate max-w-[180px]">{file}</span>
                          </div>
                          <button className="p-1 text-slate-400 hover:text-indigo-600">
                            <Download size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-3">
                {selectedDoc.status === 'reviewing' && (
                  <div className="grid grid-cols-2 gap-3">
                    <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all">
                      Yêu cầu sửa
                    </button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                      Duyệt văn bản
                    </button>
                  </div>
                )}
                {selectedDoc.status === 'approved' && (
                  <button className="w-full px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2">
                    <PenTool size={16} />
                    Ký ban hành & Đóng dấu
                  </button>
                )}
                <button className="w-full px-4 py-2 bg-white border border-slate-200 text-slate-400 rounded-xl text-xs font-black uppercase tracking-widest hover:text-slate-600 hover:bg-slate-100 transition-all">
                  Xem lịch sử chi tiết
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
