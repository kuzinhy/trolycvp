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
      <div className="flex items-center gap-3 border-b-2 border-slate-100 pb-5 mb-8">
        <button
          onClick={() => setActiveTab('optimized')}
          className={cn(
            "relative flex items-center gap-2.5 px-6 py-3 rounded-2xl transition-all duration-300 group outline-none",
            activeTab === 'optimized' 
              ? "text-blue-700 font-black" 
              : "text-slate-500 font-bold hover:text-slate-800"
          )}
        >
          {activeTab === 'optimized' && (
            <motion.div
              layoutId="activeScheduleTabBg"
              className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl"
              initial={false}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <Zap size={18} className={cn("relative z-10 transition-transform", activeTab === 'optimized' ? "text-blue-600 scale-110" : "group-hover:scale-110")} />
          <span className="relative z-10">Lịch công tác tối ưu</span>
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={cn(
            "relative flex items-center gap-2.5 px-6 py-3 rounded-2xl transition-all duration-300 group outline-none",
            activeTab === 'create' 
              ? "text-blue-700 font-black" 
              : "text-slate-500 font-bold hover:text-slate-800"
          )}
        >
          {activeTab === 'create' && (
            <motion.div
              layoutId="activeScheduleTabBg"
              className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl"
              initial={false}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <PenTool size={18} className={cn("relative z-10 transition-transform", activeTab === 'create' ? "text-blue-600 scale-110" : "group-hover:scale-110")} />
          <span className="relative z-10">Tạo & Chỉnh sửa</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'optimized' ? (
          <motion.div
            key="optimized"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
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
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
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
              aiKnowledge={props.aiKnowledge}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
