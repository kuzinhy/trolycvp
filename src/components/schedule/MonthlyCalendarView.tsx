import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  User, 
  MapPin, 
  Sun, 
  Moon,
  AlertTriangle
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addMonths, 
  subMonths, 
  addDays, 
  isSameMonth, 
  isSameDay, 
  parseISO 
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { ScheduleItem, determineSession, getItemBadgeStyle } from './scheduleUtils';

interface MonthlyCalendarViewProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  items: ScheduleItem[];
  conflictMap: Map<string, string[]>;
  onSelectDay: (dateStr: string) => void;
  onAddItem: (dateStr: string, session: 'morning' | 'afternoon') => void;
  onEditItem: (item: ScheduleItem) => void;
}

export const MonthlyCalendarView: React.FC<MonthlyCalendarViewProps> = ({
  currentDate,
  onDateChange,
  items,
  conflictMap,
  onSelectDay,
  onAddItem,
  onEditItem
}) => {
  const [selectedDay, setSelectedDay] = useState<string>(format(currentDate, 'yyyy-MM-dd'));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="w-full space-y-4">
      {/* Month Navigator Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-700">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 uppercase">
              Tháng {format(currentDate, 'MM / yyyy')}
            </h3>
            <p className="text-xs text-slate-500">
              Tổng số {items.filter(it => it.date.startsWith(format(currentDate, 'yyyy-MM'))).length} cuộc họp & sự kiện trong tháng
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onDateChange(new Date())}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={() => onDateChange(subMonths(currentDate, 1))}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors"
            title="Tháng trước"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDateChange(addMonths(currentDate, 1))}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors"
            title="Tháng sau"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Monthly Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Day Name Header */}
        <div className="grid grid-cols-7 bg-slate-800 text-white text-center text-xs font-extrabold uppercase py-3 divide-x divide-slate-700">
          <div>Thứ Hai</div>
          <div>Thứ Ba</div>
          <div>Thứ Tư</div>
          <div>Thứ Năm</div>
          <div>Thứ Sáu</div>
          <div className="text-amber-300">Thứ Bảy</div>
          <div className="text-rose-300">Chủ Nhật</div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200 bg-slate-100">
          {days.map((d, index) => {
            const dayStr = format(d, 'yyyy-MM-dd');
            const isCurrentMonth = isSameMonth(d, monthStart);
            const isToday = dayStr === todayStr;
            const isSelected = dayStr === selectedDay;
            const dayItems = items.filter(it => it.date === dayStr && it.status !== 'cancelled');

            return (
              <div
                key={dayStr}
                onClick={() => setSelectedDay(dayStr)}
                className={cn(
                  "min-h-[100px] sm:min-h-[120px] p-2 transition-all flex flex-col justify-between cursor-pointer",
                  isCurrentMonth ? "bg-white" : "bg-slate-50 text-slate-400",
                  isToday && "bg-rose-50/40 ring-1 ring-rose-400 inset-0",
                  isSelected && "bg-blue-50/40"
                )}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className={cn(
                    "text-xs font-black w-6 h-6 rounded-full flex items-center justify-center",
                    isToday ? "bg-rose-600 text-white" : (isCurrentMonth ? "text-slate-800" : "text-slate-400")
                  )}>
                    {format(d, 'd')}
                  </span>

                  {dayItems.length > 0 && (
                    <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[10px] font-extrabold rounded-md">
                      {dayItems.length}
                    </span>
                  )}
                </div>

                {/* Day Items Preview */}
                <div className="flex-1 space-y-1 overflow-y-auto max-h-[70px] custom-scrollbar">
                  {dayItems.slice(0, 2).map(it => {
                    const badgeStyle = getItemBadgeStyle(it);
                    return (
                      <div
                        key={it.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditItem(it);
                        }}
                        className={cn(
                          "px-1.5 py-0.5 rounded border text-[10px] font-medium truncate flex items-center gap-1",
                          badgeStyle.bg,
                          badgeStyle.border,
                          badgeStyle.textColor
                        )}
                        title={`${it.time || ''} - ${it.name}`}
                      >
                        <span className="font-bold shrink-0">{it.time || '08:00'}</span>
                        <span className="truncate">{it.name}</span>
                      </div>
                    );
                  })}

                  {dayItems.length > 2 && (
                    <div 
                      onClick={() => onSelectDay(dayStr)}
                      className="text-[10px] text-blue-600 font-bold text-center hover:underline cursor-pointer"
                    >
                      +{dayItems.length - 2} cuộc họp khác
                    </div>
                  )}
                </div>

                {/* Quick Add Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddItem(dayStr, 'morning');
                  }}
                  className="mt-1 w-full py-0.5 border border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 rounded text-[9px] font-semibold text-slate-400 hover:text-blue-600 flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Plus size={10} /> Thêm
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
