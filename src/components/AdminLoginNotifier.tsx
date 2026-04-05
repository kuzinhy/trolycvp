import React, { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { User, Bell, X } from 'lucide-react';

interface OnlineUser {
  uid: string;
  displayName: string;
  email: string;
  isOnline: boolean;
  lastSeen: any;
  unitId?: string;
}

export const AdminLoginNotifier: React.FC = () => {
  const { user, isAdmin, isSuperAdmin, unitId } = useAuth();
  const [notification, setNotification] = useState<{ name: string; email: string } | null>(null);
  const prevOnlineUids = useRef<Set<string>>(new Set());
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (!isAdmin || !user) return;

    let q;
    if (isSuperAdmin) {
      q = query(collection(db, 'users'), where('isOnline', '==', true));
    } else {
      q = query(collection(db, 'users'), where('isOnline', '==', true));
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const currentOnlineUids = new Set<string>();
      const newLogins: { name: string; email: string }[] = [];

      snapshot.docs.forEach((doc) => {
        const userData = doc.data() as OnlineUser;
        const uid = doc.id;
        
        // Filter by unitId for non-super admins
        if (!isSuperAdmin && userData.unitId !== unitId) {
          return;
        }

        currentOnlineUids.add(uid);

        // If this user was not online before, and it's not the current admin
        if (!prevOnlineUids.current.has(uid) && uid !== user.uid && !isFirstRun.current) {
          newLogins.push({
            name: userData.displayName || 'Người dùng mới',
            email: userData.email || ''
          });
        }
      });

      if (newLogins.length > 0) {
        // Show the latest login
        setNotification(newLogins[newLogins.length - 1]);
        
        // Auto hide after 5 seconds
        setTimeout(() => {
          setNotification(null);
        }, 5000);
      }

      prevOnlineUids.current = currentOnlineUids;
      isFirstRun.current = false;
    }, (error) => {
      console.error("Error monitoring logins:", error);
    });

    return () => unsubscribe();
  }, [isAdmin, isSuperAdmin, unitId, user?.uid]);

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, x: 100, y: 0 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 100 }}
          className="fixed bottom-24 right-6 z-[140] w-72 bg-white rounded-2xl border border-emerald-100 shadow-2xl p-4 overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <User size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Đăng nhập mới</span>
                <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              </div>
              <p className="text-sm font-bold text-slate-800 truncate">{notification.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{notification.email}</p>
            </div>
          </div>
          <motion.div 
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 5, ease: "linear" }}
            className="absolute bottom-0 left-0 h-0.5 bg-emerald-100"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
