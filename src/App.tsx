import { useEffect, useState, lazy, Suspense, memo, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SessionTimeoutProvider } from './context/SessionTimeoutContext';
import { NotificationProvider } from './context/NotificationContext';
import { AnimatePresence, motion } from 'motion/react';
import { Toast } from './components/ui/Toast';
import { 
  Task, 
  Meeting, 
  Event, 
  Birthday, 
  Notification, 
  TASK_TYPES, 
  SYSTEM_INSTRUCTION 
} from './constants';
import { useAppStats } from './hooks/useAppStats';
import { db } from './lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { OperationType, handleFirestoreError } from './lib/firestore-errors';
import { cn } from './lib/utils';

import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load layout components
const Sidebar = lazy(() => import('./components/Sidebar').then(m => ({ default: m.Sidebar })));
const Header = lazy(() => import('./components/Header').then(m => ({ default: m.Header })));
const SkillTipsBanner = lazy(() => import('./components/SkillTipsBanner').then(m => ({ default: m.SkillTipsBanner })));
const AdminLoginNotifier = lazy(() => import('./components/AdminLoginNotifier').then(m => ({ default: m.AdminLoginNotifier })));
const Login = lazy(() => import('./components/Login'));
const EmailVerification = lazy(() => import('./components/EmailVerification').then(m => ({ default: m.EmailVerification })));
const AmbientNotification = lazy(() => import('./components/AmbientNotification').then(m => ({ default: m.AmbientNotification })));
const ConfirmationModal = lazy(() => import('./components/ui/ConfirmationModal').then(m => ({ default: m.ConfirmationModal })));

// Lazy load overlay modules
const TeamChatModule = lazy(() => import('./components/TeamChatModule').then(m => ({ default: m.TeamChatModule })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));
const AIReviewModal = lazy(() => import('./components/AIReviewModal').then(m => ({ default: m.AIReviewModal })));
const NotificationPopup = lazy(() => import('./components/NotificationPopup').then(m => ({ default: m.NotificationPopup })));
const MorningBriefing = lazy(() => import('./components/MorningBriefing').then(m => ({ default: m.MorningBriefing })));
const CommandFocusMode = lazy(() => import('./components/CommandFocusMode').then(m => ({ default: m.CommandFocusMode })));
const EliteCommandCenter = lazy(() => import('./components/EliteCommandCenter').then(m => ({ default: m.EliteCommandCenter })));
const NotebookModal = lazy(() => import('./components/NotebookModal').then(m => ({ default: m.NotebookModal })));

// Static-ish components
import { ShortcutsHelpModal } from './components/ShortcutsHelpModal';

// Hooks
import { useNotifications } from './hooks/useNotifications';
import { useReminders } from './hooks/useReminders';
import { useAppNavigation } from './hooks/useAppNavigation';
import { useToast } from './hooks/useToast';

import { HistoryProvider, useHistory } from './context/HistoryContext';
// import { TaskProvider } from './context/TaskContext'; // Deleted
import { MainBrainProvider } from './context/MainBrainProvider';
import { useKnowledgeContext } from './context/KnowledgeContext';
import { useChatContext } from './context/ChatContext';
import { useDashboardContext } from './context/DashboardContext';

import { TabContent } from './components/TabContent';

import { UserPreferencesProvider } from './context/UserPreferencesContext';

export default function App() {
  useEffect(() => {
    // Prefetch important modules
    import('./components/KnowledgeModule');
    import('./components/DashboardModule');

    // Clean up URL parameters
    if (window.location.search.includes('origin=')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('origin');
      window.history.replaceState({}, document.title, url.toString());
    }

    // Clean up local storage if needed
  }, []);
  
  return (
    <NotificationProvider>
      <AuthProvider>
        <UserPreferencesProvider>
          <SessionTimeoutProvider>
            <AppContent />
          </SessionTimeoutProvider>
        </UserPreferencesProvider>
      </AuthProvider>
    </NotificationProvider>
  );
}

