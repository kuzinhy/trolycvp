import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, CheckSquare, AlertCircle, Upload, Loader2, Edit2, Trash2, Plus, X } from 'lucide-react';
import { Meeting, Task, Event } from '../constants';
import { cn } from '../lib/utils';
import { ProgressPopup } from './ui/ProgressPopup';
import { useSimulatedProgress } from '../hooks/useSimulatedProgress';
import { getLunarDate, getHolidays } from '../lib/lunar';

interface CalendarModuleProps {
  meetings: Meeting[];
  tasks: Task[];
  events: Event[];
  updateMeetings?: (updater: Meeting[] | ((prev: Meeting[]) => Meeting[])) => Promise<void>;
  updateTasks?: (updater: Task[] | ((prev: Task[]) => Task[])) => Promise<void>;
  updateEvents: (updater: Event[] | ((prev: Event[]) => Event[])) => Promise<void>;
  onUploadCalendar?: (file: File) => void;
  onUploadCalendarFile?: (file: File) => void;
  onSyncGoogleDrive?: (folderId: string) => Promise<void>;
  isUploading?: boolean;
  isSyncingDrive?: boolean;
  setHasUnsavedChanges?: (val: boolean) => void;
}

export const CalendarModule: React.FC<CalendarModuleProps> = ({ meetings, tasks, events, updateMeetings, updateTasks, updateEvents, onUploadCalendar, onUploadCalendarFile, onSyncGoogleDrive, isUploading, isSyncingDrive, setHasUnsavedChanges }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [driveFolderId, setDriveFolderId] = useState('');
  const [showDriveInput, setShowDriveInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAddingMeeting, setIsAddingMeeting] = useState(false);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<Event>>({ name: '', date: '', type: 'anniversary', location: '' });
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  React.useEffect(() => {
    const isDirty = isAddingMeeting || isAddingEvent || !!editingMeeting || !!editingTask || !!editingEvent || 
                    (newEvent.name && newEvent.name.trim().length > 0);
    
    if (setHasUnsavedChanges) {
      setHasUnsavedChanges(!!isDirty);
    }
  }, [isAddingMeeting, isAddingEvent, editingMeeting, editingTask, editingEvent, newEvent.name, setHasUnsavedChanges]);

  const progress = useSimulatedProgress();

  React.useEffect(() => {
    if (isUploading) {
      progress.start();
    } else {
      progress.complete();
    }
  }, [isUploading]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (onUploadCalendarFile) {
      onUploadCalendarFile(file);
    } else if (onUploadCalendar) {
      onUploadCalendar(file);
    }
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveMeeting = () => {
    if (!editingMeeting || !updateMeetings) return;
    updateMeetings(prev => {
      const exists = prev.some(m => m.id === editingMeeting.id);
      if (exists) {
        return prev.map(m => m.id === editingMeeting.id ? editingMeeting : m);
      } else {
        return [...prev, editingMeeting];
      }
    });
    setEditingMeeting(null);
  };

  const handleDeleteMeeting = (id: string) => {
    if (!updateMeetings) return;
    updateMeetings(prev => prev.filter(m => m.id !== id));
  };

  const handleSaveTask = () => {
    if (!editingTask || !updateTasks) return;
    updateTasks(prev => {
      const exists = prev.some(t => t.id === editingTask.id);
      if (exists) {
        return prev.map(t => t.id === editingTask.id ? editingTask : t);
      } else {
        return [...prev, editingTask];
      }
    });
    setEditingTask(null);
  };

  const handleDeleteTask = (id: string) => {
    if (!updateTasks) return;
    updateTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleSaveEvent = () => {
    if (!editingEvent || !updateEvents) return;
    
    // Auto-set reminder for founding days
    let finalReminderType = editingEvent.reminderType || 'minutes';
    let finalReminderValue = editingEvent.reminderValue || 30;
    if (editingEvent.type && editingEvent.type.startsWith('founding_day_')) {
      finalReminderType = 'days';
      finalReminderValue = 7;
    }

    updateEvents(prev => {
      const exists = prev.some(e => e.id === editingEvent.id);
      if (exists) {
        return prev.map(e => e.id === editingEvent.id ? { ...editingEvent, reminderType: finalReminderType, reminderValue: finalReminderValue } : e);
      } else {
        return [...prev, { ...editingEvent, reminderType: finalReminderType, reminderValue: finalReminderValue }];
      }
    });
    setEditingEvent(null);
  };

  const handleSaveNewEvent = () => {
    if (!newEvent.name || !newEvent.date || !updateEvents) return;
    
    // Auto-set reminder for founding days
    let finalReminderType = newEvent.reminderType || 'minutes';
    let finalReminderValue = newEvent.reminderValue || 30;
    if (newEvent.type && newEvent.type.startsWith('founding_day_')) {
      finalReminderType = 'days';
      finalReminderValue = 7;
    }

    updateEvents(prev => [...prev, {
      id: `e-${Date.now()}`,
      name: newEvent.name!,
      date: newEvent.date!,
      location: newEvent.location || '',
      type: newEvent.type as any,
      reminderType: finalReminderType,
      reminderValue: finalReminderValue,
      time: newEvent.time || '09:00'
    }]);
    setIsAddingEvent(false);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    return days;
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Adjust for Monday start (0 = Mon, 6 = Sun)
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      day === selectedDate.getDate() &&
      currentDate.getMonth() === selectedDate.getMonth() &&
      currentDate.getFullYear() === selectedDate.getFullYear()
    );
  };

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const dayMeetings = meetings.filter(m => m.date === dateStr);
    const dayTasks = tasks.filter(t => t.deadline === dateStr);
    const dayEvents = events.filter(e => e.date === dateStr);
    
    return { meetings: dayMeetings, tasks: dayTasks, events: dayEvents };
  };

  const renderCalendarDays = () => {
    const days = [];
    
    // Previous month padding
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-slate-50/30 border border-slate-100/50"></div>);
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const { meetings: dayMeetings, tasks: dayTasks, events: dayEvents } = getEventsForDay(day);
      const lunarDate = getLunarDate(dateObj);
      const holidays = getHolidays(dateObj);
      
      const hasEvents = dayMeetings.length > 0 || dayTasks.length > 0 || dayEvents.length > 0;
      const isDayOff = holidays.some(h => h.isDayOff) || dateObj.getDay() === 0 || dateObj.getDay() === 6;
      
      days.push(
        <div 
          key={day} 
          onClick={() => setSelectedDate(dateObj)}
          className={cn(
            "h-24 border border-slate-100 p-2 relative transition-all cursor-pointer group hover:bg-slate-50",
            isToday(day) && "bg-emerald-50/30",
            isSelected(day) && "ring-2 ring-emerald-500 ring-inset z-10 bg-white shadow-md",
            isDayOff && !isToday(day) && !isSelected(day) && "bg-rose-50/20"
          )}
        >
          <div className="flex justify-between items-start">
            <div className="flex flex-col items-center">
              <span className={cn(
                "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full",
                isToday(day) ? "bg-emerald-500 text-white shadow-sm" : (isDayOff ? "text-rose-600" : "text-slate-700"),
                isSelected(day) && !isToday(day) && "bg-slate-900 text-white"
              )}>
                {day}
              </span>
              <span className="text-[9px] text-slate-400 mt-0.5">
                {lunarDate.day === 1 ? `${lunarDate.day}/${lunarDate.month}` : lunarDate.day}
              </span>
            </div>
            {hasEvents && (
              <div className="flex gap-1">
                {dayMeetings.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                {dayTasks.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                {dayEvents.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
              </div>
            )}
          </div>
          
          <div className="mt-1 space-y-1 overflow-hidden">
            {holidays.slice(0, 1).map((h, idx) => (
              <div key={`h-${idx}`} className="text-[9px] truncate px-1 py-0.5 bg-rose-100 text-rose-800 rounded border border-rose-200 font-medium">
                {h.name}
              </div>
            ))}
            {dayEvents.slice(0, 2 - Math.min(holidays.length, 1)).map((e, idx) => (
              <div key={`e-${idx}`} className="text-[9px] truncate px-1 py-0.5 bg-rose-50 text-rose-700 rounded border border-rose-100 flex items-center gap-1">
                <AlertCircle size={8} /> {e.name}
              </div>
            ))}
            {dayMeetings.slice(0, 2 - Math.min(dayEvents.length + holidays.length, 2)).map((m, idx) => (
              <div key={`m-${idx}`} className="text-[9px] truncate px-1 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100 flex items-center gap-1">
                <Clock size={8} /> {m.time}
              </div>
            ))}
            {dayTasks.slice(0, 2 - Math.min(dayEvents.length + dayMeetings.length + holidays.length, 2)).map((t, idx) => (
              <div key={`t-${idx}`} className="text-[9px] truncate px-1 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-100 flex items-center gap-1">
                <CheckSquare size={8} /> {t.title}
              </div>
            ))}
            {(dayMeetings.length + dayTasks.length + dayEvents.length + holidays.length) > 2 && (
              <div className="text-[9px] text-slate-400 pl-1">
                +{(dayMeetings.length + dayTasks.length + dayEvents.length + holidays.length) - 2} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate.getDate()) : { meetings: [], tasks: [], events: [] };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 p-6 gap-6">
      <ProgressPopup 
        isOpen={progress.isSimulating} 
        progress={progress.progress} 
        title="Đang phân tích lịch tuần" 
        message="AI đang trích xuất dữ liệu cuộc họp và sự kiện..." 
      />
      <div className="flex flex-col lg:flex-row gap-6 h-full">
        {/* Calendar Grid */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Calendar Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold text-slate-900 capitalize flex items-center gap-2">
                <CalendarIcon className="text-emerald-600" size={20} />
                Tháng {currentDate.getMonth() + 1}, {currentDate.getFullYear()}
              </h2>
              <div className="flex items-center bg-slate-100 rounded-lg p-1">
                <button onClick={prevMonth} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500 hover:text-slate-900">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-bold text-slate-600 hover:text-emerald-600 transition-colors">
                  Hôm nay
                </button>
                <button onClick={nextMonth} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500 hover:text-slate-900">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  setEditingMeeting({
                    id: `m-${Date.now()}`,
                    name: '',
                    date: selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : new Date().toISOString().split('T')[0],
                    time: '09:00',
                    location: '',
                    reminderMinutes: 30,
                    reminderType: 'minutes',
                    reminderValue: 30
                  });
                }}
                className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200 transition-all"
              >
                + Công tác
              </button>
              <button 
                onClick={() => {
                  setEditingTask({
                    id: `t-${Date.now()}`,
                    title: '',
                    deadline: selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : new Date().toISOString().split('T')[0],
                    priority: 'medium',
                    status: 'Pending',
                    createdAt: Date.now(),
                    reminderType: 'minutes',
                    reminderValue: 30
                  });
                }}
                className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200 transition-all"
              >
                + Nhiệm vụ
              </button>
              <button 
                onClick={() => {
                  setNewEvent({
                    name: '',
                    date: selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : new Date().toISOString().split('T')[0],
                    type: 'anniversary',
                    reminderDays: 1,
                    reminderMinutes: 30,
                    reminderType: 'minutes',
                    reminderValue: 30,
                    time: '09:00'
                  });
                  setIsAddingEvent(true);
                }}
                className="px-3 py-1.5 bg-rose-100 text-rose-700 rounded-lg text-xs font-bold hover:bg-rose-200 transition-all"
              >
                + Kỷ niệm
              </button>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".txt,.csv,.json,.pdf,.doc,.docx"
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-all shadow-md shadow-emerald-600/10 disabled:opacity-50"
              >
                {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Tải lên lịch tuần
              </button>

              <div className="relative">
                <button 
                  onClick={() => setShowDriveInput(!showDriveInput)}
                  disabled={isSyncingDrive}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 transition-all shadow-md shadow-blue-600/10 disabled:opacity-50"
                >
                  {isSyncingDrive ? <Loader2 size={14} className="animate-spin" /> : <CalendarIcon size={14} />}
                  Đồng bộ Google Drive
                </button>

                {showDriveInput && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-bold text-slate-900">Nhập Folder ID</h4>
                      <button onClick={() => setShowDriveInput(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={16} />
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mb-3">
                      Nhập ID của thư mục Google Drive chứa các tệp lịch (PDF, Word, Text).
                    </p>
                    <div className="flex flex-col gap-2">
                      <input 
                        type="text"
                        value={driveFolderId}
                        onChange={(e) => setDriveFolderId(e.target.value)}
                        placeholder="ID thư mục..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button 
                        onClick={() => {
                          if (driveFolderId && onSyncGoogleDrive) {
                            onSyncGoogleDrive(driveFolderId);
                            setShowDriveInput(false);
                          }
                        }}
                        disabled={!driveFolderId || isSyncingDrive}
                        className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 transition-all disabled:opacity-50"
                      >
                        Bắt đầu đồng bộ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/50">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => (
              <div key={day} className="py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto custom-scrollbar relative">
            {renderCalendarDays()}
            {meetings.length === 0 && tasks.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                <CalendarIcon size={120} />
              </div>
            )}
          </div>
        </div>

        {/* Side Panel - Selected Day Details */}
        <div className="w-full lg:w-80 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden shrink-0">
          <div className="p-4 border-b border-slate-200 bg-slate-50/30">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
              Chi tiết ngày {selectedDate?.getDate()}/{selectedDate ? selectedDate.getMonth() + 1 : ''}
              {selectedDate && (
                <span className="text-xs font-normal text-slate-500 ml-auto">
                  Âm lịch: {getLunarDate(selectedDate).day}/{getLunarDate(selectedDate).month}
                </span>
              )}
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            {/* Events Section */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <AlertCircle size={12} /> Sự kiện ({selectedDayEvents.events.length + (selectedDate ? getHolidays(selectedDate).length : 0)})
              </h4>
              <div className="space-y-3">
                {selectedDate && getHolidays(selectedDate).map((h, idx) => (
                  <div key={`hol-${idx}`} className="p-3 bg-rose-100/50 border border-rose-200 rounded-xl">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 bg-rose-200 text-rose-800">
                        <AlertCircle size={10} /> Ngày lễ
                      </span>
                      {h.isDayOff && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-emerald-100 text-emerald-700">
                          Nghỉ
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      {h.name}
                    </p>
                  </div>
                ))}
                
                {selectedDayEvents.events.length > 0 ? (
                  selectedDayEvents.events.map(e => (
                    <div key={e.id} className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl hover:border-rose-300 transition-colors group">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 bg-rose-100 text-rose-700">
                          <AlertCircle size={10} /> {e.type === 'anniversary' ? 'Kỷ niệm' : e.type === 'holiday' ? 'Ngày lễ' : 'Khác'}
                        </span>
                        {updateEvents && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingEvent(e)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded">
                              <Edit2 size={12} />
                            </button>
                            <button onClick={() => {
                              updateEvents(prev => prev.filter(ev => ev.id !== e.id));
                            }} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        {e.name}
                      </p>
                      {e.location && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <MapPin size={10} /> {e.location}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  (!selectedDate || getHolidays(selectedDate).length === 0) && (
                    <p className="text-xs text-slate-400 italic pl-2">Không có sự kiện</p>
                  )
                )}
              </div>
            </div>

            {/* Meetings Section */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Clock size={12} /> Lịch công tác ({selectedDayEvents.meetings.length})
              </h4>
              <div className="space-y-3">
                {selectedDayEvents.meetings.length > 0 ? (
                  selectedDayEvents.meetings.map(m => (
                    <div key={m.id} className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl hover:border-blue-300 transition-colors group">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Clock size={10} /> {m.time}
                        </span>
                        {updateMeetings && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingMeeting(m)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded">
                              <Edit2 size={12} />
                            </button>
                            <button onClick={() => handleDeleteMeeting(m.id)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                        <CalendarIcon size={14} className="text-blue-500" /> {m.name}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin size={10} /> {m.location}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic pl-2">Không có lịch công tác</p>
                )}
              </div>
            </div>

            {/* Tasks Section */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <CheckSquare size={12} /> Nhiệm vụ ({selectedDayEvents.tasks.length})
              </h4>
              <div className="space-y-3">
                {selectedDayEvents.tasks.length > 0 ? (
                  selectedDayEvents.tasks.map(t => (
                    <div key={t.id} className={cn(
                      "p-3 border rounded-xl transition-colors group",
                      t.priority === 'high' ? "bg-rose-50/50 border-rose-100 hover:border-rose-300" :
                      t.priority === 'medium' ? "bg-amber-50/50 border-amber-100 hover:border-amber-300" :
                      "bg-emerald-50/50 border-emerald-100 hover:border-emerald-300"
                    )}>
                      <div className="flex justify-between items-start mb-1">
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1",
                          t.priority === 'high' ? "bg-rose-100 text-rose-700" :
                          t.priority === 'medium' ? "bg-amber-100 text-amber-700" :
                          "bg-emerald-100 text-emerald-700"
                        )}>
                          <Clock size={10} /> {t.priority === 'medium' ? 'Trung bình' : t.priority === 'high' ? 'Cao' : 'Thấp'}
                        </span>
                        {updateTasks && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingTask(t)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded">
                              <Edit2 size={12} />
                            </button>
                            <button onClick={() => handleDeleteTask(t.id)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <CheckSquare size={14} className={t.priority === 'high' ? "text-rose-500" : "text-emerald-500"} /> {t.title}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic pl-2">Không có nhiệm vụ hạn chót hôm nay</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Meeting Modal */}
      {editingMeeting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Clock size={18} className="text-blue-500" />
                Chỉnh sửa lịch công tác
              </h3>
              <button onClick={() => setEditingMeeting(null)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tên cuộc họp</label>
                <input
                  type="text"
                  value={editingMeeting.name}
                  onChange={(e) => setEditingMeeting({ ...editingMeeting, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Ngày</label>
                  <input
                    type="date"
                    value={editingMeeting.date}
                    onChange={(e) => setEditingMeeting({ ...editingMeeting, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Thời gian</label>
                  <input
                    type="time"
                    value={editingMeeting.time}
                    onChange={(e) => setEditingMeeting({ ...editingMeeting, time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Địa điểm</label>
                <input
                  type="text"
                  value={editingMeeting.location}
                  onChange={(e) => setEditingMeeting({ ...editingMeeting, location: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nhắc nhở trước</label>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={editingMeeting.reminderValue || 30}
                      onChange={(e) => setEditingMeeting({ ...editingMeeting, reminderValue: parseInt(e.target.value) })}
                      className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    <select
                      value={editingMeeting.reminderType || 'minutes'}
                      onChange={(e) => setEditingMeeting({ ...editingMeeting, reminderType: e.target.value as any })}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    >
                      <option value="minutes">Phút</option>
                      <option value="hours">Giờ</option>
                      <option value="days">Ngày</option>
                      <option value="none">Không nhắc</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '15p', type: 'minutes', val: 15 },
                      { label: '30p', type: 'minutes', val: 30 },
                      { label: '1g', type: 'hours', val: 1 },
                      { label: '1n', type: 'days', val: 1 },
                      { label: '1t', type: 'days', val: 7 },
                    ].map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => setEditingMeeting({ ...editingMeeting, reminderType: preset.type as any, reminderValue: preset.val })}
                        className="px-2 py-1 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
              <button
                onClick={() => setEditingMeeting(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveMeeting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <CheckSquare size={18} className="text-emerald-500" />
                Chỉnh sửa nhiệm vụ
              </h3>
              <button onClick={() => setEditingTask(null)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tên nhiệm vụ</label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Hạn chót</label>
                  <input
                    type="date"
                    value={editingTask.deadline}
                    onChange={(e) => setEditingTask({ ...editingTask, deadline: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Mức độ ưu tiên</label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  >
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Cao</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nhắc nhở trước</label>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={editingTask.reminderValue || 30}
                      onChange={(e) => setEditingTask({ ...editingTask, reminderValue: parseInt(e.target.value) })}
                      className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                    <select
                      value={editingTask.reminderType || 'minutes'}
                      onChange={(e) => setEditingTask({ ...editingTask, reminderType: e.target.value as any })}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    >
                      <option value="minutes">Phút</option>
                      <option value="hours">Giờ</option>
                      <option value="days">Ngày</option>
                      <option value="none">Không nhắc</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '15p', type: 'minutes', val: 15 },
                      { label: '30p', type: 'minutes', val: 30 },
                      { label: '1g', type: 'hours', val: 1 },
                      { label: '1n', type: 'days', val: 1 },
                      { label: '1t', type: 'days', val: 7 },
                    ].map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => setEditingTask({ ...editingTask, reminderType: preset.type as any, reminderValue: preset.val })}
                        className="px-2 py-1 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
              <button
                onClick={() => setEditingTask(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveTask}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
