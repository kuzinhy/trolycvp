import { useState, useCallback } from 'react';
import { Birthday } from '../constants';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, query, deleteDoc } from 'firebase/firestore';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';
import { useAuth } from '../context/AuthContext';
import { ToastType } from '../components/ui/Toast';

export function useBirthdays(showToast?: (message: string, type?: ToastType) => void) {
  const { user } = useAuth();
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [isBirthdaysLoading, setIsBirthdaysLoading] = useState(false);
  const [isSavingBirthdays, setIsSavingBirthdays] = useState(false);

  const loadBirthdays = useCallback(async () => {
    if (!user) return;
    setIsBirthdaysLoading(true);
    try {
      const q = query(collection(db, 'users', user.uid, 'birthdays'));
      const querySnapshot = await getDocs(q);
      const birthdaysData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Birthday));
      setBirthdays(birthdaysData);
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `users/${user.uid}/birthdays`);
      showToast?.("Lỗi tải sinh nhật từ Firestore", "error");
    } finally {
      setIsBirthdaysLoading(false);
    }
  }, [user, showToast]);

  const saveBirthdaysToFirestore = useCallback(async (birthdaysToSave: Birthday[]) => {
    if (!user) return;
    setIsSavingBirthdays(true);
    try {
      for (const b of birthdaysToSave) {
        await setDoc(doc(db, 'users', user.uid, 'birthdays', b.id), { ...b }, { merge: true });
      }
      showToast?.("Đã lưu sinh nhật lên Firestore", "success");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/birthdays`);
      showToast?.("Lỗi lưu sinh nhật lên Firestore", "error");
    } finally {
      setIsSavingBirthdays(false);
    }
  }, [user, showToast]);

  const updateBirthdays = useCallback(async (updater: (prev: Birthday[]) => Birthday[]) => {
    setBirthdays(prev => {
      const newBirthdays = updater(prev);
      
      // Find deleted birthdays
      const deletedBirthdays = prev.filter(p => !newBirthdays.some(n => n.id === p.id));
      deletedBirthdays.forEach(async (b) => {
        if (user && b.id) {
          try {
            await deleteDoc(doc(db, 'users', user.uid, 'birthdays', b.id));
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/birthdays/${b.id}`);
          }
        }
      });

      setTimeout(() => {
        saveBirthdaysToFirestore(newBirthdays);
      }, 0);
      return newBirthdays;
    });
  }, [saveBirthdaysToFirestore, user]);

  return { birthdays, isBirthdaysLoading, isSavingBirthdays, loadBirthdays, updateBirthdays };
}
