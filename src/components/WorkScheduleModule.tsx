import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, PenTool, LayoutDashboard, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { OptimizedScheduleView } from './OptimizedScheduleView';
import { WorkScheduleCreator } from './WorkScheduleCreator';

interface WorkScheduleModuleProps {
  meetings: any[];
  tasks: any[];
  events: any[];
  updateMeetings: (updater: any[] | ((prev: any[]) => any[])) => Promise<void>;
  updateTasks: (updater: any[] | ((prev: any[]) => any[])) => Promise<void>;
  updateEvents: (updater: any[] | ((prev: any[]) => any[])) => Promise<void>;
  isUploading: boolean;
  onUploadCalendar: (file: File) => void;
  onUploadCalendarFile: (file: File) => void;
  setHasUnsavedChanges: (val: boolean) => void;
  aiKnowledge: any[];
  onNavigate: (tab: string) => void;
  smartLearnFromText: (text: string, tagsHint?: string[], isManual?: boolean) => Promise<void>;
  isLearning: boolean;
  showToast: (message: string, type?: any) => void;
}

export const WorkScheduleModule: React.FC<WorkScheduleModuleProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'optimized' | 'create'>('optimized');
  const [itemToEdit, setItemToEdit] = useState<any>(null);
  const [creatorItems, setCreatorItems] = useState<any[]>([]);

  const handleEditItem = (item: any) => {
    setItemToEdit(item);
    setActiveTab('create');
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4 border-b border-slate-200/60 pb-5 mb-6">
        <button
          onClick={() => setActiveTab('optimized')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
            activeTab === 'optimized' 
              ? "bg-indigo-50 text-indigo-700 font-medium shadow-sm" 
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <Zap size={18} />
          <span>Lịch công tác tối ưu</span>
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
            activeTab === 'create' 
              ? "bg-blue-50 text-blue-700 font-medium shadow-sm" 
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <PenTool size={18} />
          <span>Tạo & Chỉnh sửa</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'optimized' ? (
          <motion.div
            key="optimized"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <OptimizedScheduleView 
              meetings={props.meetings}
              tasks={props.tasks}
              events={props.events}
              updateMeetings={props.updateMeetings}
              updateTasks={props.updateTasks}
              updateEvents={props.updateEvents}
              isUploading={props.isUploading}
              onUploadCalendarFile={props.onUploadCalendarFile}
              onNavigate={props.onNavigate}
              onSwitchToCreate={() => setActiveTab('create')}
              onEditItem={handleEditItem}
              smartLearnFromText={props.smartLearnFromText}
              isLearning={props.isLearning}
              showToast={props.showToast}
            />
          </motion.div>
        ) : (
          <motion.div
            key="create"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <WorkScheduleCreator 
              updateMeetings={props.updateMeetings}
              updateTasks={props.updateTasks}
              updateEvents={props.updateEvents}
              showToast={props.showToast}
              initialItem={itemToEdit}
              onClearInitialItem={() => setItemToEdit(null)}
              items={creatorItems}
              setItems={setCreatorItems}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
