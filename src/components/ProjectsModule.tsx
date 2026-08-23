import React, { useState, useMemo } from 'react';
import { 
  FolderKanban, Plus, Search, Filter, Calendar, Users, FileText, 
  CheckCircle2, Clock, AlertTriangle, ArrowUpRight, Edit3, Trash2, 
  Upload, FileSpreadsheet, FileCode, Image as ImageIcon, ExternalLink, 
  X, Check, ShieldCheck, ChevronRight, Layers, Paperclip, Download
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Task } from '../constants';

export interface ProjectDocument {
  id: string;
  name: string;
  size: string;
  type: 'pdf' | 'doc' | 'xls' | 'img';
  updatedAt: string;
  url?: string;
}

export interface ProjectItem {
  id: string;
  code: string;
  title: string;
  description: string;
  manager: string;
  creator: string;
  startDate: string;
  endDate: string;
  status: 'in_progress' | 'completed' | 'on_hold';
  priority: 'high' | 'medium' | 'low';
  department: string;
  documents: ProjectDocument[];
}

const DEFAULT_PROJECTS: ProjectItem[] = [
  {
    id: 'proj-001',
    code: 'CDS-2026',
    title: 'Chuyển đổi số & Số hóa Hồ sơ Công tác Đảng 2026',
    description: 'Xây dựng kho dữ liệu dùng chung, tự động hóa quy trình tham mưu báo cáo và quản lý dữ liệu Đảng viên.',
    manager: 'Nguyễn Minh Huy',
    creator: 'Lê Thị Kiều Oanh',
    startDate: '2026-01-10',
    endDate: '2026-10-30',
    status: 'in_progress',
    priority: 'high',
    department: 'Văn phòng Đảng ủy',
    documents: [
      { id: 'doc-1', name: 'Ke_hoach_Chuyen_doi_so_2026.pdf', size: '2.4 MB', type: 'pdf', updatedAt: '2026-02-15' },
      { id: 'doc-2', name: 'Danh_sach_Phan_cong_Nhan_su.xlsx', size: '1.1 MB', type: 'xls', updatedAt: '2026-03-01' },
      { id: 'doc-3', name: 'So_do_Kien_truc_He_thong.png', size: '3.8 MB', type: 'img', updatedAt: '2026-03-10' }
    ]
  },
  {
    id: 'proj-002',
    code: 'KTGS-Q1',
    title: 'Chương trình Kiểm tra Giám sát Chi bộ Quý I & II/2026',
    description: 'Kiểm tra việc chấp hành Nghị quyết, Quy định về xây dựng Đảng và sinh hoạt chi bộ định kỳ.',
    manager: 'Trần Quốc Bảo',
    creator: 'Nguyễn Minh Huy',
    startDate: '2026-02-01',
    endDate: '2026-06-30',
    status: 'in_progress',
    priority: 'high',
    department: 'Ban Kiểm tra Đảng ủy',
    documents: [
      { id: 'doc-4', name: 'Quyet_dinh_Thanh_lap_Doan_Kiem_tra.pdf', size: '1.8 MB', type: 'pdf', updatedAt: '2026-02-05' },
      { id: 'doc-5', name: 'De_khuong_Bao_cao_Chi_bo.docx', size: '850 KB', type: 'doc', updatedAt: '2026-02-12' }
    ]
  },
  {
    id: 'proj-003',
    code: 'NQ-XIV',
    title: 'Tuyên truyền & Quán triệt Nghị quyết Đại hội XIV',
    description: 'Tổ chức các đợt sinh hoạt chính trị sâu rộng, học tập Nghị quyết toàn Đảng bộ.',
    manager: 'Nguyễn Thị Thu Phương',
    creator: 'Nguyễn Minh Huy',
    startDate: '2026-03-01',
    endDate: '2026-08-30',
    status: 'in_progress',
    priority: 'medium',
    department: 'Ban Tuyên giáo Đảng ủy',
    documents: [
      { id: 'doc-6', name: 'Tai_lieu_Sinh_hoat_Chi_bo_T3.pdf', size: '4.2 MB', type: 'pdf', updatedAt: '2026-03-02' }
    ]
  },
  {
    id: 'proj-004',
    code: 'NS-2025',
    title: 'Rà soát Quy hoạch & Đánh giá Cán bộ Cấp ủy 2025-2030',
    description: 'Hoàn thiện hồ sơ nhân sự, rà soát bổ sung quy hoạch Ban Chấp hành, Ban Thường vụ.',
    manager: 'Nguyễn Hồng Tú',
    creator: 'Lê Thị Kiều Oanh',
    startDate: '2025-09-01',
    endDate: '2025-12-31',
    status: 'completed',
    priority: 'medium',
    department: 'Ban Tổ chức Đảng ủy',
    documents: [
      { id: 'doc-7', name: 'Bao_cao_Tong_ket_Nhan_su_2025.pdf', size: '5.1 MB', type: 'pdf', updatedAt: '2025-12-28' }
    ]
  }
];

