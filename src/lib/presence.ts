import { ref, onValue, set, onDisconnect, remove } from "firebase/database";
import { database, auth } from "./firebase";

export const trackPresence = (user: { uid: string, displayName?: string | null }, onCountChange?: (count: number) => void) => {
  if (!user) return () => {};

  const connectedRef = ref(database, ".info/connected");
  const userPresenceRef = ref(database, `presence/${user.uid}`);
  const presenceRef = ref(database, "presence");

  const connectedUnsubscribe = onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      // Khi kết nối được thiết lập, đăng ký presence
      set(userPresenceRef, {
        online: true,
        displayName: user.displayName || 'Người dùng',
        lastChanged: Date.now(),
      });
      
      // Tự động xóa khi ngắt kết nối
      onDisconnect(userPresenceRef).remove();
    }
  });

  let presenceUnsubscribe = () => {};
  if (onCountChange) {
    presenceUnsubscribe = onValue(presenceRef, (snap) => {
      const data = snap.val();
      const count = data ? Object.keys(data).length : 0;
      onCountChange(count);
    });
  }

  return () => {
    connectedUnsubscribe();
    presenceUnsubscribe();
    // Khi Component unmount (không phải ngắt kết nối thực sự), ta có thể giữ presence hoặc xóa
    // Thường thì chỉ xóa khi logout hoặc onDisconnect thực tế của Firebase
  };
};
