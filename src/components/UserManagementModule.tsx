import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { collection, getDocs, query, doc, updateDoc, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';
import { Shield, Users, Loader2, Search, Bell, Send, Building, RefreshCw, Clock, ExternalLink, UserCheck, UserMinus, Filter, Download, MoreVertical, Mail, Calendar as CalendarIcon, Activity, X, Eye, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ToastType } from './ui/Toast';
import { Notification } from '../constants';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface UserManagementModuleProps {
  showToast: (message: string, type?: ToastType) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>, targetUserId?: string, targetUnitId?: string) => Promise<void>;
}

export const StatCard = memo(({ icon: Icon, label, value, color, bgColor }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
    <div className={cn("p-3 rounded-xl", bgColor, color)}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  </div>
));

const UserRow = memo(({ 
  user: u, 
  isSelected, 
  onToggleSelect, 
  isSuperAdmin, 
  onUnitChange, 
  onRoleChange, 
  onShowDetails, 
  onShowNotif, 
  onToggleStatus,
  currentUserEmail
}: any) => (
  <tr className={cn("hover:bg-slate-50/50 transition-colors", isSelected && "bg-blue-50/30")}>
    <td className="px-6 py-4">
      <input 
        type="checkbox" 
        checked={isSelected}
        onChange={() => onToggleSelect(u.id)}
        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
    </td>
    <td className="px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="relative">
          {u.photoURL ? (
            <img src={u.photoURL} alt="" className="w-10 h-10 rounded-full ring-2 ring-white shadow-sm" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-medium ring-2 ring-white shadow-sm">
              {u.displayName?.charAt(0) || u.email?.charAt(0).toUpperCase()}
            </div>
          )}
          {u.isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 block">{u.displayName || 'Chưa cập nhật'}</span>
            {u.isOnline && (
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.8)]" />
            )}
          </div>
          {u.role === 'admin' && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase tracking-wider mt-1 inline-block">Admin</span>}
          {u.role === 'super_admin' && <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded uppercase tracking-wider mt-1 inline-block">Super Admin</span>}
        </div>
      </div>
    </td>
    <td className="px-6 py-4 text-slate-600">{u.email}</td>
    <td className="px-6 py-4 text-slate-500">
      {u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString('vi-VN') : 'N/A'}
    </td>
    {isSuperAdmin && (
      <td className="px-6 py-4">
        <div className="flex flex-col gap-1">
          <input
            type="text"
            value={u.unitId || ''}
            onChange={(e) => onUnitChange(u.id, e.target.value)}
            placeholder="Mã đơn vị"
            disabled={u.email === currentUserEmail}
            className="bg-slate-50 border border-slate-200 text-slate-900 text-[10px] rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-1.5 disabled:opacity-50 font-bold uppercase tracking-wider"
          />
          {u.unitInfo?.fullName && (
            <span className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]" title={u.unitInfo.fullName}>
              {u.unitInfo.fullName}
            </span>
          )}
        </div>
      </td>
    )}
    <td className="px-6 py-4">
      <select 
        value={u.role || 'user'}
        onChange={(e) => onRoleChange(u.id, e.target.value)}
        disabled={u.email === currentUserEmail || (!isSuperAdmin && u.role === 'super_admin')}
        className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 disabled:opacity-50 font-medium cursor-pointer"
      >
        <option value="user">Người dùng</option>
        <option value="admin">Quản trị viên</option>
        {isSuperAdmin && <option value="super_admin">Super Admin</option>}
      </select>
    </td>
    <td className="px-6 py-4">
      <div className="flex justify-center gap-2">
        <button
          onClick={() => onShowDetails(u)}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
          title="Xem chi tiết"
        >
          <Eye size={16} />
        </button>
        <button
          onClick={() => onShowNotif(u)}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
          title="Gửi thông báo"
        >
          <Bell size={16} />
        </button>
        <button
          onClick={() => onToggleStatus(u.id, !u.isDisabled)}
          disabled={u.email === currentUserEmail}
          className={cn(
            "p-2 rounded-lg transition-all disabled:opacity-50",
            u.isDisabled ? "text-emerald-600 hover:bg-emerald-50" : "text-rose-600 hover:bg-rose-50"
          )}
          title={u.isDisabled ? "Kích hoạt" : "Vô hiệu hóa"}
        >
          {u.isDisabled ? <UserCheck size={16} /> : <UserMinus size={16} />}
        </button>
      </div>
    </td>
  </tr>
));

