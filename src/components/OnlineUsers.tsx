import React, { useEffect, useState } from 'react';
import { listenForPresenceCount } from '../lib/presence';
import { useAuth } from '../context/AuthContext';

export const OnlineUsers: React.FC = () => {
  const [onlineCount, setOnlineCount] = useState(0);

  const { user } = useAuth();
  useEffect(() => {
    if (user) {
      const unsubscribe = listenForPresenceCount((count) => {
        setOnlineCount(count);
      });
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }
  }, [user]);

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <div className="w-2 h-2 rounded-full bg-green-500" />
      <span>{onlineCount} người đang online</span>
    </div>
  );
};
