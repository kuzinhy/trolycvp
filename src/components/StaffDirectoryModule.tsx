import React, { useState } from 'react';
import { 
  Users, UserPlus, Search, Filter, Phone, Mail, Building, 
  Send, ShieldCheck, Edit3, Trash2, CheckCircle2, Clock, 
  X, Check, MessageSquare, ExternalLink, Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import { STAFF_LIST } from '../constants';

export interface StaffMember {
  id: string;
  name: string;
  username: string;
  department: string;
  role: 'Trưởng ban' | 'Phó ban' | 'Chuyên viên' | 'Cán bộ';
  email: string;
  phone: string;
  telegramChatId?: string;
  zaloUserId?: string;
  completedTasks: number;
  totalTasks: number;
}

const DEFAULT_STAFF: StaffMember[] = [
  {
    id: 'staff-1',
    name: 'Nguyễn Minh Huy',
    username: 'minhhuy.vp',
    department: 'Văn phòng Đảng ủy',
    role: 'Trưởng ban',
    email: 'minhhuy.nguyen@danguy.gov.vn',
    phone: '0988123456',
    telegramChatId: '88123456',
    zaloUserId: '0988123456',
    completedTasks: 8,
    totalTasks: 10
  },
  {
    id: 'staff-2',
    name: 'Lê Thị Kiều Oanh',
    username: 'kieuoanh.vp',
    department: 'Văn phòng Đảng ủy',
    role: 'Phó ban',
    email: 'kieuoanh.le@danguy.gov.vn',
    phone: '0912345678',
    telegramChatId: '12345678',
    zaloUserId: '0912345678',
    completedTasks: 5,
    totalTasks: 6
  },
  {
    id: 'staff-3',
    name: 'Trần Quốc Bảo',
    username: 'quocbao.kt',
    department: 'Ban Kiểm tra Đảng ủy',
    role: 'Trưởng ban',
    email: 'quocbao.tran@danguy.gov.vn',
    phone: '0903456789',
    telegramChatId: '34567890',
    zaloUserId: '0903456789',
    completedTasks: 4,
    totalTasks: 5
  },
  {
    id: 'staff-4',
    name: 'Nguyễn Thị Thu Phương',
    username: 'thuphuong.tg',
    department: 'Ban Tuyên giáo Đảng ủy',
    role: 'Trưởng ban',
    email: 'thuphuong.nguyen@danguy.gov.vn',
    phone: '0976543210',
    telegramChatId: '76543210',
    zaloUserId: '0976543210',
    completedTasks: 6,
    totalTasks: 7
  },
  {
    id: 'staff-5',
    name: 'Nguyễn Hồng Tú',
    username: 'hongtu.tc',
    department: 'Ban Tổ chức Đảng ủy',
    role: 'Chuyên viên',
    email: 'hongtu.nguyen@danguy.gov.vn',
    phone: '0983111222',
    telegramChatId: '83111222',
    zaloUserId: '0983111222',
    completedTasks: 3,
    totalTasks: 6
  }
];

const DEPARTMENTS = [
  'Văn phòng Đảng ủy',
  'Ban Kiểm tra Đảng ủy',
  'Ban Tuyên giáo Đảng ủy',
  'Ban Tổ chức Đảng ủy',
  'Ban Dân vận Đảng ủy'
];

interface StaffDirectoryModuleProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  navigateTo?: (tab: string) => void;
}

