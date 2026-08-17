import React from 'react';
import { motion } from 'motion/react';
import { 
  Clock, 
  MapPin, 
  User, 
  Users, 
  FileText, 
  AlertTriangle, 
  Plus, 
  Edit3, 
  Trash2, 
  Sun, 
  Moon,
  Sparkles,
  CheckCircle2,
  Calendar as CalendarIcon
} from 'lucide-react';
import { format, addDays, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { ScheduleItem, determineSession, getItemBadgeStyle } from './scheduleUtils';

interface WeeklyMatrixViewProps {
  weekStart: Date;
  items: ScheduleItem[];
  conflictMap: Map<string, string[]>;
  onAddItem: (dateStr: string, session: 'morning' | 'afternoon') => void;
  onEditItem: (item: ScheduleItem) => void;
  onDeleteItem: (id: string) => void;
  onQuickToggleStatus?: (item: ScheduleItem) => void;
}

export const WeeklyMatrixView: React.FC<WeeklyMatrixViewProps> = ({
  weekStart,
  items,
  conflictMap,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onQuickToggleStatus
}) => {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="w-full space-y-4">
      {/* Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Desktop / Tablet Grid */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full border-collapse min-w-[1000px] text-left">
            {/* Header: Days of the week */}
            <thead>
              <tr className="bg-slate-800 text-white divide-x divide-slate-700">
                <th className="w-24 px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-300">
                  Buổi
                </th>
                {weekDays.map((day) => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const isToday = dayStr === todayStr;
                  const dayCount = items.filter(it => it.date === dayStr && it.status !== 'cancelled').length;

                  return (
                    <th 
                      key={dayStr}
                      className={cn(
                        "p-3 text-center transition-colors min-w-[150px]",
                        isToday ? "bg-rose-700 text-white font-black" : "bg-slate-800 text-white"
                      )}
                    >
                      <div className="text-xs font-bold uppercase tracking-wider opacity-90">
                        {format(day, 'EEEE', { locale: vi })}
                      </div>
                      <div className="text-lg font-black tracking-tight mt-0.5">
                        {format(day, 'dd/MM')}
                      </div>
                      {isToday && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-white/20 text-white text-[10px] font-bold rounded-full">
                          Hôm nay
                        </span>
                      )}
                      {dayCount > 0 && !isToday && (
                        <span className="inline-block mt-1 px-1.5 py-0.2 text-[10px] text-slate-300 font-medium">
                          {dayCount} lịch
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-slate-200">
              {/* Row: Buổi Sáng */}
              <tr className="divide-x divide-slate-200 bg-amber-50/20">
                <td className="p-3 text-center bg-amber-500/10 font-bold text-amber-900 align-top">
                  <div className="flex flex-col items-center justify-center gap-1.5 sticky top-4">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
                      <Sun size={18} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider">Sáng</span>
                    <span className="text-[10px] text-amber-700 font-semibold">(07:30 - 11:30)</span>
                  </div>
                </td>

                {weekDays.map((day) => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const sessionItems = items.filter(it => it.date === dayStr && (it.session || determineSession(it.time)) === 'morning' && it.status !== 'cancelled');

                  return (
                    <td key={dayStr} className="p-2 align-top bg-white hover:bg-slate-50/60 transition-colors">
                      <div className="flex flex-col gap-2 min-h-[140px]">
                        {sessionItems.map((item) => (
                          <ScheduleMatrixCard 
                            key={item.id}
                            item={item}
                            conflicts={conflictMap.get(item.id)}
                            onEdit={() => onEditItem(item)}
                            onDelete={() => onDeleteItem(item.id)}
                            onToggleStatus={onQuickToggleStatus ? () => onQuickToggleStatus(item) : undefined}
                          />
                        ))}

                        {/* Quick Add Button */}
                        <button
                          type="button"
                          onClick={() => onAddItem(dayStr, 'morning')}
                          className="mt-auto w-full py-1.5 px-2 border border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 rounded-xl text-[11px] font-semibold text-slate-400 hover:text-blue-600 flex items-center justify-center gap-1 transition-all group"
                        >
                          <Plus size={13} className="group-hover:scale-110 transition-transform" />
                          <span>Thêm lịch sáng</span>
                        </button>
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Row: Buổi Chiều */}
              <tr className="divide-x divide-slate-200 bg-indigo-50/20">
                <td className="p-3 text-center bg-indigo-500/10 font-bold text-indigo-900 align-top">
                  <div className="flex flex-col items-center justify-center gap-1.5 sticky top-4">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
                      <Moon size={18} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider">Chiều</span>
                    <span className="text-[10px] text-indigo-700 font-semibold">(13:30 - 17:30)</span>
                  </div>
                </td>

                {weekDays.map((day) => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const sessionItems = items.filter(it => it.date === dayStr && (it.session || determineSession(it.time)) === 'afternoon' && it.status !== 'cancelled');

                  return (
                    <td key={dayStr} className="p-2 align-top bg-white hover:bg-slate-50/60 transition-colors">
                      <div className="flex flex-col gap-2 min-h-[140px]">
                        {sessionItems.map((item) => (
                          <ScheduleMatrixCard 
                            key={item.id}
                            item={item}
                            conflicts={conflictMap.get(item.id)}
                            onEdit={() => onEditItem(item)}
                            onDelete={() => onDeleteItem(item.id)}
                            onToggleStatus={onQuickToggleStatus ? () => onQuickToggleStatus(item) : undefined}
                          />
                        ))}

                        {/* Quick Add Button */}
                        <button
                          type="button"
                          onClick={() => onAddItem(dayStr, 'afternoon')}
                          className="mt-auto w-full py-1.5 px-2 border border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-xl text-[11px] font-semibold text-slate-400 hover:text-indigo-600 flex items-center justify-center gap-1 transition-all group"
                        >
                          <Plus size={13} className="group-hover:scale-110 transition-transform" />
                          <span>Thêm lịch chiều</span>
                        </button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mobile / Tablet Accordion Cards Layout */}
        <div className="lg:hidden p-3 space-y-4">
          {weekDays.map((day) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const isToday = dayStr === todayStr;
            const morningItems = items.filter(it => it.date === dayStr && (it.session || determineSession(it.time)) === 'morning' && it.status !== 'cancelled');
            const afternoonItems = items.filter(it => it.date === dayStr && (it.session || determineSession(it.time)) === 'afternoon' && it.status !== 'cancelled');
            const totalCount = morningItems.length + afternoonItems.length;

            return (
              <div 
                key={dayStr}
                className={cn(
                  "rounded-2xl border transition-all overflow-hidden",
                  isToday ? "border-rose-400 bg-rose-50/20 shadow-sm" : "border-slate-200 bg-white"
                )}
              >
                {/* Header Day */}
                <div className={cn(
                  "px-4 py-3 flex items-center justify-between border-b",
                  isToday ? "bg-rose-700 text-white border-rose-800" : "bg-slate-100 text-slate-800 border-slate-200"
                )}>
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={16} className={isToday ? "text-rose-200" : "text-slate-500"} />
                    <span className="font-extrabold text-sm uppercase">
                      {format(day, 'EEEE, dd/MM/yyyy', { locale: vi })}
                    </span>
                    {isToday && (
                      <span className="px-2 py-0.5 bg-white text-rose-700 text-[10px] font-black rounded-full uppercase">
                        Hôm nay
                      </span>
                    )}
                  </div>
                  <span className={cn("text-xs font-bold", isToday ? "text-rose-100" : "text-slate-500")}>
                    {totalCount} cuộc họp
                  </span>
                </div>

                <div className="p-3 space-y-3">
                  {/* Morning Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-800 pb-1 border-b border-amber-100">
                      <span className="flex items-center gap-1.5">
                        <Sun size={14} className="text-amber-600" />
                        BUỔI SÁNG
                      </span>
                      <button
                        onClick={() => onAddItem(dayStr, 'morning')}
                        className="text-[11px] text-blue-600 font-semibold hover:underline flex items-center gap-1"
                      >
                        <Plus size={12} /> Thêm
                      </button>
                    </div>

                    {morningItems.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-1 pl-2">Chưa có lịch công tác buổi sáng.</p>
                    ) : (
                      morningItems.map(item => (
                        <ScheduleMatrixCard 
                          key={item.id}
                          item={item}
                          conflicts={conflictMap.get(item.id)}
                          onEdit={() => onEditItem(item)}
                          onDelete={() => onDeleteItem(item.id)}
                          onToggleStatus={onQuickToggleStatus ? () => onQuickToggleStatus(item) : undefined}
                        />
                      ))
                    )}
                  </div>

                  {/* Afternoon Section */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs font-bold text-indigo-800 pb-1 border-b border-indigo-100">
                      <span className="flex items-center gap-1.5">
                        <Moon size={14} className="text-indigo-600" />
                        BUỔI CHIỀU
                      </span>
                      <button
                        onClick={() => onAddItem(dayStr, 'afternoon')}
                        className="text-[11px] text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                      >
                        <Plus size={12} /> Thêm
                      </button>
                    </div>

                    {afternoonItems.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-1 pl-2">Chưa có lịch công tác buổi chiều.</p>
                    ) : (
                      afternoonItems.map(item => (
                        <ScheduleMatrixCard 
                          key={item.id}
                          item={item}
                          conflicts={conflictMap.get(item.id)}
                          onEdit={() => onEditItem(item)}
                          onDelete={() => onDeleteItem(item.id)}
                          onToggleStatus={onQuickToggleStatus ? () => onQuickToggleStatus(item) : undefined}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Item Card in Matrix
const ScheduleMatrixCard: React.FC<{
  item: ScheduleItem;
  conflicts?: string[];
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus?: () => void;
}> = ({ item, conflicts, onEdit, onDelete, onToggleStatus }) => {
  const badgeStyle = getItemBadgeStyle(item);
  const isCompleted = item.status === 'completed';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "p-2.5 rounded-xl border transition-all relative group/card shadow-2xs hover:shadow-sm cursor-pointer",
        badgeStyle.bg,
        badgeStyle.border,
        badgeStyle.accent,
        isCompleted && "opacity-60 grayscale-[40%]"
      )}
      onClick={onEdit}
    >
      {/* Conflicts warning */}
      {conflicts && conflicts.length > 0 && (
        <div className="mb-1.5 px-2 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded-md flex items-center gap-1 animate-pulse">
          <AlertTriangle size={11} />
          <span className="truncate">{conflicts[0]}</span>
        </div>
      )}

      {/* Top Header: Time & Badge */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-black text-slate-800 shadow-2xs">
          <Clock size={11} className="text-slate-500" />
          {item.time || '08:00'}
        </span>

        <span className={cn(
          "px-1.5 py-0.5 text-[9px] font-extrabold rounded-md uppercase tracking-wider",
          badgeStyle.badgeBg
        )}>
          {badgeStyle.badgeLabel}
        </span>
      </div>

      {/* Title / Content */}
      <h4 className={cn(
        "text-xs font-bold line-clamp-3 leading-snug mb-2",
        badgeStyle.textColor,
        isCompleted && "line-through text-slate-500"
      )}>
        {item.name}
      </h4>

      {/* Metadata tags */}
      <div className="space-y-1 text-[11px] text-slate-600">
        {item.chairperson && (
          <div className="flex items-center gap-1 font-semibold text-slate-800 truncate">
            <User size={12} className="text-rose-600 shrink-0" />
            <span className="truncate">{item.chairperson}</span>
          </div>
        )}

        {item.location && (
          <div className="flex items-center gap-1 text-slate-600 truncate">
            <MapPin size={12} className="text-blue-600 shrink-0" />
            <span className="truncate">{item.location}</span>
          </div>
        )}

        {item.preparingUnit && (
          <div className="flex items-center gap-1 text-slate-500 text-[10px] truncate">
            <FileText size={11} className="text-amber-600 shrink-0" />
            <span className="truncate">CB: {item.preparingUnit}</span>
          </div>
        )}
      </div>

      {/* Action Overlay on Hover */}
      <div 
        className="absolute top-1.5 right-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center gap-1 bg-white/95 p-1 rounded-lg border border-slate-200 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onEdit}
          title="Chỉnh sửa"
          className="p-1 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded transition-colors"
        >
          <Edit3 size={12} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Xóa cuộc họp"
          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </motion.div>
  );
};
