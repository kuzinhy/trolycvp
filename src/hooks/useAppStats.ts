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

    // 2 & 3. Lắng nghe số lượng thành viên và người online từ Firestore
    const unsubscribeMembers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setMemberCount(snapshot.size);
      let online = 0;
      const now = Date.now();
      const cutoff = now - 5 * 60 * 1000; // 5 phút

      snapshot.forEach(doc => {
        const data = doc.data();
        let isRecentlyActive = false;
        if (data.lastSeen && data.lastSeen.toMillis) {
          isRecentlyActive = data.lastSeen.toMillis() > cutoff;
        }
        
        // Đôi khi isOnline = true bị kẹt do tắt máy đột ngột,
        // nên ta kết hợp với việc có hoạt động trong 5 phút gần đây.
        if (data.isOnline === true && isRecentlyActive) {
          online++;
        }
      });
      setOnlineCount(online);
    });

    return () => {
      unsubscribeStats();
      unsubscribeMembers();
    };
  }, [user?.uid, loading]);

  return { memberCount, onlineCount, visitCount };
}
