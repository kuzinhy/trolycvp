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
    let q = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), limit(limitCount));
    
    if (module) {
      q = query(collection(db, 'activity_logs'), where('module', '==', module), orderBy('timestamp', 'desc'), limit(limitCount));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ActivityLog[];
  } catch (error) {
    console.error('Error fetching logs:', error);
    return [];
  }
};
