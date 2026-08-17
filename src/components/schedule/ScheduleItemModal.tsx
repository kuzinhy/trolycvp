import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Save, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User, 
  Users, 
  FileText, 
  AlertTriangle, 
  Sparkles,
  Bell,
  CheckCircle2,
  Tag,
  ShieldAlert,
  ListTodo
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { STAFF_LIST } from '../../constants';
import { 
  ScheduleItem, 
  PREPARING_UNITS, 
  POPULAR_LOCATIONS, 
  SCHEDULE_CATEGORIES, 
  determineSession 
} from './scheduleUtils';

interface ScheduleItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<ScheduleItem>) => Promise<void>;
  initialItem?: Partial<ScheduleItem> | null;
  defaultDate?: string;
  defaultSession?: 'morning' | 'afternoon';
  onConvertToTask?: (item: ScheduleItem) => void;
}

const PARTICIPANT_PRESETS = [
  'Thường trực Đảng ủy',
  'Ban Thường vụ Đảng ủy',
  'Ban Chấp hành Đảng bộ',
  'Lãnh đạo HĐND, UBND phường',
  'Các Ban Xây dựng Đảng & VP',
  'Khối Vận - MTTQ & Đoàn thể',
  'Bí thư các Chi bộ trực thuộc',
  'Cấp ủy & Toàn thể Đảng viên'
];

