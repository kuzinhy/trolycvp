import React, { useState } from 'react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../constants';
import { cn } from '../lib/utils';
import { Calendar, Clock, Edit2, Check, X, GripVertical } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface KanbanViewProps {
  tasks: Task[];
  updateTasks: (updater: Task[] | ((prev: Task[]) => Task[])) => Promise<void>;
}

const KanbanCard = ({ task, onUpdate }: { task: Task, onUpdate: (id: string, updates: Partial<Task>) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDeadline, setEditDeadline] = useState(task.deadline);
  const [editProgress, setEditProgress] = useState(task.progress || 0);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    onUpdate(task.id, { 
      title: editTitle, 
      deadline: editDeadline, 
      progress: editProgress 
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="bg-white p-4 rounded-xl shadow-lg border-2 border-indigo-500 space-y-3">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="w-full text-sm font-bold border-b border-slate-200 focus:border-indigo-500 outline-none pb-1"
          placeholder="Tiêu đề nhiệm vụ"
          autoFocus
        />
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-slate-400" />
          <input
            type="date"
            value={editDeadline}
            onChange={(e) => setEditDeadline(e.target.value)}
            className="text-xs font-medium text-slate-600 outline-none"
          />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
            <span>Tiến độ</span>
            <span>{editProgress}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={editProgress}
            onChange={(e) => setEditProgress(parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={() => setIsEditing(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
            <X size={16} />
          </button>
          <button onClick={handleSave} className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700">
            <Check size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-200 transition-all cursor-default relative",
        task.priority === 'high' ? "border-l-4 border-l-rose-500" :
        task.priority === 'medium' ? "border-l-4 border-l-amber-500" :
        "border-l-4 border-l-slate-400"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-slate-800 leading-snug mb-2 group-hover:text-indigo-700 transition-colors">
            {task.title}
          </h4>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
              <Calendar size={10} />
              {task.deadline ? format(parseISO(task.deadline), 'dd/MM') : 'N/A'}
            </div>
            {task.progress !== undefined && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                <Clock size={10} />
                {task.progress}%
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div {...attributes} {...listeners} className="p-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing">
            <GripVertical size={14} />
          </div>
          <button 
            onClick={() => setIsEditing(true)}
            className="p-1 text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all"
          >
            <Edit2 size={14} />
          </button>
        </div>
      </div>

      {task.progress !== undefined && (
        <div className="mt-3 w-full h-1 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 transition-all duration-500" 
            style={{ width: `${task.progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export const KanbanView: React.FC<KanbanViewProps> = ({ tasks, updateTasks }) => {
  const columns: { id: Task['status'], label: string, color: string }[] = [
    { id: 'Pending', label: 'Chờ thực hiện', color: 'bg-slate-100' },
    { id: 'In Progress', label: 'Đang triển khai', color: 'bg-indigo-50' },
    { id: 'Completed', label: 'Đã hoàn thành', color: 'bg-emerald-50' }
  ];

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    const overId = over.id as string;

    // If dragging over a column
    if (['Pending', 'In Progress', 'Completed'].includes(overId)) {
      if (activeTask && activeTask.status !== overId) {
        updateTasks(prev => prev.map(t => 
          t.id === active.id ? { ...t, status: overId as Task['status'] } : t
        ));
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;

    const overId = over.id as string;

    // If dropped on a different column or task in a different column
    let newStatus: Task['status'] | null = null;
    if (['Pending', 'In Progress', 'Completed'].includes(overId)) {
      newStatus = overId as Task['status'];
    } else {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask && overTask.status !== activeTask.status) {
        newStatus = overTask.status;
      }
    }

    if (newStatus && activeTask.status !== newStatus) {
      updateTasks(prev => prev.map(t => 
        t.id === active.id ? { ...t, status: newStatus as Task['status'] } : t
      ));
    }
  };

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    updateTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 p-6 h-full min-h-[600px] overflow-x-auto bg-slate-50/30">
        {columns.map(column => (
          <div key={column.id} className="flex flex-col w-80 flex-shrink-0">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">{column.label}</h3>
                <span className="bg-white border border-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  {tasks.filter(t => t.status === column.id).length}
                </span>
              </div>
            </div>

            <SortableContext
              id={column.id}
              items={tasks.filter(t => t.status === column.id).map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div 
                className={cn(
                  "flex-1 p-3 rounded-2xl border-2 border-dashed border-transparent transition-colors space-y-3 min-h-[200px]",
                  column.color,
                  activeId && tasks.find(t => t.id === activeId)?.status !== column.id && "border-indigo-200 bg-indigo-50/50"
                )}
              >
                {tasks
                  .filter(task => task.status === column.id)
                  .map(task => (
                    <KanbanCard key={task.id} task={task} onUpdate={handleUpdateTask} />
                  ))}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>

      <DragOverlay dropAnimation={{
        sideEffects: defaultDropAnimationSideEffects({
          styles: {
            active: {
              opacity: '0.5',
            },
          },
        }),
      }}>
        {activeId ? (
          <div className="bg-white p-4 rounded-xl shadow-2xl border-2 border-indigo-500 w-80 rotate-3 cursor-grabbing">
            <h4 className="text-sm font-bold text-slate-800">{tasks.find(t => t.id === activeId)?.title}</h4>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
