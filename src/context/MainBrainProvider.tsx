import React from 'react';
import { MainBrainContextProvider, useMainBrain } from './MainBrainContext';
import { KnowledgeProvider } from './KnowledgeContext';
import { ChatProvider } from './ChatContext';
import { DashboardProvider } from './DashboardContext';
import { HistoryProvider } from './HistoryContext';

export { useMainBrain };

export const MainBrainProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <MainBrainContextProvider>
      <KnowledgeProvider>
        <DashboardProvider>
          <ChatProvider>
            <HistoryProvider>
              {children}
            </HistoryProvider>
          </ChatProvider>
        </DashboardProvider>
      </KnowledgeProvider>
    </MainBrainContextProvider>
  );
};
