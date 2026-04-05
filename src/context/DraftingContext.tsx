import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { useDraftingRules as useDraftingRulesHook } from '../hooks/useDraftingRules';
import { useToast } from '../hooks/useToast';
import { useAuth } from './AuthContext';

type DraftingContextType = ReturnType<typeof useDraftingRulesHook>;

const DraftingContext = createContext<DraftingContextType | null>(null);

export const DraftingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const { user, unitId } = useAuth();
  const drafting = useDraftingRulesHook(showToast);

  return (
    <DraftingContext.Provider value={drafting}>
      {children}
    </DraftingContext.Provider>
  );
};

export const useDrafting = () => {
  const context = useContext(DraftingContext);
  if (!context) {
    throw new Error('useDrafting must be used within a DraftingProvider');
  }
  return context;
};
