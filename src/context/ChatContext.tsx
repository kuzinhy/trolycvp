import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { useChat as useChatHook } from '../hooks/useChat';
import { useToast } from '../hooks/useToast';
import { useAuth } from './AuthContext';
import { useKnowledge } from './KnowledgeContext';

type ChatContextType = ReturnType<typeof useChatHook>;

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const { user, unitId } = useAuth();
  const { aiKnowledge, loadKnowledge } = useKnowledge();
  const chat = useChatHook(aiKnowledge, showToast, loadKnowledge);

  // Auto-load chat history when user/unitId changes
  useEffect(() => {
    if (user && unitId) {
      chat.loadChatHistory();
    }
  }, [user, unitId, chat.loadChatHistory]);

  return (
    <ChatContext.Provider value={chat}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
