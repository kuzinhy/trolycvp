import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { useDashboard as useDashboardHook } from '../hooks/useDashboard';
import { useToast } from '../hooks/useToast';
import { useAuth } from './AuthContext';

type DashboardContextType = ReturnType<typeof useDashboardHook>;

const DashboardContext = createContext<DashboardContextType | null>(null);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const { user, unitId } = useAuth();
  const dashboard = useDashboardHook(showToast);

  // Auto-load dashboard data when user/unitId changes
  useEffect(() => {
    if (user && unitId) {
      dashboard.loadMeetings();
      dashboard.loadEvents();
      dashboard.loadBirthdays();
    }
  }, [user, unitId, dashboard.loadMeetings, dashboard.loadEvents, dashboard.loadBirthdays]);

  return (
    <DashboardContext.Provider value={dashboard}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
