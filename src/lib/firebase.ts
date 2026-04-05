import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, getDocFromServer, doc, enableIndexedDbPersistence } from "firebase/firestore";
import { getDatabase, Database } from "firebase/database";
import firebaseConfigDefault from "../../firebase-applet-config.json";

// Helper to get config value with fallback and logging
const getConfigValue = (envKey: string, defaultVal: string) => {
  const val = import.meta.env[envKey];
  // Check if it's a valid string and not a common placeholder or masked value (bullets)
  const isEnvValid = (
    val && 
    typeof val === 'string' && 
    val.trim() !== '' && 
    val !== 'undefined' && 
    !val.includes('YOUR_') && 
    !val.includes('TODO_') &&
    !/^[\u2022\u25CF\u002A\u002E\s]+$/.test(val) // Detect bullets (•), circles (●), asterisks (*), or dots (.)
  );
  
  if (isEnvValid) {
    // Only override if the environment variable project ID matches our target project 'trolycvp'
    // This prevents old project IDs from Settings from breaking the new connection
    const currentEnvProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    
    // If we are checking the project ID itself, or if the project ID is already confirmed as 'trolycvp'
    if (currentEnvProjectId === 'trolycvp') {
      console.warn(`[FIREBASE CONFIG] ĐANG GHI ĐÈ: Sử dụng giá trị từ menu Settings cho ${envKey}: ${envKey.includes('API_KEY') ? '***' : val}`);
      return val;
    }
  }
  
  console.log(`[FIREBASE CONFIG] MẶC ĐỊNH: Sử dụng giá trị từ file JSON cho ${envKey}: ${envKey.includes('API_KEY') ? '***' : defaultVal}`);
  return defaultVal;
};

// Use environment variables for Firebase configuration with fallback to local config
const firebaseConfig = {
  apiKey: getConfigValue('VITE_FIREBASE_API_KEY', firebaseConfigDefault.apiKey),
  authDomain: getConfigValue('VITE_FIREBASE_AUTH_DOMAIN', firebaseConfigDefault.authDomain),
  projectId: getConfigValue('VITE_FIREBASE_PROJECT_ID', firebaseConfigDefault.projectId),
  storageBucket: getConfigValue('VITE_FIREBASE_STORAGE_BUCKET', firebaseConfigDefault.storageBucket),
  messagingSenderId: getConfigValue('VITE_FIREBASE_MESSAGING_SENDER_ID', firebaseConfigDefault.messagingSenderId),
  appId: getConfigValue('VITE_FIREBASE_APP_ID', firebaseConfigDefault.appId),
  measurementId: getConfigValue('VITE_FIREBASE_MEASUREMENT_ID', firebaseConfigDefault.measurementId),
  databaseURL: getConfigValue('VITE_FIREBASE_DATABASE_URL', (firebaseConfigDefault as any).databaseURL),
};

const firestoreDatabaseId = getConfigValue('VITE_FIREBASE_FIRESTORE_DATABASE_ID', (firebaseConfigDefault as any).firestoreDatabaseId);

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let database: Database;

try {
  // Validate API Key presence
  if (!firebaseConfig.apiKey) {
    console.error("Firebase API Key is missing. Please set VITE_FIREBASE_API_KEY in Settings.");
  } else {
    // Log a masked version of the API key and the Project ID to help verify it's being loaded
    const maskedKey = firebaseConfig.apiKey.substring(0, 6) + "..." + firebaseConfig.apiKey.substring(firebaseConfig.apiKey.length - 4);
    console.log(`Firebase: Initializing Project [${firebaseConfig.projectId}] with API Key: ${maskedKey}`);
    console.log(`Firebase: Using Firestore Database ID: ${firestoreDatabaseId || "(default)"}`);
  }
  
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app, firestoreDatabaseId || "(default)");
  
  // Enable offline persistence
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn("Multiple tabs open, offline persistence can only be enabled in one tab at a time.");
    } else if (err.code == 'unimplemented') {
      console.warn("The current browser does not support all of the features required to enable offline persistence.");
    }
  });

  database = getDatabase(app);
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
