import { useEffect, useState, lazy, Suspense, memo, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
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
const KnowledgeModule = lazy(() => import('./components/KnowledgeModule').then(m => ({ default: m.KnowledgeModule })));
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
import { TaskProvider } from './context/TaskContext';

import { seedEvaluationData } from './lib/seed-evaluation';

import { TabContent } from './components/TabContent';

import { UserPreferencesProvider } from './context/UserPreferencesContext';

export default function App() {
  useEffect(() => {
    seedEvaluationData().catch(console.error);
    
    // Clean up URL parameters
    if (window.location.search.includes('origin=')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('origin');
      window.history.replaceState({}, document.title, url.toString());
    }
  }, []);
  
  return (
    <UserPreferencesProvider>
      <NotificationProvider>
        <NewsProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </NewsProvider>
      </NotificationProvider>
    </UserPreferencesProvider>
  );
}

function AppContent() {
  const { user, isEmailVerified, loading } = useAuth();
  useSystemScanner();
  
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-blue-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-blue-950">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      }>
        {!user ? (
          <Login />
        ) : !isEmailVerified ? (
          <EmailVerification />
        ) : (
          <HistoryProvider>
            <TaskProvider>
              <AuthenticatedApp />
            </TaskProvider>
          </HistoryProvider>
        )}
      </Suspense>
    </ErrorBoundary>
  );
}

// ...
import { useUserPreferences } from './context/UserPreferencesContext';

