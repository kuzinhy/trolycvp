import React, { useState } from 'react';
import { Mic, FileSignature } from 'lucide-react';
import { MeetingAssistant } from './MeetingAssistant';
import { ConclusionCreatorModule } from './ConclusionCreatorModule';
import { cn } from '../lib/utils';
import { useKnowledgeContext } from '../context/KnowledgeContext';
import { useToast } from '../hooks/useToast';

interface MeetingHubProps {
  initialTab?: 'meeting' | 'conclusion';
}

export const MeetingHub: React.FC<MeetingHubProps> = ({ initialTab = 'meeting' }) => {
  const [activeTab, setActiveTab] = useState<'meeting' | 'conclusion'>(initialTab);
  const { aiKnowledge } = useKnowledgeContext();
  const { showToast } = useToast();

  return (
    <div className="flex flex-col h-full bg-slate-50/50 p-6 md:p-8 overflow-hidden">
      <div className="flex-none mb-6">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <Mic className="text-blue-600" size={32} />
          Trung tâm Hội họp & Kết luận
        </h2>
        
        <div className="flex gap-2 mt-6 p-1 bg-slate-200/50 w-full sm:w-max rounded-xl overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('meeting')}
            className={cn(
              "px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shrink-0",
              activeTab === 'meeting' ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            )}
          >
            <Mic size={16} />
            Trợ lý họp thông minh
          </button>
          <button
            onClick={() => setActiveTab('conclusion')}
            className={cn(
              "px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shrink-0",
              activeTab === 'conclusion' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            )}
          >
            <FileSignature size={16} />
            Tạo kết luận cuộc họp
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {activeTab === 'meeting' ? (
          <MeetingAssistant knowledge={aiKnowledge} />
        ) : (
          <div className="absolute inset-0 overflow-y-auto custom-scrollbar rounded-3xl bg-white shadow-sm border border-slate-200">
            <ConclusionCreatorModule showToast={showToast} aiKnowledge={aiKnowledge} />
          </div>
        )}
      </div>
    </div>
  );
};
