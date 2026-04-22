import React, { createContext, useContext, useEffect, useState } from 'react';

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
  }
};

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export const UserPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
