import { db } from "../lib/firebase";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore";

export interface CalendarEvent {
  id?: string;
  userId: string;
  title: string;
  start: Date;
  end: Date;
  category: string;
  description?: string;
}

const EVENTS_COLLECTION = "events";

export async function addEvent(event: CalendarEvent) {
  return await addDoc(collection(db, EVENTS_COLLECTION), {
    ...event,
    start: event.start.toISOString(),
    end: event.end.toISOString(),
  });
}

export async function getEvents(userId: string): Promise<CalendarEvent[]> {
  const q = query(collection(db, EVENTS_COLLECTION), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    start: new Date(doc.data().start),
    end: new Date(doc.data().end),
  })) as CalendarEvent[];
}

export async function updateEvent(id: string, event: Partial<CalendarEvent>) {
  const eventRef = doc(db, EVENTS_COLLECTION, id);
  const updateData: any = { ...event };
  if (event.start) updateData.start = event.start.toISOString();
  if (event.end) updateData.end = event.end.toISOString();
  return await updateDoc(eventRef, updateData);
}

export async function deleteEvent(id: string) {
  return await deleteDoc(doc(db, EVENTS_COLLECTION, id));
}
