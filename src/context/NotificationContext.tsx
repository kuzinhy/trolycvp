import React, { createContext, useContext, useState, useCallback } from 'react';

interface NotificationContextType {
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const showError = useCallback((message: string) => {
    setNotification({ message, type: 'error' });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const showSuccess = useCallback((message: string) => {
    setNotification({ message, type: 'success' });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  return (
    <NotificationContext.Provider value={{ showError, showSuccess }}>
      {children}
      {notification && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg text-white ${notification.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {notification.message}
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
