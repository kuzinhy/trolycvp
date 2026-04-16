import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { FileText, MessageSquare, Sparkles, FileEdit, GripVertical, Languages, Database } from 'lucide-react';
import { cn } from '../lib/utils';

// Lazy load utility sub-modules
const ReportingModule = lazy(() => import('./ReportingModule').then(m => ({ default: m.ReportingModule })));
const MeetingAssistant = lazy(() => import('./MeetingAssistant').then(m => ({ default: m.MeetingAssistant })));
const ReportGeneratorModule = lazy(() => import('./ReportGeneratorModule').then(m => ({ default: m.ReportGeneratorModule })));
const DraftingModule = lazy(() => import('./DraftingModule').then(m => ({ default: m.DraftingModule })));
const BulkReview = lazy(() => import('./BulkReview').then(m => ({ default: m.BulkReview })));
const SmartDataExtractor = lazy(() => import('./SmartDataExtractor').then(m => ({ default: m.SmartDataExtractor })));
const SmartTranslator = lazy(() => import('./SmartTranslator').then(m => ({ default: m.SmartTranslator })));
const DocumentReaderModule = lazy(() => import('./DocumentReaderModule').then(m => ({ default: m.DocumentReaderModule })));
const SpeechAssistant = lazy(() => import('./SpeechAssistant').then(m => ({ default: m.SpeechAssistant })));

interface UtilitiesModuleProps {
  initialTab?: TabId;
  initialMainTab?: 'review' | 'compose' | 'invitation' | 'bulk' | 'party-docs' | 'email' | 'speech';
  navigationParams?: any;
  hideTabs?: boolean;
  draftingProps?: {
    rules: any[];
    addRule: (content: string) => void;
    toggleRule: (id: string) => void;
    deleteRule: (id: string) => void;
    updateRule: (id: string, content: string) => void;
    showToast: (message: string, type?: any) => void;
    aiKnowledge: any[];
    initialMainTab?: 'review' | 'compose' | 'invitation' | 'bulk' | 'party-docs' | 'email' | 'speech';
  };
  speechProps?: {
    aiKnowledge: any[];
  };
  tasks?: any[];
  knowledge?: any[];
}

type TabId = 'reporting' | 'meeting' | 'ai-report' | 'drafting' | 'speech' | 'translator' | 'data-extractor' | 'pdf-reader' | 'english' | 'bulk-review';

interface TabItem {
  id: TabId;
  label: string;
  color: string;
}

const INITIAL_TABS: TabItem[] = [
  { id: 'drafting', label: 'Soạn thảo văn bản', color: 'text-blue-600' },
  { id: 'speech', label: 'Soạn bài phát biểu', color: 'text-purple-600' },
  { id: 'bulk-review', label: 'Kiểm tra văn bản', color: 'text-rose-600' },
  { id: 'reporting', label: 'Phân tích và tạo báo cáo', color: 'text-emerald-600' },
  { id: 'meeting', label: 'Trợ lý họp thông minh', color: 'text-indigo-600' },
  { id: 'data-extractor', label: 'Trích xuất Dữ liệu AI', color: 'text-amber-600' },
  { id: 'pdf-reader', label: 'Đọc tài liệu', color: 'text-rose-600' },
];

export const UtilitiesModule: React.FC<UtilitiesModuleProps> = ({ initialTab, initialMainTab, navigationParams, hideTabs, draftingProps, speechProps, tasks = [], knowledge = [] }) => {
  const [tabs, setTabs] = useState<TabItem[]>(() => {
    const saved = localStorage.getItem('utilities_tabs_order');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure all current tabs are present in the saved order
        const currentIds = INITIAL_TABS.map(t => t.id);
        const savedIds = parsed.map((t: any) => t.id);
        const missing = INITIAL_TABS.filter(t => !savedIds.includes(t.id));
        return [...parsed, ...missing].filter(t => currentIds.includes(t.id));
      } catch (e) {
        return INITIAL_TABS;
      }
    }
    return INITIAL_TABS;
  });

  const [activeTab, setActiveTab] = useState<TabId>(tabs[0].id);

  useEffect(() => {
    if (initialTab && tabs.some(t => t.id === initialTab)) {
      setActiveTab(initialTab);
    }
  }, [initialTab, tabs]);

  useEffect(() => {
    localStorage.setItem('utilities_tabs_order', JSON.stringify(tabs));
  }, [tabs]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="max-w-7xl mx-auto p-6 space-y-6"
    >
      {!hideTabs && (
        <div className="flex flex-col border-b border-slate-200/60 pb-5 mb-6 gap-4">
          <Reorder.Group 
            axis="x" 
            values={tabs} 
            onReorder={setTabs}
            className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2"
          >
            {tabs.map((tab) => (
              <Reorder.Item 
                key={tab.id} 
                value={tab}
                className="relative"
              >
                <button 
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-500 whitespace-nowrap group relative overflow-hidden",
                    activeTab === tab.id 
                      ? cn("bg-white shadow-xl shadow-slate-200/50 border border-slate-200/60", tab.color) 
                      : "text-slate-400 hover:text-slate-600 hover:bg-slate-50/50"
                  )}
                >
                  <GripVertical size={14} className="text-slate-300 group-hover:text-slate-400 cursor-grab active:cursor-grabbing transition-colors" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div 
                      layoutId="utilTabActive" 
                      className={cn("absolute bottom-0 left-0 right-0 h-1", tab.color.replace('text-', 'bg-'))} 
                    />
                  )}
                </button>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>
      )}

      <AnimatePresence mode="wait">
        <Suspense fallback={
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          </div>
        }>
          {activeTab === 'reporting' && (
          <motion.div
            key="reporting"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ReportingModule tasks={tasks} knowledge={knowledge} />
          </motion.div>
        )}
        {activeTab === 'meeting' && (
          <motion.div
            key="meeting"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <MeetingAssistant />
          </motion.div>
        )}
        {activeTab === 'bulk-review' && draftingProps && (
          <motion.div
            key="bulk-review"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <BulkReview rules={draftingProps.rules} showToast={draftingProps.showToast} aiKnowledge={draftingProps.aiKnowledge} />
          </motion.div>
        )}
        {activeTab === 'drafting' && draftingProps && (
          <motion.div
            key="drafting"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <DraftingModule {...draftingProps} initialMainTab={initialMainTab} navigationParams={navigationParams} />
          </motion.div>
        )}
        {activeTab === 'translator' && (
          <motion.div
            key="translator"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <SmartTranslator />
          </motion.div>
        )}
        {activeTab === 'data-extractor' && (
          <motion.div
            key="data-extractor"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <SmartDataExtractor />
          </motion.div>
        )}
        {activeTab === 'pdf-reader' && (
          <motion.div
            key="pdf-reader"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <DocumentReaderModule />
          </motion.div>
        )}
        {activeTab === 'speech' && (
          <motion.div
            key="speech"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <SpeechAssistant aiKnowledge={knowledge} />
          </motion.div>
        )}
        </Suspense>
      </AnimatePresence>
    </motion.div>
  );
};
