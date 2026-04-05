import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Moon, Sun, Monitor, Layout, Type, AlignLeft, AlignRight, Check, User, Bell, LogOut, RefreshCw } from 'lucide-react';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { cn } from '../lib/utils';

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
  const [activeTab, setActiveTab] = useState<'ui' | 'account' | 'notifications'>('ui');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[hsl(var(--card))] w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-[hsl(var(--border))] overflow-hidden flex flex-col md:flex-row"
        >
          {/* Sidebar Tabs */}
          <div className="w-full md:w-64 bg-[hsl(var(--secondary))]/50 border-r border-[hsl(var(--border))] p-6 space-y-2">
            <div className="mb-8 px-2">
              <h2 className="text-xl font-black heading-pro">Cài đặt</h2>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-widest">Tùy chỉnh hệ thống</p>
            </div>
            
            {[
              { id: 'ui', label: 'Giao diện', icon: Layout },
              { id: 'account', label: 'Tài khoản', icon: User },
              { id: 'notifications', label: 'Thông báo', icon: Bell },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm",
                  activeTab === tab.id
                    ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-lg shadow-blue-600/20"
                    : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}

            <div className="pt-8 mt-8 border-t border-[hsl(var(--border))]">
              <button
                onClick={onSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all font-bold text-sm"
              >
                <LogOut className="w-4 h-4" />
                Đăng xuất
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col min-h-[500px]">
            <div className="p-8 border-b border-[hsl(var(--border))] flex items-center justify-between">
              <h3 className="text-lg font-black heading-pro">
                {activeTab === 'ui' ? 'Tùy chỉnh giao diện' : activeTab === 'account' ? 'Thông tin tài khoản' : 'Cài đặt thông báo'}
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[hsl(var(--secondary))] rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
              </button>
            </div>

            <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
              {activeTab === 'ui' && (
                <div className="space-y-8">
                  {/* Theme Selection */}
                  <section className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">Chế độ hiển thị</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'light', label: 'Sáng', icon: Sun },
                        { id: 'dark', label: 'Tối', icon: Moon },
                        { id: 'system', label: 'Hệ thống', icon: Monitor },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => updatePreference('theme', item.id as any)}
                          className={cn(
                            "flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all",
                            preferences.theme === item.id
                              ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5 text-[hsl(var(--primary))]"
                              : "border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground))]/30 text-[hsl(var(--muted-foreground))]"
                          )}
                        >
                          <item.icon className="w-6 h-6" />
                          <span className="text-xs font-bold">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Sidebar Position */}
                  <section className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">Vị trí thanh điều hướng</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'left', label: 'Bên trái', icon: AlignLeft },
                        { id: 'right', label: 'Bên phải', icon: AlignRight },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => updatePreference('sidebarPosition', item.id as any)}
                          className={cn(
                            "flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all",
                            preferences.sidebarPosition === item.id
                              ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5 text-[hsl(var(--primary))]"
                              : "border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground))]/30 text-[hsl(var(--muted-foreground))]"
                          )}
                        >
                          <item.icon className="w-5 h-5" />
                          <span className="text-xs font-bold">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Compact Mode */}
                  <section className="flex items-center justify-between p-4 bg-[hsl(var(--secondary))] rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[hsl(var(--card))] rounded-xl">
                        <Layout className="w-5 h-5 text-[hsl(var(--primary))]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[hsl(var(--foreground))]">Chế độ thu gọn</h4>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Tối ưu không gian hiển thị</p>
                      </div>
                    </div>
                    <button
                      onClick={() => updatePreference('isCompactMode', !preferences.isCompactMode)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        preferences.isCompactMode ? "bg-[hsl(var(--primary))]" : "bg-slate-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                        preferences.isCompactMode ? "left-7" : "left-1"
                      )} />
                    </button>
                  </section>
                </div>
              )}

              {activeTab === 'account' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-6 bg-[hsl(var(--secondary))] rounded-3xl">
                    <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--primary))] flex items-center justify-center text-white text-2xl font-black">
                      {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-[hsl(var(--foreground))]">{user?.displayName || 'Người dùng'}</h4>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">{user?.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => {
                        onReloadKnowledge();
                        showToast("Đã làm mới dữ liệu tri thức.", "success");
                      }}
                      className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-[hsl(var(--border))] rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <RefreshCw className="w-5 h-5 text-blue-500" />
                        <span className="text-sm font-bold">Làm mới bộ não tri thức</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-4">
                  {[
                    { id: 'email', label: 'Thông báo qua Email', desc: 'Nhận cập nhật quan trọng qua hòm thư' },
                    { id: 'push', label: 'Thông báo đẩy', desc: 'Nhận thông báo trực tiếp trên trình duyệt' },
                    { id: 'sound', label: 'Âm thanh thông báo', desc: 'Phát âm thanh khi có tin nhắn mới' },
                  ].map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-[hsl(var(--secondary))] rounded-2xl">
                      <div>
                        <h4 className="text-sm font-bold text-[hsl(var(--foreground))]">{item.label}</h4>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => setNotificationSettings({ ...notificationSettings, [item.id]: !notificationSettings[item.id] })}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative",
                          notificationSettings[item.id] ? "bg-[hsl(var(--primary))]" : "bg-slate-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                          notificationSettings[item.id] ? "left-7" : "left-1"
                        )} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-8 bg-[hsl(var(--secondary))]/30 border-t border-[hsl(var(--border))] flex justify-end">
              <button
                onClick={onClose}
                className="btn-pro btn-pro-primary px-12"
              >
                Hoàn tất
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
