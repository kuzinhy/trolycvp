import { format, parseISO, startOfWeek, addDays, isSameDay, isWithinInterval, startOfDay, endOfDay, isAfter, isBefore } from 'date-fns';
import { vi } from 'date-fns/locale';
import { STAFF_LIST } from '../../constants';

export interface ScheduleItem {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  endTime?: string;
  session?: 'morning' | 'afternoon' | 'all-day' | 'evening';
  location: string;
  chairperson?: string;
  participants?: string;
  preparingUnit?: string;
  category?: 'standing' | 'executive' | 'party_cell' | 'grassroots' | 'citizen' | 'online' | 'general' | 'other';
  priority?: 'low' | 'medium' | 'high';
  description?: string;
  references?: string[];
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';
  type?: 'meeting' | 'event' | 'task';
  reminderMinutes?: number;
  reminderType?: 'minutes' | 'hours' | 'days' | 'none';
  reminderValue?: number;
}

export const PREPARING_UNITS = [
  'Văn phòng Đảng ủy',
  'Ban Tổ chức Đảng ủy',
  'Ban Tuyên giáo Đảng ủy',
  'Ban Dân vận Đảng ủy',
  'Ủy ban Kiểm tra Đảng ủy',
  'Khối Vận - MTTQ & Đoàn thể',
  'UBND phường',
  'Công an phường',
  'Ban Chỉ huy Quân sự phường',
  'Chi bộ cơ sở / Khóm phố'
];

export const POPULAR_LOCATIONS = [
  'Phòng họp 1 (Thường trực)',
  'Phòng họp 2',
  'Hội trường A (Đảng bộ)',
  'Hội trường B',
  'Trụ sở Tiếp công dân',
  'Phòng làm việc Bí thư',
  'Phòng làm việc Thường trực',
  'Tại cơ sở / Khóm phố',
  'Hội nghị Trực tuyến (Zoom/Teams)'
];

