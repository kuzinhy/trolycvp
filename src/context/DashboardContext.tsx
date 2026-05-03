import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '../hooks/useToast';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, getDocs, orderBy, limit, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';
import { Task, Meeting, Event, Birthday } from '../constants';
import { generateContentWithRetry } from '../lib/ai-utils';

interface DashboardContextType {
  tasks: Task[];
  meetings: Meeting[];
  events: Event[];
  birthdays: Birthday[];
  isTasksLoading: boolean;
  isMeetingsLoading: boolean;
  isBirthdaysLoading: boolean;
  smartBriefing: string | null;
  isGeneratingBriefing: boolean;
  updateTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  updateMeetings: React.Dispatch<React.SetStateAction<Meeting[]>>;
  updateBirthdays: React.Dispatch<React.SetStateAction<Birthday[]>>;
  updateEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  generateSmartBriefing: () => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, unitId, isSuperAdmin, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [isMeetingsLoading, setIsMeetingsLoading] = useState(false);
  const [isBirthdaysLoading, setIsBirthdaysLoading] = useState(false);
  const [smartBriefing, setSmartBriefing] = useState<string | null>(null);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);

  const currentUnitId = useMemo(() => {
    if (authLoading) return null;
    if (unitId && unitId.trim() !== '') return unitId;
    if (isSuperAdmin) return 'default_unit';
    if (user?.uid) return `personal_${user.uid}`;
    return null;
  }, [user?.uid, unitId, isSuperAdmin, authLoading]);

  const addToTaskJournal = useCallback(async (item: any, source: 'meeting' | 'event' | 'task') => {
    if (!user || !currentUnitId) return;
    
    const contentText = (item.name || item.title || item.content || '').toLowerCase();
    const isRelevant = contentText.includes('đảng ủy') || contentText.includes('văn phòng') || 
                       contentText.includes('chi bộ') || contentText.includes('đại hội') || 
                       contentText.includes('nghị quyết') || contentText.includes('chỉ thị') ||
                       contentText.includes('chánh văn phòng');
    
    if (!isRelevant) return;

    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const journalCollection = collection(db, 'task_journals');
      
      // Kiểm tra xem đã tồn tại bản ghi này chưa để tránh trùng lặp khi import
      const q = query(journalCollection, 
        where('unitId', '==', currentUnitId), 
        where('content', '==', `[Tự động từ Lịch] ${item.name || item.title || item.content}`),
        limit(1)
      );
      const existing = await getDocs(q);
      if (!existing.empty) return;

      await addDoc(journalCollection, {
        categoryId: 'unit_task',
        content: `[Tự động từ Lịch] ${item.name || item.title || item.content}`,
        implementingDoc: item.location || '',
        assignee: item.chairperson || item.assignee || user.displayName || 'Chưa rõ',
        deadline: item.date || item.deadline || '',
        progress: 'Đang triển khai',
        results: `Đã được hệ thống tự động ghi nhận từ lịch ${source === 'meeting' ? 'họp' : source === 'task' ? 'nhiệm vụ' : 'sự kiện'}.`,
        authorUid: user.uid,
        unitId: currentUnitId,
        year: now.getFullYear(),
        quarter: Math.ceil(month / 3),
        month: month,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error("Error linking to task journal:", e);
    }
  }, [user, currentUnitId]);

  useEffect(() => {
    if (!user || !currentUnitId || authLoading) return;

    // Load Tasks
    setIsTasksLoading(true);
    const tasksQuery = query(collection(db, 'tasks'), where('unitId', '==', currentUnitId));
    const unsubTasks = onSnapshot(tasksQuery, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      setIsTasksLoading(false);
    });

    // Load Meetings
    setIsMeetingsLoading(true);
    const meetingsQuery = query(collection(db, 'meetings'), where('unitId', '==', currentUnitId));
    const unsubMeetings = onSnapshot(meetingsQuery, (snap) => {
      setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Meeting)));
      setIsMeetingsLoading(false);
    });

    // Load Birthdays
    setIsBirthdaysLoading(true);
    const birthdaysQuery = query(collection(db, 'birthdays'), where('unitId', '==', currentUnitId));
    const unsubBirthdays = onSnapshot(birthdaysQuery, (snap) => {
      setBirthdays(snap.docs.map(d => ({ id: d.id, ...d.data() } as Birthday)));
      setIsBirthdaysLoading(false);
    });

    // Load Events
    const eventsQuery = query(collection(db, 'events'), where('unitId', '==', currentUnitId));
    const unsubEvents = onSnapshot(eventsQuery, (snap) => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Event)));
    });

    return () => {
      unsubTasks();
      unsubMeetings();
      unsubBirthdays();
      unsubEvents();
    };
  }, [user, unitId, isSuperAdmin]);

  const addTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt'> & { id?: string, createdAt?: number }) => {
    if (!user || !currentUnitId) return;
    try {
      const data = {
        ...taskData,
        unitId: currentUnitId,
        createdAt: taskData.createdAt || Date.now(),
        authorUid: user.uid
      };
      if (taskData.id) {
        await setDoc(doc(db, 'tasks', taskData.id), data);
      } else {
        await addDoc(collection(db, 'tasks'), data);
      }
      await addToTaskJournal(taskData, 'task');
    } catch (e) {
      console.error("Error adding task:", e);
      showToast("Lỗi khi thêm nhiệm vụ.", "error");
    }
  }, [user, currentUnitId, showToast]);

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    if (!id) return;
    try {
      await updateDoc(doc(db, 'tasks', id), { ...data, updatedAt: serverTimestamp() });
    } catch (e) {
      console.error("Error updating task:", e);
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (e) {
      console.error("Error deleting task:", e);
    }
  }, []);

  // Persistent Meeting Handlers
  const addMeeting = useCallback(async (data: Omit<Meeting, 'id'> & { id?: string }) => {
    if (!user || !currentUnitId) return;
    try {
      const payload = { ...data, unitId: currentUnitId, authorUid: user.uid, createdAt: serverTimestamp() };
      if (data.id) {
        await setDoc(doc(db, 'meetings', data.id), payload);
      } else {
        await addDoc(collection(db, 'meetings'), payload);
      }
      await addToTaskJournal(data, 'meeting');
    } catch (e) {
      console.error("Error adding meeting:", e);
    }
  }, [user, currentUnitId, addToTaskJournal]);

  const updateMeeting = useCallback(async (id: string, data: Partial<Meeting>) => {
    if (!id) return;
    try {
      await updateDoc(doc(db, 'meetings', id), { ...data, updatedAt: serverTimestamp() });
    } catch (e) {
      console.error("Error updating meeting:", e);
    }
  }, []);

  const deleteMeeting = useCallback(async (id: string) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'meetings', id));
    } catch (e) {
      console.error("Error deleting meeting:", e);
    }
  }, []);

  // Persistent Event Handlers
  const addEvent = useCallback(async (data: Omit<Event, 'id'> & { id?: string }) => {
    if (!user || !currentUnitId) return;
    try {
      const payload = { ...data, unitId: currentUnitId, authorUid: user.uid, createdAt: serverTimestamp() };
      if (data.id) {
        await setDoc(doc(db, 'events', data.id), payload);
      } else {
        await addDoc(collection(db, 'events'), payload);
      }
      await addToTaskJournal(data, 'event');
    } catch (e) {
      console.error("Error adding event:", e);
    }
  }, [user, currentUnitId, addToTaskJournal]);

  const updateEvent = useCallback(async (id: string, data: Partial<Event>) => {
    if (!id) return;
    try {
      await updateDoc(doc(db, 'events', id), { ...data, updatedAt: serverTimestamp() });
    } catch (e) {
      console.error("Error updating event:", e);
    }
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'events', id));
    } catch (e) {
      console.error("Error deleting event:", e);
    }
  }, []);

  const persistentUpdateTasks = useCallback((updater: Task[] | ((prev: Task[]) => Task[])) => {
    const prevTasks = tasks;
    const newTasks = typeof updater === 'function' ? updater(prevTasks) : updater;
    setTasks(newTasks);

    const added = newTasks.filter(n => !prevTasks.some(o => o.id === n.id));
    const deleted = prevTasks.filter(o => !newTasks.some(n => n.id === o.id));
    const updated = newTasks.filter(n => {
      const old = prevTasks.find(o => o.id === n.id);
      return old && JSON.stringify(old) !== JSON.stringify(n);
    });

    added.forEach(t => addTask(t));
    deleted.forEach(t => deleteTask(t.id));
    updated.forEach(t => updateTask(t.id, t));
    if (added.length > 0) showToast(`Đã lưu ${added.length} nhiệm vụ mới.`, "success");
  }, [tasks, addTask, updateTask, deleteTask, showToast]);

  const persistentUpdateMeetings = useCallback((updater: Meeting[] | ((prev: Meeting[]) => Meeting[])) => {
    const prevMeetings = meetings;
    const newMeetings = typeof updater === 'function' ? updater(prevMeetings) : updater;
    setMeetings(newMeetings);

    const added = newMeetings.filter(n => !prevMeetings.some(o => o.id === n.id));
    const deleted = prevMeetings.filter(o => !newMeetings.some(n => n.id === o.id));
    const updated = newMeetings.filter(n => {
      const old = prevMeetings.find(o => o.id === n.id);
      return old && JSON.stringify(old) !== JSON.stringify(n);
    });

    added.forEach(m => addMeeting(m));
    deleted.forEach(m => deleteMeeting(m.id));
    updated.forEach(m => updateMeeting(m.id, m));
    if (added.length > 0) showToast(`Đã lưu ${added.length} lịch họp mới.`, "success");
  }, [meetings, addMeeting, updateMeeting, deleteMeeting, showToast]);

  const persistentUpdateEvents = useCallback((updater: Event[] | ((prev: Event[]) => Event[])) => {
    const prevEvents = events;
    const newEvents = typeof updater === 'function' ? updater(prevEvents) : updater;
    setEvents(newEvents);

    const added = newEvents.filter(n => !prevEvents.some(o => o.id === n.id));
    const deleted = prevEvents.filter(o => !newEvents.some(n => n.id === o.id));
    const updated = newEvents.filter(n => {
      const old = prevEvents.find(o => o.id === n.id);
      return old && JSON.stringify(old) !== JSON.stringify(n);
    });

    added.forEach(e => addEvent(e));
    deleted.forEach(e => deleteEvent(e.id));
    updated.forEach(e => updateEvent(e.id, e));
    if (added.length > 0) showToast(`Đã lưu ${added.length} sự kiện mới.`, "success");
  }, [events, addEvent, updateEvent, deleteEvent, showToast]);

  const generateSmartBriefing = useCallback(async () => {
    if (isGeneratingBriefing || !user) return;
    setIsGeneratingBriefing(true);
    try {
      const today = new Date().toLocaleDateString('vi-VN');
      const taskBrief = tasks.slice(0, 5).map(t => `- ${t.title} (${t.status})`).join('\n');
      const meetingBrief = meetings.slice(0, 3).map(m => `- ${m.time}: ${m.name}`).join('\n');
      
      const prompt = `Hôm nay là ${today}. Đây là lịch trình của tôi cực kỳ tóm tắt:\nNHIỆM VỤ:\n${taskBrief}\nLỊCH HỌP:\n${meetingBrief}\n\nHãy viết một câu chào buổi sáng truyền cảm hứng và tóm tắt ngắn gọn 3 điểm cần lưu ý nhất. Trình bày đẹp bằng Markdown.`;
      
      const response = await generateContentWithRetry({
        model: "gemini-1.5-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      
      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || response?.text || "";
      setSmartBriefing(text);
    } catch (e) {
      showToast("Lỗi khi tạo bản tin sáng.", "error");
    } finally {
      setIsGeneratingBriefing(false);
    }
  }, [isGeneratingBriefing, user, tasks, meetings, showToast]);

  const value = useMemo(() => ({
    tasks, meetings, events, birthdays,
    isTasksLoading, isMeetingsLoading, isBirthdaysLoading,
    smartBriefing, isGeneratingBriefing,
    updateTasks: persistentUpdateTasks, 
    updateMeetings: persistentUpdateMeetings, 
    updateEvents: persistentUpdateEvents,
    updateBirthdays: setBirthdays,
    generateSmartBriefing, addTask, updateTask, deleteTask
  }), [
    tasks, meetings, events, birthdays, isTasksLoading, isMeetingsLoading,
    isBirthdaysLoading, smartBriefing, isGeneratingBriefing,
    persistentUpdateTasks, persistentUpdateMeetings, persistentUpdateEvents,
    generateSmartBriefing, addTask, updateTask, deleteTask
  ]);

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};

export const useDashboardContext = () => {
  const context = useContext(DashboardContext);
  if (!context) throw new Error('useDashboardContext must be used within a DashboardProvider');
  return context;
};
