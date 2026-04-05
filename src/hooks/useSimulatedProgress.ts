import { useState, useEffect, useCallback } from 'react';

export function useSimulatedProgress() {
  const [progress, setProgress] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    if (!isSimulating) return;
    
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev < 30) return prev + Math.random() * 15;
        if (prev < 70) return prev + Math.random() * 5;
        if (prev < 90) return prev + Math.random() * 2;
        if (prev < 95) return prev + Math.random() * 0.5;
        return prev;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isSimulating]);

  const start = useCallback(() => {
    setIsSimulating(true);
    setProgress(0);
  }, []);

  const complete = useCallback(() => {
    setProgress(100);
    setTimeout(() => {
      setIsSimulating(false);
      setProgress(0);
    }, 500);
  }, []);

  const stop = useCallback(() => {
    setIsSimulating(false);
    setProgress(0);
  }, []);

  return { 
    progress: Math.min(100, Math.round(progress)), 
    start, 
    complete, 
    stop, 
    isSimulating 
  };
}
