import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  MapPin, 
  User, 
  Users, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Edit3, 
  Trash2, 
  Calendar as CalendarIcon,
  Sparkles,
  ArrowRight,
  ListTodo,
  Share2,
  Check,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { format, addDays, isSameDay, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { ScheduleItem, determineSession, getItemBadgeStyle } from './scheduleUtils';

interface ScheduleTimelineViewProps {
  weekStart: Date;
  items: ScheduleItem[];
  conflictMap: Map<string, string[]>;
  onAddItem: (dateStr: string, session: 'morning' | 'afternoon') => void;
  onEditItem: (item: ScheduleItem) => void;
  onDeleteItem: (id: string) => void;
  onConvertToTask?: (item: ScheduleItem) => void;
  onToggleComplete?: (item: ScheduleItem) => void;
}

export const ScheduleTimelineView: React.FC<ScheduleTimelineViewProps> = ({
  weekStart,
  items,
  conflictMap,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onConvertToTask,
  onToggleComplete
}) => {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [selectedDayStr, setSelectedDayStr] = useState<string>(
    items.some(it => it.date === todayStr) ? todayStr : format(weekStart, 'yyyy-MM-dd')
  );

  const activeDayItems = items
    .filter(it => it.date === selectedDayStr && it.status !== 'cancelled')
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  return (
    <div className="w-full space-y-6">
      {/* Day Selector Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {weekDays.map((day) => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const isSelected = dayStr === selectedDayStr;
          const isToday = dayStr === todayStr;
          const count = items.filter(it => it.date === dayStr && it.status !== 'cancelled').length;

          return (
            <button
              key={dayStr}
              type="button"
              onClick={() => setSelectedDayStr(dayStr)}
              className={cn(
                "flex flex-col items-center justify-center min-w-[110px] sm:min-w-[130px] p-3 rounded-2xl border transition-all cursor-pointer select-none",
                isSelected 
                  ? "bg-slate-900 text-white border-slate-900 shadow-md scale-[1.02]" 
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300",
                isToday && !isSelected && "border-rose-400 bg-rose-50/40 text-rose-900"
              )}
            >
              <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider opacity-80">
                <span>{format(day, 'EEEE', { locale: vi })}</span>
                {isToday && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                )}
              </div>
              <div className="text-base sm:text-lg font-black tracking-tight mt-0.5">
                {format(day, 'dd/MM/yyyy')}
              </div>
              <div className={cn(
                "mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold",
                isSelected ? "bg-slate-800 text-slate-200" : (count > 0 ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-400")
              )}>
                {count > 0 ? `${count} cuộc họp` : 'Không có lịch'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Selected Day Container */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-6">
        {/* Header of the Day */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <CalendarIcon size={20} className="text-rose-600" />
              <span>
                Lịch chi tiết: {format(parseISO(selectedDayStr), 'EEEE, dd/MM/yyyy', { locale: vi })}
              </span>
              {selectedDayStr === todayStr && (
                <span className="px-2.5 py-0.5 bg-rose-100 text-rose-700 text-xs font-black rounded-full uppercase">
                  Hôm nay
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Theo dõi và điều hành chương trình làm việc của Thường trực và cơ quan Đảng ủy
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAddItem(selectedDayStr, 'morning')}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus size={14} />
              <span>Thêm lịch cho ngày này</span>
            </button>
          </div>
        </div>

        {/* Timeline Items */}
        {activeDayItems.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
              <CalendarIcon size={28} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-700">Chưa có lịch làm việc trong ngày này</h4>
              <p className="text-xs text-slate-400 mt-1">
                Lãnh đạo và cán bộ làm việc bình thường tại cơ quan theo chương trình công tác.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onAddItem(selectedDayStr, 'morning')}
              className="mt-2 px-4 py-2 border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-blue-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Plus size={14} /> Thêm cuộc họp mới
            </button>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {activeDayItems.map((item, idx) => {
              const badgeStyle = getItemBadgeStyle(item);
              const conflicts = conflictMap.get(item.id);
              const isCompleted = item.status === 'completed';

              return (
                <div key={item.id} className="relative group">
                  {/* Timeline bullet dot */}
                  <div className={cn(
                    "absolute -left-6 sm:-left-8 top-4 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center transition-all",
                    conflicts && conflicts.length > 0 
                      ? "border-rose-600 bg-rose-500 text-white animate-pulse" 
                      : (isCompleted ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-800 bg-white")
                  )}>
                    {isCompleted && <Check size={10} />}
                  </div>

                  {/* Card Body */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      "p-4 sm:p-5 rounded-2xl border transition-all relative shadow-xs hover:shadow-md",
                      badgeStyle.bg,
                      badgeStyle.border,
                      isCompleted && "opacity-75"
                    )}
                  >
                    {/* Conflict notification if exists */}
                    {conflicts && conflicts.length > 0 && (
                      <div className="mb-3 p-2.5 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 text-xs font-bold flex items-center gap-2">
                        <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                        <span>CẢNH BÁO XUNG ĐỘT: {conflicts.join(' | ')}</span>
                      </div>
                    )}

                    {/* Top Row: Time & Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 flex items-center gap-1.5 shadow-2xs">
                          <Clock size={13} className="text-slate-500" />
                          <span>{item.time || '08:00'}</span>
                          {item.endTime && <span>- {item.endTime}</span>}
                        </span>

                        <span className={cn(
                          "px-2.5 py-1 text-[10px] font-black rounded-xl uppercase tracking-wider",
                          badgeStyle.badgeBg
                        )}>
                          {badgeStyle.badgeLabel}
                        </span>

                        {isCompleted && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-lg flex items-center gap-1">
                            <CheckCircle2 size={11} /> Đã hoàn thành
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        {onToggleComplete && (
                          <button
                            type="button"
                            onClick={() => onToggleComplete(item)}
                            title={isCompleted ? "Đánh dấu chưa họp" : "Đánh dấu đã hoàn thành"}
                            className={cn(
                              "p-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1",
                              isCompleted ? "bg-slate-200 text-slate-700" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            )}
                          >
                            <CheckCircle2 size={13} />
                            <span className="hidden sm:inline">{isCompleted ? "Đã xong" : "Xong"}</span>
                          </button>
                        )}

                        {onConvertToTask && (
                          <button
                            type="button"
                            onClick={() => onConvertToTask(item)}
                            title="Chuyển thành nhiệm vụ theo dõi"
                            className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            <ListTodo size={13} />
                            <span className="hidden sm:inline">Giao việc</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onEditItem(item)}
                          title="Chỉnh sửa"
                          className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors"
                        >
                          <Edit3 size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteItem(item.id)}
                          title="Xóa"
                          className="p-1.5 bg-white border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className={cn(
                      "text-base font-extrabold leading-snug text-slate-900 mb-3",
                      isCompleted && "line-through text-slate-500"
                    )}>
                      {item.name}
                    </h4>

                    {/* Meta Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200/60 text-xs">
                      {item.chairperson && (
                        <div className="flex items-start gap-2 bg-white/70 p-2 rounded-xl border border-slate-100">
                          <User size={14} className="text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Chủ trì:</div>
                            <div className="font-extrabold text-slate-800">{item.chairperson}</div>
                          </div>
                        </div>
                      )}

                      {item.location && (
                        <div className="flex items-start gap-2 bg-white/70 p-2 rounded-xl border border-slate-100">
                          <MapPin size={14} className="text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Địa điểm:</div>
                            <div className="font-bold text-slate-800">{item.location}</div>
                          </div>
                        </div>
                      )}

                      {item.preparingUnit && (
                        <div className="flex items-start gap-2 bg-white/70 p-2 rounded-xl border border-slate-100">
                          <FileText size={14} className="text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Cơ quan chuẩn bị:</div>
                            <div className="font-bold text-slate-800">{item.preparingUnit}</div>
                          </div>
                        </div>
                      )}

                      {item.participants && (
                        <div className="sm:col-span-2 lg:col-span-3 flex items-start gap-2 bg-white/70 p-2 rounded-xl border border-slate-100">
                          <Users size={14} className="text-slate-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Thành phần tham dự:</div>
                            <div className="text-slate-700 font-medium leading-relaxed">{item.participants}</div>
                          </div>
                        </div>
                      )}

                      {item.description && (
                        <div className="sm:col-span-2 lg:col-span-3 text-slate-600 bg-white/50 p-2.5 rounded-xl border border-slate-100 text-[11px] leading-relaxed">
                          <span className="font-bold text-slate-700">Ghi chú & Tài liệu: </span>
                          {item.description}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
