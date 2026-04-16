import { useState, useCallback } from 'react';
import { Meeting } from '../constants';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, query, deleteDoc } from 'firebase/firestore';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';
import { useAuth } from '../context/AuthContext';
import { ToastType } from '../components/ui/Toast';

export function useMeetings(showToast?: (message: string, type?: ToastType) => void) {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isMeetingsLoading, setIsMeetingsLoading] = useState(false);
  const [isSavingMeetings, setIsSavingMeetings] = useState(false);

  const loadMeetings = useCallback(async () => {
    if (!user) return;
    setIsMeetingsLoading(true);
    try {
      const q = query(collection(db, 'users', user.uid, 'meetings'));
      const querySnapshot = await getDocs(q);
      const meetingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meeting));
      setMeetings(meetingsData);
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `users/${user.uid}/meetings`);
      showToast?.("Lỗi tải lịch họp từ Firestore", "error");
    } finally {
      setIsMeetingsLoading(false);
    }
  }, [user, showToast]);

  const saveMeetingsToFirestore = useCallback(async (meetingsToSave: Meeting[]) => {
    if (!user) return;
    setIsSavingMeetings(true);
    try {
      for (const m of meetingsToSave) {
        await setDoc(doc(db, 'users', user.uid, 'meetings', m.id), { ...m }, { merge: true });
      }
      showToast?.("Đã lưu lịch họp lên Firestore", "success");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/meetings`);
      showToast?.("Lỗi lưu lịch họp lên Firestore", "error");
    } finally {
      setIsSavingMeetings(false);
    }
  }, [user, showToast]);

  const updateMeetings = useCallback(async (updater: (prev: Meeting[]) => Meeting[]) => {
    setMeetings(prev => {
      const newMeetings = updater(prev);
      
      // Find deleted meetings
      const deletedMeetings = prev.filter(p => !newMeetings.some(n => n.id === p.id));
      deletedMeetings.forEach(async (m) => {
        if (user && m.id) {
          try {
            await deleteDoc(doc(db, 'users', user.uid, 'meetings', m.id));
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/meetings/${m.id}`);
          }
        }
      });

      setTimeout(() => {
        saveMeetingsToFirestore(newMeetings);
      }, 0);
      return newMeetings;
    });
  }, [saveMeetingsToFirestore, user]);

  return { meetings, isMeetingsLoading, isSavingMeetings, loadMeetings, updateMeetings };
}
