import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, getDocFromServer, doc, enableIndexedDbPersistence } from "firebase/firestore";
import { getDatabase, Database } from "firebase/database";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
import firebaseConfigData from '../../firebase-applet-config.json';
const firebaseConfig = {
  ...firebaseConfigData
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let database: Database;

try {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
  
  // Enable offline persistence
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn("Multiple tabs open, offline persistence can only be enabled in one tab at a time.");
    } else if (err.code == 'unimplemented') {
      console.warn("The current browser does not support all of the features required to enable offline persistence.");
    }
  });

  database = getDatabase(app);
  
  if (typeof window !== 'undefined') {
    isSupported().then((supported) => {
      if (supported) {
        getAnalytics(app);
      }
    }).catch(console.error);
  }
  
  console.log("Firebase: Initialized successfully");

  // Connection test
  const testConnection = async () => {
    try {
      await getDocFromServer(doc(db, '_connection_test_', 'ping'));
      console.log(`[FIREBASE] Kết nối Firestore thành công tới dự án: ${firebaseConfig.projectId}`);
    } catch (error: any) {
      console.error("[FIREBASE] LỖI KẾT NỐI FIRESTORE:", {
        projectId: firebaseConfig.projectId,
        error: error.message,
        code: error.code
      });
      
      if (error.message?.includes('the client is offline') || error.code === 'unavailable') {
        console.error(`>>> HƯỚNG DẪN: Vui lòng kiểm tra xem bạn đã nhấn nút 'Create database' trong menu 'Firestore Database' trên Firebase Console cho dự án '${firebaseConfig.projectId}' chưa.`);
      }
    }
  };
  testConnection();
} catch (error) {
  console.error("Firebase initialization failed:", error);
  throw error;
}

export { auth, db, database };
