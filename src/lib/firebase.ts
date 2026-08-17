import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, getDocFromServer, doc, enableIndexedDbPersistence } from "firebase/firestore";
import { getDatabase, Database } from "firebase/database";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
import firebaseConfigData from '../../firebase-applet-config.json';
const firebaseConfig: Record<string, string> = {
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
    const isLocalOrSandbox = 
      window.location.hostname === 'localhost' || 
      window.location.hostname.includes('127.0.0.1') ||
      window.location.hostname.includes('ais-dev') ||
      window.location.hostname.includes('ais-pre');

    if (!isLocalOrSandbox) {
      isSupported().then((supported) => {
        if (supported) {
          try {
            getAnalytics(app);
          } catch (analyticsError) {
            console.warn("Firebase Analytics could not be initialized:", analyticsError);
          }
        }
      }).catch((err) => console.warn("Firebase Analytics is not supported in this browser:", err));
    } else {
      console.log("Firebase Analytics: Bypassed in dev/sandbox environment to prevent connection errors");
    }
  }
  
  console.log("Firebase: Initialized successfully");
} catch (error) {
  console.error("Firebase initialization failed:", error);
  throw error;
}

export { auth, db, database };
