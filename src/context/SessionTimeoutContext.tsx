import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

interface SessionTimeoutContextType {
  resetTimer: () => void;
}

const SessionTimeoutContext = createContext<SessionTimeoutContextType | undefined>(undefined);

// Time constants in milliseconds
const WARNING_TIMEOUT = 25 * 60 * 1000; // 25 minutes
const LOGOUT_TIMEOUT = 5 * 60 * 1000;  // 5 minutes (after warning)

export const SessionTimeoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, signOutUser } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(LOGOUT_TIMEOUT);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }, []);

  const handleLogout = useCallback(async () => {
    clearTimers();
    setShowWarning(false);
    if (user) {
      await signOutUser();
    }
  }, [user, signOutUser, clearTimers]);

  const startWarningTimer = useCallback(() => {
    clearTimers();
    if (!user) return;

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setRemainingTime(LOGOUT_TIMEOUT);
      
      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1000) {
            handleLogout();
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);

      // Final logout timer as backup
      logoutTimerRef.current = setTimeout(() => {
        handleLogout();
      }, LOGOUT_TIMEOUT);
    }, WARNING_TIMEOUT);
  }, [user, clearTimers, handleLogout]);

  const lastResetRef = useRef(Date.now());

  const resetTimer = useCallback(() => {
    if (showWarning) return;
    
    // Throttle resets to once every 10 seconds to improve performance
    const now = Date.now();
    if (now - lastResetRef.current < 10000) return;
    
    lastResetRef.current = now;
    startWarningTimer();
  }, [showWarning, startWarningTimer]);

  const stayLoggedIn = useCallback(() => {
    setShowWarning(false);
    startWarningTimer();
  }, [startWarningTimer]);

  useEffect(() => {
    if (user) {
      startWarningTimer();

      const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
      
      const handleActivity = () => {
        resetTimer();
      };

      activityEvents.forEach(event => {
        window.addEventListener(event, handleActivity);
      });

      return () => {
        clearTimers();
        activityEvents.forEach(event => {
          window.removeEventListener(event, handleActivity);
        });
      };
    } else {
      clearTimers();
      setShowWarning(false);
    }
  }, [user, startWarningTimer, resetTimer, clearTimers]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <SessionTimeoutContext.Provider value={{ resetTimer }}>
      {children}
      <ConfirmationModal
        isOpen={showWarning}
        onClose={stayLoggedIn}
        onConfirm={handleLogout}
        title="Phiên làm việc sắp hết hạn"
        message={`Bạn đã ngưng hoạt động trong một thời gian dài. Bạn sẽ bị đăng xuất tự động sau ${formatTime(remainingTime)} để bảo mật thông tin.`}
        confirmText="Đăng xuất ngay"
        cancelText="Tiếp tục làm việc"
        type="warning"
      />
    </SessionTimeoutContext.Provider>
  );
};

export const useSessionTimeout = () => {
  const context = useContext(SessionTimeoutContext);
  if (context === undefined) {
    throw new Error('useSessionTimeout must be used within a SessionTimeoutProvider');
  }
  return context;
};