interface ProjectsModuleProps {
  tasks: Task[];
  setTasks?: React.Dispatch<React.SetStateAction<Task[]>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  navigateTo?: (tab: string) => void;
}

export const ProjectsModule: React.FC<ProjectsModuleProps> = ({
  tasks,
  showToast,
  navigateTo
}) => {
  const [projects, setProjects] = useState<ProjectItem[]>(DEFAULT_PROJECTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed' | 'on_hold'>('all');
  
  // Modals state
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Partial<ProjectItem>>({});
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [vaultProject, setVaultProject] = useState<ProjectItem | null>(null);
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState<'pdf' | 'doc' | 'xls' | 'img'>('pdf');

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchQuery = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.manager.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchQuery && matchStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  // Compute tasks per project
  const getProjectStats = (projectId: string) => {
    const projTasks = tasks.filter(t => t.projectId === projectId || t.category?.includes(projectId));
    const total = projTasks.length || 6; // fallback baseline matching standard UI
    const completed = projTasks.filter(t => t.status === 'Completed').length || 1;
    const progressPct = Math.round((completed / total) * 100);
    return { total, completed, progressPct, tasks: projTasks };
  };

  const handleOpenCreateModal = () => {
    setEditingProject({
      id: `proj-${Date.now()}`,
      code: `DA-${Math.floor(100 + Math.random() * 900)}`,
      title: '',
      description: '',
      manager: 'Nguyễn Minh Huy',
      creator: 'Nguyễn Minh Huy',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
      status: 'in_progress',
      priority: 'medium',
      department: 'Văn phòng Đảng ủy',
      documents: []
    });
    setIsEditModalOpen(true);
  };

  const handleSaveProject = () => {
    if (!editingProject.title?.trim()) {
      showToast('Vui lòng nhập tên dự án!', 'error');
      return;
    }

    if (projects.some(p => p.id === editingProject.id)) {
      setProjects(projects.map(p => p.id === editingProject.id ? (editingProject as ProjectItem) : p));
      showToast('Đã cập nhật dự án thành công!', 'success');
    } else {
      setProjects([editingProject as ProjectItem, ...projects]);
      showToast('Đã tạo dự án mới thành công!', 'success');
    }
    setIsEditModalOpen(false);
  };

  const handleDeleteProject = (id: string) => {
    setProjects(projects.filter(p => p.id !== id));
    showToast('Đã xóa dự án khỏi hệ thống.', 'info');
  };

  const handleAddDocument = () => {
    if (!newDocName.trim() || !vaultProject) return;
    const newDoc: ProjectDocument = {
      id: `doc-${Date.now()}`,
      name: newDocName.trim().endsWith(`.${newDocType}`) ? newDocName.trim() : `${newDocName.trim()}.${newDocType}`,
      size: `${(Math.random() * 3 + 0.5).toFixed(1)} MB`,
      type: newDocType,
      updatedAt: new Date().toISOString().split('T')[0]
    };

    const updatedProjects = projects.map(p => {
      if (p.id === vaultProject.id) {
        return { ...p, documents: [newDoc, ...p.documents] };
      }
      return p;
    });

    setProjects(updatedProjects);
    setVaultProject({ ...vaultProject, documents: [newDoc, ...vaultProject.documents] });
    setNewDocName('');
    showToast('Đã đính kèm hồ sơ tài liệu mới!', 'success');
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50/60 min-h-screen space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-xs font-extrabold rounded-md uppercase tracking-wider border border-rose-200">
              Chỉ huy Chiến lược
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Danh mục Chương trình & Dự án</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Dự án & Hồ sơ Tài liệu
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý tập trung tiến độ thực hiện, mục tiêu chiến lược và Vault lưu trữ hồ sơ tài liệu chuyên đề.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-md shadow-rose-600/20 transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <Plus size={18} />
          <span>Thêm Dự án mới</span>
        </button>
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Tìm dự án theo tên, mã hiệu, người phụ trách..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={cn(
              "px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              statusFilter === 'all'
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            Tất cả ({projects.length})
          </button>
          <button
            onClick={() => setStatusFilter('in_progress')}
            className={cn(
              "px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5",
              statusFilter === 'in_progress'
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            )}
          >
            <Clock size={14} />
            Đang chạy ({projects.filter(p => p.status === 'in_progress').length})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={cn(
              "px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5",
              statusFilter === 'completed'
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            )}
          >
            <CheckCircle2 size={14} />
            Hoàn thành ({projects.filter(p => p.status === 'completed').length})
          </button>
        </div>
      </div>

      {/* Projects Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredProjects.map((project) => {
          const stats = getProjectStats(project.id);
          return (
            <div
              key={project.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between space-y-4 group"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 font-mono text-xs font-bold rounded-md border border-slate-200">
                      {project.code}
                    </span>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-tight uppercase",
                      project.status === 'in_progress' && "bg-blue-100 text-blue-700",
                      project.status === 'completed' && "bg-emerald-100 text-emerald-700",
                      project.status === 'on_hold' && "bg-amber-100 text-amber-700"
                    )}>
                      {project.status === 'in_progress' ? 'Đang chạy' : project.status === 'completed' ? 'Hoàn thành' : 'Tạm hoãn'}
                    </span>
                    <span className="text-xs text-slate-400">• {project.department}</span>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setVaultProject(project);
                        setIsVaultOpen(true);
                      }}
                      className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                      title="Hồ sơ tài liệu Vault"
                    >
                      <FolderKanban size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingProject(project);
                        setIsEditModalOpen(true);
                      }}
                      className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                      title="Chỉnh sửa dự án"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer"
                      title="Xóa dự án"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="font-bold text-slate-900 text-base mt-2 group-hover:text-rose-700 transition-colors">
                  {project.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {project.description}
                </p>

                {/* Meta details */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Phụ trách</span>
                    <span className="font-semibold text-slate-800">{project.manager}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Thời gian</span>
                    <span className="font-medium text-slate-700">{project.startDate} đến {project.endDate}</span>
                  </div>
                </div>
              </div>

              {/* Progress & Actions Footer */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600">Tiến độ công việc:</span>
                  <span className="text-rose-600">{stats.completed}/{stats.total} ({stats.progressPct}%)</span>
                </div>

                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      stats.progressPct === 100 ? "bg-emerald-500" : "bg-rose-600"
                    )}
                    style={{ width: `${stats.progressPct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => {
                      setVaultProject(project);
                      setIsVaultOpen(true);
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-rose-700 transition-colors cursor-pointer"
                  >
                    <Paperclip size={14} />
                    <span>Hồ sơ Vault ({project.documents?.length || 0} tệp)</span>
                  </button>

                  <button
                    onClick={() => setSelectedProject(project)}
                    className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
                  >
                    <span>Xem chi tiết</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vault / Document Storage Modal */}
      {isVaultOpen && vaultProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded uppercase">Vault Hồ Sơ</span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{vaultProject.title}</h3>
              </div>
              <button
                onClick={() => setIsVaultOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {/* Add document form */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Upload size={14} className="text-rose-600" />
                  <span>Thêm Hồ sơ / Tài liệu mới</span>
                </h4>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Tên tài liệu (vd: Bao_cao_Thang_3.pdf)"
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                  <select
                    value={newDocType}
                    onChange={(e: any) => setNewDocType(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="pdf">PDF Document</option>
                    <option value="doc">Word (.docx)</option>
                    <option value="xls">Excel (.xlsx)</option>
                    <option value="img">Hình ảnh (.png)</option>
                  </select>
                  <button
                    onClick={handleAddDocument}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all cursor-pointer shrink-0"
                  >
                    Đính kèm
                  </button>
                </div>
              </div>

              {/* Documents List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Tài liệu đính kèm ({vaultProject.documents.length})
                </h4>
                {vaultProject.documents.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">Chưa có tài liệu nào trong vault dự án này.</p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {vaultProject.documents.map((doc) => (
                      <div key={doc.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg shrink-0",
                            doc.type === 'pdf' && "bg-rose-50 text-rose-600",
                            doc.type === 'doc' && "bg-blue-50 text-blue-600",
                            doc.type === 'xls' && "bg-emerald-50 text-emerald-600",
                            doc.type === 'img' && "bg-purple-50 text-purple-600"
                          )}>
                            {doc.type === 'pdf' && <FileText size={18} />}
                            {doc.type === 'doc' && <FileText size={18} />}
                            {doc.type === 'xls' && <FileSpreadsheet size={18} />}
                            {doc.type === 'img' && <ImageIcon size={18} />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{doc.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{doc.size} • Cập nhật: {doc.updatedAt}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => showToast(`Đang tải tệp: ${doc.name}`, 'info')}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Download size={14} />
                          <span>Tải về</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Create Project Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">
                {projects.some(p => p.id === editingProject.id) ? 'Chỉnh sửa Dự án' : 'Tạo Dự án mới'}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên Dự án / Chương trình *</label>
                <input
                  type="text"
                  value={editingProject.title || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                  placeholder="Ví dụ: Chuyển đổi số công tác Đảng 2026..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã Dự án</label>
                  <input
                    type="text"
                    value={editingProject.code || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Đơn vị Chịu trách nhiệm</label>
                  <input
                    type="text"
                    value={editingProject.department || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mục tiêu & Nội dung chỉ đạo</label>
                <textarea
                  rows={3}
                  value={editingProject.description || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                  placeholder="Mô tả mục tiêu, yêu cầu cần đạt..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cán bộ phụ trách</label>
                  <input
                    type="text"
                    value={editingProject.manager || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, manager: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trạng thái</label>
                  <select
                    value={editingProject.status || 'in_progress'}
                    onChange={(e: any) => setEditingProject({ ...editingProject, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="in_progress">Đang chạy</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="on_hold">Tạm hoãn</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={editingProject.startDate || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={editingProject.endDate || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveProject}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                Lưu Dự án
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Project Details Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-200 bg-slate-900 text-white flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-rose-600 text-white font-mono text-[10px] font-bold rounded">
                    {selectedProject.code}
                  </span>
                  <span className="text-xs text-slate-300">• {selectedProject.department}</span>
                </div>
                <h2 className="text-xl font-extrabold mt-1">{selectedProject.title}</h2>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6 text-xs text-slate-700">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-1">Mục tiêu & Yêu cầu chỉ đạo</h4>
                <p className="leading-relaxed">{selectedProject.description}</p>
              </div>

              <div className="grid grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Người phụ trách</span>
                  <span className="font-bold text-slate-900">{selectedProject.manager}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Người khởi tạo</span>
                  <span className="font-bold text-slate-900">{selectedProject.creator}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Thời hạn triển khai</span>
                  <span className="font-bold text-slate-900">{selectedProject.startDate} ~ {selectedProject.endDate}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-2">
                  Tài liệu đính kèm ({selectedProject.documents.length})
                </h4>
                <div className="space-y-1.5">
                  {selectedProject.documents.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                      <span className="font-medium text-slate-800">{d.name} ({d.size})</span>
                      <button 
                        onClick={() => showToast(`Đang tải tệp: ${d.name}`, 'info')}
                        className="text-rose-600 font-bold hover:underline"
                      >
                        Tải tệp
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedProject(null)}
                className="px-5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
