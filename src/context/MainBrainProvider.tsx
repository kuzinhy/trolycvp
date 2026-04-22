import React from 'react';
import { KnowledgeProvider } from './KnowledgeContext';
import { ChatProvider } from './ChatContext';
import { DashboardProvider } from './DashboardContext';
import { HistoryProvider } from './HistoryContext';
export const MainBrainProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <KnowledgeProvider>
      <DashboardProvider>
        <ChatProvider>
          <HistoryProvider>
            {children}
          </HistoryProvider>
        </ChatProvider>
      </DashboardProvider>
    </KnowledgeProvider>
  );
};
