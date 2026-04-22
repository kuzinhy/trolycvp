import { useEffect, useState, lazy, Suspense, memo, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SessionTimeoutProvider } from './context/SessionTimeoutContext';
import { NotificationProvider } from './context/NotificationContext';
import { NewsProvider } from './context/NewsContext';
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
const Login = lazy(() => import('./components/Login').then(m => ({ default: m.Login })));
const EmailVerification = lazy(() => import('./components/EmailVerification').then(m => ({ default: m.EmailVerification })));
const AmbientNotification = lazy(() => import('./components/AmbientNotification').then(m => ({ default: m.AmbientNotification })));
const ConfirmationModal = lazy(() => import('./components/ui/ConfirmationModal').then(m => ({ default: m.ConfirmationModal })));

// Lazy load modules
const ChatModule = lazy(() => import('./components/ChatModule').then(m => ({ default: m.ChatModule })));
const DashboardModule = lazy(() => import('./components/DashboardModule').then(m => ({ default: m.DashboardModule })));
const KnowledgeModule = lazy(() => import('./components/KnowledgeModule'));
const ChatHistoryModule = lazy(() => import('./components/ChatHistoryModule').then(m => ({ default: m.ChatHistoryModule })));
const ProgressTracking = lazy(() => import('./components/ProgressTracking').then(m => ({ default: m.ProgressTracking })));
const DraftingModule = lazy(() => import('./components/DraftingModule').then(m => ({ default: m.DraftingModule })));
const SpeechAssistant = lazy(() => import('./components/SpeechAssistant').then(m => ({ default: m.SpeechAssistant })));
const UserManagementModule = lazy(() => import('./components/UserManagementModule').then(m => ({ default: m.UserManagementModule })));
const TeamChatModule = lazy(() => import('./components/TeamChatModule').then(m => ({ default: m.TeamChatModule })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));
const AIReviewModal = lazy(() => import('./components/AIReviewModal').then(m => ({ default: m.AIReviewModal })));
const UtilitiesModule = lazy(() => import('./components/UtilitiesModule').then(m => ({ default: m.UtilitiesModule })));
const NotificationPopup = lazy(() => import('./components/NotificationPopup').then(m => ({ default: m.NotificationPopup })));
const StrategicForecastingView = lazy(() => import('./components/StrategicForecastingView').then(m => ({ default: m.StrategicForecastingView })));
const WorkLogModule = lazy(() => import('./components/WorkLogModule').then(m => ({ default: m.WorkLogModule })));
const AccessHistoryModule = lazy(() => import('./components/AccessHistoryModule').then(m => ({ default: m.AccessHistoryModule })));
const SmartTaskManager = lazy(() => import('./components/SmartTaskManager').then(m => ({ default: m.SmartTaskManager })));
const DocumentManagementModule = lazy(() => import('./components/DocumentManagementModule').then(m => ({ default: m.DocumentManagementModule })));
const SmartErrorCorrectionCenter = lazy(() => import('./components/SmartErrorCorrectionCenter').then(m => ({ default: m.SmartErrorCorrectionCenter })));
const NewsAndOpinionView = lazy(() => import('./components/NewsAndOpinionView').then(m => ({ default: m.NewsAndOpinionView })));
const EvaluationModule = lazy(() => import('./components/EvaluationModule').then(m => ({ default: m.EvaluationModule })));
const MorningBriefing = lazy(() => import('./components/MorningBriefing').then(m => ({ default: m.MorningBriefing })));
const CommandFocusMode = lazy(() => import('./components/CommandFocusMode').then(m => ({ default: m.CommandFocusMode })));
const EliteCommandCenter = lazy(() => import('./components/EliteCommandCenter').then(m => ({ default: m.EliteCommandCenter })));

// Static-ish components
const MemoizedSidebar = Sidebar;
const MemoizedHeader = Header;
const MemoizedSkillTipsBanner = SkillTipsBanner;

