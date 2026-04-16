import { useState, useCallback } from 'react';
import { Event } from '../constants';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, query, deleteDoc } from 'firebase/firestore';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';
import { useAuth } from '../context/AuthContext';
import { ToastType } from '../components/ui/Toast';

export function useEvents(showToast?: (message: string, type?: ToastType) => void) {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [isEventsLoading, setIsEventsLoading] = useState(false);
  const [isSavingEvents, setIsSavingEvents] = useState(false);

  const loadEvents = useCallback(async () => {
    if (!user) return;
    setIsEventsLoading(true);
    try {
      const q = query(collection(db, 'users', user.uid, 'events'));
      const querySnapshot = await getDocs(q);
      const eventsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      setEvents(eventsData);
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `users/${user.uid}/events`);
      showToast?.("Lỗi tải sự kiện từ Firestore", "error");
    } finally {
      setIsEventsLoading(false);
    }
  }, [user, showToast]);

  const saveEventsToFirestore = useCallback(async (eventsToSave: Event[]) => {
    if (!user) return;
    setIsSavingEvents(true);
    try {
      for (const e of eventsToSave) {
        await setDoc(doc(db, 'users', user.uid, 'events', e.id), { ...e }, { merge: true });
      }
      showToast?.("Đã lưu sự kiện lên Firestore", "success");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/events`);
      showToast?.("Lỗi lưu sự kiện lên Firestore", "error");
    } finally {
      setIsSavingEvents(false);
    }
  }, [user, showToast]);

  const updateEvents = useCallback(async (updater: (prev: Event[]) => Event[]) => {
    setEvents(prev => {
      const newEvents = updater(prev);
      
      // Find deleted events
      const deletedEvents = prev.filter(p => !newEvents.some(n => n.id === p.id));
      deletedEvents.forEach(async (e) => {
        if (user && e.id) {
          try {
            await deleteDoc(doc(db, 'users', user.uid, 'events', e.id));
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/events/${e.id}`);
          }
        }
      });

      setTimeout(() => {
        saveEventsToFirestore(newEvents);
      }, 0);
      return newEvents;
    });
  }, [saveEventsToFirestore, user]);

  return { events, isEventsLoading, isSavingEvents, loadEvents, updateEvents };
}
