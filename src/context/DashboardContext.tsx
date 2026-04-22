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
  const { user, unitId, isSuperAdmin } = useAuth();
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
    if (unitId && unitId.trim() !== '') return unitId;
    if (isSuperAdmin) return 'default_unit';
    if (user?.uid) return `personal_${user.uid}`;
    return null;
  }, [user?.uid, unitId, isSuperAdmin]);

  useEffect(() => {
    if (!user || !currentUnitId) return;

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
      const id = taskData.id;
      const data = {
        ...taskData,
        unitId: currentUnitId,
        createdAt: taskData.createdAt || Date.now(),
        authorUid: user.uid
      };
      
      if (id) {
        await setDoc(doc(db, 'tasks', id), data);
      } else {
        await addDoc(collection(db, 'tasks'), data);
      }
      showToast("Đã thêm nhiệm vụ mới.", "success");
    } catch (e) {
      console.error("Error adding task:", e);
      showToast("Lỗi khi thêm nhiệm vụ.", "error");
    }
  }, [user, currentUnitId, showToast]);

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    try {
      await updateDoc(doc(db, 'tasks', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error("Error updating task:", e);
      showToast("Lỗi khi cập nhật nhiệm vụ.", "error");
    }
  }, [showToast]);

  const deleteTask = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
      showToast("Đã xóa nhiệm vụ.", "success");
    } catch (e) {
      console.error("Error deleting task:", e);
      showToast("Lỗi khi xóa nhiệm vụ.", "error");
    }
  }, [showToast]);

  const persistentUpdateTasks = useCallback((updater: Task[] | ((prev: Task[]) => Task[])) => {
    const prevTasks = tasks;
    const newTasks = typeof updater === 'function' ? updater(prevTasks) : updater;
    
    // Optimistic update
    setTasks(newTasks);

    // Sync with Firestore
    const added = newTasks.filter(n => !prevTasks.some(o => o.id === n.id));
    const deleted = prevTasks.filter(o => !newTasks.some(n => n.id === o.id));
    const updated = newTasks.filter(n => {
      const old = prevTasks.find(o => o.id === n.id);
      return old && (
        old.title !== n.title || 
        old.description !== n.description || 
        old.status !== n.status || 
        old.priority !== n.priority ||
        old.deadline !== n.deadline
      );
    });

    added.forEach(t => addTask(t));
    deleted.forEach(t => deleteTask(t.id));
    updated.forEach(t => updateTask(t.id, t));
  }, [tasks, addTask, updateTask, deleteTask]);

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
    updateTasks: persistentUpdateTasks, updateMeetings: setMeetings, updateBirthdays: setBirthdays,
    updateEvents: setEvents,
    generateSmartBriefing, addTask, updateTask, deleteTask
  }), [
    tasks, meetings, events, birthdays, isTasksLoading, isMeetingsLoading,
    isBirthdaysLoading, smartBriefing, isGeneratingBriefing,
    generateSmartBriefing, addTask, updateTask, deleteTask
  ]);

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};

export const useDashboardContext = () => {
  const context = useContext(DashboardContext);
  if (!context) throw new Error('useDashboardContext must be used within a DashboardProvider');
  return context;
};
