import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, runTransaction, serverTimestamp, getDoc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

import { ref, onValue } from 'firebase/database';
import { database } from '../lib/firebase';

export function useAppStats() {
  const [memberCount, setMemberCount] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [visitCount, setVisitCount] = useState(0);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!user || loading) return;

    // 1. Lắng nghe thông số hệ thống (visitCount) từ Firestore
    const statsDocRef = doc(db, 'system', 'stats');
    const unsubscribeStats = onSnapshot(statsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setVisitCount(data.visitCount || 0);
      }
    });

    // 2. Lắng nghe số lượng thành viên từ Firestore
    const unsubscribeMembers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setMemberCount(snapshot.size);
    });

    // 3. Lắng nghe số lượng người online từ Realtime Database
    const presenceRef = ref(database, 'presence');
    const unsubscribeOnline = onValue(presenceRef, (snapshot) => {
      const data = snapshot.val();
      const count = data ? Object.keys(data).length : 0;
      setOnlineCount(count);
    });

    return () => {
      unsubscribeStats();
      unsubscribeMembers();
      unsubscribeOnline();
    };
  }, [user?.uid, loading]);

  return { memberCount, onlineCount, visitCount };
}
