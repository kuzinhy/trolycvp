import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Clock, 
  Users, 
  MapPin, 
  Loader2,
  Copy,
  Printer,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Maximize2,
  LayoutGrid,
  List as ListIcon,
  Search,
  X,
  Wand2,
  CalendarDays,
  AlertCircle,
  Edit2,
  Save,
  FolderOpen,
  Mic,
  BarChart3,
  TrendingUp,
  Briefcase,
  Info,
  Zap,
  FileSearch
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { DocumentScanner } from './DocumentScanner';
import { cn } from '../lib/utils';
import { logActivity } from '../lib/logService';
import { auth } from '../lib/firebase';
import { STAFF_LIST } from '../constants';
import { generateContentWithRetry, parseAIResponse } from '../lib/ai-utils';
import { 
  format, 
  startOfWeek, 
  addDays, 
  isSameDay, 
  parse, 
  addMinutes, 
  isWithinInterval,
  startOfDay,
  endOfDay,
  parseISO
} from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  useDraggable,
  useDroppable
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ScheduleItem {
  id: string;
  date: string; // ISO string
  time: string; // HH:mm
  duration: number; // minutes
  chairperson: string;
  type: string;
  content: string;
  participants: string[];
  location: string;
  preparingUnit?: string;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
  endTime?: string;
  status?: 'draft' | 'published' | 'cancelled';
}

interface DraftState {
  time: string[];
  chairperson: string[];
  location: string[];
  participants: string[];
  type: string[];
  preparingUnit: string[];
  content: string;
}

const WORK_TYPES = [
  'Họp', 'Làm việc', 'Tiếp dân', 'Dự hội nghị', 'Đi cơ sở', 'Kiểm tra', 'Giám sát', 'Tiếp khách', 'Đại hội', 'Lễ kỷ niệm', 'Khác'
];

const PREPARING_UNITS = [
  'Văn phòng', 'Ban Tổ chức', 'Ban Tuyên giáo', 'Ban Dân vận', 'Ủy ban Kiểm tra', 'Trung tâm Chính trị', 'Khối vận', 'Đoàn thanh niên', 'Hội Phụ nữ'
];

const LOCATIONS = [
  'Hội trường A', 'Hội trường B', 'Phòng họp 1', 'Phòng họp 2', 'Trụ sở tiếp công dân', 'Phòng làm việc Bí thư', 'Phòng làm việc Thường trực', 'Tại cơ sở', 'Trực tuyến'
];

const CHIPS = {
  time: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Sáng', 'Chiều', '08:00', '14:00'],
  chairperson: STAFF_LIST,
  location: LOCATIONS,
  participants: ['Các ban đảng', 'Văn phòng', 'Các sở ngành', 'UBND phường', 'Mặt trận', 'Đoàn thể'],
  type: WORK_TYPES,
  preparingUnit: PREPARING_UNITS
};

// --- Draggable Builder Components ---

const SelectableChip = React.memo(({ 
  text, 
  type, 
  isSelected, 
  onClick, 
  onDelete, 
  onEdit 
}: { 
  text: string, 
  type: string, 
  isSelected: boolean, 
  onClick: () => void, 
  onDelete?: () => void, 
  onEdit?: (newText: string) => void 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(text);

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 px-2 py-1.5 bg-white border border-blue-300 rounded-lg shadow-sm">
        <input 
          autoFocus
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              if (onEdit) onEdit(editValue);
              setIsEditing(false);
            } else if (e.key === 'Escape') {
              setIsEditing(false);
              setEditValue(text);
            }
          }}
          onBlur={() => {
            if (onEdit) onEdit(editValue);
            setIsEditing(false);
          }}
          className="text-xs font-bold outline-none bg-transparent w-24"
        />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex items-center px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer",
        isSelected 
          ? "bg-blue-600 text-white border-blue-600 shadow-md scale-105" 
          : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700",
        !isSelected && type === 'time' && "border-emerald-200 text-emerald-700 bg-emerald-50",
        !isSelected && type === 'chairperson' && "border-indigo-200 text-indigo-700 bg-indigo-50",
        !isSelected && type === 'location' && "border-rose-200 text-rose-700 bg-rose-50",
        !isSelected && type === 'participants' && "border-amber-200 text-amber-700 bg-amber-50"
      )}
    >
      <span onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>{text}</span>
      
      {(onEdit || onDelete) && (
        <div className="ml-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className={cn("p-0.5 rounded transition-colors", isSelected ? "text-blue-200 hover:text-white" : "text-slate-400 hover:text-blue-500")}>
              <Edit2 size={10} />
            </button>
          )}
          {onDelete && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className={cn("p-0.5 rounded transition-colors", isSelected ? "text-blue-200 hover:text-white" : "text-slate-400 hover:text-red-500")}>
              <X size={10} />
            </button>
          )}
        </div>
      )}
    </div>
  );
});

const AddChipInput = ({ onAdd }: { onAdd: (text: string) => void }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [value, setValue] = useState('');

  if (isAdding) {
    return (
      <div className="flex items-center gap-1 px-2 py-1.5 bg-white border border-blue-300 rounded-lg shadow-sm">
        <input 
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && value.trim()) {
              onAdd(value.trim());
              setValue('');
              setIsAdding(false);
            } else if (e.key === 'Escape') {
              setIsAdding(false);
              setValue('');
            }
          }}
          onBlur={() => {
            if (value.trim()) onAdd(value.trim());
            setIsAdding(false);
            setValue('');
          }}
          className="text-xs font-bold outline-none bg-transparent w-24"
          placeholder="Nhập..."
        />
      </div>
    );
  }

  return (
    <button 
      onClick={() => setIsAdding(true)}
      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-dashed border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all"
    >
      <Plus size={12} />
      Thêm
    </button>
  );
};