function AppContent() {
  const { user, isEmailVerified, loading } = useAuth();
  
  useEffect(() => {
    if (user?.uid) {
      // Tăng số lượt truy cập khi bắt đầu phiên mới
      const hasVisitedThisSession = sessionStorage.getItem('hasIncrementedVisitCount');
      if (!hasVisitedThisSession) {
        import('./lib/app-stats').then(({ incrementVisitCount }) => {
          incrementVisitCount();
          sessionStorage.setItem('hasIncrementedVisitCount', 'true');
        });
      }
    }
  }, [user?.uid]);
  
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }>
        {!user ? (
          <Login />
        ) : !isEmailVerified ? (
          <EmailVerification />
        ) : (
          <MainBrainProvider>
            <AuthenticatedApp />
          </MainBrainProvider>
        )}
      </Suspense>
    </ErrorBoundary>
  );
}

// ...
import { useUserPreferences } from './context/UserPreferencesContext';

import { trackUserPresence } from './lib/presence';

function AuthenticatedApp() {
  const { user, signOutUser, isAdmin } = useAuth();
  const { preferences } = useUserPreferences();
  const { memberCount, onlineCount, visitCount } = useAppStats();
  const { isSidebarOpen, setIsSidebarOpen, currentTab, navigationParams, navigateTo, hasUnsavedChanges, setHasUnsavedChanges, pendingTab, confirmNavigation, cancelNavigation } = useAppNavigation();
  const { showToast, toast, hideToast } = useToast();
  
  const { 
    aiKnowledge, 
    loadKnowledge, 
    isLearning: isKnowledgeLearning,
    formState, // For AIReviewModal if needed, or directly from context
    editingIndex,
    setEditingIndex,
    // Add these:
    pendingAIItems,
    isReviewingAI,
    setIsReviewingAI,
    confirmAIItems,
    discardAIItems
  } = useKnowledgeContext();
  const { tasks, updateTasks, meetings, birthdays, events } = useDashboardContext();
  const { isLearning: isChatLearning, messages, setMessages } = useChatContext();
  
  const { notifications, showNotifications, setShowNotifications, markAsRead, settings: notificationSettings, setSettings: setNotificationSettings, ambientNotification, setAmbientNotification, latestNotification, setLatestNotification, markAllAsRead, addNotification } = useNotifications();
  useReminders(meetings, events, birthdays, tasks);
  const { logAction } = useHistory();

  const [isTeamChatOpen, setIsTeamChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandCenterOpen, setIsCommandCenterOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [showMorningBriefing, setShowMorningBriefing] = useState(false);
  const [isNotebookModalOpen, setIsNotebookModalOpen] = useState(false);
  const [focusTask, setFocusTask] = useState<Task | null>(null);

  useEffect(() => {
    if (user) {
      const unsubscribe = trackUserPresence({ 
        uid: user.uid, 
        displayName: user.displayName || user.email?.split('@')[0] 
      });
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }
  }, [user]);

  useEffect(() => {
    const hasSeenBriefing = sessionStorage.getItem('hasSeenMorningBriefing');
    if (!hasSeenBriefing && user) {
      const timer = setTimeout(() => {
        setShowMorningBriefing(true);
        sessionStorage.setItem('hasSeenMorningBriefing', 'true');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      // Ctrl+K / Cmd+K -> Command Center
      if ((e.metaKey || e.ctrlKey) && key === 'k') {
        e.preventDefault();
        setIsCommandCenterOpen(prev => !prev);
      }
      
      // Ctrl+B / Cmd+B -> Toggle Sidebar
      if ((e.metaKey || e.ctrlKey) && key === 'b') {
        e.preventDefault();
        setIsSidebarOpen(prev => !prev);
      }
      
      // Ctrl+Shift+H -> Keyboard Shortcuts Help Dialog
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && key === 'h') {
        e.preventDefault();
        setIsShortcutsHelpOpen(prev => !prev);
      }

      // Ctrl+Shift+C -> Toggle Team Chat
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && key === 'c') {
        e.preventDefault();
        setIsTeamChatOpen(prev => !prev);
      }

      // Ctrl+Shift+S -> Toggle Settings
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && key === 's') {
        e.preventDefault();
        setIsSettingsOpen(prev => !prev);
      }
      
      // Ctrl+Alt+D -> Navigate to Dashboard
      if ((e.metaKey || e.ctrlKey) && e.altKey && key === 'd') {
        e.preventDefault();
        navigateTo('dashboard' as any);
      }

      // Ctrl+Alt+K -> Navigate to Knowledge Core
      if ((e.metaKey || e.ctrlKey) && e.altKey && key === 'k') {
        e.preventDefault();
        navigateTo('knowledge' as any);
      }

      // Ctrl+Alt+L -> Navigate to Calendar (Lịch công tác)
      if ((e.metaKey || e.ctrlKey) && e.altKey && key === 'l') {
        e.preventDefault();
        navigateTo('calendar' as any);
      }

      // Ctrl+Alt+T -> Navigate to Tasks (Danh sách nhiệm vụ)
      if ((e.metaKey || e.ctrlKey) && e.altKey && key === 't') {
        e.preventDefault();
        navigateTo('tasks' as any);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsSidebarOpen, navigateTo]);

  const isAnyLearning = isKnowledgeLearning || isChatLearning;

  useEffect(() => {
    if (!user?.uid) return;
    const userRef = doc(db, 'users', user.uid);
    const updateStatus = async (online: boolean) => {
      try {
        await setDoc(userRef, {
          isOnline: online,
          lastSeen: serverTimestamp(),
          displayName: user.displayName || user.email?.split('@')[0] || 'Người dùng',
          photoURL: user.photoURL
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      }
    };
    updateStatus(true);
    const handleVisibilityChange = () => {
      updateStatus(document.visibilityState !== 'hidden');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Ping mỗi 2 phút nếu tab đang mở
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updateStatus(true);
      }
    }, 2 * 60 * 1000);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
      updateStatus(false);
    };
  }, [user?.uid, user?.displayName, user?.email, user?.photoURL]);

  useEffect(() => {
    if (currentTab) {
      logAction('visit', currentTab);
    }
  }, [currentTab, logAction]);

  return (
    <Suspense fallback={
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <div className={cn(
        "flex h-screen bg-slate-50 transition-colors duration-200 relative focus:outline-none",
        preferences.sidebarPosition === 'right' && "flex-row-reverse",
        preferences.isCompactMode ? "is-compact-mode" : "is-comfortable-mode"
      )}>
        
      <ConfirmationModal
        isOpen={pendingTab !== null}
        onClose={cancelNavigation}
        onConfirm={confirmNavigation}
        title="Thay đổi chưa lưu"
        message="Bạn có các thay đổi chưa được lưu. Nếu bạn chuyển tab bây giờ, các thay đổi này có thể bị mất. Bạn có chắc chắn muốn tiếp tục?"
        confirmText="Tiếp tục chuyển tab"
        cancelText="Ở lại và lưu"
        type="warning"
      />

      <Sidebar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        currentTab={currentTab}
        onNavigate={navigateTo}
        onOpenSettings={() => setIsSettingsOpen(true)}
        user={user}
        notifications={notifications}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onToggleTeamChat={() => setIsTeamChatOpen(!isTeamChatOpen)}
        isTeamChatOpen={isTeamChatOpen}
        onOpenNotebookModal={() => setIsNotebookModalOpen(true)}
        onQuickTask={() => {}}
        sidebarPosition={preferences.sidebarPosition}
        onOpenShortcuts={() => setIsShortcutsHelpOpen(true)}
        onOpenCommandCenter={() => setIsCommandCenterOpen(true)}
      />
      <main className={cn(
        "flex-1 flex flex-col overflow-hidden transition-all duration-300",
        preferences.isCompactMode ? "gap-2 p-2 is-compact" : "gap-4 p-4 is-comfortable"
      )}>
        <SkillTipsBanner />
        <Header 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          currentTab={currentTab}
          onQuickTask={() => {}}
          onNavigate={navigateTo}
          onOpenCommandCenter={() => setIsCommandCenterOpen(true)}
          onOpenShortcuts={() => setIsShortcutsHelpOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isLearning={isAnyLearning}
          birthdays={birthdays}
          memberCount={memberCount}
          onlineCount={onlineCount}
          visitCount={visitCount}
        />

        <div className={cn(
          "flex-1 overflow-y-auto relative custom-scrollbar transition-all duration-300",
          preferences.isCompactMode ? "p-4 is-compact-content" : "p-6 is-comfortable-content"
        )}>
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600"></div>
            </div>
          }>
            <ErrorBoundary>
              <TabContent 
                currentTab={currentTab}
                navigationParams={navigationParams}
                navigateTo={navigateTo}
                setHasUnsavedChanges={setHasUnsavedChanges}
                onStartFocus={(task: Task) => setFocusTask(task)}
              />
            </ErrorBoundary>
          </Suspense>
        </div>
      </main>

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-blue-900/10 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Suspense fallback={null}>
        <NotificationPopup 
          notification={latestNotification}
          onClose={() => setLatestNotification(null)}
          onView={(link) => {
            if (link) navigateTo(link as any);
            setShowNotifications(true);
          }}
          onDismiss={markAsRead}
        />

        <TeamChatModule 
          isOpen={isTeamChatOpen}
          onClose={() => setIsTeamChatOpen(false)}
        />

        <SettingsModal 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          user={user}
          onSignOut={signOutUser}
          showToast={showToast}
          onReloadKnowledge={loadKnowledge}
          addNotification={addNotification}
          notificationSettings={notificationSettings}
          setNotificationSettings={setNotificationSettings}
        />
      </Suspense>

      <AmbientNotification 
        notification={ambientNotification} 
        onClose={() => setAmbientNotification(null)} 
      />

      <AIReviewModal 
        isOpen={isReviewingAI}
        onClose={discardAIItems}
        onConfirm={confirmAIItems}
        items={pendingAIItems}
        existingKnowledge={aiKnowledge}
      />

      <AnimatePresence>
        {showMorningBriefing && (
          <MorningBriefing 
            key="morning-briefing"
            tasks={tasks}
            meetings={meetings}
            events={events}
            onClose={() => setShowMorningBriefing(false)}
          />
        )}
        {focusTask && (
          <CommandFocusMode 
            key="command-focus"
            task={focusTask}
            onClose={() => setFocusTask(null)}
            onComplete={(id) => {
              updateTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'Completed', progress: 100, completedAt: Date.now() } : t));
              showToast("Nhiệm vụ đã hoàn thành!", "success");
            }}
          />
        )}
        <EliteCommandCenter 
          key="elite-command-center"
          isOpen={isCommandCenterOpen}
          onClose={() => setIsCommandCenterOpen(false)}
          onNavigate={navigateTo}
          aiKnowledge={aiKnowledge}
          tasks={tasks}
          onFocusTask={setFocusTask}
        />
        <NotebookModal 
          key="notebook-modal"
          isOpen={isNotebookModalOpen}
          onClose={() => setIsNotebookModalOpen(false)}
        />
        <ShortcutsHelpModal 
          key="shortcuts-help-modal"
          isOpen={isShortcutsHelpOpen}
          onClose={() => setIsShortcutsHelpOpen(false)}
        />
      </AnimatePresence>

      <AdminLoginNotifier />

      <Toast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.isVisible} 
        onClose={hideToast} 
      />
    </div>
    </Suspense>
  );
}
