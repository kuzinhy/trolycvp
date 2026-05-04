import React, { memo, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ErrorBoundary } from './ErrorBoundary';
import { Task } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useKnowledgeContext } from '../context/KnowledgeContext';
import { useChatContext } from '../context/ChatContext';
import { useDashboardContext } from '../context/DashboardContext';
import { useNotification } from '../context/NotificationContext';
import { useToast } from '../hooks/useToast';
import { useAppStats } from '../hooks/useAppStats';
import { useDraftingRules } from '../hooks/useDraftingRules';
import { useUserPreferences } from '../context/UserPreferencesContext';

// Lazy load modules
const ChatModule = lazy(() => import('./ChatModule').then(m => ({ default: m.ChatModule })));
const WorkScheduleModule = lazy(() => import('./WorkScheduleModule').then(m => ({ default: m.WorkScheduleModule })));
const KanbanView = lazy(() => import('./KanbanView').then(m => ({ default: m.KanbanView })));
const DashboardModule = lazy(() => import('./DashboardModule').then(m => ({ default: m.DashboardModule })));
const KnowledgeModule = lazy(() => import('./KnowledgeModule'));
const ChatHistoryModule = lazy(() => import('./ChatHistoryModule').then(m => ({ default: m.ChatHistoryModule })));
const ProgressTracking = lazy(() => import('./ProgressTracking').then(m => ({ default: m.ProgressTracking })));
const DraftingModule = lazy(() => import('./DraftingModule').then(m => ({ default: m.DraftingModule })));
const SpeechAssistant = lazy(() => import('./SpeechAssistant').then(m => ({ default: m.SpeechAssistant })));
const UserManagementModule = lazy(() => import('./UserManagementModule').then(m => ({ default: m.UserManagementModule })));
const TeamChatModule = lazy(() => import('./TeamChatModule').then(m => ({ default: m.TeamChatModule })));
const UtilitiesModule = lazy(() => import('./UtilitiesModule').then(m => ({ default: m.UtilitiesModule })));
const StrategicForecastingView = lazy(() => import('./StrategicForecastingView').then(m => ({ default: m.StrategicForecastingView })));
const WorkLogModule = lazy(() => import('./WorkLogModule').then(m => ({ default: m.WorkLogModule })));
const AccessHistoryModule = lazy(() => import('./AccessHistoryModule').then(m => ({ default: m.AccessHistoryModule })));
const SmartTaskManager = lazy(() => import('./SmartTaskManager').then(m => ({ default: m.SmartTaskManager })));
const DocumentManagementModule = lazy(() => import('./DocumentManagementModule').then(m => ({ default: m.DocumentManagementModule })));
const SmartErrorCorrectionCenter = lazy(() => import('./SmartErrorCorrectionCenter').then(m => ({ default: m.SmartErrorCorrectionCenter })));
const AssignmentTracking = lazy(() => import('./AssignmentTracking').then(m => ({ default: m.AssignmentTracking })));
const NewsAndOpinionView = lazy(() => import('./NewsAndOpinionView').then(m => ({ default: m.NewsAndOpinionView })));
const EvaluationModule = lazy(() => import('./EvaluationModule').then(m => ({ default: m.EvaluationModule })));
const RoadmapModule = lazy(() => import('./RoadmapModule').then(m => ({ default: m.RoadmapModule })));
const GenZDecoder = lazy(() => import('./GenZDecoder').then(m => ({ default: m.GenZDecoder })));
const PartyDocumentChecker = lazy(() => import('./PartyDocumentChecker').then(m => ({ default: m.PartyDocumentChecker })));
const ResolutionTracker = lazy(() => import('./ResolutionTracker').then(m => ({ default: m.ResolutionTracker })));
const PartyAdvisory = lazy(() => import('./PartyAdvisory').then(m => ({ default: m.PartyAdvisory })));
const WorkScheduleCreator = lazy(() => import('./WorkScheduleCreator').then(m => ({ default: m.WorkScheduleCreator })));
const DocumentAssignment = lazy(() => import('./DocumentAssignment').then(m => ({ default: m.DocumentAssignment })));
const StrategicIntelligenceModule = lazy(() => import('./StrategicIntelligenceModule').then(m => ({ default: m.StrategicIntelligenceModule })));
const TodoAssistant = lazy(() => import('./TodoAssistant').then(m => ({ default: m.TodoAssistant })));
const TaskJournalModule = lazy(() => import('./TaskJournalModule').then(m => ({ default: m.TaskJournalModule })));
const ConclusionCreatorModule = lazy(() => import('./ConclusionCreatorModule').then(m => ({ default: m.ConclusionCreatorModule })));
const EliteDashboardHome = lazy(() => import('./EliteDashboardHome').then(m => ({ default: m.EliteDashboardHome })));
const TaskManagement = lazy(() => import('./TaskManagement').then(m => ({ default: m.TaskManagement })));
const SystemUpdateModule = lazy(() => import('./admin/SystemUpdateModule').then(m => ({ default: m.SystemUpdateModule })));