export const SCHEDULE_CATEGORIES: { id: string; label: string; color: string; bg: string; border: string }[] = [
  { id: 'standing', label: 'Họp Thường trực Đảng ủy', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
  { id: 'executive', label: 'Họp Ban Thường vụ / BCH', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  { id: 'party_cell', label: 'Sinh hoạt Chi bộ / Khối Đảng', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  { id: 'grassroots', label: 'Đi cơ sở / Giám sát / Kiểm tra', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { id: 'citizen', label: 'Tiếp công dân / Tiếp xúc cử tri', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  { id: 'online', label: 'Hội nghị Trực tuyến / Tập huấn', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  { id: 'general', label: 'Lịch công tác thường lệ', color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' }
];

export function determineSession(timeStr: string): 'morning' | 'afternoon' | 'evening' {
  if (!timeStr) return 'morning';
  const match = timeStr.match(/(\d{1,2})[:hH](\d{2})?/);
  if (match) {
    const hour = parseInt(match[1], 10);
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }
  const lower = timeStr.toLowerCase();
  if (lower.includes('chiều') || lower.includes('tối')) return 'afternoon';
  return 'morning';
}

export function getItemBadgeStyle(item: ScheduleItem) {
  const isUrgent = item.priority === 'high' || (item.name && (item.name.toLowerCase().includes('khẩn') || item.name.toLowerCase().includes('đột xuất')));
  if (isUrgent) {
    return {
      border: 'border-rose-300',
      bg: 'bg-rose-50/90',
      badgeBg: 'bg-rose-600 text-white',
      badgeLabel: 'Khẩn / Đột xuất',
      accent: 'border-l-4 border-l-rose-600',
      textColor: 'text-rose-950'
    };
  }

  const name = (item.name || '').toLowerCase();
  if (item.category === 'standing' || name.includes('thường trực') || name.includes('bí thư')) {
    return {
      border: 'border-red-200',
      bg: 'bg-red-50/70',
      badgeBg: 'bg-red-600 text-white',
      badgeLabel: 'Thường trực Đảng ủy',
      accent: 'border-l-4 border-l-red-600',
      textColor: 'text-red-950'
    };
  }

  if (item.category === 'executive' || name.includes('thường vụ') || name.includes('ban chấp hành')) {
    return {
      border: 'border-orange-200',
      bg: 'bg-orange-50/70',
      badgeBg: 'bg-orange-600 text-white',
      badgeLabel: 'Ban Thường vụ',
      accent: 'border-l-4 border-l-orange-600',
      textColor: 'text-orange-950'
    };
  }

  if (item.category === 'grassroots' || name.includes('kiểm tra') || name.includes('giám sát') || name.includes('cơ sở')) {
    return {
      border: 'border-emerald-200',
      bg: 'bg-emerald-50/70',
      badgeBg: 'bg-emerald-600 text-white',
      badgeLabel: 'Cơ sở / Giám sát',
      accent: 'border-l-4 border-l-emerald-600',
      textColor: 'text-emerald-950'
    };
  }

  if (item.category === 'citizen' || name.includes('tiếp dân') || name.includes('công dân') || name.includes('cử tri')) {
    return {
      border: 'border-blue-200',
      bg: 'bg-blue-50/70',
      badgeBg: 'bg-blue-600 text-white',
      badgeLabel: 'Tiếp công dân',
      accent: 'border-l-4 border-l-blue-600',
      textColor: 'text-blue-950'
    };
  }

  if (item.category === 'online' || name.includes('trực tuyến') || name.includes('tập huấn') || name.includes('chuyên đề')) {
    return {
      border: 'border-purple-200',
      bg: 'bg-purple-50/70',
      badgeBg: 'bg-purple-600 text-white',
      badgeLabel: 'Trực tuyến / Tập huấn',
      accent: 'border-l-4 border-l-purple-600',
      textColor: 'text-purple-950'
    };
  }

  return {
    border: 'border-slate-200',
    bg: 'bg-slate-50/80',
    badgeBg: 'bg-slate-700 text-white',
    badgeLabel: 'Lịch công tác',
    accent: 'border-l-4 border-l-slate-600',
    textColor: 'text-slate-900'
  };
}

/**
 * Kiểm tra các xung đột lịch (cùng 1 lãnh đạo chủ trì nhiều cuộc họp cùng giờ hoặc cùng phòng họp bị trùng)
 */
export function detectScheduleConflicts(items: ScheduleItem[]): Map<string, string[]> {
  const conflictMap = new Map<string, string[]>();

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];

      if (a.date !== b.date) continue;
      if (a.status === 'cancelled' || b.status === 'cancelled') continue;

      // Check time overlap
      const sessionA = a.session || determineSession(a.time);
      const sessionB = b.session || determineSession(b.time);
      const sameSession = sessionA === sessionB;
      const sameExactTime = a.time && b.time && a.time.trim() === b.time.trim();

      // Check Chairperson conflict
      if (a.chairperson && b.chairperson && a.chairperson.trim() === b.chairperson.trim() && (sameExactTime || sameSession)) {
        const msg = `Trùng lịch đồng chí chủ trì: ${a.chairperson} (${a.time} - ${b.time})`;
        if (!conflictMap.has(a.id)) conflictMap.set(a.id, []);
        if (!conflictMap.has(b.id)) conflictMap.set(b.id, []);
        conflictMap.get(a.id)!.push(msg);
        conflictMap.get(b.id)!.push(msg);
      }

      // Check Location conflict (nếu là phòng họp cụ thể)
      if (a.location && b.location && a.location.trim() === b.location.trim() && a.location !== 'Tại cơ sở' && a.location !== 'Trực tuyến' && (sameExactTime || sameSession)) {
        const msg = `Trùng địa điểm ${a.location} lúc ${a.time}`;
        if (!conflictMap.has(a.id)) conflictMap.set(a.id, []);
        if (!conflictMap.has(b.id)) conflictMap.set(b.id, []);
        conflictMap.get(a.id)!.push(msg);
        conflictMap.get(b.id)!.push(msg);
      }
    }
  }

  return conflictMap;
}

/**
 * Tạo chuỗi văn bản thông báo lịch tuần chuẩn để copy gửi Zalo / Văn bản nội bộ
 */
export function formatWeeklyScheduleText(items: ScheduleItem[], weekStart: Date): string {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekNumber = format(weekStart, 'w');
  const fromDate = format(weekStart, 'dd/MM/yyyy');
  const toDate = format(addDays(weekStart, 6), 'dd/MM/yyyy');

  let text = `📋 LỊCH LÀM VIỆC TUẦN THƯỜNG TRỰC ĐẢNG ỦY (TUẦN ${weekNumber})\n`;
  text += `(Từ ngày ${fromDate} đến ngày ${toDate})\n`;
  text += `═══════════════════════════════════════════\n\n`;

  weekDays.forEach((day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayLabel = format(day, 'EEEE, dd/MM/yyyy', { locale: vi });
    const dayItems = items.filter(it => it.date === dayStr && it.status !== 'cancelled');

    text += `📌 ${dayLabel.toUpperCase()}:\n`;

    if (dayItems.length === 0) {
      text += `   - Làm việc bình thường theo chương trình công tác.\n\n`;
      return;
    }

    const morningItems = dayItems.filter(it => (it.session || determineSession(it.time)) === 'morning');
    const afternoonItems = dayItems.filter(it => (it.session || determineSession(it.time)) === 'afternoon');
    const otherItems = dayItems.filter(it => {
      const s = it.session || determineSession(it.time);
      return s !== 'morning' && s !== 'afternoon';
    });

    if (morningItems.length > 0) {
      text += `   ☀️ BUỔI SÁNG:\n`;
      morningItems.forEach(it => {
        text += `   • [${it.time || '08:00'}] ${it.name}\n`;
        if (it.chairperson) text += `     - Chủ trì: ${it.chairperson}\n`;
        if (it.location) text += `     - Địa điểm: ${it.location}\n`;
        if (it.participants) text += `     - Thành phần: ${it.participants}\n`;
        if (it.preparingUnit) text += `     - Chuẩn bị: ${it.preparingUnit}\n`;
      });
    }

    if (afternoonItems.length > 0) {
      text += `   🌙 BUỔI CHIỀU:\n`;
      afternoonItems.forEach(it => {
        text += `   • [${it.time || '14:00'}] ${it.name}\n`;
        if (it.chairperson) text += `     - Chủ trì: ${it.chairperson}\n`;
        if (it.location) text += `     - Địa điểm: ${it.location}\n`;
        if (it.participants) text += `     - Thành phần: ${it.participants}\n`;
        if (it.preparingUnit) text += `     - Chuẩn bị: ${it.preparingUnit}\n`;
      });
    }

    if (otherItems.length > 0) {
      otherItems.forEach(it => {
        text += `   • [${it.time || 'Cả ngày'}] ${it.name}\n`;
        if (it.chairperson) text += `     - Chủ trì: ${it.chairperson}\n`;
        if (it.location) text += `     - Địa điểm: ${it.location}\n`;
      });
    }

    text += `\n`;
  });

  text += `═══════════════════════════════════════════\n`;
  text += `(Lịch công tác có thể thay đổi tùy tình hình thực tế theo chỉ đạo của Thường trực Đảng ủy).`;

  return text;
}