export const ScheduleItemModal: React.FC<ScheduleItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
  defaultDate,
  defaultSession = 'morning',
  onConvertToTask
}) => {
  const [formData, setFormData] = useState<Partial<ScheduleItem>>({
    name: '',
    date: defaultDate || format(new Date(), 'yyyy-MM-dd'),
    time: defaultSession === 'morning' ? '08:00' : '14:00',
    endTime: '',
    session: defaultSession,
    chairperson: 'Nguyễn Minh Huy',
    location: 'Phòng họp 1 (Thường trực)',
    participants: '',
    preparingUnit: 'Văn phòng Đảng ủy',
    category: 'standing',
    priority: 'medium',
    description: '',
    status: 'scheduled',
    reminderMinutes: 30
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialItem) {
      setFormData({
        ...initialItem,
        date: initialItem.date || defaultDate || format(new Date(), 'yyyy-MM-dd'),
        time: initialItem.time || (defaultSession === 'morning' ? '08:00' : '14:00'),
        session: initialItem.session || determineSession(initialItem.time || ''),
        status: initialItem.status || 'scheduled'
      });
    } else {
      setFormData({
        name: '',
        date: defaultDate || format(new Date(), 'yyyy-MM-dd'),
        time: defaultSession === 'morning' ? '08:00' : '14:00',
        endTime: '',
        session: defaultSession,
        chairperson: 'Nguyễn Minh Huy',
        location: 'Phòng họp 1 (Thường trực)',
        participants: 'Thường trực Đảng ủy, Văn phòng',
        preparingUnit: 'Văn phòng Đảng ủy',
        category: 'standing',
        priority: 'medium',
        description: '',
        status: 'scheduled',
        reminderMinutes: 30
      });
    }
  }, [initialItem, defaultDate, defaultSession, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    setIsSubmitting(true);
    try {
      const session = formData.session || determineSession(formData.time || '08:00');
      await onSave({
        ...formData,
        session
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addParticipantPreset = (tag: string) => {
    setFormData(prev => {
      const current = prev.participants || '';
      if (!current) return { ...prev, participants: tag };
      if (current.includes(tag)) return prev;
      return { ...prev, participants: `${current}, ${tag}` };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden my-8"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-600 flex items-center justify-center text-white">
              <CalendarIcon size={16} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-tight">
                {initialItem?.id ? 'Chỉnh sửa lịch công tác' : 'Tạo mới lịch làm việc'}
              </h3>
              <p className="text-[11px] text-slate-300">
                Phân hệ Quản lý & Điều hành Lịch Thường trực Đảng ủy
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Tiêu đề cuộc họp */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
              Nội dung cuộc họp / Chương trình làm việc <span className="text-rose-600">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ví dụ: Họp Thường trực Đảng ủy duyệt nội dung văn kiện Đại hội..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            />
          </div>

          {/* Ngày & Thời gian & Buổi */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Ngày làm việc</label>
              <input
                type="date"
                required
                value={formData.date || ''}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Giờ bắt đầu</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={formData.time || '08:00'}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  placeholder="08:00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Phân loại buổi</label>
              <select
                value={formData.session || 'morning'}
                onChange={(e) => setFormData({ ...formData, session: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                <option value="morning">Buổi Sáng (07:30 - 11:30)</option>
                <option value="afternoon">Buổi Chiều (13:30 - 17:30)</option>
                <option value="evening">Buổi Tối</option>
                <option value="all-day">Cả ngày</option>
              </select>
            </div>
          </div>

          {/* Đồng chí Chủ trì */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Đồng chí Chủ trì</label>
            <input
              type="text"
              value={formData.chairperson || ''}
              onChange={(e) => setFormData({ ...formData, chairperson: e.target.value })}
              placeholder="Chọn hoặc nhập tên đồng chí chủ trì..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
            {/* Quick staff chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {STAFF_LIST.slice(0, 6).map((staff) => (
                <button
                  key={staff}
                  type="button"
                  onClick={() => setFormData({ ...formData, chairperson: staff })}
                  className={cn(
                    "px-2.5 py-0.5 rounded-lg text-[11px] font-medium border transition-colors",
                    formData.chairperson === staff 
                      ? "bg-rose-100 text-rose-800 border-rose-300 font-bold" 
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  {staff}
                </button>
              ))}
            </div>
          </div>

          {/* Địa điểm & Cơ quan chuẩn bị */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Địa điểm</label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Phòng họp 1..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {POPULAR_LOCATIONS.slice(0, 4).map(loc => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setFormData({ ...formData, location: loc })}
                    className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    {loc.split('(')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Cơ quan chuẩn bị</label>
              <input
                type="text"
                value={formData.preparingUnit || ''}
                onChange={(e) => setFormData({ ...formData, preparingUnit: e.target.value })}
                placeholder="Văn phòng Đảng ủy..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {PREPARING_UNITS.slice(0, 4).map(unit => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => setFormData({ ...formData, preparingUnit: unit })}
                    className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    {unit.replace('Đảng ủy', '')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Thành phần tham dự */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Thành phần tham dự</label>
            <input
              type="text"
              value={formData.participants || ''}
              onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
              placeholder="Thường trực Đảng ủy, Văn phòng, các đơn vị liên quan..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
            {/* Participant Quick tags */}
            <div className="flex flex-wrap gap-1 pt-1">
              {PARTICIPANT_PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => addParticipantPreset(preset)}
                  className="px-2 py-0.5 rounded-md text-[10px] bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Tính chất & Mức độ ưu tiên */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Phân loại cuộc họp</label>
              <select
                value={formData.category || 'standing'}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                {SCHEDULE_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Mức độ ưu tiên</label>
              <select
                value={formData.priority || 'medium'}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                <option value="low">Bình thường</option>
                <option value="medium">Quan trọng / Thường lệ</option>
                <option value="high">Hỏa tốc / Đột xuất / Trọng tâm</option>
              </select>
            </div>
          </div>

          {/* Ghi chú & Tài liệu chuẩn bị */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">Ghi chú & Yêu cầu tài liệu</label>
            <textarea
              rows={2}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Yêu cầu gửi tài liệu trước ngày họp, trang phục, các điểm lưu ý..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              {initialItem?.id && onConvertToTask && (
                <button
                  type="button"
                  onClick={() => onConvertToTask(formData as ScheduleItem)}
                  className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <ListTodo size={14} />
                  <span>Giao việc từ cuộc họp này</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Save size={14} />
                <span>{isSubmitting ? 'Đang lưu...' : (initialItem?.id ? 'Cập nhật lịch' : 'Lưu lịch làm việc')}</span>
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
