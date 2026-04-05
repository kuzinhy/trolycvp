import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  limit,
  Timestamp
} from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';

export interface AccessLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: string; // 'visit', 'click', 'search', 'ai_interaction'
  module: string; // 'dashboard', 'chat', 'news', etc.
  details?: string;
  timestamp: any;
}

interface HistoryContextType {
  logs: AccessLog[];
  isLoading: boolean;
  indexError: string | null;
  logAction: (action: string, module: string, details?: string) => Promise<void>;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [indexError, setIndexError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLogs([]);
      setIsLoading(false);
      setIndexError(null);
      return;
    }

    setIsLoading(true);
    setIndexError(null);
    const q = query(
      collection(db, 'access_logs'),
      where('userId', '==', user.uid),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AccessLog[];
      
      newLogs.sort((a, b) => {
        const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
        const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
        return timeB - timeA;
      });
      
      setLogs(newLogs);
      setIsLoading(false);
    }, (error) => {
      if (error.message.includes('index')) {
        setIndexError("Hệ thống yêu cầu tạo Index cho 'access_logs' để hiển thị nhật ký truy cập.");
        console.warn("Firestore Index Required: Please follow the link in the console to create the required index for 'access_logs'.");
      } else {
        handleFirestoreError(error, OperationType.GET, 'access_logs');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const logAction = useCallback(async (action: string, module: string, details?: string) => {
    if (!user) return;

    try {
      await addDoc(collection(db, 'access_logs'), {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || user.email?.split('@')[0] || 'Người dùng',
        action,
        module,
        details: details || '',
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'access_logs');
    }
  }, [user]);

  return (
    <HistoryContext.Provider value={{ logs, isLoading, indexError, logAction }}>
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistory = () => {
  const context = useContext(HistoryContext);
  if (context === undefined) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
};
