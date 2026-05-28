import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';

export interface ReviewRule {
  id: string;
  category: 'party_rule' | 'grammar' | 'format';
  title: string;
  description: string;
  isActive: boolean;
  content: string;
}

export function usePartyReviewRules() {
  const [rules, setRules] = useState<ReviewRule[]>([]);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!user || loading) return;

    const q = query(collection(db, 'users', user.uid, 'party_review_rules'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        const defaultRules: ReviewRule[] = [
          {
            id: 'rule-1',
            category: 'party_rule',
            title: 'Hướng dẫn 05-HD/VPTW (2026)',
            description: 'Thể thức bản sao, lề giấy, phông chữ.',
            isActive: true,
            content: 'Tuân thủ Hướng dẫn 05-HD/VPTW: Lề trái 30mm, lề phải 15mm, lề trên 20mm, lề dưới 20mm. Font chữ Times New Roman (TCVN 6909:2001), màu đen. Ghi chú đúng thẩm quyền ký.'
          },
          {
            id: 'rule-2',
            category: 'party_rule',
            title: 'Quy định 399-QĐ/TW',
            description: 'Thể loại, thẩm quyền ban hành.',
            isActive: true,
            content: 'Áp dụng Quy định 399-QĐ/TW (2026) về loại văn bản Đảng. Sử dụng các thuật ngữ chính trị chuẩn mực, tuyệt đối không dùng tiếng lóng. Đúng chức danh thẩm quyền ban hành.'
          },
          {
            id: 'rule-3',
            category: 'grammar',
            title: 'Ngữ pháp & Chính tả',
            description: 'Kiểm tra lỗi chính tả và cấu trúc câu.',
            isActive: true,
            content: 'Kiểm tra lỗi chính tả, dấu câu, đặc biệt là các tên riêng, địa danh và chức danh lãnh đạo phải được viết hoa đúng quy định.'
          },
          {
            id: 'rule-4',
            category: 'format',
            title: 'Cấu trúc Nghị quyết',
            description: 'Quy tắc về bố cục 4 phần.',
            isActive: true,
            content: 'Đảm bảo bố cục nghị quyết gồm: I. Tình hình và kết quả; II. Mục tiêu, nhiệm vụ và giải pháp; III. Tổ chức thực hiện; IV. Kiến nghị.'
          }
        ];
        
        defaultRules.forEach(rule => {
          setDoc(doc(db, 'users', user.uid, 'party_review_rules', rule.id), rule);
        });
      } else {
        setRules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReviewRule)));
      }
    });

    return () => unsubscribe();
  }, [user?.uid, loading]);

  const addRule = useCallback(async (rule: Omit<ReviewRule, 'id' | 'isActive'>) => {
    if (!user) return;
    const id = `p-rule-${Date.now()}`;
    const newRule: ReviewRule = {
      ...rule,
      id,
      isActive: true
    };
    await setDoc(doc(db, 'users', user.uid, 'party_review_rules', id), newRule);
  }, [user]);

  const toggleRule = useCallback(async (id: string, currentStatus: boolean) => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid, 'party_review_rules', id), { isActive: !currentStatus }, { merge: true });
  }, [user]);

  const deleteRule = useCallback(async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'party_review_rules', id));
  }, [user]);

  const updateRule = useCallback(async (id: string, updatedData: Partial<Omit<ReviewRule, 'id'>>) => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid, 'party_review_rules', id), updatedData, { merge: true });
  }, [user]);

  return {
    rules,
    addRule,
    toggleRule,
    deleteRule,
    updateRule
  };
}
