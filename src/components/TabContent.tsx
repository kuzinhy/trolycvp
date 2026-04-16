import { memo, lazy } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ErrorBoundary } from './ErrorBoundary';
import { Task, Meeting, Event, Birthday } from '../constants';

// Lazy load modules
const ChatModule = lazy(() => import('./ChatModule').then(m => ({ default: m.ChatModule })));
const WorkScheduleModule = lazy(() => import('./WorkScheduleModule').then(m => ({ default: m.WorkScheduleModule })));
const KanbanView = lazy(() => import('./KanbanView').then(m => ({ default: m.KanbanView })));
const DashboardModule = lazy(() => import('./DashboardModule').then(m => ({ default: m.DashboardModule })));
const KnowledgeModule = lazy(() => import('./KnowledgeModule').then(m => ({ default: m.KnowledgeModule })));
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
const NotesModule = lazy(() => import('./NotesModule').then(m => ({ default: m.NotesModule })));

interface TabContentProps {
  currentTab: string;
  navigationParams?: any;
  isAdmin: boolean;
  aiKnowledge: any[];
  pendingKnowledge: any[];
  isPendingLoading: boolean;
  loadKnowledge: () => void;
  isMemoryLoading: boolean;
  isAddingManual: boolean;
  setIsAddingManual: (val: boolean) => void;
  manualValue: string;
  setManualValue: (val: string) => void;
  manualTags: string;
  setManualTags: (val: string) => void;
  manualTitle: string;
  setManualTitle: (val: string) => void;
  manualDocNumber: string;
  setManualDocNumber: (val: string) => void;
  manualIssueDate: string;
  setManualIssueDate: (val: string) => void;
  manualSigner: string;
  setManualSigner: (val: string) => void;
  manualStaffMember: string;
  setManualStaffMember: (val: string) => void;
  manualPermissionLevel: 'public' | 'private';
  setManualPermissionLevel: (val: 'public' | 'private') => void;
  manualVersion: string;
  setManualVersion: (val: string) => void;
  manualReviewStatus: 'draft' | 'in_review' | 'approved' | 'published';
  setManualReviewStatus: (val: 'draft' | 'in_review' | 'approved' | 'published') => void;
  manualReviewNotes: string;
  setManualReviewNotes: (val: string) => void;
  manualPriority: 'low' | 'medium' | 'high';
  setManualPriority: (val: 'low' | 'medium' | 'high') => void;
  manualDeadline: string;
  setManualDeadline: (val: string) => void;
  manualStatus: 'Pending' | 'In Progress' | 'Completed';
  setManualStatus: (val: 'Pending' | 'In Progress' | 'Completed') => void;
  isManualPublic: boolean;
  setIsManualPublic: (val: boolean) => void;
  isManualImportant: boolean;
  setIsManualImportant: (val: boolean) => void;
  addManualKnowledge: (category: string, title: string, content: string, tags: string[], pendingId?: string) => Promise<void>;
  isUpdating: boolean;
  updateProgress?: string;
  editingIndex: number | null;
  setEditingIndex: (idx: number | null) => void;
  editValue: string;
  setEditValue: (val: string) => void;
  editTags: string;
  setEditTags: (val: string) => void;
  editCategory: string | undefined;
  setEditCategory: (val: string) => void;
  editIsImportant: boolean | undefined;
  setEditIsImportant: (val: boolean) => void;
  editIsPublic: boolean | undefined;
  setEditIsPublic: (val: boolean) => void;
  editTitle: string;
  setEditTitle: (val: string) => void;
  editSummary: string;
  setEditSummary: (val: string) => void;
  editDocNumber: string;
  setEditDocNumber: (val: string) => void;
  editIssueDate: string;
  setEditIssueDate: (val: string) => void;
  editSigner: string;
  setEditSigner: (val: string) => void;
  editStaffMember: string;
  setEditStaffMember: (val: string) => void;
  editPermissionLevel: 'public' | 'private';
  setEditPermissionLevel: (val: 'public' | 'private') => void;
  editVersion: string;
  setEditVersion: (val: string) => void;
  editReviewStatus: 'draft' | 'in_review' | 'approved' | 'published';
  setEditReviewStatus: (val: 'draft' | 'in_review' | 'approved' | 'published') => void;
  editReviewNotes: string;
  setEditReviewNotes: (val: string) => void;
  editPriority: 'low' | 'medium' | 'high';
  setEditPriority: (val: 'low' | 'medium' | 'high') => void;
  editDeadline: string;
  setEditDeadline: (val: string) => void;
  editStatus: 'Pending' | 'In Progress' | 'Completed';
  setEditStatus: (val: 'Pending' | 'In Progress' | 'Completed') => void;
  updateKnowledge: (id: string, data: any) => void;
  deleteKnowledge: (id: string) => void;
  isDeleting: string | null;
  handleReorderKnowledge: (newOrder: any[]) => void;
  smartLearnFromText: (text: string, tagsHint?: string[], isManual?: boolean) => Promise<void>;
  learnFromFile: (file: File) => void;
  isKnowledgeLearning: boolean;
  isSuggestingTags: boolean | undefined;
  suggestTagsForContent: (content: string) => void;
  addPendingKnowledge: (name: string) => void;
  deletePendingKnowledge: (id: string) => void;
  updatePendingKnowledge: (id: string, name: string) => void;
  removeDuplicates: (() => void) | undefined;
  isRemovingDuplicates: boolean | undefined;
  auditAndOptimizeKnowledge: (() => Promise<any>) | undefined;
  isAuditing: boolean | undefined;
  deleteAllKnowledge: (() => void) | undefined;
  isDeletingAll: boolean | undefined;
  isSyncingRemote: boolean | undefined;
  syncRemoteKnowledge: (() => void) | undefined;
  smartSummarizeKnowledge: (category?: string, limit?: number) => void;
  isSummarizing: boolean;
  summarizedContent: string | null;
  setSummarizedContent: (content: string | null) => void;
  syncUnifiedStrategicKnowledge: () => Promise<void>;
  isSyncingUnified?: boolean;
  pendingAIItems: any[];
  isReviewingAI: boolean;
  setIsReviewingAI: (val: boolean) => void;
  confirmAIItems: (selectedItems: any[]) => void;
  discardAIItems: () => void;
  onStartFocus: (task: Task) => void;
  tasks: Task[];
  updateTasks: (updater: Task[] | ((prev: Task[]) => Task[])) => Promise<void>;
  messages: any[];
  setMessages: (msgs: any[]) => void;
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  handleSend: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  copyToClipboard: (text: string, id: string) => void;
  copiedId: string | null;
  saveToKnowledge: (text: string, tags: string[], index: number) => Promise<void>;
  isSaving: number | null;
  isSavingMeetings: boolean;
  isChatLearning: boolean;
  chatHistory: any[];
  loadChatHistory: () => void;
  deleteChatHistory: (index: number) => Promise<void>;
  clearAllChatHistory: () => void;
  isHistoryLoading: boolean;
  isSearchEnabled: boolean;
  setIsSearchEnabled: (val: boolean) => void;
  isSimpleMode: boolean;
  setIsSimpleMode: (val: boolean) => void;
  meetings: Meeting[];
  updateMeetings: (updater: Meeting[] | ((prev: Meeting[]) => Meeting[])) => Promise<void>;
  loadMeetings: () => void;
  events: Event[];
  updateEvents: (updater: Event[] | ((prev: Event[]) => Event[])) => Promise<void>;
  isParsingCalendar: boolean;
  parseCalendarFile: (file: File) => void;
  uploadAndParseCalendar: (file: File) => void;
  birthdays: Birthday[];
  updateBirthdays: (updater: Birthday[] | ((prev: Birthday[]) => Birthday[])) => Promise<void>;
  smartBriefing: string | null;
  isGeneratingBriefing: boolean;
  generateSmartBriefing: (tasks: Task[], meetings: Meeting[], events: Event[], birthdays: Birthday[]) => Promise<void>;
  memberCount: number;
  onlineCount: number;
  visitCount: number;
  draftingRules: any[];
  addDraftingRule: (content: string) => void;
  toggleDraftingRule: (id: string) => void;
  deleteDraftingRule: (id: string) => void;
  updateDraftingRule: (id: string, content: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  navigateTo: (tab: string) => void;
  setHasUnsavedChanges: (val: boolean) => void;
  config: any;
  isCompactMode: boolean;
}

export const TabContent = memo(({
  currentTab,
  navigationParams,
  isAdmin,
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
  isKnowledgeLearning,
  isSuggestingTags,
  suggestTagsForContent,
  addPendingKnowledge,
  deletePendingKnowledge,
  updatePendingKnowledge,
  removeDuplicates,
  isRemovingDuplicates,
  auditAndOptimizeKnowledge,
  isAuditing,
  deleteAllKnowledge,
  isDeletingAll,
  isSyncingRemote,
  syncRemoteKnowledge,
  smartSummarizeKnowledge,
  isSummarizing,
  summarizedContent,
  setSummarizedContent,
  syncUnifiedStrategicKnowledge,
  isSyncingUnified,
  tasks,
  updateTasks,
  messages,
  setMessages,
  input,
  setInput,
  isLoading,
  handleSend,
  messagesEndRef,
  inputRef,
  copyToClipboard,
  copiedId,
  saveToKnowledge,
  isSaving,
  isChatLearning,
  chatHistory,
  loadChatHistory,
  deleteChatHistory,
  clearAllChatHistory,
  isHistoryLoading,
  isSearchEnabled,
  setIsSearchEnabled,
  isSimpleMode,
  setIsSimpleMode,
  meetings,
  updateMeetings,
  isSavingMeetings,
  loadMeetings,
  events,
  updateEvents,
  isParsingCalendar,
  parseCalendarFile,
  uploadAndParseCalendar,
  birthdays,
  updateBirthdays,
  smartBriefing,
  isGeneratingBriefing,
  generateSmartBriefing,
  memberCount,
  onlineCount,
  visitCount,
  draftingRules,
  addDraftingRule,
  toggleDraftingRule,
  deleteDraftingRule,
  updateDraftingRule,
  showToast,
  navigateTo,
  setHasUnsavedChanges,
  config,
  pendingAIItems,
  isReviewingAI,
  setIsReviewingAI,
  confirmAIItems,
  discardAIItems,
  onStartFocus,
  isCompactMode
}: TabContentProps) => {
  if (currentTab === 'todo-assistant') {
    return (
      <TodoAssistant 
        tasks={tasks}
        updateTasks={updateTasks}
        showToast={showToast}
        onStartFocus={onStartFocus}
      />
    );
  }

  if (currentTab === 'notes') {
    return (
      <NotesModule 
        onNavigate={navigateTo}
        showToast={showToast}
      />
    );
  }

  if (currentTab === 'dashboard') {
    return (
      <DashboardModule
        initialTab="command"
        aiKnowledge={aiKnowledge}
        pendingKnowledge={pendingKnowledge}
        isPendingLoading={isPendingLoading}
        isAdmin={isAdmin}
        loadKnowledge={loadKnowledge}
        isMemoryLoading={isMemoryLoading}
        isAddingManual={isAddingManual}
        setIsAddingManual={setIsAddingManual}
        manualValue={manualValue}
        setManualValue={setManualValue}
        manualTags={manualTags}
        setManualTags={setManualTags}
        isManualPublic={isManualPublic}
        setIsManualPublic={setIsManualPublic}
        isManualImportant={isManualImportant}
        setIsManualImportant={setIsManualImportant}
        addManualKnowledge={addManualKnowledge}
        isUpdating={isUpdating}
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
        updateKnowledge={updateKnowledge}
        deleteKnowledge={deleteKnowledge}
        isDeleting={isDeleting}
        onReorderKnowledge={handleReorderKnowledge}
        smartLearnFromText={smartLearnFromText}
        learnFromFile={learnFromFile}
        isLearning={isKnowledgeLearning}
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
        chatHistory={chatHistory}
        onClearAllChatHistory={clearAllChatHistory}
        tasks={tasks}
        setTasks={updateTasks}
        meetings={meetings}
        updateMeetings={updateMeetings}
        isSavingMeetings={isSavingMeetings}
        loadMeetings={loadMeetings}
        events={events}
        updateEvents={updateEvents}
        loadChatHistory={loadChatHistory}
        deleteChatHistory={deleteChatHistory}
        isHistoryLoading={isHistoryLoading}
        config={config}
        showToast={showToast}
        onViewTasks={() => navigateTo('tasks')}
        onNavigate={navigateTo}
        birthdays={birthdays}
        updateBirthdays={updateBirthdays}
        smartBriefing={smartBriefing}
        isGeneratingBriefing={isGeneratingBriefing}
        generateSmartBriefing={generateSmartBriefing}
        memberCount={memberCount}
        onlineCount={onlineCount}
        visitCount={visitCount}
        syncUnifiedStrategicKnowledge={syncUnifiedStrategicKnowledge}
        isSyncingUnified={isSyncingUnified}
      />
    );
  }

  if (currentTab === 'knowledge') {
    return (
      <KnowledgeModule 
        aiKnowledge={aiKnowledge}
        pendingKnowledge={pendingKnowledge}
        isPendingLoading={isPendingLoading}
        isAdmin={isAdmin}
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
        onReorderKnowledge={handleReorderKnowledge}
        smartLearnFromText={smartLearnFromText}
        learnFromFile={learnFromFile}
        isLearning={isKnowledgeLearning}
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
        smartSummarizeKnowledge={smartSummarizeKnowledge}
        isSummarizing={isSummarizing}
        summarizedContent={summarizedContent}
        setSummarizedContent={setSummarizedContent}
        syncUnifiedStrategicKnowledge={syncUnifiedStrategicKnowledge}
        isSyncingUnified={isSyncingUnified}
        showToast={showToast}
        pendingAIItems={pendingAIItems}
        isReviewingAI={isReviewingAI}
        setIsReviewingAI={setIsReviewingAI}
        confirmAIItems={confirmAIItems}
        discardAIItems={discardAIItems}
      />
    );
  }

  if (currentTab === 'history') {
    return (
      <ChatHistoryModule 
        chatHistory={chatHistory} 
        onDelete={deleteChatHistory} 
        isHistoryLoading={isHistoryLoading}
        onNavigate={navigateTo}
        onClearAll={clearAllChatHistory}
        onExportToKnowledge={(content) => {
          setManualValue(content);
          setIsAddingManual(true);
          navigateTo('knowledge');
        }}
      />
    );
  }

  if (currentTab === 'tracking') {
    return (
      <ProgressTracking 
        items={[]} 
        tasks={tasks}
        setTasks={updateTasks}
        showToast={showToast}
      />
    );
  }

  if (currentTab === 'calendar') {
    return (
      <WorkScheduleModule 
        meetings={meetings} 
        tasks={tasks} 
        events={events}
        updateMeetings={updateMeetings}
        updateTasks={updateTasks}
        updateEvents={updateEvents}
        isUploading={isParsingCalendar}
        onUploadCalendar={parseCalendarFile}
        onUploadCalendarFile={uploadAndParseCalendar}
        setHasUnsavedChanges={setHasUnsavedChanges}
        aiKnowledge={aiKnowledge}
        onNavigate={navigateTo}
        smartLearnFromText={smartLearnFromText}
        isLearning={isKnowledgeLearning}
        showToast={showToast}
      />
    );
  }

  if (currentTab === 'kanban') {
    return <KanbanView tasks={tasks} updateTasks={updateTasks} />;
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
    return <AssignmentTracking tasks={tasks} isAdmin={isAdmin} />;
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
    return <EvaluationModule aiKnowledge={aiKnowledge} />;
  }

  if (currentTab === 'roadmap') {
    return <RoadmapModule />;
  }

  if (currentTab === 'document-assignment') {
    return <DocumentAssignment />;
  }

  if (currentTab === 'strategic') {
    return <StrategicIntelligenceModule aiKnowledge={aiKnowledge} showToast={showToast} />;
  }

  if (currentTab === 'reporting') {
    return (
      <UtilitiesModule 
        initialTab="reporting"
        hideTabs={true}
        tasks={tasks}
        knowledge={aiKnowledge}
        navigationParams={navigationParams}
      />
    );
  }

  if (currentTab === 'utilities' || currentTab === 'drafting-pro' || currentTab === 'invitation' || currentTab === 'review' || currentTab === 'drafting-pro-review' || currentTab === 'drafting-pro-speech') {
    return (
      <UtilitiesModule 
        initialTab={(currentTab === 'drafting-pro' || currentTab === 'invitation' || currentTab === 'review' || currentTab === 'drafting-pro-review' || currentTab === 'drafting-pro-speech') ? 'drafting' : 'reporting'}
        initialMainTab={
          currentTab === 'drafting-pro' ? 'compose' : 
          currentTab === 'invitation' ? 'invitation' : 
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
          aiKnowledge: aiKnowledge
        }}
        speechProps={{
          aiKnowledge: aiKnowledge
        }}
        tasks={tasks}
        knowledge={aiKnowledge}
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
      messages={messages}
      input={input}
      setInput={setInput}
      isLoading={isLoading}
      handleSend={handleSend}
      messagesEndRef={messagesEndRef}
      inputRef={inputRef}
      copyToClipboard={(text, id) => copyToClipboard(text, id.toString())}
      copiedId={copiedId ? parseInt(copiedId) : null}
      saveToKnowledge={saveToKnowledge}
      isSaving={isSaving}
      aiKnowledge={aiKnowledge}
      smartLearnFromText={smartLearnFromText}
      isLearning={isChatLearning}
      onClearChat={() => {
        setMessages([]);
        showToast("Đã xóa hội thoại", "info");
      }}
      chatHistory={chatHistory}
      deleteChatHistory={deleteChatHistory}
      showToast={showToast}
      isSearchEnabled={isSearchEnabled}
      setIsSearchEnabled={setIsSearchEnabled}
      isSimpleMode={isSimpleMode}
      setIsSimpleMode={setIsSimpleMode}
    />
  );
});

TabContent.displayName = 'TabContent';
