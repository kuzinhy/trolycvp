import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

type Theme = 'light' | 'dark' | 'system';
type SidebarPosition = 'left' | 'right';

interface UserPreferences {
  theme: Theme;
  sidebarPosition: SidebarPosition;
  isCompactMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
  reminderSettings: {
    defaultTaskMinutes: number;
    defaultEventMinutes: number;
    enabled: boolean;
    customIntervals: number[]; // Array of minutes before, e.g. [15, 30, 60]
  };
  apiKeys?: {
    serpApi?: string;
    newsApi?: string;
    customGemini?: string;
    openai?: string;
    deepseek?: string;
  };
  aiProvider?: 'default_gemini' | 'custom_gemini' | 'openai' | 'deepseek';
  aiModel?: string;
  aiBaseUrl?: string;
}

interface UserPreferencesContextType {
  preferences: UserPreferences;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  toggleTheme: () => void;
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  sidebarPosition: 'left',
  isCompactMode: false,
  fontSize: 'medium',
  reminderSettings: {
    defaultTaskMinutes: 15,
    defaultEventMinutes: 30,
    enabled: true,
    customIntervals: [5, 15, 30, 60, 1440], // 5m, 15m, 30m, 1h, 1d
  },
  apiKeys: {
    serpApi: '',
    newsApi: '',
    customGemini: '',
    openai: '',
    deepseek: ''
  },
  aiProvider: 'default_gemini',
  aiModel: '',
  aiBaseUrl: ''
};

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export const UserPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const saved = localStorage.getItem('user-preferences');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure reminderSettings exists and has all required fields
        const reminderSettings = {
          ...defaultPreferences.reminderSettings,
          ...(parsed.reminderSettings || {})
        };
        
        // Deduplicate custom intervals
        if (Array.isArray(reminderSettings.customIntervals)) {
          reminderSettings.customIntervals = Array.from(new Set<number>(reminderSettings.customIntervals)).sort((a: number, b: number) => a - b);
        }

        return {
          ...defaultPreferences,
          ...parsed,
          reminderSettings
        };
      } catch (e) {
        console.error("Error parsing user preferences:", e);
        return defaultPreferences;
      }
    }
    return defaultPreferences;
  });

  // Lắng nghe sự thay đổi của User đăng nhập để khôi phục Preferences từ Firestore
  useEffect(() => {
    if (!user) {
      // Khi không có user (đã đăng xuất), khôi phục cấu hình Guest hoặc defaultPreferences
      const guestSaved = localStorage.getItem('user-preferences-guest');
      if (guestSaved) {
        try {
          const parsed = JSON.parse(guestSaved);
          setPreferences(parsed);
          localStorage.setItem('user-preferences', guestSaved);
        } catch (e) {
          setPreferences(defaultPreferences);
          localStorage.setItem('user-preferences', JSON.stringify(defaultPreferences));
        }
      } else {
        setPreferences(defaultPreferences);
        localStorage.setItem('user-preferences', JSON.stringify(defaultPreferences));
      }
      return;
    }

    const uid = user.uid;
    const localSaved = localStorage.getItem(`user-preferences-${uid}`);
    let localPrefs: UserPreferences | null = null;
    
    if (localSaved) {
      try {
        localPrefs = JSON.parse(localSaved);
        setPreferences(localPrefs); // Cập nhật ngay từ LocalStorage của User đó để mượt mà
        localStorage.setItem('user-preferences', localSaved);
      } catch (e) {
        console.error("Lỗi đọc preferences từ LocalStorage của user:", e);
      }
    }

    // Đồng bộ từ Firestore đám mây về
    const syncFromFirestore = async () => {
      try {
        const docRef = doc(db, 'user_preferences', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const firestorePrefs = docSnap.data() as UserPreferences;
          setPreferences(firestorePrefs);
          localStorage.setItem(`user-preferences-${uid}`, JSON.stringify(firestorePrefs));
          localStorage.setItem('user-preferences', JSON.stringify(firestorePrefs));
        } else {
          // Chưa có trên Firestore, đẩy Preferences cục bộ lên
          const currentPrefsToSave = localPrefs || preferences;
          await setDoc(docRef, currentPrefsToSave);
          localStorage.setItem(`user-preferences-${uid}`, JSON.stringify(currentPrefsToSave));
          localStorage.setItem('user-preferences', JSON.stringify(currentPrefsToSave));
        }
      } catch (err) {
        console.error("Lỗi đồng bộ preferences từ Firestore:", err);
      }
    };

    syncFromFirestore();
  }, [user]);

  // Lưu trữ Preferences mỗi khi thay đổi
  useEffect(() => {
    // Luôn ghi đè lên 'user-preferences' dùng chung để tương thích ngược
    localStorage.setItem('user-preferences', JSON.stringify(preferences));

    if (user) {
      const uid = user.uid;
      localStorage.setItem(`user-preferences-${uid}`, JSON.stringify(preferences));
      
      const saveToFirestore = async () => {
        try {
          const docRef = doc(db, 'user_preferences', uid);
          await setDoc(docRef, preferences, { merge: true });
        } catch (err) {
          console.error("Lỗi lưu preferences lên Firestore:", err);
        }
      };
      saveToFirestore();
    } else {
      localStorage.setItem('user-preferences-guest', JSON.stringify(preferences));
    }

    applyTheme(preferences.theme);
    applyFontSize(preferences.fontSize);
  }, [preferences, user]);

  const applyTheme = (theme: Theme) => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  };

  const applyFontSize = (size: 'small' | 'medium' | 'large') => {
    const root = window.document.documentElement;
    root.classList.remove('text-sm', 'text-base', 'text-lg');
    if (size === 'small') root.classList.add('text-sm');
    else if (size === 'medium') root.classList.add('text-base');
    else if (size === 'large') root.classList.add('text-lg');
  };

  const updatePreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPreferences((prev) => {
      let newValue = value;
      // Deduplicate customIntervals if it's being updated
      if (key === 'reminderSettings' && value && typeof value === 'object') {
        const settings = { ...(value as UserPreferences['reminderSettings']) };
        if (Array.isArray(settings.customIntervals)) {
          settings.customIntervals = Array.from(new Set(settings.customIntervals)).sort((a, b) => a - b);
        }
        newValue = settings as UserPreferences[K];
      }
      return { ...prev, [key]: newValue };
    });
  };

  const toggleTheme = () => {
    const nextTheme: Theme = preferences.theme === 'light' ? 'dark' : 'light';
    updatePreference('theme', nextTheme);
  };

  return (
    <UserPreferencesContext.Provider value={{ preferences, updatePreference, toggleTheme }}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
};
