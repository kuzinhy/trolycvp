import React, { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { auth } from "../lib/firebase";
import { getEvents, addEvent, updateEvent, CalendarEvent } from "../services/calendarService";

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
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (userId) {
      getEvents(userId).then(setEvents);
    }
  }, [userId]);

  const handleSelectSlot = async ({ start, end }: { start: Date; end: Date }) => {
    if (!userId) return;
    const title = window.prompt("New Event title");
    if (title) {
      const newEvent: CalendarEvent = {
        userId,
        title,
        start,
        end,
        category: "General",
      };
      await addEvent(newEvent);
      getEvents(userId).then(setEvents);
    }
  };

  const onEventDrop = async ({ event, start, end }: any) => {
    if (!event.id) return;
    await updateEvent(event.id, { start, end });
    if (userId) getEvents(userId).then(setEvents);
  };

  const eventPropGetter = (event: any) => {
    const backgroundColor = categoryColors[event.category] || "#64748b";
    return { style: { backgroundColor } };
  };

  return (
    <div className="h-[600px] p-4 bg-white rounded-3xl shadow-sm border border-slate-200">
      <DnDCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        selectable
        onSelectSlot={handleSelectSlot}
        onEventDrop={onEventDrop}
        eventPropGetter={eventPropGetter}
        style={{ height: "100%" }}
      />
    </div>
  );
}
