import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '../hooks/useToast';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, getDocs, orderBy, limit, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';
import { Task, Meeting, Event, Birthday } from '../constants';
import { generateContentWithRetry } from '../lib/ai-utils';
import { DEFAULT_MEETINGS, DEFAULT_EVENTS, DEFAULT_TASKS_DATA } from '../data/defaultSchedule';
import { STAFF_BIRTHDAYS } from '../data/staffBirthdays';

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
  
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS_DATA);
  const [meetings, setMeetings] = useState<Meeting[]>(DEFAULT_MEETINGS);
  const [events, setEvents] = useState<Event[]>(DEFAULT_EVENTS);
  const [birthdays, setBirthdays] = useState<Birthday[]>(STAFF_BIRTHDAYS);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [isMeetingsLoading, setIsMeetingsLoading] = useState(false);
  const [isBirthdaysLoading, setIsBirthdaysLoading] = useState(false);
  const [smartBriefing, setSmartBriefing] = useState<string | null>(null);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);

  const hasSeededTasksRef = useRef(false);
  const hasSeededMeetingsRef = useRef(false);
  const hasSeededEventsRef = useRef(false);
  const hasSeededBirthdaysRef = useRef(false);

  const currentUnitId = useMemo(() => {
    if (authLoading) return null;
    if (unitId && unitId.trim() !== '') return unitId;
    if (isSuperAdmin) return 'vp-dang-uy';
    if (user?.uid) return `personal_${user.uid}`;
    return 'vp-dang-uy';
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
    const unsubTasks = onSnapshot(tasksQuery, async (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
      if (items.length > 0) {
        setTasks(items);
      } else {
        setTasks(DEFAULT_TASKS_DATA);
        if (!hasSeededTasksRef.current && user) {
          hasSeededTasksRef.current = true;
          try {
            for (const t of DEFAULT_TASKS_DATA) {
              await setDoc(doc(db, 'tasks', t.id), {
                ...t,
                unitId: currentUnitId,
                authorUid: user.uid,
                createdAt: t.createdAt || Date.now()
              }, { merge: true });
            }
          } catch (err) {
            console.error("Error auto-seeding tasks:", err);
          }
        }
      }
      setIsTasksLoading(false);
    }, (err) => {
      console.warn("Tasks onSnapshot error:", err);
      setIsTasksLoading(false);
    });

    // Load Meetings
    setIsMeetingsLoading(true);
    const meetingsQuery = query(collection(db, 'meetings'), where('unitId', '==', currentUnitId));
    const unsubMeetings = onSnapshot(meetingsQuery, async (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Meeting));
      if (items.length > 0) {
        setMeetings(items);
      } else {
        setMeetings(DEFAULT_MEETINGS);
        if (!hasSeededMeetingsRef.current && user) {
          hasSeededMeetingsRef.current = true;
          try {
            for (const m of DEFAULT_MEETINGS) {
              await setDoc(doc(db, 'meetings', m.id), {
                ...m,
                unitId: currentUnitId,
                authorUid: user.uid,
                createdAt: serverTimestamp()
              }, { merge: true });
            }
          } catch (err) {
            console.error("Error auto-seeding meetings:", err);
          }
        }
      }
      setIsMeetingsLoading(false);
    }, (err) => {
      console.warn("Meetings onSnapshot error:", err);
      setIsMeetingsLoading(false);
    });

    // Load Events
    const eventsQuery = query(collection(db, 'events'), where('unitId', '==', currentUnitId));
    const unsubEvents = onSnapshot(eventsQuery, async (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Event));
      if (items.length > 0) {
        setEvents(items);
      } else {
        setEvents(DEFAULT_EVENTS);
        if (!hasSeededEventsRef.current && user) {
          hasSeededEventsRef.current = true;
          try {
            for (const e of DEFAULT_EVENTS) {
              await setDoc(doc(db, 'events', e.id), {
                ...e,
                unitId: currentUnitId,
                authorUid: user.uid,
                createdAt: serverTimestamp()
              }, { merge: true });
            }
          } catch (err) {
            console.error("Error auto-seeding events:", err);
          }
        }
      }
    }, (err) => {
      console.warn("Events onSnapshot error:", err);
    });

    // Load Birthdays
    setIsBirthdaysLoading(true);
    const birthdaysQuery = query(collection(db, 'birthdays'), where('unitId', '==', currentUnitId));
    const unsubBirthdays = onSnapshot(birthdaysQuery, async (snap) => {
      const bList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Birthday));

      // Auto-sync Lê Thị Kiều Oanh birthday update if stale
      const oanhDoc = bList.find(b => b.id === 'b-2' || b.name === 'Lê Thị Kiều Oanh');
      if (oanhDoc && (oanhDoc.date === '10/08/1988' || oanhDoc.date === '10/8/1988')) {
        try {
          await updateDoc(doc(db, 'birthdays', oanhDoc.id), { date: '08/10/1988' });
        } catch (e) {
          console.error("Error auto-updating Oanh birthday:", e);
        }
      }

      if (bList.length > 0) {
        setBirthdays(bList);
      } else {
        setBirthdays(STAFF_BIRTHDAYS);
        if (!hasSeededBirthdaysRef.current && user) {
          hasSeededBirthdaysRef.current = true;
          try {
            for (const b of STAFF_BIRTHDAYS) {
              await setDoc(doc(db, 'birthdays', b.id), {
                ...b,
                unitId: currentUnitId,
                authorUid: user.uid,
                createdAt: serverTimestamp()
              }, { merge: true });
            }
          } catch (err) {
            console.error("Error auto-seeding birthdays:", err);
          }
        }
      }
      setIsBirthdaysLoading(false);
    }, (err) => {
      console.warn("Birthdays onSnapshot error:", err);
      setIsBirthdaysLoading(false);
    });

    return () => {
      unsubTasks();
      unsubMeetings();
      unsubBirthdays();
      unsubEvents();
    };
  }, [user, currentUnitId, authLoading]);

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
    setTasks(prevTasks => {
      const newTasks = typeof updater === 'function' ? updater(prevTasks) : updater;
      const added = newTasks.filter(n => !prevTasks.some(o => o.id === n.id));
      const deleted = prevTasks.filter(o => !newTasks.some(n => n.id === o.id));
      const updated = newTasks.filter(n => {
        const old = prevTasks.find(o => o.id === n.id);
        return old && JSON.stringify(old) !== JSON.stringify(n);
      });

      // Execute side-effects safely inside functional update context
      // Note: In React 18 strict mode this might run twice, but addDoc/deleteDoc 
      // are fine with idempotency if generating IDs, or we can deal with small double-writes.
      // Since it's a manual UI action, it's acceptable.
      added.forEach(t => addTask(t));
      deleted.forEach(t => deleteTask(t.id));
      updated.forEach(t => updateTask(t.id, t));
      if (added.length > 0) showToast(`Đã lưu ${added.length} nhiệm vụ mới.`, "success");
      
      return newTasks;
    });
  }, [addTask, updateTask, deleteTask, showToast]);

  const persistentUpdateMeetings = useCallback((updater: Meeting[] | ((prev: Meeting[]) => Meeting[])) => {
    setMeetings(prevMeetings => {
      const newMeetings = typeof updater === 'function' ? updater(prevMeetings) : updater;

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

      return newMeetings;
    });
  }, [addMeeting, updateMeeting, deleteMeeting, showToast]);

  const persistentUpdateEvents = useCallback((updater: Event[] | ((prev: Event[]) => Event[])) => {
    setEvents(prevEvents => {
      const newEvents = typeof updater === 'function' ? updater(prevEvents) : updater;

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

      return newEvents;
    });
  }, [addEvent, updateEvent, deleteEvent, showToast]);

  // Persistent Birthday Handlers
  const addBirthday = useCallback(async (data: Birthday) => {
    if (!user || !currentUnitId) return;
    try {
      const payload = { ...data, unitId: currentUnitId, authorUid: user.uid, createdAt: serverTimestamp() };
      await setDoc(doc(db, 'birthdays', data.id), payload);
    } catch (e) {
      console.error("Error adding birthday:", e);
    }
  }, [user, currentUnitId]);

  const deleteBirthday = useCallback(async (id: string) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'birthdays', id));
    } catch (e) {
      console.error("Error deleting birthday:", e);
    }
  }, []);

  const persistentUpdateBirthdays = useCallback((updater: Birthday[] | ((prev: Birthday[]) => Birthday[])) => {
    setBirthdays(prevBirthdays => {
      const newBirthdays = typeof updater === 'function' ? updater(prevBirthdays) : updater;

      const added = newBirthdays.filter(n => !prevBirthdays.some(o => o.id === n.id));
      const deleted = prevBirthdays.filter(o => !newBirthdays.some(n => n.id === o.id));
      const updated = newBirthdays.filter(n => {
        const old = prevBirthdays.find(o => o.id === n.id);
        return old && JSON.stringify(old) !== JSON.stringify(n);
      });

      added.forEach(b => addBirthday(b));
      deleted.forEach(b => deleteBirthday(b.id));
      updated.forEach(b => addBirthday(b));
      if (added.length > 0) showToast(`Đã lưu ${added.length} sinh nhật mới.`, "success");

      return newBirthdays;
    });
  }, [addBirthday, deleteBirthday, showToast]);

  const generateSmartBriefing = useCallback(async () => {
    if (isGeneratingBriefing || !user) return;
    setIsGeneratingBriefing(true);
    try {
      const today = new Date().toLocaleDateString('vi-VN');
      const taskBrief = tasks.slice(0, 5).map(t => `- ${t.title} (${t.status})`).join('\n');
      const meetingBrief = meetings.slice(0, 3).map(m => `- ${m.time}: ${m.name}`).join('\n');
      
      const hour = new Date().getHours();
      const timeOfDay = hour >= 5 && hour < 12 ? 'buổi sáng' : hour >= 12 && hour < 18 ? 'buổi chiều' : 'buổi tối';
      const prompt = `Hôm nay là ${today} (${timeOfDay}). Đây là lịch trình của tôi cực kỳ tóm tắt:\nNHIỆM VỤ:\n${taskBrief}\nLỊCH HỌP:\n${meetingBrief}\n\nHãy viết một lời chào ${timeOfDay} chuyên nghiệp, truyền cảm hứng và tóm tắt ngắn gọn 3 điểm cần lưu ý nhất cho Đồng chí Nguyễn Minh Huy. Trình bày đẹp bằng Markdown.`;
      
      const response = await generateContentWithRetry({
        model: "gemini-3.7-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      
      const text = response?.text || (response as any)?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      setSmartBriefing(text || `Chào ${timeOfDay} đồng chí! Chúc một ngày làm việc hiệu quả và thành công.`);
    } catch (e) {
      console.error("Lỗi tạo bản tin:", e);
      showToast("Lỗi khi tạo bản tin.", "error");
      const hour = new Date().getHours();
      const timeOfDay = hour >= 5 && hour < 12 ? 'buổi sáng' : hour >= 12 && hour < 18 ? 'buổi chiều' : 'buổi tối';
      setSmartBriefing(`Chào ${timeOfDay} đồng chí! Hệ thống chưa thể kết nối AI để tạo bản tin cá nhân hóa lúc này. Vui lòng thử lại sau.`);
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
    updateBirthdays: persistentUpdateBirthdays,
    generateSmartBriefing, addTask, updateTask, deleteTask
  }), [
    tasks, meetings, events, birthdays, isTasksLoading, isMeetingsLoading,
    isBirthdaysLoading, smartBriefing, isGeneratingBriefing,
    persistentUpdateTasks, persistentUpdateMeetings, persistentUpdateEvents,
    persistentUpdateBirthdays, generateSmartBriefing, addTask, updateTask, deleteTask
  ]);

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};

export const useDashboardContext = () => {
  const context = useContext(DashboardContext);
  if (!context) throw new Error('useDashboardContext must be used within a DashboardProvider');
  return context;
};