export const UserManagementModule: React.FC<UserManagementModuleProps> = ({ showToast, addNotification }) => {
  const { isAdmin, isSuperAdmin, unitId, user: currentUser } = useAuth();
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [unitFilter, setUnitFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [selectedUserForNotif, setSelectedUserForNotif] = useState<any | null>(null);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<any | null>(null);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  
  const [notificationHistory, setNotificationHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [broadcastType, setBroadcastType] = useState<'all' | 'unit' | 'user' | 'filtered'>('all');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [indexError, setIndexError] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      const matchesSearch = 
        u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.unitId?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesUnit = unitFilter === 'all' || u.unitId === unitFilter;
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && !u.disabled) || 
        (statusFilter === 'disabled' && u.disabled);
      
      return matchesSearch && matchesRole && matchesUnit && matchesStatus;
    });
  }, [usersList, searchTerm, roleFilter, unitFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: usersList.length,
    active: usersList.filter(u => !u.disabled).length,
    disabled: usersList.filter(u => u.disabled).length,
    admins: usersList.filter(u => u.role === 'admin' || u.role === 'super_admin').length,
    units: new Set(usersList.map(u => u.unitId).filter(Boolean)).size,
    online: usersList.filter(u => u.isOnline).length
  }), [usersList]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadNotificationHistory();
    }
  }, [isAdmin, isSuperAdmin, unitId]);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setIndexError(null);
    try {
      let q;
      if (isSuperAdmin) {
        q = query(collection(db, 'users'));
      } else {
        q = query(collection(db, 'users'), where('unitId', '==', unitId || ''));
      }
      const snapshot = await getDocs(q);
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setUsersList(users);
    } catch (error: any) {
      if (error.message.includes('index')) {
        setIndexError("Yêu cầu tạo Index cho 'users'.");
      }
      handleFirestoreError(error, OperationType.GET, 'users');
      showToast("Lỗi khi tải danh sách người dùng", "error");
    } finally {
      setIsLoading(false);
    }
  }, [isSuperAdmin, unitId, showToast]);

  const loadNotificationHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    setIndexError(null);
    try {
      let q;
      if (isSuperAdmin) {
        q = query(
          collection(db, 'notifications'),
          limit(50) // Fetch more to sort in memory
        );
      } else {
        q = query(
          collection(db, 'notifications'),
          where('unitId', 'in', [unitId || '', 'all']),
          limit(50) // Fetch more to sort in memory
        );
      }
      const snapshot = await getDocs(q);
      const history = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return { 
          id: doc.id, 
          ...data,
          timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : Date.now()
        };
      });
      
      // Sort in memory and take top 10
      history.sort((a, b) => b.timestamp - a.timestamp);
      setNotificationHistory(history.slice(0, 10));
    } catch (error: any) {
      if (error.message.includes('index')) {
        setIndexError("Yêu cầu tạo Index cho 'notifications'.");
      }
      handleFirestoreError(error, OperationType.GET, 'notifications');
      showToast("Lỗi khi tải lịch sử thông báo", "error");
    } finally {
      setIsHistoryLoading(false);
    }
  }, [isSuperAdmin, unitId, showToast]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showToast("Đã cập nhật phân quyền", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      showToast("Lỗi khi cập nhật phân quyền", "error");
    }
  };

  const handleUnitChange = async (userId: string, newUnitId: string) => {
    if (!isSuperAdmin) return;
    try {
      await updateDoc(doc(db, 'users', userId), { unitId: newUnitId });
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, unitId: newUnitId } : u));
      showToast("Đã cập nhật đơn vị", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      showToast("Lỗi khi cập nhật đơn vị", "error");
    }
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const toggleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const handleBulkStatusToggle = async (status: boolean) => {
    if (selectedUserIds.size === 0) return;
    setIsLoading(true);
    try {
      const promises = Array.from(selectedUserIds).map(userId => 
        updateDoc(doc(db, 'users', userId), { isDisabled: !status })
      );
      await Promise.all(promises);
      setUsersList(prev => prev.map(u => selectedUserIds.has(u.id) ? { ...u, isDisabled: !status } : u));
      showToast(`Đã ${status ? 'kích hoạt' : 'vô hiệu hóa'} ${selectedUserIds.size} tài khoản`, "success");
      setSelectedUserIds(new Set());
    } catch (error) {
      console.error("Error bulk updating status:", error);
      showToast("Lỗi khi cập nhật hàng loạt", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      showToast("Vui lòng nhập đầy đủ tiêu đề và nội dung", "warning");
      return;
    }

    setIsBroadcasting(true);
    try {
      if (broadcastType === 'user' && selectedUserForNotif) {
        await addNotification({
          title: broadcastTitle.trim(),
          description: broadcastMessage.trim(),
          type: 'info',
          link: 'dashboard'
        }, selectedUserForNotif.id, selectedUserForNotif.unitId || 'all');
      } else if (broadcastType === 'unit' && selectedUnit) {
        await addNotification({
          title: broadcastTitle.trim(),
          description: broadcastMessage.trim(),
          type: 'info',
          link: 'dashboard'
        }, 'all', selectedUnit);
      } else if (broadcastType === 'all') {
        await addNotification({
          title: broadcastTitle.trim(),
          description: broadcastMessage.trim(),
          type: 'info',
          link: 'dashboard'
        }, 'all', 'all');
      } else if (broadcastType === 'filtered') {
        // Send individually to filtered users or use a special target
        // For simplicity, we'll send to each one if the list is small, 
        // but better to have a 'filtered' logic in useNotifications if possible.
        // Here we'll just send a notification for each selected user if bulk, 
        // or just use 'all' with unit filtering if it matches.
        
        const promises = filteredUsers.map(u => 
          addNotification({
            title: broadcastTitle.trim(),
            description: broadcastMessage.trim(),
            type: 'info',
            link: 'dashboard'
          }, u.id, u.unitId || 'all')
        );
        await Promise.all(promises);
      }

      showToast("Đã gửi thông báo thành công", "success");
      setShowBroadcastModal(false);
      setBroadcastTitle('');
      setBroadcastMessage('');
      setSelectedUserForNotif(null);
    } catch (error) {
      console.error("Error broadcasting notification:", error);
      showToast("Lỗi khi gửi thông báo", "error");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isDisabled: !currentStatus });
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, isDisabled: !currentStatus } : u));
      showToast(`Đã ${!currentStatus ? 'vô hiệu hóa' : 'kích hoạt'} tài khoản`, "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      showToast("Lỗi khi cập nhật trạng thái", "error");
    }
  };

  const exportToCSV = () => {
    const headers = ["Họ tên", "Email", "Vai trò", "Đơn vị", "Ngày tham gia"];
    const rows = filteredUsers.map(u => [
      u.displayName || "N/A",
      u.email,
      u.role,
      u.unitId || "N/A",
      u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString('vi-VN') : "N/A"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `danh_sach_nguoi_dung_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAdmin) return <div className="p-8 text-center text-slate-500">Bạn không có quyền truy cập trang này.</div>;

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8 animate-in fade-in duration-300">
      {indexError && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 shadow-sm"
        >
          <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-amber-900 mb-1">Yêu cầu cấu hình Firestore</h3>
            <p className="text-xs text-amber-700 leading-relaxed">
              {indexError} Vui lòng kiểm tra console để lấy link tạo Index.
            </p>
          </div>
        </motion.div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/20">
              <Users size={24} />
            </div>
            Quản lý Người dùng
          </h2>
          <p className="text-slate-500 mt-2 text-sm font-medium">Hệ thống quản trị tài khoản và phân quyền tập trung</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-bold text-xs uppercase tracking-wider border border-slate-200 shadow-sm"
          >
            <Download size={16} />
            Xuất CSV
          </button>
          <button
            onClick={() => setShowBroadcastModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/20"
          >
            <Bell size={16} />
            Phát thông báo
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Users} label="Tổng người dùng" value={stats.total} color="text-blue-600" bgColor="bg-blue-50" />
        <StatCard icon={Eye} label="Đang trực tuyến" value={stats.online} color="text-emerald-600" bgColor="bg-emerald-50" />
        <StatCard icon={UserCheck} label="Đang hoạt động" value={stats.active} color="text-slate-600" bgColor="bg-slate-50" />
        <StatCard icon={Shield} label="Quản trị viên" value={stats.admins} color="text-amber-600" bgColor="bg-amber-50" />
        <StatCard icon={Building} label="Đơn vị" value={stats.units} color="text-purple-600" bgColor="bg-purple-50" />
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[240px] group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Tìm theo tên, email hoặc đơn vị..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="user">Người dùng</option>
              <option value="admin">Quản trị viên</option>
              <option value="super_admin">Super Admin</option>
            </select>

            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="disabled">Đã vô hiệu</option>
            </select>

            {isSuperAdmin && (
              <select 
                value={unitFilter} 
                onChange={(e) => setUnitFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">Tất cả đơn vị</option>
                {Array.from(new Set(usersList.map(u => u.unitId).filter(Boolean))).map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {selectedUserIds.size > 0 && (
          <div className="flex items-center justify-between py-2 px-4 bg-blue-50 rounded-xl border border-blue-100 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-blue-700">Đã chọn {selectedUserIds.size} người dùng</span>
              <button onClick={() => setSelectedUserIds(new Set())} className="text-xs text-blue-500 hover:underline">Bỏ chọn</button>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleBulkStatusToggle(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
              >
                <UserCheck size={14} /> Kích hoạt
              </button>
              <button 
                onClick={() => handleBulkStatusToggle(false)}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-colors"
              >
                <UserMinus size={14} /> Vô hiệu hóa
              </button>
              <button 
                onClick={() => {
                  setBroadcastType('filtered');
                  setShowBroadcastModal(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
              >
                <Bell size={14} /> Gửi thông báo
              </button>
            </div>
          </div>
        )}
      </div>

      {showBroadcastModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Bell className="text-blue-500" />
                {selectedUserForNotif ? `Gửi thông báo đến ${selectedUserForNotif.displayName || selectedUserForNotif.email}` : 'Phát thông báo toàn hệ thống'}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {selectedUserForNotif ? 'Thông báo này sẽ chỉ được gửi đến người dùng này.' : 'Thông báo này sẽ được gửi đến tất cả người dùng.'}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Đối tượng nhận</label>
                <div className="flex gap-4 text-sm flex-wrap">
                  <label className="flex items-center cursor-pointer"><input type="radio" value="all" checked={broadcastType === 'all'} onChange={() => setBroadcastType('all')} className="mr-2" /> Tất cả</label>
                  <label className="flex items-center cursor-pointer"><input type="radio" value="unit" checked={broadcastType === 'unit'} onChange={() => setBroadcastType('unit')} className="mr-2" /> Đơn vị</label>
                  <label className="flex items-center cursor-pointer"><input type="radio" value="user" checked={broadcastType === 'user'} onChange={() => setBroadcastType('user')} className="mr-2" /> Cá nhân</label>
                  <label className="flex items-center cursor-pointer"><input type="radio" value="filtered" checked={broadcastType === 'filtered'} onChange={() => setBroadcastType('filtered')} className="mr-2" /> Đã lọc ({filteredUsers.length})</label>
                </div>
              </div>
              
              {broadcastType === 'unit' && (
                <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium">
                  <option value="">Chọn đơn vị</option>
                  {Array.from(new Set(usersList.map(u => u.unitId).filter(Boolean))).map(unit => <option key={unit} value={unit}>{unit}</option>)}
                </select>
              )}

              {broadcastType === 'user' && (
                <select value={selectedUserForNotif?.id || ''} onChange={(e) => setSelectedUserForNotif(usersList.find(u => u.id === e.target.value) || null)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium">
                  <option value="">Chọn người dùng</option>
                  {usersList.map(u => <option key={u.id} value={u.id}>{u.displayName || u.email}</option>)}
                </select>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Tiêu đề</label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="Ví dụ: Cập nhật hệ thống..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nội dung</label>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Nhập nội dung thông báo..."
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium resize-none"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowBroadcastModal(false);
                  setSelectedUserForNotif(null);
                }}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleBroadcast}
                disabled={isBroadcasting || !broadcastTitle.trim() || !broadcastMessage.trim()}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50"
              >
                {isBroadcasting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                Gửi thông báo
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 size={32} className="animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium w-10">
                    <input 
                      type="checkbox" 
                      checked={selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-4 font-medium">Người dùng</th>
                  <th className="px-6 py-4 font-medium">Email</th>
                  <th className="px-6 py-4 font-medium">Ngày tham gia</th>
                  {isSuperAdmin && <th className="px-6 py-4 font-medium">Đơn vị</th>}
                  <th className="px-6 py-4 font-medium">Phân quyền</th>
                  <th className="px-6 py-4 font-medium text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <UserRow 
                    key={u.id}
                    user={u}
                    isSelected={selectedUserIds.has(u.id)}
                    onToggleSelect={toggleSelectUser}
                    isSuperAdmin={isSuperAdmin}
                    onUnitChange={handleUnitChange}
                    onRoleChange={handleRoleChange}
                    onShowDetails={setSelectedUserForDetails}
                    onShowNotif={(user: any) => {
                      setSelectedUserForNotif(user);
                      setBroadcastType('user');
                      setShowBroadcastModal(true);
                    }}
                    onToggleStatus={handleStatusToggle}
                    currentUserEmail={currentUser?.email}
                  />
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={isSuperAdmin ? 6 : 5} className="px-6 py-12 text-center text-slate-500">
                      Không tìm thấy người dùng nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUserForDetails && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Users className="text-blue-600" />
                Chi tiết người dùng
              </h3>
              <button onClick={() => setSelectedUserForDetails(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            
            <div className="p-8">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex flex-col items-center gap-4">
                  {selectedUserForDetails.photoURL ? (
                    <img src={selectedUserForDetails.photoURL} alt="" className="w-32 h-32 rounded-full ring-4 ring-slate-50 shadow-xl" />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-slate-900 flex items-center justify-center text-white text-4xl font-bold ring-4 ring-slate-50 shadow-xl">
                      {selectedUserForDetails.displayName?.charAt(0) || selectedUserForDetails.email?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="text-center">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      selectedUserForDetails.isDisabled ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                    )}>
                      {selectedUserForDetails.isDisabled ? "Đã vô hiệu" : "Đang hoạt động"}
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Họ và tên</p>
                      <p className="text-slate-900 font-bold text-lg">{selectedUserForDetails.displayName || 'Chưa cập nhật'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email</p>
                      <div className="flex items-center gap-2 text-slate-600 font-medium">
                        <Mail size={14} />
                        {selectedUserForDetails.email}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vai trò</p>
                      <div className="flex items-center gap-2 text-slate-900 font-bold">
                        <Shield size={14} className="text-blue-500" />
                        {selectedUserForDetails.role === 'super_admin' ? 'Super Admin' : selectedUserForDetails.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Đơn vị</p>
                      <div className="flex items-center gap-2 text-slate-900 font-bold">
                        <Building size={14} className="text-purple-500" />
                        {selectedUserForDetails.unitId || 'Chưa phân đơn vị'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ngày tham gia</p>
                      <div className="flex items-center gap-2 text-slate-600 font-medium">
                        <CalendarIcon size={14} />
                        {selectedUserForDetails.createdAt?.toDate ? selectedUserForDetails.createdAt.toDate().toLocaleDateString('vi-VN') : 'N/A'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hoạt động cuối</p>
                      <div className="flex items-center gap-2 text-slate-600 font-medium">
                        <Activity size={14} className={selectedUserForDetails.isOnline ? "text-emerald-500" : "text-slate-400"} />
                        {selectedUserForDetails.lastSeen?.toDate ? selectedUserForDetails.lastSeen.toDate().toLocaleString('vi-VN') : 'N/A'}
                        {selectedUserForDetails.isOnline && <span className="ml-1 text-[10px] text-emerald-600 font-bold uppercase">(Trực tuyến)</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedUserForDetails(null)}
                className="px-6 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification History Panel */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="text-blue-500" size={20} />
            Lịch sử Thông báo (10 gần nhất)
          </h3>
          <button
            onClick={loadNotificationHistory}
            disabled={isHistoryLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 hover:border-blue-500 transition-all font-bold text-xs uppercase tracking-wider shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={14} className={isHistoryLoading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {isHistoryLoading && notificationHistory.length === 0 ? (
            <div className="p-12 flex justify-center">
              <Loader2 size={32} className="animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Thời gian</th>
                    <th className="px-6 py-4 font-medium">Tiêu đề</th>
                    <th className="px-6 py-4 font-medium">Nội dung</th>
                    <th className="px-6 py-4 font-medium">Đối tượng</th>
                    <th className="px-6 py-4 font-medium">Đơn vị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {notificationHistory.map((notif) => (
                    <tr key={notif.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium">
                        {new Date(notif.timestamp).toLocaleString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">{notif.title}</td>
                      <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={notif.description}>
                        {notif.description}
                      </td>
                      <td className="px-6 py-4">
                        {notif.targetUserId === 'all' ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">Tất cả</span>
                        ) : (
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">Cá nhân</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                          {notif.unitId}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {notificationHistory.length === 0 && !isHistoryLoading && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        Chưa có lịch sử thông báo nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
