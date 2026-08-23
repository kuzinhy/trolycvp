import React, { useState } from 'react';
import { 
  GitBranch, Plus, Search, Filter, Layers, Edit3, Trash2, 
  CheckCircle2, Clock, PlayCircle, Eye, ArrowUpRight, X, Sparkles, Check
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Task } from '../constants';

export interface WorkflowItem {
  id: string;
  name: string;
  code: string;
  description: string;
  color: string;
  iconName: string;
  stepCount: number;
  linkedTasksCount: number;
  avgCompletionPct: number;
  steps: string[];
}

const DEFAULT_WORKFLOWS: WorkflowItem[] = [
  {
    id: 'wf-001',
    name: 'Quy trình Soạn thảo & Phát hành Văn bản Đảng',
    code: 'QT-STVB',
    description: 'Quy trình chuẩn 5 bước từ dự thảo, xin ý kiến, thẩm định, trình ký đến phát hành lưu trữ.',
    color: '#2563EB', // Royal Blue
    iconName: 'FileText',
    stepCount: 5,
    linkedTasksCount: 14,
    avgCompletionPct: 78,
    steps: ['1. Lập dự thảo văn bản', '2. Tờ trình xin ý kiến Thường trực', '3. Thẩm định pháp lý & thể thức', '4. Trình ký Văn phòng/Cấp ủy', '5. Phát hành & Lưu trữ Vault']
  },
  {
    id: 'wf-002',
    name: 'Quy trình Thẩm định & Kết nạp Đảng viên Mới',
    code: 'QT-KNDV',
    description: 'Rà soát hồ sơ lý lịch, xác minh địa phương, mở lớp bồi dưỡng, họp chi bộ xét kết nạp.',
    color: '#10B981', // Emerald
    iconName: 'Users',
    stepCount: 6,
    linkedTasksCount: 9,
    avgCompletionPct: 65,
    steps: ['1. Tiếp nhận hồ sơ quần chúng', '2. Thẩm tra lý lịch gia đình', '3. Học lớp Bồi dưỡng Lý luận', '4. Lấy ý kiến cấp ủy nơi cư trú', '5. Nghị quyết Chi bộ xét', '6. Quyết định chuẩn y Cấp ủy']
  },
  {
    id: 'wf-003',
    name: 'Quy trình Kiểm tra Giám sát Chi bộ Định kỳ',
    code: 'QT-KTGS',
    description: 'Lập kế hoạch đợt kiểm tra, thông báo chi bộ, làm việc trực tiếp, kết luận chỉ đạo.',
    color: '#EF4444', // Red / Rose
    iconName: 'Shield',
    stepCount: 4,
    linkedTasksCount: 6,
    avgCompletionPct: 85,
    steps: ['1. Ban hành Quyết định Đoàn kiểm tra', '2. Báo cáo tự kiểm tra của Chi bộ', '3. Thẩm tra thực tế & đối chiếu', '4. Ban hành Thông báo Kết luận']
  },
  {
    id: 'wf-004',
    name: 'Quy trình Tiếp Công dân & Xử lý Đơn thư',
    code: 'QT-TCD',
    description: 'Ghi nhận lịch tiếp công dân, phân loại đơn thư phản ánh, chuyển đơn vị giải quyết và trả lời.',
    color: '#F59E0B', // Amber
    iconName: 'MessageSquare',
    stepCount: 4,
    linkedTasksCount: 4,
    avgCompletionPct: 90,
    steps: ['1. Tiếp nhận & Đăng ký đơn thư', '2. Phân loại & Tham mưu xử lý', '3. Giao đơn vị chức năng thụ lý', '4. Thông báo kết quả cho công dân']
  }
];

const PRESET_COLORS = [
  '#2563EB', // Blue
  '#10B981', // Emerald
  '#EF4444', // Rose
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#06B6D4'  // Cyan
];

interface WorkflowModuleProps {
  tasks: Task[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  navigateTo?: (tab: string) => void;
}

export const WorkflowModule: React.FC<WorkflowModuleProps> = ({
  showToast
}) => {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>(DEFAULT_WORKFLOWS);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Partial<WorkflowItem>>({});
  const [newStepText, setNewStepText] = useState('');

  const filteredWorkflows = workflows.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingWorkflow({
      id: `wf-${Date.now()}`,
      name: '',
      code: `QT-${Math.floor(100 + Math.random() * 900)}`,
      description: '',
      color: '#2563EB',
      iconName: 'GitBranch',
      stepCount: 3,
      linkedTasksCount: 0,
      avgCompletionPct: 0,
      steps: ['1. Khởi tạo quy trình', '2. Xử lý chuyên môn', '3. Phê duyệt & Hoàn tất']
    });
    setIsModalOpen(true);
  };

  const handleSaveWorkflow = () => {
    if (!editingWorkflow.name?.trim()) {
      showToast('Vui lòng nhập tên quy trình!', 'error');
      return;
    }

    if (workflows.some(w => w.id === editingWorkflow.id)) {
      setWorkflows(workflows.map(w => w.id === editingWorkflow.id ? (editingWorkflow as WorkflowItem) : w));
      showToast('Đã cập nhật quy trình làm việc!', 'success');
    } else {
      setWorkflows([...workflows, editingWorkflow as WorkflowItem]);
      showToast('Đã tạo quy trình mới!', 'success');
    }
    setIsModalOpen(false);
  };

