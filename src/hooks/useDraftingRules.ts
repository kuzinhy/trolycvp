import { useState, useEffect, useCallback } from 'react';
import { ToastType } from '../components/ui/Toast';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';

export interface DraftingRule {
  id: string;
  content: string;
  isActive: boolean;
}

export function useDraftingRules(showToast: (msg: string, type?: ToastType) => void) {
  const [rules, setRules] = useState<DraftingRule[]>([]);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!user || loading) return;

    const q = query(collection(db, 'users', user.uid, 'drafting_rules'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        // Default rules if none exist
        const defaultRules: DraftingRule[] = [
          { id: '1', content: 'Không sử dụng từ ngữ địa phương, tiếng lóng, biệt ngữ.', isActive: true },
          { id: '2', content: 'Đảm bảo đúng thể thức văn bản hành chính theo Nghị định 30/2020/NĐ-CP (Quốc hiệu, tiêu ngữ, tên cơ quan, số ký hiệu, địa danh, ngày tháng...).', isActive: true },
          { id: '3', content: 'Viết hoa đúng quy định (tên cơ quan, tổ chức, chức vụ, danh hiệu vinh dự, tên địa lý).', isActive: true },
          { id: '4', content: 'Câu văn ngắn gọn, súc tích, rõ nghĩa, không đa nghĩa, tránh lặp từ.', isActive: true },
          { id: '5', content: 'Kiểm tra lỗi chính tả, dấu câu (dấu phẩy, dấu chấm, dấu ngoặc) đúng vị trí.', isActive: true },
          { id: '6', content: 'Sử dụng đúng các thuật ngữ chuyên môn của Đảng và Nhà nước.', isActive: true },
          { id: '7', content: 'Đảm bảo tính logic và sự thống nhất về nội dung giữa các phần trong văn bản.', isActive: true },
          { id: '8', content: 'Trình bày bảng biểu, danh sách (nếu có) đúng quy chuẩn kỹ thuật.', isActive: true }
        ];
        
        // Save default rules to Firestore
        defaultRules.forEach(rule => {
          setDoc(doc(db, 'users', user.uid, 'drafting_rules', rule.id), rule)
            .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/drafting_rules/${rule.id}`));
        });
      } else {
        setRules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DraftingRule)));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/drafting_rules`);
    });

    return () => unsubscribe();
  }, [user?.uid, loading]);

  const addRule = useCallback(async (content: string) => {
    if (!content.trim() || !user) return;
    const id = `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newRule: DraftingRule = {
      id,
      content,
      isActive: true
    };
    try {
      await setDoc(doc(db, 'users', user.uid, 'drafting_rules', id), newRule);
      showToast('Đã thêm quy tắc mới', 'success');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/drafting_rules/${id}`);
      showToast('Lỗi khi thêm quy tắc', 'error');
    }
  }, [user, showToast]);

  const toggleRule = useCallback(async (id: string) => {
    if (!user) return;
    const rule = rules.find(r => r.id === id);
    if (!rule) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'drafting_rules', id), { ...rule, isActive: !rule.isActive }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/drafting_rules/${id}`);
    }
  }, [user, rules]);

  const deleteRule = useCallback(async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'drafting_rules', id));
      showToast('Đã xóa quy tắc', 'info');
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/drafting_rules/${id}`);
      showToast('Lỗi khi xóa quy tắc', 'error');
    }
  }, [user, showToast]);

  const updateRule = useCallback(async (id: string, content: string) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'drafting_rules', id), { content }, { merge: true });
      showToast('Đã cập nhật quy tắc', 'success');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/drafting_rules/${id}`);
      showToast('Lỗi khi cập nhật quy tắc', 'error');
    }
  }, [user, showToast]);

  return {
    rules,
    addRule,
    toggleRule,
    deleteRule,
    updateRule
  };
}
