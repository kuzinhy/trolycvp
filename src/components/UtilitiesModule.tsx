import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { FileText, MessageSquare, Sparkles, FileEdit, GripVertical, Languages, Database } from 'lucide-react';
import { cn } from '../lib/utils';

// Lazy load utility sub-modules
const ReportingModule = lazy(() => import('./ReportingModule').then(m => ({ default: m.ReportingModule })));
const MeetingAssistant = lazy(() => import('./MeetingAssistant').then(m => ({ default: m.MeetingAssistant })));
const ReportGeneratorModule = lazy(() => import('./ReportGeneratorModule').then(m => ({ default: m.ReportGeneratorModule })));
const BulkReview = lazy(() => import('./BulkReview').then(m => ({ default: m.BulkReview })));
const SmartDataExtractor = lazy(() => import('./SmartDataExtractor').then(m => ({ default: m.SmartDataExtractor })));
const SmartTranslator = lazy(() => import('./SmartTranslator').then(m => ({ default: m.SmartTranslator })));
const DocumentReaderModule = lazy(() => import('./DocumentReaderModule').then(m => ({ default: m.DocumentReaderModule })));
const SpeechAssistant = lazy(() => import('./SpeechAssistant').then(m => ({ default: m.SpeechAssistant })));
const GoogleSheetsModule = lazy(() => import('./GoogleSheetsModule').then(m => ({ default: m.GoogleSheetsModule })));

interface UtilitiesModuleProps {
  initialTab?: TabId;
  navigationParams?: any;
  hideTabs?: boolean;
  speechProps?: {
    aiKnowledge: any[];
  };
  tasks?: any[];
  knowledge?: any[];
}

type TabId = 'reporting' | 'meeting' | 'ai-report' | 'speech' | 'translator' | 'data-extractor' | 'pdf-reader' | 'english' | 'bulk-review' | 'google-sheets';

interface TabItem {
  id: TabId;
  label: string;
  color: string;
}

const INITIAL_TABS: TabItem[] = [
  { id: 'reporting', label: 'Phân tích và tạo báo cáo', color: 'text-emerald-600' },
  { id: 'speech', label: 'Soạn bài phát biểu', color: 'text-purple-600' },
  { id: 'bulk-review', label: 'Kiểm tra văn bản', color: 'text-rose-600' },
  { id: 'google-sheets', label: 'Liên thông Google Sheets', color: 'text-emerald-600' },
  { id: 'data-extractor', label: 'Trích xuất Dữ liệu AI', color: 'text-amber-600' },
  { id: 'pdf-reader', label: 'Đọc tài liệu', color: 'text-rose-600' }
];

export const UtilitiesModule: React.FC<UtilitiesModuleProps> = ({ initialTab, navigationParams, hideTabs, speechProps, tasks = [], knowledge = [] }) => {
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

      <Suspense fallback={
        <div className="flex flex-col items-center justify-center p-12 gap-2">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
          <span className="text-xs text-slate-400 font-medium">Đang tải tiện ích...</span>
        </div>
      }>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'reporting' && <ReportingModule tasks={tasks} knowledge={knowledge} />}
          {activeTab === 'bulk-review' && (
            <BulkReview showToast={() => {}} aiKnowledge={knowledge} />
          )}
          {activeTab === 'translator' && <SmartTranslator />}
          {activeTab === 'data-extractor' && <SmartDataExtractor />}
          {activeTab === 'pdf-reader' && <DocumentReaderModule />}
          {activeTab === 'speech' && <SpeechAssistant aiKnowledge={knowledge} />}
          {activeTab === 'google-sheets' && <GoogleSheetsModule knowledge={knowledge} />}
        </motion.div>
      </Suspense>
    </motion.div>
  );
};
