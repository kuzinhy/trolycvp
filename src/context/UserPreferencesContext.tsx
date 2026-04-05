import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';
type SidebarPosition = 'left' | 'right';

interface UserPreferences {
  theme: Theme;
  sidebarPosition: SidebarPosition;
  isCompactMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
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
};

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export const UserPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const saved = localStorage.getItem('user-preferences');
    return saved ? JSON.parse(saved) : defaultPreferences;
  });

  useEffect(() => {
    localStorage.setItem('user-preferences', JSON.stringify(preferences));
    applyTheme(preferences.theme);
    applyFontSize(preferences.fontSize);
  }, [preferences]);

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
    setPreferences((prev) => ({ ...prev, [key]: value }));
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