interface TabContentProps {
  currentTab: string;
  navigationParams?: any;
  navigateTo: (tab: string) => void;
  onStartFocus: (task: Task) => void;
  setHasUnsavedChanges: (val: boolean) => void;
}

export const TabContent = memo(({
  currentTab,
  navigationParams,
  navigateTo,
  onStartFocus,
  setHasUnsavedChanges
}: TabContentProps) => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const { preferences } = useUserPreferences();
  
  const knowledge = useKnowledgeContext();
  const chat = useChatContext();
  const dashboard = useDashboardContext();
  const { memberCount, onlineCount, visitCount } = useAppStats();
  
  const { 
    rules: draftingRules, 
    addRule: addDraftingRule, 
    toggleRule: toggleDraftingRule, 
    deleteRule: deleteDraftingRule, 
    updateRule: updateDraftingRule 
  } = useDraftingRules(showToast);

  const renderModule = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <EliteDashboardHome 
            navigateTo={navigateTo} 
            tasks={dashboard.tasks}
            meetings={dashboard.meetings}
            onlineCount={onlineCount}
            memberCount={memberCount}
          />
        );
      
      case 'dashboard-elite':
        return (
          <DashboardModule 
            {...knowledge}
            {...dashboard}
            {...knowledge.formState}
            memberCount={memberCount}
            onlineCount={onlineCount}
            visitCount={visitCount}
            showToast={showToast}
            onNavigate={navigateTo}
            onViewTasks={() => navigateTo('tasks')}
            isAdmin={isAdmin}
            isHistoryLoading={false}
            birthdays={dashboard.birthdays}
            updateBirthdays={dashboard.updateBirthdays}
            config={{}}
            deleteChatHistory={async () => {}}
            loadChatHistory={() => {}}
            loadMeetings={() => {}}
            isSavingMeetings={false}
          />
        );

      case 'knowledge':
        return (
          <KnowledgeModule 
            {...knowledge}
            {...knowledge.formState}
            isAdmin={isAdmin}
            showToast={showToast}
          />
        );

      case 'tasks':
        return (
          <TaskManagement 
            tasks={dashboard.tasks} 
            setTasks={dashboard.updateTasks as any} 
            showToast={showToast} 
          />
        );

      case 'work-schedule':
      case 'calendar':
        return (
          <WorkScheduleModule 
            meetings={dashboard.meetings}
            tasks={dashboard.tasks}
            events={dashboard.events}
            updateMeetings={dashboard.updateMeetings as any}
            updateTasks={dashboard.updateTasks as any}
            updateEvents={dashboard.updateEvents as any}
            isUploading={false}
            onUploadCalendar={() => {}}
            onUploadCalendarFile={() => {}}
            setHasUnsavedChanges={setHasUnsavedChanges}
            aiKnowledge={knowledge.aiKnowledge}
            onNavigate={navigateTo}
            smartLearnFromText={knowledge.smartLearnFromText}
            isLearning={knowledge.isLearning}
            showToast={showToast}
          />
        );

      case 'reporting':
        return (
          <UtilitiesModule 
            initialTab="reporting"
            hideTabs={true}
            tasks={dashboard.tasks}
            knowledge={knowledge.aiKnowledge}
            navigationParams={navigationParams}
          />
        );

      case 'utilities':
      case 'drafting-pro':
      case 'review':
      case 'drafting-pro-review':
      case 'drafting-pro-speech':
        return (
          <UtilitiesModule 
            initialTab={(currentTab === 'drafting-pro' || currentTab === 'review' || currentTab === 'drafting-pro-review' || currentTab === 'drafting-pro-speech') ? 'drafting' : 'reporting'}
            initialMainTab={
              currentTab === 'drafting-pro' ? 'compose' : 
              currentTab === 'review' ? 'review' : 
              currentTab === 'drafting-pro-review' ? 'party-docs' : 
              currentTab === 'drafting-pro-speech' ? 'speech' :
              undefined
            }
            hideTabs={currentTab !== 'utilities'}
            navigationParams={navigationParams}
            draftingProps={{
              rules: draftingRules,
              addRule: addDraftingRule,
              toggleRule: toggleDraftingRule,
              deleteRule: deleteDraftingRule,
              updateRule: updateDraftingRule,
              showToast: showToast,
              aiKnowledge: knowledge.aiKnowledge
            }}
            speechProps={{
              aiKnowledge: knowledge.aiKnowledge
            }}
            tasks={dashboard.tasks}
            knowledge={knowledge.aiKnowledge}
          />
        );

      case 'users':
        return <UserManagementModule showToast={showToast} addNotification={async () => {}} />;

      case 'system-updates':
        return <SystemUpdateModule />;

      case 'genz':
        return <GenZDecoder />;

      case 'todo-assistant':
        return (
          <TodoAssistant 
            tasks={dashboard.tasks}
            updateTasks={dashboard.updateTasks as any}
            showToast={showToast}
            onStartFocus={onStartFocus}
          />
        );

      case 'conclusion-creator':
        return (
          <ConclusionCreatorModule 
            showToast={showToast}
            onSave={async (category, title, content, tags, pendingId, projectId, references) => {
              showToast("Đã lưu kết luận cuộc họp", "success");
            }}
            aiKnowledge={knowledge.aiKnowledge}
          />
        );

      case 'task-journal':
        return <TaskJournalModule />;

      case 'strategic':
        return <StrategicIntelligenceModule aiKnowledge={knowledge.aiKnowledge} showToast={showToast} />;

      case 'party-advisory':
        return <PartyAdvisory />;

      case 'news':
        return <NewsAndOpinionView />;

      case 'forecasting':
        return <StrategicForecastingView />;

      case 'assignment-tracking':
        return <AssignmentTracking tasks={dashboard.tasks} />;

      case 'resolution-tracking':
        return <ResolutionTracker />;

      case 'evaluation':
        return <EvaluationModule />;

      case 'document-assignment':
        return <DocumentAssignment />;

      case 'chat':
      default:
        return (
          <ChatModule 
            messages={chat.messages}
            input={chat.input}
            setInput={chat.setInput}
            isLoading={chat.isLoading}
            handleSend={chat.handleSend}
            messagesEndRef={chat.messagesEndRef}
            inputRef={chat.inputRef}
            copyToClipboard={(text, id) => chat.copyToClipboard(text, id.toString())}
            copiedId={chat.copiedId ? parseInt(chat.copiedId) : null}
            saveToKnowledge={chat.saveToKnowledge}
            isSaving={chat.isSaving}
            aiKnowledge={knowledge.aiKnowledge}
            smartLearnFromText={knowledge.smartLearnFromText}
            isLearning={chat.isLearning}
            onClearChat={() => {
              chat.setMessages([]);
              showToast("Đã xóa hội thoại", "info");
            }}
            chatHistory={chat.chatHistory}
            deleteChatHistory={chat.deleteChatHistory}
            showToast={showToast}
            isSearchEnabled={chat.isSearchEnabled}
            setIsSearchEnabled={chat.setIsSearchEnabled}
            isSimpleMode={chat.isSimpleMode}
            setIsSimpleMode={chat.setIsSimpleMode}
            onNavigate={navigateTo}
          />
        );
    }
  };

  return (
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
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          }>
            {renderModule()}
          </Suspense>
        </ErrorBoundary>
      </motion.div>
    </AnimatePresence>
  );
});

TabContent.displayName = 'TabContent';
