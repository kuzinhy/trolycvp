import { Task, Meeting, Event } from '../constants';

export interface ScheduleItem {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  priority: 'low' | 'medium' | 'high';
}

export const analyzeSchedule = (items: ScheduleItem[]) => {
  const conflicts = [];
  // Phân loại độ ưu tiên
  const priorityMap = { 'high': 3, 'medium': 2, 'low': 1 };

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (
        items[i].startTime < items[j].endTime &&
        items[j].startTime < items[i].endTime
      ) {
        conflicts.push({ item1: items[i], item2: items[j] });
      }
    }
  }
  return conflicts;
};

export const suggestRescheduling = (conflicts: any[]) => {
  const priorityMap = { 'high': 3, 'medium': 2, 'low': 1 };

  return conflicts.map(conflict => {
    const p1 = priorityMap[conflict.item1.priority] || 0;
    const p2 = priorityMap[conflict.item2.priority] || 0;

    // AI đề xuất dời công việc có độ ưu tiên thấp hơn
    if (p1 >= p2) {
      return {
        conflict,
        suggestion: `AI đề xuất: Dời "${conflict.item2.title}" (Ưu tiên: ${conflict.item2.priority}) sang khung giờ khác để ưu tiên "${conflict.item1.title}" (Ưu tiên: ${conflict.item1.priority})`
      };
    } else {
      return {
        conflict,
        suggestion: `AI đề xuất: Dời "${conflict.item1.title}" (Ưu tiên: ${conflict.item1.priority}) sang khung giờ khác để ưu tiên "${conflict.item2.title}" (Ưu tiên: ${conflict.item2.priority})`
      };
    }
  });
};

export const calculateBufferTime = (item: ScheduleItem) => {
  // Simple buffer logic
  return 15; // 15 minutes buffer
};
