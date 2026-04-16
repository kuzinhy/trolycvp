import { collection, getDocs, writeBatch, doc, query, where, addDoc, serverTimestamp, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface BackupData {
  version: string;
  timestamp: number;
  data: {
    tasks: any[];
    meetings: any[];
    events: any[];
    birthdays: any[];
    party_documents: any[];
    user_preferences: any;
  };
}

export async function createBackup(userId: string, unitId: string): Promise<BackupData> {
  const backup: BackupData = {
    version: '1.0',
    timestamp: Date.now(),
    data: {
      tasks: [],
      meetings: [],
      events: [],
      birthdays: [],
      party_documents: [],
      user_preferences: null
    }
  };

  // 1. Fetch Tasks
  const tasksSnap = await getDocs(collection(db, 'users', userId, 'tasks'));
  backup.data.tasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // 2. Fetch Meetings
  const meetingsSnap = await getDocs(collection(db, 'users', userId, 'meetings'));
  backup.data.meetings = meetingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // 3. Fetch Events
  const eventsSnap = await getDocs(collection(db, 'users', userId, 'events'));
  backup.data.events = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // 4. Fetch Birthdays
  const birthdaysSnap = await getDocs(collection(db, 'users', userId, 'birthdays'));
  backup.data.birthdays = birthdaysSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // 5. Fetch Party Documents (Knowledge)
  const knowledgeQuery = query(collection(db, 'party_documents'), where('unitId', '==', unitId));
  const knowledgeSnap = await getDocs(knowledgeQuery);
  backup.data.party_documents = knowledgeSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // 6. Fetch User Preferences
  const prefSnap = await getDocs(collection(db, 'users', userId, 'preferences'));
  if (!prefSnap.empty) {
    backup.data.user_preferences = prefSnap.docs[0].data();
  }

  return backup;
}

export async function restoreBackup(userId: string, unitId: string, backup: BackupData): Promise<void> {
  const batch = writeBatch(db);

  // Helper to clear and restore a collection
  const restoreCollection = async (collectionPath: string, items: any[]) => {
    const pathParts = collectionPath.split('/');
    const collectionRef = collection(db, pathParts[0], ...pathParts.slice(1));
    const snap = await getDocs(collectionRef);
    snap.docs.forEach(d => batch.delete(d.ref));
    items.forEach(item => {
      const { id, ...data } = item;
      batch.set(doc(db, pathParts[0], ...pathParts.slice(1), id), data);
    });
  };

  // Restore Tasks
  await restoreCollection(`users/${userId}/tasks`, backup.data.tasks);
  
  // Restore Meetings
  await restoreCollection(`users/${userId}/meetings`, backup.data.meetings);
  
  // Restore Events
  await restoreCollection(`users/${userId}/events`, backup.data.events);
  
  // Restore Birthdays
  await restoreCollection(`users/${userId}/birthdays`, backup.data.birthdays);

  // Restore Knowledge (Careful with unitId)
  const knowledgeSnap = await getDocs(query(collection(db, 'party_documents'), where('unitId', '==', unitId)));
  knowledgeSnap.docs.forEach(d => batch.delete(d.ref));
  backup.data.party_documents.forEach(item => {
    const { id, ...data } = item;
    batch.set(doc(db, 'party_documents', id), { ...data, unitId }); // Ensure unitId matches
  });

  // Restore Preferences
  if (backup.data.user_preferences) {
    batch.set(doc(db, 'users', userId, 'preferences', 'settings'), backup.data.user_preferences);
  }

  await batch.commit();
}

export async function saveSnapshot(userId: string, unitId: string, label: string): Promise<void> {
  const backup = await createBackup(userId, unitId);
  await addDoc(collection(db, 'users', userId, 'backups'), {
    ...backup,
    label,
    createdAt: serverTimestamp()
  });
}

export async function getSnapshots(userId: string): Promise<any[]> {
  const q = query(collection(db, 'users', userId, 'backups'), orderBy('createdAt', 'desc'), limit(10));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteSnapshot(userId: string, snapshotId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'backups', snapshotId));
}
