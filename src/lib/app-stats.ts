import { db } from './firebase';
import { doc, runTransaction, increment } from 'firebase/firestore';

export async function incrementVisitCount() {
  const statsRef = doc(db, 'system', 'stats');
  
  try {
    await runTransaction(db, async (transaction) => {
      const statsDoc = await transaction.get(statsRef);
      if (!statsDoc.exists()) {
        transaction.set(statsRef, { visitCount: 1 });
      } else {
        transaction.update(statsRef, {
          visitCount: increment(1)
        });
      }
    });
  } catch (error) {
    console.error("Failed to increment visit count:", error);
  }
}
