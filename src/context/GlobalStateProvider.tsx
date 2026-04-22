import React from 'react';
import { AuthProvider } from './AuthContext';
import { KnowledgeProvider } from './KnowledgeContext';
import { ChatProvider } from './ChatContext';
import { DashboardProvider } from './DashboardContext';
import { DraftingProvider } from './DraftingContext';
import { NewsProvider } from './NewsContext';
import { HistoryProvider } from './HistoryContext';

export const GlobalStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <HistoryProvider>
        <KnowledgeProvider>
          <ChatProvider>
            <DashboardProvider>
              <DraftingProvider>
                <NewsProvider>
                  {children}
                </NewsProvider>
              </DraftingProvider>
            </DashboardProvider>
          </ChatProvider>
        </KnowledgeProvider>
      </HistoryProvider>
    </AuthProvider>
  );
};
