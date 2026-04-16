import { useState, useCallback } from 'react';

export type AppTab = 'chat' | 'dashboard' | 'knowledge' | 'tracking' | 'calendar' | 'tasks' | 'drafting' | 'users' | 'speech' | 'forecasting' | 'utilities' | 'history' | 'access-history' | 'drafting-pro' | 'invitation' | 'review' | 'email-assistant' | 'genz' | 'work-log' | 'documents' | 'drafting-pro-review' | 'drafting-pro-speech' | 'reporting' | 'document-assignment' | 'strategic' | 'party-advisory' | 'evaluation' | 'error-center' | 'assignment-tracking' | 'news' | 'resolution-tracking' | 'todo-assistant' | 'roadmap' | 'notes';

export function useAppNavigation() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentTab, setCurrentTab] = useState<AppTab>('todo-assistant');
  const [navigationParams, setNavigationParams] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingTab, setPendingTab] = useState<AppTab | null>(null);

  const navigateTo = useCallback((tab: AppTab, params: any = null, force = false) => {
    if (hasUnsavedChanges && !force) {
      setPendingTab(tab);
      setNavigationParams(params);
      return;
    }
    
    setCurrentTab(tab);
    setNavigationParams(params);
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
    setNavigationParams(null);
  }, []);

  return {
    isSidebarOpen,
    setIsSidebarOpen,
    currentTab,
    navigationParams,
    navigateTo,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    pendingTab,
    confirmNavigation,
    cancelNavigation
  };
}
