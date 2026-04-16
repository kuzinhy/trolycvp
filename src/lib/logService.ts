import { db } from './firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, where } from 'firebase/firestore';

export interface ActivityLog {
  id?: string;
  userId: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: any;
  type: 'info' | 'warning' | 'error' | 'success';
  module: string;
  result?: any;
}

export const logActivity = async (log: Omit<ActivityLog, 'id' | 'timestamp'>) => {
  try {
    await addDoc(collection(db, 'activity_logs'), {
      ...log,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

export const getLogs = async (module?: string, limitCount: number = 50) => {
  try {
    let q = query(collection(db, 'activity_logs'), limit(limitCount * 2));
    
    if (module) {
      q = query(collection(db, 'activity_logs'), where('module', '==', module), limit(limitCount * 2));
    }
    
    const snapshot = await getDocs(q);
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ActivityLog[];
    
    // Sort client-side
    logs.sort((a, b) => {
      const timeA = a.timestamp?.toMillis?.() || 0;
      const timeB = b.timestamp?.toMillis?.() || 0;
      return timeB - timeA;
    });
    
    return logs.slice(0, limitCount);
  } catch (error) {
    console.error('Error fetching logs:', error);
    return [];
  }
};
