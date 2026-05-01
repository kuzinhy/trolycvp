import { useState, useCallback, useEffect, useRef } from 'react';
import { Notification } from '../constants';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, writeBatch, where, arrayUnion, getDocFromServer, limit } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';

export interface NotificationSettings {
  soundEnabled: boolean;
  browserEnabled: boolean;
  ambientEnabled: boolean;
  types: {
    task: boolean;
    event: boolean;
    system: boolean;
    ai: boolean;
  }
}

const DEFAULT_SETTINGS: NotificationSettings = {
  soundEnabled: true,
  browserEnabled: false,
  ambientEnabled: true,
  types: {
    task: true,
    event: true,
    system: true,
    ai: true
  }
};

export function useNotifications() {
  const { user, unitId, isSuperAdmin, loading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [latestNotification, setLatestNotification] = useState<Notification | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem('notification_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [ambientNotification, setAmbientNotification] = useState<{title: string, description: string} | null>(null);
  const lastProcessedId = useRef<string | null>(null);
  const lastProcessedMessageId = useRef<string | null>(null);

  useEffect(() => {
    localStorage.setItem('notification_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!user || loading) return;

    const qGroup = query(
      collection(db, 'team_messages'),
      where('unitId', 'in', [unitId || '', 'system']),
      limit(5)
    );

    const qPrivate = query(
      collection(db, 'team_messages'),
      where('recipientId', '==', user.uid),
      limit(5)
    );

    const unsubscribeGroup = onSnapshot(qGroup, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const isMe = data.senderId === user.uid;
          
          const isVeryRecent = data.createdAt && (Date.now() - data.createdAt.toMillis()) < 10000;
          
          if (!isMe && isVeryRecent && change.doc.id !== lastProcessedMessageId.current) {
            lastProcessedMessageId.current = change.doc.id;
            
            // Trigger ambient notification for chat
            if (settings.ambientEnabled) {
              setAmbientNotification({ 
                title: `💬 Tin nhắn nhóm từ ${data.senderName}`, 
                description: data.text 
              });
              setTimeout(() => setAmbientNotification(null), 8000);
            }
            
            // Play sound if enabled
            if (settings.soundEnabled) {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
              audio.volume = 0.4;
              audio.play().catch(() => {});
            }
          }
        }
      });
    }, (error) => {
      console.warn("Group chat listener error:", error);
    });

    const unsubscribePrivate = onSnapshot(qPrivate, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const isMe = data.senderId === user.uid;
          
          const isVeryRecent = data.createdAt && (Date.now() - data.createdAt.toMillis()) < 10000;
          
          if (!isMe && isVeryRecent && change.doc.id !== lastProcessedMessageId.current) {
            lastProcessedMessageId.current = change.doc.id;
            
            // Trigger ambient notification for chat
            if (settings.ambientEnabled) {
              setAmbientNotification({ 
                title: `💬 Tin nhắn riêng từ ${data.senderName}`, 
                description: data.text 
              });
              setTimeout(() => setAmbientNotification(null), 8000);
            }
            
            // Play sound if enabled
            if (settings.soundEnabled) {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
              audio.volume = 0.4;
              audio.play().catch(() => {});
            }
          }
        }
      });
    }, (error) => {
      console.warn("Private chat listener error:", error);
    });

    return () => {
      unsubscribeGroup();
      unsubscribePrivate();
    };
  }, [user, unitId, loading, settings.ambientEnabled, settings.soundEnabled]);

  useEffect(() => {
    if (!user || loading) {
      setNotifications([]);
      return;
    }

    let q;
    if (isSuperAdmin) {
      q = query(
        collection(db, 'notifications')
      );
    } else {
      // To match security rules and avoid "Missing or insufficient permissions",
      // we query by targetUserId which is either the user's UID or 'all'.
      // We then filter by unitId on the client side.
      q = query(
        collection(db, 'notifications'),
        where('targetUserId', 'in', [user.uid, 'all'])
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedNotifications = snapshot.docs
        .map(doc => {
          const data = doc.data({ serverTimestamps: 'estimate' });
          return {
            id: doc.id,
            title: data.title,
            description: data.description,
            timestamp: data.timestamp?.toMillis() || Date.now(),
            isRead: data.readBy ? data.readBy.includes(user.uid) : false,
            type: data.type,
            link: data.link,
            eventId: data.eventId,
            targetUserId: data.targetUserId,
            unitId: data.unitId
          } as Notification & { targetUserId: string, unitId: string };
        })
        .filter(n => {
          // Client-side filtering for unitId if not super admin
          if (isSuperAdmin) return true;
          return n.unitId === (unitId || '') || n.unitId === 'all';
        })
        .sort((a, b) => b.timestamp - a.timestamp); // Sort in memory
      
      setNotifications(loadedNotifications);

      // Check for new notification for popup
      if (loadedNotifications.length > 0) {
        const newest = loadedNotifications[0];
        const isVeryRecent = (Date.now() - newest.timestamp) < 10000;
        if (isVeryRecent && newest.id !== lastProcessedId.current) {
          lastProcessedId.current = newest.id;
          setLatestNotification(newest);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
    });

    return () => unsubscribe();
  }, [user, unitId, isSuperAdmin]);

  const markAsRead = useCallback(async (id: string) => {
    if (!user) return;
    const path = `notifications/${id}`;
    try {
      const notifRef = doc(db, 'notifications', id);
      await updateDoc(notifRef, {
        readBy: arrayUnion(user.uid)
      });
      
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    try {
      const unreadNotifs = notifications.filter(n => !n.isRead);
      if (unreadNotifs.length === 0) return;

      const batch = writeBatch(db);
      unreadNotifs.forEach(n => {
        const ref = doc(db, 'notifications', n.id);
        batch.update(ref, { readBy: arrayUnion(user.uid) });
      });
      await batch.commit();

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'notifications/batch-update');
    }
  }, [user, notifications]);

  const addNotification = useCallback(async (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>, targetUserId: string = 'all', targetUnitId?: string) => {
    const finalUnitId = targetUnitId || unitId || 'all';
    try {
      await addDoc(collection(db, 'notifications'), {
        ...notification,
        targetUserId,
        unitId: finalUnitId,
        readBy: [],
        timestamp: serverTimestamp()
      });
      
      if (settings.soundEnabled) {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
        audio.volume = 0.4;
        audio.play().catch(() => {});
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notifications');
    }
  }, [unitId, settings.soundEnabled]);

  const triggerAmbient = useCallback((title: string, description: string) => {
    if (!settings.ambientEnabled) return;
    setAmbientNotification({ title, description });
    setTimeout(() => setAmbientNotification(null), 8000);
  }, [settings.ambientEnabled]);

  return {
    notifications,
    showNotifications,
    setShowNotifications,
    latestNotification,
    setLatestNotification,
    settings,
    setSettings,
    ambientNotification,
    setAmbientNotification,
    triggerAmbient,
    markAsRead,
    markAllAsRead,
    addNotification
  };
}
