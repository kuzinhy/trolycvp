import { useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

export const useSystemScanner = () => {
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    if (!isAdmin) return;

    const runBackgroundScan = async () => {
      try {
        // Check for recent errors to avoid duplicate scanning
        const q = query(
          collection(db, 'system_errors'), 
          where('status', '==', 'pending'),
          limit(50)
        );
        
        const snapshot = await getDocs(q);
        const errors = snapshot.docs.map(doc => doc.data());
        errors.sort((a, b) => {
          const timeA = a.detectedAt?.toMillis ? a.detectedAt.toMillis() : 0;
          const timeB = b.detectedAt?.toMillis ? b.detectedAt.toMillis() : 0;
          return timeB - timeA;
        });
        
        const lastError = errors[0];
        
        // If last error was detected less than 1 hour ago, skip background scan
        if (lastError && lastError.detectedAt) {
          const lastDetected = lastError.detectedAt.toDate ? lastError.detectedAt.toDate() : new Date(lastError.detectedAt);
          if (Date.now() - lastDetected.getTime() < 3600000) {
            return;
          }
        }

        // Perform a light scan
        const detectedErrors = [];

        // Check connection
        if (!navigator.onLine) {
          detectedErrors.push({
            name: 'Mất kết nối mạng (Hệ thống tự động phát hiện)',
            severity: 'critical',
            type: 'connection',
            location: 'Background Monitor',
            cause: 'Mất kết nối Internet',
            impact: 'Hệ thống không thể đồng bộ dữ liệu',
            status: 'pending'
          });
        }

        // Check performance
        const start = performance.now();
        await new Promise(r => setTimeout(r, 100));
        const end = performance.now();
        if (end - start > 500) {
          detectedErrors.push({
            name: 'Hiệu năng giảm sút (Hệ thống tự động phát hiện)',
            severity: 'medium',
            type: 'performance',
            location: 'Background Monitor',
            cause: 'Quá tải tác vụ xử lý',
            impact: 'Ứng dụng có thể bị lag',
            status: 'pending'
          });
        }

        for (const err of detectedErrors) {
          await addDoc(collection(db, 'system_errors'), {
            ...err,
            detectedAt: serverTimestamp(),
            log: [`Hệ thống tự động phát hiện lỗi vào lúc ${new Date().toLocaleString()}`]
          });
        }
      } catch (error: any) {
        if (error.message.includes('index')) {
          // Silently fail for index errors in background scan to avoid console spam
          // while the user is creating the index.
          return;
        }
        console.error("Background scan error:", error);
      }
    };

    // Run scan every 30 minutes
    const interval = setInterval(runBackgroundScan, 1800000);
    runBackgroundScan(); // Initial run

    return () => clearInterval(interval);
  }, [isAdmin]);
};
