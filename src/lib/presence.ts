import { ref, onValue, set, onDisconnect, remove } from "firebase/database";
import { database, auth } from "./firebase";

export const trackPresence = (onCountChange: (count: number) => void) => {
  const connectedRef = ref(database, ".info/connected");
  const presenceRef = ref(database, "presence");

  onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      if (auth.currentUser) {
        const userPresenceRef = ref(database, `presence/${auth.currentUser.uid}`);
        set(userPresenceRef, {
          online: true,
          lastChanged: Date.now(),
        });
        onDisconnect(userPresenceRef).remove();
      }
    }
  });

  onValue(presenceRef, (snap) => {
    const count = snap.size;
    onCountChange(count);
  });
};