function AuthenticatedApp() {
  const { user, signOutUser, isAdmin } = useAuth();
  const { preferences } = useUserPreferences();
  const { memberCount, onlineCount, visitCount } = useAppStats();
  const { isSidebarOpen, setIsSidebarOpen, currentTab, navigationParams, navigateTo, hasUnsavedChanges, setHasUnsavedChanges, pendingTab, confirmNavigation, cancelNavigation } = useAppNavigation();
  const { showToast, toast, hideToast } = useToast();
  const { 
    aiKnowledge, 
    pendingKnowledge, 
    isPendingLoading, 
    loadKnowledge, 
    isMemoryLoading, 
    isAddingManual, 
    setIsAddingManual, 
    manualValue, 
    setManualValue, 
    manualTags, 
    setManualTags, 
    manualTitle, 
    setManualTitle, 
    manualDocNumber, 
    setManualDocNumber, 
    manualIssueDate, 
    setManualIssueDate, 
    manualSigner, 
    setManualSigner, 
    manualStaffMember, 
    setManualStaffMember, 
    manualPermissionLevel,
    setManualPermissionLevel,
    manualVersion,
    setManualVersion,
    manualReviewStatus,
    setManualReviewStatus,
    manualReviewNotes,
    setManualReviewNotes,
    manualPriority,
    setManualPriority,
    manualDeadline,
    setManualDeadline,
    manualStatus,
    setManualStatus,
    isManualPublic, 
    setIsManualPublic, 
    isManualImportant, 
    setIsManualImportant, 
    addManualKnowledge, 
    isUpdating, 
    updateProgress,
    editingIndex, 
    setEditingIndex, 
    editValue, 
    setEditValue, 
    editTags, 
    setEditTags, 
    editCategory, 
    setEditCategory, 
    editIsImportant, 
    setEditIsImportant, 
    editIsPublic, 
    setEditIsPublic, 
    editTitle, 
    setEditTitle, 
    editSummary, 
    setEditSummary, 
    editDocNumber, 
    setEditDocNumber, 
    editIssueDate, 
    setEditIssueDate, 
    editSigner, 
    setEditSigner, 
    editStaffMember, 
    setEditStaffMember, 
    editPermissionLevel,
    setEditPermissionLevel,
    editVersion,
    setEditVersion,
    editReviewStatus,
    setEditReviewStatus,
    editReviewNotes,
    setEditReviewNotes,
    editPriority,
    setEditPriority,
    editDeadline,
    setEditDeadline,
    editStatus,
    setEditStatus,
    updateKnowledge, 
    deleteKnowledge, 
    isDeleting, 
    handleReorderKnowledge, 
    smartLearnFromText, 
    learnFromFile, 
    isLearning: isKnowledgeLearning, 
    isSuggestingTags, 
    suggestTagsForContent, 
    addPendingKnowledge, 
    deletePendingKnowledge, 
    updatePendingKnowledge, 
    removeDuplicates, 
    isRemovingDuplicates, 
    deleteAllKnowledge, 
    isDeletingAll, 
    isSyncingRemote, 
    syncRemoteKnowledge, 
    auditAndOptimizeKnowledge,
    isAuditing,
    smartSummarizeKnowledge, 
    isSummarizing, 
    summarizedContent, 
    setSummarizedContent,
    pendingAIItems,
    isReviewingAI,
    setIsReviewingAI,
    confirmAIItems,
    discardAIItems,
    syncUnifiedStrategicKnowledge,
    isSyncingUnified
  } = useKnowledge(showToast, setHasUnsavedChanges);
  const { tasks, updateTasks } = useTasks(showToast);
  const { config, birthdays, updateBirthdays, meetings, updateMeetings, isSavingMeetings, loadMeetings, events, updateEvents, isParsingCalendar, parseCalendarFile, uploadAndParseCalendar, isBirthdaysLoading, smartBriefing, isGeneratingBriefing, generateSmartBriefing } = useDashboard(showToast, updateTasks);
  const { messages, setMessages, input, setInput, isLoading, handleSend, messagesEndRef, inputRef, copyToClipboard, copiedId, saveToKnowledge, isSaving, isLearning: isChatLearning, chatHistory, loadChatHistory, deleteChatHistory, clearAllChatHistory, isHistoryLoading, isSearchEnabled, setIsSearchEnabled, isSimpleMode, setIsSimpleMode } = useChat(aiKnowledge, showToast, loadKnowledge, meetings, tasks, events, birthdays);
  const { notifications, showNotifications, setShowNotifications, markAsRead, settings: notificationSettings, setSettings: setNotificationSettings, ambientNotification, setAmbientNotification, latestNotification, setLatestNotification, markAllAsRead, addNotification } = useNotifications();
  useReminders(meetings, events, birthdays, tasks);
  const { rules: draftingRules, addRule: addDraftingRule, toggleRule: toggleDraftingRule, deleteRule: deleteDraftingRule, updateRule: updateDraftingRule } = useDraftingRules(showToast);
  const { logAction } = useHistory();
  const [isTeamChatOpen, setIsTeamChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showMorningBriefing, setShowMorningBriefing] = useState(false);
  const [focusTask, setFocusTask] = useState<Task | null>(null);

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

  const isAnyLearning = isKnowledgeLearning || isChatLearning;
  const MOCK_TRACKING_DATA: any[] = [];

  useEffect(() => {
    if (!user?.uid) return;

    const userRef = doc(db, 'users', user.uid);
    
    // Update status to online
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

    // Visibility change listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        updateStatus(false);
      } else {
        updateStatus(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup on unmount
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
      <div className="h-screen w-screen flex items-center justify-center bg-blue-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    }>
      <div className={cn(
        "flex h-screen bg-blue-50 dark:bg-blue-950 transition-colors duration-500",
        preferences.sidebarPosition === 'right' && "flex-row-reverse"
      )}>
      {/* Confirmation Modal for Unsaved Changes */}
      <ConfirmationModal
        isOpen={pendingTab !== null}
        onClose={cancelNavigation}
        onConfirm={confirmNavigation}
        title="Thay đổi chưa lưu"
        message="Bạn có các thay đổi chưa được lưu. Nếu bạn chuyển tab bây giờ, các thay đổi này có thể bị mất (mặc dù hệ thống có tính năng tự động lưu bản nháp). Bạn có chắc chắn muốn tiếp tục?"
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
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
                  isAdmin={isAdmin}
                  aiKnowledge={aiKnowledge}
                  pendingKnowledge={pendingKnowledge}
                  isPendingLoading={isPendingLoading}
                  loadKnowledge={loadKnowledge}
                  isMemoryLoading={isMemoryLoading}
                  isAddingManual={isAddingManual}
                  setIsAddingManual={setIsAddingManual}
                  manualValue={manualValue}
                  setManualValue={setManualValue}
                  manualTags={manualTags}
                  setManualTags={setManualTags}
                  manualTitle={manualTitle}
                  setManualTitle={setManualTitle}
                  manualDocNumber={manualDocNumber}
                  setManualDocNumber={setManualDocNumber}
                  manualIssueDate={manualIssueDate}
                  setManualIssueDate={setManualIssueDate}
                  manualSigner={manualSigner}
                  setManualSigner={setManualSigner}
                  manualStaffMember={manualStaffMember}
                  setManualStaffMember={setManualStaffMember}
                  manualPermissionLevel={manualPermissionLevel}
                  setManualPermissionLevel={setManualPermissionLevel}
                  manualVersion={manualVersion}
                  setManualVersion={setManualVersion}
                  manualReviewStatus={manualReviewStatus}
                  setManualReviewStatus={setManualReviewStatus}
                  manualReviewNotes={manualReviewNotes}
                  setManualReviewNotes={setManualReviewNotes}
                  manualPriority={manualPriority}
                  setManualPriority={setManualPriority}
                  manualDeadline={manualDeadline}
                  setManualDeadline={setManualDeadline}
                  manualStatus={manualStatus}
                  setManualStatus={setManualStatus}
                  isManualPublic={isManualPublic}
                  setIsManualPublic={setIsManualPublic}
                  isManualImportant={isManualImportant}
                  setIsManualImportant={setIsManualImportant}
                  addManualKnowledge={addManualKnowledge}
                  isUpdating={isUpdating}
                  updateProgress={updateProgress}
                  editingIndex={editingIndex}
                  setEditingIndex={setEditingIndex}
                  editValue={editValue}
                  setEditValue={setEditValue}
                  editTags={editTags}
                  setEditTags={setEditTags}
                  editCategory={editCategory}
                  setEditCategory={setEditCategory}
                  editIsImportant={editIsImportant}
                  setEditIsImportant={setEditIsImportant}
                  editIsPublic={editIsPublic}
                  setEditIsPublic={setEditIsPublic}
                  editTitle={editTitle}
                  setEditTitle={setEditTitle}
                  editSummary={editSummary}
                  setEditSummary={setEditSummary}
                  editDocNumber={editDocNumber}
                  setEditDocNumber={setEditDocNumber}
                  editIssueDate={editIssueDate}
                  setEditIssueDate={setEditIssueDate}
                  editSigner={editSigner}
                  setEditSigner={setEditSigner}
                  editStaffMember={editStaffMember}
                  setEditStaffMember={setEditStaffMember}
                  editPermissionLevel={editPermissionLevel}
                  setEditPermissionLevel={setEditPermissionLevel}
                  editVersion={editVersion}
                  setEditVersion={setEditVersion}
                  editReviewStatus={editReviewStatus}
                  setEditReviewStatus={setEditReviewStatus}
                  editReviewNotes={editReviewNotes}
                  setEditReviewNotes={setEditReviewNotes}
                  editPriority={editPriority}
                  setEditPriority={setEditPriority}
                  editDeadline={editDeadline}
                  setEditDeadline={setEditDeadline}
                  editStatus={editStatus}
                  setEditStatus={setEditStatus}
                  updateKnowledge={updateKnowledge}
                  deleteKnowledge={deleteKnowledge}
                  isDeleting={isDeleting}
                  handleReorderKnowledge={handleReorderKnowledge}
                  smartLearnFromText={smartLearnFromText}
                  learnFromFile={learnFromFile}
                  isKnowledgeLearning={isKnowledgeLearning}
                  isSuggestingTags={isSuggestingTags}
                  suggestTagsForContent={suggestTagsForContent}
                  addPendingKnowledge={addPendingKnowledge}
                  deletePendingKnowledge={deletePendingKnowledge}
                  updatePendingKnowledge={updatePendingKnowledge}
                  removeDuplicates={removeDuplicates}
                  isRemovingDuplicates={isRemovingDuplicates}
                  auditAndOptimizeKnowledge={auditAndOptimizeKnowledge}
                  isAuditing={isAuditing}
                  deleteAllKnowledge={deleteAllKnowledge}
                  isDeletingAll={isDeletingAll}
                  isSyncingRemote={isSyncingRemote}
                  syncRemoteKnowledge={syncRemoteKnowledge}
                  syncUnifiedStrategicKnowledge={syncUnifiedStrategicKnowledge}
                  isSyncingUnified={isSyncingUnified}
                  smartSummarizeKnowledge={smartSummarizeKnowledge}
                  isSummarizing={isSummarizing}
                  summarizedContent={summarizedContent}
                  setSummarizedContent={setSummarizedContent}
                  tasks={tasks}
                  updateTasks={updateTasks}
                  messages={messages}
                  setMessages={setMessages}
                  input={input}
                  setInput={setInput}
                  isLoading={isLoading}
                  handleSend={handleSend}
                  messagesEndRef={messagesEndRef}
                  inputRef={inputRef}
                  copyToClipboard={copyToClipboard}
                  copiedId={copiedId}
                  saveToKnowledge={saveToKnowledge}
                  isSaving={isSaving}
                  isChatLearning={isChatLearning}
                  chatHistory={chatHistory}
                  loadChatHistory={loadChatHistory}
                  deleteChatHistory={deleteChatHistory}
                  clearAllChatHistory={clearAllChatHistory}
                  isHistoryLoading={isHistoryLoading}
                  isSearchEnabled={isSearchEnabled}
                  setIsSearchEnabled={setIsSearchEnabled}
                  isSimpleMode={isSimpleMode}
                  setIsSimpleMode={setIsSimpleMode}
                  meetings={meetings}
                  updateMeetings={updateMeetings}
                  isSavingMeetings={isSavingMeetings}
                  loadMeetings={loadMeetings}
                  events={events}
                  updateEvents={updateEvents}
                  isParsingCalendar={isParsingCalendar}
                  parseCalendarFile={parseCalendarFile}
                  uploadAndParseCalendar={uploadAndParseCalendar}
                  birthdays={birthdays}
                  updateBirthdays={updateBirthdays}
                  smartBriefing={smartBriefing}
                  isGeneratingBriefing={isGeneratingBriefing}
                  generateSmartBriefing={generateSmartBriefing}
                  memberCount={memberCount}
                  onlineCount={onlineCount}
                  visitCount={visitCount}
                  draftingRules={draftingRules}
                  addDraftingRule={addDraftingRule}
                  toggleDraftingRule={toggleDraftingRule}
                  deleteDraftingRule={deleteDraftingRule}
                  updateDraftingRule={updateDraftingRule}
                  showToast={showToast}
                  navigateTo={navigateTo}
                  setHasUnsavedChanges={setHasUnsavedChanges}
                  config={config}
                  isCompactMode={preferences.isCompactMode}
                  pendingAIItems={pendingAIItems}
                  isReviewingAI={isReviewingAI}
                  setIsReviewingAI={setIsReviewingAI}
                  confirmAIItems={confirmAIItems}
                  discardAIItems={discardAIItems}
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
          className="fixed inset-0 bg-blue-950/40 backdrop-blur-sm z-40 md:hidden"
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
