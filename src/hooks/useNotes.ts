import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: any;
  updatedAt: any;
  userId: string;
  tags: string[];
  isPinned?: boolean;
}

export function useNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotes([]);
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'notes'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Note[];
      
      // Sort in memory to avoid composite index requirement
      const sortedNotes = notesData.sort((a, b) => {
        const timeA = a.updatedAt?.seconds || 0;
        const timeB = b.updatedAt?.seconds || 0;
        return timeB - timeA;
      });

      setNotes(sortedNotes);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notes');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addNote = async (title: string, content: string, tags: string[] = []) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'notes'), {
        title,
        content,
        tags,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notes');
    }
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    try {
      const noteRef = doc(db, 'notes', id);
      await updateDoc(noteRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notes');
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notes', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'notes');
    }
  };

  const togglePin = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'notes', id), {
        isPinned: !currentStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notes');
    }
  };

  return { notes, isLoading, addNote, updateNote, deleteNote, togglePin };
}