  const handleDeleteWorkflow = (id: string) => {
    setWorkflows(workflows.filter(w => w.id !== id));
    showToast('Đã xóa quy trình.', 'info');
  };

  const handleAddStep = () => {
    if (!newStepText.trim()) return;
    const currentSteps = editingWorkflow.steps || [];
    const stepNum = currentSteps.length + 1;
    const updated = [...currentSteps, `${stepNum}. ${newStepText.trim()}`];
    setEditingWorkflow({
      ...editingWorkflow,
      steps: updated,
      stepCount: updated.length
    });
    setNewStepText('');
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50/60 min-h-screen space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-xs font-extrabold rounded-md uppercase tracking-wider border border-rose-200">
              Chuẩn hóa Vận hành
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Sơ đồ Quy trình Công tác</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Quy trình Làm việc
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Số hóa các bước quy trình tham mưu, xử lý hồ sơ hành chính và giám sát tiến độ thực hiện đồng bộ.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-md shadow-rose-600/20 transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <Plus size={18} />
          <span>Tạo Quy trình mới</span>
        </button>
      </div>

      {/* Search Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Tìm quy trình làm việc theo tên, mã số..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </div>
      </div>

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredWorkflows.map((wf) => (
          <div
            key={wf.id}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between space-y-4 group"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: wf.color }}
                  />
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {wf.code}
                  </span>
                  <span className="text-xs text-slate-400">• {wf.stepCount} BƯỚC THỰC HIỆN</span>
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingWorkflow(wf);
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                    title="Chỉnh sửa quy trình"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteWorkflow(wf.id)}
                    className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer"
                    title="Xóa quy trình"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Title & Desc */}
              <h3 className="font-bold text-slate-900 text-base mt-3 group-hover:text-rose-700 transition-colors">
                {wf.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {wf.description}
              </p>

              {/* Steps overview */}
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Các bước tuần tự</span>
                <div className="space-y-1">
                  {wf.steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      <span className="truncate">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Progress bar footer */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600">Đang áp dụng: {wf.linkedTasksCount} hồ sơ</span>
                <span style={{ color: wf.color }}>{wf.avgCompletionPct}% Tiến độ trung bình</span>
              </div>

              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${wf.avgCompletionPct}%`, backgroundColor: wf.color }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Create Workflow Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">
                {workflows.some(w => w.id === editingWorkflow.id) ? 'Chỉnh sửa Quy trình' : 'Thêm, Sửa Quy trình'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Preview Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Xem trước hiển thị</span>
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full shadow-sm"
                    style={{ backgroundColor: editingWorkflow.color || '#2563EB' }}
                  />
                  <div>
                    <h4 className="font-bold text-slate-900">{editingWorkflow.name || 'Tên quy trình mới'}</h4>
                    <span className="text-[10px] text-slate-500">Mã: {editingWorkflow.code} • {editingWorkflow.steps?.length || 0} Bước</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên Quy trình *</label>
                <input
                  type="text"
                  value={editingWorkflow.name || ''}
                  onChange={(e) => setEditingWorkflow({ ...editingWorkflow, name: e.target.value })}
                  placeholder="Ví dụ: Quy trình Thẩm định Lý lịch..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã Quy trình</label>
                  <input
                    type="text"
                    value={editingWorkflow.code || ''}
                    onChange={(e) => setEditingWorkflow({ ...editingWorkflow, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Màu nhận diện</label>
                  <div className="flex items-center gap-2 pt-1">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditingWorkflow({ ...editingWorkflow, color: c })}
                        className={cn(
                          "w-6 h-6 rounded-full border-2 transition-transform cursor-pointer",
                          editingWorkflow.color === c ? "border-slate-900 scale-110" : "border-transparent"
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả quy trình</label>
                <textarea
                  rows={2}
                  value={editingWorkflow.description || ''}
                  onChange={(e) => setEditingWorkflow({ ...editingWorkflow, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              {/* Steps management */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700">Các bước thực hiện ({editingWorkflow.steps?.length || 0})</label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {editingWorkflow.steps?.map((step, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                      <span className="font-medium text-slate-800">{step}</span>
                      <button
                        onClick={() => {
                          const updated = editingWorkflow.steps?.filter((_, i) => i !== idx);
                          setEditingWorkflow({ ...editingWorkflow, steps: updated, stepCount: updated?.length || 0 });
                        }}
                        className="text-rose-600 hover:text-rose-800 p-0.5 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Thêm bước mới (vd: Trình Thường trực phê duyệt)..."
                    value={newStepText}
                    onChange={(e) => setNewStepText(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                  />
                  <button
                    onClick={handleAddStep}
                    className="px-3 py-1.5 bg-slate-900 text-white font-bold rounded-lg text-xs cursor-pointer"
                  >
                    Thêm bước
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveWorkflow}
                className="px-5 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Lưu Quy trình
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
