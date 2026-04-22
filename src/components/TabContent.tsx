import { memo, lazy, Suspense } from 'react';
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
const ConclusionCreatorModule = lazy(() => import('./ConclusionCreatorModule').then(m => ({ default: m.ConclusionCreatorModule })));
const EliteDashboardHome = lazy(() => import('./EliteDashboardHome').then(m => ({ default: m.EliteDashboardHome })));

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

  // Hook for drafting rules (it was a hook in App.tsx)
  const { 
    rules: draftingRules, 
    addRule: addDraftingRule, 
    toggleRule: toggleDraftingRule, 
    deleteRule: deleteDraftingRule, 
    updateRule: updateDraftingRule 
  } = useDraftingRules(showToast);

  if (currentTab === 'todo-assistant') {
    return (
      <TodoAssistant 
        tasks={dashboard.tasks}
        updateTasks={dashboard.updateTasks as any}
        showToast={showToast}
        onStartFocus={onStartFocus}
      />
    );
  }

  if (currentTab === 'conclusion-creator') {
    return (
      <ConclusionCreatorModule 
        showToast={showToast}
        aiKnowledge={knowledge.aiKnowledge}
        onSave={knowledge.addManualKnowledge}
      />
    );
  }

  if (currentTab === 'dashboard') {
    return (
      <EliteDashboardHome 
        navigateTo={navigateTo}
        tasks={dashboard.tasks}
        meetings={dashboard.meetings}
        onlineCount={onlineCount || 0}
        memberCount={memberCount || 0}
        visitCount={visitCount || 0}
      />
    );
  }

  if (currentTab === 'knowledge') {
    return (
      <KnowledgeModule 
        aiKnowledge={knowledge.aiKnowledge}
        pendingKnowledge={knowledge.pendingKnowledge}
        isPendingLoading={knowledge.isPendingLoading}
        isAdmin={isAdmin}
        loadKnowledge={knowledge.loadKnowledge}
        isMemoryLoading={knowledge.isMemoryLoading}
        isAddingManual={knowledge.isAddingManual}
        setIsAddingManual={knowledge.setIsAddingManual}
        manualValue={knowledge.formState.manualValue}
        setManualValue={(val: string) => knowledge.setFormState((p: any) => ({ ...p, manualValue: val }))}
        manualTags={knowledge.formState.manualTags}
        setManualTags={(val: string) => knowledge.setFormState((p: any) => ({ ...p, manualTags: val }))}
        manualTitle={knowledge.formState.manualTitle}
        setManualTitle={(val: string) => knowledge.setFormState((p: any) => ({ ...p, manualTitle: val }))}
        manualDocNumber={knowledge.formState.manualDocNumber}
        setManualDocNumber={(val: string) => knowledge.setFormState((p: any) => ({ ...p, manualDocNumber: val }))}
        manualIssueDate={knowledge.formState.manualIssueDate}
        setManualIssueDate={(val: string) => knowledge.setFormState((p: any) => ({ ...p, manualIssueDate: val }))}
        manualSigner={knowledge.formState.manualSigner}
        setManualSigner={(val: string) => knowledge.setFormState((p: any) => ({ ...p, manualSigner: val }))}
        manualStaffMember={knowledge.formState.manualStaffMember}
        setManualStaffMember={(val: string) => knowledge.setFormState((p: any) => ({ ...p, manualStaffMember: val }))}
        manualPermissionLevel={knowledge.formState.manualPermissionLevel}
        setManualPermissionLevel={(val: any) => knowledge.setFormState((p: any) => ({ ...p, manualPermissionLevel: val }))}
        manualVersion={knowledge.formState.manualVersion}
        setManualVersion={(val: string) => knowledge.setFormState((p: any) => ({ ...p, manualVersion: val }))}
        manualReviewStatus={knowledge.formState.manualReviewStatus}
        setManualReviewStatus={(val: any) => knowledge.setFormState((p: any) => ({ ...p, manualReviewStatus: val }))}
        manualReviewNotes={knowledge.formState.manualReviewNotes}
        setManualReviewNotes={(val: string) => knowledge.setFormState((p: any) => ({ ...p, manualReviewNotes: val }))}
        manualPriority={knowledge.formState.manualPriority}
        setManualPriority={(val: any) => knowledge.setFormState((p: any) => ({ ...p, manualPriority: val }))}
        manualDeadline={knowledge.formState.manualDeadline}
        setManualDeadline={(val: string) => knowledge.setFormState((p: any) => ({ ...p, manualDeadline: val }))}
        manualStatus={knowledge.formState.manualStatus}
        setManualStatus={(val: any) => knowledge.setFormState((p: any) => ({ ...p, manualStatus: val }))}
        isManualPublic={knowledge.formState.isManualPublic}
        setIsManualPublic={(val: boolean) => knowledge.setFormState((p: any) => ({ ...p, isManualPublic: val }))}
        isManualImportant={knowledge.formState.isManualImportant}
        setIsManualImportant={(val: boolean) => knowledge.setFormState((p: any) => ({ ...p, isManualImportant: val }))}
        addManualKnowledge={knowledge.addManualKnowledge}
        isUpdating={knowledge.isUpdating}
        editingIndex={knowledge.editingIndex}
        setEditingIndex={knowledge.setEditingIndex}
        editValue={knowledge.formState.editValue}
        setEditValue={(val: string) => knowledge.setFormState((p: any) => ({ ...p, editValue: val }))}
        editTags={knowledge.formState.editTags}
        setEditTags={(val: string) => knowledge.setFormState((p: any) => ({ ...p, editTags: val }))}
        editCategory={knowledge.formState.editCategory}
        setEditCategory={(val: string) => knowledge.setFormState((p: any) => ({ ...p, editCategory: val }))}
        editIsImportant={knowledge.formState.editIsImportant}
        setEditIsImportant={(val: boolean) => knowledge.setFormState((p: any) => ({ ...p, editIsImportant: val }))}
        editIsPublic={knowledge.formState.editIsPublic}
        setEditIsPublic={(val: boolean) => knowledge.setFormState((p: any) => ({ ...p, editIsPublic: val }))}
        editTitle={knowledge.formState.editTitle}
        setEditTitle={(val: string) => knowledge.setFormState((p: any) => ({ ...p, editTitle: val }))}
        editSummary={knowledge.formState.editSummary}
        setEditSummary={(val: string) => knowledge.setFormState((p: any) => ({ ...p, editSummary: val }))}
        editDocNumber={knowledge.formState.editDocNumber}
        setEditDocNumber={(val: string) => knowledge.setFormState((p: any) => ({ ...p, editDocNumber: val }))}
        editIssueDate={knowledge.formState.editIssueDate}
        setEditIssueDate={(val: string) => knowledge.setFormState((p: any) => ({ ...p, editIssueDate: val }))}
        editSigner={knowledge.formState.editSigner}
        setEditSigner={(val: string) => knowledge.setFormState((p: any) => ({ ...p, editSigner: val }))}
        editStaffMember={knowledge.formState.editStaffMember}
        setEditStaffMember={(val: string) => knowledge.setFormState((p: any) => ({ ...p, editStaffMember: val }))}
        editPermissionLevel={knowledge.formState.editPermissionLevel}
        setEditPermissionLevel={(val: any) => knowledge.setFormState((p: any) => ({ ...p, editPermissionLevel: val }))}
        editVersion={knowledge.formState.editVersion}
        setEditVersion={(val: string) => knowledge.setFormState((p: any) => ({ ...p, editVersion: val }))}
        editReviewStatus={knowledge.formState.editReviewStatus}
        setEditReviewStatus={(val: any) => knowledge.setFormState((p: any) => ({ ...p, editReviewStatus: val }))}
        editReviewNotes={knowledge.formState.editReviewNotes}
        setEditReviewNotes={(val: string) => knowledge.setFormState((p: any) => ({ ...p, editReviewNotes: val }))}
        editPriority={knowledge.formState.editPriority}
        setEditPriority={(val: any) => knowledge.setFormState((p: any) => ({ ...p, editPriority: val }))}
        editDeadline={knowledge.formState.editDeadline}
        setEditDeadline={(val: string) => knowledge.setFormState((p: any) => ({ ...p, editDeadline: val }))}
        editStatus={knowledge.formState.editStatus}
        setEditStatus={(val: any) => knowledge.setFormState((p: any) => ({ ...p, editStatus: val }))}
        updateKnowledge={knowledge.updateKnowledge}
        deleteKnowledge={knowledge.deleteKnowledge}
        isDeleting={knowledge.isDeleting}
        onReorderKnowledge={knowledge.handleReorderKnowledge}
        smartLearnFromText={knowledge.smartLearnFromText}
        learnFromFile={knowledge.learnFromFile}
        isLearning={knowledge.isLearning}
        isSuggestingTags={false}
        suggestTagsForContent={() => {}}
        addPendingKnowledge={() => {}}
        deletePendingKnowledge={() => {}}
        updatePendingKnowledge={() => {}}
        removeDuplicates={() => {}}
        isRemovingDuplicates={false}
        auditAndOptimizeKnowledge={knowledge.auditAndOptimizeKnowledge}
        isAuditing={false}
        deleteAllKnowledge={knowledge.deleteAllKnowledge}
        isDeletingAll={false}
        isSyncingRemote={false}
        syncRemoteKnowledge={() => {}}
        smartSummarizeKnowledge={knowledge.smartSummarizeKnowledge}
        isSummarizing={knowledge.isSummarizing}
        summarizedContent={knowledge.summarizedContent}
        setSummarizedContent={knowledge.setSummarizedContent}
        syncUnifiedStrategicKnowledge={knowledge.syncUnifiedStrategicKnowledge}
        isSyncingUnified={false}
        showToast={showToast}
        pendingAIItems={[]}
        isReviewingAI={false}
        setIsReviewingAI={() => {}}
        confirmAIItems={() => {}}
        discardAIItems={() => {}}
      />
    );
  }

  if (currentTab === 'history') {
    return (
      <ChatHistoryModule 
        chatHistory={chat.chatHistory} 
        onDelete={chat.deleteChatHistory} 
        isHistoryLoading={chat.isHistoryLoading}
        onNavigate={navigateTo}
        onClearAll={chat.clearAllChatHistory}
        onExportToKnowledge={(content) => {
          knowledge.setFormState((p: any) => ({ ...p, manualValue: content }));
          knowledge.setIsAddingManual(true);
          navigateTo('knowledge');
        }}
      />
    );
  }

  if (currentTab === 'tracking') {
    return (
      <ProgressTracking 
        items={[]} 
        tasks={dashboard.tasks}
        setTasks={dashboard.updateTasks as any}
        showToast={showToast}
      />
    );
  }

  if (currentTab === 'calendar') {
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
  }

  if (currentTab === 'kanban') {
    return <KanbanView tasks={dashboard.tasks} updateTasks={dashboard.updateTasks as any} />;
  }

  if (currentTab === 'forecasting') {
    return <StrategicForecastingView />;
  }

  if (currentTab === 'access-history') {
    return <AccessHistoryModule />;
  }

  if (currentTab === 'tasks') {
    return <SmartTaskManager />;
  }

  if (currentTab === 'documents') {
    return <DocumentManagementModule />;
  }

  if (currentTab === 'error-center') {
    return <SmartErrorCorrectionCenter />;
  }

  if (currentTab === 'assignment-tracking') {
    return <AssignmentTracking tasks={dashboard.tasks} isAdmin={isAdmin} />;
  }

  if (currentTab === 'news') {
    return <NewsAndOpinionView />;
  }

  if (currentTab === 'resolution-tracking') {
    return <ResolutionTracker />;
  }

  if (currentTab === 'party-advisory') {
    return <PartyAdvisory />;
  }

  if (currentTab === 'evaluation') {
    return <EvaluationModule aiKnowledge={knowledge.aiKnowledge} />;
  }

  if (currentTab === 'roadmap') {
    return <RoadmapModule />;
  }

  if (currentTab === 'document-assignment') {
    return <DocumentAssignment />;
  }

  if (currentTab === 'strategic') {
    return <StrategicIntelligenceModule aiKnowledge={knowledge.aiKnowledge} showToast={showToast} />;
  }

  if (currentTab === 'reporting') {
    return (
      <UtilitiesModule 
        initialTab="reporting"
        hideTabs={true}
        tasks={dashboard.tasks}
        knowledge={knowledge.aiKnowledge}
        navigationParams={navigationParams}
      />
    );
  }

  if (currentTab === 'utilities' || currentTab === 'drafting-pro' || currentTab === 'review' || currentTab === 'drafting-pro-review' || currentTab === 'drafting-pro-speech') {
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
  }

  if (currentTab === 'users') {
    return <UserManagementModule showToast={showToast} addNotification={async () => {}} />;
  }

  if (currentTab === 'genz') {
    return <GenZDecoder />;
  }

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
});

TabContent.displayName = 'TabContent';

