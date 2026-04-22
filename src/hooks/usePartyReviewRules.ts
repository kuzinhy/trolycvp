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
            title: 'Quy định 66-QĐ/TW',
            description: 'Về thể thức văn bản của Đảng.',
            isActive: true,
            content: 'Tuân thủ nghiêm ngặt Quy định 66-QĐ/TW về thể thức: Căn lề lề trái 30-35mm, lề phải 15-20mm, lề trên 20-25mm, lề dưới 20-25mm. Font chữ chân phương (Time New Roman).'
          },
          {
            id: 'rule-2',
            category: 'party_rule',
            title: 'Ngôn từ Chính trị',
            description: 'Sử dụng thuật ngữ Đảng chính xác.',
            isActive: true,
            content: 'Sử dụng các thuật ngữ chính trị chuẩn mực (ví dụ: "nâng cao năng lực lãnh đạo", "sức chiến đấu của tổ chức Đảng"). Tuyệt đối không dùng tiếng lóng, từ ngữ không chính thống.'
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

  return {
    rules,
    addRule,
    toggleRule,
    deleteRule
  };
}
