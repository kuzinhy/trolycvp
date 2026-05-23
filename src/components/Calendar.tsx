import React, { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer, Event } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { useAuth } from "../context/AuthContext";
import { useDashboardContext } from "../context/DashboardContext";
import { getEvents, addEvent, updateEvent, CalendarEvent } from "../services/calendarService";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";

const DnDCalendar = withDragAndDrop(Calendar);

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const categoryColors: { [key: string]: string } = {
  "Work": "#3b82f6",
  "Personal": "#10b981",
  "General": "#64748b",
};

export default function CalendarComponent() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const { user } = useAuth();
  const { tasks, updateTasks } = useDashboardContext();
  const [draggedTask, setDraggedTask] = useState<any>(null);

  useEffect(() => {
    if (user) {
      getEvents(user.uid).then(setEvents);
    } else {
      setEvents([]);
    }
  }, [user]);

  const handleSelectSlot = async ({ start, end }: { start: Date; end: Date }) => {
    if (!user) return;
    const title = window.prompt("New Event title");
    if (title) {
      const newEvent: CalendarEvent = {
        userId: user.uid,
        title,
        start,
        end,
        category: "General",
      };
      await addEvent(newEvent);
      getEvents(user.uid).then(setEvents);
    }
  };

  const onEventDrop = async ({ event, start, end }: any) => {
    if (!event.id) return;
    await updateEvent(event.id, { start, end });
    if (user) getEvents(user.uid).then(setEvents);
  };

  const onDropFromOutside = async ({ start, end, allDay }: any) => {
    if (!user || !draggedTask) return;
    
    // Update task deadline in Firestore
    const newDeadline = start.toISOString();
    try {
      await updateDoc(doc(db, "users", user.uid, "tasks", draggedTask.id), {
        deadline: newDeadline,
        status: 'In Progress'
      });
      // Ensure local state is updated
      if (updateTasks) {
        updateTasks((prev: any) => 
          prev.map((t: any) => t.id === draggedTask.id ? { ...t, deadline: newDeadline, status: 'In Progress' } : t)
        );
      }
      
      // Optionally create a calendar event
      const newEvent: CalendarEvent = {
        userId: user.uid,
        title: draggedTask.title,
        start,
        end,
        category: "Work",
      };
      await addEvent(newEvent);
      getEvents(user.uid).then(setEvents);
      
      setDraggedTask(null);
    } catch (error) {
      console.error("Error updating task deadline:", error);
    }
  };

  const eventPropGetter = (event: any) => {
    const backgroundColor = categoryColors[event.category] || "#64748b";
    return { style: { backgroundColor } };
  };

  // Only show pending tasks
  const pendingTasks = tasks.filter((t) => t.status !== "Completed");

  return (
    <div className="flex h-full gap-4 p-4 bg-slate-50">
      {/* TodoAssistant Tasks Sidebar */}
      <div className="w-80 bg-white p-4 rounded-3xl shadow-sm border border-slate-200 overflow-y-auto hidden md:block">
        <h3 className="font-black text-slate-800 text-lg mb-4">Todo Assistant</h3>
        <p className="text-xs text-slate-500 mb-4">Kéo thả CÔNG VIỆC sang LỊCH LÀM VIỆC để cập nhật deadline.</p>
        <div className="space-y-3">
          {pendingTasks.map((task) => (
            <div
              key={task.id}
              draggable
              onDragStart={() => setDraggedTask(task)}
              className="p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-md transition-all"
            >
              <h4 className="font-bold text-sm text-slate-700">{task.title}</h4>
              {task.deadline && (
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">
                  Đến hạn: {new Date(task.deadline).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
          {pendingTasks.length === 0 && (
            <p className="text-sm text-slate-400 italic">Không có công việc nào chờ xử lý.</p>
          )}
        </div>
      </div>

      {/* Main Calendar Area */}
      <div className="flex-1 bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
        <DnDCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          selectable
          onSelectSlot={handleSelectSlot}
          onEventDrop={onEventDrop}
          onDropFromOutside={onDropFromOutside}
          draggableAccessor={() => true}
          eventPropGetter={eventPropGetter}
          style={{ height: "100%", minHeight: "600px" }}
        />
      </div>
    </div>
  );
}
