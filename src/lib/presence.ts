import { ref, onValue, set, onDisconnect, remove } from "firebase/database";
import { database, auth } from "./firebase";

export const trackUserPresence = (user: { uid: string, displayName?: string | null }) => {
  if (!user) return () => {};

  const connectedRef = ref(database, ".info/connected");
  const userPresenceRef = ref(database, `presence/${user.uid}`);

  const connectedUnsubscribe = onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      set(userPresenceRef, {
        online: true,
        displayName: user.displayName || 'Người dùng',
        lastChanged: Date.now(),
      });
      
      onDisconnect(userPresenceRef).remove();
    }
  });

  return () => {
    connectedUnsubscribe();
  };
};

export const listenForPresenceCount = (onCountChange: (count: number) => void) => {
  const presenceRef = ref(database, "presence");
  const presenceUnsubscribe = onValue(presenceRef, (snap) => {
    const data = snap.val();
    const count = data ? Object.values(data).filter((u: any) => u.online).length : 0;
    onCountChange(count);
  });
  return presenceUnsubscribe;
};
