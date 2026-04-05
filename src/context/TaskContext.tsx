import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { useTasks as useTasksHook } from '../hooks/useTasks';
import { useToast } from '../hooks/useToast';
import { useAuth } from './AuthContext';

type TaskContextType = ReturnType<typeof useTasksHook>;

const TaskContext = createContext<TaskContextType | null>(null);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const { user, unitId } = useAuth();
  const tasks = useTasksHook(showToast);

  // Auto-load tasks when user/unitId changes
  useEffect(() => {
    if (user && unitId) {
      tasks.loadTasks();
    }
  }, [user, unitId, tasks.loadTasks]);

  return (
    <TaskContext.Provider value={tasks}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};
