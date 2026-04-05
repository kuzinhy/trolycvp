import { useState, useCallback } from 'react';

export type AppTab = 'chat' | 'dashboard' | 'knowledge' | 'tracking' | 'calendar' | 'tasks' | 'drafting' | 'users' | 'speech' | 'forecasting' | 'utilities' | 'history' | 'access-history' | 'drafting-pro' | 'invitation' | 'review' | 'email-assistant' | 'genz' | 'work-log' | 'documents' | 'drafting-pro-review' | 'drafting-pro-speech' | 'reporting' | 'document-assignment';

export function useAppNavigation() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentTab, setCurrentTab] = useState<AppTab>('chat');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingTab, setPendingTab] = useState<AppTab | null>(null);

  const navigateTo = useCallback((tab: AppTab, force = false) => {
    if (hasUnsavedChanges && !force) {
      setPendingTab(tab);
      return;
    }
    
    setCurrentTab(tab);
    setHasUnsavedChanges(false);
    setPendingTab(null);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [hasUnsavedChanges]);

  const confirmNavigation = useCallback(() => {
    if (pendingTab) {
      setCurrentTab(pendingTab);
      setHasUnsavedChanges(false);
      setPendingTab(null);
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    }
  }, [pendingTab]);

  const cancelNavigation = useCallback(() => {
    setPendingTab(null);
  }, []);

  return {
    isSidebarOpen,
    setIsSidebarOpen,
    currentTab,
    navigateTo,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    pendingTab,
    confirmNavigation,
    cancelNavigation
  };
}