// Hooks
import { useKnowledge } from './hooks/useKnowledge';
import { useTasks } from './hooks/useTasks';
import { useChat } from './hooks/useChat';
import { useNotifications } from './hooks/useNotifications';
import { useDashboard } from './hooks/useDashboard';
import { useReminders } from './hooks/useReminders';
import { useAppNavigation } from './hooks/useAppNavigation';
import { useToast } from './hooks/useToast';
import { useDraftingRules } from './hooks/useDraftingRules';
import { useSystemScanner } from './hooks/useSystemScanner';
import { HistoryProvider, useHistory } from './context/HistoryContext';
// import { TaskProvider } from './context/TaskContext'; // Deleted
import { MainBrainProvider } from './context/MainBrainProvider';
import { useKnowledgeContext } from './context/KnowledgeContext';
import { useChatContext } from './context/ChatContext';
import { useDashboardContext } from './context/DashboardContext';

import { seedEvaluationData } from './lib/seed-evaluation';

import { TabContent } from './components/TabContent';

import { UserPreferencesProvider } from './context/UserPreferencesContext';

export default function App() {
  useEffect(() => {
    seedEvaluationData().catch(console.error);
    
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
    <UserPreferencesProvider>
      <NotificationProvider>
        <NewsProvider>
          <AuthProvider>
            <SessionTimeoutProvider>
              <AppContent />
            </SessionTimeoutProvider>
          </AuthProvider>
        </NewsProvider>
      </NotificationProvider>
    </UserPreferencesProvider>
  );
}

function AppContent() {
  const { user, isEmailVerified, loading } = useAuth();
  useSystemScanner();
  
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

import { trackPresence } from './lib/presence';

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
  const [showMorningBriefing, setShowMorningBriefing] = useState(false);
  const [focusTask, setFocusTask] = useState<Task | null>(null);

  useEffect(() => {
    if (user) {
      const unsubscribe = trackPresence(() => {});
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
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandCenterOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      updateStatus(false);
    };
  }, [user?.uid]);

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
        "flex h-screen bg-slate-50 transition-colors duration-500 os-grid relative focus:outline-none",
        preferences.sidebarPosition === 'right' && "flex-row-reverse"
      )}>
        <div className="os-scanline" />
        
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

      <MemoizedSidebar 
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
        onQuickTask={() => {}}
        sidebarPosition={preferences.sidebarPosition}
      />
      <main className={cn(
        "flex-1 flex flex-col overflow-hidden",
        preferences.isCompactMode && "gap-2 p-2"
      )}>
        <MemoizedSkillTipsBanner />
        <MemoizedHeader 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          currentTab={currentTab}
          onQuickTask={() => {}}
          onNavigate={navigateTo}
          onOpenCommandCenter={() => setIsCommandCenterOpen(true)}
          isLearning={isAnyLearning}
          birthdays={birthdays}
          memberCount={memberCount}
          onlineCount={onlineCount}
          visitCount={visitCount}
        />

        <div className={cn(
          "flex-1 overflow-y-auto relative custom-scrollbar",
          preferences.isCompactMode ? "p-2" : "p-0"
        )}>
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          }>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="h-full"
              >
                <ErrorBoundary>
                  <TabContent 
                    currentTab={currentTab}
                    navigationParams={navigationParams}
                    navigateTo={navigateTo}
                    setHasUnsavedChanges={setHasUnsavedChanges}
                    onStartFocus={(task: Task) => setFocusTask(task)}
                  />
                </ErrorBoundary>
              </motion.div>
            </AnimatePresence>
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
            tasks={tasks}
            meetings={meetings}
            events={events}
            onClose={() => setShowMorningBriefing(false)}
          />
        )}
        {focusTask && (
          <CommandFocusMode 
            task={focusTask}
            onClose={() => setFocusTask(null)}
            onComplete={(id) => {
              updateTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'Completed', progress: 100, completedAt: Date.now() } : t));
              showToast("Nhiệm vụ đã hoàn thành!", "success");
            }}
          />
        )}
        <EliteCommandCenter 
          isOpen={isCommandCenterOpen}
          onClose={() => setIsCommandCenterOpen(false)}
          onNavigate={navigateTo}
          aiKnowledge={aiKnowledge}
          tasks={tasks}
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