const SelectedItemsZone = ({ label, items, onRemove, icon: Icon, colorClass }: { label: string, items: string[], onRemove: (item: string) => void, icon: any, colorClass: string }) => {
  return (
    <div
      className={cn(
        "min-h-[80px] p-4 rounded-2xl border-2 transition-all flex flex-col gap-2",
        "border-slate-200 bg-slate-50/50",
        colorClass
      )}
    >
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-60">
        <Icon size={14} />
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.length === 0 && (
          <span className="text-xs font-bold text-slate-400 italic">Chưa chọn...</span>
        )}
        {items.map((item, idx) => (
          <div key={idx} className="group flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-sm">
            {item}
            <button onClick={() => onRemove(item)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Calendar Components ---

interface DraggableItemProps {
  item: ScheduleItem;
  onEdit: (item: ScheduleItem) => void;
  onDelete: (id: string) => void;
  conflicts?: string[];
}

const DraggableItem = React.memo(({ item, onEdit, onDelete, conflicts = [] }: DraggableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative p-2 rounded-xl border bg-white shadow-sm hover:shadow-md transition-all cursor-default",
        item.priority === 'high' ? "border-l-4 border-l-red-500 border-slate-200" :
        item.priority === 'medium' ? "border-l-4 border-l-amber-500 border-slate-200" :
        "border-l-4 border-l-slate-400 border-slate-200",
        conflicts.length > 0 && "ring-2 ring-red-500/50"
      )}
      onClick={() => onEdit(item)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">
            <Clock size={10} />
            {item.time} {item.endTime ? `- ${item.endTime}` : ''}
          </div>
          <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">{item.content}</h4>
        </div>
        <div 
          {...attributes} 
          {...listeners}
          className="p-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing print:hidden"
        >
          <GripVertical size={14} />
        </div>
      </div>
      
      <div className="mt-1 flex flex-wrap gap-1">
        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
          <Users size={8} className="text-indigo-500" />
          {item.chairperson || 'Chưa rõ'}
        </div>
        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
          <MapPin size={8} className="text-rose-500" />
          {item.location || 'Chưa rõ'}
        </div>
        {item.preparingUnit && (
          <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
            <FolderOpen size={8} className="text-amber-500" />
            {item.preparingUnit}
          </div>
        )}
        {item.participants.length > 0 && (
          <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
            <Users size={8} className="text-emerald-500" />
            {item.participants.length} TP
          </div>
        )}
      </div>

      {item.status && (
        <div className="mt-1 flex items-center gap-1">
          <span className={cn(
            "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm",
            item.status === 'published' ? "bg-emerald-100 text-emerald-700" :
            item.status === 'cancelled' ? "bg-slate-100 text-slate-500 line-through" :
            "bg-amber-100 text-amber-700"
          )}>
            {item.status === 'published' ? 'Đã ban hành' : item.status === 'cancelled' ? 'Đã hủy' : 'Dự thảo'}
          </span>
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="mt-1 bg-red-50 p-1.5 rounded-lg border border-red-100">
          <div className="flex items-center gap-1 text-red-600 mb-1">
            <AlertTriangle size={10} />
            <span className="text-[9px] font-black uppercase tracking-widest">Trùng lặp</span>
          </div>
          <ul className="text-[9px] font-medium text-red-600 space-y-0.5 pl-3 list-disc">
            {conflicts.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      {item.notes && (
        <div className="mt-2 p-1.5 bg-amber-50 border border-amber-200 rounded-lg text-[9px] font-medium text-amber-800 flex items-start gap-1">
          <AlertCircle size={10} className="mt-0.5 shrink-0" />
          <span>{item.notes}</span>
        </div>
      )}

      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
        className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 hover:border-red-200 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
});

interface WorkScheduleCreatorProps {
  updateMeetings?: (updater: any[] | ((prev: any[]) => any[])) => Promise<void>;
  updateTasks?: (updater: any[] | ((prev: any[]) => any[])) => Promise<void>;
  updateEvents?: (updater: any[] | ((prev: any[]) => any[])) => Promise<void>;
  showToast?: (message: string, type?: any) => void;
  initialItem?: any;
  onClearInitialItem?: () => void;
  items?: ScheduleItem[];
  setItems?: React.Dispatch<React.SetStateAction<ScheduleItem[]>>;
}

export const WorkScheduleCreator: React.FC<WorkScheduleCreatorProps> = ({
  updateMeetings,
  updateTasks,
  updateEvents,
  showToast,
  initialItem,
  onClearInitialItem,
  items: externalItems,
  setItems: setExternalItems
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [internalItems, setInternalItems] = useState<ScheduleItem[]>([]);
  
  const items = externalItems || internalItems;
  const setItems = setExternalItems || setInternalItems;
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingWeekly, setIsGeneratingWeekly] = useState(false);
  const [isResolvingConflicts, setIsResolvingConflicts] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const resolveConflictsWithAI = async () => {
    if (items.length === 0) return;
    setIsResolvingConflicts(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Bạn là Trợ lý Lịch công tác chuyên nghiệp. Hãy phát hiện và đề xuất giải quyết các xung đột trong lịch công tác sau.
Xung đột bao gồm:
1. Trùng thời gian (Overlap): Hai lịch có cùng khung giờ hoặc khung giờ giao nhau.
2. Trùng địa điểm: Hai lịch tại cùng một địa điểm cùng lúc.
3. Trùng chủ trì: Một người chủ trì hai việc cùng lúc.

Dữ liệu:
${JSON.stringify(items.map(i => ({ id: i.id, date: i.date, time: i.time, endTime: i.endTime, content: i.content, chairperson: i.chairperson, location: i.location })), null, 2)}

HÃY TRẢ VỀ MỘT MẢNG JSON các ScheduleItem đã được điều chỉnh thời gian để hết xung đột. 
Chỉ trả về JSON mảng các đối tượng đã thay đổi.`;

      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const response = await model;
      const text = response.text || '[]';
      const data = parseAIResponse(text);
      
      if (data && Array.isArray(data)) {
        const updatedItems = items.map(item => {
          const aiItem = data.find((d: any) => d.id === item.id);
          return aiItem ? { ...item, ...aiItem } : item;
        });
        setItems(updatedItems);
        showToast("Đã tự động xử lý xung đột lịch", "success");
        if (autoSync) syncItemsToSystem(updatedItems, true);
      }
    } catch (err) {
      console.error("AI Conflict Resolution Error:", err);
      showToast("Không thể xử lý xung đột", "error");
    } finally {
      setIsResolvingConflicts(false);
    }
  };
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isQuickBuilderOpen, setIsQuickBuilderOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'time' | 'chairperson' | 'location' | 'participants' | 'type' | 'preparingUnit'>('time');
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [templates, setTemplates] = useState<{name: string, items: ScheduleItem[]}[]>([]);

  useEffect(() => {
    if (initialItem) {
      // Map internal types to Vietnamese display types
      let mappedType = initialItem.type;
      if (mappedType === 'meeting') mappedType = 'Họp';
      else if (mappedType === 'event') mappedType = 'Sự kiện';
      else if (mappedType === 'task') mappedType = 'Nhiệm vụ';
      else if (!mappedType) mappedType = initialItem.title ? 'Nhiệm vụ' : 'Họp';

      const mappedItem: ScheduleItem = {
        id: initialItem.id || Math.random().toString(36).substr(2, 9),
        date: initialItem.date || initialItem.deadline || new Date().toISOString(),
        time: initialItem.time || '08:00',
        endTime: initialItem.endTime || '09:00',
        duration: 60,
        chairperson: initialItem.chairperson || initialItem.assignee || '',
        type: mappedType,
        content: initialItem.name || initialItem.title || '',
        participants: Array.isArray(initialItem.participants) ? initialItem.participants : [],
        location: initialItem.location || '',
        preparingUnit: initialItem.preparingUnit || '',
        priority: initialItem.priority || 'medium',
        notes: initialItem.description || initialItem.notes || '',
        status: initialItem.status || 'draft'
      };
      
      setItems(prev => {
        const exists = prev.some(i => i.id === mappedItem.id);
        if (exists) {
          return prev.map(i => i.id === mappedItem.id ? mappedItem : i);
        }
        return [...prev, mappedItem];
      });
      
      setEditingItem(mappedItem);
      if (onClearInitialItem) onClearInitialItem();
    }
  }, [initialItem, onClearInitialItem]);

  const saveAsTemplate = () => {
    const name = prompt("Nhập tên mẫu lịch:");
    if (name) {
      setTemplates([...templates, { name, items }]);
      if (showToast) showToast('Đã lưu mẫu lịch thành công', 'success');
    }
  };

  const syncItemsToSystem = async (itemsToSync: ScheduleItem[], silent: boolean = false) => {
    if (!updateMeetings || !updateTasks || !updateEvents) return;
    
    try {
      const meetingsToUpdate: any[] = [];
      const tasksToUpdate: any[] = [];
      const eventsToUpdate: any[] = [];

      itemsToSync.forEach(item => {
        const baseItem = {
          id: item.id || (Date.now().toString() + Math.random().toString(36).substring(2, 9)),
          title: item.content || '',
          date: item.date || new Date().toISOString(),
          time: item.time || '08:00',
          endTime: item.endTime || '09:00',
          location: item.location || '',
          participants: item.participants || [],
          description: item.notes || '',
          status: item.status || 'pending'
        };

        const typeLower = (item.type || '').toLowerCase();
        if (typeLower.includes('họp') || typeLower.includes('giao ban')) {
          meetingsToUpdate.push({
            ...baseItem,
            type: 'internal',
            chairperson: item.chairperson || '',
            preparingUnit: item.preparingUnit || ''
          });
        } else if (typeLower.includes('công tác') || typeLower.includes('sự kiện')) {
          eventsToUpdate.push({
            ...baseItem,
            type: 'other',
            organizer: item.chairperson || ''
          });
        } else {
          tasksToUpdate.push({
            ...baseItem,
            priority: item.priority || 'medium',
            assignee: item.chairperson || (item.participants && item.participants[0]) || 'Chưa phân công',
            deadline: item.date || new Date().toISOString()
          });
        }
      });

      const updateCollection = (prev: any[], newItems: any[]) => {
        const updated = [...prev];
        newItems.forEach(newItem => {
          const index = updated.findIndex(i => i.id === newItem.id);
          if (index !== -1) {
            updated[index] = { ...updated[index], ...newItem };
          } else {
            updated.push(newItem);
          }
        });
        return updated;
      };

      if (meetingsToUpdate.length > 0) await updateMeetings(prev => updateCollection(prev, meetingsToUpdate));
      if (tasksToUpdate.length > 0) await updateTasks(prev => updateCollection(prev, tasksToUpdate));
      if (eventsToUpdate.length > 0) await updateEvents(prev => updateCollection(prev, eventsToUpdate));

      if (!silent && showToast) showToast(`Đã đồng bộ ${itemsToSync.length} mục vào hệ thống`, 'success');
    } catch (error) {
      console.error('Error syncing schedule:', error);
      if (!silent && showToast) showToast('Có lỗi xảy ra khi đồng bộ lịch', 'error');
    }
  };

  const saveToSystem = async () => {
    if (items.length === 0) {
      if (showToast) showToast('Không có lịch nào để lưu', 'error');
      return;
    }
    await syncItemsToSystem(items);
    setItems([]); // Clear after explicit save
  };

  const loadTemplate = (template: {name: string, items: ScheduleItem[]}) => {
    setItems(template.items);
  };
  const [smartInput, setSmartInput] = useState('');
  const [isSmartProcessing, setIsSmartProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const handleSmartInput = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!smartInput.trim()) return;

    setIsSmartProcessing(true);
    try {
      const prompt = `Bạn là Trợ lý Lịch công tác chuyên nghiệp. Hãy phân tích câu sau và chuyển thành thông tin lịch công tác chi tiết: "${smartInput}"
      Ngày hiện tại là: ${format(new Date(), 'EEEE, dd/MM/yyyy', { locale: vi })}.
      
      HÃY TRẢ VỀ JSON: { 
        date (YYYY-MM-DD), 
        time (HH:mm), 
        endTime (HH:mm),
        content (nội dung ngắn gọn), 
        chairperson (người chủ trì), 
        location (địa điểm), 
        participants (mảng tên người tham gia), 
        type (Họp|Công tác|Sự kiện|Nhiệm vụ), 
        priority (high|medium|low),
        notes (ghi chú thêm nếu có)
      }.
      
      Quy tắc:
      - Nếu không có ngày cụ thể, hãy dùng ngày hiện tại hoặc ngày gần nhất phù hợp.
      - Nếu ghi "Sáng" mặc định "08:00", "Chiều" mặc định "14:00".
      - Nếu ghi "Cả ngày", set time "08:00" và endTime "17:00".
      - Chỉ trả về JSON duy nhất.`;

      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const data = parseAIResponse(response.text || '{}');

      if (data && data.content) {
        const newItem: ScheduleItem = {
          id: Math.random().toString(36).substr(2, 9),
          date: data.date ? new Date(data.date).toISOString() : currentDate.toISOString(),
          time: data.time || "08:00",
          duration: 60,
          chairperson: data.chairperson || '',
          type: data.type || 'Họp',
          content: data.content,
          participants: data.participants || [],
          location: data.location || '',
          priority: data.priority || 'medium',
          status: 'draft',
        };
        setItems(prev => [...prev, newItem]);
        setSmartInput('');
        if (showToast) showToast('Đã thêm lịch thông minh thành công', 'success');
        if (autoSync) syncItemsToSystem([newItem], true);
      }
    } catch (err) {
      console.error("Smart Input Error:", err);
      if (showToast) showToast('Không thể xử lý thông tin. Vui lòng thử lại.', 'error');
    } finally {
      setIsSmartProcessing(false);
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (showToast) showToast('Trình duyệt không hỗ trợ nhận diện giọng nói', 'error');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSmartInput(transcript);
      // Automatically process after a short delay
      setTimeout(() => handleSmartInput(), 500);
    };

    recognition.start();
  };

  const [customChips, setCustomChips] = useState(CHIPS);

  const [draftState, setDraftState] = useState<DraftState>({
    time: [],
    chairperson: [],
    location: [],
    participants: [],
    type: [],
    preparingUnit: [],
    content: ''
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.chairperson.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery]);

  const addItem = useCallback((date?: Date, time?: string) => {
    const newItem: ScheduleItem = {
      id: Math.random().toString(36).substr(2, 9),
      date: (date || currentDate).toISOString(),
      time: time || "08:00",
      endTime: "09:00",
      duration: 60,
      chairperson: '',
      type: 'Họp',
      content: '',
      participants: [],
      location: '',
      priority: 'medium',
      status: 'draft',
    };
    setItems(prev => [...prev, newItem]);
    setEditingItem(newItem);
    if (autoSync) syncItemsToSystem([newItem], true);
    
    logActivity({
      userId: auth.currentUser?.uid || 'anonymous',
      userEmail: auth.currentUser?.email || 'anonymous',
      action: 'Thêm lịch công tác',
      details: `Thêm lịch mới vào ngày ${format(date || currentDate, 'dd/MM/yyyy')}`,
      type: 'success',
      module: 'schedule'
    });
  }, [currentDate]);

  const checkConflicts = useCallback((item: ScheduleItem): string[] => {
    const conflicts: string[] = [];
    if (!item.date || !item.time) return conflicts;

    const itemDate = format(new Date(item.date), 'yyyy-MM-dd');
    const itemStart = item.time;
    
    // Default duration 1 hour if no endTime
    let itemEnd = item.endTime;
    if (!itemEnd) {
      const [h, m] = itemStart.split(':').map(Number);
      const endH = Math.min(23, h + 1);
      itemEnd = `${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    items.forEach(other => {
      if (other.id === item.id) return;
      const otherDate = format(new Date(other.date), 'yyyy-MM-dd');
      if (otherDate !== itemDate) return;
      
      const otherStart = other.time;
      let otherEnd = other.endTime;
      if (!otherEnd) {
        const [h, m] = otherStart.split(':').map(Number);
        const endH = Math.min(23, h + 1);
        otherEnd = `${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      }

      // Check time overlap
      if ((itemStart >= otherStart && itemStart < otherEnd) || 
          (itemEnd > otherStart && itemEnd <= otherEnd) ||
          (itemStart <= otherStart && itemEnd >= otherEnd)) {
        
        if (item.chairperson && other.chairperson && item.chairperson === other.chairperson) {
          if (!conflicts.includes(`Trùng lịch chủ trì: ${item.chairperson}`)) {
            conflicts.push(`Trùng lịch chủ trì: ${item.chairperson}`);
          }
        }
        if (item.location && other.location && item.location === other.location) {
          if (!conflicts.includes(`Trùng địa điểm: ${item.location}`)) {
            conflicts.push(`Trùng địa điểm: ${item.location}`);
          }
        }
      }
    });

    return conflicts;
  }, [items]);

  const stats = useMemo(() => {
    const total = items.length;
    const published = items.filter(i => i.status === 'published').length;
    const draft = items.filter(i => i.status === 'draft').length;
    const conflictsCount = items.filter(i => checkConflicts(i).length > 0).length;

    const counts: Record<string, number> = {};
    items.forEach(i => { counts[i.date] = (counts[i.date] || 0) + 1; });
    const busiestEntry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const busiestDay = busiestEntry ? format(new Date(busiestEntry[0]), 'EEEE', { locale: vi }) : 'N/A';

    const typeCounts: Record<string, number> = {};
    items.forEach(i => { if (i.type) typeCounts[i.type] = (typeCounts[i.type] || 0) + 1; });
    const commonEntry = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
    const commonType = commonEntry ? commonEntry[0] : 'N/A';

    const targetStaff = ['Nguyễn Thu Cúc', 'Phạm Văn Nồng', 'Trần Phong Lưu'];
    const staffAllocation = targetStaff.map(staff => {
      const count = items.filter(i => i.chairperson === staff).length;
      const percentage = total > 0 ? (count / total) * 100 : 0;
      return { staff, count, percentage };
    });

    return { total, published, draft, conflictsCount, busiestDay, commonType, staffAllocation };
  }, [items, checkConflicts]);

  const updateItem = useCallback((updatedItem: ScheduleItem) => {
    setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    setEditingItem(null);
    if (autoSync) syncItemsToSystem([updatedItem], true);
    
    logActivity({
      userId: auth.currentUser?.uid || 'anonymous',
      userEmail: auth.currentUser?.email || 'anonymous',
      action: 'Cập nhật lịch công tác',
      details: `Cập nhật lịch: ${updatedItem.content.substring(0, 50)}...`,
      type: 'info',
      module: 'schedule'
    });
  }, []);

  const deleteItem = useCallback((id: string) => {
    const itemToDelete = items.find(i => i.id === id);
    setItems(prev => prev.filter(item => item.id !== id));
    
    if (autoSync && itemToDelete) {
      // For deletion, we need a special handling or just update with a 'cancelled' status
      // But usually system deletion is handled by updateMeetings(prev => prev.filter(...))
      // Let's implement a simple deletion sync
      if (updateMeetings) updateMeetings(prev => prev.filter(i => i.id !== id));
      if (updateTasks) updateTasks(prev => prev.filter(i => i.id !== id));
      if (updateEvents) updateEvents(prev => prev.filter(i => i.id !== id));
    }

    logActivity({
      userId: auth.currentUser?.uid || 'anonymous',
      userEmail: auth.currentUser?.email || 'anonymous',
      action: 'Xóa lịch công tác',
      details: `Xóa lịch: ${itemToDelete?.content.substring(0, 50)}...`,
      type: 'warning',
      module: 'schedule'
    });
  }, [items]);

  const handleAddChip = useCallback((text: string) => {
    if (!customChips[activeTab].includes(text)) {
      setCustomChips(prev => ({ ...prev, [activeTab]: [...prev[activeTab], text] }));
    }
  }, [customChips, activeTab]);

  const handleDeleteChip = useCallback((text: string) => {
    setCustomChips(prev => ({ ...prev, [activeTab]: prev[activeTab].filter(c => c !== text) }));
  }, [activeTab]);

  const handleEditChip = useCallback((oldText: string, newText: string) => {
    if (newText && newText !== oldText && !customChips[activeTab].includes(newText)) {
      setCustomChips(prev => ({
        ...prev,
        [activeTab]: prev[activeTab].map(c => c === oldText ? newText : c)
      }));
    }
  }, [customChips, activeTab]);

  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;
    if (!over) return;

    // Handle Calendar Grid Drag & Drop
    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const removeDraftItem = (type: keyof DraftState, itemToRemove: string) => {
    setDraftState(prev => ({
      ...prev,
      [type]: (prev[type] as string[]).filter(i => i !== itemToRemove)
    }));
  };

  const generateSingleItemWithAI = useCallback(async () => {
    if (!draftState.content && draftState.time.length === 0 && draftState.chairperson.length === 0) return;
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Bạn là Trợ lý Lịch công tác chuyên nghiệp. Hãy chuẩn hóa thông tin sau thành một lịch công tác hoàn chỉnh.
Nhiệm vụ:
1. Chuẩn hóa ngôn ngữ hành chính.
2. Bổ sung thông tin: Nếu thiếu thành phần hoặc địa điểm, hãy suy luận logic (mặc định địa điểm: Phòng họp Đảng ủy).
3. Phân loại ưu tiên: high (BTV, hội nghị lớn), medium (làm việc), low (nội bộ).
4. Cố gắng xác định ngày giờ từ thông tin 'time'. Nếu không rõ, để trống hoặc dùng ngày hiện tại. Dự đoán thời gian kết thúc (endTime) nếu có thể.
5. Trạng thái mặc định là 'draft'.

Dữ liệu đầu vào:
- Thời gian: ${draftState.time.join(', ')}
- Chủ trì: ${draftState.chairperson.join(', ')}
- Địa điểm: ${draftState.location.join(', ')}
- Thành phần: ${draftState.participants.join(', ')}
- Loại hình: ${draftState.type.join(', ')}
- Đơn vị chuẩn bị: ${draftState.preparingUnit.join(', ')}
- Nội dung: ${draftState.content}

HÃY TRẢ VỀ MỘT ĐỐI TƯỢNG JSON duy nhất đại diện cho lịch công tác.
Cấu trúc: { date (YYYY-MM-DD), time (HH:mm), endTime (HH:mm), content, chairperson, location, participants (mảng string), type, preparingUnit, priority, status, notes }
Chỉ trả về JSON.`;

      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const response = await model;
      const text = response.text || '{}';
      const data = parseAIResponse(text);
      
      if (data && data.content) {
        const newItem: ScheduleItem = {
          id: Math.random().toString(36).substr(2, 9),
          date: data.date ? new Date(data.date).toISOString() : currentDate.toISOString(),
          time: data.time || "08:00",
          endTime: data.endTime || undefined,
          duration: 60,
          chairperson: data.chairperson || '',
          type: 'Họp',
          content: data.content,
          participants: data.participants || [],
          location: data.location || '',
          priority: data.priority || 'medium',
          status: data.status || 'draft',
          notes: data.notes || '',
        };
        setItems(prev => [...prev, newItem]);
        // Reset draft
        setDraftState({ time: [], chairperson: [], location: [], participants: [], type: [], preparingUnit: [], content: '' });
        if (autoSync) syncItemsToSystem([newItem], true);
      }
    } catch (err) {
      console.error("AI Error:", err);
    } finally {
      setIsGenerating(false);
    }
  }, [draftState, currentDate]);

  // Automatic AI generation trigger
  useEffect(() => {
    if (!autoGenerate || isGenerating) return;

    const hasTime = draftState.time.length > 0;
    const hasChair = draftState.chairperson.length > 0;
    const hasLoc = draftState.location.length > 0;
    const hasContent = draftState.content.trim().length > 5;
    const hasType = draftState.type.length > 0;

    if (hasTime && hasChair && hasLoc && hasContent && hasType) {
      const timer = setTimeout(() => {
        generateSingleItemWithAI();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [draftState, autoGenerate, isGenerating, generateSingleItemWithAI]);

  const generateWeeklyScheduleWithAI = async () => {
    if (items.length === 0) return;
    setIsGeneratingWeekly(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Bạn là Trợ lý Lịch công tác chuyên nghiệp. Hãy sắp xếp danh sách các lịch công tác rời rạc sau thành một Lịch Tuần hoàn chỉnh, khoa học, không bị trùng lặp.
Nhiệm vụ:
1. Sắp xếp khoa học: Phân bổ các lịch vào các ngày trong tuần (từ Thứ 2 đến Chủ nhật) sao cho hợp lý.
2. Tránh trùng lặp: Đảm bảo một người chủ trì không có 2 lịch cùng một thời điểm. Nếu có, hãy dời lịch ít quan trọng hơn sang buổi khác hoặc ngày khác. Sử dụng time và endTime để kiểm tra.
3. Chuẩn hóa: Đảm bảo văn phong hành chính chuẩn mực.
4. Ưu tiên: Các cuộc họp quan trọng (high priority) nên xếp vào đầu tuần hoặc các khung giờ vàng (08:00, 14:00).
5. Trạng thái: Cập nhật status thành 'published' nếu lịch đã chuẩn và không có vấn đề. Nếu có xung đột không thể giải quyết, để 'draft' và ghi chú vào notes.

Dữ liệu các lịch hiện có:
${JSON.stringify(items.map(i => ({
  id: i.id,
  date: format(new Date(i.date), 'yyyy-MM-dd'),
  time: i.time,
  endTime: i.endTime,
  content: i.content,
  host: i.chairperson,
  location: i.location,
  participants: i.participants,
  priority: i.priority,
  status: i.status
})), null, 2)}

Tuần hiện tại bắt đầu từ: ${format(weekDays[0], 'yyyy-MM-dd')} đến ${format(weekDays[6], 'yyyy-MM-dd')}.

HÃY TRẢ VỀ MỘT MẢNG JSON các đối tượng ScheduleItem đã được sắp xếp và cập nhật. 
Giữ nguyên ID của các mục.
Cấu trúc mỗi mục: { id, date (YYYY-MM-DD), time (HH:mm), endTime (HH:mm), content, chairperson, location, participants, priority, status, notes }
Chỉ trả về JSON.`;

      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const response = await model;
      const text = response.text || '[]';
      const data = parseAIResponse(text);
      
      if (data && Array.isArray(data)) {
        const updatedItems = items.map(item => {
          const aiItem = data.find((d: any) => d.id === item.id);
          if (aiItem) {
            return {
              ...item,
              content: aiItem.content || item.content,
              chairperson: aiItem.chairperson || item.chairperson,
              location: aiItem.location || item.location,
              priority: aiItem.priority || item.priority,
              notes: aiItem.notes || item.notes,
              time: aiItem.time || item.time,
              endTime: aiItem.endTime || item.endTime,
              status: aiItem.status || item.status,
              date: aiItem.date ? new Date(aiItem.date).toISOString() : item.date,
              participants: aiItem.participants || item.participants
            };
          }
          return item;
        });
        setItems(updatedItems);
        if (autoSync) syncItemsToSystem(updatedItems, true);
      }
    } catch (err) {
      console.error("AI Error:", err);
    } finally {
      setIsGeneratingWeekly(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto p-6 space-y-6 min-h-screen bg-slate-50/50 print:bg-white print:p-0">
      <AnimatePresence>
        {showScanner && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                    <FileSearch size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Quét văn bản sang Lịch</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Doc-to-Schedule AI</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowScanner(false)}
                  className="p-2 hover:bg-slate-200 rounded-xl transition-all text-slate-400 hover:text-slate-600"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <DocumentScanner />
                <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-xs text-blue-700 font-bold flex items-center gap-2">
                    <Sparkles size={14} />
                    Sau khi quét xong, hãy copy nội dung văn bản và dán vào thanh lệnh thông minh để AI tự động trích xuất lịch.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="hidden print:block text-center mb-8">
        <h1 className="text-2xl font-black uppercase tracking-widest mb-2">Lịch Công Tác Tuần</h1>
        <p className="text-sm font-bold text-slate-600">
          Từ {format(weekDays[0], 'dd/MM/yyyy')} đến {format(weekDays[6], 'dd/MM/yyyy')}
        </p>
      </div>

      {/* Header & Controls */}
      <div className="flex flex-col gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              <CalendarIcon size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Lịch Công Tác Tuần</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hệ thống quản lý & Chuẩn hóa AI</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button 
                onClick={() => setViewMode('grid')}
                className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
              >
                <ListIcon size={18} />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="Tìm kiếm lịch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none w-48 lg:w-64"
              />
            </div>

            <div className="h-8 w-px bg-slate-200 mx-2 hidden lg:block" />

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentDate(new Date())}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-600 text-xs font-black uppercase tracking-widest"
              >
                Hôm nay
              </button>
              <button 
                onClick={() => setCurrentDate(addDays(currentDate, -7))}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-600"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-700 min-w-[200px] text-center">
                {format(weekDays[0], 'dd/MM')} - {format(weekDays[6], 'dd/MM/yyyy')}
              </div>
              <button 
                onClick={() => setCurrentDate(addDays(currentDate, 7))}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-600"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Smart Command Bar */}
        <div className="relative group">
          <form onSubmit={handleSmartInput} className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                isSmartProcessing ? "bg-blue-100 text-blue-600 animate-pulse" : "bg-blue-50 text-blue-600"
              )}>
                <Sparkles size={16} />
              </div>
            </div>
            <input 
              type="text"
              value={smartInput}
              onChange={(e) => setSmartInput(e.target.value)}
              placeholder="Nhập lịch bằng ngôn ngữ tự nhiên (VD: Họp giao ban sáng thứ 2 lúc 8h tại phòng họp 1)..."
              className="w-full pl-16 pr-32 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all shadow-inner"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button 
                type="button"
                onClick={startListening}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  isListening ? "bg-red-100 text-red-600 animate-bounce" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                )}
                title="Nhập bằng giọng nói"
              >
                <Mic size={20} />
              </button>
              <button 
                type="submit"
                disabled={!smartInput.trim() || isSmartProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-600/20 transition-all"
              >
                {isSmartProcessing ? <Loader2 size={14} className="animate-spin" /> : 'Thêm nhanh'}
              </button>
            </div>
          </form>
          <div className="absolute -bottom-6 left-4 flex items-center gap-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            <span className="flex items-center gap-1"><Info size={10} /> Mẹo: "Sáng mai họp chi bộ lúc 9h"</span>
            <span className="flex items-center gap-1"><Info size={10} /> Mẹo: "Thứ 4 tuần sau đi cơ sở cả ngày"</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button 
              onClick={saveAsTemplate}
              className="px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              <Save size={16} />
              Lưu mẫu
            </button>
            <button 
              onClick={saveToSystem}
              disabled={items.length === 0}
              className="px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 size={16} />
              {autoSync ? 'Đã đồng bộ' : 'Lưu vào Hệ thống'}
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tự động đồng bộ</span>
              <button 
                onClick={() => setAutoSync(!autoSync)}
                className={cn(
                  "w-10 h-5 rounded-full transition-all relative",
                  autoSync ? "bg-emerald-500" : "bg-slate-300"
                )}
              >
                <motion.div 
                  animate={{ x: autoSync ? 20 : 0 }}
                  className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow-sm"
                />
              </button>
            </div>
            <div className="relative group">
              <button 
                className="px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <FolderOpen size={16} />
                Chọn mẫu
              </button>
              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-2 hidden group-hover:block z-50">
                {templates.length === 0 && <p className="text-xs text-slate-400 p-2">Chưa có mẫu nào</p>}
                {templates.map((t, i) => (
                  <button key={i} onClick={() => loadTemplate(t)} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg">
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
            <button 
              onClick={startListening}
              className="px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
            >
              <Mic size={16} />
              Nhập giọng nói
            </button>
            <button 
              onClick={resolveConflictsWithAI}
              disabled={isResolvingConflicts}
              className="px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
            >
              {isResolvingConflicts ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              Xử lý xung đột
            </button>
            <button 
              onClick={() => setShowScanner(true)}
              className="px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 bg-amber-50 text-amber-600 hover:bg-amber-100"
            >
              <FileSearch size={16} />
              Quét văn bản
            </button>
          </div>

          <div className="h-8 w-px bg-slate-200 mx-2 hidden lg:block" />

            <button 
              onClick={() => setIsQuickBuilderOpen(true)}
              className="px-6 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-[0.15em] transition-all flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20"
            >
              <Wand2 size={16} />
              Trợ lý Tạo Lịch AI
            </button>

            <button 
              onClick={() => addItem()}
              className="px-6 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-[0.15em] transition-all flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20"
            >
              <Plus size={16} />
              Thêm Lịch Mới
            </button>

          <button 
            onClick={() => {
              if (window.confirm('Bạn có chắc chắn muốn ban hành lịch tuần này?')) {
                const publishedItems = items.map(item => ({ ...item, status: 'published' as const }));
                setItems(publishedItems);
                if (autoSync) syncItemsToSystem(publishedItems, true);
              }
            }}
            disabled={items.length === 0 || items.every(i => i.status === 'published')}
            className="px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            Ban hành
          </button>

          <button 
            onClick={() => window.print()}
            className="px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            <Printer size={16} />
            In Lịch
          </button>

          <button 
            onClick={generateWeeklyScheduleWithAI}
            disabled={isGeneratingWeekly || items.length === 0}
            className={cn(
              "px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg",
              isGeneratingWeekly ? "bg-slate-100 text-slate-400" : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20"
            )}
          >
            {isGeneratingWeekly ? <Loader2 size={16} className="animate-spin" /> : <CalendarDays size={16} />}
            Hoàn thiện Lịch Tuần (AI)
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Sidebar: Stats & Templates */}
        <div className="xl:col-span-3 space-y-6 print:hidden">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 italic">
              <BarChart3 size={16} className="text-blue-600" />
              Thống kê tuần
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Tổng số</p>
                <p className="text-2xl font-black text-slate-900 italic">{stats.total}</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Đã ban hành</p>
                <p className="text-2xl font-black text-slate-900 italic">{stats.published}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Dự thảo</p>
                <p className="text-2xl font-black text-slate-900 italic">{stats.draft}</p>
              </div>
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Xung đột</p>
                <p className="text-2xl font-black text-slate-900 italic">{stats.conflictsCount}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-500">Bận rộn nhất:</span>
                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {stats.busiestDay}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-500">Loại hình phổ biến:</span>
                <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {stats.commonType}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phân bổ theo lãnh đạo</h4>
              <div className="space-y-3">
                {stats.staffAllocation.map(item => (
                  <div key={item.staff} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-600">{item.staff}</span>
                      <span className="text-slate-900">{item.count}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percentage}%` }}
                        className="h-full bg-blue-500 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 italic">
              <FolderOpen size={16} className="text-amber-600" />
              Mẫu lịch lưu trữ
            </h3>
            <div className="space-y-2">
              {templates.length === 0 ? (
                <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chưa có mẫu</p>
                </div>
              ) : (
                templates.map((t, i) => (
                  <button 
                    key={i} 
                    onClick={() => loadTemplate(t)}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-blue-50 rounded-xl border border-transparent hover:border-blue-200 transition-all group"
                  >
                    <span className="text-xs font-bold text-slate-700 group-hover:text-blue-700">{t.name}</span>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main Calendar/List View */}
        <div className="xl:col-span-9">
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-7 gap-2 print:grid-cols-7 print:gap-2">
                {weekDays.map((day, dayIdx) => {
                  const dayItems = filteredItems.filter(item => isSameDay(new Date(item.date), day));
                  return (
                    <div key={dayIdx} className="space-y-2 print:space-y-2">
                      <div 
                        onClick={() => addItem(day)}
                        className={cn(
                          "p-3 rounded-2xl border text-center transition-all cursor-pointer hover:bg-blue-50 hover:border-blue-200 group print:p-2 print:rounded-lg",
                          isSameDay(day, new Date()) ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20 print:bg-white print:text-black print:border-slate-300 print:shadow-none" : "bg-white border-slate-200 text-slate-900 print:border-slate-300"
                        )}
                      >
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-1 print:text-[8px]">
                          {format(day, 'EEEE', { locale: vi })}
                        </p>
                        <p className="text-xl font-black print:text-sm flex items-center justify-center gap-2">
                          {format(day, 'dd')}
                          <Plus size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                        </p>
                      </div>

                      <div className="min-h-[600px] bg-slate-100/50 rounded-3xl border border-dashed border-slate-200 p-1.5 space-y-2 print:min-h-0 print:border-none print:bg-transparent print:p-0 print:space-y-2">
                        <SortableContext 
                          items={dayItems.map(i => i.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {dayItems.map(item => (
                            <DraggableItem 
                              key={item.id} 
                              item={item} 
                              onEdit={setEditingItem}
                              onDelete={deleteItem}
                              conflicts={checkConflicts(item)}
                            />
                          ))}
                        </SortableContext>
                        
                        <button 
                          onClick={() => addItem(day)}
                          className="w-full py-3 rounded-xl border border-dashed border-slate-300 text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 group print:hidden"
                        >
                          <Plus size={14} className="group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Thêm</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 print:bg-transparent print:border-slate-300">
                      <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black">Thời gian</th>
                      <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black">Nội dung</th>
                      <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black">Chủ trì</th>
                      <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black">Địa điểm</th>
                      <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black">Thành phần</th>
                      <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest print:hidden">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                    {filteredItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-all group print:hover:bg-transparent">
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-900">{format(new Date(item.date), 'dd/MM')}</span>
                            <span className="text-[10px] font-bold text-blue-600">{item.time} {item.endTime ? `- ${item.endTime}` : ''}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full print:hidden",
                              item.priority === 'high' ? "bg-red-500" :
                              item.priority === 'medium' ? "bg-amber-500" :
                              "bg-slate-400"
                            )} />
                            <span className="text-sm font-bold text-slate-800">{item.content}</span>
                          </div>
                          {item.status && (
                            <span className={cn(
                              "inline-block mt-1 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm print:border print:border-slate-300 print:bg-transparent print:text-black",
                              item.status === 'published' ? "bg-emerald-100 text-emerald-700" :
                              item.status === 'cancelled' ? "bg-slate-100 text-slate-500 line-through" :
                              "bg-amber-100 text-amber-700"
                            )}>
                              {item.status === 'published' ? 'Đã ban hành' : item.status === 'cancelled' ? 'Đã hủy' : 'Dự thảo'}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-xs font-bold text-slate-600 print:text-black">{item.chairperson}</td>
                        <td className="p-4 text-xs font-bold text-slate-600 print:text-black">{item.location}</td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {item.participants.slice(0, 2).map(p => (
                              <span key={p} className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500 print:border print:border-slate-300 print:bg-transparent print:text-black">{p}</span>
                            ))}
                            {item.participants.length > 2 && (
                              <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500 print:border print:border-slate-300 print:bg-transparent print:text-black">+{item.participants.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 print:hidden">
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => setEditingItem(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                              <Maximize2 size={14} />
                            </button>
                            <button onClick={() => deleteItem(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DndContext>
        </div>
      </div>

      {/* Quick Builder Modal */}
      <AnimatePresence>
        {isQuickBuilderOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[40px] shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <Wand2 size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Tạo Lịch Nhanh</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Click chọn các yếu tố để AI chuẩn hóa</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Tự động tạo (AI)</span>
                    <button 
                      onClick={() => setAutoGenerate(!autoGenerate)}
                      className={cn(
                        "w-10 h-5 rounded-full transition-all relative",
                        autoGenerate ? "bg-blue-600" : "bg-slate-300"
                      )}
                    >
                      <motion.div 
                        animate={{ x: autoGenerate ? 20 : 0 }}
                        initial={false}
                        className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>
                  <button 
                    onClick={() => setDraftState({ time: [], chairperson: [], location: [], participants: [], type: [], preparingUnit: [], content: '' })}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Xóa tất cả"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button onClick={() => setIsQuickBuilderOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                
                {/* Left: Tabs & Chips */}
                <div className="w-full md:w-1/2 border-r border-slate-100 flex flex-col bg-slate-50/30">
                  <div className="grid grid-cols-3 border-b border-slate-200">
                    {[
                      { id: 'time', label: 'Thời gian', icon: Clock },
                      { id: 'chairperson', label: 'Chủ trì', icon: Users },
                      { id: 'location', label: 'Địa điểm', icon: MapPin },
                      { id: 'participants', label: 'Thành phần', icon: Users },
                      { id: 'type', label: 'Loại hình', icon: Briefcase },
                      { id: 'preparingUnit', label: 'Chuẩn bị', icon: FolderOpen },
                    ].map(tab => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={cn(
                            "py-4 flex flex-col items-center gap-1.5 border-b-2 transition-all",
                            activeTab === tab.id ? "border-blue-600 text-blue-600 bg-blue-50/50" : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                          )}
                        >
                          <Icon size={16} />
                          <span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="p-6 flex-1 overflow-y-auto">
                    <div className="flex flex-wrap gap-2">
                      {customChips[activeTab].map(chip => (
                        <SelectableChip 
                          key={`chip-${activeTab}-${chip}`} 
                          text={chip} 
                          type={activeTab} 
                          isSelected={draftState[activeTab].includes(chip)}
                          onClick={() => {
                            setDraftState(prev => {
                              const currentList = prev[activeTab] as string[];
                              if (currentList.includes(chip)) {
                                return { ...prev, [activeTab]: currentList.filter(x => x !== chip) };
                              } else {
                                return { ...prev, [activeTab]: [...currentList, chip] };
                              }
                            });
                          }}
                          onDelete={() => handleDeleteChip(chip)}
                          onEdit={(newText) => handleEditChip(chip, newText)}
                        />
                      ))}
                      <AddChipInput onAdd={handleAddChip} />
                    </div>
                  </div>
                </div>

                {/* Right: Selected Items & Preview */}
                <div className="w-full md:w-1/2 p-6 overflow-y-auto space-y-6 bg-white">
                  <div className="grid grid-cols-2 gap-4">
                    <SelectedItemsZone label="Thời gian" items={draftState.time} onRemove={(i) => setDraftState((prev: any) => ({ ...prev, time: prev.time.filter((x: string) => x !== i) }))} icon={Clock} colorClass="border-emerald-200 bg-emerald-50/30" />
                    <SelectedItemsZone label="Chủ trì" items={draftState.chairperson} onRemove={(i) => setDraftState((prev: any) => ({ ...prev, chairperson: prev.chairperson.filter((x: string) => x !== i) }))} icon={Users} colorClass="border-indigo-200 bg-indigo-50/30" />
                    <SelectedItemsZone label="Địa điểm" items={draftState.location} onRemove={(i) => setDraftState((prev: any) => ({ ...prev, location: prev.location.filter((x: string) => x !== i) }))} icon={MapPin} colorClass="border-rose-200 bg-rose-50/30" />
                    <SelectedItemsZone label="Thành phần" items={draftState.participants} onRemove={(i) => setDraftState((prev: any) => ({ ...prev, participants: prev.participants.filter((x: string) => x !== i) }))} icon={Users} colorClass="border-amber-200 bg-amber-50/30" />
                    <SelectedItemsZone label="Loại hình" items={draftState.type} onRemove={(i) => setDraftState((prev: any) => ({ ...prev, type: prev.type.filter((x: string) => x !== i) }))} icon={Briefcase} colorClass="border-blue-200 bg-blue-50/30" />
                    <SelectedItemsZone label="Chuẩn bị" items={draftState.preparingUnit} onRemove={(i) => setDraftState((prev: any) => ({ ...prev, preparingUnit: prev.preparingUnit.filter((x: string) => x !== i) }))} icon={FolderOpen} colorClass="border-purple-200 bg-purple-50/30" />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nội dung công việc</label>
                      {draftState.content.length > 0 && (
                        <span className="text-[9px] font-bold text-blue-500">{draftState.content.length} ký tự</span>
                      )}
                    </div>
                    <textarea 
                      value={draftState.content}
                      onChange={(e) => setDraftState({ ...draftState, content: e.target.value })}
                      placeholder="Nhập nội dung công việc hoặc click chọn các yếu tố bên trái..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all min-h-[100px]"
                    />
                  </div>

                  {/* Live Preview Card */}
                  <div className="pt-4 border-t border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-3 block">Xem trước thẻ lịch</label>
                    <div className="p-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/30 opacity-60">
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">
                        <Clock size={10} />
                        {draftState.time.length > 0 ? draftState.time.join(', ') : '08:00'}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                        {draftState.content || 'Nội dung lịch sẽ hiển thị tại đây...'}
                      </h4>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                          <Users size={8} className="text-indigo-500" />
                          {draftState.chairperson.length > 0 ? draftState.chairperson[0] : 'Chủ trì'}
                        </div>
                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                          <MapPin size={8} className="text-rose-500" />
                          {draftState.location.length > 0 ? draftState.location[0] : 'Địa điểm'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      generateSingleItemWithAI().then(() => setIsQuickBuilderOpen(false));
                    }}
                    disabled={isGenerating || (!draftState.content && draftState.time.length === 0 && draftState.chairperson.length === 0)}
                    className={cn(
                      "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg mt-4",
                      isGenerating || (!draftState.content && draftState.time.length === 0 && draftState.chairperson.length === 0) 
                        ? "bg-slate-100 text-slate-400" 
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-600/20 hover:scale-[1.02]"
                    )}
                  >
                    {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                    Tạo & Chuẩn hóa (AI)
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingItem(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
              <div className="relative w-full max-w-4xl bg-white rounded-[40px] shadow-2xl border border-slate-200 overflow-hidden">
                <div className="flex flex-col h-full max-h-[90vh]">
                  {/* Modal Header */}
                  <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                        <FileText size={24} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Chi tiết lịch công tác</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hệ thống quản lý & Chuẩn hóa AI</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setEditingItem(null)}
                      className="p-3 hover:bg-slate-200 rounded-2xl transition-all text-slate-400 hover:text-slate-900"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="flex-1 overflow-y-auto p-8 space-y-10">
                    
                    {/* Section 1: Basic Info */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Thông tin cơ bản</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngày diễn ra</label>
                          <div className="relative">
                            <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                              type="date"
                              value={format(new Date(editingItem.date), 'yyyy-MM-dd')}
                              onChange={(e) => setEditingItem({ ...editingItem, date: new Date(e.target.value).toISOString() })}
                              className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Giờ bắt đầu</label>
                          <div className="relative">
                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                              type="time"
                              value={editingItem.time}
                              onChange={(e) => setEditingItem({ ...editingItem, time: e.target.value })}
                              className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Giờ kết thúc</label>
                          <div className="relative">
                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                              type="time"
                              value={editingItem.endTime || ''}
                              onChange={(e) => setEditingItem({ ...editingItem, endTime: e.target.value })}
                              className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nội dung công việc</label>
                        <textarea 
                          value={editingItem.content}
                          onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
                          placeholder="Nhập nội dung chi tiết của cuộc họp hoặc buổi làm việc..."
                          className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all min-h-[120px] resize-none"
                        />
                      </div>
                    </div>

                    {/* Section 2: Participants & Location */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Thành phần & Địa điểm</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lãnh đạo chủ trì</label>
                          <div className="relative">
                            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select 
                              value={editingItem.chairperson}
                              onChange={(e) => setEditingItem({ ...editingItem, chairperson: e.target.value })}
                              className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none"
                            >
                              <option value="">-- Chọn lãnh đạo --</option>
                              {STAFF_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Địa điểm tổ chức</label>
                          <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select 
                              value={editingItem.location}
                              onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
                              className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none"
                            >
                              <option value="">-- Chọn địa điểm --</option>
                              {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Loại hình công tác</label>
                          <div className="relative">
                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select 
                              value={editingItem.type}
                              onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value })}
                              className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none"
                            >
                              <option value="">-- Chọn loại hình --</option>
                              {WORK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Đơn vị chuẩn bị</label>
                          <div className="relative">
                            <FolderOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select 
                              value={editingItem.preparingUnit}
                              onChange={(e) => setEditingItem({ ...editingItem, preparingUnit: e.target.value })}
                              className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none"
                            >
                              <option value="">-- Chọn đơn vị --</option>
                              {PREPARING_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Thành phần tham dự</label>
                        <div className="flex flex-wrap gap-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl min-h-[60px]">
                          {editingItem.participants.map(p => (
                            <span key={p} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm">
                              {p}
                              <button 
                                onClick={() => setEditingItem({ ...editingItem, participants: editingItem.participants.filter(x => x !== p) })}
                                className="text-slate-400 hover:text-red-500"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                          <button 
                            onClick={() => {
                              const p = prompt("Nhập thành phần tham dự:");
                              if (p) setEditingItem({ ...editingItem, participants: [...editingItem.participants, p] });
                            }}
                            className="px-3 py-1.5 border border-dashed border-slate-300 text-slate-400 hover:text-blue-600 hover:border-blue-300 rounded-xl text-xs font-bold flex items-center gap-1"
                          >
                            <Plus size={12} /> Thêm
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Advanced Settings */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1.5 h-6 bg-amber-600 rounded-full" />
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Thiết lập nâng cao</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mức độ ưu tiên</label>
                          <select 
                            value={editingItem.priority}
                            onChange={(e) => setEditingItem({ ...editingItem, priority: e.target.value as any })}
                            className={cn(
                              "w-full px-5 py-3.5 border rounded-2xl text-sm font-bold focus:ring-4 outline-none transition-all appearance-none",
                              editingItem.priority === 'high' ? "bg-red-50 border-red-200 text-red-700 focus:ring-red-500/10" :
                              editingItem.priority === 'medium' ? "bg-amber-50 border-amber-200 text-amber-700 focus:ring-amber-500/10" :
                              "bg-slate-50 border-slate-200 text-slate-700 focus:ring-slate-500/10"
                            )}
                          >
                            <option value="low">Thấp</option>
                            <option value="medium">Trung bình</option>
                            <option value="high">Cao</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Trạng thái xử lý</label>
                          <select 
                            value={editingItem.status || 'draft'}
                            onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value as any })}
                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none"
                          >
                            <option value="draft">Dự thảo</option>
                            <option value="published">Đã ban hành</option>
                            <option value="cancelled">Đã hủy</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ghi chú bổ sung</label>
                        <textarea 
                          value={editingItem.notes || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                          placeholder="Nhập ghi chú hoặc yêu cầu chuẩn bị đặc biệt..."
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all min-h-[80px] resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                    <button 
                      onClick={() => setEditingItem(null)}
                      className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                    >
                      Hủy bỏ
                    </button>
                    <button 
                      onClick={() => updateItem(editingItem)}
                      className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all"
                    >
                      Lưu & Cập nhật lịch
                    </button>
                  </div>
                </div>
              </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
