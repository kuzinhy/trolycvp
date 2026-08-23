import React, { memo, lazy, Suspense } from 'react';
import { motion } from 'motion/react';
import { ErrorBoundary } from './ErrorBoundary';
import { Task } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useKnowledgeContext } from '../context/KnowledgeContext';
import { useChatContext } from '../context/ChatContext';
import { useDashboardContext } from '../context/DashboardContext';
import { useToast } from '../hooks/useToast';
import { useAppStats } from '../hooks/useAppStats';

// Lazy load modules
const ChatModule = lazy(() => import('./ChatModule').then(m => ({ default: m.ChatModule })));
const WorkScheduleModule = lazy(() => import('./WorkScheduleModule').then(m => ({ default: m.WorkScheduleModule })));
const DashboardModule = lazy(() => import('./DashboardModule').then(m => ({ default: m.DashboardModule })));
const KnowledgeModule = lazy(() => import('./KnowledgeModule'));
const UserManagementModule = lazy(() => import('./UserManagementModule').then(m => ({ default: m.UserManagementModule })));
const UtilitiesModule = lazy(() => import('./UtilitiesModule').then(m => ({ default: m.UtilitiesModule })));
const StrategicForecastingView = lazy(() => import('./StrategicForecastingView').then(m => ({ default: m.StrategicForecastingView })));
const AccessHistoryModule = lazy(() => import('./AccessHistoryModule').then(m => ({ default: m.AccessHistoryModule })));
const AssignmentTracking = lazy(() => import('./AssignmentTracking').then(m => ({ default: m.AssignmentTracking })));
const EvaluationModule = lazy(() => import('./EvaluationModule').then(m => ({ default: m.EvaluationModule })));
const GenZDecoder = lazy(() => import('./GenZDecoder').then(m => ({ default: m.GenZDecoder })));
const PartyAdvisory = lazy(() => import('./PartyAdvisory').then(m => ({ default: m.PartyAdvisory })));
const TodoAssistant = lazy(() => import('./TodoAssistant').then(m => ({ default: m.TodoAssistant })));
const DailyJournalModule = lazy(() => import('./DailyJournalModule').then(m => ({ default: m.DailyJournalModule })));
const TaskJournalModule = lazy(() => import('./TaskJournalModule').then(m => ({ default: m.TaskJournalModule })));
const MeetingHub = lazy(() => import('./MeetingHub').then(m => ({ default: m.MeetingHub })));
const ConclusionCreatorModule = lazy(() => import('./ConclusionCreatorModule').then(m => ({ default: m.ConclusionCreatorModule })));
const WardPartyDashboard = lazy(() => import('./dashboard/WardPartyDashboard').then(m => ({ default: m.WardPartyDashboard })));
const TaskManagement = lazy(() => import('./TaskManagement').then(m => ({ default: m.TaskManagement })));
const SystemUpdateModule = lazy(() => import('./admin/SystemUpdateModule').then(m => ({ default: m.SystemUpdateModule })));
const SystemHistoryModule = lazy(() => import('./SystemHistoryModule').then(m => ({ default: m.SystemHistoryModule })));
const UserManualModule = lazy(() => import('./UserManualModule').then(m => ({ default: m.UserManualModule })));
const SecurityMonitorModule = lazy(() => import('./SecurityMonitorModule').then(m => ({ default: m.SecurityMonitorModule })));
const AIAnalysisModule = lazy(() => import('./AIAnalysisModule').then(m => ({ default: m.AIAnalysisModule })));
const ProjectsModule = lazy(() => import('./ProjectsModule').then(m => ({ default: m.ProjectsModule })));
const GanttChartModule = lazy(() => import('./GanttChartModule').then(m => ({ default: m.GanttChartModule })));
const WorkflowModule = lazy(() => import('./WorkflowModule').then(m => ({ default: m.WorkflowModule })));
const StaffDirectoryModule = lazy(() => import('./StaffDirectoryModule').then(m => ({ default: m.StaffDirectoryModule })));
const AutomationsSettingsModule = lazy(() => import('./AutomationsSettingsModule').then(m => ({ default: m.AutomationsSettingsModule })));

// Preload primary frequently accessed modules on background idle
if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
  window.requestIdleCallback(() => {
    import('./TodoAssistant');
    import('./WorkScheduleModule');
    import('./dashboard/WardPartyDashboard');
    import('./KnowledgeModule');
    import('./ChatModule');
    import('./UtilitiesModule');
  });
}

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
  
  const knowledge = useKnowledgeContext();
  const chat = useChatContext();
  const dashboard = useDashboardContext();
  const { memberCount, onlineCount, visitCount } = useAppStats();

  const renderModule = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <WardPartyDashboard 
            navigateTo={navigateTo}
            showToast={showToast}
          />
        );

      case 'projects':
        return (
          <ProjectsModule 
            tasks={dashboard.tasks}
            setTasks={dashboard.updateTasks as any}
            showToast={showToast}
            navigateTo={navigateTo}
          />
        );

      case 'gantt':
        return (
          <GanttChartModule 
            tasks={dashboard.tasks}
            showToast={showToast}
            navigateTo={navigateTo}
          />
        );

      case 'workflows':
        return (
          <WorkflowModule 
            tasks={dashboard.tasks}
            showToast={showToast}
            navigateTo={navigateTo}
          />
        );

      case 'staff':
        return (
          <StaffDirectoryModule 
            showToast={showToast}
            navigateTo={navigateTo}
          />
        );

      case 'automations':
        return (
          <AutomationsSettingsModule 
            showToast={showToast}
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
            onFocusTask={onStartFocus}
          />
        );

      case 'knowledge':
      case 'mnn-knowledge':
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
            hideTabs={false}
            tasks={dashboard.tasks}
            knowledge={knowledge.aiKnowledge}
            navigationParams={navigationParams}
          />
        );

      case 'ai-media-analysis':
        return <AIAnalysisModule />;

      case 'utilities':
        return (
          <UtilitiesModule 
            initialTab="reporting"
            hideTabs={false}
            navigationParams={navigationParams}
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

      case 'daily-journal':
        return <DailyJournalModule />;

      case 'meeting-hub':
        return <MeetingHub />;

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

      case 'access-history':
        return <AccessHistoryModule />;

      case 'party-advisory':
        return <PartyAdvisory />;

      case 'forecasting':
        return <StrategicForecastingView />;

      case 'assignment-tracking':
        return <AssignmentTracking tasks={dashboard.tasks} isAdmin={isAdmin} />;

      case 'evaluation':
        return <EvaluationModule />;

      case 'history':
        return <SystemHistoryModule />;

      case 'user-manual':
        return <UserManualModule />;

      case 'security-monitor':
        return <SecurityMonitorModule />;

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
    <motion.div
      key={currentTab}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="h-full"
    >
      <ErrorBoundary>
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-rose-600 rounded-full animate-spin"></div>
            <span className="text-xs text-slate-400 font-medium">Đang mở phân hệ...</span>
          </div>
        }>
          {renderModule()}
        </Suspense>
      </ErrorBoundary>
    </motion.div>
  );
});

TabContent.displayName = 'TabContent';