export const StaffDirectoryModule: React.FC<StaffDirectoryModuleProps> = ({
  showToast
}) => {
  const [staffList, setStaffList] = useState<StaffMember[]>(DEFAULT_STAFF);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Partial<StaffMember>>({});

  const filteredStaff = staffList.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.phone.includes(searchQuery);
    const matchDept = selectedDeptFilter === 'all' || s.department === selectedDeptFilter;
    return matchSearch && matchDept;
  });

  const handleOpenCreate = () => {
    setEditingStaff({
      id: `staff-${Date.now()}`,
      name: '',
      username: '',
      department: 'Văn phòng Đảng ủy',
      role: 'Chuyên viên',
      email: '',
      phone: '',
      telegramChatId: '',
      zaloUserId: '',
      completedTasks: 0,
      totalTasks: 0
    });
    setIsModalOpen(true);
  };

  const handleSaveStaff = () => {
    if (!editingStaff.name?.trim()) {
      showToast('Vui lòng nhập họ và tên cán bộ!', 'error');
      return;
    }

    if (staffList.some(s => s.id === editingStaff.id)) {
      setStaffList(staffList.map(s => s.id === editingStaff.id ? (editingStaff as StaffMember) : s));
      showToast('Đã cập nhật thông tin cán bộ!', 'success');
    } else {
      setStaffList([editingStaff as StaffMember, ...staffList]);
      showToast('Đã thêm cán bộ mới!', 'success');
    }
    setIsModalOpen(false);
  };

  const handleDeleteStaff = (id: string) => {
    setStaffList(staffList.filter(s => s.id !== id));
    showToast('Đã xóa thông tin cán bộ khỏi danh bạ.', 'info');
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50/60 min-h-screen space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-xs font-extrabold rounded-md uppercase tracking-wider border border-rose-200">
              Cơ cấu Tổ chức
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Danh bạ Cán bộ & Phòng ban</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Danh sách Cán bộ & Phòng ban
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý danh bạ cán bộ tham mưu, cơ cấu các Ban Đảng ủy và cài đặt ID kết nối nhận thông báo Telegram / Zalo.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-md shadow-rose-600/20 transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <UserPlus size={18} />
          <span>Thêm Cán bộ mới</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Tìm theo họ tên, username, số điện thoại..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </div>

        <select
          value={selectedDeptFilter}
          onChange={(e) => setSelectedDeptFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none"
        >
          <option value="all">Tất cả Phòng ban ({staffList.length})</option>
          {DEPARTMENTS.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Cán bộ / Họ tên</th>
                <th className="px-6 py-4">Phòng ban & Vai trò</th>
                <th className="px-6 py-4">Thông tin Liên hệ</th>
                <th className="px-6 py-4">Tài khoản Bot (Telegram/Zalo)</th>
                <th className="px-6 py-4 text-center">Tiến độ việc</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredStaff.map((staff) => {
                const pct = staff.totalTasks > 0 ? Math.round((staff.completedTasks / staff.totalTasks) * 100) : 100;
                return (
                  <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Name & Avatar */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold flex items-center justify-center shrink-0 text-sm">
                          {staff.name.charAt(staff.name.lastIndexOf(' ') + 1) || staff.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{staff.name}</p>
                          <p className="text-[10px] font-mono text-slate-400">@{staff.username || 'user'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Department & Role */}
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-800 block">{staff.department}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold inline-block mt-1 uppercase",
                        staff.role === 'Trưởng ban' && "bg-purple-100 text-purple-700",
                        staff.role === 'Phó ban' && "bg-blue-100 text-blue-700",
                        staff.role === 'Chuyên viên' && "bg-slate-100 text-slate-700"
                      )}>
                        {staff.role}
                      </span>
                    </td>

                    {/* Contact info */}
                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Phone size={13} className="text-slate-400 shrink-0" />
                        <span className="font-mono">{staff.phone || 'Chưa cập nhật'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Mail size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate max-w-[180px]">{staff.email || 'Chưa cập nhật'}</span>
                      </div>
                    </td>

                    {/* Bot Integration IDs */}
                    <td className="px-6 py-4 space-y-1 text-[11px] font-mono">
                      <p className="text-slate-600">
                        Telegram: <strong className="text-slate-900">{staff.telegramChatId || '—'}</strong>
                      </p>
                      <p className="text-slate-600">
                        Zalo ID: <strong className="text-slate-900">{staff.zaloUserId || '—'}</strong>
                      </p>
                    </td>

                    {/* Task completion progress */}
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-rose-600 block">{staff.completedTasks}/{staff.totalTasks} ({pct}%)</span>
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden mx-auto mt-1">
                        <div className="h-full bg-rose-600 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingStaff(staff);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                          title="Chỉnh sửa cán bộ"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteStaff(staff.id)}
                          className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Xóa cán bộ"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Create Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">
                {staffList.some(s => s.id === editingStaff.id) ? 'Cập nhật Cán bộ' : 'Thêm Cán bộ mới'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Họ và tên *</label>
                <input
                  type="text"
                  value={editingStaff.name || ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên đăng nhập (Username)</label>
                  <input
                    type="text"
                    value={editingStaff.username || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, username: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phòng ban / Ban Đảng</label>
                  <select
                    value={editingStaff.department || DEPARTMENTS[0]}
                    onChange={(e) => setEditingStaff({ ...editingStaff, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={editingStaff.phone || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email công vụ</label>
                  <input
                    type="email"
                    value={editingStaff.email || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telegram Chat ID</label>
                  <input
                    type="text"
                    value={editingStaff.telegramChatId || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, telegramChatId: e.target.value })}
                    placeholder="VD: 88123456"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Zalo User ID</label>
                  <input
                    type="text"
                    value={editingStaff.zaloUserId || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, zaloUserId: e.target.value })}
                    placeholder="VD: 0988123456"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
                  />
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
                onClick={handleSaveStaff}
                className="px-5 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Lưu Cán bộ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
