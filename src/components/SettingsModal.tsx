import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Moon, Sun, Monitor, Layout, Type, AlignLeft, AlignRight, Check, User, Bell, LogOut, RefreshCw, Database, Download, Upload, ShieldCheck, ChevronRight, Save, Trash2, Brain, History } from 'lucide-react';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { cn } from '../lib/utils';
import { createBackup, restoreBackup, BackupData, saveSnapshot, getSnapshots, deleteSnapshot } from '../services/backupService';
import { useAuth } from '../context/AuthContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onSignOut: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  onReloadKnowledge: () => void;
  addNotification: (notification: any) => void;
  notificationSettings: any;
  setNotificationSettings: (settings: any) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose,
  user,
  onSignOut,
  showToast,
  onReloadKnowledge,
  notificationSettings,
  setNotificationSettings
}) => {
  const { preferences, updatePreference } = useUserPreferences();
  const { unitId } = useAuth();
  const [activeTab, setActiveTab] = useState<'ui' | 'account' | 'notifications' | 'backup'>('ui');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  const [snapshotLabel, setSnapshotLabel] = useState('');

  const fetchSnapshots = async () => {
    if (!user) return;
    setIsLoadingSnapshots(true);
    try {
      const data = await getSnapshots(user.uid);
      setSnapshots(data);
    } catch (error) {
      console.error("Fetch snapshots error:", error);
    } finally {
      setIsLoadingSnapshots(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'backup') {
      fetchSnapshots();
    }
  }, [activeTab]);

  const handleSaveSnapshot = async () => {
    if (!user || !snapshotLabel.trim()) return;
    setIsBackingUp(true);
    try {
      await saveSnapshot(user.uid, unitId || 'default_unit', snapshotLabel);
      showToast("Đã lưu ảnh chụp hệ thống thành công!", "success");
      setSnapshotLabel('');
      fetchSnapshots();
    } catch (error) {
      console.error("Snapshot error:", error);
      showToast("Lỗi khi lưu ảnh chụp hệ thống", "error");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreFromSnapshot = async (snapshot: any) => {
    if (!user) return;
    if (!window.confirm(`Bạn có chắc muốn khôi phục từ bản sao lưu "${snapshot.label}"? Toàn bộ dữ liệu hiện tại sẽ bị ghi đè.`)) return;

    setIsRestoring(true);
    try {
      await restoreBackup(user.uid, unitId || 'default_unit', snapshot);
      showToast("Đã khôi phục dữ liệu thành công! Vui lòng tải lại trang.", "success");
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error("Restore snapshot error:", error);
      showToast("Lỗi khi khôi phục dữ liệu", "error");
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteSnapshot = async (id: string) => {
    if (!user || !window.confirm("Xóa bản sao lưu này?")) return;
    try {
      await deleteSnapshot(user.uid, id);
      fetchSnapshots();
      showToast("Đã xóa bản sao lưu", "success");
    } catch (error) {
      showToast("Lỗi khi xóa bản sao lưu", "error");
    }
  };

  const handleCreateBackup = async () => {
    if (!user) return;
    setIsBackingUp(true);
    try {
      const backup = await createBackup(user.uid, unitId || 'default_unit');
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_troly_elite_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Đã tạo bản sao lưu thành công!", "success");
    } catch (error) {
      console.error("Backup error:", error);
      showToast("Lỗi khi tạo bản sao lưu", "error");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!window.confirm("CẢNH BÁO: Khôi phục sẽ ghi đè toàn bộ dữ liệu hiện tại. Bạn có chắc chắn muốn tiếp tục?")) {
      e.target.value = '';
      return;
    }

    setIsRestoring(true);
    try {
      const text = await file.text();
      const backup: BackupData = JSON.parse(text);
      
      if (!backup.version || !backup.data) {
        throw new Error("Tệp sao lưu không hợp lệ");
      }

      await restoreBackup(user.uid, unitId || 'default_unit', backup);
      showToast("Đã khôi phục dữ liệu thành công! Vui lòng tải lại trang.", "success");
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Restore error:", error);
      showToast("Lỗi khi khôi phục dữ liệu: Tệp không hợp lệ hoặc lỗi hệ thống", "error");
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[hsl(var(--card))] w-full max-w-5xl h-[85vh] max-h-[850px] rounded-[3rem] shadow-2xl border border-[hsl(var(--border))] overflow-hidden flex flex-col md:flex-row"
        >
          {/* Sidebar Tabs */}
          <div className="w-full md:w-72 bg-[hsl(var(--secondary))]/50 border-r border-[hsl(var(--border))] p-8 flex flex-col">
            <div className="mb-10 px-2">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-600/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black heading-pro tracking-tight">Cài đặt</h2>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-[0.2em] font-bold mt-1">Hệ thống Elite v6.0</p>
            </div>
            
            <div className="space-y-2 flex-1">
              {[
                { id: 'ui', label: 'Giao diện', icon: Layout, desc: 'Màu sắc & Bố cục' },
                { id: 'account', label: 'Tài khoản', icon: User, desc: 'Thông tin cá nhân' },
                { id: 'notifications', label: 'Thông báo', icon: Bell, desc: 'Âm thanh & Đẩy' },
                { id: 'backup', label: 'Sao lưu & Phục hồi', icon: Database, desc: 'Bảo mật dữ liệu' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "w-full flex items-center gap-4 px-5 py-4 rounded-[1.5rem] transition-all text-left group",
                    activeTab === tab.id
                      ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-xl shadow-blue-600/20"
                      : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-xl transition-colors",
                    activeTab === tab.id ? "bg-white/20" : "bg-[hsl(var(--card))] group-hover:bg-[hsl(var(--primary))]/10"
                  )}>
                    <tab.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-black text-sm">{tab.label}</p>
                    <p className={cn(
                      "text-[9px] uppercase tracking-wider font-bold opacity-60",
                      activeTab === tab.id ? "text-white" : "text-[hsl(var(--muted-foreground))]"
                    )}>{tab.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-8 mt-8 border-t border-[hsl(var(--border))]">
              <button
                onClick={onSignOut}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-[1.5rem] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all group"
              >
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-xl group-hover:bg-red-500 group-hover:text-white transition-all">
                  <LogOut className="w-4 h-4" />
                </div>
                <span className="font-black text-sm">Đăng xuất</span>
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-8 border-b border-[hsl(var(--border))] flex items-center justify-between bg-[hsl(var(--card))] sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-black heading-pro">
                  {activeTab === 'ui' ? 'Tùy chỉnh giao diện' : activeTab === 'account' ? 'Thông tin tài khoản' : activeTab === 'notifications' ? 'Cài đặt thông báo' : 'Sao lưu & Phục hồi'}
                </h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  {activeTab === 'ui' && 'Cá nhân hóa trải nghiệm thị giác của bạn'}
                  {activeTab === 'account' && 'Quản lý thông tin và bảo mật tài khoản'}
                  {activeTab === 'notifications' && 'Kiểm soát cách hệ thống tương tác với bạn'}
                  {activeTab === 'backup' && 'Đảm bảo an toàn tuyệt đối cho dữ liệu công việc'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-3 hover:bg-[hsl(var(--secondary))] rounded-2xl transition-all hover:rotate-90"
              >
                <X className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
              </button>
            </div>

            <div className="p-10 flex-1 overflow-y-auto custom-scrollbar">
              {activeTab === 'ui' && (
                <div className="space-y-10 max-w-2xl mx-auto">
                  {/* Theme Selection */}
                  <section className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))] flex items-center gap-2">
                      <div className="w-1 h-1 bg-blue-500 rounded-full" />
                      Chế độ hiển thị
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { id: 'light', label: 'Giao diện Sáng', icon: Sun, color: 'text-amber-500' },
                        { id: 'dark', label: 'Giao diện Tối', icon: Moon, color: 'text-indigo-500' },
                        { id: 'system', label: 'Theo hệ thống', icon: Monitor, color: 'text-slate-500' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => updatePreference('theme', item.id as any)}
                          className={cn(
                            "flex flex-col items-center gap-4 p-6 rounded-[2rem] border-2 transition-all relative group",
                            preferences.theme === item.id
                              ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5 shadow-xl shadow-blue-500/10"
                              : "border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground))]/30 bg-[hsl(var(--secondary))]/30"
                          )}
                        >
                          {preferences.theme === item.id && (
                            <div className="absolute top-3 right-3 w-5 h-5 bg-[hsl(var(--primary))] rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                          <div className={cn("p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm transition-transform group-hover:scale-110", item.color)}>
                            <item.icon className="w-8 h-8" />
                          </div>
                          <span className="text-xs font-black uppercase tracking-wider">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Sidebar Position */}
                  <section className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))] flex items-center gap-2">
                      <div className="w-1 h-1 bg-blue-500 rounded-full" />
                      Vị trí thanh điều hướng
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { id: 'left', label: 'Cố định bên trái', icon: AlignLeft },
                        { id: 'right', label: 'Cố định bên phải', icon: AlignRight },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => updatePreference('sidebarPosition', item.id as any)}
                          className={cn(
                            "flex items-center justify-between gap-4 p-6 rounded-[2rem] border-2 transition-all group",
                            preferences.sidebarPosition === item.id
                              ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5 shadow-xl shadow-blue-500/10"
                              : "border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground))]/30 bg-[hsl(var(--secondary))]/30"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 shadow-sm group-hover:rotate-12 transition-transform">
                              <item.icon className="w-6 h-6 text-blue-500" />
                            </div>
                            <span className="text-sm font-black">{item.label}</span>
                          </div>
                          {preferences.sidebarPosition === item.id && (
                            <div className="w-6 h-6 bg-[hsl(var(--primary))] rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Compact Mode */}
                  <section className="p-6 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-[2.5rem] flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-[1.5rem] shadow-lg flex items-center justify-center">
                        <Layout className="w-7 h-7 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-[hsl(var(--foreground))]">Chế độ thu gọn (Compact)</h4>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">Tối ưu hóa không gian cho màn hình nhỏ</p>
                      </div>
                    </div>
                    <button
                      onClick={() => updatePreference('isCompactMode', !preferences.isCompactMode)}
                      className={cn(
                        "w-16 h-8 rounded-full transition-all relative p-1",
                        preferences.isCompactMode ? "bg-blue-600 shadow-lg shadow-blue-600/30" : "bg-slate-300 dark:bg-slate-700"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300",
                        preferences.isCompactMode ? "translate-x-8" : "translate-x-0"
                      )} />
                    </button>
                  </section>
                </div>
              )}

              {activeTab === 'account' && (
                <div className="space-y-8 max-w-2xl mx-auto">
                  <div className="relative p-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[3rem] overflow-hidden shadow-2xl shadow-blue-600/20">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                    <div className="relative flex items-center gap-8">
                      <div className="w-24 h-24 rounded-[2rem] bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white text-4xl font-black shadow-inner">
                        {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="text-white">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-3xl font-black tracking-tight">{user?.displayName || 'Người dùng'}</h4>
                          <div className="px-2 py-0.5 bg-emerald-400 text-emerald-950 text-[8px] font-black uppercase rounded-full">Elite Member</div>
                        </div>
                        <p className="text-blue-100/80 font-medium">{user?.email}</p>
                        <div className="flex items-center gap-4 mt-4">
                          <div className="text-center">
                            <p className="text-[10px] uppercase tracking-widest text-blue-200/60 font-bold">ID Đơn vị</p>
                            <p className="text-xs font-bold">{unitId || 'Chưa xác định'}</p>
                          </div>
                          <div className="w-px h-8 bg-white/10" />
                          <div className="text-center">
                            <p className="text-[10px] uppercase tracking-widest text-blue-200/60 font-bold">Trạng thái</p>
                            <p className="text-xs font-bold">Đang hoạt động</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <button
                      onClick={() => {
                        onReloadKnowledge();
                        showToast("Đã làm mới dữ liệu tri thức.", "success");
                      }}
                      className="group flex items-center justify-between p-6 bg-[hsl(var(--secondary))]/30 border-2 border-[hsl(var(--border))] rounded-[2rem] hover:border-blue-500 transition-all"
                    >
                      <div className="flex items-center gap-5">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-2xl group-hover:rotate-180 transition-transform duration-500">
                          <RefreshCw className="w-6 h-6 text-blue-500" />
                        </div>
                        <div className="text-left">
                          <span className="block text-base font-black">Làm mới bộ não tri thức</span>
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">Đồng bộ lại toàn bộ dữ liệu từ đám mây</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[hsl(var(--muted-foreground))] group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-4 max-w-2xl mx-auto">
                  {[
                    { id: 'email', label: 'Thông báo qua Email', desc: 'Nhận cập nhật quan trọng qua hòm thư cá nhân', icon: User },
                    { id: 'push', label: 'Thông báo đẩy (Push)', desc: 'Nhận thông báo trực tiếp trên trình duyệt web', icon: Bell },
                    { id: 'sound', label: 'Âm thanh hệ thống', desc: 'Phát âm thanh khi có tin nhắn hoặc nhắc nhở', icon: Monitor },
                  ].map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-6 bg-[hsl(var(--secondary))]/30 border border-[hsl(var(--border))] rounded-[2rem] group hover:bg-[hsl(var(--secondary))]/50 transition-all">
                      <div className="flex items-center gap-5">
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                          <item.icon className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <h4 className="text-base font-black text-[hsl(var(--foreground))]">{item.label}</h4>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">{item.desc}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setNotificationSettings({ ...notificationSettings, [item.id]: !notificationSettings[item.id] })}
                        className={cn(
                          "w-14 h-7 rounded-full transition-all relative p-1",
                          notificationSettings[item.id] ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300",
                          notificationSettings[item.id] ? "translate-x-7" : "translate-x-0"
                        )} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'backup' && (
                <div className="space-y-8">
                  <div className="p-8 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border border-blue-500/20 rounded-[3rem] relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
                    <div className="flex items-start gap-6 relative">
                      <div className="p-5 bg-blue-600 rounded-[1.5rem] text-white shadow-xl shadow-blue-600/20">
                        <ShieldCheck className="w-10 h-10" />
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-blue-900 dark:text-blue-100 tracking-tight">Trung tâm Sao lưu Elite</h4>
                        <p className="text-sm text-blue-700/80 dark:text-blue-300/80 mt-2 leading-relaxed">
                          Bảo vệ thành quả làm việc của bạn bằng cách đóng gói toàn bộ dữ liệu (nhiệm vụ, lịch họp, tri thức, cài đặt) vào một tệp tin nén an toàn.
                        </p>
                        <div className="flex items-center gap-4 mt-4">
                          <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                            <Database className="w-3 h-3" />
                            Mã hóa AES-256
                          </div>
                          <div className="w-1 h-1 bg-blue-300 rounded-full" />
                          <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                            <RefreshCw className="w-3 h-3" />
                            Phục hồi 1-Chạm
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Snapshot Action */}
                    <div className="p-8 bg-white dark:bg-slate-900 border-2 border-[hsl(var(--border))] rounded-[3rem] space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600">
                          <Brain className="w-6 h-6" />
                        </div>
                        <div>
                          <h5 className="font-black text-sm uppercase tracking-widest">Ảnh chụp hệ thống</h5>
                          <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Lưu trạng thái hiện tại lên đám mây</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <input 
                          type="text"
                          placeholder="Tên bản sao lưu (VD: Trước khi cập nhật...)"
                          value={snapshotLabel}
                          onChange={(e) => setSnapshotLabel(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <button
                          onClick={handleSaveSnapshot}
                          disabled={isBackingUp || !snapshotLabel.trim()}
                          className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                          {isBackingUp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Lưu ảnh chụp
                        </button>
                      </div>
                    </div>

                    {/* Snapshot List */}
                    <div className="p-8 bg-white dark:bg-slate-900 border-2 border-[hsl(var(--border))] rounded-[3rem] flex flex-col">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600">
                            <History className="w-6 h-6" />
                          </div>
                          <div>
                            <h5 className="font-black text-sm uppercase tracking-widest">Lịch sử sao lưu</h5>
                            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Khôi phục nhanh từ đám mây</p>
                          </div>
                        </div>
                        <button onClick={fetchSnapshots} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                          <RefreshCw className={cn("w-4 h-4 text-slate-400", isLoadingSnapshots && "animate-spin")} />
                        </button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 max-h-[200px]">
                        {snapshots.length === 0 ? (
                          <div className="text-center py-8 opacity-30 italic text-xs">Chưa có bản sao lưu nào</div>
                        ) : (
                          snapshots.map((s) => (
                            <div key={s.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl flex items-center justify-between group">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-black truncate">{s.label}</p>
                                <p className="text-[9px] text-slate-400">{s.createdAt?.toDate ? s.createdAt.toDate().toLocaleString('vi-VN') : 'Vừa xong'}</p>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleRestoreFromSnapshot(s)}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                  title="Khôi phục"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteSnapshot(s.id)}
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                                  title="Xóa"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Backup Action */}
                    <button
                      onClick={handleCreateBackup}
                      disabled={isBackingUp}
                      className="flex flex-col items-center gap-6 p-10 bg-white dark:bg-slate-900 border-2 border-[hsl(var(--border))] rounded-[3rem] hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 transition-all group disabled:opacity-50"
                    >
                      <div className="p-6 bg-blue-50 dark:bg-blue-900/30 rounded-[2rem] group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                        <Download className={cn("w-12 h-12 text-blue-500", isBackingUp && "animate-bounce")} />
                      </div>
                      <div className="text-center">
                        <span className="block text-xl font-black mb-1">Tạo bản sao lưu</span>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">Đóng gói dữ liệu thành tệp .json</span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={cn("h-full bg-blue-500 transition-all duration-1000", isBackingUp ? "w-full" : "w-0")} />
                      </div>
                    </button>
 
                    {/* Restore Action */}
                    <label className="flex flex-col items-center gap-6 p-10 bg-white dark:bg-slate-900 border-2 border-[hsl(var(--border))] rounded-[3rem] hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all group cursor-pointer disabled:opacity-50">
                      <input 
                        type="file" 
                        accept=".json" 
                        className="hidden" 
                        onChange={handleRestoreBackup}
                        disabled={isRestoring}
                      />
                      <div className="p-6 bg-emerald-50 dark:bg-emerald-900/30 rounded-[2rem] group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500">
                        <Upload className={cn("w-12 h-12 text-emerald-500", isRestoring && "animate-pulse")} />
                      </div>
                      <div className="text-center">
                        <span className="block text-xl font-black mb-1">Khôi phục dữ liệu</span>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">Ghi đè dữ liệu từ tệp sao lưu</span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={cn("h-full bg-emerald-500 transition-all duration-1000", isRestoring ? "w-full" : "w-0")} />
                      </div>
                    </label>
                  </div>

                  <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-[2rem]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                      <p className="text-xs text-amber-700 dark:text-amber-300 font-black uppercase tracking-[0.2em]">Lưu ý quan trọng</p>
                    </div>
                    <ul className="text-xs text-amber-800/70 dark:text-amber-400/70 space-y-2 leading-relaxed">
                      <li className="flex gap-2">
                        <span className="text-amber-500 font-bold">•</span>
                        Bản sao lưu chứa thông tin cá nhân và dữ liệu công việc nhạy cảm. Hãy bảo quản tệp tin cẩn thận.
                      </li>
                      <li className="flex gap-2">
                        <span className="text-amber-500 font-bold">•</span>
                        Khôi phục sẽ thay thế hoàn toàn dữ liệu hiện tại trên đám mây. Hành động này không thể hoàn tác.
                      </li>
                      <li className="flex gap-2">
                        <span className="text-amber-500 font-bold">•</span>
                        Nên thực hiện sao lưu định kỳ sau mỗi tuần làm việc hoặc trước khi thực hiện các thay đổi lớn.
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-[hsl(var(--secondary))]/30 border-t border-[hsl(var(--border))] flex justify-end gap-3">
              <button
                onClick={onClose}
                className="btn-pro btn-pro-primary px-16 py-4 rounded-2xl text-sm font-black shadow-xl shadow-blue-600/20"
              >
                Hoàn tất cài đặt
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
