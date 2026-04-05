import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { useKnowledge as useKnowledgeHook } from '../hooks/useKnowledge';
import { useToast } from '../hooks/useToast';
import { useAuth } from './AuthContext';

type KnowledgeContextType = ReturnType<typeof useKnowledgeHook>;

const KnowledgeContext = createContext<KnowledgeContextType | null>(null);

export const KnowledgeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const { user, unitId } = useAuth();
  const knowledge = useKnowledgeHook(showToast);

  // Auto-load knowledge when user/unitId changes
  useEffect(() => {
    if (user && unitId) {
      knowledge.loadKnowledge();
    }
  }, [user, unitId, knowledge.loadKnowledge]);

  return (
    <KnowledgeContext.Provider value={knowledge}>
      {children}
    </KnowledgeContext.Provider>
  );
};

export const useKnowledge = () => {
  const context = useContext(KnowledgeContext);
  if (!context) {
    throw new Error('useKnowledge must be used within a KnowledgeProvider');
  }
  return context;
};
