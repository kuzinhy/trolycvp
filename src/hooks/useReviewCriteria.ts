import { useState, useEffect, useCallback } from 'react';
import { ToastType } from '../components/ui/Toast';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';

export interface ReviewCriteria {
  id: string;
  label: string;
  category: 'party' | 'leadership' | 'general';
  isActive: boolean;
}

export function useReviewCriteria(showToast: (msg: string, type?: ToastType) => void) {
  const [criteria, setCriteria] = useState<ReviewCriteria[]>([]);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!user || loading) return;

    const q = query(collection(db, 'users', user.uid, 'review_criteria'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        // Default criteria if none exist
        const defaultCriteria: ReviewCriteria[] = [
          { id: 'party_compliance', label: 'Tuân thủ Nghị quyết/Chỉ thị Đảng', category: 'party', isActive: true },
          { id: 'directive_adherence', label: 'Bám sát chỉ đạo, hướng dẫn', category: 'party', isActive: true },
          { id: 'formal_tone', label: 'Ngôn ngữ, văn phong Đảng', category: 'party', isActive: true },
          { id: 'party_format', label: 'Thể thức văn bản của Đảng', category: 'party', isActive: true },
          { id: 'clarity', label: 'Tính rõ ràng, súc tích', category: 'general', isActive: true },
          { id: 'completeness', label: 'Đầy đủ nội dung, thể thức', category: 'general', isActive: true },
          { id: 'leadership_alignment', label: 'Phù hợp với định hướng chỉ đạo', category: 'leadership', isActive: true },
          { id: 'leadership_urgency', label: 'Đảm bảo tính kịp thời, khẩn trương', category: 'leadership', isActive: true },
          { id: 'leadership_feasibility', label: 'Tính khả thi trong thực hiện', category: 'leadership', isActive: true }
        ];
        
        // Save default criteria to Firestore
        defaultCriteria.forEach(c => {
          setDoc(doc(db, 'users', user.uid, 'review_criteria', c.id), c)
            .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/review_criteria/${c.id}`));
        });
      } else {
        setCriteria(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReviewCriteria)));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/review_criteria`);
    });

    return () => unsubscribe();
  }, [user?.uid, loading]);

  const addCriteria = useCallback(async (label: string, category: 'party' | 'leadership' | 'general') => {
    if (!label.trim() || !user) return;
    const id = `criteria-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newCriteria: ReviewCriteria = {
      id,
      label,
      category,
      isActive: true
    };
    try {
      await setDoc(doc(db, 'users', user.uid, 'review_criteria', id), newCriteria);
      showToast('Đã thêm tiêu chí rà soát mới', 'success');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/review_criteria/${id}`);
      showToast('Lỗi khi thêm tiêu chí', 'error');
    }
  }, [user, showToast]);

  const toggleCriteria = useCallback(async (id: string) => {
    if (!user) return;
    const item = criteria.find(c => c.id === id);
    if (!item) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'review_criteria', id), { ...item, isActive: !item.isActive }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/review_criteria/${id}`);
    }
  }, [user, criteria]);

  const deleteCriteria = useCallback(async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'review_criteria', id));
      showToast('Đã xóa tiêu chí', 'info');
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/review_criteria/${id}`);
      showToast('Lỗi khi xóa tiêu chí', 'error');
    }
  }, [user, showToast]);

  const updateCriteria = useCallback(async (id: string, label: string) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'review_criteria', id), { label }, { merge: true });
      showToast('Đã cập nhật tiêu chí', 'success');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/review_criteria/${id}`);
      showToast('Lỗi khi cập nhật tiêu chí', 'error');
    }
  }, [user, showToast]);

  return {
    criteria,
    addCriteria,
    toggleCriteria,
    deleteCriteria,
    updateCriteria
  };
}
