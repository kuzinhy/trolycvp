import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, PenTool, LayoutDashboard } from 'lucide-react';
import { cn } from '../lib/utils';
import { CalendarModule } from './CalendarModule';
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
  onSyncGoogleDrive: (folderId: string) => Promise<void>;
  isSyncingDrive: boolean;
  setHasUnsavedChanges: (val: boolean) => void;
  aiKnowledge: any[];
}

export const WorkScheduleModule: React.FC<WorkScheduleModuleProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'view' | 'create'>('view');

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4 border-b border-slate-200/60 pb-5 mb-6">
        <button
          onClick={() => setActiveTab('view')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
            activeTab === 'view' 
              ? "bg-blue-50 text-blue-700 font-medium shadow-sm" 
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <Calendar size={18} />
          <span>Xem lịch công tác</span>
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
            activeTab === 'create' 
              ? "bg-indigo-50 text-indigo-700 font-medium shadow-sm" 
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <PenTool size={18} />
          <span>Tạo lịch</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'view' ? (
          <motion.div
            key="view"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <CalendarModule 
              meetings={props.meetings}
              tasks={props.tasks}
              events={props.events}
              updateMeetings={props.updateMeetings}
              updateTasks={props.updateTasks}
              updateEvents={props.updateEvents}
              isUploading={props.isUploading}
              onUploadCalendar={props.onUploadCalendar}
              onUploadCalendarFile={props.onUploadCalendarFile}
              onSyncGoogleDrive={props.onSyncGoogleDrive}
              isSyncingDrive={props.isSyncingDrive}
              setHasUnsavedChanges={props.setHasUnsavedChanges}
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
            <WorkScheduleCreator />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
