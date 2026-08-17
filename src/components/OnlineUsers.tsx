import React from 'react';
import { useAppStats } from '../hooks/useAppStats';

export const OnlineUsers: React.FC = () => {
  const { onlineCount } = useAppStats();

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <div className="w-2 h-2 rounded-full bg-green-500" />
      <span>{onlineCount} người đang online</span>
    </div>
  );
};
