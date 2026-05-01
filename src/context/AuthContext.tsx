import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, sendEmailVerification, updateProfile } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';
import { useNotification } from './NotificationContext';
import { UserInfo, UserRole } from '../types';

interface UnitInfo {
  province: string;
  district: string;
  ward: string;
  organization: string;
  fullName: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: UserRole | null;
  unitId: string | null;
  unitInfo: UnitInfo | null;
  userInfo: UserInfo | null;
  isEmailVerified: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  updateUnitInfo: (info: UnitInfo) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserProfile: (data: { displayName?: string; photoURL?: string; phoneNumber?: string; position?: string; department?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  isAdmin: false,
  isSuperAdmin: false,
  role: null,
  unitId: null,
  unitInfo: null,
  userInfo: null,
  isEmailVerified: false,
  signInWithGoogle: async () => {},
  signOutUser: async () => {},
  updateUnitInfo: async () => {},
  sendVerificationEmail: async () => {},
  refreshUser: async () => {},
  updateUserProfile: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showError } = useNotification();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [unitInfo, setUnitInfo] = useState<UnitInfo | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsEmailVerified(currentUser?.emailVerified || false);
      
      if (currentUser) {
        try {
          // Fetch user profile from Firestore
          const userDocRef = doc(db, 'users', currentUser.uid);
          let userDoc;
          try {
            userDoc = await getDoc(userDocRef);
          } catch (error) {
            console.error("Error fetching user data:", error);
            handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
            throw error; // stop execution if we can't even get
          }
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            const mappedUserInfo: UserInfo = {
              id: currentUser.uid,
              displayName: data.displayName || currentUser.displayName || '',
              photoURL: data.photoURL || currentUser.photoURL || undefined,
              role: data.role || 'user',
              departmentId: data.departmentId || data.unitId || '',
              email: data.email || currentUser.email || undefined,
              unitId: data.unitId || data.departmentId,
              uid: currentUser.uid,
              createdAt: data.createdAt,
              lastLogin: data.lastLogin
            };
            setRole(mappedUserInfo.role);
            setUnitId(mappedUserInfo.unitId || mappedUserInfo.departmentId || null);
            setUserInfo(mappedUserInfo);
            
            const targetUnitId = mappedUserInfo.unitId || mappedUserInfo.departmentId;
            if (targetUnitId) {
              const unitDoc = await getDoc(doc(db, 'units', targetUnitId));
              if (unitDoc.exists()) {
                setUnitInfo(unitDoc.data() as UnitInfo);
              }
            }
          } else {
            // Create initial user profile if it doesn't exist
            const isFirstAdmin = currentUser.email === 'nguyenhuy.thudaumot@gmail.com';
            const initialRole: UserRole = isFirstAdmin ? 'super_admin' : 'user';
            const initialData = {
              uid: currentUser.uid,
              id: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || '',
              photoURL: currentUser.photoURL || null,
              role: initialRole,
              unitId: 'vp-dang-uy', // Mặc định vào VP Đảng ủy để thấy tri thức chung
              departmentId: 'vp-dang-uy',
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp(),
              updatedAt: serverTimestamp()
            };
            try {
              await setDoc(userDocRef, initialData);
            } catch (error) {
              console.error("Error creating user data:", error);
              handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
            }
            setRole(initialRole);
            setUnitId(initialData.unitId);
            setUserInfo(initialData as UserInfo);
          }
        } catch (error) {
          console.error("Error setting up user session:", error);
        }
      } else {
        setRole(null);
        setUnitId(null);
        setUnitInfo(null);
        setUserInfo(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Sign in error:", error);
      let message = "Không thể đăng nhập bằng Google. Vui lòng thử lại.";
      
      if (error.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        message = `Tên miền '${domain}' chưa được cấp phép trong Firebase Console. Vui lòng thêm nó vào danh sách 'Authorized Domains' trong phần Authentication > Settings của Firebase Console.`;
      } else if (error.code === 'auth/popup-blocked') {
        message = "Trình duyệt đã chặn cửa sổ bật lên. Vui lòng cho phép bật lên để đăng nhập.";
      } else if (error.code === 'auth/operation-not-allowed') {
        message = "Phương thức đăng nhập bằng Google chưa được bật trong Firebase Console.";
      } else if (error.code === 'auth/api-key-not-valid') {
        message = "API Key của Firebase không hợp lệ. Vui lòng kiểm tra lại cấu hình trong Settings hoặc file firebase-applet-config.json.";
      } else if (error.code === 'auth/invalid-continue-uri') {
        message = "Lỗi 'auth/invalid-continue-uri'. Vui lòng kiểm tra xem 'authDomain' trong cấu hình Firebase có chính xác không và đã được thêm vào 'Authorized Domains' trong Firebase Console chưa.";
      }
      
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const updateUnitInfo = async (info: UnitInfo) => {
    if (!user || !unitId) return;
    try {
      await setDoc(doc(db, 'units', unitId), info, { merge: true });
      setUnitInfo(info);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `units/${unitId}`);
    }
  };

  const sendVerificationEmail = async () => {
    if (user) {
      try {
        await sendEmailVerification(user);
      } catch (error) {
        console.error("Verification email error:", error);
      }
    }
  };

  const refreshUser = async () => {
    if (user) {
      await user.reload();
      setUser({ ...auth.currentUser } as User);
      setIsEmailVerified(auth.currentUser?.emailVerified || false);
    }
  };

  const updateUserProfile = async (data: { displayName?: string; photoURL?: string; phoneNumber?: string; position?: string; department?: string }) => {
    if (!user) return;
    try {
      await updateProfile(user, {
        displayName: data.displayName,
        photoURL: data.photoURL
      });
      
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setUser({ ...auth.currentUser } as User);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const isSuperAdmin = role === 'super_admin' || user?.email === 'nguyenhuy.thudaumot@gmail.com';
  const isAdmin = isSuperAdmin || role === 'admin';

  return (
    <AuthContext.Provider value={{ 
      user, loading, isAdmin, isSuperAdmin, role, unitId, unitInfo, userInfo, isEmailVerified,
      signInWithGoogle, signOutUser, updateUnitInfo, sendVerificationEmail, refreshUser, updateUserProfile
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
